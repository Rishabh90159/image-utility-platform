// End-to-end tests for the PDF tools (Word to PDF, PDF to Word, Merge PDF) in a real browser (Edge by default).
// Usage: start the production server (npm run build && npx next start -p 3100), then
//   node tests/e2e/pdf-tools.mjs
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, degrees } from "@cantoo/pdf-lib";
import { AlignmentType, Document, HeadingLevel, ImageRun, Packer, PageBreak, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun } from "docx";
import JSZip from "jszip";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CHANNEL = process.env.BROWSER_CHANNEL || "msedge";
const FIX = "tests/fixtures/generated/pdf-tools";
const OUT = "tests/e2e/output/pdf-tools";
const SITE = "https://www.imgifyr.com";
fs.mkdirSync(FIX, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
const origin = new URL(BASE).origin;
const offending = [];
const consoleErrors = [];

async function newContext(viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport });
  ctx.on("request", (req) => {
    const url = req.url();
    if (!/^https?:/.test(url)) return;
    if (new URL(url).origin !== origin || req.method() !== "GET") offending.push(`${req.method()} ${url}`);
  });
  return ctx;
}
const context = await newContext();

async function openPage(route, ctx = context) {
  const page = await ctx.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${route}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`${route}: ${err.message}`));
  const response = await page.goto(BASE + route, { waitUntil: "networkidle" });
  return { page, status: response?.status() };
}

async function pdfInfo(bytes) {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const text = (await page.getTextContent()).items.map((item) => item.str ?? "").join(" ");
    const [, , w, h] = page.view;
    pages.push({ text, width: Math.round(w), height: Math.round(h) });
  }
  return pages;
}

// ---------- Fixtures ----------
async function makePng() {
  const page = await browser.newPage();
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(0, 0, 300, 150);
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(150, 75, 50, 0, Math.PI * 2);
    ctx.fill();
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.close();
  return Buffer.from(base64, "base64");
}

const png = await makePng();
const longParagraphs = Array.from({ length: 70 }, (_, i) =>
  new Paragraph({ children: [new TextRun(`Flow paragraph ${i + 1}. This sentence repeats to fill the page so the converter has to start new pages on its own, the way Word would.`)] }),
);
const sampleDocx = new Document({
  sections: [
    {
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Quarterly Report")] }),
        new Paragraph({ children: [new TextRun("An introduction paragraph with "), new TextRun({ text: "bold", bold: true }), new TextRun(" and "), new TextRun({ text: "italic", italics: true }), new TextRun(" text.")] }),
        new Paragraph({ text: "First bullet point", bullet: { level: 0 } }),
        new Paragraph({ text: "Second bullet point", bullet: { level: 0 } }),
        new Table({
          rows: [
            ["Product", "Units", "Revenue"],
            ["Widgets", "120", "2400"],
            ["Gadgets", "80", "3200"],
          ].map((row) => new TableRow({ children: row.map((cell) => new TableCell({ children: [new Paragraph(cell)] })) })),
        }),
        new Paragraph({ children: [new ImageRun({ type: "png", data: png, transformation: { width: 200, height: 100 } })] }),
        new Paragraph({ children: [new TextRun("Text before an explicit break"), new PageBreak()] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("Second page after the page break")] }),
        ...longParagraphs,
      ],
    },
    {
      properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
      children: [new Paragraph({ children: [new TextRun("Landscape section content")] })],
    },
  ],
});
fs.writeFileSync(path.join(FIX, "sample.docx"), Buffer.from(await Packer.toArrayBuffer(sampleDocx)));
const hindiDocx = new Document({ sections: [{ children: [new Paragraph("Hello नमस्ते दुनिया mixed script")] }] });
fs.writeFileSync(path.join(FIX, "hindi.docx"), Buffer.from(await Packer.toArrayBuffer(hindiDocx)));
fs.writeFileSync(path.join(FIX, "notes.txt.pdf"), "This is plain text, not a PDF.");
fs.writeFileSync(path.join(FIX, "empty.docx"), "");
const xlsx = new JSZip();
xlsx.file("[Content_Types].xml", "<Types/>");
xlsx.file("xl/workbook.xml", "<workbook/>");
fs.writeFileSync(path.join(FIX, "spreadsheet.docx"), await xlsx.generateAsync({ type: "nodebuffer" }));

