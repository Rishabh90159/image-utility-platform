/**
 * User-facing errors. Messages are written for people, not developers, and no
 * stack trace or browser-internal error text is ever shown.
 */
export type ImageErrorCode =
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "NOT_AN_IMAGE"
  | "UNSUPPORTED_FORMAT"
  | "HEIC_NOT_SUPPORTED"
  | "WRONG_FORMAT"
  | "DIMENSIONS_TOO_LARGE"
  | "DECODE_FAILED"
  | "INVALID_DIMENSIONS"
  | "OUTPUT_TOO_LARGE"
  | "ENCODE_FAILED"
  | "ENCODER_UNSUPPORTED"
  | "INVALID_TARGET"
  | "OUT_OF_MEMORY"
  | "DECODER_UNAVAILABLE"
  | "INVALID_SVG"
  | "VECTORIZE_FAILED"
  | "ZIP_FAILED"
  | "MODEL_UNAVAILABLE"
  | "BACKGROUND_REMOVAL_FAILED"
  | "PDF_FAILED"
  | "UNKNOWN";

export class ImageToolError extends Error {
  readonly code: ImageErrorCode;

  constructor(code: ImageErrorCode, message: string) {
    super(message);
    this.name = "ImageToolError";
    this.code = code;
  }
}

export interface SerializedError {
  code: ImageErrorCode;
  message: string;
}

const GENERIC_MESSAGE =
  "Something went wrong while processing this image in your browser. Please try again, or try a smaller image.";

const MEMORY_MESSAGE =
  "Your browser ran out of memory while processing this image. Try smaller output dimensions, close other tabs, or use a desktop browser.";

export function toImageToolError(error: unknown): ImageToolError {
  if (error instanceof ImageToolError) return error;
  if (isSerializedError(error)) return new ImageToolError(error.code, error.message);
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/memory|allocation|RangeError/i.test(text)) return new ImageToolError("OUT_OF_MEMORY", MEMORY_MESSAGE);
  return new ImageToolError("UNKNOWN", GENERIC_MESSAGE);
}

export function serializeError(error: unknown): SerializedError {
  const normalized = toImageToolError(error);
  return { code: normalized.code, message: normalized.message };
}

function isSerializedError(value: unknown): value is SerializedError {
  return (
    typeof value === "object" &&
    value !== null &&
    !(value instanceof Error) &&
    typeof (value as SerializedError).code === "string" &&
    typeof (value as SerializedError).message === "string"
  );
}
