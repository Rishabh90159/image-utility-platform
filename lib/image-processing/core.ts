import { canvasToBlob, decodeImage, drawScaled, getContext2D, hasTransparency, releaseCanvas, type AnyCanvas } from "./canvas";
import { ImageToolError } from "./errors";
import { LIMITS } from "./formats";
import { canEncodeIndexedPng, encodeIndexedPng } from "./png-encode";
import { quantize } from "./png-quantize";
import { searchTargetSize, type EncodedImage } from "./target-size";
import type { EncodeJob, EncodeResult, Job, JobResult, ProbeJob, ProbeResult, TargetJob, TargetResult } from "./types";

/**
 * The image pipeline. Runs inside the Web Worker, or on the main thread when
 * workers with OffscreenCanvas are unavailable. Nothing here performs network
 * requests: input is a local Blob and output is a new local Blob.
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
  switch (job.kind) {
    case "probe":
      return probe(job);
    case "encode":
      return encode(job);
    case "target":
      return target(job, onProgress);
  }
}

async function probe(job: ProbeJob): Promise<ProbeResult> {
  const bitmap = await getBitmap(job.sourceId, job.file);
  return {
    kind: "probe",
    width: bitmap.width,
    height: bitmap.height,
    hasTransparency: job.checkTransparency ? hasTransparency(bitmap) : false,
  };
}

async function encode(job: EncodeJob): Promise<EncodeResult> {
  const bitmap = await getBitmap(job.sourceId, job.file);
  const canvas = drawScaled(bitmap, job.width, job.height, job.background);
  try {
    if (job.mime === "image/png" && job.pngColors && canEncodeIndexedPng()) {
      const { blob, colors, lossless } = await encodePalettePng(canvas, job.pngColors, job.pngDither ?? true);
      return { kind: "encode", blob, width: job.width, height: job.height, paletteColors: colors, paletteLossless: lossless };
    }
    const blob = await canvasToBlob(canvas, job.mime, job.quality);
    return { kind: "encode", blob, width: job.width, height: job.height };
  } finally {
    releaseCanvas(canvas);
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
  const { width: W, height: H } = bitmap;

  // Already small enough and in the requested format: re-encoding would only lose quality.
  if (job.file.size <= job.targetBytes && job.sourceMime === job.mime) {
    onProgress?.(1);
    return { kind: "target", blob: job.file, width: W, height: H, quality: null, outcome: "met", usedOriginal: true };
  }

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
    const width = Math.max(1, Math.round(W * scale));
    const height = Math.max(1, Math.round(H * scale));
    if (!scaled || scaled.width !== width || scaled.height !== height) {
      if (scaled) releaseCanvas(scaled.canvas);
      scaled = { width, height, canvas: drawScaled(bitmap, width, height, job.background) };
    }
    const blob = await canvasToBlob(scaled.canvas, job.mime, quality);
    return { blob, width, height };
  };

  try {
    const result = await searchTargetSize(encodeAt, {
      targetBytes: job.targetBytes,
      allowResize: job.allowResize,
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
  }
}
