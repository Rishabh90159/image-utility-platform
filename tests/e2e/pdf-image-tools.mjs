// End-to-end tests for Compress PDF and PDF to JPG in a real browser (Edge by default).
// Usage: start the production server (npm run build && npx next start -p 3100), then
//   node tests/e2e/pdf-image-tools.mjs
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, PageSizes } from "@cantoo/pdf-lib";
import JSZip from "jszip";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CHANNEL = process.env.BROWSER_CHANNEL || "msedge";
const FIX = "tests/fixtures/generated/pdf-image-tools";
const OUT = "tests/e2e/output/pdf-image-tools";
const KB = 1024;
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
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  return page;
}

const fix = (name) => path.join(FIX, name);
const ALERT = 'div[role="alert"]:not(#__next-route-announcer__)';

async function download(page, selector) {
  const [file] = await Promise.all([page.waitForEvent("download"), page.locator(selector).first().click()]);
  const target = path.join(OUT, file.suggestedFilename());
  await file.saveAs(target);
  return { name: file.suggestedFilename(), bytes: fs.readFileSync(target) };
}

async function pdfPages(bytes) {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const [, , w, h] = page.view;
    const text = (await page.getTextContent()).items.map((item) => item.str ?? "").join(" ").trim();
    pages.push({ width: Math.round(w), height: Math.round(h), text });
  }
  return pages;
}

/** Width, height and JFIF DPI of a JPEG, read from its markers. */
function jpegInfo(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let dpi = null;
  let i = 2;
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marker === 0xe0 && bytes.toString("latin1", i + 4, i + 9) === "JFIF\0" && bytes[i + 11] === 1) dpi = (bytes[i + 12] << 8) | bytes[i + 13];
    if (marker >= 0xc0 && marker <= 0xc3) return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8], dpi };
    i += 2 + length;
  }
  return null;
}

// ---------- Fixtures ----------
// A text PDF as a browser prints it: small, with selectable text.
{
  const page = await browser.newPage();
  await page.setContent(`<html><body style="font-family: Arial; font-size: 11pt; margin: 0">
    <h1>Certificate of Completion</h1><p>This document has real, selectable text and is far smaller than 200 KB.</p></body></html>`);
  fs.writeFileSync(fix("text.pdf"), await page.pdf({ format: "A4", margin: { top: "2cm", bottom: "2cm", left: "2cm", right: "2cm" } }));
  await page.close();
}
// A "scanned" PDF: three large photo-like JPEG pages (A4 portrait, A4 landscape, US Letter), several MB.
{
  const page = await browser.newPage();
  const scans = await page.evaluate(async () => {
    const make = (w, h, seed) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#f4efe6");
      g.addColorStop(1, "#d9cfc0");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#1f2937";
      ctx.font = `${Math.round(w / 30)}px serif`;
      for (let line = 0; line < 30; line++) ctx.fillText(`Scanned line ${line + 1} of page ${seed}: marks, names and dates`, w * 0.08, h * 0.08 + line * (h / 34));
      const image = ctx.getImageData(0, 0, w, h);
      let x = seed * 7919;
      for (let p = 0; p < image.data.length; p += 4) {
        x = (x * 1103515245 + 12345) & 0x7fffffff;
        const n = (x % 41) - 20;
        image.data[p] += n;
        image.data[p + 1] += n;
        image.data[p + 2] += n;
      }
      ctx.putImageData(image, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
    };
    return [make(2480, 3508, 1), make(3508, 2480, 2), make(2550, 3300, 3)];
  });
  await page.close();
  const doc = await PDFDocument.create();
  const sizes = [PageSizes.A4, [PageSizes.A4[1], PageSizes.A4[0]], PageSizes.Letter];
  for (const [index, base64] of scans.entries()) {
    const image = await doc.embedJpg(Buffer.from(base64, "base64"));
    const [w, h] = sizes[index];
    doc.addPage([w, h]).drawImage(image, { x: 0, y: 0, width: w, height: h });
  }
  fs.writeFileSync(fix("scan.pdf"), await doc.save());
}
{
  const doc = await PDFDocument.create();
  doc.addPage(PageSizes.A4);
  doc.encrypt({ userPassword: "secret", ownerPassword: "owner" });
  fs.writeFileSync(fix("locked.pdf"), await doc.save());
}
fs.writeFileSync(fix("notes.txt.pdf"), "This is plain text, not a PDF.");
const scanSize = fs.statSync(fix("scan.pdf")).size;
check("fixture: scanned PDF is several MB", scanSize > 2 * 1024 * KB, `${Math.round(scanSize / KB)} KB`);
const scanPages = await pdfPages(fs.readFileSync(fix("scan.pdf")));

