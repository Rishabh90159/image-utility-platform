import { describe, expect, it } from "vitest";
import { boxMean, guidedCoefficients, sampleBilinear } from "@/lib/background-removal/guided-filter";
import { enhancePixels, isNeutral, levelRange, NEUTRAL_SETTINGS, toneCurve } from "@/lib/image-processing/enhance";
import { padJpeg, readJpegInfo } from "@/lib/image-processing/jpeg-info";
import { mergeLayout } from "@/lib/image-processing/merge-layout";
import { resampleLanczos, unsharpMask } from "@/lib/image-processing/resample";
import { buildPdf, displaySize, orientationMatrix, placeImage } from "@/lib/pdf/pdf-writer";
import { convertSize, formatAmount, parseAmount } from "@/lib/units/file-size";
import { jpgName } from "@/components/tools/jpeg-to-jpg-tool";
import { upscaleError, upscaleTarget } from "@/components/tools/image-upscaler-tool";

const solid = (w: number, h: number, rgba: [number, number, number, number]) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) data.set(rgba, i);
  return { data, width: w, height: h };
};

describe("Lanczos resampling and sharpening", () => {
  it("produces the requested size and keeps a flat colour flat", () => {
    const out = resampleLanczos(solid(10, 7, [200, 100, 50, 255]), 40, 28);
    expect([out.width, out.height]).toEqual([40, 28]);
    for (let i = 0; i < out.data.length; i += 4) expect([...out.data.subarray(i, i + 4)]).toEqual([200, 100, 50, 255]);
  });

  it("does not darken the colour of semi-transparent pixels (premultiplied alpha)", () => {
    const src = solid(4, 4, [255, 0, 0, 255]);
    for (let i = 0; i < 8 * 4; i += 4) src.data.set([0, 0, 0, 0], i); // top half transparent black
    const out = resampleLanczos(src, 16, 16);
    for (let i = 0; i < out.data.length; i += 4) if (out.data[i + 3] > 10) expect(out.data[i]).toBeGreaterThan(240);
  });

  it("can also shrink without aliasing artefacts beyond the input range", () => {
    const out = resampleLanczos(solid(100, 50, [10, 20, 30, 255]), 13, 7);
    expect(out.data[0]).toBe(10);
  });

  it("unsharp mask leaves flat areas alone and increases edge contrast", () => {
    const flat = solid(20, 20, [120, 120, 120, 255]);
    unsharpMask(flat, 1, 1.5);
    expect(flat.data.every((v, i) => (i % 4 === 3 ? v === 255 : v === 120))).toBe(true);
    const edge = solid(20, 1, [50, 50, 50, 255]);
    for (let x = 10; x < 20; x++) edge.data.set([200, 200, 200, 255], x * 4);
    unsharpMask(edge, 1, 1.5);
    expect(edge.data[9 * 4]).toBeLessThan(50);
    expect(edge.data[10 * 4]).toBeGreaterThan(200);
  });
});

describe("upscaler sizes", () => {
  const src = { width: 1200, height: 900 };
  it("computes 2×, 4× and custom widths with the aspect ratio kept", () => {
    expect(upscaleTarget(src, "2", "")).toEqual({ width: 2400, height: 1800 });
    expect(upscaleTarget(src, "4", "")).toEqual({ width: 4800, height: 3600 });
    expect(upscaleTarget(src, "custom", "1600")).toEqual({ width: 1600, height: 1200 });
  });
  it("refuses results that aren't larger or exceed 32 megapixels", () => {
    expect(upscaleError(src, { width: 1200, height: 900 })).toMatch(/larger than the original/);
    expect(upscaleError(src, { width: 7000, height: 5250 })).toMatch(/32 megapixels/);
    expect(upscaleError(src, { width: 4800, height: 3600 })).toBeNull();
  });
});

