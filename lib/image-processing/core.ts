import { canvasToBlob, decodeImage, drawScaled, getContext2D, hasTransparency, releaseCanvas, type AnyCanvas, type DrawableSource } from "./canvas";
import { ImageToolError } from "./errors";
import { LIMITS, type OutputMime } from "./formats";
import { setJpegDpi } from "./jpeg-dpi";
import { canEncodeIndexedPng, encodeIndexedPng } from "./png-encode";
import { quantize } from "./png-quantize";
import { searchTargetSize, type EncodedImage } from "./target-size";
import { prepareSource } from "./transform";
import type { EncodeJob, EncodeResult, Job, JobResult, ProbeJob, ProbeResult, TargetJob, TargetResult } from "./types";

/**
 * The image pipeline. Runs inside the Web Worker, or on the main thread when
 * workers with OffscreenCanvas are unavailable. Nothing here performs network
 * requests: input is a local Blob and output is a new local Blob. (The only
 * fetch is the HEIC decoder's code, loaded from this site on first use.)
 */

/** Smallest long side the target-size search may shrink an image to. */
const MIN_LONG_SIDE = 32;

let cached: { id: string; bitmap: ImageBitmap } | null = null;

async function getBitmap(sourceId: string, file: Blob): Promise<ImageBitmap> {
  if (cached?.id === sourceId) return cached.bitmap;
  releaseSource();
  const bitmap = await decodeImage(file);
  if (bitmap.width * bitmap.height > LIMITS.maxInputPixels) {
    bitmap.close();
    throw new ImageToolError("DIMENSIONS_TOO_LARGE", "This image has too many pixels to process safely in a browser.");
  }
  cached = { id: sourceId, bitmap };
  return bitmap;
}

export function releaseSource(): void {
  cached?.bitmap.close();
  cached = null;
}

export async function runJob(job: Job, onProgress?: (fraction: number) => void): Promise<JobResult> {
  try {
    switch (job.kind) {
      case "probe":
        return await probe(job);
      case "encode":
        return await encode(job);
      case "target":
        return await target(job, onProgress);
      default:
        throw new ImageToolError("UNKNOWN", "Unknown processing request.");
    }
  } finally {
    if (job.noCache) releaseSource();
  }
}

async function probe(job: ProbeJob): Promise<ProbeResult> {
  const bitmap = await getBitmap(job.sourceId, job.file);
  const transparent = job.checkTransparency ? hasTransparency(bitmap) : false;
  const result: ProbeResult = { kind: "probe", width: bitmap.width, height: bitmap.height, hasTransparency: transparent };
  if (job.thumbnail) result.thumbnail = await smallCopy(bitmap, job.thumbnail, transparent, 0.75);
  if (job.preview) result.preview = await smallCopy(bitmap, job.preview, transparent, 0.88);
  return result;
}

