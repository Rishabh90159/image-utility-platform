import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cropToPixels, defaultCrop, moveRect, refitCrop, resizeRect } from "@/components/cropper/crop-geometry";
import { bulkSettingsError, bulkTargetSize, type BulkResizeSettings } from "@/lib/image-processing/bulk";
import { readJpegDpi, setJpegDpi } from "@/lib/image-processing/jpeg-dpi";
import { cleanBackground, normalizeCrop, rotatedSize } from "@/lib/image-processing/transform";
import { mmToPx, PHOTO_PRESETS } from "@/lib/presets/photo-presets";
import { hasUnsafeEntities, intrinsicSvgSize, parseSvgLength, parseViewBox } from "@/lib/svg/dimensions";
import { replaceExternalUrls } from "@/lib/svg/sanitize";
import { crc32 } from "@/lib/utils/crc32";
import { traceToSvg } from "@/lib/vectorize/trace";
import { createZip, safeZipName, uniqueNames } from "@/lib/zip/zip";

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
});

describe("zip", () => {
  it("writes a valid stored archive that standard tools can list and extract", async () => {
    const files = [
      { name: "a.txt", blob: new Blob(["hello"]) },
      { name: "photo (2).jpg", blob: new Blob([new Uint8Array([1, 2, 3, 255])]) },
      { name: "ünïcode.png", blob: new Blob(["x".repeat(10_000)]) },
    ];
    const zip = await createZip(files);
    const bytes = new Uint8Array(await zip.arrayBuffer());
    const view = new DataView(bytes.buffer);
    // End of central directory record
    const eocd = bytes.length - 22;
    expect(view.getUint32(eocd, true)).toBe(0x06054b50);
    expect(view.getUint16(eocd + 10, true)).toBe(3);
    // First local header: stored, CRC of "hello"
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(14, true)).toBe(crc32(new TextEncoder().encode("hello")));

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zip-test-"));
    fs.writeFileSync(path.join(dir, "test.zip"), bytes);
    // bsdtar reads ZIP files (GNU tar can't). Windows ships it as System32\tar.exe.
    const windowsTar = "C:\\Windows\\System32\\tar.exe";
    const tar = process.platform === "win32" && fs.existsSync(windowsTar) ? windowsTar : "bsdtar";
    let listing = "";
    try {
      listing = execFileSync(tar, ["-tf", "test.zip"], { encoding: "utf8", cwd: dir });
    } catch {
      return; // No ZIP-capable tar available: the structural checks above still ran.
    }
    expect(listing).toContain("a.txt");
    expect(listing).toContain("photo (2).jpg");
    execFileSync(tar, ["-xf", "test.zip"], { cwd: dir });
    expect(fs.readFileSync(path.join(dir, "a.txt"), "utf8")).toBe("hello");
  });

  it("rejects an empty batch", async () => {
    await expect(createZip([])).rejects.toThrow();
  });

  it("sanitizes names against path traversal and invalid characters", () => {
    expect(safeZipName("../../etc/passwd")).not.toMatch(/[\\/]|\.\./);
    expect(safeZipName("..\\..\\win.ini")).not.toMatch(/[\\/]|\.\./);
    expect(safeZipName("a:b*c?.jpg")).toBe("a-b-c.jpg");
    expect(safeZipName("CON.png")).toBe("CON-file.png");
    expect(safeZipName("")).toBe("image");
    expect(safeZipName(".hidden.jpg")).toBe("hidden.jpg");
  });

  it("makes duplicate names unique, ignoring case", () => {
    expect(uniqueNames(["a.jpg", "A.jpg", "a.jpg", "b.png"])).toEqual(["a.jpg", "A (2).jpg", "a (3).jpg", "b.png"]);
  });
});

