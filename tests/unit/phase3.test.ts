import { describe, expect, it } from "vitest";
import { QUALITY, searchTargetSize, type ScaledEncoder } from "@/lib/image-processing/target-size";
import { APPLICATIONS } from "@/lib/requirements/applications";
import { PASSPORT_NOT_VERIFIED, PASSPORT_REQUIREMENTS } from "@/lib/requirements/passports";
import { formatKbRange, latestVerification, type RequirementSet } from "@/lib/requirements/types";
import { allTools, getTool, navGroupOf, toolsIn, type ToolId } from "@/lib/tools/registry";

/** Hosts we accept as official sources. Anything else fails the build. */
const OFFICIAL_HOSTS = [
  "www.ibps.in",
  "sbi.bank.in",
  "ssc.gov.in",
  "neet.nta.nic.in",
  "www.passportindia.gov.in",
  "www.gov.uk",
  "www.canada.ca",
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const allSets: RequirementSet[] = [...Object.values(APPLICATIONS).flatMap((app) => app.sets), ...PASSPORT_REQUIREMENTS];

describe("requirement data", () => {
  it("every requirement cites an official https source with a real verification date", () => {
    for (const set of allSets) {
      const url = new URL(set.source.url);
      expect(url.protocol, set.id).toBe("https:");
      expect(OFFICIAL_HOSTS, `${set.id}: ${url.host}`).toContain(url.host);
      expect(set.source.lastVerified, set.id).toMatch(ISO_DATE);
      expect(Date.parse(set.source.lastVerified), `${set.id} verified in the future`).toBeLessThanOrEqual(Date.now());
      expect(set.source.title.length, set.id).toBeGreaterThan(5);
      expect(set.source.publisher.length, set.id).toBeGreaterThan(2);
    }
  });

  it("ids are unique", () => {
    const ids = allSets.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("size ranges and shapes are internally consistent", () => {
    for (const set of allSets) {
      for (const spec of [set.photo, set.signature]) {
        if (!spec) continue;
        if (spec.minKB && spec.maxKB) expect(spec.minKB, set.id).toBeLessThan(spec.maxKB);
        expect((spec.widthPx === undefined) === (spec.heightPx === undefined), `${set.id}: width and height go together`).toBe(true);
        if (spec.widthPx && spec.heightPx && spec.aspect) {
          expect(spec.aspect, set.id).toBeCloseTo(spec.widthPx / spec.heightPx, 3);
        }
        if (spec.widthPx) expect(spec.pixelBasis, `${set.id}: pixel sizes must say how they relate to the source`).toBeDefined();
        expect(spec.rules.length, set.id).toBeGreaterThan(0);
      }
      expect(set.photo || set.signature || set.livePhotoCapture, set.id).toBeTruthy();
    }
  });

  // Regression guards: these values are deliberately absent because the sources don't state them.
  it("doesn't invent values the official sources don't state", () => {
    const neet = APPLICATIONS.neet.sets[0];
    expect(neet.photo?.widthPx).toBeUndefined();
    expect(neet.photo?.aspect).toBeUndefined();
    expect(neet.photo).toMatchObject({ minKB: 10, maxKB: 200 });
    expect(neet.signature).toMatchObject({ minKB: 10, maxKB: 100 });

    for (const ssc of APPLICATIONS.ssc.sets) {
      expect(ssc.photo, "SSC 2026 captures the photo live; there is no upload spec").toBeUndefined();
      expect(ssc.livePhotoCapture).toBeDefined();
      expect(ssc.signature).toMatchObject({ minKB: 10, maxKB: 20 });
      expect(ssc.signature?.widthPx).toBeUndefined();
    }

    expect(APPLICATIONS.upsc.sets).toHaveLength(0);
    expect(APPLICATIONS.upsc.unverified?.reason).toBeTruthy();

    for (const set of [...APPLICATIONS.ibps.sets, ...APPLICATIONS.sbi.sets]) {
      expect(set.photo).toMatchObject({ widthPx: 200, heightPx: 230, minKB: 20, maxKB: 50, pixelBasis: "preferred" });
      expect(set.signature).toMatchObject({ widthPx: 140, heightPx: 60, minKB: 10, maxKB: 20, pixelBasis: "preferred" });
    }
  });

  it("passport data covers only verified countries and lists the rest as unverified", () => {
    const countries = new Set(PASSPORT_REQUIREMENTS.map((s) => s.group));
    expect([...countries].sort()).toEqual(["Canada", "India", "United Kingdom"]);
    for (const item of PASSPORT_NOT_VERIFIED) expect(countries.has(item.country)).toBe(false);
    const india = PASSPORT_REQUIREMENTS.find((s) => s.id === "india-passport-print")!;
    expect(india.photo).toMatchObject({ widthPx: 413, heightPx: 531, pixelBasis: "derived", dpi: 300 });
    expect(india.photo?.format).toBeUndefined();
  });

  it("formats KB ranges for display", () => {
    expect(formatKbRange({ minKB: 20, maxKB: 50 })).toBe("20 KB – 50 KB");
    expect(formatKbRange({ minKB: 50, maxKB: 10240 })).toBe("50 KB – 10 MB");
    expect(formatKbRange({ maxKB: 20 })).toBe("up to 20 KB");
    expect(formatKbRange({})).toBeNull();
  });
});

describe("registry and freshness", () => {
  const pages: Record<string, RequirementSet[]> = {
    "ssc-photo": APPLICATIONS.ssc.sets,
    "ibps-photo": APPLICATIONS.ibps.sets,
    "sbi-photo": APPLICATIONS.sbi.sets,
    "neet-photo": APPLICATIONS.neet.sets,
    "passport-photo": PASSPORT_REQUIREMENTS,
  };

  it("a page's lastmod is never older than its newest verified requirement", () => {
    for (const [id, sets] of Object.entries(pages)) {
      const latest = latestVerification(sets)!;
      expect(getTool(id as ToolId).updated >= latest, `${id}: updated ${getTool(id as ToolId).updated} < verified ${latest}`).toBe(true);
    }
  });

  it("has 37 tools in four navigation groups, each related list pointing to other existing tools", () => {
    expect(allTools).toHaveLength(37);
    expect(toolsIn("size").map((t) => t.id)).toEqual(["20kb-photo", "50kb-photo", "100kb-photo", "200kb-photo", "mb-to-kb-converter"]);
    expect(toolsIn("application")).toHaveLength(6);
    expect(toolsIn("image")).toHaveLength(17);
    expect(toolsIn("convert")).toHaveLength(9);
    const ids = new Set(allTools.map((t) => t.id));
    for (const tool of allTools) {
      expect(tool.related.length, tool.id).toBeGreaterThanOrEqual(3);
      expect(tool.related.length, tool.id).toBeLessThanOrEqual(6);
      expect(tool.related, tool.id).not.toContain(tool.id);
      for (const r of tool.related) expect(ids.has(r), `${tool.id} → ${r}`).toBe(true);
      expect(navGroupOf(tool)).toBeTruthy();
    }
  });
});

describe("quality ceiling in the target search", () => {
  const encoder: ScaledEncoder = async (scale, quality) => {
    const w = Math.round(1000 * scale);
    const h = Math.round(800 * scale);
    const size = Math.round(600 + w * h * 0.4 * (0.08 + 0.92 * quality ** 2.2));
    return { blob: new Blob([new Uint8Array(size)]), width: w, height: h };
  };

  it("never exceeds the cap, even when a higher quality would fit", async () => {
    const result = await searchTargetSize(encoder, { targetBytes: 10_000_000, allowResize: true, minScale: 0.05, maxQuality: 0.6 });
    expect(result.outcome).toBe("met");
    expect(result.attempt.quality).toBeLessThanOrEqual(0.6);
    expect(result.attempt.scale).toBe(1);
  });

  it("without a cap behaves as before", async () => {
    const result = await searchTargetSize(encoder, { targetBytes: 10_000_000, allowResize: true, minScale: 0.05 });
    expect(result.attempt.quality).toBe(QUALITY.max);
  });

  it("still meets a tight target with a cap", async () => {
    const result = await searchTargetSize(encoder, { targetBytes: 30_000, allowResize: true, minScale: 0.05, maxQuality: 0.5 });
    expect(result.outcome).toBe("met");
    expect(result.attempt.blob.size).toBeLessThanOrEqual(30_000);
    expect(result.attempt.quality).toBeLessThanOrEqual(0.5);
  });
});

describe("scaled size limits (regression: 63 MP image on a KB page)", () => {
  it("never rounds over the 50 MP canvas limit", async () => {
    const { scaledSize } = await import("@/lib/image-processing/core");
    const { LIMITS } = await import("@/lib/image-processing/formats");
    for (const [W, H] of [[9000, 7000], [16000, 12000], [12345, 6789], [10000, 10000]]) {
      const scale = Math.min(1, Math.sqrt(LIMITS.maxOutputPixels / (W * H)));
      const { width, height } = scaledSize(W, H, scale);
      expect(width * height, `${W}×${H}`).toBeLessThanOrEqual(LIMITS.maxOutputPixels);
      expect(width * height, `${W}×${H}`).toBeGreaterThan(LIMITS.maxOutputPixels * 0.998);
    }
    expect(scaledSize(4000, 3000, 0.25)).toEqual({ width: 1000, height: 750 });
  });
});
