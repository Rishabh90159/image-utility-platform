import { describe, expect, it } from "vitest";
import { coverSourceRect, fitPlacement, shapesDiffer } from "@/lib/image-processing/fit";
import { INSTAGRAM_PRESETS, STORY_SAFE_AREA } from "@/lib/presets/instagram";

const layout = (width: number, height: number, extra: Partial<{ alignX: number; alignY: number; border: number }> = {}) => ({
  width,
  height,
  alignX: 0.5,
  alignY: 0.5,
  border: 0,
  ...extra,
});

describe("fitPlacement", () => {
  it("fits a landscape photo into a portrait frame without stretching, centred", () => {
    const p = fitPlacement(4000, 3000, layout(1080, 1350));
    expect(p.width).toBe(1080);
    expect(p.height).toBe(810);
    expect(p.x).toBe(0);
    expect(p.y).toBe(270);
    expect(p.width / p.height).toBeCloseTo(4000 / 3000, 2);
  });

  it("fits a tall photo into a square frame and honours the position", () => {
    expect(fitPlacement(1000, 2000, layout(1080, 1080, { alignX: 0 }))).toEqual({ x: 0, y: 0, width: 540, height: 1080 });
    expect(fitPlacement(1000, 2000, layout(1080, 1080, { alignX: 1 }))).toEqual({ x: 540, y: 0, width: 540, height: 1080 });
  });

  it("adds an even border on every side", () => {
    const p = fitPlacement(1000, 1000, layout(1080, 1080, { border: 0.1 }));
    expect(p).toEqual({ x: 108, y: 108, width: 864, height: 864 });
  });

  it("always stays inside the frame, for every Instagram preset and awkward sources", () => {
    for (const preset of INSTAGRAM_PRESETS) {
      for (const [w, h] of [[1, 1], [7, 3000], [3000, 7], [4032, 3024], [1080, 1920]]) {
        for (const align of [0, 0.37, 1]) {
          const p = fitPlacement(w, h, layout(preset.width, preset.height, { alignX: align, alignY: align, border: 0.05 }));
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.x + p.width).toBeLessThanOrEqual(preset.width);
          expect(p.y + p.height).toBeLessThanOrEqual(preset.height);
          expect(p.width).toBeGreaterThanOrEqual(1);
          expect(p.height).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});

describe("coverSourceRect", () => {
  it("takes the centre of the source in the frame's shape", () => {
    expect(coverSourceRect(4000, 3000, 1080, 1080)).toEqual({ x: 500, y: 0, width: 3000, height: 3000 });
    const r = coverSourceRect(1000, 1000, 1080, 1920);
    expect(r.width / r.height).toBeCloseTo(1080 / 1920, 5);
    expect(r.height).toBe(1000);
  });
});

describe("shapesDiffer", () => {
  it("ignores rounding-level differences", () => {
    expect(shapesDiffer(1080, 1350, 1080, 1350)).toBe(false);
    expect(shapesDiffer(2160, 2701, 1080, 1350)).toBe(false);
    expect(shapesDiffer(4000, 3000, 1080, 1350)).toBe(true);
  });
});

describe("Instagram presets", () => {
  it("have the documented sizes and matching ratios", () => {
    const sizes = Object.fromEntries(INSTAGRAM_PRESETS.map((p) => [p.id, [p.width, p.height]]));
    expect(sizes).toEqual({
      square: [1080, 1080],
      portrait: [1080, 1350],
      tall: [1080, 1440],
      landscape: [1080, 566],
      story: [1080, 1920],
      "reel-cover": [1080, 1920],
    });
    expect(INSTAGRAM_PRESETS.find((p) => p.id === "tall")?.note).toMatch(/publish/);
    expect(STORY_SAFE_AREA.top + STORY_SAFE_AREA.bottom).toBeLessThan(0.5);
  });
});
