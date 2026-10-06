import type { ImageMime } from "./formats";
import type { TargetOutcome } from "./target-size";

/**
 * Jobs are plain, structured-cloneable objects so the same request can run in
 * a Web Worker or on the main thread. `sourceId` lets the processor reuse the
 * decoded image across repeated jobs on the same file.
 */
interface JobBase {
  sourceId: string;
  file: Blob;
}

/** Decode the image to confirm it is readable and measure it. */
export interface ProbeJob extends JobBase {
  kind: "probe";
  checkTransparency: boolean;
}

/** Draw the image at a given size and encode it in a given format. */
export interface EncodeJob extends JobBase {
  kind: "encode";
  width: number;
  height: number;
  mime: ImageMime;
  /** 0–1, for lossy formats. */
  quality?: number;
  /** Fill colour placed behind transparent pixels (required when the output has no alpha). */
  background: string | null;
  /** PNG only: reduce to at most this many colours (2–256). Omit for a lossless PNG. */
  pngColors?: number;
  pngDither?: boolean;
}

/** Find the best encode at or below a target file size. */
export interface TargetJob extends JobBase {
  kind: "target";
  sourceMime: ImageMime;
  targetBytes: number;
  mime: "image/jpeg" | "image/webp";
  allowResize: boolean;
  background: string;
}

export type Job = ProbeJob | EncodeJob | TargetJob;

export interface ProbeResult {
  kind: "probe";
  width: number;
  height: number;
  hasTransparency: boolean;
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
