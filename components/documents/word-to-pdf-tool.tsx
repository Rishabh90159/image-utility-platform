"use client";

import { assertDocx, documentFileName, DOC_LIMITS } from "@/lib/documents/validate";
import { formatBytes } from "@/lib/utils/format";
import { SingleFileConverter } from "./single-file-converter";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function WordToPdfTool() {
  return (
    <SingleFileConverter
      tool="word-to-pdf"
      accept={`.docx,${DOCX_MIME}`}
      hint={`Word .docx · up to ${formatBytes(DOC_LIMITS.wordMaxBytes)} and ${DOC_LIMITS.wordMaxPages} pages`}
      prompt="Drop a Word document to convert to PDF"
      buttonLabel="Choose .docx file"
      inputLabel="DOCX"
      outputLabel="PDF"
      actionLabel="Convert to PDF"
      busyLabel="Converting to PDF…"
      downloadLabel="Download PDF"
      check={async (file) => {
        await assertDocx(new Uint8Array(await file.arrayBuffer()));
      }}
      convert={async (file, { signal, onProgress }) => {
        const { convertWordToPdf } = await import("@/lib/documents/word-to-pdf/render");
        const title = file.name.replace(/\.[^.]+$/, "");
        const result = await convertWordToPdf(file, { title, signal, onProgress });
        const notes: string[] = [];
        if (result.unsearchableWords > 0) {
          notes.push(
            result.searchableWords > 0
              ? "Some text (non-Latin scripts such as Hindi or Chinese) is shown correctly in the PDF but can't be searched or copied."
              : "The text in this PDF is shown correctly but can't be searched or copied, because it isn't in the Latin alphabet.",
          );
        }
        return {
          blob: new Blob([result.bytes as BlobPart], { type: "application/pdf" }),
          fileName: documentFileName(file.name, "pdf"),
          details: [`${result.pages} ${result.pages === 1 ? "page" : "pages"}`],
          notes,
        };
      }}
      beforeConvert={
        <p className="text-sm leading-relaxed text-ink-soft">
          Fonts embedded in the document are used, then the fonts on this device. A font you don&apos;t have installed is
          replaced by a similar one of the same style, so line breaks may differ slightly from Word.
        </p>
      }
    />
  );
}
