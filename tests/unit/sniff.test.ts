import { describe, expect, it } from "vitest";
import { detectFormat, readDimensions } from "@/lib/image-processing/sniff";

function bytes(...values: (number | string)[]): Uint8Array {
  const out: number[] = [];
  for (const v of values) {
    if (typeof v === "string") for (const ch of v) out.push(ch.charCodeAt(0));
    else out.push(v);
  }
  return new Uint8Array(out);
}

function pngHeader(width: number, height: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return b;
}

describe("detectFormat", () => {
  it("recognises JPEG, PNG and WebP signatures", () => {
    expect(detectFormat(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectFormat(pngHeader(1, 1))).toBe("image/png");
    expect(detectFormat(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "))).toBe("image/webp");
  });

  it("recognises formats the tools decline with a specific message", () => {
    expect(detectFormat(bytes(0, 0, 0, 0x18, "ftypheic"))).toBe("image/heic");
    expect(detectFormat(bytes(0, 0, 0, 0x18, "ftypavif"))).toBe("image/avif");
    expect(detectFormat(bytes("GIF89a"))).toBe("image/gif");
    expect(detectFormat(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBe("image/svg+xml");
  });

  it("returns null for non-images and empty input", () => {
    expect(detectFormat(bytes("hello world, not an image"))).toBeNull();
    expect(detectFormat(new Uint8Array(0))).toBeNull();
    expect(detectFormat(bytes("%PDF-1.7"))).toBeNull();
  });
});

describe("readDimensions", () => {
  it("reads PNG IHDR dimensions", () => {
    expect(readDimensions(pngHeader(4000, 3000), "image/png")).toEqual({ width: 4000, height: 3000 });
    expect(readDimensions(pngHeader(3_000_000_000, 2), "image/png")).toEqual({ width: 3_000_000_000, height: 2 });
  });

  it("reads JPEG frame header after APP segments", () => {
    const jpeg = bytes(
      0xff, 0xd8,
      0xff, 0xe1, 0x00, 0x08, "Exif", 0x00, 0x00, // APP1, length 8
      0xff, 0xdb, 0x00, 0x04, 0x00, 0x00, // DQT, length 4
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x0b, 0xb8, 0x0f, 0xa0, 0x03, // SOF0: 3000 x 4000
    );
    expect(readDimensions(jpeg, "image/jpeg")).toEqual({ width: 4000, height: 3000 });
  });

  it("reads progressive JPEG (SOF2) and ignores DHT markers", () => {
    const jpeg = bytes(
      0xff, 0xd8,
      0xff, 0xc4, 0x00, 0x04, 0x00, 0x00, // DHT is not a frame header
      0xff, 0xc2, 0x00, 0x11, 0x08, 0x00, 0x10, 0x00, 0x20, 0x03,
    );
    expect(readDimensions(jpeg, "image/jpeg")).toEqual({ width: 32, height: 16 });
  });

  it("returns null for truncated JPEG headers", () => {
    expect(readDimensions(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00), "image/jpeg")).toBeNull();
  });

  it("reads WebP VP8, VP8L and VP8X dimensions", () => {
    const lossy = new Uint8Array(30);
    lossy.set(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "));
    lossy.set([0x80, 0x02, 0xe0, 0x01], 26); // 640 x 480
    expect(readDimensions(lossy, "image/webp")).toEqual({ width: 640, height: 480 });

    const extended = new Uint8Array(30);
    extended.set(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8X"));
    extended.set([0x7f, 0x07, 0x00, 0x37, 0x04, 0x00], 24); // 1920 x 1080 (stored minus one)
    expect(readDimensions(extended, "image/webp")).toEqual({ width: 1920, height: 1080 });

    // VP8L: 100 x 50 → width-1 = 99, height-1 = 49 packed into 14-bit fields.
    const lossless = new Uint8Array(30);
    lossless.set(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8L"));
    const packed = 99 | (49 << 14);
    lossless.set([0x2f, packed & 0xff, (packed >> 8) & 0xff, (packed >> 16) & 0xff, (packed >> 24) & 0xff], 20);
    expect(readDimensions(lossless, "image/webp")).toEqual({ width: 100, height: 50 });
  });
});
