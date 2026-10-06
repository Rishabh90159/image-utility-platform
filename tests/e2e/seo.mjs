// SEO QA against the running production server. Usage: node tests/e2e/seo.mjs
// Expects the build to have been made with NEXT_PUBLIC_SITE_URL=https://www.example.com
const BASE = process.env.BASE_URL || "http://localhost:3100";
const SITE = process.env.EXPECTED_SITE_URL || "https://www.example.com";

const toolPages = [
  "/tools/image-resizer",
  "/tools/image-compressor",
  "/tools/resize-image-to-kb",
  "/tools/jpg-to-png",
  "/tools/png-to-jpg",
  "/tools/heic-to-jpg",
  "/tools/svg-to-png",
  "/tools/png-to-svg",
  "/tools/image-cropper",
  "/tools/passport-photo-resizer",
  "/tools/signature-resizer",
  "/tools/bulk-image-resizer",
];
const pages = ["/", "/tools", ...toolPages, "/about", "/methodology", "/privacy", "/terms", "/contact"];

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const meta = (html, attr, value) =>
  decode(html.match(new RegExp(`<meta[^>]*${attr}="${value}"[^>]*content="([^"]*)"`))?.[1] ?? "");

const titles = new Map();
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
  if (titles.has(title)) check(`${route}: unique title`, false, `same as ${titles.get(title)}`);
  titles.set(title, route);
  if (descriptions.has(description)) check(`${route}: unique description`, false, `same as ${descriptions.get(description)}`);
  descriptions.set(description, route);
}
check("all titles unique", titles.size === pages.length);
check("all descriptions unique", descriptions.size === pages.length);
check("all H1s unique", h1Texts.size === pages.length);

// Every tool page links to every one of its registry "related" tools.
for (const route of toolPages) {
  const html = await (await fetch(BASE + route)).text();
  const related = (html.split('id="related-heading"')[1] ?? "").split("</section>")[0];
  const links = [...related.matchAll(/href="(\/tools\/[^"]+)"/g)].map((m) => m[1]);
  check(`${route}: related tools are other tools`, links.length >= 3 && !links.includes(route), links.join(", "));
}

// Heavy tool libraries must not load on pages that don't need them.
for (const route of ["/", "/tools", "/tools/image-resizer"]) {
  const html = await (await fetch(BASE + route)).text();
  const srcs = [...new Set([...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]))];
  let heavy = false;
  for (const src of srcs) {
    const js = await (await fetch(BASE + src)).text();
    if (/HeifDecoder|imagedataToTracedata|DOMPurify/.test(js)) heavy = true;
  }
  check(`${route}: no HEIC/tracing/sanitizer code in initial JS`, !heavy);
}

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
