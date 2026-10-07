import { canvasToBlob, createCanvas, decodeImage, drawScaled, getContext2D, releaseCanvas, type AnyCanvas, type DrawableSource } from "./canvas";
import { enhancePixels } from "./enhance";
import { ImageToolError } from "./errors";
import { LIMITS, type OutputMime } from "./formats";
import { isJpeg, padJpeg, readJpegInfo } from "./jpeg-info";
import { mergeLayout } from "./merge-layout";
import { resampleLanczos, unsharpMask, type Pixels } from "./resample";
import type {
  EnhanceJob,
  ImageOutputResult,
  InflateJob,
  InflateResult,
  MergeJob,
  MergeResult,
  PdfImageJob,
  PdfImageResult,
  UpscaleJob,
} from "./types";

/**
 * Jobs added in Phase 4: upscaling, enhancement, PDF page preparation,
 * merging and file-size increase. They run in the same worker as the other
 * jobs and never touch the network.
 */

type Progress = ((fraction: number) => void) | undefined;

/** Reads the pixels of a source at a given size (the source size by default). */
function readPixels(source: DrawableSource, width = source.width, height = source.height): Pixels {
  const canvas = width === source.width && height === source.height ? createCanvas(width, height) : drawScaled(source, width, height, null);
  try {
    const ctx = getContext2D(canvas, { willReadFrequently: true });
    if (width === source.width && height === source.height) ctx.drawImage(source, 0, 0);
    return { data: ctx.getImageData(0, 0, width, height).data, width, height };
  } finally {
    releaseCanvas(canvas);
  }
}

/** Encodes raw pixels, flattening onto `background` when one is given (always for JPG). */
async function encodePixels(px: Pixels, mime: OutputMime, quality: number | undefined, background: string | null): Promise<Blob> {
  const layer = createCanvas(px.width, px.height);
  let flat: AnyCanvas | null = null;
  try {
    getContext2D(layer).putImageData(new ImageData(px.data as Uint8ClampedArray<ArrayBuffer>, px.width, px.height), 0, 0);
    const fill = background ?? (mime === "image/jpeg" ? "#ffffff" : null);
    if (!fill) return await canvasToBlob(layer, mime, quality);
    flat = createCanvas(px.width, px.height);
    const ctx = getContext2D(flat);
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, px.width, px.height);
    ctx.drawImage(layer, 0, 0);
    return await canvasToBlob(flat, mime, quality);
  } finally {
    releaseCanvas(layer);
    if (flat) releaseCanvas(flat);
  }
}

export async function upscale(job: UpscaleJob, bitmap: ImageBitmap, onProgress: Progress): Promise<ImageOutputResult<"upscale">> {
  const { width, height } = job;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new ImageToolError("INVALID_DIMENSIONS", "Width and height must be whole numbers of at least 1 pixel.");
  }
  if (width * height > LIMITS.maxUpscalePixels || width > LIMITS.maxOutputSide || height > LIMITS.maxOutputSide) {
    throw new ImageToolError(
      "OUTPUT_TOO_LARGE",
      `The result would be ${width.toLocaleString("en-US")} × ${height.toLocaleString("en-US")} pixels. The largest result this tool can make in a browser is ${LIMITS.maxUpscalePixels / 1_000_000} megapixels; choose a smaller factor or size.`,
    );
  }
  const source = readPixels(bitmap);
  const out = resampleLanczos(source, width, height, (f) => onProgress?.(f * 0.8));
  if (job.sharpen > 0) {
    // The sharpening radius follows the enlargement, so 4× gets a slightly wider mask than 2×.
    const factor = Math.max(width / bitmap.width, height / bitmap.height);
    unsharpMask(out, job.sharpen, Math.min(2.5, 0.5 + factor * 0.3), 2);
  }
  onProgress?.(0.9);
  const blob = await encodePixels(out, job.mime, job.quality, job.background);
  onProgress?.(1);
  return { kind: "upscale", blob, width, height };
}

export async function enhance(job: EnhanceJob, bitmap: ImageBitmap): Promise<ImageOutputResult<"enhance">> {
  const scale = job.maxSide ? Math.min(1, job.maxSide / Math.max(bitmap.width, bitmap.height)) : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  if (width * height > LIMITS.maxOutputPixels) {
    throw new ImageToolError("OUTPUT_TOO_LARGE", "This image is too large to enhance in a browser. Reduce its size first with the image resizer.");
  }
  const px = readPixels(bitmap, width, height);
  enhancePixels(px, job.settings);
  const blob = await encodePixels(px, job.mime, job.quality, job.background);
  return { kind: "enhance", blob, width, height };
}

export async function pdfImage(job: PdfImageJob, bitmap: ImageBitmap): Promise<PdfImageResult> {
  const reduce = job.maxSide ? Math.min(1, job.maxSide / Math.max(bitmap.width, bitmap.height)) : 1;
  // A JPEG goes into the PDF byte-for-byte when it needs no resizing and uses RGB or greyscale.
  // Its EXIF rotation is applied by the page's transform, so the bytes stay untouched.
  if (reduce === 1) {
    const head = new Uint8Array(await job.file.slice(0, 512 * 1024).arrayBuffer());
    const info = isJpeg(head) ? readJpegInfo(head) : null;
    const shown = info ? (info.orientation >= 5 ? { width: info.height, height: info.width } : { width: info.width, height: info.height }) : null;
    if (info && shown && (info.components === 3 || info.components === 1) && shown.width === bitmap.width && shown.height === bitmap.height) {
      return {
        kind: "pdf-image",
        jpeg: job.file.slice(0, job.file.size, "image/jpeg"),
        width: info.width,
        height: info.height,
        orientation: info.orientation,
        colorSpace: info.components === 1 ? "DeviceGray" : "DeviceRGB",
        passthrough: true,
      };
    }
  }
  const width = Math.max(1, Math.round(bitmap.width * reduce));
  const height = Math.max(1, Math.round(bitmap.height * reduce));
  // Transparent areas become white, like paper.
  const canvas = drawScaled(bitmap, width, height, "#ffffff");
  try {
    const jpeg = await canvasToBlob(canvas, "image/jpeg", job.quality);
    return { kind: "pdf-image", jpeg, width, height, orientation: 1, colorSpace: "DeviceRGB", passthrough: false };
  } finally {
    releaseCanvas(canvas);
  }
}