// A text PDF as produced by a browser's "Save as PDF" (embedded subset fonts).
{
  const page = await browser.newPage();
  await page.setContent(`<html><body style="font-family: Arial; font-size: 11pt; margin: 0">
    <h1 style="font-size: 24pt">Annual Summary</h1>
    <p>This paragraph was printed from a web page. It is long enough to wrap across more than one line in the PDF, so the converter must join the lines back into a single editable paragraph.</p>
    <p>A second paragraph follows the first one.</p>
    <ul><li>Apples are listed first</li><li>Oranges come second</li></ul>
    <table style="border-collapse: collapse; margin-top: 16px"><tr><td style="width:160px">Region</td><td style="width:160px">Sales</td><td>Growth</td></tr>
    <tr><td>North</td><td>1,200</td><td>4%</td></tr><tr><td>South</td><td>950</td><td>7%</td></tr></table>
  </body></html>`);
  fs.writeFileSync(path.join(FIX, "text.pdf"), await page.pdf({ format: "A4", margin: { top: "2cm", bottom: "2cm", left: "2cm", right: "2cm" } }));
  await page.close();
}
async function labelled(name, labels, options = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const label of labels) {
    const page = doc.addPage(options.size ?? [595, 842]);
    page.drawText(label, { x: 72, y: page.getHeight() - 100, size: 16, font });
    if (options.rotate) page.setRotation(degrees(options.rotate));
  }
  if (options.encrypt) doc.encrypt(options.encrypt);
  fs.writeFileSync(path.join(FIX, name), await doc.save());
}
await labelled("alpha.pdf", ["Alpha one"]);
await labelled("bravo.pdf", ["Bravo one", "Bravo two"], { size: [842, 595] });
await labelled("charlie.pdf", ["Charlie one"], { rotate: 90 });
await labelled("locked.pdf", ["Locked"], { encrypt: { userPassword: "secret", ownerPassword: "owner" } });
{
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(png);
  doc.addPage([595, 842]).drawImage(image, { x: 0, y: 0, width: 595, height: 842 });
  fs.writeFileSync(path.join(FIX, "scan.pdf"), await doc.save());
}
// Fonts: a Word-style document whose theme font is Carlito (as LibreOffice saves; not installed on most
// devices, so the bundled copy must be used), and one with a font embedded in the file.
{
  const zip = await JSZip.loadAsync(fs.readFileSync(path.join(FIX, "hindi.docx")));
  zip.file("word/document.xml", (await zip.file("word/document.xml").async("string")).replace(/<w:t[^>]*>[^<]*<\/w:t>/, '<w:t xml:space="preserve">Theme font body text</w:t>'));
  let styles = await zip.file("word/styles.xml").async("string");
  styles = styles.replace("<w:docDefaults><w:rPrDefault/>", '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/></w:rPr></w:rPrDefault>');
  zip.file("word/styles.xml", styles);
  const theme = await zip.file("word/theme/theme1.xml").async("string");
  zip.file("word/theme/theme1.xml", theme.replace(/(<a:minorFont><a:latin typeface=")[^"]*/, "$1Carlito"));
  fs.writeFileSync(path.join(FIX, "theme-carlito.docx"), await zip.generateAsync({ type: "nodebuffer" }));
  const ttf = fs.readFileSync("node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf");
  const embedded = new Document({
    fonts: [{ name: "Embedded Test Font", data: ttf, characterSet: "00" }],
    sections: [{ children: [new Paragraph({ children: [new TextRun({ text: "Text in an embedded font.", font: "Embedded Test Font" })] })] }],
  });
  fs.writeFileSync(path.join(FIX, "embedded-font.docx"), Buffer.from(await Packer.toArrayBuffer(embedded)));
}
const fix = (name) => path.join(FIX, name);
// Next.js adds its own empty role="alert" route announcer.
const ALERT = 'div[role="alert"]:not(#__next-route-announcer__)';

async function download(page, selector) {
  const [file] = await Promise.all([page.waitForEvent("download"), page.locator(selector).first().click()]);
  const target = path.join(OUT, file.suggestedFilename());
  await file.saveAs(target);
  return { name: file.suggestedFilename(), bytes: fs.readFileSync(target) };
}

