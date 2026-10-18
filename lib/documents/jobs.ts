import type { DocumentRequest, DocumentResult } from "./client";

/**
 * The work behind each request, shared by the worker and the main-thread
 * fallback. Libraries are imported on demand so each job loads only what it needs.
 */
export async function runDocumentJob(request: DocumentRequest, onProgress: (fraction: number) => void): Promise<DocumentResult> {
  switch (request.type) {
    case "inspect-pdf": {
      const { inspectPdf } = await import("./merge");
      return { type: "inspect-pdf", summary: await inspectPdf(new Uint8Array(request.data)) };
    }
    case "merge-pdf": {
      const { mergePdfs } = await import("./merge");
      const files = request.files.map((file) => ({ name: file.name, bytes: new Uint8Array(file.data) }));
      const { bytes, pages } = await mergePdfs(files, onProgress);
      return { type: "merge-pdf", bytes, pages };
    }
    case "pdf-to-word": {
      const [pdfjs, { convertPdfToWord }] = await Promise.all([loadPdfJs(), import("./pdf-to-word/convert")]);
      const result = await convertPdfToWord(pdfjs, new Uint8Array(request.data), { title: request.title, onProgress });
      return { type: "pdf-to-word", ...result };
    }
    case "compress-pdf": {
      const [pdfjs, { compressPdf }] = await Promise.all([loadPdfJs(), import("./compress-pdf")]);
      const result = await compressPdf(pdfjs, new Uint8Array(request.data), { targetBytes: request.targetBytes, onProgress });
      return { type: "compress-pdf", ...result };
    }
    case "pdf-to-jpg": {
      const [pdfjs, { convertPdfToJpg }] = await Promise.all([loadPdfJs(), import("./pdf-to-jpg")]);
      const result = await convertPdfToJpg(pdfjs, new Uint8Array(request.data), { dpi: request.dpi, maxBytes: request.maxBytes, title: request.title, onProgress });
      return { type: "pdf-to-jpg", ...result };
    }
  }
}

/**
 * pdf.js normally starts its own worker. We are already off the main thread,
 * so its worker code is loaded here and pdf.js runs it in this thread instead
 * (no extra script URL, which also keeps the Content Security Policy simple).
 */
async function loadPdfJs() {
  const [pdfjs, pdfWorker] = await Promise.all([import("pdfjs-dist/legacy/build/pdf.mjs"), import("pdfjs-dist/legacy/build/pdf.worker.mjs")]);
  (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfWorker;
  return pdfjs;
}
