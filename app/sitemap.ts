import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { allTools } from "@/lib/tools/registry";

/**
 * Canonical, indexable URLs only: no query parameters, no duplicates.
 * Tool URLs come from the registry, so new tools are included automatically.
 */
const staticPages: { path: string; updated: string; priority: number }[] = [
  { path: "/", updated: "2026-10-07", priority: 1 },
  { path: "/tools", updated: "2026-10-07", priority: 0.8 },
  { path: "/tools/application-photos", updated: "2026-10-07", priority: 0.7 },
  { path: "/about", updated: "2026-10-06", priority: 0.4 },
  { path: "/methodology", updated: "2026-10-07", priority: 0.5 },
  { path: "/privacy", updated: "2026-10-06", priority: 0.3 },
  { path: "/terms", updated: "2026-10-06", priority: 0.2 },
  { path: "/contact", updated: "2026-10-06", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries = [
    ...staticPages.map((page) => ({ url: absoluteUrl(page.path), lastModified: page.updated, priority: page.priority })),
    ...allTools.map((tool) => ({ url: absoluteUrl(tool.path), lastModified: tool.updated, priority: 0.9 })),
  ];
  const seen = new Set<string>();
  return entries.filter((entry) => (seen.has(entry.url) ? false : (seen.add(entry.url), true)));
}
