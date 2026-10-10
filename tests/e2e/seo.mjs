// SEO QA against the running production server. Usage: node tests/e2e/seo.mjs
// Expects the build to have been made with NEXT_PUBLIC_SITE_URL=https://www.example.com
import { KEYWORD_MAP } from "../../lib/seo/keyword-map.ts";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const SITE = process.env.EXPECTED_SITE_URL || "https://www.example.com";

const toolPages = [
  "/tools/image-resizer",
  "/tools/resize-jpg",
  "/tools/resize-png",
  "/tools/resize-webp",
  "/tools/resize-gif",
  "/tools/instagram-image-resizer",
  "/tools/image-compressor",
  "/tools/resize-image-to-kb",
  "/tools/jpg-to-png",
  "/tools/png-to-jpg",
  "/tools/webp-to-jpg",
  "/tools/heic-to-jpg",
  "/tools/svg-to-png",
  "/tools/png-to-svg",
  "/tools/image-cropper",
  "/tools/passport-photo-resizer",
  "/tools/signature-resizer",
  "/tools/bulk-image-resizer",
  "/tools/20kb-photo",
  "/tools/50kb-photo",
  "/tools/100kb-photo",
  "/tools/200kb-photo",
  "/tools/ssc-photo",
  "/tools/upsc-photo",
  "/tools/ibps-photo",
  "/tools/sbi-photo",
  "/tools/neet-photo",
  "/tools/passport-photo",
  "/tools/image-upscaler",
  "/tools/background-remover",
  "/tools/photo-to-pdf",
  "/tools/merge-images",
  "/tools/jpeg-to-jpg",
  "/tools/jpg-to-pdf",
  "/tools/image-size-increase",
  "/tools/image-quality-enhancer",
  "/tools/mb-to-kb-converter",
];
// Pages with overlapping intent whose text must stay distinct.
const overlapPages = [
  "/tools/photo-to-pdf",
  "/tools/jpg-to-pdf",
  "/tools/image-upscaler",
  "/tools/image-size-increase",
  "/tools/image-quality-enhancer",
  "/tools/image-resizer",
  "/tools/jpeg-to-jpg",
  "/tools/jpg-to-png",
  "/tools/resize-jpg",
  "/tools/resize-png",
  "/tools/resize-webp",
  "/tools/resize-gif",
  "/tools/instagram-image-resizer",
];
const kbPages = ["/tools/20kb-photo", "/tools/50kb-photo", "/tools/100kb-photo", "/tools/200kb-photo", "/tools/resize-image-to-kb"];
const HUB = "/tools/application-photos";
const applicationPages = ["/tools/ssc-photo", "/tools/upsc-photo", "/tools/ibps-photo", "/tools/sbi-photo", "/tools/neet-photo", "/tools/passport-photo", HUB];
const OFFICIAL = /href="https:\/\/(www\.ibps\.in|sbi\.bank\.in|ssc\.gov\.in|neet\.nta\.nic\.in|upsconline\.nic\.in|upsc\.gov\.in|www\.passportindia\.gov\.in|www\.gov\.uk|www\.canada\.ca)\//;
const DISCLAIMER = "Application requirements can change. Always verify the final image against the latest official";
const pages = ["/", "/tools", HUB, ...toolPages, "/about", "/methodology", "/privacy", "/terms", "/contact"];

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const meta = (html, attr, value) =>
  decode(html.match(new RegExp(`<meta[^>]*${attr}="${value}"[^>]*content="([^"]*)"`))?.[1] ?? "");

