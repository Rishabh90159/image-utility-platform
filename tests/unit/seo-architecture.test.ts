import { describe, expect, it } from "vitest";
import { KEYWORD_MAP, UNSERVED_INTENTS } from "@/lib/seo/keyword-map";
import { allTools, APPLICATION_HUB, breadcrumbTrail, getTool } from "@/lib/tools/registry";

const norm = (k: string) => k.toLowerCase().replace(/\s+/g, " ").trim();

describe("keyword map", () => {
  it("gives every tool page and the hub exactly one entry", () => {
    const paths = KEYWORD_MAP.map((t) => t.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect([...paths].sort()).toEqual([...allTools.map((t) => t.path), APPLICATION_HUB.path].sort());
  });

  it("assigns each keyword to one page only (no cannibalization)", () => {
    const owner = new Map<string, string>();
    for (const target of KEYWORD_MAP) {
      for (const keyword of [target.primary, ...target.secondary].map(norm)) {
        expect(owner.get(keyword), `"${keyword}" is mapped to ${owner.get(keyword)} and ${target.path}`).toBeUndefined();
        owner.set(keyword, target.path);
      }
    }
    for (const keyword of UNSERVED_INTENTS) expect(owner.has(norm(keyword)), `"${keyword}" has no tool yet`).toBe(false);
  });

  it("only links supporting pages that exist", () => {
    const known = new Set([...KEYWORD_MAP.map((t) => t.path), "/tools", "/"]);
    for (const target of KEYWORD_MAP) for (const path of target.supportedBy) expect(known.has(path), path).toBe(true);
  });
});

describe("breadcrumbs", () => {
  it("puts size pages under resize-image-to-kb and application pages under the hub", () => {
    expect(breadcrumbTrail(getTool("100kb-photo")).map((c) => c.path)).toEqual(["/", "/tools", "/tools/resize-image-to-kb", "/tools/100kb-photo"]);
    expect(breadcrumbTrail(getTool("ssc-photo")).map((c) => c.path)).toEqual(["/", "/tools", APPLICATION_HUB.path, "/tools/ssc-photo"]);
    expect(breadcrumbTrail(getTool("image-resizer")).map((c) => c.path)).toEqual(["/", "/tools", "/tools/image-resizer"]);
    for (const id of ["resize-jpg", "resize-png", "resize-webp", "resize-gif", "instagram-image-resizer"] as const) {
      expect(breadcrumbTrail(getTool(id)).map((c) => c.path)).toEqual(["/", "/tools", "/tools/image-resizer", `/tools/${id}`]);
    }
  });
});
