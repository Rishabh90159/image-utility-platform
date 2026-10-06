import { LIMITS } from "./formats";

/**
 * Output size rules for batch resizing. Images in a batch usually have
 * different shapes, so "lock aspect ratio" means "fit inside this box"
 * rather than forcing one exact size on every image.
 */
export interface BulkResizeSettings {
  mode: "pixels" | "percent";
  /** Pixel mode: either may be null when only the other is given. */
  width: number | null;
  height: number | null;
  lockAspect: boolean;
  percent: number;
  /** Leave images that are already smaller than the target at their size. */
  noEnlarge: boolean;
}

export type BulkSizeResult = { width: number; height: number } | { error: string };

/** Validates settings that don't depend on a particular image. */
export function bulkSettingsError(s: BulkResizeSettings): string | null {
  if (s.mode === "percent") {
    if (!Number.isFinite(s.percent) || s.percent <= 0 || s.percent > 400) return "Use a percentage between 1 and 400.";
    return null;
  }
  const valid = (n: number | null) => n === null || (Number.isInteger(n) && n >= 1 && n <= LIMITS.maxOutputSide);
  if (!valid(s.width) || !valid(s.height)) {
    return `Width and height must be whole numbers from 1 to ${LIMITS.maxOutputSide.toLocaleString("en-US")}.`;
  }
  if (s.width === null && s.height === null) return "Enter a width, a height, or both.";
  if (!s.lockAspect && (s.width === null || s.height === null)) return "Enter both width and height, or turn on “Lock aspect ratio”.";
  return null;
}

export function bulkTargetSize(sourceWidth: number, sourceHeight: number, s: BulkResizeSettings): BulkSizeResult {
  const settingsError = bulkSettingsError(s);
  if (settingsError) return { error: settingsError };

  let width: number;
  let height: number;
  if (s.mode === "percent") {
    const scale = s.noEnlarge ? Math.min(1, s.percent / 100) : s.percent / 100;
    width = sourceWidth * scale;
    height = sourceHeight * scale;
  } else if (s.lockAspect) {
    const scales: number[] = [];
    if (s.width !== null) scales.push(s.width / sourceWidth);
    if (s.height !== null) scales.push(s.height / sourceHeight);
    let scale = Math.min(...scales);
    if (s.noEnlarge) scale = Math.min(1, scale);
    width = sourceWidth * scale;
    height = sourceHeight * scale;
  } else {
    width = s.width!;
    height = s.height!;
    if (s.noEnlarge && (width > sourceWidth || height > sourceHeight)) {
      // Never upscale: shrink the requested box proportionally until it fits the source.
      const fit = Math.min(1, sourceWidth / width, sourceHeight / height);
      width *= fit;
      height *= fit;
    }
  }

  const out = { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  if (out.width > LIMITS.maxOutputSide || out.height > LIMITS.maxOutputSide || out.width * out.height > LIMITS.maxOutputPixels) {
    return { error: "The resized image would be too large for the browser to create." };
  }
  return out;
}
