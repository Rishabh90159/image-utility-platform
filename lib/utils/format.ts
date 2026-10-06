/**
 * Byte formatting. 1 KB = 1024 bytes, matching how Windows, most upload forms
 * and File.size-based checks count kilobytes.
 *
 * Values are rounded UP to the displayed precision so a file is never shown as
 * smaller than it really is (a 102,401-byte file shows as 100.1 KB, not 100.0 KB).
 */
export const KB = 1024;
export const MB = 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) {
    const kb = bytes / KB;
    const decimals = kb < 100 ? 1 : 0;
    const rounded = ceilTo(kb, decimals);
    // 1023.6 KB would round up to "1024 KB"; show it in MB instead.
    if (rounded >= 1024) return `${ceilTo(bytes / MB, 2).toFixed(2)} MB`;
    return `${rounded.toFixed(decimals)} KB`;
  }
  return `${ceilTo(bytes / MB, 2).toFixed(2)} MB`;
}

export function formatExactBytes(bytes: number): string {
  return `${bytes.toLocaleString("en-US")} bytes`;
}

/** Percentage saved relative to the original. Negative values mean the output is larger. */
export function percentSaved(original: number, output: number): number {
  if (original <= 0) return 0;
  return (1 - output / original) * 100;
}

export function formatSavings(original: number, output: number): string {
  const pct = percentSaved(original, output);
  if (Math.abs(pct) < 0.05) return "No change";
  if (pct > 0) return `${pct.toFixed(1)}% smaller`;
  return `${Math.abs(pct).toFixed(1)}% larger`;
}

export function formatDimensions(width: number, height: number): string {
  return `${width.toLocaleString("en-US")} × ${height.toLocaleString("en-US")} px`;
}

function ceilTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  // The epsilon stops exact values (e.g. 100.0) being pushed up by floating-point error.
  return Math.ceil(value * factor - 1e-9) / factor;
}

/** Builds a download name like "holiday-photo-resized.jpg" from the original file name. */
export function outputFileName(originalName: string, suffix: string, extension: string): string {
  const base =
    originalName
      .replace(/\.[^./\\]+$/, "")
      .replace(/[^\w\-. ]+/g, "")
      .replace(/^[.\s]+/, "")
      .trim()
      .slice(0, 80) || "image";
  return `${base}-${suffix}.${extension}`;
}

/** Coarse size bucket for analytics, so exact file sizes are never reported. */
export function sizeBucket(bytes: number): string {
  if (bytes < 100 * KB) return "<100KB";
  if (bytes < MB) return "100KB-1MB";
  if (bytes < 5 * MB) return "1-5MB";
  if (bytes < 20 * MB) return "5-20MB";
  return ">20MB";
}
