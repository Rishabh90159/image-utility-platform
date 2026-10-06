import { runJob } from "./core";
import { serializeError } from "./errors";
import type { Job } from "./types";

/**
 * Web Worker entry. Keeps CPU-heavy decoding, resampling, quantization and
 * repeated encoding off the main thread so the page stays responsive.
 *
 * Jobs run one at a time (they share the decoded-image cache), and a running
 * job can be cancelled: the progress callback throws once cancellation is
 * requested, which stops a multi-step search at its next step.
 */
export type WorkerRequest = { type: "run"; id: number; job: Job } | { type: "cancel"; id: number };

export type WorkerResponse =
  | { id: number; type: "progress"; value: number }
  | { id: number; type: "result"; result: unknown }
  | { id: number; type: "error"; error: { code: string; message: string } };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse) => void;
};

class Cancelled extends Error {}

const cancelled = new Set<number>();
let queue: Promise<void> = Promise.resolve();

scope.onmessage = (event) => {
  const message = event.data;
  if (message.type === "cancel") {
    cancelled.add(message.id);
    return;
  }
  queue = queue.then(() => handle(message.id, message.job));
};

async function handle(id: number, job: Job): Promise<void> {
  if (cancelled.delete(id)) return;
  try {
    const result = await runJob(job, (value) => {
      if (cancelled.has(id)) throw new Cancelled();
      scope.postMessage({ id, type: "progress", value });
    });
    if (!cancelled.has(id)) scope.postMessage({ id, type: "result", result });
  } catch (error) {
    if (!(error instanceof Cancelled) && !cancelled.has(id)) {
      scope.postMessage({ id, type: "error", error: serializeError(error) });
    }
  } finally {
    cancelled.delete(id);
  }
}
