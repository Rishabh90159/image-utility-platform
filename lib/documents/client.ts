import { abortError, DocumentToolError, toDocumentToolError, type SerializedDocumentError } from "./errors";
import type { CompressPdfResult } from "./compress-pdf";
import type { PdfSummary } from "./merge";
import type { PdfToJpgResult } from "./pdf-to-jpg";
import type { PdfToWordResult } from "./pdf-to-word/convert";

/**
 * Runs PDF jobs in a dedicated worker, one per job, so cancelling simply
 * terminates it and its memory is released. Files are read in this browser
 * tab and handed to the worker; nothing is sent over the network.
 * Without module-worker support, the same code runs on the main thread.
 */
export type DocumentRequest =
  | { type: "inspect-pdf"; data: ArrayBuffer }
  | { type: "merge-pdf"; files: { name: string; data: ArrayBuffer }[] }
  | { type: "pdf-to-word"; data: ArrayBuffer; title: string }
  | { type: "compress-pdf"; data: ArrayBuffer; targetBytes: number }
  | { type: "pdf-to-jpg"; data: ArrayBuffer; dpi: number; maxBytes?: number; title: string };

export type DocumentResult =
  | { type: "inspect-pdf"; summary: PdfSummary }
  | { type: "merge-pdf"; bytes: Uint8Array; pages: number }
  | ({ type: "pdf-to-word" } & PdfToWordResult)
  | ({ type: "compress-pdf" } & CompressPdfResult)
  | ({ type: "pdf-to-jpg" } & PdfToJpgResult);

export type DocumentResponse = DocumentResult | { type: "progress"; value: number } | { type: "error"; error: SerializedDocumentError };

const RESPONSE_TYPES = new Set(["inspect-pdf", "merge-pdf", "pdf-to-word", "compress-pdf", "pdf-to-jpg", "progress", "error"]);

interface RunOptions {
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
  /** Gives up after this long (ms); a stuck job must not spin forever. */
  timeoutMs?: number;
}

function timeoutError(): DocumentToolError {
  return new DocumentToolError("CONVERSION_FAILED", "This file is taking too long to process in your browser. Try a smaller file.");
}

async function runOnMainThread(request: DocumentRequest, options: RunOptions): Promise<DocumentResult> {
  const { runDocumentJob } = await import("./jobs");
  if (options.signal?.aborted) throw abortError();
  try {
    return await runDocumentJob(request, (value) => options.onProgress?.(value));
  } catch (error) {
    throw toDocumentToolError(error);
  }
}

export function runDocumentRequest(request: DocumentRequest, options: RunOptions = {}): Promise<DocumentResult> {
  if (options.signal?.aborted) return Promise.reject(abortError());
  let worker: Worker;
  try {
    if (typeof Worker === "undefined") throw new Error("no worker");
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  } catch {
    return runOnMainThread(request, options);
  }
  return new Promise((resolve, reject) => {
    let started = false;
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      fn();
    };
    const timer = setTimeout(() => finish(() => reject(timeoutError())), options.timeoutMs ?? 5 * 60_000);
    options.signal?.addEventListener("abort", () => finish(() => reject(abortError())), { once: true });
    worker.onmessage = (event: MessageEvent<DocumentResponse>) => {
      const message = event.data;
      // pdf.js's worker code, loaded inside our worker, posts its own handshake messages: ignore anything that isn't ours.
      if (!message || typeof message !== "object" || !RESPONSE_TYPES.has((message as { type?: string }).type ?? "")) return;
      if (message.type === "progress") {
        started = true;
        options.onProgress?.(message.value);
        return;
      }
      if (message.type === "error") finish(() => reject(toDocumentToolError(message.error)));
      else finish(() => resolve(message));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      // A crash mid-job is almost always memory; retrying on the main thread could freeze the tab.
      if (started) finish(() => reject(new DocumentToolError("OUT_OF_MEMORY", "Your browser ran out of memory while processing this file. Try a smaller file, or a desktop browser.")));
      // The worker never started (no module-worker support): run on the main thread instead.
      else finish(() => runOnMainThread(request, options).then(resolve, reject));
    };
    const transfer = request.type === "merge-pdf" ? request.files.map((file) => file.data) : [request.data];
    worker.postMessage(request, transfer);
  });
}
