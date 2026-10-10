import {
  assertOutputSize,
  canvasToBlob,
  createCanvas,
  decodeImage,
  drawScaled,
  getContext2D,
  hasTransparency,
  releaseCanvas,
  type AnyCanvas,
  type DrawableSource,
} from "./canvas";
import { ImageToolError } from "./errors";
import { coverSourceRect } from "./fit";
import { LIMITS, type OutputMime } from "./formats";
import { setJpegDpi } from "./jpeg-dpi";
import { canEncodeIndexedPng, encodeIndexedPng } from "./png-encode";
import { enhance, inflate, merge, pdfImage, upscale } from "./pixel-jobs";
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
      case "upscale":
        return await upscale(job, await getBitmap(job.sourceId, job.file), onProgress);
      case "enhance":
        return await enhance(job, await getBitmap(job.sourceId, job.file));
      case "pdf-image":
        return await pdfImage(job, await getBitmap(job.sourceId, job.file));
      case "merge":
        // Merging decodes each image itself and keeps none of them cached.
        releaseSource();
        return await merge(job, onProgress);
      case "inflate":
        return await inflate(job, await getBitmap(job.sourceId, job.file), onProgress);
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
    canvas = job.fit
      ? drawFitted(prepared.source, job.width, job.height, job.fit, job.background)
      : drawScaled(prepared.source, job.width, job.height, job.background);
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

/**
 * Fit mode: the whole image, scaled into `fit.placement`, on a frame of
 * width × height filled with a colour or a blurred, enlarged copy of the image.
 */
function drawFitted(
  source: DrawableSource,
  width: number,
  height: number,
  fit: NonNullable<EncodeJob["fit"]>,
  background: string | null,
): AnyCanvas {
  assertOutputSize(width, height);
  const x = Math.max(0, Math.min(width - 1, Math.round(fit.placement.x)));
  const y = Math.max(0, Math.min(height - 1, Math.round(fit.placement.y)));
  const w = Math.max(1, Math.min(width - x, Math.round(fit.placement.width)));
  const h = Math.max(1, Math.min(height - y, Math.round(fit.placement.height)));
  const out = createCanvas(width, height);
  const ctx = getContext2D(out);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  if (fit.fill === "blur") drawBlurredCover(ctx, source, width, height);
  const scaled = drawScaled(source, w, h, null);
  try {
    ctx.drawImage(scaled, x, y);
  } finally {
    releaseCanvas(scaled);
  }
  return out;
}

/**
 * Fills the frame with a heavily blurred copy of the image scaled to cover it.
 * The image is shrunk to a few dozen pixels and enlarged again in smooth steps,
 * which blurs it in every browser without needing canvas filter support.
 */
function drawBlurredCover(ctx: ReturnType<typeof getContext2D>, source: DrawableSource, width: number, height: number): void {
  const r = coverSourceRect(source.width, source.height, width, height);
  const fitLong = (long: number) =>
    width >= height
      ? { w: long, h: Math.max(1, Math.round((long * height) / width)) }
      : { w: Math.max(1, Math.round((long * width) / height)), h: long };
  const steps = [fitLong(256), fitLong(24), fitLong(96)];
  const canvases: AnyCanvas[] = [];
  try {
    let previous: DrawableSource = source;
    let from = r;
    for (const { w, h } of steps) {
      const step = createCanvas(w, h);
      const sctx = getContext2D(step);
      sctx.imageSmoothingEnabled = true;
      sctx.imageSmoothingQuality = "high";
      sctx.drawImage(previous, from.x, from.y, from.width, from.height, 0, 0, w, h);
      canvases.push(step);
      previous = step;
      from = { x: 0, y: 0, width: w, height: h };
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(previous, 0, 0, from.width, from.height, 0, 0, width, height);
  } finally {
    for (const canvas of canvases) releaseCanvas(canvas);
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
