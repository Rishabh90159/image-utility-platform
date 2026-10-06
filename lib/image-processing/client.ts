import { toImageToolError } from "./errors";
import type { ImageMime } from "./formats";
import type { Job, ResultFor } from "./types";
import type { WorkerRequest, WorkerResponse } from "./worker";

/**
 * Entry point used by the UI. Jobs run in a Web Worker when the browser
 * supports OffscreenCanvas in workers; otherwise (or if the worker fails to
 * start) the same pipeline is loaded on demand and runs on the main thread.
 */
interface Pending {
  job: Job;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export interface ProcessOptions {
  onProgress?: (fraction: number) => void;
  /** Aborting rejects the promise with an AbortError and stops multi-step jobs early. */
  signal?: AbortSignal;
}

let worker: Worker | null = null;
let workerUnavailable = false;
let nextId = 1;
const pending = new Map<number, Pending>();

function workerSupported(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap !== "undefined" &&
    "convertToBlob" in OffscreenCanvas.prototype
  );
}

function getWorker(): Worker | null {
  if (workerUnavailable || !workerSupported()) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  } catch {
    workerUnavailable = true;
    return null;
  }
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
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
    // The worker crashed or failed to load: finish outstanding jobs on the main thread.
    worker?.terminate();
    worker = null;
    workerUnavailable = true;
    const outstanding = [...pending.values()];
    pending.clear();
    for (const entry of outstanding) {
      runOnMainThread(entry.job, entry).then(entry.resolve, entry.reject);
    }
  };
  return worker;
}

function abortError(): DOMException {
  return new DOMException("The operation was cancelled.", "AbortError");
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function runOnMainThread(job: Job, options: ProcessOptions): Promise<unknown> {
  const core = await import("./core");
  const { signal, onProgress } = options;
  if (signal?.aborted) throw abortError();
  try {
    return await core.runJob(job, (value) => {
      if (signal?.aborted) throw abortError();
      onProgress?.(value);
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw toImageToolError(error);
  }
}

export function processImage<J extends Job>(job: J, options: ProcessOptions = {}): Promise<ResultFor<J>> {
  const { signal } = options;
  if (signal?.aborted) return Promise.reject(abortError());
  const target = getWorker();
  if (!target) return runOnMainThread(job, options) as Promise<ResultFor<J>>;

  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, {
      job,
      resolve: resolve as (value: unknown) => void,
      reject,
      onProgress: options.onProgress,
      signal,
    });
    signal?.addEventListener(
      "abort",
      () => {
        if (!pending.delete(id)) return;
        const cancel: WorkerRequest = { type: "cancel", id };
        worker?.postMessage(cancel);
        reject(abortError());
      },
      { once: true },
    );
    const request: WorkerRequest = { type: "run", id, job };
    target.postMessage(request);
  });
}

const encodeSupport = new Map<ImageMime, Promise<boolean>>();

/** Whether this browser can produce files in the given format (some Safari versions can't encode WebP). */
export function canEncode(mime: ImageMime): Promise<boolean> {
  let result = encodeSupport.get(mime);
  if (!result) {
    result = detectEncodeSupport(mime);
    encodeSupport.set(mime, result);
  }
  return result;
}

async function detectEncodeSupport(mime: ImageMime): Promise<boolean> {
  try {
    if (typeof OffscreenCanvas !== "undefined" && "convertToBlob" in OffscreenCanvas.prototype) {
      const canvas = new OffscreenCanvas(2, 2);
      canvas.getContext("2d")?.fillRect(0, 0, 2, 2);
      const blob = await canvas.convertToBlob({ type: mime, quality: 0.8 });
      return blob.type === mime;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    canvas.getContext("2d")?.fillRect(0, 0, 2, 2);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.8));
    return blob?.type === mime;
  } catch {
    return false;
  }
}

let sourceCounter = 0;

/** Unique id for a newly selected file, used to cache its decoded pixels. */
export function newSourceId(): string {
  sourceCounter += 1;
  return `src-${Date.now().toString(36)}-${sourceCounter}`;
}