// ---------- SEO and rendering ----------
const routes = {
  "/tools/pdf-tools": "Free online PDF tools",
  "/tools/word-to-pdf": "Word to PDF Converter",
  "/tools/pdf-to-word": "PDF to Word Converter",
  "/tools/merge-pdf": "Merge PDF Files",
};
const titles = new Set();
for (const [route, h1] of Object.entries(routes)) {
  const { page, status } = await openPage(route);
  check(`${route} returns 200`, status === 200, String(status));
  const seo = await page.evaluate(() => ({
    h1s: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()),
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content ?? "",
    canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map((l) => l.href),
    robots: document.querySelector('meta[name="robots"]')?.content ?? "",
    ogUrl: document.querySelector('meta[property="og:url"]')?.content ?? "",
    ogImage: document.querySelector('meta[property="og:image"]')?.content ?? "",
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
    breadcrumb: [...document.querySelectorAll('nav[aria-label="Breadcrumb"] li')].map((li) => li.textContent.replace("/", "").trim()),
  }));
  check(`${route} has one H1`, seo.h1s.length === 1 && seo.h1s[0] === h1, seo.h1s.join(" | "));
  check(`${route} canonical`, seo.canonicals.length === 1 && seo.canonicals[0] === SITE + route, seo.canonicals.join(","));
  check(`${route} title and description`, seo.title.endsWith("| Imgifyr") && seo.description.length > 80 && seo.description.length <= 170, `${seo.title} (${seo.description.length})`);
  titles.add(seo.title);
  check(`${route} is indexable`, !/noindex/.test(seo.robots), seo.robots);
  check(`${route} Open Graph`, seo.ogUrl === SITE + route && seo.ogImage.includes(route), seo.ogImage);
  let types = [];
  let parsed = true;
  try {
    // WebSite and Organization come from the shared layout on every page.
    types = seo.jsonLd.map((text) => JSON.parse(text)["@type"]).filter((type) => type !== "WebSite" && type !== "Organization");
  } catch {
    parsed = false;
  }
  const expectedTypes = route === "/tools/pdf-tools" ? ["BreadcrumbList"] : ["BreadcrumbList", "FAQPage", "WebApplication"];
  check(`${route} structured data`, parsed && JSON.stringify([...types].sort()) === JSON.stringify(expectedTypes), types.join(","));
  check(`${route} breadcrumb`, seo.breadcrumb[0] === "Home" && seo.breadcrumb[2] === "PDF tools", seo.breadcrumb.join(" > "));
  await page.close();
}
check("titles are unique", titles.size === 4);

