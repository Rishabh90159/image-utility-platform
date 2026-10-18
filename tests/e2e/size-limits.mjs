// End-to-end tests for size limits: a KB range on Resize Image to KB, a maximum PDF size on JPG/Photo to PDF,
// and a size limit on Merge PDF. Real browser (Edge by default).
// Usage: start the production server (npm run build && npx next start -p 3100), then
//   node tests/e2e/size-limits.mjs   (run tests/e2e/pdf-image-tools.mjs once first: it creates scan.pdf)
import fs from "node:fs";
import path from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { chromium } from "playwright-core";
import { generateFixtures } from "./fixtures.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CHANNEL = process.env.BROWSER_CHANNEL || "msedge";
const FIX = "tests/fixtures/generated";
const PDF_FIX = "tests/fixtures/generated/pdf-image-tools";
const OUT = "tests/e2e/output/size-limits";
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
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
context.on("request", (req) => {
  const url = req.url();
  if (/^https?:/.test(url) && (new URL(url).origin !== origin || req.method() !== "GET")) offending.push(`${req.method()} ${url}`);
});
async function open(route) {
  const page = await context.newPage();
  page.on("pageerror", (e) => consoleErrors.push(`${route}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(`${route}: ${m.text()}`));
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  return page;
}
async function download(page, locator) {
  const [file] = await Promise.all([page.waitForEvent("download"), locator.click()]);
  const target = path.join(OUT, file.suggestedFilename());
  await file.saveAs(target);
  return fs.readFileSync(target);
}
async function pdfPages(bytes) {
  return (await pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise).numPages;
}
function jpegSize(bytes) {
  let i = 2;
  while (i < bytes.length) {
    const marker = bytes[i + 1];
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marker >= 0xc0 && marker <= 0xc3) return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
    i += 2 + length;
  }
  return null;
}

// ---------- Resize image to KB: a 20–50 KB range ----------
{
  const page = await open("/tools/resize-image-to-kb?target=50&min=20");
  await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "tiny.jpg"));
  await page.locator("#target-minimum").waitFor();
  check("range: ?min= fills the minimum field", (await page.locator("#target-minimum").inputValue()) === "20");
  check("range: help text states the range", /between 20\.0 KB and 50\.0 KB/.test(await page.locator("#target-minimum-help").innerText()));
  await page.getByRole("button", { name: /^Resize to/ }).click();
  const result = page.locator('section[aria-labelledby="result-heading"]');
  await result.waitFor({ timeout: 60_000 });
  const bytes = await download(page, result.getByRole("link", { name: /^Download JPG/ }));
  const text = await result.innerText();
  check("range: result is between 20 and 50 KB", bytes.length >= 20 * KB && bytes.length <= 50 * KB, `${(bytes.length / KB).toFixed(1)} KB`);
  check("range: padding explained when used", !/padding/.test(text) || /within your 20\.0 KB–50\.0 KB range/.test(text));
  const tiny = jpegSize(fs.readFileSync(path.join(FIX, "tiny.jpg")));
  const out = jpegSize(bytes);
  check("range: picture dimensions unchanged by padding", out && tiny && out.width === tiny.width && out.height === tiny.height, out && `${out.width}×${out.height}`);
  await page.locator("#target-minimum").fill("60");
  check("range: minimum above target refused", /smaller than the target/.test(await page.locator("#target-minimum-help").innerText()) && (await page.getByRole("button", { name: /^Resize to/ }).isDisabled()));
  await page.close();
}

// ---------- JPG to PDF under 200 KB ----------
{
  const page = await open("/tools/jpg-to-pdf");
  const jpgs = ["photo-12mp.jpg", "photo.jpeg", "portrait.jpg", "tall.jpg"].map((f) => path.join(FIX, f));
  const totalIn = jpgs.reduce((sum, f) => sum + fs.statSync(f).size, 0);
  await page.locator('input[type="file"]').first().setInputFiles(jpgs);
  await page.getByText("200 KB", { exact: true }).click();
  check("jpg2pdf: quality option hidden while a size limit is set", (await page.getByText("Smaller file", { exact: true }).count()) === 0);
  const create = page.getByRole("button", { name: /^Create PDF \(4 pages\)/ });
  await create.waitFor();
  await page.waitForFunction(() => !document.querySelector("button[disabled]")?.textContent?.startsWith("Create PDF"), null, { timeout: 30_000 }).catch(() => undefined);
  const started = Date.now();
  await create.click();
  const result = page.locator('section[aria-labelledby="result-heading"]');
  await result.waitFor({ timeout: 300_000 });
  const pdf = await download(page, result.getByRole("link", { name: "Download PDF" }));
  check("jpg2pdf: PDF is 200 KB or less", pdf.length <= 200 * KB, `${(pdf.length / KB).toFixed(1)} KB from ${(totalIn / KB).toFixed(0)} KB of JPGs in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  check("jpg2pdf: all 4 pages present", (await pdfPages(pdf)) === 4);
  check("jpg2pdf: result says it's within the limit", /within 200 KB/.test(await result.innerText()));
  await page.screenshot({ path: path.join(OUT, "jpg-to-pdf.png") });
  await page.close();
}

// ---------- Photo to PDF under 100 KB (mixed formats) ----------
{
  const page = await open("/tools/photo-to-pdf");
  await page.locator('input[type="file"]').first().setInputFiles(["photo.png", "photo.webp", "photo-12mp.jpg"].map((f) => path.join(FIX, f)));
  await page.getByText("100 KB", { exact: true }).click();
  const create = page.getByRole("button", { name: /^Create PDF \(3 pages\)/ });
  await create.waitFor();
  await create.click();
  const result = page.locator('section[aria-labelledby="result-heading"]');
  await result.waitFor({ timeout: 300_000 });
  const pdf = await download(page, result.getByRole("link", { name: "Download PDF" }));
  check("photo2pdf: mixed PNG/WebP/JPG PDF is 100 KB or less", pdf.length <= 100 * KB && (await pdfPages(pdf)) === 3, `${(pdf.length / KB).toFixed(1)} KB`);
  await page.close();
}

// ---------- Merge PDF under 500 KB ----------
{
  const scan = path.join(PDF_FIX, "scan.pdf");
  const text = path.join(PDF_FIX, "text.pdf");
  if (!fs.existsSync(scan) || !fs.existsSync(text)) {
    check("merge: fixtures from pdf-image-tools.mjs exist", false, "run tests/e2e/pdf-image-tools.mjs first");
  } else {
    const page = await open("/tools/merge-pdf");
    await page.locator('input[type="file"]').first().setInputFiles([scan, text]);
    await page.getByRole("button", { name: /Merge 2 PDFs/ }).waitFor({ timeout: 60_000 });
    await page.getByText("500 KB", { exact: true }).click();
    await page.getByRole("button", { name: /Merge 2 PDFs/ }).click();
    const result = page.locator('section[aria-labelledby="result-heading"]');
    await result.waitFor({ timeout: 300_000 });
    const pdf = await download(page, result.getByRole("link", { name: "Download PDF" }));
    const merged = fs.statSync(scan).size + fs.statSync(text).size;
    check("merge: merged PDF is 500 KB or less", pdf.length <= 500 * KB, `${(pdf.length / KB).toFixed(1)} KB from ${(merged / KB).toFixed(0)} KB`);
    check("merge: all 4 pages kept", (await pdfPages(pdf)) === 4);
    check("merge: explains pages became images", /saved as images/.test(await result.innerText()));

    await page.getByText("No limit", { exact: true }).click();
    await page.getByRole("button", { name: /Merge 2 PDFs|Merge again/ }).click();
    await result.waitFor({ timeout: 120_000 });
    const plain = await download(page, result.getByRole("link", { name: "Download PDF" }));
    check("merge: without a limit, nothing is compressed", plain.length > 2 * 1024 * KB && !/saved as images/.test(await result.innerText()), `${(plain.length / KB).toFixed(0)} KB`);
    await page.close();
  }
}

check("no requests to other origins and no uploads (POST)", offending.length === 0, offending.slice(0, 5).join(", "));
check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" || "));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