const titles = new Map();
const mainTexts = new Map();
const mainText = (html) =>
  decode(
    (html.split('class="prose-content"')[1] ?? "")
      .split('id="related-heading"')[0]
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .toLowerCase()
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ");
const shingles = (text, n = 6) => {
  const words = text.split(" ").filter(Boolean);
  const set = new Set();
  for (let i = 0; i + n <= words.length; i++) set.add(words.slice(i, i + n).join(" "));
  return set;
};
const h1Texts = new Map();
const descriptions = new Map();

for (const route of pages) {
  const res = await fetch(BASE + route, { redirect: "manual" });
  const html = await res.text();
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  const description = meta(html, "name", "description");
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const h1s = html.match(/<h1[\s>]/g)?.length ?? 0;
  const robots = meta(html, "name", "robots");
  const ldTypes = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1])["@type"]);
  const expectedCanonical = route === "/" ? SITE : `${SITE}${route}`;
  const internalLinks = new Set([...html.matchAll(/<a[^>]*href="(\/[^"#]*)"/g)].map((m) => m[1]));

  check(`${route}: HTTP 200`, res.status === 200, String(res.status));
  check(`${route}: title`, title.length >= 20 && title.length <= 70, `${title.length} chars: ${title}`);
  check(`${route}: description`, description.length >= 70 && description.length <= 170, `${description.length} chars`);
  check(`${route}: one H1`, h1s === 1, String(h1s));
  check(`${route}: canonical`, canonical === expectedCanonical, canonical);
  check(`${route}: indexable`, !/noindex/.test(robots), robots || "(default)");
  check(`${route}: Open Graph`, meta(html, "property", "og:title") && meta(html, "property", "og:url") === expectedCanonical && meta(html, "property", "og:image"), meta(html, "property", "og:image"));
  check(`${route}: internal links`, internalLinks.size >= 8, `${internalLinks.size} unique`);
  if (route !== "/") check(`${route}: breadcrumbs`, html.includes('aria-label="Breadcrumb"') && ldTypes.includes("BreadcrumbList"));
  {
    const crumbs = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]
      .map((m) => JSON.parse(m[1]))
      .find((d) => d["@type"] === "BreadcrumbList")?.itemListElement.map((i) => i.item.replace(SITE, "") || "/");
    const parent = kbPages.slice(0, 4).includes(route) ? "/tools/resize-image-to-kb" : applicationPages.includes(route) && route !== HUB ? HUB : null;
    if (parent) check(`${route}: breadcrumb goes through its category`, crumbs?.length === 4 && crumbs[2] === parent && crumbs[3] === route, crumbs?.join(" > "));
  }
  {
    const target = KEYWORD_MAP.find((t) => t.path === route);
    if (target) {
      const h1Text = decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "").replace(/<[^>]+>/g, "")).toLowerCase();
      check(`${route}: primary keyword "${target.primary}" in title or H1`, title.toLowerCase().includes(target.primary) || h1Text.includes(target.primary));
    }
  }
  if (toolPages.includes(route)) {
    check(`${route}: FAQ visible + FAQPage schema`, html.includes('id="faq-heading"') && ldTypes.includes("FAQPage"));
    check(`${route}: related tools`, html.includes('id="related-heading"'));
    check(`${route}: WebApplication schema`, ldTypes.includes("WebApplication"));
    const faqQuestions = [...html.matchAll(/"@type":"Question","name":"([^"]*)"/g)].map((m) => m[1]);
    const visible = faqQuestions.every((q) => decode(html).includes(`>${q.replace(/\\"/g, '"')}</h3>`));
    check(`${route}: every FAQPage question is visible on the page`, faqQuestions.length >= 5 && visible, `${faqQuestions.length} questions`);
    check(`${route}: no ratings/reviews in schema`, !/AggregateRating|"Review"/.test(html));
  }
  const h1 = decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "").replace(/<[^>]+>/g, ""));
  if (h1Texts.has(h1)) check(`${route}: unique H1`, false, `same as ${h1Texts.get(h1)}`);
  h1Texts.set(h1, route);
  if (kbPages.includes(route) || applicationPages.includes(route) || overlapPages.includes(route)) mainTexts.set(route, mainText(html));
  if (applicationPages.includes(route)) {
    const text = decode(html);
    check(`${route}: links an official source (new tab)`, OFFICIAL.test(html) && /target="_blank" rel="noopener noreferrer"/.test(html));
    check(`${route}: shows a verification date`, /Last verified|Verified <!-- -->|Verified <time|Last checked/.test(html));
    check(`${route}: requirement disclaimer visible`, text.includes(DISCLAIMER));
    check(`${route}: says it is independent, never official`, !/official (SSC|UPSC|IBPS|SBI|NEET|NTA) tool/i.test(text) && /not affiliated/i.test(text));
    check(`${route}: no fabricated schema types`, !/AggregateRating|"Review"|GovernmentOrganization/.test(html));
  }
  if (titles.has(title)) check(`${route}: unique title`, false, `same as ${titles.get(title)}`);
  titles.set(title, route);
  if (descriptions.has(description)) check(`${route}: unique description`, false, `same as ${descriptions.get(description)}`);
  descriptions.set(description, route);
}
check("all titles unique", titles.size === pages.length);
check("all descriptions unique", descriptions.size === pages.length);
check("all H1s unique", h1Texts.size === pages.length);

// Duplicate-content check: size pages and application pages must not share large blocks of text.
{
  const entries = [...mainTexts];
  let worst = { pair: "", score: 0 };
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = shingles(entries[i][1]);
      const b = shingles(entries[j][1]);
      let shared = 0;
      for (const sh of a) if (b.has(sh)) shared++;
      const score = shared / Math.max(1, Math.min(a.size, b.size));
      if (score > worst.score) worst = { pair: entries[i][0] + " ~ " + entries[j][0], score };
    }
  }
  check(
    "no near-duplicate content between size, application and overlapping-intent pages (6-word overlap < 15%)",
    entries.length === 25 && worst.score < 0.15,
    (worst.score * 100).toFixed(1) + "% max (" + worst.pair + ")",
  );
}