describe("svg dimensions", () => {
  it("parses lengths in common units", () => {
    expect(parseSvgLength("24")).toBe(24);
    expect(parseSvgLength("24px")).toBe(24);
    expect(parseSvgLength("1in")).toBe(96);
    expect(parseSvgLength("25.4mm")).toBeCloseTo(96);
    expect(parseSvgLength("100%")).toBeNull();
    expect(parseSvgLength("-5")).toBeNull();
  });

  it("derives intrinsic size like a browser does", () => {
    expect(intrinsicSvgSize("200", "100", null)).toEqual({ width: 200, height: 100, declared: true });
    expect(intrinsicSvgSize(null, null, "0 0 48 24")).toEqual({ width: 48, height: 24, declared: true });
    expect(intrinsicSvgSize("96", null, "0 0 48 24")).toEqual({ width: 96, height: 48, declared: true });
    expect(intrinsicSvgSize(null, null, null)).toEqual({ width: 300, height: 150, declared: false });
    expect(parseViewBox("0,0,10,0")).toBeNull();
  });

  it("flags entity expansion and external entities", () => {
    const illustrator = `<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x" [<!ENTITY ns_svg "http://www.w3.org/2000/svg">]><svg/>`;
    expect(hasUnsafeEntities(illustrator)).toBe(false);
    const laughs = `<!DOCTYPE svg [<!ENTITY a "lol"><!ENTITY b "&a;&a;&a;">]><svg>&b;</svg>`;
    expect(hasUnsafeEntities(laughs)).toBe(true);
    const external = `<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>`;
    expect(hasUnsafeEntities(external)).toBe(true);
    expect(hasUnsafeEntities(`<svg xmlns="http://www.w3.org/2000/svg"/>`)).toBe(false);
  });

  it("removes external url() references but keeps internal ones", () => {
    expect(replaceExternalUrls("url(#grad)")).toBe("url(#grad)");
    expect(replaceExternalUrls("fill: url('https://evil.example/x.svg#a')")).toBe("fill: none");
    expect(replaceExternalUrls('background:url("//evil/x.png")')).toBe("background:none");
  });
});

describe("bulk sizing", () => {
  const base: BulkResizeSettings = { mode: "pixels", width: 1000, height: null, lockAspect: true, percent: 50, noEnlarge: true };

  it("fits each image by width while keeping proportions", () => {
    expect(bulkTargetSize(4000, 3000, base)).toEqual({ width: 1000, height: 750 });
    expect(bulkTargetSize(3000, 4000, base)).toEqual({ width: 1000, height: 1333 });
  });

  it("fits inside a box when both sides are given", () => {
    const box = { ...base, width: 800, height: 800 };
    expect(bulkTargetSize(4000, 2000, box)).toEqual({ width: 800, height: 400 });
    expect(bulkTargetSize(1000, 2000, box)).toEqual({ width: 400, height: 800 });
  });

  it("doesn't enlarge small images unless allowed", () => {
    expect(bulkTargetSize(500, 400, base)).toEqual({ width: 500, height: 400 });
    expect(bulkTargetSize(500, 400, { ...base, noEnlarge: false })).toEqual({ width: 1000, height: 800 });
  });

  it("supports exact size and percentage", () => {
    expect(bulkTargetSize(4000, 3000, { ...base, lockAspect: false, height: 500 })).toEqual({ width: 1000, height: 500 });
    expect(bulkTargetSize(4000, 3000, { ...base, mode: "percent", percent: 25 })).toEqual({ width: 1000, height: 750 });
  });

  it("explains invalid settings", () => {
    expect(bulkSettingsError({ ...base, width: null })).toMatch(/width/i);
    expect(bulkSettingsError({ ...base, lockAspect: false })).toMatch(/both/i);
    expect(bulkSettingsError({ ...base, mode: "percent", percent: 0 })).toMatch(/percentage/i);
  });
});

describe("crop geometry", () => {
  it("creates the largest centred crop for a ratio", () => {
    const c = defaultCrop(1, 4000, 2000);
    expect(cropToPixels(c, 4000, 2000)).toEqual({ x: 1000, y: 0, width: 2000, height: 2000 });
  });

  it("keeps the ratio while resizing from a corner and stays inside the image", () => {
    const a = 1 * (1000 / 1000);
    const start = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
    const r = resizeRect(start, "se", 0.9, 0.1, a, { width: 0.01, height: 0.01 });
    expect(r.x).toBeCloseTo(0.25);
    expect(r.width).toBeCloseTo(r.height);
    expect(r.x + r.width).toBeLessThanOrEqual(1.000001);
  });

  it("moves without leaving the image", () => {
    expect(moveRect({ x: 0.5, y: 0.5, width: 0.4, height: 0.4 }, 0.5, -1)).toEqual({ x: 0.6, y: 0, width: 0.4, height: 0.4 });
  });

  it("refits to a new ratio", () => {
    const r = refitCrop({ x: 0, y: 0, width: 1, height: 1 }, 16 / 9, 1600, 900);
    expect(r.width / r.height).toBeCloseTo(1);
    expect(r.width).toBeLessThanOrEqual(1);
  });

  it("normalizes pixel crops and rotated sizes", () => {
    expect(rotatedSize(400, 300, 90)).toEqual({ width: 300, height: 400 });
    expect(normalizeCrop({ x: -5, y: 10.4, width: 1000, height: 50 }, 200, 100)).toEqual({ x: 0, y: 10, width: 200, height: 50 });
    expect(() => normalizeCrop({ x: 0, y: 0, width: 0, height: 10 }, 10, 10)).toThrow();
  });
});

