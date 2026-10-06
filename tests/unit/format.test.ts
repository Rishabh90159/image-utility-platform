import { describe, expect, it } from "vitest";
import { formatBytes, formatSavings, outputFileName, percentSaved, sizeBucket } from "@/lib/utils/format";

describe("formatBytes", () => {
  it("never shows a size smaller than the real size", () => {
    // 100 KB exactly is 102,400 bytes; one byte more must not display as 100 KB.
    expect(formatBytes(102_400)).toBe("100 KB");
    expect(formatBytes(102_401)).toBe("101 KB");
    expect(formatBytes(51_200)).toBe("50.0 KB");
    expect(formatBytes(51_201)).toBe("50.1 KB");
  });

  it("formats each range", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1_887_437)).toBe("1.81 MB");
    expect(formatBytes(1_048_575)).toBe("1.00 MB");
  });

  it("handles invalid input", () => {
    expect(formatBytes(Number.NaN)).toBe("—");
    expect(formatBytes(-1)).toBe("—");
  });
});

describe("savings", () => {
  it("computes percentage saved and describes larger outputs honestly", () => {
    expect(percentSaved(1000, 250)).toBe(75);
    expect(formatSavings(1000, 250)).toBe("75.0% smaller");
    expect(formatSavings(1000, 1200)).toBe("20.0% larger");
    expect(formatSavings(1000, 1000)).toBe("No change");
  });
});

describe("outputFileName", () => {
  it("keeps the base name and replaces the extension", () => {
    expect(outputFileName("Holiday Photo.JPEG", "resized", "png")).toBe("Holiday Photo-resized.png");
    expect(outputFileName("../../etc/passwd", "x", "jpg")).toBe("etcpasswd-x.jpg");
    expect(outputFileName(".png", "x", "jpg")).toBe("image-x.jpg");
  });
});

describe("sizeBucket", () => {
  it("returns coarse buckets only", () => {
    expect(sizeBucket(50_000)).toBe("<100KB");
    expect(sizeBucket(3_000_000)).toBe("1-5MB");
    expect(sizeBucket(30_000_000)).toBe(">20MB");
  });
});
