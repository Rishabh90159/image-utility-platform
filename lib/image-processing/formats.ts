/**
 * Image formats the tools can read and write. Phase 2 formats (e.g. HEIC input)
 * are added here first; every tool reads its capabilities from this table.
 */
export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

export interface FormatInfo {
  mime: ImageMime;
  label: string;
  extension: string;
  /** Lossy formats accept a quality setting when encoding. */
  lossy: boolean;
  supportsTransparency: boolean;
}

export const FORMATS: Record<ImageMime, FormatInfo> = {
  "image/jpeg": { mime: "image/jpeg", label: "JPG", extension: "jpg", lossy: true, supportsTransparency: false },
  "image/png": { mime: "image/png", label: "PNG", extension: "png", lossy: false, supportsTransparency: true },
  "image/webp": { mime: "image/webp", label: "WebP", extension: "webp", lossy: true, supportsTransparency: true },
};

export const ALL_INPUT_FORMATS: ImageMime[] = ["image/jpeg", "image/png", "image/webp"];

export function formatLabel(mime: ImageMime): string {
  return FORMATS[mime].label;
}

export function isImageMime(value: string): value is ImageMime {
  return value in FORMATS;
}

/** Value for an <input type="file" accept> attribute. */
export function acceptAttribute(mimes: ImageMime[]): string {
  const parts = new Set<string>();
  for (const mime of mimes) {
    parts.add(mime);
    parts.add(`.${FORMATS[mime].extension}`);
    if (mime === "image/jpeg") parts.add(".jpeg");
  }
  return [...parts].join(",");
}

/** Hard limits that keep the browser tab from running out of memory. */
export const LIMITS = {
  /** Largest file accepted for processing. */
  maxFileBytes: 50 * 1024 * 1024,
  /** Largest decoded image accepted (pixels). ~100 MP needs ~400 MB of RAM to decode. */
  maxInputPixels: 100_000_000,
  /** Largest output canvas side in pixels. */
  maxOutputSide: 16_384,
  /** Largest output canvas area in pixels. Some mobile browsers fail earlier; that is handled gracefully. */
  maxOutputPixels: 50_000_000,
} as const;
