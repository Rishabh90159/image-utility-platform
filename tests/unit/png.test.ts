import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { encodeIndexedPng } from "@/lib/image-processing/png-encode";
import { quantize } from "@/lib/image-processing/png-quantize";

/** Minimal PNG reader for verifying the encoder: returns chunks and decoded palette indices. */
async function readPng(blob: Blob) {
  const b = new Uint8Array(await blob.arrayBuffer());
  expect([...b.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(b.buffer);
  const chunks: Record<string, Uint8Array[]> = {};
  let offset = 8;
  while (offset < b.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...b.slice(offset + 4, offset + 8));
    (chunks[type] ??= []).push(b.slice(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const ihdr = new DataView(chunks.IHDR[0].buffer);
  const width = ihdr.getUint32(0);
  const height = ihdr.getUint32(4);
  const bitDepth = chunks.IHDR[0][8];
  const colorType = chunks.IHDR[0][9];
  const raw = inflateSync(Buffer.concat(chunks.IDAT));
  const rowBytes = Math.ceil((width * bitDepth) / 8);
  const indices: number[] = [];
  for (let y = 0; y < height; y++) {
    const row = raw.subarray(y * (rowBytes + 1), (y + 1) * (rowBytes + 1));
    expect(row[0]).toBe(0);
    for (let x = 0; x < width; x++) {
      const bitOffset = x * bitDepth;
      const byte = row[1 + (bitOffset >> 3)];
      const shift = 8 - bitDepth - (bitOffset & 7);
      indices.push((byte >> shift) & ((1 << bitDepth) - 1));
    }
  }
  const plte = chunks.PLTE[0];
  const trns = chunks.tRNS?.[0] ?? new Uint8Array(0);
  const rgba = (i: number) => [plte[i * 3], plte[i * 3 + 1], plte[i * 3 + 2], i < trns.length ? trns[i] : 255];
  return { width, height, bitDepth, colorType, indices, rgba, chunks };
}

function image(width: number, height: number, pixel: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set(pixel(x, y), (y * width + x) * 4);
  }
  return data;
}

describe("PNG quantize + encode", () => {
  it("keeps images with few colours exactly (lossless palette)", async () => {
    const colors: [number, number, number, number][] = [
      [255, 0, 0, 255],
      [0, 128, 255, 255],
      [10, 20, 30, 128],
      [0, 0, 0, 0],
    ];
    const data = image(37, 11, (x, y) => colors[(x + y) % 4]);
    const q = quantize(data, 37, 11, 256);
    expect(q.lossless).toBe(true);
    expect(q.colorCount).toBe(4);

    const png = await readPng(await encodeIndexedPng(37, 11, q.indices, q.palette, q.colorCount));
    expect(png.colorType).toBe(3);
    expect(png.bitDepth).toBe(2);
    for (let i = 0; i < 37 * 11; i++) {
      expect(png.rgba(png.indices[i])).toEqual([...data.slice(i * 4, i * 4 + 4)]);
    }
  });

  it("reduces a full-colour gradient to the requested palette size with small error", async () => {
    const w = 128;
    const h = 96;
    const data = image(w, h, (x, y) => [x * 2, y * 2.6, (x + y) % 256, 255]);
    const q = quantize(data, w, h, 64, false);
    expect(q.lossless).toBe(false);
    expect(q.colorCount).toBeLessThanOrEqual(64);

    const png = await readPng(await encodeIndexedPng(w, h, q.indices, q.palette, q.colorCount));
    let totalError = 0;
    for (let i = 0; i < w * h; i++) {
      const [r, g, b, a] = png.rgba(png.indices[i]);
      expect(a).toBe(255);
      totalError += Math.abs(r - data[i * 4]) + Math.abs(g - data[i * 4 + 1]) + Math.abs(b - data[i * 4 + 2]);
    }
    // Mean absolute error per channel stays small.
    expect(totalError / (w * h * 3)).toBeLessThan(12);
  });

  it("keeps fully transparent pixels fully transparent and opaque pixels opaque", async () => {
    const w = 64;
    const h = 64;
    const data = image(w, h, (x, y) => (x < 32 ? [0, 0, 0, 0] : [x * 4, y * 4, 200, 255]));
    const q = quantize(data, w, h, 16, true);
    const png = await readPng(await encodeIndexedPng(w, h, q.indices, q.palette, q.colorCount));
    expect(png.chunks.tRNS).toBeDefined();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = png.rgba(png.indices[y * w + x])[3];
        expect(alpha).toBe(x < 32 ? 0 : 255);
      }
    }
  });

  it("omits tRNS for fully opaque images", async () => {
    const data = image(20, 20, (x, y) => [x * 12, y * 12, 7, 255]);
    const q = quantize(data, 20, 20, 8);
    const png = await readPng(await encodeIndexedPng(20, 20, q.indices, q.palette, q.colorCount));
    expect(png.chunks.tRNS).toBeUndefined();
  });
});
