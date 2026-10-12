import { serializeDocumentError } from "./errors";
import type { DocumentRequest, DocumentResponse } from "./client";
import { runDocumentJob } from "./jobs";

/**
 * Web Worker for the PDF tools: parsing and writing PDFs and .docx files is
 * CPU-heavy and would otherwise freeze the page. One worker runs one job.
 */
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<DocumentRequest>) => void) | null;
  postMessage: (message: DocumentResponse, transfer?: Transferable[]) => void;
};

scope.onmessage = async (event) => {
  // Tells the client the worker started, so a later crash isn't mistaken for missing worker support.
  scope.postMessage({ type: "progress", value: 0 });
  let last = 0;
  try {
    const result = await runDocumentJob(event.data, (value) => {
      if (value - last >= 0.01 || value === 1) {
        last = value;
        scope.postMessage({ type: "progress", value });
      }
    });
    scope.postMessage(result, "bytes" in result ? [result.bytes.buffer as ArrayBuffer] : []);
  } catch (error) {
    scope.postMessage({ type: "error", error: serializeDocumentError(error) });
  }
};
