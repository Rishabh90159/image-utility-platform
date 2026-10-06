import ImageTracer, { type TracerColor, type TracerOptions } from "imagetracerjs";
import { quantize } from "@/lib/image-processing/png-quantize";

/**
 * Raster-to-vector tracing. The image is reduced to a small palette, each
 * colour region's outline is traced into straight lines and quadratic curves
 * (ImageTracer.js), and the result is written as real SVG <path> elements.
 * No bitmap is embedded in the output.
 *
 * Pure computation on RGBA pixels: runs in a Web Worker, on the main thread,
 * or in Node for tests.
 */
export type TraceMode = "bw" | "color";
export type TraceDetail = "low" | "medium" | "high";

export interface TraceOptions {
  mode: TraceMode;
  /** Colour mode: palette size, 2–32. */
  colors: number;
  /** Black & white mode: luminance cut-off, 0–255. Darker pixels become black. */
  threshold: number;
  detail: TraceDetail;
  /** Leave out the background colour so the SVG has a transparent background. */
  removeBackground: boolean;
}

export interface TraceInput {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface TraceResult {
  svg: string;
  pathCount: number;
  colorCount: number;
  /** Size the pixels were traced at. */
  traceWidth: number;
  traceHeight: number;
}

/** Longest side the image is reduced to before tracing, per detail level. */
export const TRACE_SIZE: Record<TraceDetail, number> = { low: 600, medium: 1000, high: 1600 };

const DETAIL_SETTINGS: Record<TraceDetail, Pick<TracerOptions, "ltres" | "qtres" | "pathomit">> = {
  // ltres/qtres: error allowed for straight lines/curves (higher = simpler paths).
  // pathomit: outlines with fewer points than this are dropped (removes specks).
  low: { ltres: 2, qtres: 2, pathomit: 16 },
  medium: { ltres: 1, qtres: 1, pathomit: 8 },
  high: { ltres: 0.5, qtres: 0.5, pathomit: 2 },
};

const ALPHA_CUTOFF = 128;

export function traceToSvg(input: TraceInput, options: TraceOptions, outputSize?: { width: number; height: number }): TraceResult {
  const { width, height } = input;
  const data = new Uint8ClampedArray(input.data);
  let hasTransparent = false;

  // Tracing works on solid regions: pixels are either fully opaque or fully transparent.
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < ALPHA_CUTOFF) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      hasTransparent = true;
    } else {
      data[i + 3] = 255;
    }
  }

  let palette: TracerColor[];
  if (options.mode === "bw") {
    const t = clamp(options.threshold, 1, 254);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const v = lum < t ? 0 : 255;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
    palette = [
      { r: 0, g: 0, b: 0, a: 255 },
      { r: 255, g: 255, b: 255, a: 255 },
    ];
  } else {
    const q = quantize(data, width, height, clamp(Math.round(options.colors), 2, 32) + (hasTransparent ? 1 : 0), false);
    palette = [];
    for (let p = 0; p < q.colorCount; p++) {
      const o = p * 4;
      if (q.palette[o + 3] < ALPHA_CUTOFF) continue;
      palette.push({ r: q.palette[o], g: q.palette[o + 1], b: q.palette[o + 2], a: 255 });
    }
  }
  if (hasTransparent) palette.push({ r: 0, g: 0, b: 0, a: 0 });

  const tracerOptions: TracerOptions = {
    ...DETAIL_SETTINGS[options.detail],
    rightangleenhance: true,
    pal: palette,
    colorquantcycles: 1,
    mincolorratio: 0,
    layering: 0,
    blurradius: 0,
    strokewidth: 0,
    roundcoords: 1,
    scale: 1,
    linefilter: false,
    viewbox: false,
    desc: false,
  };
  const traced = ImageTracer.imagedataToTracedata({ width, height, data }, tracerOptions);

  const background = options.removeBackground ? backgroundLayer(data, width, height, traced.palette) : -1;
  const visible: number[] = [];
  for (let l = 0; l < traced.layers.length; l++) {
    if (traced.palette[l].a < ALPHA_CUTOFF || l === background) continue;
    if (traced.layers[l].some((path) => !path.isholepath)) visible.push(l);
  }
  // A hairline stroke in the fill colour hides the anti-aliasing seams between
  // neighbouring colour regions. With a single colour there are no seams.
  const seams = visible.length > 1;

  const out = outputSize ?? { width, height };
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${out.width}" height="${out.height}" viewBox="0 0 ${width} ${height}">`;
  let pathCount = 0;
  for (const l of visible) {
    const color = hex(traced.palette[l]);
    const d: string[] = [];
    for (let p = 0; p < traced.layers[l].length; p++) {
      if (traced.layers[l][p].isholepath) continue;
      const markup = ImageTracer.svgpathstring(traced, l, p, tracerOptions);
      const match = /\sd="([^"]*)"/.exec(markup);
      if (match && match[1].trim()) {
        d.push(match[1].trim());
        pathCount++;
      }
    }
    if (d.length === 0) continue;
    const stroke = seams ? ` stroke="${color}" stroke-width="0.6" stroke-linejoin="round"` : "";
    svg += `<path fill="${color}"${stroke} d="${d.join(" ")}"/>`;
  }
  svg += "</svg>";

  return { svg, pathCount, colorCount: visible.length, traceWidth: width, traceHeight: height };
}

/** Palette index of the colour that dominates the image border, i.e. the likely background. */
function backgroundLayer(data: Uint8ClampedArray, width: number, height: number, palette: TracerColor[]): number {
  const votes = new Map<number, number>();
  const vote = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    if (data[i + 3] === 0) return;
    let best = -1;
    let bestDistance = Infinity;
    for (let p = 0; p < palette.length; p++) {
      if (palette[p].a < ALPHA_CUTOFF) continue;
      const distance = Math.abs(palette[p].r - data[i]) + Math.abs(palette[p].g - data[i + 1]) + Math.abs(palette[p].b - data[i + 2]);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = p;
      }
    }
    if (best >= 0) votes.set(best, (votes.get(best) ?? 0) + 1);
  };
  for (let x = 0; x < width; x++) {
    vote(x, 0);
    vote(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    vote(0, y);
    vote(width - 1, y);
  }
  let winner = -1;
  let count = 0;
  for (const [index, n] of votes) {
    if (n > count) {
      winner = index;
      count = n;
    }
  }
  // Only treat it as background if it clearly dominates the border.
  const border = 2 * (width + height) - 4;
  return count >= border * 0.6 ? winner : -1;
}

function hex(c: TracerColor): string {
  return `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
