"use client";

import { useState } from "react";
import { Segmented } from "@/components/controls/fields";
import { runDocumentRequest } from "@/lib/documents/client";
import { DocumentToolError } from "@/lib/documents/errors";
import { assertPdfHeader, DOC_LIMITS } from "@/lib/documents/validate";
import { formatBytes, KB } from "@/lib/utils/format";
import { SingleFileConverter } from "./single-file-converter";

type Dpi = "72" | "150" | "300";
type Limit = "none" | "50" | "100" | "200" | "500";

const DPI_HINT: Record<Dpi, string> = {
  "72": "Screen size: small files for email and chat.",
  "150": "Sharp on screen and fine for most forms and printing at home.",
  "300": "Print quality: large files with the most detail.",
};

export function PdfToJpgTool() {
  const [dpi, setDpi] = useState<Dpi>("150");
  const [limit, setLimit] = useState<Limit>("none");
  const maxBytes = limit === "none" ? undefined : Number(limit) * KB;

  return (
    <SingleFileConverter
      tool="pdf-to-jpg"
      accept=".pdf,application/pdf"
      hint={`PDF up to ${formatBytes(DOC_LIMITS.pdfToJpgMaxBytes)} and ${DOC_LIMITS.pdfToJpgMaxPages} pages`}
      prompt="Drop a PDF to convert to JPG"
      buttonLabel="Choose PDF file"
      inputLabel="PDF"
      outputLabel="JPG images"
      actionLabel="Convert to JPG"
      busyLabel="Converting to JPG…"
      downloadLabel="Download"
      settingsKey={`${dpi}-${limit}`}
      check={async (file) => {
        assertPdfHeader(new Uint8Array(await file.slice(0, 1024).arrayBuffer()), file.size, DOC_LIMITS.pdfToJpgMaxBytes);
      }}
      convert={async (file, { signal, onProgress }) => {
        const result = await runDocumentRequest(
          { type: "pdf-to-jpg", data: await file.arrayBuffer(), dpi: Number(dpi), maxBytes, title: file.name.replace(/\.[^.]+$/, "") },
          { signal, onProgress, timeoutMs: 10 * 60_000 },
        );
        if (result.type !== "pdf-to-jpg") throw new DocumentToolError("CONVERSION_FAILED", "The conversion didn't complete. Please try again.");
        const notes: string[] = [];
        if (result.kind === "zip") notes.push(`The ${result.pages} JPGs are in one ZIP file, numbered by page. Open it to get the images.`);
        if (maxBytes && result.overLimit > 0) {
          notes.push(
            `${result.overLimit} ${result.overLimit === 1 ? "page is" : "pages are"} still above ${formatBytes(maxBytes)} at the smallest readable size. Choose a larger limit, or crop the image afterwards.`,
          );
        } else if (result.reduced > 0) {
          notes.push(
            `${result.reduced} ${result.reduced === 1 ? "page was" : "pages were"} saved at a lower resolution than ${dpi} DPI to ${maxBytes ? `stay within ${formatBytes(maxBytes)}` : "stay within the browser's image size limit"}.`,
          );
        }
        return {
          blob: new Blob([result.bytes as BlobPart], { type: result.kind === "zip" ? "application/zip" : "image/jpeg" }),
          fileName: result.fileName,
          details: [`${result.pages} ${result.pages === 1 ? "page" : "pages"}`, `${dpi} DPI`, ...(result.kind === "zip" ? [`largest image ${formatBytes(result.largest)}`] : [])],
          notes,
        };
      }}
      beforeConvert={
        <div className="grid gap-5 sm:grid-cols-2">
          <Segmented<Dpi>
            legend="Resolution"
            value={dpi}
            onChange={setDpi}
            hint={DPI_HINT[dpi]}
            options={[
              { value: "72", label: "72 DPI" },
              { value: "150", label: "150 DPI" },
              { value: "300", label: "300 DPI" },
            ]}
          />
          <Segmented<Limit>
            legend="Maximum size per image"
            value={limit}
            onChange={setLimit}
            hint={limit === "none" ? "Highest quality at the chosen resolution." : "Each JPG is kept at or under this size, for upload forms."}
            options={[
              { value: "none", label: "No limit" },
              { value: "50", label: "50 KB" },
              { value: "100", label: "100 KB" },
              { value: "200", label: "200 KB" },
              { value: "500", label: "500 KB" },
            ]}
          />
        </div>
      }
    />
  );
}
