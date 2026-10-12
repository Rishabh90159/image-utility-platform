/**
 * User-facing errors for the PDF and Word tools. Like the image tools, messages
 * are written for people: no stack traces, library messages or file contents.
 */
const CODES = [
  "EMPTY_FILE",
  "FILE_TOO_LARGE",
  "TOTAL_TOO_LARGE",
  "TOO_MANY_FILES",
  "TOO_FEW_FILES",
  "NOT_A_PDF",
  "NOT_A_DOCX",
  "LEGACY_DOC",
  "PASSWORD_PROTECTED",
  "CORRUPT",
  "TOO_MANY_PAGES",
  "NO_TEXT",
  "OUT_OF_MEMORY",
  "CONVERSION_FAILED",
] as const;

export type DocumentErrorCode = (typeof CODES)[number];

export class DocumentToolError extends Error {
  readonly code: DocumentErrorCode;

  constructor(code: DocumentErrorCode, message: string) {
    super(message);
    this.name = "DocumentToolError";
    this.code = code;
  }
}

export interface SerializedDocumentError {
  code: DocumentErrorCode;
  message: string;
}

export function serializeDocumentError(error: unknown): SerializedDocumentError {
  const normalized = toDocumentToolError(error);
  return { code: normalized.code, message: normalized.message };
}

/** Anything thrown by a library becomes a generic, safe message. */
export function toDocumentToolError(error: unknown, fallback = "Something went wrong while processing the file. Please try again."): DocumentToolError {
  if (error instanceof DocumentToolError) return error;
  // Errors serialized by our own worker. Other objects with a "code" (library errors) are not trusted.
  if (error && typeof error === "object" && !(error instanceof Error) && "code" in error && "message" in error) {
    const { code, message } = error as SerializedDocumentError;
    if ((CODES as readonly string[]).includes(code) && typeof message === "string") return new DocumentToolError(code, message);
  }
  if (error instanceof RangeError || (error instanceof Error && /out of memory|allocation failed|array buffer allocation/i.test(error.message))) {
    return new DocumentToolError("OUT_OF_MEMORY", "Your browser ran out of memory. Try a smaller file, or a desktop browser.");
  }
  return new DocumentToolError("CONVERSION_FAILED", fallback);
}

export function abortError(): DOMException {
  return new DOMException("The operation was cancelled.", "AbortError");
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
