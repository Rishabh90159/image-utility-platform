import { describe, expect, it } from "vitest";
import { decodeGif, lzwDecode, readGifInfo } from "@/lib/gif/decode";
import { GifWriter, lzwEncode } from "@/lib/gif/encode";
import { resizeGif } from "@/lib/gif/resize";

/** Deterministic pseudo-random bytes. */
function noise(length: number, max: number, seed = 1): Uint8Array {
  const out = new Uint8Array(length);
  let s = seed;
  for (let i = 0; i < length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out[i] = s % max;
  }
  return out;
}

function roundTrip(indices: Uint8Array, depth: number): Uint8Array {
  const data = lzwEncode(indices, depth);
  // data[0] is the minimum code size; sub-blocks start at 1.
  return lzwDecode(data, 1, data.length, data[0], indices.length);
}

/** Greyscale palette with `n` entries. */
function greys(n: number): Uint8Array {
  const p = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) p.fill(Math.round((i * 255) / Math.max(1, n - 1)), i * 3, i * 3 + 3);
  return p;
}

const RED = [255, 0, 0];
const BLUE = [0, 0, 255];
const WHITE = [255, 255, 255];

/** Builds a GIF where each frame is a full-screen image drawn by `paint(x, y)` → palette index. */
function makeGif(
  width: number,
  height: number,
  palette: number[][],
  frames: { paint: (x: number, y: number) => number; delayCs?: number; transparentIndex?: number; disposal?: 1 | 2 }[],
  loopCount: number | null = 0,
): Uint8Array {
  const writer = new GifWriter({ width, height, loopCount });
  const flat = new Uint8Array(palette.flat());
  for (const frame of frames) {
    const indices = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) indices[y * width + x] = frame.paint(x, y);
    writer.addFrame({
      left: 0,
      top: 0,
      width,
      height,
      indices,
      palette: flat,
      transparentIndex: frame.transparentIndex ?? -1,
      delayCs: frame.delayCs ?? 10,
      disposal: frame.disposal ?? 1,
    });
  }
  return writer.finish();
}

function pixel(data: Uint8ClampedArray, width: number, x: number, y: number): number[] {
  const o = (y * width + x) * 4;
  return [data[o], data[o + 1], data[o + 2], data[o + 3]];
}

function allFrames(bytes: Uint8Array) {
  const gif = decodeGif(bytes);
  // The decoder reuses one buffer, so copy each frame as it is produced.
  const frames: { data: Uint8ClampedArray; delayCs: number }[] = [];
  for (const f of gif.frames()) frames.push({ data: f.data.slice(), delayCs: f.delayCs });
  return { gif, frames };
}

describe("GIF LZW", () => {
  it("round-trips every colour depth, including dictionary resets on noisy data", () => {
    for (const depth of [1, 2, 4, 8]) {
      for (const length of [1, 2, 7, 300, 70_000]) {
        const indices = noise(length, 1 << depth, depth * 31 + length);
        expect(roundTrip(indices, depth)).toEqual(indices);
      }
    }
  });

  it("round-trips long runs (codes up to 12 bits without resets)", () => {
    const indices = new Uint8Array(200_000);
    for (let i = 0; i < indices.length; i++) indices[i] = Math.floor(i / 5000) % 4;
    expect(roundTrip(indices, 2)).toEqual(indices);
  });
});

