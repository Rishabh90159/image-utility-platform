import { toImageToolError } from "./errors";
import type { OutputMime } from "./formats";
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

function workerSupported(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap !== "undefined" &&
    "convertToBlob" in OffscreenCanvas.prototype
  );
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

/** One worker and the jobs waiting for its replies. */
class WorkerChannel {
  private worker: Worker | null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  /** True once the worker crashed or was stopped; later jobs run on the main thread. */
  dead = false;

  constructor(worker: Worker) {
    this.worker = worker;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      const entry = this.pending.get(message.id);
      if (!entry) return;
      if (message.type === "progress") {
        entry.onProgress?.(message.value);
        return;
      }
      this.pending.delete(message.id);
      if (message.type === "result") entry.resolve(message.result);
      else entry.reject(toImageToolError(message.error));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      // The worker crashed or failed to load: finish outstanding jobs on the main thread.
      for (const entry of this.kill()) {
        runOnMainThread(entry.job, entry).then(entry.resolve, entry.reject);
      }
    };
  }

  /** Stops the worker and returns the jobs that never finished. */
  kill(): Pending[] {
    this.dead = true;
    this.worker?.terminate();
    this.worker = null;
    const outstanding = [...this.pending.values()];
    this.pending.clear();
    return outstanding;
  }

  run(job: Job, options: ProcessOptions): Promise<unknown> {
    const { signal } = options;
    if (signal?.aborted) return Promise.reject(abortError());
    const worker = this.worker;
    if (this.dead || !worker) return runOnMainThread(job, options);
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { job, resolve, reject, onProgress: options.onProgress, signal });
      signal?.addEventListener(
        "abort",
        () => {
          if (!this.pending.delete(id)) return;
          const cancel: WorkerRequest = { type: "cancel", id };
          this.worker?.postMessage(cancel);
          reject(abortError());
        },
        { once: true },
      );
      const request: WorkerRequest = { type: "run", id, job };
      worker.postMessage(request);
    });
  }
}

function spawnChannel(): WorkerChannel | null {
  if (!workerSupported()) return null;
  try {
    return new WorkerChannel(new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }));
  } catch {
    return null;
  }
}

let shared: WorkerChannel | null = null;
let sharedUnavailable = false;

function getSharedChannel(): WorkerChannel | null {
  if (sharedUnavailable) return null;
  if (shared?.dead) {
    sharedUnavailable = true;
    return null;
  }
  if (shared) return shared;
  shared = spawnChannel();
  if (!shared) sharedUnavailable = true;
  return shared;
}

export function processImage<J extends Job>(job: J, options: ProcessOptions = {}): Promise<ResultFor<J>> {
  const channel = getSharedChannel();
  if (!channel) {
    if (options.signal?.aborted) return Promise.reject(abortError());
    return runOnMainThread(job, options) as Promise<ResultFor<J>>;
  }
  return channel.run(job, options) as Promise<ResultFor<J>>;
}

export interface ProcessingPool {
  /** Queues a job; at most `size` jobs run at the same time. */
  run<J extends Job>(job: J): Promise<ResultFor<J>>;
  readonly size: number;
  /** Stops all workers and rejects queued and running jobs with an AbortError. */
  dispose(): void;
}

/** Default number of parallel jobs for batch work, based on the device. */
export function defaultConcurrency(): number {
  if (typeof navigator === "undefined") return 1;
  const cores = navigator.hardwareConcurrency || 2;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  // Each running job holds a full decoded photo in memory; phones run out quickly.
  if (memory !== undefined && memory <= 4) return 1;
  return Math.min(3, Math.max(1, cores - 1));
}

/**
 * A small pool of dedicated workers for batch processing, so one slow or
 * failing image never blocks the rest and the page stays responsive.
 */
export function createProcessingPool(requested: number = defaultConcurrency()): ProcessingPool {
  const size = workerSupported() ? Math.max(1, Math.min(4, requested)) : 1;
  const channels: (WorkerChannel | null | undefined)[] = [];
  const busy: boolean[] = [];
  const queue: { job: Job; resolve: (value: unknown) => void; reject: (reason: unknown) => void }[] = [];
  const controller = new AbortController();

  const pump = () => {
    for (let slot = 0; slot < size && queue.length > 0; slot++) {
      if (busy[slot]) continue;
      const task = queue.shift()!;
      busy[slot] = true;
      if (channels[slot] === undefined || channels[slot]?.dead) channels[slot] = spawnChannel();
      const channel = channels[slot];
      const options = { signal: controller.signal };
      const running = channel ? channel.run(task.job, options) : runOnMainThread(task.job, options);
      running.then(task.resolve, task.reject).finally(() => {
        busy[slot] = false;
        if (!controller.signal.aborted) pump();
      });
    }
  };

  return {
    size,
    run<J extends Job>(job: J) {
      if (controller.signal.aborted) return Promise.reject(abortError());
      return new Promise<ResultFor<J>>((resolve, reject) => {
        queue.push({ job, resolve: resolve as (value: unknown) => void, reject });
        pump();
      });
    },
    dispose() {
      controller.abort();
      for (const task of queue.splice(0)) task.reject(abortError());
      for (const channel of channels) channel?.kill();
    },
  };
}

const encodeSupport = new Map<OutputMime, Promise<boolean>>();

/** Whether this browser can produce files in the given format (some Safari versions can't encode WebP). */
export function canEncode(mime: OutputMime): Promise<boolean> {
  let result = encodeSupport.get(mime);
  if (!result) {
    result = detectEncodeSupport(mime);
    encodeSupport.set(mime, result);
  }
  return result;
}

async function detectEncodeSupport(mime: OutputMime): Promise<boolean> {
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
