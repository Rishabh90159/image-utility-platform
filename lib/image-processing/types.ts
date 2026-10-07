import type { EnhanceSettings } from "./enhance";
import type { ImageMime, OutputMime } from "./formats";
import type { MergeLayoutOptions } from "./merge-layout";
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
  /** Highest quality the search may use (0–1). */
  maxQuality?: number;
}

/** Enlarge (or resize) with Lanczos-3 resampling plus optional sharpening. */
export interface UpscaleJob extends JobBase {
  kind: "upscale";
  width: number;
  height: number;
  /** Unsharp-mask strength after resampling, 0 (off) to about 1.5. */
  sharpen: number;
  mime: OutputMime;
  quality?: number;
  background: string | null;
}

/** Apply photo adjustments. With maxSide, works on a reduced copy for a fast preview. */
export interface EnhanceJob extends JobBase {
  kind: "enhance";
  settings: EnhanceSettings;
  maxSide?: number;
  mime: OutputMime;
  quality?: number;
  background: string | null;
}

/** Prepare one image for a PDF page: JPEGs pass through untouched when possible. */
export interface PdfImageJob extends JobBase {
  kind: "pdf-image";
  /** JPEG quality for images that have to be re-encoded. */
  quality: number;
  /** Longest side in pixels; larger images are reduced (the "smaller file" option). */
  maxSide?: number;
}

/** Combine several images into one. `file` is the first image; `files` holds all of them in order. */
export interface MergeJob extends JobBase {
  kind: "merge";
  files: Blob[];
  layout: MergeLayoutOptions;
  background: string | null;
  mime: OutputMime;
  quality?: number;
}

/** Make a file at least `targetBytes` big, by padding (pixels unchanged) or by raising quality and dimensions. */
export interface InflateJob extends JobBase {
  kind: "inflate";
  sourceMime: ImageMime;
  targetBytes: number;
  method: "pad" | "quality";
}

export type Job = ProbeJob | EncodeJob | TargetJob | UpscaleJob | EnhanceJob | PdfImageJob | MergeJob | InflateJob;

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

export interface ImageOutputResult<K extends "upscale" | "enhance"> {
  kind: K;
  blob: Blob;
  width: number;
  height: number;
}

export interface PdfImageResult {
  kind: "pdf-image";
  jpeg: Blob;
  /** Stored pixel size of `jpeg` (before orientation). */
  width: number;
  height: number;
  /** EXIF orientation to apply on the page (1 when the image was re-encoded upright). */
  orientation: number;
  colorSpace: "DeviceRGB" | "DeviceGray";
  /** True when the original JPEG bytes were embedded without re-encoding. */
  passthrough: boolean;
}

export interface MergeResult {
  kind: "merge";
  blob: Blob;
  width: number;
  height: number;
  /** Below 1 when the result was scaled down to fit browser limits. */
  limitScale: number;
}

export interface InflateResult {
  kind: "inflate";
  blob: Blob;
  width: number;
  height: number;
  /** Quality used when re-encoding, or null when the original pixels were kept. */
  quality: number | null;
  /** Whether the file reached the target size. */
  reached: boolean;
  /** The original was already at least the target size and is returned unchanged. */
  alreadyLarger: boolean;
  /** Padding bytes added (pad method). */
  paddedBytes: number;
}

export type JobResult =
  | ProbeResult
  | EncodeResult
  | TargetResult
  | ImageOutputResult<"upscale">
  | ImageOutputResult<"enhance">
  | PdfImageResult
  | MergeResult
  | InflateResult;

export type ResultFor<J extends Job> = Extract<JobResult, { kind: J["kind"] }>;