// ---------- Compress PDF ----------
{
  const page = await openPage("/tools/compress-pdf");
  check("compress: page H1", (await page.locator("h1").innerText()).startsWith("Compress PDF"));

  await page.locator('input[type="file"]').setInputFiles(fix("notes.txt.pdf"));
  await page.locator(ALERT).waitFor({ timeout: 20_000 });
  check("compress: rejects a text file named .pdf", /isn't a PDF/.test(await page.locator(ALERT).innerText()));

  await page.locator('input[type="file"]').setInputFiles(fix("locked.pdf"));
  await page.getByRole("button", { name: /^Compress to/ }).click();
  await page.locator(ALERT).waitFor({ timeout: 60_000 });
  check("compress: explains password-protected PDFs", /password-protected/.test(await page.locator(ALERT).innerText()));
  await page.getByRole("button", { name: /Remove/ }).click();

  // Already under the target: returned unchanged.
  await page.locator('input[type="file"]').setInputFiles(fix("text.pdf"));
  await page.getByRole("button", { name: "Compress to 200 KB" }).click();
  await page.locator("#result-heading").waitFor({ timeout: 60_000 });
  const section = page.locator("section", { has: page.locator("#result-heading") });
  check("compress: small PDF reported as unchanged", /returned unchanged/.test(await section.innerText()));
  const unchanged = await download(page, 'a[download$=".pdf"]');
  check("compress: unchanged PDF is byte-identical", unchanged.bytes.equals(fs.readFileSync(fix("text.pdf"))), unchanged.name);
  await page.getByRole("button", { name: /Remove/ }).click();

  // Scanned PDF to 200 KB.
  await page.locator('input[type="file"]').setInputFiles(fix("scan.pdf"));
  const started = Date.now();
  await page.getByRole("button", { name: "Compress to 200 KB" }).click();
  await page.locator("#result-heading").waitFor({ timeout: 300_000 });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const text200 = await section.innerText();
  const out200 = await download(page, 'a[download$=".pdf"]');
  check("compress: 200 KB target met", out200.bytes.length <= 200 * KB, `${(out200.bytes.length / KB).toFixed(1)} KB from ${Math.round(scanSize / KB)} KB in ${seconds} s`);
  check("compress: file named scan-compressed.pdf", out200.name === "scan-compressed.pdf", out200.name);
  check("compress: explains pages became images", /saved as an image at about \d+ DPI/.test(text200));
  const pages200 = await pdfPages(out200.bytes);
  check("compress: same number of pages", pages200.length === scanPages.length, `${pages200.length}`);
  check(
    "compress: every page keeps its size and orientation",
    pages200.every((p, i) => Math.abs(p.width - scanPages[i].width) <= 1 && Math.abs(p.height - scanPages[i].height) <= 1),
    pages200.map((p) => `${p.width}×${p.height}`).join(", "),
  );
  await page.screenshot({ path: path.join(OUT, "compress-desktop.png"), fullPage: false });

  // Changing the target after a result offers a new run.
  await page.getByText("500 KB", { exact: true }).click();
  await page.getByRole("button", { name: "Compress to 500 KB" }).waitFor({ timeout: 5_000 });
  check("compress: changing the target clears the old result", (await page.locator("#result-heading").count()) === 0);
  await page.getByRole("button", { name: "Compress to 500 KB" }).click();
  await page.locator("#result-heading").waitFor({ timeout: 300_000 });
  const out500 = await download(page, 'a[download$=".pdf"]');
  check("compress: 500 KB target met, larger than the 200 KB result", out500.bytes.length <= 500 * KB && out500.bytes.length > out200.bytes.length, `${(out500.bytes.length / KB).toFixed(1)} KB`);

  // A target that can't be reached: honest message, smallest file still offered.
  await page.getByText("Custom", { exact: true }).click();
  await page.locator("#pdf-target-custom").fill("10");
  await page.getByRole("button", { name: "Compress to 10.0 KB" }).click();
  await page.locator("#result-heading").waitFor({ timeout: 300_000 });
  const textTiny = await section.innerText();
  check("compress: unreachable target explained", /couldn't be reached/.test(textTiny));
  const tiny = await download(page, 'a[download$=".pdf"]');
  check("compress: smallest version is still a valid, smaller PDF", (await pdfPages(tiny.bytes)).length === 3 && tiny.bytes.length < out200.bytes.length, `${(tiny.bytes.length / KB).toFixed(1)} KB`);
  await page.close();
}

// ---------- PDF to JPG ----------
{
  const page = await openPage("/tools/pdf-to-jpg");
  check("pdf2jpg: page H1", (await page.locator("h1").innerText()).startsWith("PDF to JPG"));

  await page.locator('input[type="file"]').setInputFiles(fix("text.pdf"));
  await page.getByRole("button", { name: "Convert to JPG" }).click();
  await page.locator("#result-heading").waitFor({ timeout: 120_000 });
  const single = await download(page, 'a[download$=".jpg"]');
  const info150 = jpegInfo(single.bytes);
  check("pdf2jpg: one page gives one JPG named text.jpg", single.name === "text.jpg" && info150 !== null, single.name);
  check("pdf2jpg: A4 at 150 DPI is about 1240 × 1754 px", info150 && Math.abs(info150.width - 1240) <= 2 && Math.abs(info150.height - 1754) <= 2, info150 && `${info150.width}×${info150.height}`);
  check("pdf2jpg: JPG records 150 DPI", info150?.dpi === 150, String(info150?.dpi));

  await page.getByText("300 DPI", { exact: true }).click();
  await page.getByRole("button", { name: "Convert to JPG" }).click();
  await page.locator("#result-heading").waitFor({ timeout: 120_000 });
  const info300 = jpegInfo((await download(page, 'a[download$=".jpg"]')).bytes);
  check("pdf2jpg: 300 DPI doubles the pixels", info300 && Math.abs(info300.width - 2480) <= 2 && info300.dpi === 300, info300 && `${info300.width}×${info300.height} @ ${info300.dpi}`);
  await page.getByRole("button", { name: /Remove/ }).click();

  await page.locator('input[type="file"]').setInputFiles(fix("scan.pdf"));
  await page.getByText("150 DPI", { exact: true }).click();
  await page.getByRole("button", { name: "Convert to JPG" }).click();
  await page.locator("#result-heading").waitFor({ timeout: 300_000 });
  const zipFile = await download(page, 'a[download$=".zip"]');
  const zip = await JSZip.loadAsync(zipFile.bytes);
  const names = Object.keys(zip.files).sort();
  check("pdf2jpg: several pages give a ZIP of numbered JPGs", zipFile.name === "scan-jpg.zip" && names.join(",") === "scan-page-01.jpg,scan-page-02.jpg,scan-page-03.jpg", `${zipFile.name}: ${names.join(", ")}`);
  const landscape = jpegInfo(Buffer.from(await zip.file("scan-page-02.jpg").async("uint8array")));
  check("pdf2jpg: landscape page stays landscape", landscape && landscape.width > landscape.height, landscape && `${landscape.width}×${landscape.height}`);

  await page.getByText("100 KB", { exact: true }).click();
  await page.getByRole("button", { name: "Convert to JPG" }).click();
  await page.locator("#result-heading").waitFor({ timeout: 300_000 });
  const limited = await JSZip.loadAsync((await download(page, 'a[download$=".zip"]')).bytes);
  const sizes = await Promise.all(Object.values(limited.files).map(async (entry) => (await entry.async("uint8array")).length));
  check("pdf2jpg: 100 KB limit met for every page", sizes.length === 3 && sizes.every((size) => size <= 100 * KB), sizes.map((s) => `${(s / KB).toFixed(1)} KB`).join(", "));
  await page.screenshot({ path: path.join(OUT, "pdf2jpg-desktop.png"), fullPage: false });
  await page.close();
}

// ---------- Mobile ----------
{
  const mobile = await newContext({ width: 375, height: 812 });
  for (const route of ["/tools/compress-pdf", "/tools/pdf-to-jpg"]) {
    const page = await openPage(route, mobile);
    let overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`mobile: ${route} has no horizontal scroll`, overflow <= 0, `${overflow}px`);
    await page.locator('input[type="file"]').setInputFiles(fix("text.pdf"));
    await page.getByRole("button", { name: /^(Compress to|Convert to JPG)/ }).waitFor();
    overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`mobile: ${route} with settings shown has no horizontal scroll`, overflow <= 0, `${overflow}px`);
    await page.screenshot({ path: path.join(OUT, `${route.split("/").pop()}-mobile.png`), fullPage: true });
    await page.close();
  }
  await mobile.close();
}

check("no requests to other origins and no uploads (POST)", offending.length === 0, offending.slice(0, 5).join(", "));
check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" || "));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