describe("GIF decode", () => {
  it("reads size, frame count, duration and loop count without decoding pixels", () => {
    const bytes = makeGif(8, 6, [RED, BLUE], [{ paint: () => 0, delayCs: 10 }, { paint: () => 1, delayCs: 25 }], 3);
    expect(readGifInfo(bytes)).toEqual({ width: 8, height: 6, frameCount: 2, durationMs: 350, loopCount: 3 });
    expect(readGifInfo(makeGif(2, 2, [RED, BLUE], [{ paint: () => 0 }], null)).loopCount).toBeNull();
  });

  it("composites frames and keeps the previous frame under transparent pixels", () => {
    const bytes = makeGif(4, 4, [RED, BLUE, WHITE], [
      { paint: () => 0 },
      // Second frame: only the left half is drawn; index 2 is transparent.
      { paint: (x) => (x < 2 ? 1 : 2), transparentIndex: 2 },
    ]);
    const { frames } = allFrames(bytes);
    expect(pixel(frames[0].data, 4, 3, 3)).toEqual([...RED, 255]);
    expect(pixel(frames[1].data, 4, 0, 0)).toEqual([...BLUE, 255]);
    expect(pixel(frames[1].data, 4, 3, 0)).toEqual([...RED, 255]);
  });

  it("decodes interlaced frames into the right rows", () => {
    const width = 3, height = 10;
    const rows = Array.from({ length: height }, (_, y) => y % 4);
    const order = [0, 8, 4, 2, 6, 1, 3, 5, 7, 9];
    const stored = new Uint8Array(order.flatMap((y) => [rows[y], rows[y], rows[y]]));
    const pal = greys(4);
    const lzw = lzwEncode(stored, 2);
    const bytes = new Uint8Array([
      ...Array.from("GIF89a", (c) => c.charCodeAt(0)), width, 0, height, 0, 0x81, 0, 0,
      ...pal,
      0x2c, 0, 0, 0, 0, width, 0, height, 0, 0x40,
      ...lzw,
      0x3b,
    ]);
    const { frames } = allFrames(bytes);
    for (let y = 0; y < height; y++) expect(pixel(frames[0].data, width, 1, y)[0]).toBe(pal[rows[y] * 3]);
  });

  it("rejects files that aren't GIFs", () => {
    expect(() => readGifInfo(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toThrow();
  });
});

describe("GIF resize", () => {
  const square = (offset: number) => (x: number, y: number) => (x >= offset && x < offset + 10 && y >= 10 && y < 20 ? 1 : 0);

  it("keeps every frame, the timing and the loop setting", () => {
    const source = makeGif(40, 40, [WHITE, RED], [0, 10, 20].map((o, i) => ({ paint: square(o), delayCs: 5 + i })), 0);
    const result = resizeGif(source, { width: 20, height: 20, resample: "pixel" });
    expect(result).toMatchObject({ width: 20, height: 20, frameCount: 3, sourceFrameCount: 3, durationMs: 180 });
    const { gif, frames } = allFrames(result.bytes);
    expect(gif.loopCount).toBe(0);
    expect(frames.map((f) => f.delayCs)).toEqual([5, 6, 7]);
    // The red square moves 5 px per frame at half size.
    expect(pixel(frames[0].data, 20, 2, 7)).toEqual([...RED, 255]);
    expect(pixel(frames[2].data, 20, 2, 7)).toEqual([...WHITE, 255]);
    expect(pixel(frames[2].data, 20, 12, 7)).toEqual([...RED, 255]);
  });

  it("matches a full re-render on every frame (delta frames are exact)", () => {
    const source = makeGif(30, 30, [WHITE, RED], [0, 5, 10, 15].map((o) => ({ paint: square(o) })));
    const result = resizeGif(source, { width: 30, height: 30, resample: "pixel" });
    const before = allFrames(source).frames;
    const after = allFrames(result.bytes).frames;
    after.forEach((frame, i) => expect(frame.data).toEqual(before[i].data));
  });

  it("merges identical frames by adding their delays", () => {
    const source = makeGif(20, 20, [WHITE, RED], [
      { paint: square(0), delayCs: 10 },
      { paint: square(0), delayCs: 15 },
      { paint: square(5), delayCs: 10 },
    ]);
    const result = resizeGif(source, { width: 10, height: 10, resample: "pixel" });
    expect(result.frameCount).toBe(2);
    expect(allFrames(result.bytes).frames.map((f) => f.delayCs)).toEqual([25, 10]);
  });

  it("keeps transparent areas transparent in every frame", () => {
    const source = makeGif(20, 20, [WHITE, RED], [0, 5].map((o) => ({ paint: square(o), transparentIndex: 0, disposal: 2 as const })));
    const result = resizeGif(source, { width: 10, height: 10, resample: "pixel" });
    const { frames } = allFrames(result.bytes);
    expect(pixel(frames[0].data, 10, 1, 7)).toEqual([...RED, 255]);
    // Where the square was in frame 1 is transparent again in frame 2.
    expect(pixel(frames[1].data, 10, 0, 7)[3]).toBe(0);
    expect(pixel(frames[1].data, 10, 4, 7)).toEqual([...RED, 255]);
    expect(pixel(frames[1].data, 10, 9, 0)[3]).toBe(0);
  });

  it("smooth resampling of a many-colour animation stays within 256 colours per frame", () => {
    const palette = Array.from({ length: 256 }, (_, i) => [i, 255 - i, (i * 7) % 256]);
    const source = makeGif(64, 48, palette, [1, 2].map((seed) => ({ paint: (x, y) => (x * 3 + y * 5 + seed * 11) % 256 })));
    const result = resizeGif(source, { width: 37, height: 28, resample: "smooth" });
    const { gif, frames } = allFrames(result.bytes);
    expect([gif.width, gif.height, frames.length]).toEqual([37, 28, 2]);
    for (const f of frames) for (let i = 3; i < f.data.length; i += 4) expect(f.data[i]).toBe(255);
  });

  it("refuses output that is too large", () => {
    const source = makeGif(4, 4, [WHITE, RED], [{ paint: () => 0 }]);
    expect(() => resizeGif(source, { width: 5000, height: 10, resample: "pixel" })).toThrow(/at most/);
  });
});