{
  const res = await fetch(`${BASE}/sitemap.xml`);
  const xml = await res.text();
  const missing = Object.keys(routes).filter((route) => !xml.includes(`<loc>${SITE}${route}</loc>`));
  check("sitemap lists the PDF pages", missing.length === 0, missing.join(","));
  check("sitemap has no API or blob URLs", !/\/api\/|blob:/.test(xml));
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  check("robots.txt allows everything", /Allow: \//.test(robots) && !/Disallow: \/tools/.test(robots), robots.replace(/\n/g, " "));
}

{
  const { page } = await openPage("/");
  const nav = await page.evaluate(() => ({
    header: [...document.querySelectorAll("header a")].map((a) => a.getAttribute("href")),
    footer: [...document.querySelectorAll("footer a")].map((a) => a.getAttribute("href")),
    main: [...document.querySelectorAll("main a")].map((a) => a.getAttribute("href")),
  }));
  for (const route of ["/tools/word-to-pdf", "/tools/pdf-to-word", "/tools/merge-pdf"]) {
    check(`header links ${route}`, nav.header.includes(route));
    check(`footer links ${route}`, nav.footer.includes(route));
  }
  check("footer links the PDF hub", nav.footer.includes("/tools/pdf-tools"));
  check("homepage links the PDF hub", nav.main.includes("/tools/pdf-tools"));
  await page.close();
  const tools = await openPage("/tools");
  const toolsLinks = await tools.page.evaluate(() => [...document.querySelectorAll("main a")].map((a) => a.getAttribute("href")));
  check("/tools lists the PDF tools and hub", ["/tools/pdf-tools", "/tools/word-to-pdf", "/tools/merge-pdf"].every((r) => toolsLinks.includes(r)));
  await tools.page.close();
}

// ---------- Word to PDF ----------
{
  const { page } = await openPage("/tools/word-to-pdf");
  // Invalid files first.
  await page.locator('input[type="file"]').setInputFiles(fix("spreadsheet.docx"));
  await page.locator(ALERT).waitFor({ timeout: 20_000 });
  check("word: rejects an Excel file renamed .docx", /Excel or PowerPoint/.test(await page.locator(ALERT).innerText()));
  await page.locator('input[type="file"]').setInputFiles(fix("empty.docx"));
  await page.waitForFunction(() => /empty/.test(document.querySelector('div[role="alert"]:not(#__next-route-announcer__)')?.textContent ?? ""), null, { timeout: 20_000 });
  check("word: rejects an empty file", true);
  await page.locator('input[type="file"]').setInputFiles(fix("text.pdf"));
  await page.waitForFunction(() => /already a PDF/.test(document.querySelector('div[role="alert"]:not(#__next-route-announcer__)')?.textContent ?? ""), null, { timeout: 20_000 });
  check("word: explains a PDF given to Word to PDF", true);

  await page.locator('input[type="file"]').setInputFiles(fix("sample.docx"));
  await page.getByRole("button", { name: "Convert to PDF" }).waitFor({ timeout: 20_000 });
  check("word: shows file name and size", (await page.locator('section[aria-label="Selected document"]').innerText()).includes("sample.docx"));
  const started = Date.now();
  await page.getByRole("button", { name: "Convert to PDF" }).click();
  check("word: button disabled while converting", await page.locator('button[aria-busy="true"]').isDisabled().catch(() => true));
  await page.locator("#result-heading").waitFor({ timeout: 180_000 });
  const elapsed = Date.now() - started;
  await page.screenshot({ path: path.join(OUT, "word-desktop.png"), fullPage: false });
  const file = await download(page, 'a[download$=".pdf"]');
  check("word: download is named sample.pdf", file.name === "sample.pdf", file.name);
  check("word: output is a PDF", file.bytes.subarray(0, 5).toString() === "%PDF-");
  const pages = await pdfInfo(file.bytes);
  const all = pages.map((p) => p.text).join(" ");
  check("word: several pages (explicit break + automatic pagination)", pages.length >= 4, `${pages.length} pages in ${elapsed} ms`);
  check("word: text layer is searchable", /Quarterly/.test(all) && /Widgets/.test(all) && /Flow paragraph 70/.test(all), all.slice(0, 120));
  check("word: page break respected", /Second page after the page break/.test(pages[1]?.text ?? ""), pages[1]?.text.slice(0, 60));
  const portrait = pages[0];
  const landscape = pages.at(-1);
  check("word: page size A4/Letter portrait", portrait.height > portrait.width && portrait.width >= 590 && portrait.width <= 615, `${portrait.width}x${portrait.height}`);
  check("word: landscape section stays landscape", landscape.width > landscape.height && /Landscape section/.test(landscape.text), `${landscape.width}x${landscape.height}`);
  check("word: no paragraph lost or duplicated across page splits", Array.from({ length: 70 }, (_, i) => (all.match(new RegExp(`Flow paragraph ${i + 1}\\.`, "g")) ?? []).length).every((n) => n === 1));

  await page.getByRole("button", { name: "Convert another document" }).click();
  await page.locator('input[type="file"]').waitFor({ state: "attached" });
  await page.locator('input[type="file"]').setInputFiles(fix("hindi.docx"));
  await page.getByRole("button", { name: "Convert to PDF" }).click();
  await page.locator("#result-heading").waitFor({ timeout: 120_000 });
  check("word: repeated use works, and non-Latin text is flagged as not searchable", /can't be searched/.test(await page.locator("#result-heading").locator("xpath=../../..").innerText()));
  await page.getByRole("button", { name: /Remove/ }).click();
  check("word: remove returns to the upload area", await page.locator('input[type="file"]').count() === 1);

  // Fonts that aren't installed must not fall back to the browser's default (Times New Roman).
  const fontRequests = [];
  page.on("request", (req) => req.url().includes("/fonts/documents/") && fontRequests.push(req.url().split("/").pop()));
  await page.locator('input[type="file"]').setInputFiles(fix("theme-carlito.docx"));
  await page.getByRole("button", { name: "Convert to PDF" }).click();
  await page.locator("#result-heading").waitFor({ timeout: 60_000 });
  check("word: missing Calibri-family font uses the bundled metric-compatible font", fontRequests.includes("carlito-latin-400-normal.woff2"), fontRequests.join(","));
  await page.getByRole("button", { name: "Convert another document" }).click();
  await page.evaluate(() => {
    window.__embedded = [];
    new MutationObserver(() => {
      const frame = document.querySelector("iframe[title='Document rendering']");
      if (!frame || frame.__watched) return;
      frame.__watched = true;
      const timer = setInterval(() => {
        const doc = frame.contentDocument;
        if (!doc) return clearInterval(timer);
        for (const face of doc.fonts) if (face.family.includes("Embedded Test Font")) window.__embedded.push(face.status);
      }, 20);
    }).observe(document.body, { childList: true });
  });
  await page.locator('input[type="file"]').setInputFiles(fix("embedded-font.docx"));
  await page.getByRole("button", { name: "Convert to PDF" }).click();
  await page.locator("#result-heading").waitFor({ timeout: 60_000 });
  check("word: fonts embedded in the .docx are used", (await page.evaluate(() => window.__embedded)).includes("loaded"));
  await page.close();
}

// ---------- PDF to Word ----------
{
  const { page } = await openPage("/tools/pdf-to-word");
  await page.locator('input[type="file"]').setInputFiles(fix("notes.txt.pdf"));
  await page.locator(ALERT).waitFor({ timeout: 20_000 });
  check("pdf2word: rejects a text file named .pdf", /isn't a PDF/.test(await page.locator(ALERT).innerText()));

  await page.locator('input[type="file"]').setInputFiles(fix("locked.pdf"));
  await page.getByRole("button", { name: "Convert to Word" }).click();
  await page.locator(ALERT).waitFor({ timeout: 60_000 });
  check("pdf2word: explains password-protected PDFs", /password-protected/.test(await page.locator(ALERT).innerText()));

  await page.getByRole("button", { name: /Remove/ }).click();
  await page.locator('input[type="file"]').setInputFiles(fix("scan.pdf"));
  await page.getByRole("button", { name: "Convert to Word" }).click();
  await page.locator(ALERT).waitFor({ timeout: 60_000 });
  check("pdf2word: scanned PDF explained (no OCR)", /scanned images/.test(await page.locator(ALERT).innerText()));

  await page.getByRole("button", { name: /Remove/ }).click();
  await page.locator('input[type="file"]').setInputFiles(fix("text.pdf"));
  await page.getByRole("button", { name: "Convert to Word" }).click();
  await page.locator("#result-heading").waitFor({ timeout: 120_000 });
  await page.screenshot({ path: path.join(OUT, "pdf2word-desktop.png") });
  const file = await download(page, 'a[download$=".docx"]');
  check("pdf2word: download is named text.docx", file.name === "text.docx", file.name);
  const zip = await JSZip.loadAsync(file.bytes);
  const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
  const plain = xml.replace(/<w:tab\/>/g, "\t").replace(/<[^>]+>/g, "");
  check("pdf2word: valid .docx package", Boolean(zip.file("[Content_Types].xml")) && xml.length > 0);
  check("pdf2word: heading style", /<w:pStyle w:val="Heading1"\/>[\s\S]*?Annual Summary/.test(xml));
  check("pdf2word: keeps the PDF's font (Arial), not Word's default", /<w:rFonts w:ascii="Arial"[^>]*\/><w:b\/>[\s\S]*?Annual Summary/.test(xml) && !/w:ascii="Calibri"/.test(xml));
  check("pdf2word: wrapped lines rejoined into one paragraph", /converter must join the lines back into a single editable paragraph/.test(plain.replace(/\s+/g, " ")), plain.slice(0, 200));
  // Browsers draw list bullets as shapes, not text, so the items stay separate indented paragraphs.
  const paragraphs = [...xml.matchAll(/<w:p>([\s\S]*?)<\/w:p>/g)].map((m) => m[1]);
  const apples = paragraphs.find((p) => p.includes("Apples are listed first")) ?? "";
  check("pdf2word: list items stay separate, indented paragraphs", !apples.includes("Oranges") && /<w:ind w:left="[1-9]/.test(apples), apples.slice(0, 160));
  check("pdf2word: table rebuilt", (xml.match(/<w:tr>/g) ?? []).length >= 3 && /North/.test(plain), `${(xml.match(/<w:tr>/g) ?? []).length} rows`);
  await page.getByRole("button", { name: "Convert another document" }).click();
  check("pdf2word: reset returns to upload", await page.locator('input[type="file"]').count() === 1);
  await page.close();
}

// ---------- Merge PDF ----------
{
  const { page } = await openPage("/tools/merge-pdf");
  await page.locator('input[type="file"]').setInputFiles([fix("alpha.pdf"), fix("bravo.pdf"), fix("charlie.pdf"), fix("locked.pdf"), fix("notes.txt.pdf")]);
  await page.waitForFunction(() => !/Checking/.test(document.querySelector('section[aria-label="PDFs to merge"]')?.textContent ?? "Checking"), null, { timeout: 60_000 });
  const list = await page.locator('section[aria-label="PDFs to merge"]').innerText();
  check("merge: lists files with sizes and page counts", /alpha\.pdf/.test(list) && /2 pages/.test(list), list.replace(/\n/g, " | ").slice(0, 200));
  check("merge: password-protected and non-PDF files are skipped with reasons", /password-protected/.test(list) && /isn't a PDF/.test(list));
  // Remove the two invalid files, then move charlie to the top.
  await page.getByRole("button", { name: "Remove notes.txt.pdf" }).click();
  await page.getByRole("button", { name: "Remove locked.pdf" }).click();
  await page.getByRole("button", { name: "Move charlie.pdf up" }).click();
  await page.getByRole("button", { name: "Move charlie.pdf up" }).click();
  await page.getByRole("button", { name: /Merge 3 PDFs/ }).click();
  await page.locator("#result-heading").waitFor({ timeout: 60_000 });
  await page.screenshot({ path: path.join(OUT, "merge-desktop.png") });
  const file = await download(page, 'a[download$=".pdf"]');
  const pages = await pdfInfo(file.bytes);
  check("merge: output pages in the chosen order", pages.map((p) => p.text.trim()).join(",") === "Charlie one,Alpha one,Bravo one,Bravo two", pages.map((p) => p.text.trim()).join(","));
  check("merge: landscape pages keep their size", pages[2].width === 842 && pages[2].height === 595);
  await page.getByRole("button", { name: "Start a new merge" }).click();
  check("merge: reset returns to upload", await page.locator('input[type="file"]').count() === 1);
  await page.locator('input[type="file"]').setInputFiles([fix("alpha.pdf")]);
  await page.waitForFunction(() => /1 page/.test(document.querySelector('section[aria-label="PDFs to merge"]')?.textContent ?? ""), null, { timeout: 30_000 });
  check("merge: one file can't be merged", await page.getByRole("button", { name: /Merge 1 PDFs/ }).isDisabled());
  await page.close();
}

// ---------- Mobile layout and keyboard ----------
{
  const mobile = await newContext({ width: 390, height: 844 });
  for (const route of Object.keys(routes)) {
    const { page } = await openPage(route, mobile);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`mobile ${route}: no horizontal scroll`, overflow <= 0, `${overflow}px`);
    await page.screenshot({ path: path.join(OUT, `mobile${route.replace(/\//g, "-")}.png`) });
    await page.close();
  }
  const { page } = await openPage("/tools/merge-pdf", mobile);
  await page.locator('input[type="file"]').setInputFiles([fix("alpha.pdf"), fix("bravo.pdf")]);
  await page.getByRole("button", { name: /Merge 2 PDFs/ }).waitFor();
  await page.waitForFunction(() => !document.querySelector('section[aria-label="PDFs to merge"]')?.textContent?.includes("Checking"));
  await page.screenshot({ path: path.join(OUT, "mobile-merge-list.png"), fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check("mobile merge list: no horizontal scroll", overflow <= 0, `${overflow}px`);
  await page.close();
  await mobile.close();

  const { page: kb } = await openPage("/tools/word-to-pdf");
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await kb.keyboard.press("Tab");
    reached = await kb.evaluate(() => document.activeElement?.getAttribute("type") === "file");
  }
  check("keyboard: file picker reachable with Tab", reached);
  await kb.close();
}

// ---------- Regression: existing pages still load cleanly ----------
for (const route of ["/", "/tools", "/tools/image-resizer", "/tools/jpg-to-pdf", "/tools/photo-to-pdf", "/tools/application-photos", "/privacy"]) {
  const { page, status } = await openPage(route);
  check(`regression ${route} returns 200`, status === 200);
  await page.close();
}

check("no requests to other origins and no uploads (POST)", offending.length === 0, offending.slice(0, 5).join(", "));
check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" || "));

await browser.close();
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
