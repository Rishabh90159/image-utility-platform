import type { ImageMime, OutputMime } from "./formats";
import type { TargetOutcome } from "./target-size";

/**
 * Jobs are plain, structured-cloneable objects so the same request can run in
 * a Web Worker or on the main thread. `sourceId` lets the processor reuse the
 * decoded image across repeated jobs on the same file.
 */
interface JobBase {
  sourceId: string;
  file: Blob;
  /** Free the decoded image as soon as the job finishes (batch processing). */
  noCache?: boolean;
}

/** Rectangle in whole pixels. */
export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type QuarterTurn = 0 | 90 | 180 | 270;

/**
 * Geometric edits applied to the decoded image before it is scaled and
 * encoded. Order: rotate (clockwise), then mirror, then crop. Crop coordinates
 * are in the rotated and mirrored image.
 */
export interface ImageTransform {
  rotate?: QuarterTurn;
  flipH?: boolean;
  crop?: PixelRect;
}

/**
 * Background clean-up for scanned or photographed signatures and documents.
 * Pixels lighter than `threshold` (0–255 luminance) become pure white or fully
 * transparent; ink pixels are kept, with a soft transition so edges stay smooth.
 */
export interface BackgroundCleanup {
  threshold: number;
  to: "white" | "transparent";
}

/** Decode the image to confirm it is readable and measure it. */
export interface ProbeJob extends JobBase {
  kind: "probe";
  checkTransparency: boolean;
  /** Also return a small preview with this longest side in pixels. */
  thumbnail?: number;
  /** Also return a browser-displayable preview (for formats such as HEIC) with this longest side. */
  preview?: number;
}

/** Draw the image at a given size and encode it in a given format. */
export interface EncodeJob extends JobBase {
  kind: "encode";
  width: number;
  height: number;
  mime: OutputMime;
  /** 0–1, for lossy formats. */
  quality?: number;
  /** Fill colour placed behind transparent pixels (required when the output has no alpha). */
  background: string | null;
  /** PNG only: reduce to at most this many colours (2–256). Omit for a lossless PNG. */
  pngColors?: number;
  pngDither?: boolean;
  transform?: ImageTransform;
  cleanup?: BackgroundCleanup;
  /** JPG only: pixels-per-inch to record in the file header (for printing at a physical size). */
  dpi?: number;
}

/** Find the best encode at or below a target file size. */
export interface TargetJob extends JobBase {
  kind: "target";
  sourceMime: ImageMime;
  targetBytes: number;
  mime: "image/jpeg" | "image/webp";
  allowResize: boolean;
  background: string;
  transform?: ImageTransform;
  cleanup?: BackgroundCleanup;
  /** Exact output size. Without it, the (cropped) source size is the starting point. */
  width?: number;
  height?: number;
  /** JPG only: pixels-per-inch to record in the file header. */
  dpi?: number;
}

export type Job = ProbeJob | EncodeJob | TargetJob;

export interface ProbeResult {
  kind: "probe";
  width: number;
  height: number;
  hasTransparency: boolean;
  thumbnail?: Blob;
  preview?: Blob;
}

export interface EncodeResult {
  kind: "encode";
  blob: Blob;
  width: number;
  height: number;
  /** For palette PNGs: number of colours used. */
  paletteColors?: number;
  /** For palette PNGs: true if every colour was kept exactly. */
  paletteLossless?: boolean;
}

export interface TargetResult {
  kind: "target";
  blob: Blob;
  width: number;
  height: number;
  /** Encoder quality used (0–1), or null when the original file was returned unchanged. */
  quality: number | null;
  outcome: TargetOutcome;
  /** True when the original already met the target and was returned untouched. */
  usedOriginal: boolean;
}

export type JobResult = ProbeResult | EncodeResult | TargetResult;

export type ResultFor<J extends Job> = J extends ProbeJob
  ? ProbeResult
  : J extends EncodeJob
    ? EncodeResult
    : TargetResult;
