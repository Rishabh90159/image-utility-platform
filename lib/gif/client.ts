import { ImageToolError } from "@/lib/image-processing/errors";
import type { GifInfo } from "./decode";
import type { GifResizeOptions, GifResizeResult } from "./resize";

/**
 * Runs GIF jobs in a dedicated worker, one per job, so cancelling (or choosing
 * another file) simply terminates it. The GIF code is only loaded by the GIF
 * resizer page. Without worker support, the same code runs on the main thread.
 */
export type GifRequest = { type: "info"; file: Blob } | { type: "resize"; file: Blob; options: GifResizeOptions };

export type GifResponse =
  | { type: "info"; info: GifInfo }
  | { type: "progress"; value: number }
  | { type: "result"; result: GifResizeResult }
  | { type: "error"; kind: "format" | "limit" | "other"; message: string };

interface RunOptions {
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}

function abortError(): DOMException {
  return new DOMException("The operation was cancelled.", "AbortError");
}

function toError(kind: "format" | "limit" | "other", message: string): ImageToolError {
  if (kind === "format") {
    return new ImageToolError("DECODE_FAILED", `We couldn't read this GIF. ${message} It may be damaged or only partly downloaded.`);
  }
  if (kind === "limit") return new ImageToolError("OUTPUT_TOO_LARGE", message);
  return new ImageToolError(
    "OUT_OF_MEMORY",
    "Your browser ran out of memory while processing this GIF. Try smaller dimensions, or a desktop browser.",
  );
}

async function runOnMainThread(request: GifRequest, options: RunOptions): Promise<GifResponse> {
  const [{ GifFormatError, readGifInfo }, { GifLimitError, resizeGif }] = await Promise.all([import("./decode"), import("./resize")]);
  if (options.signal?.aborted) throw abortError();
  try {
    const bytes = new Uint8Array(await request.file.arrayBuffer());
    if (request.type === "info") return { type: "info", info: readGifInfo(bytes) };
    return { type: "result", result: resizeGif(bytes, request.options, options.onProgress) };
  } catch (error) {
    const kind = error instanceof GifFormatError ? "format" : error instanceof GifLimitError ? "limit" : "other";
    throw toError(kind, error instanceof Error ? error.message : "");
  }
}

function run(request: GifRequest, options: RunOptions = {}): Promise<GifResponse> {
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
    const stop = () => worker.terminate();
    options.signal?.addEventListener(
      "abort",
      () => {
        stop();
        reject(abortError());
      },
      { once: true },
    );
    worker.onmessage = (event: MessageEvent<GifResponse>) => {
      const message = event.data;
      if (message.type === "progress") {
        started = true;
        options.onProgress?.(message.value);
        return;
      }
      stop();
      if (message.type === "error") reject(toError(message.kind, message.message));
      else resolve(message);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      stop();
      // A crash mid-job is almost always memory; retrying on the main thread could freeze the tab.
      if (started) reject(toError("other", ""));
      // The worker never started (no module-worker support): run on the main thread instead.
      else runOnMainThread(request, options).then(resolve, reject);
    };
    worker.postMessage(request);
  });
}

export async function readGifInfoAsync(file: Blob, options?: RunOptions): Promise<GifInfo> {
  const response = await run({ type: "info", file }, options);
  if (response.type !== "info") throw toError("other", "");
  return response.info;
}

export async function resizeGifAsync(file: Blob, resize: GifResizeOptions, options?: RunOptions): Promise<GifResizeResult> {
  const response = await run({ type: "resize", file, options: resize }, options);
  if (response.type !== "result") throw toError("other", "");
  return response.result;
}