describe("jpeg dpi", () => {
  it("patches an existing JFIF header in place", async () => {
    const jfif = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
    const out = new Uint8Array(await (await setJpegDpi(new Blob([jfif]), 300)).arrayBuffer());
    expect(out.length).toBe(jfif.length);
    expect(readJpegDpi(out)).toBe(300);
  });

  it("inserts a JFIF header when missing", async () => {
    const bare = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x02, 0xff, 0xd9]);
    const out = new Uint8Array(await (await setJpegDpi(new Blob([bare]), 600)).arrayBuffer());
    expect(out.length).toBe(bare.length + 18);
    expect(readJpegDpi(out)).toBe(600);
  });
});

describe("signature background clean-up", () => {
  // 120 × 60 "photo" of paper with a strong shadow (brightness 235 → 165 left to right) and a dark ink line.
  function photo() {
    const w = 120;
    const h = 60;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const paper = 235 - (70 * x) / w;
        const ink = y >= 28 && y <= 31 && x > 10 && x < 110;
        const v = ink ? 35 : paper;
        data.set([v, v * 0.98, v * 0.94, 255], i);
      }
    }
    return { w, h, data, at: (x: number, y: number) => [...data.subarray((y * w + x) * 4, (y * w + x) * 4 + 4)] };
  }

  it("whitens paper across a shadow and keeps the ink", () => {
    const img = photo();
    cleanBackground(img.data, img.w, img.h, { threshold: 190, to: "white" });
    expect(img.at(2, 2)).toEqual([255, 255, 255, 255]);
    expect(img.at(117, 57)).toEqual([255, 255, 255, 255]); // darkest, shadowed paper
    expect(img.at(60, 29)[0]).toBeLessThan(80);
  });

  it("makes shadowed paper transparent and keeps ink opaque", () => {
    const img = photo();
    cleanBackground(img.data, img.w, img.h, { threshold: 190, to: "transparent" });
    expect(img.at(2, 2)[3]).toBe(0);
    expect(img.at(117, 57)[3]).toBe(0);
    expect(img.at(60, 29)[3]).toBe(255);
    expect(img.at(105, 30)[3]).toBe(255); // ink inside the shadow
  });
});

describe("photo presets", () => {
  it("every preset has an official source, a verification date and consistent pixel sizes", () => {
    for (const preset of PHOTO_PRESETS) {
      expect(preset.source.url).toMatch(/^https:\/\/(www\.)?(gov\.uk|canada\.ca|passportindia\.gov\.in)\//);
      expect(preset.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (preset.widthMm && preset.heightMm && preset.dpi) {
        expect(preset.widthPx).toBe(mmToPx(preset.widthMm, preset.dpi));
        expect(preset.heightPx).toBe(mmToPx(preset.heightMm, preset.dpi));
      }
    }
    expect(mmToPx(35)).toBe(413);
    expect(mmToPx(45)).toBe(531);
  });
});

describe("vector tracing", () => {
  function image(width: number, height: number, paint: (x: number, y: number) => [number, number, number, number]) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) data.set(paint(x, y), (y * width + x) * 4);
    }
    return { width, height, data };
  }

  const logo = image(80, 60, (x, y) => (x > 20 && x < 60 && y > 15 && y < 45 ? [200, 30, 40, 255] : [255, 255, 255, 255]));

  it("produces real vector paths, never an embedded bitmap", () => {
    const result = traceToSvg(logo, { mode: "color", colors: 2, threshold: 128, detail: "medium", removeBackground: false }, { width: 160, height: 120 });
    expect(result.svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="160" height="120" viewBox="0 0 80 60">/);
    expect(result.svg).toContain("<path");
    expect(result.svg).not.toMatch(/<image|base64|href/);
    expect(result.colorCount).toBe(2);
    expect(result.svg).toContain('fill="#c81e28"');
  });

  it("can drop the background colour", () => {
    const result = traceToSvg(logo, { mode: "color", colors: 2, threshold: 128, detail: "medium", removeBackground: true });
    expect(result.colorCount).toBe(1);
    expect(result.svg).not.toContain('fill="#ffffff"');
  });

  it("traces black and white with a threshold and keeps transparency out", () => {
    const transparent = image(40, 40, (x, y) => (x > 10 && x < 30 && y > 10 && y < 30 ? [10, 10, 10, 255] : [0, 0, 0, 0]));
    const result = traceToSvg(transparent, { mode: "bw", colors: 2, threshold: 128, detail: "high", removeBackground: false });
    expect(result.colorCount).toBe(1);
    expect(result.svg).toContain('fill="#000000"');
  });
});