/** A minimal JPEG header: SOI, optional EXIF orientation, SOF0, SOS, EOI. */
function fakeJpeg({ width, height, components = 3, orientation }: { width: number; height: number; components?: number; orientation?: number }) {
  const bytes: number[] = [0xff, 0xd8];
  if (orientation) {
    // APP1 "Exif\0\0" + big-endian TIFF with one IFD entry (0x0112 orientation).
    const tiff = [0x4d, 0x4d, 0, 42, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, 0, 0, 0, 0, 0, 0];
    const body = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
    bytes.push(0xff, 0xe1, (body.length + 2) >> 8, (body.length + 2) & 255, ...body);
  }
  const sof = [8, height >> 8, height & 255, width >> 8, width & 255, components];
  for (let c = 0; c < components; c++) sof.push(c + 1, 0x11, 0);
  bytes.push(0xff, 0xc0, (sof.length + 2) >> 8, (sof.length + 2) & 255, ...sof);
  bytes.push(0xff, 0xda, 0, 2, 0x12, 0x34, 0xff, 0xd9);
  return new Uint8Array(bytes);
}

describe("JPEG inspection and padding", () => {
  it("reads size, components and EXIF orientation", () => {
    expect(readJpegInfo(fakeJpeg({ width: 400, height: 300 }))).toMatchObject({ width: 400, height: 300, components: 3, orientation: 1 });
    expect(readJpegInfo(fakeJpeg({ width: 400, height: 300, orientation: 6 }))?.orientation).toBe(6);
    expect(readJpegInfo(fakeJpeg({ width: 10, height: 10, components: 4 }))?.components).toBe(4);
    expect(readJpegInfo(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });

  it("pads to exactly the target with valid COM segments, keeping every original byte in order", () => {
    const jpeg = fakeJpeg({ width: 400, height: 300, orientation: 6 });
    for (const target of [jpeg.length + 4, jpeg.length + 1000, jpeg.length + 65537, jpeg.length + 65539, jpeg.length + 200_000]) {
      const padded = padJpeg(jpeg, target);
      expect(padded.length).toBe(target);
      // Still parses, with the same frame and orientation.
      expect(readJpegInfo(padded)).toMatchObject({ width: 400, height: 300, orientation: 6 });
      // Removing the COM segments gives back the original bytes.
      const stripped: number[] = [];
      for (let i = 0; i < padded.length; ) {
        if (i >= 2 && padded[i] === 0xff && padded[i + 1] === 0xfe) {
          i += 2 + ((padded[i + 2] << 8) | padded[i + 3]);
          continue;
        }
        stripped.push(padded[i]);
        i++;
      }
      expect(stripped).toEqual([...jpeg]);
    }
  });

  it("overshoots by at most 3 bytes when the shortfall is too small for a segment", () => {
    const jpeg = fakeJpeg({ width: 8, height: 8 });
    expect(padJpeg(jpeg, jpeg.length + 2).length).toBe(jpeg.length + 4);
    expect(padJpeg(jpeg, jpeg.length - 5)).toBe(jpeg);
  });
});

describe("PDF writer", () => {
  it("fits, fills and orients images on the page", () => {
    const fit = placeImage(4000, 3000, { size: "a4", orientation: "auto", fit: "fit", margin: 0 });
    expect([fit.pageWidth, fit.pageHeight]).toEqual([841.89, 595.28]);
    expect(fit.width / fit.height).toBeCloseTo(4 / 3);
    expect(fit.clip).toBeNull();
    const fill = placeImage(4000, 3000, { size: "letter", orientation: "portrait", fit: "fill", margin: 36 });
    expect(fill.height).toBeCloseTo(792 - 72);
    expect(fill.width).toBeGreaterThan(612 - 72);
    expect(fill.clip).toEqual({ x: 36, y: 36, width: 540, height: 720 });
  });

  it("maps the stored image's corners to the displayed orientation", () => {
    // Raw top-left corner in PDF unit space is (0, 1). EXIF 6 (rotate 90° clockwise) shows it at the top right (1, 1).
    const apply = (m: number[], x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    expect(apply(orientationMatrix(1), 0, 1)).toEqual([0, 1]);
    expect(apply(orientationMatrix(6), 0, 1)).toEqual([1, 1]);
    expect(apply(orientationMatrix(8), 0, 1)).toEqual([0, 0]);
    expect(apply(orientationMatrix(3), 0, 1)).toEqual([1, 0]);
    for (let o = 1; o <= 8; o++) {
      const m = orientationMatrix(o);
      // Every orientation maps the unit square onto itself.
      for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) for (const v of apply(m, x, y)) expect([0, 1]).toContain(v + 0);
    }
    expect(displaySize(400, 300, 6)).toEqual({ width: 300, height: 400 });
    expect(displaySize(400, 300, 3)).toEqual({ width: 400, height: 300 });
  });

  it("writes a structurally valid PDF with correct xref offsets", async () => {
    const jpeg = new Blob([fakeJpeg({ width: 400, height: 300 })], { type: "image/jpeg" });
    const pages = [1, 6].map((orientation) => ({
      image: { jpeg, width: 400, height: 300, colorSpace: "DeviceRGB" as const, orientation },
      placement: placeImage(...(Object.values(displaySize(400, 300, orientation)) as [number, number]), { size: "a4", orientation: "auto", fit: "fit", margin: 28.35 }),
    }));
    const text = Buffer.from(await buildPdf(pages).arrayBuffer()).toString("latin1");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    const startxref = Number(text.match(/startxref\n(\d+)\n%%EOF\n$/)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe("xref");
    const offsets = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(offsets).toHaveLength(9);
    offsets.forEach((offset, i) => expect(text.startsWith(`${i + 1} 0 obj`, offset)).toBe(true));
    expect(text).toContain("/Count 2");
    expect(text).toContain("/Filter /DCTDecode");
    // The second page applies the rotation in its transform (b = -height, c = width).
    expect(text).toMatch(/q\n0 -[\d.]+ [\d.]+ 0 [\d.]+ [\d.]+ cm\n\/Im0 Do/);
  });
});

describe("merge layout", () => {
  const sizes = [
    { width: 1000, height: 500 },
    { width: 500, height: 500 },
  ];
  it("stacks vertically at the smallest width without stretching", () => {
    const l = mergeLayout(sizes, { direction: "vertical", match: "smallest", columns: 2, spacing: 0 });
    expect(l.width).toBe(500);
    expect(l.rects.map((r) => [r.width, r.height])).toEqual([[500, 250], [500, 500]]);
    expect(l.height).toBe(750);
  });
  it("places side by side at the largest height with spacing", () => {
    const l = mergeLayout(sizes, { direction: "horizontal", match: "largest", columns: 2, spacing: 10 });
    expect(l.height).toBe(520);
    expect(l.rects[0]).toEqual({ x: 10, y: 10, width: 1000, height: 500 });
    expect(l.rects[1].x).toBe(1020);
    expect(l.width).toBe(1530);
  });
  it("fits each image inside equal grid cells", () => {
    const l = mergeLayout([...sizes, { width: 300, height: 600 }], { direction: "grid", match: "smallest", columns: 2, spacing: 0 });
    expect(l.width).toBe(600);
    for (const r of l.rects) {
      expect(r.width).toBeLessThanOrEqual(300);
      expect(r.height).toBeLessThanOrEqual(500);
    }
  });
  it("scales the whole layout down to stay within browser limits", () => {
    const big = Array.from({ length: 4 }, () => ({ width: 8000, height: 6000 }));
    const l = mergeLayout(big, { direction: "horizontal", match: "original", columns: 1, spacing: 0 });
    expect(l.limitScale).toBeLessThan(1);
    expect(l.width).toBeLessThanOrEqual(16384);
    expect(l.width * l.height).toBeLessThanOrEqual(50_000_000);
  });
});

describe("image enhancement", () => {
  it("neutral settings change nothing", () => {
    const px = solid(4, 4, [10, 120, 230, 255]);
    enhancePixels(px, NEUTRAL_SETTINGS);
    expect([...px.data.subarray(0, 4)]).toEqual([10, 120, 230, 255]);
    expect(isNeutral(NEUTRAL_SETTINGS)).toBe(true);
  });
  it("auto levels stretch a flat range and the tone curve is monotonic", () => {
    const luma = new Uint8Array(1000).map((_, i) => 40 + (i % 161));
    expect(levelRange(luma)).toEqual({ low: 40, high: 200 });
    const lut = toneCurve({ ...NEUTRAL_SETTINGS, autoLevels: true, contrast: 40, brightness: 20 }, { low: 40, high: 200 });
    expect(lut[40]).toBe(0);
    expect(lut[200]).toBe(255);
    for (let i = 1; i < 256; i++) expect(lut[i]).toBeGreaterThanOrEqual(lut[i - 1]);
  });
  it("caps the stretch for very flat images so colours don't shift", () => {
    const flat = new Uint8Array(1000).map((_, i) => 110 + (i % 41));
    const range = levelRange(flat);
    expect(range.high - range.low).toBe(96);
    expect(range.low).toBeLessThanOrEqual(110);
    expect(range.high).toBeGreaterThanOrEqual(150);
  });

  it("saturation −100 makes greyscale", () => {
    const px = solid(2, 2, [200, 50, 50, 255]);
    enhancePixels(px, { ...NEUTRAL_SETTINGS, saturation: -100 });
    expect(px.data[0]).toBe(px.data[1]);
    expect(px.data[1]).toBe(px.data[2]);
  });
});

describe("guided filter", () => {
  it("box mean of a constant is the constant, and refinement follows guide edges", () => {
    const ones = new Float32Array(25).fill(1);
    expect([...boxMean(ones, 5, 5, 2)].every((v) => Math.abs(v - 1) < 1e-6)).toBe(true);
    // Guide: left half dark, right half bright. Coarse mask: blurry ramp. Refined values should split at the edge.
    const w = 20, h = 4;
    const guide = new Float32Array(w * h).map((_, i) => (i % w < 10 ? 0.1 : 0.9));
    const mask = new Float32Array(w * h).map((_, i) => (i % w) / (w - 1));
    const { a, b } = guidedCoefficients(guide, mask, w, h, 3, 1e-4);
    const q = (x: number) => sampleBilinear(a, w, h, x, 1) * guide[x] + sampleBilinear(b, w, h, x, 1);
    expect(q(9) - q(8)).toBeLessThan(q(10) - q(9));
  });
});

describe("file-size units and names", () => {
  it("converts decimal and binary units", () => {
    expect(convertSize(1, "MB", "KB")).toBe(1000);
    expect(convertSize(1, "MiB", "KiB")).toBe(1024);
    expect(convertSize(2.5, "MB", "KiB")).toBeCloseTo(2441.40625);
    expect(convertSize(51200, "B", "KiB")).toBe(50);
  });
  it("parses common ways of typing numbers", () => {
    expect(parseAmount("2.5")).toBe(2.5);
    expect(parseAmount("2,5")).toBe(2.5);
    expect(parseAmount("1,048,576")).toBe(1048576);
    expect(parseAmount(" 10 ")).toBe(10);
    expect(Number.isNaN(parseAmount("abc"))).toBe(true);
    expect(Number.isNaN(parseAmount("-1"))).toBe(true);
  });
  it("formats without floating-point noise", () => {
    expect(formatAmount(1000)).toBe("1,000");
    expect(formatAmount(0.1 + 0.2)).toBe("0.3");
    expect(formatAmount(2441.40625)).toBe("2,441.41");
  });
  it("names JPEG files with a .jpg extension", () => {
    expect(jpgName("Holiday.JPEG")).toBe("Holiday.jpg");
    expect(jpgName("scan.jfif")).toBe("scan.jpg");
    expect(jpgName("photo.jpg")).toBe("photo.jpg");
    expect(jpgName("weird:name.jpe")).toBe("weird-name.jpg");
  });
});
