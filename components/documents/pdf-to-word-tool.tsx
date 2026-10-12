"use client";

import { runDocumentRequest } from "@/lib/documents/client";
import { DocumentToolError } from "@/lib/documents/errors";
import { assertPdfHeader, documentFileName, DOC_LIMITS } from "@/lib/documents/validate";
import { formatBytes } from "@/lib/utils/format";
import { SingleFileConverter } from "./single-file-converter";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function PdfToWordTool() {
  return (
    <SingleFileConverter
      tool="pdf-to-word"
      accept=".pdf,application/pdf"
      hint={`PDF with selectable text · up to ${formatBytes(DOC_LIMITS.pdfToWordMaxBytes)} and ${DOC_LIMITS.pdfToWordMaxPages} pages`}
      prompt="Drop a PDF to convert to Word"
      buttonLabel="Choose PDF file"
      inputLabel="PDF"
      outputLabel="Word document"
      actionLabel="Convert to Word"
      busyLabel="Converting to Word…"
      downloadLabel="Download DOCX"
      check={async (file) => {
        // Only the header is needed to recognise a PDF; the worker reads the whole file.
        assertPdfHeader(new Uint8Array(await file.slice(0, 1024).arrayBuffer()), file.size, DOC_LIMITS.pdfToWordMaxBytes);
      }}
      convert={async (file, { signal, onProgress }) => {
        const result = await runDocumentRequest({ type: "pdf-to-word", data: await file.arrayBuffer(), title: file.name.replace(/\.[^.]+$/, "") }, { signal, onProgress });
        if (result.type !== "pdf-to-word") throw new DocumentToolError("CONVERSION_FAILED", "The conversion didn't complete. Please try again.");
        const notes: string[] = [];
        if (result.scannedPages > 0) {
          notes.push(
            `${result.scannedPages} ${result.scannedPages === 1 ? "page is a scanned image" : "pages are scanned images"} with no selectable text. ${result.scannedPages === 1 ? "It is" : "They are"} marked in the document but not converted, because this tool doesn't do OCR.`,
          );
        }
        notes.push("Check the document before using it: images aren't carried over, and columns, unusual fonts and complex layouts may need tidying in Word.");
        return {
          blob: new Blob([result.bytes as BlobPart], { type: DOCX_MIME }),
          fileName: documentFileName(file.name, "docx"),
          details: [
            `${result.pages} ${result.pages === 1 ? "page" : "pages"}`,
            `${result.paragraphs} ${result.paragraphs === 1 ? "paragraph" : "paragraphs"}`,
            ...(result.tables > 0 ? [`${result.tables} ${result.tables === 1 ? "table" : "tables"}`] : []),
          ],
          notes,
        };
      }}
      beforeConvert={
        <p className="text-sm leading-relaxed text-ink-soft">
          Works with PDFs that contain real text (you can select words in a PDF reader). Scanned pages and photos of documents
          need OCR, which this tool doesn&apos;t do.
        </p>
      }
    />
  );
}

