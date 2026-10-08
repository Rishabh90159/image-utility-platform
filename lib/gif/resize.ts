import { quantize } from "@/lib/image-processing/png-quantize";
import { resampleLanczos } from "@/lib/image-processing/resample";
import { decodeGif, type DecodedGif } from "./decode";
import { GifWriter, type GifFrameInput } from "./encode";

/**
 * Resizes every frame of an animated GIF and writes a new animated GIF with
 * the same timing and loop setting.
 *
 * Each frame is composited at full size, resized, reduced to binary
 * transparency (GIF has no partial transparency) and given its own palette.
 * To keep files small the output is optimised like most GIF editors do:
 *
 * - Opaque animations: after the first frame, only the rectangle that changed
 *   is stored, and unchanged pixels inside it are transparent so they compress
 *   to almost nothing. Identical frames are merged by adding their delays.
 * - Animations with transparency: each frame is stored as the bounding box of
 *   its visible pixels and cleared afterwards (disposal 2), so transparent
 *   areas stay transparent.
 */
export interface GifResizeOptions {
  width: number;
  height: number;
  /** "smooth" uses Lanczos resampling (photos); "pixel" uses nearest neighbour (pixel art, keeps the exact colours). */
  resample: "smooth" | "pixel";
}

export interface GifResizeResult {
  bytes: Uint8Array;
  width: number;
  height: number;
  /** Frames in the output after identical frames are merged. */
  frameCount: number;
  sourceFrameCount: number;
  durationMs: number;
}

/** Limits that keep a long animation from exhausting memory or running for minutes. */
export const GIF_LIMITS = {
  maxFrames: 1000,
  maxOutputSide: 4096,
  /** Output pixels across all frames. */
  maxTotalOutputPixels: 400_000_000,
  /** Decoded pixels across all frames. */
  maxTotalInputPixels: 800_000_000,
} as const;

export class GifLimitError extends Error {}

export function checkGifLimits(info: { width: number; height: number; frameCount: number }, out?: { width: number; height: number }) {
  if (info.frameCount > GIF_LIMITS.maxFrames) {
    throw new GifLimitError(`This GIF has ${info.frameCount.toLocaleString("en-US")} frames. The maximum is ${GIF_LIMITS.maxFrames.toLocaleString("en-US")}.`);
  }
  if (info.width * info.height * info.frameCount > GIF_LIMITS.maxTotalInputPixels) {
    throw new GifLimitError("This GIF is too large and too long to process safely in a browser. Try a shorter or smaller GIF.");
  }
  if (!out) return;
  if (out.width > GIF_LIMITS.maxOutputSide || out.height > GIF_LIMITS.maxOutputSide) {
    throw new GifLimitError(`Each side of a resized GIF can be at most ${GIF_LIMITS.maxOutputSide.toLocaleString("en-US")} pixels.`);
  }
  if (out.width * out.height * info.frameCount > GIF_LIMITS.maxTotalOutputPixels) {
    throw new GifLimitError("Those dimensions are too large for an animation this long. Choose a smaller size.");
  }
}

function resizeNearest(data: Uint8ClampedArray, w: number, h: number, ow: number, oh: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(ow * oh * 4);
  const src32 = new Uint32Array(data.buffer, data.byteOffset, w * h);
  const out32 = new Uint32Array(out.buffer);
  const xs = new Uint32Array(ow);
  for (let x = 0; x < ow; x++) xs[x] = Math.min(w - 1, Math.floor(((x + 0.5) * w) / ow));
  for (let y = 0; y < oh; y++) {
    const row = Math.min(h - 1, Math.floor(((y + 0.5) * h) / oh)) * w;
    const o = y * ow;
    for (let x = 0; x < ow; x++) out32[o + x] = src32[row + xs[x]];
  }
  return out;
}

/** GIF transparency is on or off: alpha below 50% becomes fully transparent, the rest fully opaque. */
function binarizeAlpha(data: Uint8ClampedArray): boolean {
  let transparent = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 128) {
      data[i - 3] = data[i - 2] = data[i - 1] = data[i] = 0;
      transparent = true;
    } else {
      data[i] = 255;
    }
  }
  return transparent;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Bounding box of pixels where `keep(i)` is true, or null if none. */