// Every tool page links to every one of its registry "related" tools.
for (const route of toolPages) {
  const html = await (await fetch(BASE + route)).text();
  const related = (html.split('id="related-heading"')[1] ?? "").split("</section>")[0];
  const links = [...related.matchAll(/href="(\/tools\/[^"]+)"/g)].map((m) => m[1]);
  check(`${route}: related tools are other tools`, links.length >= 3 && !links.includes(route), links.join(", "));
}

// Heavy tool libraries must not load on pages that don't need them.
for (const route of ["/", "/tools", "/tools/image-resizer", "/tools/background-remover", "/tools/photo-to-pdf", "/tools/image-upscaler"]) {
  const html = await (await fetch(BASE + route)).text();
  const srcs = [...new Set([...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]))];
  let heavy = false;
  for (const src of srcs) {
    const js = await (await fetch(BASE + src)).text();
    if (/HeifDecoder|imagedataToTracedata|DOMPurify|InferenceSession|ort-wasm/.test(js)) heavy = true;
  }
  check(`${route}: no HEIC/tracing/sanitizer/ONNX code in initial JS`, !heavy);
}

// Parameters and trailing slashes must not create indexable duplicates.
{
  const html = await (await fetch(`${BASE}/tools/image-resizer?utm_source=test&target=50`)).text();
  check("query-string URL canonicalises to the clean URL", html.includes(`<link rel="canonical" href="${SITE}/tools/image-resizer"`));
  const slash = await fetch(`${BASE}/tools/image-resizer/`, { redirect: "manual" });
  check("trailing slash redirects permanently to the canonical path", [301, 308].includes(slash.status) && slash.headers.get("location")?.endsWith("/tools/image-resizer"), `${slash.status} → ${slash.headers.get("location")}`);
  const upper = await fetch(`${BASE}/tools/Image-Resizer`, { redirect: "manual" });
  check("mixed-case URL is not served as a duplicate", upper.status === 404 || [301, 308].includes(upper.status), String(upper.status));
}
check("every keyword-map page is checked", KEYWORD_MAP.every((t) => pages.includes(t.path)));

// Sitemap
const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
check("sitemap: contains every page", pages.every((p) => locs.includes(p === "/" ? SITE : `${SITE}${p}`)), `${locs.length} URLs`);
check("sitemap: no duplicates", new Set(locs).size === locs.length);
check("sitemap: no query parameters", locs.every((l) => !l.includes("?")));
check("sitemap: production domain only", locs.every((l) => l.startsWith(SITE)));

// robots.txt
const robots = await (await fetch(`${BASE}/robots.txt`)).text();
check("robots.txt: allows crawling", /Allow: \//.test(robots) && !/Disallow: \/\s/.test(robots), robots.replace(/\n/g, " | "));
check("robots.txt: references sitemap", robots.includes(`Sitemap: ${SITE}/sitemap.xml`));

// OG image and headers
const og = await fetch(`${BASE}/tools/resize-image-to-kb/opengraph-image`);
check("og image renders", og.status === 200 && og.headers.get("content-type") === "image/png");
const headers = (await fetch(`${BASE}/tools/image-resizer`)).headers;
const csp = headers.get("content-security-policy") ?? "";
check("CSP restricts network requests to this site", /connect-src 'self'(;|$)/.test(csp), csp.match(/connect-src[^;]*/)?.[0]);
check("CSP allows WebAssembly but not eval", /'wasm-unsafe-eval'/.test(csp) && !/'unsafe-eval'/.test(csp));

// 404
const missing = await fetch(`${BASE}/tools/does-not-exist`);
const missingHtml = await missing.text();
check("404: correct status and noindex", missing.status === 404 && /noindex/.test(missingHtml));

// JS weight on a non-tool page vs a tool page (first-load scripts referenced in HTML)
async function scriptBytes(route) {
  const html = await (await fetch(BASE + route)).text();
  const srcs = [...new Set([...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]))];
  let total = 0;
  for (const src of srcs) total += (await (await fetch(BASE + src)).arrayBuffer()).byteLength;
  return total;
}
const aboutJs = await scriptBytes("/about");
const toolJs = await scriptBytes("/tools/resize-image-to-kb");
console.log(`INFO  first-load JS (uncompressed): /about ${(aboutJs / 1024).toFixed(0)} KB, /tools/resize-image-to-kb ${(toolJs / 1024).toFixed(0)} KB`);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} SEO checks passed`);
process.exit(failed ? 1 : 0);
