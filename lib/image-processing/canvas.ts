import { ImageToolError } from "./errors";
import { FORMATS, LIMITS, type ImageMime } from "./formats";

/**
 * Canvas helpers that work both inside a Web Worker (OffscreenCanvas) and on
 * the main thread (HTMLCanvasElement fallback for older browsers).
 */
export type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
export type Any2DContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

const TOO_LARGE_MESSAGE =
  "Your browser couldn't create an image this large. Try smaller dimensions — mobile browsers have lower limits than desktop browsers.";

export function assertOutputSize(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new ImageToolError("INVALID_DIMENSIONS", "Width and height must be whole numbers of at least 1 pixel.");
  }
  if (width > LIMITS.maxOutputSide || height > LIMITS.maxOutputSide) {
    throw new ImageToolError(
      "OUTPUT_TOO_LARGE",
      `Each side can be at most ${LIMITS.maxOutputSide.toLocaleString("en-US")} pixels.`,
    );
  }
  if (width * height > LIMITS.maxOutputPixels) {
    throw new ImageToolError(
      "OUTPUT_TOO_LARGE",
      `The output would be ${Math.round((width * height) / 1_000_000)} megapixels. The maximum is ${Math.round(LIMITS.maxOutputPixels / 1_000_000)} megapixels.`,
    );
  }
}

export function createCanvas(width: number, height: number): AnyCanvas {
  assertOutputSize(width, height);
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  throw new ImageToolError("ENCODE_FAILED", "Your browser doesn't support the image features this tool needs.");
}

export function getContext2D(canvas: AnyCanvas, options?: CanvasRenderingContext2DSettings): Any2DContext {
  let ctx: Any2DContext | null = null;
  try {
    ctx = (canvas as OffscreenCanvas).getContext("2d", options) as Any2DContext | null;
  } catch {
    ctx = null;
  }
  // Browsers return null (rather than throwing) when a canvas exceeds their memory limits.
  if (!ctx) throw new ImageToolError("OUTPUT_TOO_LARGE", TOO_LARGE_MESSAGE);
  return ctx;
}

/** Frees canvas memory promptly; Safari in particular holds on to it otherwise. */
export function releaseCanvas(canvas: AnyCanvas): void {
  canvas.width = 0;
  canvas.height = 0;
}

type DrawableSource = ImageBitmap | AnyCanvas;

/**
 * Draws `source` into a new canvas of the requested size.
 *
 * Large reductions are done in successive halving steps. A single big
 * downscale with drawImage samples too few source pixels in some browsers,
 * which produces jagged, aliased results.
 */
export function drawScaled(
  source: DrawableSource,
  outWidth: number,
  outHeight: number,
  background: string | null,
): AnyCanvas {
  assertOutputSize(outWidth, outHeight);
  let current: DrawableSource = source;
  let cw = source.width;
  let ch = source.height;
  const temporary: AnyCanvas[] = [];

  try {
    while (cw / 2 >= outWidth && ch / 2 >= outHeight) {
      const nw = Math.max(outWidth, Math.floor(cw / 2));
      const nh = Math.max(outHeight, Math.floor(ch / 2));
      const step = createCanvas(nw, nh);
      const sctx = getContext2D(step);
      sctx.imageSmoothingEnabled = true;
      sctx.imageSmoothingQuality = "high";
      sctx.drawImage(current, 0, 0, cw, ch, 0, 0, nw, nh);
      temporary.push(step);
      current = step;
      cw = nw;
      ch = nh;
    }

    const out = createCanvas(outWidth, outHeight);
    const ctx = getContext2D(out);
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, outWidth, outHeight);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(current, 0, 0, cw, ch, 0, 0, outWidth, outHeight);
    return out;
  } finally {
    for (const canvas of temporary) releaseCanvas(canvas);
  }
}

export async function canvasToBlob(canvas: AnyCanvas, mime: ImageMime, quality?: number): Promise<Blob> {
  let blob: Blob | null = null;
  try {
    if ("convertToBlob" in canvas) {
      blob = await canvas.convertToBlob({ type: mime, quality });
    } else {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));
    }
  } catch {
    blob = null;
  }
  if (!blob || blob.size === 0) {
    throw new ImageToolError("ENCODE_FAILED", "Your browser couldn't create the output image. Try smaller dimensions or a different format.");
  }
  // Browsers silently fall back to PNG for formats they can't encode (e.g. WebP in some Safari versions).
  if (blob.type !== mime) {
    throw new ImageToolError(
      "ENCODER_UNSUPPORTED",
      `Your browser can't create ${FORMATS[mime].label} files. Please choose a different output format.`,
    );
  }
  return blob;
}

/** Checks whether any pixel is not fully opaque, using a downscaled copy for speed. */
export function hasTransparency(source: ImageBitmap): boolean {
  const scale = Math.min(1, 1024 / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const canvas = createCanvas(w, h);
  try {
    const ctx = getContext2D(canvas, { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  } finally {
    releaseCanvas(canvas);
  }
}

export async function decodeImage(file: Blob): Promise<ImageBitmap> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      bitmap = null;
    }
  }
  if (!bitmap || bitmap.width === 0 || bitmap.height === 0) {
    bitmap?.close();
    throw new ImageToolError(
      "DECODE_FAILED",
      "We couldn't open this image. The file may be damaged, incomplete, or too large for your browser to decode.",
    );
  }
  return bitmap;
}
