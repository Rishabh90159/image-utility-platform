import { decodeImage, drawScaled, getContext2D, releaseCanvas } from "@/lib/image-processing/canvas";
import { ImageToolError } from "@/lib/image-processing/errors";
import { LIMITS } from "@/lib/image-processing/formats";
import { TRACE_SIZE, traceToSvg, type TraceOptions, type TraceResult } from "./trace";

export interface VectorizeRequest {
  file: Blob;
  options: TraceOptions;
}

export interface VectorizeResult extends TraceResult {
  /** Original image size; the SVG's width and height attributes use it. */
  width: number;
  height: number;
}

/** Decodes, reduces to the tracing size and traces. Works in a worker or on the main thread. */
export async function runVectorize({ file, options }: VectorizeRequest): Promise<VectorizeResult> {
  const bitmap = await decodeImage(file);
  try {
    const { width, height } = bitmap;
    if (width * height > LIMITS.maxInputPixels) {
      throw new ImageToolError("DIMENSIONS_TOO_LARGE", "This image has too many pixels to process safely in a browser.");
    }
    const scale = Math.min(1, TRACE_SIZE[options.detail] / Math.max(width, height));
    const tw = Math.max(1, Math.round(width * scale));
    const th = Math.max(1, Math.round(height * scale));
    const canvas = drawScaled(bitmap, tw, th, null);
    let pixels: ImageData;
    try {
      pixels = getContext2D(canvas, { willReadFrequently: true }).getImageData(0, 0, tw, th);
    } finally {
      releaseCanvas(canvas);
    }
    let traced: TraceResult;
    try {
      traced = traceToSvg(pixels, options, { width, height });
    } catch {
      throw new ImageToolError("VECTORIZE_FAILED", "Tracing this image failed. Try a lower detail level or fewer colours.");
    }
    if (traced.pathCount === 0) {
      throw new ImageToolError(
        "VECTORIZE_FAILED",
        "No shapes were found to trace. If the image is very light, raise the threshold; if you removed the background, try keeping it.",
      );
    }
    return { ...traced, width, height };
  } finally {
    bitmap.close();
  }
}
