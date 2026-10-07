import { toImageToolError } from "@/lib/image-processing/errors";
import type { RemoveBackgroundRequest, RemoveBackgroundResult } from "./run";
import type { BgWorkerRequest, BgWorkerResponse } from "./worker";

/**
 * Entry point for the background remover. The worker (and with it the
 * runtime and model) is created on the first request only, so none of it is
 * downloaded when someone merely opens the page.
 */
let worker: Worker | null = null;
let failed = false;
let nextId = 1;
const pending = new Map<number, { resolve: (r: RemoveBackgroundResult) => void; reject: (e: unknown) => void; onProgress?: (v: number) => void }>();

function abortError(): DOMException {
  return new DOMException("The operation was cancelled.", "AbortError");
}

function workerSupported(): boolean {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap !== "undefined";
}

async function onMainThread(request: RemoveBackgroundRequest, onProgress?: (v: number) => void): Promise<RemoveBackgroundResult> {
  const { removeBackground } = await import("./run");
  try {
    return await removeBackground(request, onProgress);
  } catch (error) {
    throw toImageToolError(error);
  }
}

function getWorker(): Worker | null {
  if (worker || failed || !workerSupported()) return worker;
  try {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  } catch {
    failed = true;
    return null;
  }
  worker.onmessage = (event: MessageEvent<BgWorkerResponse>) => {
    const message = event.data;
    const entry = pending.get(message.id);
    if (!entry) return;
    if (message.type === "progress") {
      entry.onProgress?.(message.value);
      return;
    }
    pending.delete(message.id);
    if (message.type === "result") entry.resolve(message.result);
    else entry.reject(toImageToolError(message.error));
  };
  worker.onerror = (event) => {
    event.preventDefault();
    worker?.terminate();
    worker = null;
    failed = true;
    for (const [id, entry] of pending) {
      pending.delete(id);
      entry.reject(toImageToolError(new Error("worker failed")));
    }
  };
  return worker;
}

export function removeImageBackground(
  request: RemoveBackgroundRequest,
  options: { signal?: AbortSignal; onProgress?: (fraction: number) => void } = {},
): Promise<RemoveBackgroundResult> {
  const { signal, onProgress } = options;
  if (signal?.aborted) return Promise.reject(abortError());
  const current = getWorker();
  if (!current) return onMainThread(request, onProgress);
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    // The worker can't stop mid-inference; a cancelled request's result is simply ignored.
    signal?.addEventListener(
      "abort",
      () => {
        if (pending.delete(id)) reject(abortError());
      },
      { once: true },
    );
    const message: BgWorkerRequest = { id, request };
    current.postMessage(message);
  });
}
