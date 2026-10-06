import { describe, expect, it } from "vitest";
import { QUALITY, searchTargetSize, type ScaledEncoder } from "@/lib/image-processing/target-size";

/**
 * A model encoder: size grows with pixel count and with quality, plus a fixed
 * header overhead, like a real JPEG encoder. Sizes are deterministic.
 */
function modelEncoder(width: number, height: number, bytesPerPixelAtMax: number, overhead = 600): ScaledEncoder & { calls: number } {
  const encoder = Object.assign(
    async (scale: number, quality: number) => {
      encoder.calls++;
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      // Size falls off steeply as quality drops, roughly like JPEG.
      const qualityFactor = 0.08 + 0.92 * quality ** 2.2;
      const size = Math.round(overhead + w * h * bytesPerPixelAtMax * qualityFactor);
      return { blob: new Blob([new Uint8Array(size)]), width: w, height: h };
    },
    { calls: 0 },
  );
  return encoder;
}

const KB = 1024;

describe("searchTargetSize", () => {
  it("returns full size at high quality when that already fits", async () => {
    const encode = modelEncoder(800, 600, 0.2);
    const result = await searchTargetSize(encode, { targetBytes: 500 * KB, allowResize: true, minScale: 0.04 });
    expect(result.outcome).toBe("met");
    expect(result.attempt.scale).toBe(1);
    expect(result.attempt.quality).toBe(QUALITY.max);
    expect(result.attempts).toBe(1);
  });

  it("lowers quality before touching dimensions", async () => {
    const encode = modelEncoder(1200, 900, 0.5);
    const full = (await encode(1, QUALITY.max)).blob.size;
    const target = Math.round(full * 0.6);
    const result = await searchTargetSize(encode, { targetBytes: target, allowResize: true, minScale: 0.03 });
    expect(result.outcome).toBe("met");
    expect(result.attempt.scale).toBe(1);
    expect(result.attempt.blob.size).toBeLessThanOrEqual(target);
    expect(result.attempt.quality).toBeLessThan(QUALITY.max);
    expect(result.attempt.quality).toBeGreaterThanOrEqual(QUALITY.fullSizeFloor);
  });

  for (const targetKb of [20, 50, 100, 200, 500]) {
    it(`reaches ${targetKb} KB for a 12 MP photo, staying at or below the target`, async () => {
      const encode = modelEncoder(4000, 3000, 0.45);
      const targetBytes = targetKb * KB;
      const result = await searchTargetSize(encode, { targetBytes, allowResize: true, minScale: 32 / 4000 });
      expect(result.outcome).toBe("met");
      expect(result.attempt.blob.size).toBeLessThanOrEqual(targetBytes);
      // Uses most of the size budget rather than undershooting wildly.
      expect(result.attempt.blob.size).toBeGreaterThan(targetBytes * 0.85);
      // Keeps a reasonable quality when dimensions had to shrink.
      expect(result.attempt.quality).toBeGreaterThanOrEqual(QUALITY.good);
      expect(result.attempts).toBeLessThanOrEqual(30);
    });
  }

  it("reports needs-resize with the smallest result when resizing is not allowed", async () => {
    const encode = modelEncoder(4000, 3000, 0.45);
    const result = await searchTargetSize(encode, { targetBytes: 20 * KB, allowResize: false, minScale: 0.008 });
    expect(result.outcome).toBe("needs-resize");
    expect(result.attempt.scale).toBe(1);
    expect(result.attempt.blob.size).toBeGreaterThan(20 * KB);
    expect(result.attempt.quality).toBe(QUALITY.min);
  });

  it("reports too-small when even the minimum dimensions can't fit", async () => {
    const encode = modelEncoder(4000, 3000, 0.45, 3000);
    const result = await searchTargetSize(encode, { targetBytes: 2 * KB, allowResize: true, minScale: 32 / 4000 });
    expect(result.outcome).toBe("too-small");
    expect(result.attempt.blob.size).toBeGreaterThan(2 * KB);
  });

  it("never reports met for a result above the target", async () => {
    for (let target = 3 * KB; target < 400 * KB; target += 37 * KB) {
      const encode = modelEncoder(3000, 2000, 0.6, 900);
      const result = await searchTargetSize(encode, { targetBytes: target, allowResize: true, minScale: 0.01 });
      if (result.outcome === "met") expect(result.attempt.blob.size).toBeLessThanOrEqual(target);
      else expect(result.attempt.blob.size).toBeGreaterThan(target);
    }
  });

  it("can be cancelled through the progress callback", async () => {
    const encode = modelEncoder(4000, 3000, 0.45);
    let calls = 0;
    await expect(
      searchTargetSize(encode, {
        targetBytes: 50 * KB,
        allowResize: true,
        minScale: 0.01,
        onProgress: () => {
          calls++;
          if (calls === 3) throw new Error("cancelled");
        },
      }),
    ).rejects.toThrow("cancelled");
    expect(encode.calls).toBe(3);
  });
});
