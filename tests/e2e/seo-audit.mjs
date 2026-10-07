// Per-page SEO audit of the running production build, written to docs/seo-audit.md.
// Usage: start the server (built with NEXT_PUBLIC_SITE_URL set), then node tests/e2e/seo-audit.mjs
import fs from "node:fs";
import { KEYWORD_MAP } from "../../lib/seo/keyword-map.ts";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const meta = (html, attr, value) => decode(html.match(new RegExp(`<meta[^>]*${attr}="${value}"[^>]*content="([^"]*)"`))?.[1] ?? "");
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const inSitemap = new Set([...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/^$/, "/")));

const jsCache = new Map();
async function firstLoadJs(html) {
  const srcs = [...new Set([...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]))];
  let total = 0;
  for (const src of srcs) {
    if (!jsCache.has(src)) jsCache.set(src, (await (await fetch(BASE + src)).arrayBuffer()).byteLength);
    total += jsCache.get(src);
  }
  return Math.round(total / 1024);
}

const rows = [];
const pages = ["/", "/tools", ...KEYWORD_MAP.map((t) => t.path), "/about", "/methodology", "/privacy", "/terms", "/contact"];
const titles = new Map();
for (const route of [...new Set(pages)]) {
  const res = await fetch(BASE + route);
  const html = await res.text();
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  titles.set(route, title.toLowerCase());
  const main = html.split('<main id="main"')[1]?.split("</main>")[0] ?? "";
  const text = decode(main.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1])["@type"]);
  const internal = new Set([...main.matchAll(/<a[^>]*href="(\/[^"#?]*)/g)].map((m) => m[1]).filter((h) => h !== route));
  const target = KEYWORD_MAP.find((t) => t.path === route);
  rows.push({
    route,
    status: res.status,
    target,
    title,
    description: meta(html, "name", "description"),
    h1: decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim(),
    h2: (main.match(/<h2[\s>]/g) ?? []).length,
    canonical: html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? "",
    indexable: !/noindex/.test(meta(html, "name", "robots")),
    words: text.split(" ").length,
    internal: internal.size,
    schema: ld.join(", "),
    sitemap: inSitemap.has(route),
    js: await firstLoadJs(html),
  });
}

for (const row of rows) {
  const p = row.target?.primary;
  row.conflicts = p ? rows.filter((r) => r !== row && titles.get(r.route).includes(p)).map((r) => r.route) : [];
  row.quality =
    row.words >= 900 ? "Substantial" : row.words >= 500 ? "Adequate" : row.target ? "Thin – review" : "Supporting page";
}

const date = new Date().toISOString().slice(0, 10);
let md = `# SEO audit\n\nGenerated ${date} by \`tests/e2e/seo-audit.mjs\` from the production build. Word counts cover the visible \`<main>\` text, including the tool's interface labels. First-load JS is uncompressed and includes the shared framework chunks.\n\n`;
md += `| URL | Primary keyword | Intent | Title | H1 | Canonical | Indexable | Sitemap | Words | H2s | Internal links | Schema | First-load JS | Overlap with |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) {
  md += `| ${r.route} | ${cell(r.target?.primary ?? "—")} | ${r.target?.intent ?? "site"} | ${cell(r.title)} (${r.title.length}) | ${cell(r.h1)} | ${r.canonical.endsWith(r.route === "/" ? "" : r.route) ? "self" : cell(r.canonical)} | ${r.indexable ? "yes" : "NO"} | ${r.sitemap ? "yes" : "NO"} | ${r.words} (${r.quality}) | ${r.h2} | ${r.internal} | ${r.schema} | ${r.js} KB | ${r.conflicts.join(", ") || "none"} |\n`;
}
md += `\n## Descriptions\n\n| URL | Meta description | Length |\n|---|---|---|\n`;
for (const r of rows) md += `| ${r.route} | ${cell(r.description)} | ${r.description.length} |\n`;
md += `\n## Secondary keywords\n\n| URL | Secondary | Supported by |\n|---|---|---|\n`;
for (const r of rows.filter((x) => x.target)) md += `| ${r.route} | ${r.target.secondary.join(", ")} | ${r.target.supportedBy.join(", ")} |\n`;

fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/seo-audit.md", md);
console.log(`Audited ${rows.length} pages → docs/seo-audit.md`);
const problems = rows.filter((r) => r.status !== 200 || !r.indexable || !r.sitemap || r.conflicts.length || r.quality.startsWith("Thin"));
for (const r of problems) console.log(`REVIEW ${r.route}: status ${r.status}, indexable ${r.indexable}, sitemap ${r.sitemap}, conflicts ${r.conflicts.join(",") || "none"}, ${r.words} words`);
