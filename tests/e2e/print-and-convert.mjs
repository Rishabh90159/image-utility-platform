// End-to-end tests for passport print sheets and Image to JPG in a real browser (Edge by default).
// Usage: start the production server (npm run build && npx next start -p 3100), then
//   node tests/e2e/print-and-convert.mjs
import fs from "node:fs";
import path from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { chromium } from "playwright-core";
import { generateFixtures } from "./fixtures.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CHANNEL = process.env.BROWSER_CHANNEL || "msedge";
const FIX = "tests/fixtures/generated";
const OUT = "tests/e2e/output/print-and-convert";
const KB = 1024;
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
await generateFixtures(browser, FIX);
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
async function download(page, locator) {
  const [file] = await Promise.all([page.waitForEvent("download"), locator.click()]);
  const target = path.join(OUT, file.suggestedFilename());
  await file.saveAs(target);
  return { name: file.suggestedFilename(), bytes: fs.readFileSync(target) };
}
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
async function pdfPageSizes(bytes) {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
  const sizes = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const [, , w, h] = (await pdf.getPage(n)).view;
    sizes.push(`${Math.round(w)}×${Math.round(h)}`);
  }
  return sizes;
}
const sheet = (page) => page.locator('section[aria-labelledby="print-sheet-heading"]');

// ---------- Extra fixtures for Image to JPG ----------
{
  // 24-bit BMP, 64 × 48, a colour gradient (bottom-up rows, 4-byte aligned).
  const w = 64;
  const h = 48;
  const row = Math.ceil((w * 3) / 4) * 4;
  const buf = Buffer.alloc(54 + row * h);
  buf.write("BM", 0, "latin1");
  buf.writeUInt32LE(buf.length, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(w, 18);
  buf.writeInt32LE(h, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(row * h, 34);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) buf.set([x * 4, y * 5, 200], 54 + y * row + x * 3);
  fs.writeFileSync(path.join(FIX, "gradient.bmp"), buf);
}
{
  // A large, noisy PNG with a transparent corner, so it can't be tiny without a size limit.
  const page = await browser.newPage();
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(1600, 1200);
    let x = 12345;
    for (let p = 0; p < img.data.length; p += 4) {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      img.data[p] = x & 255;
      img.data[p + 1] = (x >> 8) & 255;
      img.data[p + 2] = (x >> 16) & 255;
      img.data[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ctx.clearRect(0, 0, 200, 200);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.close();
  fs.writeFileSync(path.join(FIX, "noisy-transparent.png"), Buffer.from(base64, "base64"));
}

// ---------- Print sheet: passport photo resizer (custom 35 × 45 mm) ----------
{
  const page = await openPage("/tools/passport-photo-resizer");
  await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "portrait.jpg"));
  await page.locator('[aria-label^="Photo crop area"]').waitFor();
  await page.getByLabel("Photo requirement").selectOption("custom");
  await page.getByRole("button", { name: /Create photo/ }).click();
  await sheet(page).waitFor({ timeout: 60_000 });
  await sheet(page).getByText(/^8 photos of 35 × 45 mm on 4 × 6 in photo paper/).waitFor({ timeout: 30_000 });
  check("sheet: 8 photos of 35 × 45 mm on 4 × 6 in", true);
  await sheet(page).getByRole("link", { name: "Download sheet (JPG)" }).waitFor({ timeout: 30_000 });
  const jpg = await download(page, sheet(page).getByRole("link", { name: "Download sheet (JPG)" }));
  const info = jpegInfo(jpg.bytes);
  check("sheet: 4 × 6 JPG is 1800 × 1200 px at 300 DPI (landscape)", info && info.width === 1800 && info.height === 1200 && info.dpi === 300, info && `${info.width}×${info.height} @ ${info.dpi}`);
  const pdf = await download(page, sheet(page).getByRole("link", { name: "Download sheet (PDF)" }));
  check("sheet: 4 × 6 PDF is one 6 × 4 in page", (await pdfPageSizes(pdf.bytes)).join() === "432×288", (await pdfPageSizes(pdf.bytes)).join());
  check("sheet: file names say how many photos", /-8-photos-4x6\.jpg$/.test(jpg.name) && /-8-photos-4x6\.pdf$/.test(pdf.name), `${jpg.name}, ${pdf.name}`);
  await page.screenshot({ path: path.join(OUT, "sheet-4x6.png"), fullPage: false });

  await sheet(page).getByText("A4 paper", { exact: true }).click();
  await sheet(page).getByText(/^30 photos of 35 × 45 mm on A4 paper/).waitFor({ timeout: 30_000 });
  await sheet(page).getByRole("img").waitFor();
  const a4 = await download(page, sheet(page).getByRole("link", { name: "Download sheet (PDF)" }));
  check("sheet: A4 holds 30 and the PDF is an A4 page", (await pdfPageSizes(a4.bytes)).join() === "595×842" && /-30-photos-a4\.pdf$/.test(a4.name), `${(await pdfPageSizes(a4.bytes)).join()} ${a4.name}`);

  await page.getByLabel("Photo requirement").selectOption("uk-passport-digital");
  await page.getByRole("button", { name: /Create photo/ }).click();
  await page.waitForFunction(() => /600 × 750/.test(document.querySelector('section[aria-labelledby="result-heading"]')?.textContent ?? ""), null, { timeout: 60_000 });
  check("sheet: not offered for a digital (pixel-only) photo", (await sheet(page).count()) === 0);
  await page.close();
}

// ---------- Print sheet: passport photo page (India preset) and an exam page ----------
{
  const page = await openPage("/tools/passport-photo");
  await page.getByLabel("Country").selectOption("India");
  await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "portrait.jpg"));
  await page.getByRole("button", { name: "Create photo file" }).click();
  await sheet(page).getByText(/^8 photos of 35 × 45 mm/).waitFor({ timeout: 60_000 });
  check("passport page: India printed photo offers an 8-photo 4 × 6 sheet", true);
  await page.close();

  const exam = await openPage("/tools/ibps-photo");
  await exam.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "portrait.jpg"));
  await exam.getByRole("button", { name: /^Create photo file$/ }).click();
  await exam.locator('section[aria-labelledby="result-heading"]').waitFor({ timeout: 60_000 });
  check("exam page: no print sheet for an upload photo", (await sheet(exam).count()) === 0);
  await exam.close();
}

