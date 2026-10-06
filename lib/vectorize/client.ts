import { toImageToolError } from "@/lib/image-processing/errors";
import type { VectorizeRequest, VectorizeResult } from "./run";
import type { VectorizeWorkerRequest, VectorizeWorkerResponse } from "./worker";

/**
 * Runs tracing in a dedicated worker, loaded only when the PNG to SVG tool is
 * used. A new run cancels the previous one by replacing the worker, because
 * tracing can't be interrupted midway.
 */
let worker: Worker | null = null;
let nextId = 1;

function workerSupported(): boolean {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap !== "undefined";
}

function abortError(): DOMException {
  return new DOMException("The operation was cancelled.", "AbortError");
}

async function onMainThread(request: VectorizeRequest): Promise<VectorizeResult> {
  const { runVectorize } = await import("./run");
  try {
    return await runVectorize(request);
  } catch (error) {
    throw toImageToolError(error);
  }
}

export function cancelVectorize(): void {
  worker?.terminate();
  worker = null;
}

export function vectorize(request: VectorizeRequest, signal?: AbortSignal): Promise<VectorizeResult> {
  if (signal?.aborted) return Promise.reject(abortError());
  cancelVectorize();
  if (!workerSupported()) return onMainThread(request);
  let current: Worker;
  try {
    current = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  } catch {
    return onMainThread(request);
  }
  worker = current;
  const id = nextId++;
  return new Promise<VectorizeResult>((resolve, reject) => {
    const finish = () => {
      current.terminate();
      if (worker === current) worker = null;
    };
    signal?.addEventListener(
      "abort",
      () => {
        finish();
        reject(abortError());
      },
      { once: true },
    );
    current.onmessage = (event: MessageEvent<VectorizeWorkerResponse>) => {
      const message = event.data;
      if (message.id !== id) return;
      finish();
      if (message.type === "result") resolve(message.result);
      else reject(toImageToolError(message.error));
    };
    current.onerror = (event) => {
      event.preventDefault();
      finish();
      onMainThread(request).then(resolve, reject);
    };
    const message: VectorizeWorkerRequest = { id, request };
    current.postMessage(message);
  });
}
