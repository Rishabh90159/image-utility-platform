import { formatBytes } from "@/lib/utils/format";
import { ImageToolError } from "./errors";
import { FORMATS, LIMITS, isImageMime, type ImageMime } from "./formats";
import { detectFormat, readDimensions, type Dimensions } from "./sniff";

/** Enough bytes to reach the frame header of virtually every JPEG, even with large EXIF blocks. */
const HEADER_BYTES = 512 * 1024;

export interface ValidatedFile {
  mime: ImageMime;
  /** Dimensions read from the file header, when available. */
  headerDimensions: Dimensions | null;
}

export interface ValidateOptions {
  accept: ImageMime[];
  /** Message used when the file is a supported image but not one this tool accepts. */
  wrongFormatMessage?: (detected: ImageMime) => string;
}

const UNSUPPORTED_NAMES: Record<string, string> = {
  "image/gif": "GIF",
  "image/bmp": "BMP",
  "image/tiff": "TIFF",
  "image/avif": "AVIF",
  "image/svg+xml": "SVG",
};

export function acceptedLabels(accept: ImageMime[]): string {
  return accept.map((m) => FORMATS[m].label).join(", ");
}

export async function validateImageFile(file: File, options: ValidateOptions): Promise<ValidatedFile> {
  if (file.size === 0) {
    throw new ImageToolError("EMPTY_FILE", "This file is empty. Please choose another image.");
  }
  if (file.size > LIMITS.maxFileBytes) {
    throw new ImageToolError(
      "FILE_TOO_LARGE",
      `This file is ${formatBytes(file.size)}. The maximum is ${formatBytes(LIMITS.maxFileBytes)}, so your browser doesn't run out of memory.`,
    );
  }

  let head: Uint8Array;
  try {
    head = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
  } catch {
    throw new ImageToolError(
      "DECODE_FAILED",
      "We couldn't read this file. It may have been moved or deleted, or your browser blocked access to it.",
    );
  }

  const detected = detectFormat(head);
  const accepted = acceptedLabels(options.accept);

  if (detected === "image/heic") {
    throw new ImageToolError(
      "HEIC_NOT_SUPPORTED",
      `HEIC photos aren't supported yet. On iPhone, set Settings > Camera > Formats to "Most Compatible", or share the photo as JPG first. Supported formats: ${accepted}.`,
    );
  }
  if (detected === null) {
    const looksLikeImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name);
    throw new ImageToolError(
      looksLikeImage ? "DECODE_FAILED" : "NOT_AN_IMAGE",
      looksLikeImage
        ? "This file doesn't look like a valid image. It may be damaged or only partly downloaded."
        : `This file isn't an image we can open. Supported formats: ${accepted}.`,
    );
  }
  if (!isImageMime(detected)) {
    const name = UNSUPPORTED_NAMES[detected] ?? "These";
    throw new ImageToolError("UNSUPPORTED_FORMAT", `${name} images aren't supported by this tool. Supported formats: ${accepted}.`);
  }
  if (!options.accept.includes(detected)) {
    throw new ImageToolError(
      "WRONG_FORMAT",
      options.wrongFormatMessage?.(detected) ??
        `This tool accepts ${accepted} images, but this file is a ${FORMATS[detected].label}.`,
    );
  }

  const headerDimensions = readDimensions(head, detected);
  if (headerDimensions) {
    const pixels = headerDimensions.width * headerDimensions.height;
    if (pixels > LIMITS.maxInputPixels) {
      throw new ImageToolError(
        "DIMENSIONS_TOO_LARGE",
        `This image is ${headerDimensions.width.toLocaleString("en-US")} × ${headerDimensions.height.toLocaleString("en-US")} pixels, which is too large to process safely in a browser (limit: ${Math.round(LIMITS.maxInputPixels / 1_000_000)} megapixels).`,
      );
    }
  }

  return { mime: detected, headerDimensions };
}
