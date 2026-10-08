import { GifFormatError, readGifInfo } from "./decode";
import { GifLimitError, resizeGif } from "./resize";
import type { GifRequest, GifResponse } from "./client";

/** Web Worker for the GIF resizer: decoding and re-encoding every frame is CPU-heavy. */
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<GifRequest>) => void) | null;
  postMessage: (message: GifResponse, transfer?: Transferable[]) => void;
};

scope.onmessage = async (event) => {
  const request = event.data;
  // Tells the client the worker started, so a later crash isn't mistaken for missing worker support.
  scope.postMessage({ type: "progress", value: 0 });
  try {
    const bytes = new Uint8Array(await request.file.arrayBuffer());
    if (request.type === "info") {
      scope.postMessage({ type: "info", info: readGifInfo(bytes) });
      return;
    }
    let last = 0;
    const result = resizeGif(bytes, request.options, (value) => {
      // Throttle progress messages to whole percent steps.
      if (value - last >= 0.01 || value === 1) {
        last = value;
        scope.postMessage({ type: "progress", value });
      }
    });
    scope.postMessage({ type: "result", result }, [result.bytes.buffer]);
  } catch (error) {
    scope.postMessage({
      type: "error",
      kind: error instanceof GifFormatError ? "format" : error instanceof GifLimitError ? "limit" : "other",
      message: error instanceof Error ? error.message : "",
    });
  }
};
