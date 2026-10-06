import { canvasToBlob, createCanvas, getContext2D, releaseCanvas } from "@/lib/image-processing/canvas";
import { ImageToolError } from "@/lib/image-processing/errors";

/**
 * Draws sanitized SVG markup onto a canvas at an exact pixel size and returns
 * a PNG. The SVG is loaded through an <img> element, where browsers never run
 * scripts or fetch external resources. Runs on the main thread because
 * browsers can't decode SVG inside Web Workers.
 */
export type SvgFit = "contain" | "stretch";

export interface RasterizeOptions {
  width: number;
  height: number;
  /** CSS colour, or null to keep transparency. */
  background: string | null;
  fit: SvgFit;
}

const LOAD_TIMEOUT_MS = 20_000;

/** Returns a copy of the markup that renders at the given pixel size. */
export function sizedSvgMarkup(markup: string, width: number, height: number, fit: SvgFit, intrinsic: { width: number; height: number }): string {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  const svg = doc.documentElement;
  // Without a viewBox, changing width/height would crop instead of scale.
  if (!svg.getAttribute("viewBox")) svg.setAttribute("viewBox", `0 0 ${intrinsic.width} ${intrinsic.height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  if (fit === "stretch") svg.setAttribute("preserveAspectRatio", "none");
  return new XMLSerializer().serializeToString(svg);
}

export function loadSvgImage(markup: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  const image = new Image();
  image.decoding = "async";
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ImageToolError("INVALID_SVG", "This SVG took too long to render. It may be extremely complex."));
    }, LOAD_TIMEOUT_MS);
    image.onload = () => {
      clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timer);
      reject(new ImageToolError("INVALID_SVG", "Your browser couldn't render this SVG. It may use features browsers don't support in images."));
    };
    image.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

export async function rasterizeSvg(markup: string, intrinsic: { width: number; height: number }, options: RasterizeOptions): Promise<Blob> {
  const { width, height, background, fit } = options;
  const image = await loadSvgImage(sizedSvgMarkup(markup, width, height, fit, intrinsic));
  const canvas = createCanvas(width, height);
  try {
    const ctx = getContext2D(canvas);
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(image, 0, 0, width, height);
    return await canvasToBlob(canvas, "image/png");
  } finally {
    releaseCanvas(canvas);
  }
}