/** A reduced copy for previews: PNG when transparency must show, JPG otherwise. */
async function smallCopy(bitmap: ImageBitmap, longSide: number, transparent: boolean, quality: number): Promise<Blob> {
  const scale = Math.min(1, longSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = drawScaled(bitmap, width, height, transparent ? null : "#ffffff");
  try {
    return await canvasToBlob(canvas, transparent ? "image/png" : "image/jpeg", transparent ? undefined : quality);
  } finally {
    releaseCanvas(canvas);
  }
}

/**
 * Scaled dimensions, rounded to whole pixels but never over the canvas limits.
 * (Rounding both sides up can push a size computed to fit exactly, such as
 * 8018 × 6236, a few hundred pixels over the limit.)
 */
export function scaledSize(W: number, H: number, scale: number): { width: number; height: number } {
  let width = Math.max(1, Math.round(W * scale));
  let height = Math.max(1, Math.round(H * scale));
  if (width * height > LIMITS.maxOutputPixels || width > LIMITS.maxOutputSide || height > LIMITS.maxOutputSide) {
    width = Math.max(1, Math.floor(W * scale));
    height = Math.max(1, Math.floor(H * scale));
    while (width * height > LIMITS.maxOutputPixels && width > 1 && height > 1) {
      width--;
      height = Math.max(1, Math.floor((width * H) / W));
    }
  }
  return { width, height };
}

async function finishBlob(blob: Blob, mime: OutputMime, dpi: number | undefined): Promise<Blob> {
  return dpi && mime === "image/jpeg" ? setJpegDpi(blob, dpi) : blob;
}

async function encode(job: EncodeJob): Promise<EncodeResult> {
  const bitmap = await getBitmap(job.sourceId, job.file);
  const prepared = prepareSource(bitmap, job.transform, job.cleanup);
  let canvas: AnyCanvas | null = null;
  try {
    canvas = drawScaled(prepared.source, job.width, job.height, job.background);
    if (job.mime === "image/png" && job.pngColors && canEncodeIndexedPng()) {
      const { blob, colors, lossless } = await encodePalettePng(canvas, job.pngColors, job.pngDither ?? true);
      return { kind: "encode", blob, width: job.width, height: job.height, paletteColors: colors, paletteLossless: lossless };
    }
    const blob = await finishBlob(await canvasToBlob(canvas, job.mime, job.quality), job.mime, job.dpi);
    return { kind: "encode", blob, width: job.width, height: job.height };
  } finally {
    if (canvas) releaseCanvas(canvas);
    prepared.release();
  }
}

async function encodePalettePng(canvas: AnyCanvas, maxColors: number, dither: boolean) {
  const ctx = getContext2D(canvas);
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  const q = quantize(data, width, height, maxColors, dither);
  const blob = await encodeIndexedPng(width, height, q.indices, q.palette, q.colorCount);
  return { blob, colors: q.colorCount, lossless: q.lossless };
}

async function target(job: TargetJob, onProgress?: (fraction: number) => void): Promise<TargetResult> {
  if (!Number.isFinite(job.targetBytes) || job.targetBytes < 1024) {
    throw new ImageToolError("INVALID_TARGET", "Please enter a target size of at least 1 KB.");
  }
  const bitmap = await getBitmap(job.sourceId, job.file);
  const edited = Boolean(job.transform || job.cleanup || job.width || job.height || job.dpi || job.maxQuality);

  // Already small enough and in the requested format: re-encoding would only lose quality.
  if (!edited && job.file.size <= job.targetBytes && job.sourceMime === job.mime) {
    onProgress?.(1);
    return { kind: "target", blob: job.file, width: bitmap.width, height: bitmap.height, quality: null, outcome: "met", usedOriginal: true };
  }

  const prepared = prepareSource(bitmap, job.transform, job.cleanup);
  // An exact output size (passport photos, signatures) becomes the new "full size".
  let exact: AnyCanvas | null = null;
  let base: DrawableSource = prepared.source;
  if (job.width && job.height) {
    exact = drawScaled(prepared.source, job.width, job.height, null);
    base = exact;
  }
  const { width: W, height: H } = base;

  // Respect the browser canvas limit for very large sources.
  const maxScale = Math.min(
    1,
    Math.sqrt(LIMITS.maxOutputPixels / (W * H)),
    LIMITS.maxOutputSide / Math.max(W, H),
  );
  const minScale = Math.min(maxScale, MIN_LONG_SIDE / Math.max(W, H));

  // Reuse the scaled canvas while only quality changes.
  let scaled: { width: number; height: number; canvas: AnyCanvas } | null = null;
  const encodeAt = async (scale: number, quality: number): Promise<EncodedImage> => {
    const { width, height } = scaledSize(W, H, scale);
    if (!scaled || scaled.width !== width || scaled.height !== height) {
      if (scaled) releaseCanvas(scaled.canvas);
      scaled = { width, height, canvas: drawScaled(base, width, height, job.background) };
    }
    // The DPI header is added before measuring, so the reported size is the downloaded size.
    const blob = await finishBlob(await canvasToBlob(scaled.canvas, job.mime, quality), job.mime, job.dpi);
    return { blob, width, height };
  };

  try {
    const result = await searchTargetSize(encodeAt, {
      targetBytes: job.targetBytes,
      allowResize: job.allowResize,
      maxQuality: job.maxQuality,
      minScale,
      maxScale,
      onProgress,
    });
    const { attempt, outcome } = result;
    return {
      kind: "target",
      blob: attempt.blob,
      width: attempt.width,
      height: attempt.height,
      quality: attempt.quality,
      outcome,
      usedOriginal: false,
    };
  } finally {
    const last = scaled as { canvas: AnyCanvas } | null;
    if (last) releaseCanvas(last.canvas);
    if (exact) releaseCanvas(exact);
    prepared.release();
  }
}
