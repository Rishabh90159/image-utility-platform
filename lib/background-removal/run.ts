import * as ort from "onnxruntime-web/wasm";
import { canvasToBlob, createCanvas, decodeImage, drawScaled, getContext2D, releaseCanvas } from "@/lib/image-processing/canvas";
import { ImageToolError } from "@/lib/image-processing/errors";
import { LIMITS, type OutputMime } from "@/lib/image-processing/formats";
import { guidedCoefficients, sampleBilinear } from "./guided-filter";

/**
 * Background removal with U²-Netp, a small salient-object segmentation network
 * (Qin et al., 2020; Apache-2.0), run with ONNX Runtime's WebAssembly backend.
 *
 * Everything happens on this device: the model (4.6 MB) and the runtime are
 * served by this site and fetched only when the tool is first used. The image
 * itself is never sent anywhere.
 */
export const MODEL_URL = "/models/u2netp.onnx";
const MODEL_SIZE = 320;
/** Long side of the image the mask is refined at; finer edges cost time and memory. */
const REFINE_SIDE = 1024;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

export interface RemoveBackgroundRequest {
  file: Blob;
  /** null = transparent (PNG). */
  background: string | null;
  mime: OutputMime;
  quality?: number;
  edges: "soft" | "crisp";
}

export interface RemoveBackgroundResult {
  blob: Blob;
  width: number;
  height: number;
  /** Share of the image kept as foreground (0–1). */
  foreground: number;
}

let session: Promise<ort.InferenceSession> | null = null;

function loadSession(): Promise<ort.InferenceSession> {
  if (!session) {
    // Multi-threading needs cross-origin isolation, which this site doesn't enable.
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    session = (async () => {
      let model: ArrayBuffer;
      try {
        const response = await fetch(MODEL_URL);
        if (!response.ok) throw new Error(String(response.status));
        model = await response.arrayBuffer();
      } catch {
        throw new ImageToolError("MODEL_UNAVAILABLE", "The background-removal model couldn't be downloaded. Check your connection and try again.");
      }
      try {
        return await ort.InferenceSession.create(model, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      } catch {
        throw new ImageToolError("MODEL_UNAVAILABLE", "Your browser couldn't start the background-removal model. Try an up-to-date Chrome, Edge, Firefox or Safari.");
      }
    })();
    session.catch(() => {
      session = null;
    });
  }
  return session;
}

/** Model input: the image squashed to 320 × 320, scaled to 0–1 by its maximum and normalised per channel. */
function toTensor(bitmap: ImageBitmap): ort.Tensor {
  const canvas = drawScaled(bitmap, MODEL_SIZE, MODEL_SIZE, "#ffffff");
  try {
    const { data } = getContext2D(canvas, { willReadFrequently: true }).getImageData(0, 0, MODEL_SIZE, MODEL_SIZE);
    let max = 1;
    for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i], data[i + 1], data[i + 2]);
    const plane = MODEL_SIZE * MODEL_SIZE;
    const input = new Float32Array(plane * 3);
    for (let p = 0, i = 0; p < plane; p++, i += 4) {
      for (let c = 0; c < 3; c++) input[c * plane + p] = (data[i + c] / max - MEAN[c]) / STD[c];
    }
    return new ort.Tensor("float32", input, [1, 3, MODEL_SIZE, MODEL_SIZE]);
  } finally {
    releaseCanvas(canvas);
  }
}

function normalise(values: Float32Array): Float32Array {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const range = hi - lo || 1;
  return values.map((v) => (v - lo) / range);
}

const smoothstep = (lo: number, hi: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

export async function removeBackground(request: RemoveBackgroundRequest, onProgress?: (fraction: number) => void): Promise<RemoveBackgroundResult> {
  const bitmap = await decodeImage(request.file);
  try {
    const { width, height } = bitmap;
    if (width * height > LIMITS.maxOutputPixels) {
      throw new ImageToolError("DIMENSIONS_TOO_LARGE", "This image is too large to process in a browser. Reduce it with the image resizer first.");
    }
    onProgress?.(0.05);
    const model = await loadSession();
    onProgress?.(0.3);

    let raw: Float32Array;
    try {
      const outputs = await model.run({ [model.inputNames[0]]: toTensor(bitmap) });
      raw = outputs[model.outputNames[0]].data as Float32Array;
    } catch (error) {
      if (error instanceof ImageToolError) throw error;
      throw new ImageToolError("BACKGROUND_REMOVAL_FAILED", "Background removal failed in your browser. Try a smaller image or another browser.");
    }
    const mask320 = normalise(raw);
    onProgress?.(0.6);

    // Refine the mask against the photo's own edges at a working resolution.
    const scale = Math.min(1, REFINE_SIDE / Math.max(width, height));
    const ww = Math.max(1, Math.round(width * scale));
    const wh = Math.max(1, Math.round(height * scale));
    const small = drawScaled(bitmap, ww, wh, "#ffffff");
    const guide = new Float32Array(ww * wh);
    const coarse = new Float32Array(ww * wh);
    try {
      const { data } = getContext2D(small, { willReadFrequently: true }).getImageData(0, 0, ww, wh);
      for (let y = 0, p = 0; y < wh; y++) {
        for (let x = 0; x < ww; x++, p++) {
          const i = p * 4;
          guide[p] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
          coarse[p] = sampleBilinear(mask320, MODEL_SIZE, MODEL_SIZE, ((x + 0.5) * MODEL_SIZE) / ww - 0.5, ((y + 0.5) * MODEL_SIZE) / wh - 0.5);
        }
      }
    } finally {
      releaseCanvas(small);
    }
    const radius = Math.max(2, Math.round(Math.max(ww, wh) / 128));
    const { a, b } = guidedCoefficients(guide, coarse, ww, wh, radius, 1e-3);
    onProgress?.(0.75);

    // Apply the coefficients at full resolution and write the alpha channel.
    const full = createCanvas(width, height);
    let flat: ReturnType<typeof createCanvas> | null = null;
    try {
      const ctx = getContext2D(full, { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0);
      const image = ctx.getImageData(0, 0, width, height);
      const px = image.data;
      let kept = 0;
      for (let y = 0; y < height; y++) {
        const sy = (y + 0.5) * scale - 0.5;
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const sx = (x + 0.5) * scale - 0.5;
          const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
          const q = sampleBilinear(a, ww, wh, sx, sy) * lum + sampleBilinear(b, ww, wh, sx, sy);
          const alpha = request.edges === "crisp" ? smoothstep(0.35, 0.65, q) : smoothstep(0.08, 0.92, q);
          px[i + 3] = Math.round(alpha * px[i + 3]);
          kept += alpha;
        }
      }
      ctx.putImageData(image, 0, 0);
      onProgress?.(0.9);

      let out = full;
      if (request.background || request.mime === "image/jpeg") {
        flat = createCanvas(width, height);
        const fctx = getContext2D(flat);
        fctx.fillStyle = request.background ?? "#ffffff";
        fctx.fillRect(0, 0, width, height);
        fctx.drawImage(full, 0, 0);
        out = flat;
      }
      const blob = await canvasToBlob(out, request.mime, request.quality);
      onProgress?.(1);
      return { blob, width, height, foreground: kept / (width * height) };
    } finally {
      releaseCanvas(full);
      if (flat) releaseCanvas(flat);
    }
  } finally {
    bitmap.close();
  }
}