function boundingBox(width: number, height: number, keep: (pixel: number) => boolean): Rect | null {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (!keep(row + x)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Copies a rectangle; pixels where `skip(i)` is true become transparent. */
function extract(data: Uint8ClampedArray, width: number, rect: Rect, skip?: (pixel: number) => boolean): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y++) {
    for (let x = 0; x < rect.width; x++) {
      const pixel = (rect.top + y) * width + rect.left + x;
      if (skip?.(pixel)) continue;
      out.set(data.subarray(pixel * 4, pixel * 4 + 4), (y * rect.width + x) * 4);
    }
  }
  return out;
}

/** Turns RGBA pixels (alpha 0 or 255) into indices and an RGB palette with one transparent slot if needed. */
function toIndexed(rgba: Uint8ClampedArray, rect: Rect): Omit<GifFrameInput, "delayCs" | "disposal"> {
  const q = quantize(rgba, rect.width, rect.height, 256, false);
  const palette = new Uint8Array(q.colorCount * 3);
  let transparentIndex = -1;
  for (let i = 0; i < q.colorCount; i++) {
    palette[i * 3] = q.palette[i * 4];
    palette[i * 3 + 1] = q.palette[i * 4 + 1];
    palette[i * 3 + 2] = q.palette[i * 4 + 2];
    if (q.palette[i * 4 + 3] === 0 && transparentIndex < 0) transparentIndex = i;
  }
  return { ...rect, indices: q.indices, palette, transparentIndex };
}

function encodeFrames(
  gif: DecodedGif,
  options: GifResizeOptions,
  mode: "opaque" | "transparent",
  onProgress?: (fraction: number) => void,
): GifResizeResult | "has-transparency" {
  const { width: ow, height: oh } = options;
  const writer = new GifWriter({ width: ow, height: oh, loopCount: gif.loopCount });
  let previous: Uint32Array | null = null;
  let pending: GifFrameInput | null = null;
  let written = 0;

  const flush = () => {
    if (!pending) return;
    writer.addFrame(pending);
    written++;
    pending = null;
  };

  for (const frame of gif.frames()) {
    const resized =
      ow === gif.width && oh === gif.height
        ? frame.data.slice()
        : options.resample === "pixel"
          ? resizeNearest(frame.data, gif.width, gif.height, ow, oh)
          : resampleLanczos({ data: frame.data, width: gif.width, height: gif.height }, ow, oh).data;
    const transparent = binarizeAlpha(resized);
    if (mode === "opaque" && transparent) return "has-transparency";
    const current = new Uint32Array(resized.buffer, resized.byteOffset, ow * oh);

    if (mode === "transparent") {
      flush();
      const box = boundingBox(ow, oh, (i) => current[i] !== 0) ?? { left: 0, top: 0, width: 1, height: 1 };
      pending = { ...toIndexed(extract(resized, ow, box), box), delayCs: frame.delayCs, disposal: 2 };
    } else if (!previous) {
      const full = { left: 0, top: 0, width: ow, height: oh };
      pending = { ...toIndexed(resized, full), delayCs: frame.delayCs, disposal: 1 };
    } else {
      const prev: Uint32Array = previous;
      const box = boundingBox(ow, oh, (i) => current[i] !== prev[i]);
      if (!box && pending) {
        // Nothing changed: show the previous frame for longer instead of storing a copy.
        (pending as GifFrameInput).delayCs += frame.delayCs;
      } else if (box) {
        flush();
        const delta = extract(resized, ow, box, (i) => current[i] === prev[i]);
        pending = { ...toIndexed(delta, box), delayCs: frame.delayCs, disposal: 1 };
      }
    }
    previous = current;
    onProgress?.((frame.index + 1) / gif.frameCount);
  }
  flush();
  return {
    bytes: writer.finish(),
    width: ow,
    height: oh,
    frameCount: written,
    sourceFrameCount: gif.frameCount,
    durationMs: gif.durationMs,
  };
}

export function resizeGif(bytes: Uint8Array, options: GifResizeOptions, onProgress?: (fraction: number) => void): GifResizeResult {
  const gif = decodeGif(bytes);
  checkGifLimits(gif, options);
  // Most GIFs are opaque. If a transparent frame turns up, start again in transparent mode.
  const opaque = encodeFrames(gif, options, "opaque", onProgress);
  if (opaque !== "has-transparency") return opaque;
  onProgress?.(0);
  return encodeFrames(gif, options, "transparent", onProgress) as GifResizeResult;
}