export async function merge(job: MergeJob, onProgress: Progress): Promise<MergeResult> {
  if (job.files.length < 2) throw new ImageToolError("INVALID_TARGET", "Add at least two images to merge.");
  // Read every image's size first (decoding one at a time keeps memory low).
  const sizes: { width: number; height: number }[] = [];
  for (const file of job.files) {
    const bitmap = await decodeImage(file);
    sizes.push({ width: bitmap.width, height: bitmap.height });
    bitmap.close();
  }
  const layout = mergeLayout(sizes, job.layout);
  const canvas = createCanvas(layout.width, layout.height);
  try {
    const ctx = getContext2D(canvas);
    const fill = job.background ?? (job.mime === "image/jpeg" ? "#ffffff" : null);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, layout.width, layout.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    for (let i = 0; i < job.files.length; i++) {
      const bitmap = await decodeImage(job.files[i]);
      const r = layout.rects[i];
      try {
        if (r.width < bitmap.width / 2 || r.height < bitmap.height / 2) {
          // Big reductions go through the stepped downscaler to avoid aliasing.
          const scaled = drawScaled(bitmap, r.width, r.height, null);
          ctx.drawImage(scaled, r.x, r.y);
          releaseCanvas(scaled);
        } else {
          ctx.drawImage(bitmap, r.x, r.y, r.width, r.height);
        }
      } finally {
        bitmap.close();
      }
      onProgress?.((i + 1) / (job.files.length + 1));
    }
    const blob = await canvasToBlob(canvas, job.mime, job.quality);
    return { kind: "merge", blob, width: layout.width, height: layout.height, limitScale: layout.limitScale };
  } finally {
    releaseCanvas(canvas);
  }
}

const GROW_STEPS = [1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

export async function inflate(job: InflateJob, bitmap: ImageBitmap, onProgress: Progress): Promise<InflateResult> {
  const target = Math.round(job.targetBytes);
  if (!Number.isFinite(target) || target < 1024 || target > LIMITS.maxFileBytes) {
    throw new ImageToolError("INVALID_TARGET", "Enter a target size between 1 KB and 50 MB.");
  }
  const base = { kind: "inflate" as const, width: bitmap.width, height: bitmap.height };
  if (job.file.size >= target) {
    return { ...base, blob: job.file, quality: null, reached: true, alreadyLarger: true, paddedBytes: 0 };
  }

  if (job.method === "pad") {
    const original = new Uint8Array(await job.file.arrayBuffer());
    let jpeg: Uint8Array;
    let quality: number | null = null;
    if (job.sourceMime === "image/jpeg" && isJpeg(original)) {
      jpeg = original;
    } else {
      quality = 0.92;
      const canvas = drawScaled(bitmap, bitmap.width, bitmap.height, "#ffffff");
      try {
        jpeg = new Uint8Array(await (await canvasToBlob(canvas, "image/jpeg", quality)).arrayBuffer());
      } finally {
        releaseCanvas(canvas);
      }
    }
    const padded = padJpeg(jpeg, target);
    onProgress?.(1);
    return {
      ...base,
      blob: new Blob([padded as Uint8Array<ArrayBuffer>], { type: "image/jpeg" }),
      quality,
      reached: padded.length >= target,
      alreadyLarger: false,
      paddedBytes: padded.length - jpeg.length,
    };
  }

  // Quality method: raise JPG quality first, then enlarge the dimensions step by step.
  let best: { blob: Blob; width: number; height: number; quality: number } | null = null;
  const tryAt = async (width: number, height: number, quality: number) => {
    const canvas = drawScaled(bitmap, width, height, "#ffffff");
    try {
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (!best || blob.size > best.blob.size) best = { blob, width, height, quality };
      return blob.size;
    } finally {
      releaseCanvas(canvas);
    }
  };
  for (const quality of [0.92, 0.96, 1]) {
    if ((await tryAt(bitmap.width, bitmap.height, quality)) >= target) break;
  }
  onProgress?.(0.3);
  const bestSoFar = () => best as { blob: Blob; width: number; height: number; quality: number } | null;
  if (bestSoFar()!.blob.size < target) {
    for (const [index, step] of GROW_STEPS.entries()) {
      const width = Math.round(bitmap.width * step);
      const height = Math.round(bitmap.height * step);
      if (width * height > LIMITS.maxOutputPixels || width > LIMITS.maxOutputSide || height > LIMITS.maxOutputSide) break;
      onProgress?.(0.3 + (0.7 * index) / GROW_STEPS.length);
      // Small steps keep the result close to the target instead of far above it.
      if ((await tryAt(width, height, 0.95)) >= target) break;
      // Last resort at the largest size: maximum quality.
      if (index === GROW_STEPS.length - 1) await tryAt(width, height, 1);
    }
  }
  onProgress?.(1);
  const chosen = bestSoFar()!;
  return { ...base, blob: chosen.blob, width: chosen.width, height: chosen.height, quality: chosen.quality, reached: chosen.blob.size >= target, alreadyLarger: false, paddedBytes: 0 };
}
