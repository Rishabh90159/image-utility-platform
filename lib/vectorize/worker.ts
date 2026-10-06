import { serializeError } from "@/lib/image-processing/errors";
import { runVectorize, type VectorizeRequest } from "./run";

/** Web Worker entry for tracing, which can take several seconds on large images. */
export type VectorizeWorkerRequest = { id: number; request: VectorizeRequest };
export type VectorizeWorkerResponse =
  | { id: number; type: "result"; result: Awaited<ReturnType<typeof runVectorize>> }
  | { id: number; type: "error"; error: { code: string; message: string } };

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<VectorizeWorkerRequest>) => void) | null;
  postMessage: (message: VectorizeWorkerResponse) => void;
};

scope.onmessage = async (event) => {
  const { id, request } = event.data;
  try {
    const result = await runVectorize(request);
    scope.postMessage({ id, type: "result", result });
  } catch (error) {
    scope.postMessage({ id, type: "error", error: serializeError(error) });
  }
};
