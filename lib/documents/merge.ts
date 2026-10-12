import { EncryptedPDFError, PDFDocument } from "@cantoo/pdf-lib";
import { DocumentToolError } from "./errors";
import { assertPdf, DOC_LIMITS } from "./validate";

/**
 * Merge PDF: copies real page objects (content, resources, size, rotation)
 * from each input into a new document with pdf-lib. Bytes are never simply
 * concatenated. Runs in a worker in the browser, and in Node for tests.
 */
export interface PdfSummary {
  pages: number;
  /** Encrypted with an owner password only: opened and copied without restrictions applied. */
  restricted: boolean;
}

/**
 * Opens a PDF. Files that are encrypted but open without a password (owner
 * password only, common for statements) are decrypted; files that need a
 * password to open are rejected with an explanation.
 */
export async function openPdf(bytes: Uint8Array): Promise<{ doc: PDFDocument; restricted: boolean }> {
  assertPdf(bytes, DOC_LIMITS.mergeMaxFileBytes);
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: false });
    return { doc: checkPages(doc), restricted: false };
  } catch (error) {
    if (error instanceof DocumentToolError) throw error;
    if (!(error instanceof EncryptedPDFError)) throw corrupt();
  }
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false, password: "" });
    return { doc: checkPages(doc), restricted: true };
  } catch (error) {
    if (error instanceof DocumentToolError) throw error;
    throw new DocumentToolError("PASSWORD_PROTECTED", "This PDF is password-protected. Remove the password in a PDF reader (or print it to a new PDF), then add it again.");
  }
}

function corrupt(): DocumentToolError {
  return new DocumentToolError("CORRUPT", "This PDF is damaged and can't be read. Try opening it and saving a new copy, or download it again.");
}

function checkPages(doc: PDFDocument): PDFDocument {
  if (doc.getPageCount() === 0) throw corrupt();
  return doc;
}

export async function inspectPdf(bytes: Uint8Array): Promise<PdfSummary> {
  const { doc, restricted } = await openPdf(bytes);
  return { pages: doc.getPageCount(), restricted };
}

/**
 * Merges PDFs in the given order. `onProgress` receives 0–1 as files are copied.
 * Throws DocumentToolError with the 1-based index of the failing file in its message.
 */
export async function mergePdfs(files: { name: string; bytes: Uint8Array }[], onProgress?: (fraction: number) => void): Promise<{ bytes: Uint8Array; pages: number }> {
  if (files.length < 2) throw new DocumentToolError("TOO_FEW_FILES", "Add at least two PDFs to merge.");
  if (files.length > DOC_LIMITS.mergeMaxFiles) throw new DocumentToolError("TOO_MANY_FILES", `You can merge up to ${DOC_LIMITS.mergeMaxFiles} PDFs at once.`);
  const total = files.reduce((sum, file) => sum + file.bytes.length, 0);
  if (total > DOC_LIMITS.mergeMaxTotalBytes) {
    throw new DocumentToolError("TOTAL_TOO_LARGE", "Together these PDFs are too large to merge in a browser. Merge them in smaller groups.");
  }

  const output = await PDFDocument.create({ updateMetadata: false });
  let pages = 0;
  for (const [index, file] of files.entries()) {
    let source: PDFDocument;
    try {
      source = (await openPdf(file.bytes)).doc;
    } catch (error) {
      const known = error instanceof DocumentToolError ? error : corrupt();
      throw new DocumentToolError(known.code, `File ${index + 1} (${safeName(file.name)}): ${known.message}`);
    }
    pages += source.getPageCount();
    if (pages > DOC_LIMITS.mergeMaxPages) {
      throw new DocumentToolError("TOO_MANY_PAGES", `The merged PDF would have more than ${DOC_LIMITS.mergeMaxPages} pages. Merge fewer files at once.`);
    }
    let copied;
    try {
      copied = await output.copyPages(source, source.getPageIndices());
    } catch {
      throw new DocumentToolError("CORRUPT", `File ${index + 1} (${safeName(file.name)}) has pages that can't be copied. It may be damaged.`);
    }
    for (const page of copied) output.addPage(page);
    onProgress?.((index + 1) / (files.length + 1));
  }
  output.setProducer("Imgifyr");
  output.setCreator("Imgifyr Merge PDF");
  const bytes = await output.save({ useObjectStreams: true });
  onProgress?.(1);
  return { bytes, pages };
}

/** File names are shown back to the user only, trimmed so a long name can't flood the message. */
function safeName(name: string): string {
  const trimmed = name.replace(/[\u0000-\u001f]/g, "").trim();
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed || "untitled";
}
