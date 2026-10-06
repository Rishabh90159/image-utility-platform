/**
 * Image formats the tools can read and write. Every tool reads its
 * capabilities from this table.
 *
 * HEIC and SVG are input-only: browsers can't encode them, so they never
 * appear as an output format (see OutputMime).
 */
export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/svg+xml";

/** Formats the browser's canvas can encode. */
export type OutputMime = "image/jpeg" | "image/png" | "image/webp";

export interface FormatInfo {
  mime: ImageMime;
  label: string;
  extension: string;
  /** Extra extensions accepted by the file picker. */
  altExtensions?: string[];
  /** Extra MIME types some systems report for this format. */
  altMimes?: string[];
  /** Lossy formats accept a quality setting when encoding. */
  lossy: boolean;
  supportsTransparency: boolean;
  /** False for input-only formats. */
  encodable: boolean;
}

export const FORMATS: Record<ImageMime, FormatInfo> = {
  "image/jpeg": { mime: "image/jpeg", label: "JPG", extension: "jpg", altExtensions: ["jpeg"], lossy: true, supportsTransparency: false, encodable: true },
  "image/png": { mime: "image/png", label: "PNG", extension: "png", lossy: false, supportsTransparency: true, encodable: true },
  "image/webp": { mime: "image/webp", label: "WebP", extension: "webp", lossy: true, supportsTransparency: true, encodable: true },
  "image/heic": {
    mime: "image/heic",
    label: "HEIC",
    extension: "heic",
    altExtensions: ["heif"],
    altMimes: ["image/heif", "image/heic-sequence", "image/heif-sequence"],
    lossy: true,
    supportsTransparency: true,
    encodable: false,
  },
  "image/svg+xml": { mime: "image/svg+xml", label: "SVG", extension: "svg", lossy: false, supportsTransparency: true, encodable: false },
};

/** Formats every Phase 1 tool accepts. */
export const ALL_INPUT_FORMATS: ImageMime[] = ["image/jpeg", "image/png", "image/webp"];

/** Raster formats including HEIC, for tools that can decode iPhone photos. */
export const RASTER_INPUT_FORMATS: ImageMime[] = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/** The format to save in when the user keeps "same as original". Input-only formats become JPG. */
export function outputMimeFor(mime: ImageMime): OutputMime {
  return mime === "image/heic" || mime === "image/svg+xml" ? "image/jpeg" : mime;
}

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
    const info = FORMATS[mime];
    parts.add(mime);
    parts.add(`.${info.extension}`);
    for (const ext of info.altExtensions ?? []) parts.add(`.${ext}`);
    for (const alt of info.altMimes ?? []) parts.add(alt);
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