// ---------- Image to JPG ----------
{
  const page = await openPage("/tools/image-to-jpg");
  const result = page.locator('section[aria-labelledby="result-heading"]');
  const dl = () => download(page, result.getByRole("link", { name: /^Download JPG/ }));

  await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "gradient.bmp"));
  await result.waitFor({ timeout: 60_000 });
  let out = await dl();
  let info = jpegInfo(out.bytes);
  check("image2jpg: BMP converts to a 64 × 48 JPG", info && info.width === 64 && info.height === 48, out.name);

  await page.getByRole("button", { name: /Remove|Start over|Choose another/ }).first().click().catch(() => undefined);
  await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "noisy-transparent.png"));
  await page.getByText("noisy-transparent.png", { exact: true }).waitFor({ timeout: 30_000 });
  await result.getByText("5.28 MB").first().waitFor({ timeout: 60_000 });
  check("image2jpg: transparent PNG asks for a background colour", await page.getByText("This image has transparent areas").isVisible());
  out = await dl();
  const unlimited = out.bytes.length;
  await page.getByText("50 KB", { exact: true }).click();
  await page.getByRole("button", { name: /^Convert to JPG/ }).click();
  await result.getByText(/KB/).first().waitFor({ timeout: 120_000 });
  out = await dl();
  check("image2jpg: 50 KB limit met", out.bytes.length <= 50 * KB && unlimited > 50 * KB, `${(out.bytes.length / KB).toFixed(1)} KB (no limit: ${(unlimited / KB).toFixed(0)} KB)`);
  check("image2jpg: quality slider hidden while a size limit is set", (await page.getByText(/JPG quality/).count()) === 0);
  await page.screenshot({ path: path.join(OUT, "image-to-jpg.png"), fullPage: false });

  await page.getByRole("button", { name: /Remove|Start over|Choose another/ }).first().click().catch(() => undefined);
  await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "photo.jpeg"));
  await page.getByRole("link", { name: /Already a JPG\? Make it smaller/ }).waitFor({ timeout: 20_000 });
  check("image2jpg: a JPG is pointed to Resize Image to KB", true);
  await page.close();
}

// ---------- Existing converters keep their behaviour ----------
{
  const page = await openPage("/tools/png-to-jpg");
  await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "noisy-transparent.png"));
  await page.locator('section[aria-labelledby="result-heading"]').waitFor({ timeout: 60_000 });
  check("png2jpg: no size-limit option on the plain converter", (await page.getByText("Maximum file size").count()) === 0 && (await page.getByText(/JPG quality/).count()) >= 1);
  await page.close();
  const other = await openPage("/tools/image-resizer");
  await other.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "gradient.bmp"));
  await other.getByText(/this file is a BMP/).waitFor({ timeout: 20_000 });
  check("resizer: BMP still refused with a clear message", true);
  await other.close();
}

// ---------- Mobile ----------
{
  const mobile = await newContext({ width: 375, height: 812 });
  const page = await openPage("/tools/passport-photo-resizer", mobile);
  await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "portrait.jpg"));
  await page.locator('[aria-label^="Photo crop area"]').waitFor();
  await page.getByLabel("Photo requirement").selectOption("custom");
  await page.getByRole("button", { name: /Create photo/ }).click();
  await sheet(page).getByRole("link", { name: "Download sheet (PDF)" }).waitFor({ timeout: 60_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check("mobile: print sheet causes no horizontal scroll", overflow <= 0, `${overflow}px`);
  await sheet(page).screenshot({ path: path.join(OUT, "sheet-mobile.png") });
  const p2 = await openPage("/tools/image-to-jpg", mobile);
  const o2 = await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check("mobile: /tools/image-to-jpg has no horizontal scroll", o2 <= 0, `${o2}px`);
  await mobile.close();
}

check("no requests to other origins and no uploads (POST)", offending.length === 0, offending.slice(0, 5).join(", "));
check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" || "));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
