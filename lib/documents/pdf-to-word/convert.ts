import type * as PdfJs from "pdfjs-dist/legacy/build/pdf.mjs";
import { DocumentToolError } from "../errors";
import { assertPdf, DOC_LIMITS } from "../validate";
import { buildDocx, docxBytes } from "./build-docx";
import { extractPdfText } from "./extract";
import { layoutDocument } from "./layout";

export interface PdfToWordResult {
  bytes: Uint8Array;
  pages: number;
  /** Pages with no selectable text but with images: scans, which need OCR. */
  scannedPages: number;
  /** Pages with no text at all. */
  emptyPages: number;
  paragraphs: number;
  tables: number;
}

/** PDF bytes → editable .docx bytes. `pdfjs` is passed in so tests can use the Node build. */
export async function convertPdfToWord(
  pdfjs: typeof PdfJs,
  bytes: Uint8Array,
  options: { title: string; onProgress?: (fraction: number) => void },
): Promise<PdfToWordResult> {
  assertPdf(bytes, DOC_LIMITS.pdfToWordMaxBytes);
  const pages = await extractPdfText(pdfjs, bytes, {
    maxPages: DOC_LIMITS.pdfToWordMaxPages,
    onProgress: (fraction) => options.onProgress?.(fraction * 0.85),
  });
  const layout = layoutDocument(pages);
  const withText = layout.filter((page) => !page.noText).length;
  const scannedPages = layout.filter((page) => page.scanned).length;
  if (withText === 0) {
    throw new DocumentToolError(
      "NO_TEXT",
      scannedPages > 0
        ? "This PDF is made of scanned images and has no selectable text. Converting scans needs OCR (text recognition), which this tool doesn't do."
        : "This PDF doesn't contain any text to convert.",
    );
  }
  const docx = await docxBytes(buildDocx(layout, options.title));
  options.onProgress?.(1);
  const blocks = layout.flatMap((page) => page.blocks);
  return {
    bytes: docx,
    pages: layout.length,
    scannedPages,
    emptyPages: layout.filter((page) => page.noText && !page.scanned).length,
    paragraphs: blocks.filter((block) => block.type === "paragraph").length,
    tables: blocks.filter((block) => block.type === "table").length,
  };
}
