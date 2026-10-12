import { DocumentToolError } from "./errors";
import { formatBytes, MB } from "@/lib/utils/format";

/**
 * Limits for the PDF and Word tools. Everything runs in the browser, so these
 * protect the visitor's device (memory, time) rather than a server.
 */
export const DOC_LIMITS = {
  /** Word to PDF: largest .docx accepted, and most pages rendered. */
  wordMaxBytes: 25 * MB,
  wordMaxPages: 100,
  /** Uncompressed size of everything inside a .docx (guards against zip bombs). */
  wordMaxUnzippedBytes: 300 * MB,
  /** PDF to Word. */
  pdfToWordMaxBytes: 50 * MB,
  pdfToWordMaxPages: 200,
  /** Merge PDF. */
  mergeMaxFiles: 30,
  mergeMaxFileBytes: 100 * MB,
  mergeMaxTotalBytes: 200 * MB,
  mergeMaxPages: 2000,
} as const;

export type DocumentKind = "pdf" | "zip" | "ole" | "rtf" | "unknown";

const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

/**
 * Identifies a file by its first bytes, never by its name or MIME type.
 * PDF readers accept a header anywhere in the first 1024 bytes, so this does too.
 */
export function sniffDocument(bytes: Uint8Array): DocumentKind {
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return "zip";
  if (bytes.length >= 8 && OLE_SIGNATURE.every((value, index) => bytes[index] === value)) return "ole";
  if (bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === "{\\rtf") return "rtf";
  const head = bytes.subarray(0, 1024);
  for (let i = 0; i + 5 <= head.length; i++) {
    if (head[i] === 0x25 && head[i + 1] === 0x50 && head[i + 2] === 0x44 && head[i + 3] === 0x46 && head[i + 4] === 0x2d) return "pdf";
  }
  return "unknown";
}

/**
 * Password-protected .docx files are not zip files: Office wraps them in an
 * OLE container with an "EncryptionInfo" stream. Look for that stream name.
 */
export function isEncryptedOfficeFile(bytes: Uint8Array): boolean {
  if (sniffDocument(bytes) !== "ole") return false;
  const name = "EncryptionInfo";
  const pattern = new Uint8Array(name.length * 2);
  for (let i = 0; i < name.length; i++) pattern[i * 2] = name.charCodeAt(i);
  outer: for (let i = 0; i + pattern.length <= bytes.length; i++) {
    for (let j = 0; j < pattern.length; j++) if (bytes[i + j] !== pattern[j]) continue outer;
    return true;
  }
  return false;
}

/** Extension of a file name, lower-case without the dot ("" if none). */
export function extensionOf(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  return match ? match[1].toLowerCase() : "";
}

/** Download name like "report.pdf" from "Report Final.docx"; unsafe characters are removed. */
export function documentFileName(originalName: string, extension: string, suffix = ""): string {
  const base =
    originalName
      .replace(/\.[^./\\]+$/, "")
      .replace(/[^\w\-. ]+/g, "")
      .replace(/^[.\s]+/, "")
      .trim()
      .slice(0, 80) || "document";
  return `${base}${suffix ? `-${suffix}` : ""}.${extension}`;
}

function checkSize(size: number, maxBytes: number, what: string) {
  if (size === 0) throw new DocumentToolError("EMPTY_FILE", "This file is empty (0 bytes). Choose the file again, or check that it downloaded completely.");
  if (size > maxBytes) {
    throw new DocumentToolError("FILE_TOO_LARGE", `This ${what} is ${formatBytes(size)}. The limit is ${formatBytes(maxBytes)}, to keep processing reliable in your browser.`);
  }
}

/** Checks that bytes are a PDF (by content), within the size limit. */
export function assertPdf(bytes: Uint8Array, maxBytes: number): void {
  assertPdfHeader(bytes.subarray(0, 1024), bytes.length, maxBytes);
}

/** Same check from the first 1024 bytes and the file size, so a large file needn't be read first. */
export function assertPdfHeader(head: Uint8Array, size: number, maxBytes: number): void {
  checkSize(size, maxBytes, "PDF");
  const kind = sniffDocument(head);
  if (kind === "pdf") return;
  if (kind === "zip" || kind === "ole" || kind === "rtf") {
    throw new DocumentToolError("NOT_A_PDF", "This is a Word or Office document, not a PDF. To turn a Word file into a PDF, use Word to PDF.");
  }
  throw new DocumentToolError("NOT_A_PDF", "This file isn't a PDF. Its contents don't start like a PDF document, even if its name ends in .pdf.");
}

/**
 * Checks that bytes are a Word .docx document: a zip with a Word main part,
 * whose unpacked size is reasonable. Legacy .doc, RTF and encrypted files get
 * their own explanations.
 */
export async function assertDocx(bytes: Uint8Array, maxBytes: number = DOC_LIMITS.wordMaxBytes): Promise<void> {
  checkSize(bytes.length, maxBytes, "document");
  const kind = sniffDocument(bytes);
  if (kind === "ole") {
    if (isEncryptedOfficeFile(bytes)) {
      throw new DocumentToolError("PASSWORD_PROTECTED", "This document is password-protected. Open it in Word, remove the password (File › Info › Protect Document), save it, and try again.");
    }
    throw new DocumentToolError("LEGACY_DOC", "This is an older Word .doc file. Only .docx is supported: open it in Word or Google Docs and save it as .docx first.");
  }
  if (kind === "rtf") {
    throw new DocumentToolError("NOT_A_DOCX", "This is an RTF file. Only .docx is supported: open it in Word or Google Docs and save it as .docx first.");
  }
  if (kind === "pdf") {
    throw new DocumentToolError("NOT_A_DOCX", "This is already a PDF. To get an editable Word file from it, use PDF to Word.");
  }
  if (kind !== "zip") {
    throw new DocumentToolError("NOT_A_DOCX", "This file isn't a Word .docx document. Its contents don't match the .docx format, even if its name does.");
  }

  const { default: JSZip } = await import("jszip");
  let zip: InstanceType<typeof JSZip>;
  try {
    zip = await JSZip.loadAsync(bytes, { checkCRC32: false });
  } catch {
    throw new DocumentToolError("CORRUPT", "This .docx file is damaged and can't be opened. Try opening and re-saving it in Word.");
  }
  const contentTypes = zip.file("[Content_Types].xml");
  const main = zip.file("word/document.xml");
  if (!contentTypes || !main) {
    const isOtherOffice = Boolean(zip.file("xl/workbook.xml") || zip.file("ppt/presentation.xml"));
    throw new DocumentToolError(
      "NOT_A_DOCX",
      isOtherOffice ? "This is an Excel or PowerPoint file, not a Word document. Only .docx Word documents are supported." : "This zip file isn't a Word .docx document.",
    );
  }
  let unzipped = 0;
  zip.forEach((_path, entry) => {
    // JSZip records each entry's declared uncompressed size from the zip directory.
    const size = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
    unzipped += typeof size === "number" && size > 0 ? size : 0;
  });
  if (unzipped > DOC_LIMITS.wordMaxUnzippedBytes) {
    throw new DocumentToolError("FILE_TOO_LARGE", "This document expands to more data than can be processed safely in a browser.");
  }
  const types = await contentTypes.async("string");
  if (!/wordprocessingml\.document\.main\+xml|ms-word\.document\.macroEnabled\.main\+xml|wordprocessingml\.template\.main\+xml/.test(types)) {
    throw new DocumentToolError("NOT_A_DOCX", "This file isn't a Word .docx document.");
  }
}
