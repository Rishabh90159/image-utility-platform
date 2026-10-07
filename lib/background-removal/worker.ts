import { serializeError } from "@/lib/image-processing/errors";
import { removeBackground, type RemoveBackgroundRequest, type RemoveBackgroundResult } from "./run";

/**
 * Web Worker for background removal. It stays alive between images so the
 * model is loaded once per visit, and keeps the page responsive while the
 * network runs (a few seconds on a phone).
 */
export type BgWorkerRequest = { id: number; request: RemoveBackgroundRequest };
export type BgWorkerResponse =
  | { id: number; type: "progress"; value: number }
  | { id: number; type: "result"; result: RemoveBackgroundResult }
  | { id: number; type: "error"; error: { code: string; message: string } };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BgWorkerRequest>) => void) | null;
  postMessage: (message: BgWorkerResponse) => void;
};

let queue: Promise<void> = Promise.resolve();

scope.onmessage = (event) => {
  const { id, request } = event.data;
  queue = queue.then(async () => {
    try {
      const result = await removeBackground(request, (value) => scope.postMessage({ id, type: "progress", value }));
      scope.postMessage({ id, type: "result", result });
    } catch (error) {
      scope.postMessage({ id, type: "error", error: serializeError(error) });
    }
  });
};
