// End-to-end tests for the left thumb impression and hand-written declaration on the IBPS and SBI pages.
// Usage: start the production server (npm run build && npx next start -p 3100), then
//   node tests/e2e/exam-documents.mjs
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CHANNEL = process.env.BROWSER_CHANNEL || "msedge";
const FIX = "tests/fixtures/generated/exam-documents";
const OUT = "tests/e2e/output/exam-documents";
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
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
context.on("request", (req) => {
  const url = req.url();
  if (/^https?:/.test(url) && (new URL(url).origin !== origin || req.method() !== "GET")) offending.push(`${req.method()} ${url}`);
});

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

// ---------- Fixtures: a phone photo of a thumb print and of a hand-written page ----------
{
  const page = await browser.newPage();
  const [thumb, declaration] = await page.evaluate(() => {
    const paper = (ctx, w, h) => {
      ctx.fillStyle = "#e9e6df";
      ctx.fillRect(0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      let x = 7;
      for (let p = 0; p < img.data.length; p += 4) {
        x = (x * 1103515245 + 12345) & 0x7fffffff;
        const n = (x % 15) - 7;
        img.data[p] += n;
        img.data[p + 1] += n;
        img.data[p + 2] += n;
      }
      ctx.putImageData(img, 0, 0);
    };
    const a = document.createElement("canvas");
    a.width = 900;
    a.height = 1100;
    let ctx = a.getContext("2d");
    paper(ctx, 900, 1100);
    ctx.strokeStyle = "#1e3a8a";
    for (let r = 8; r < 260; r += 9) {
      ctx.lineWidth = 3 + (r % 3);
      ctx.beginPath();
      ctx.ellipse(450, 560, r * 0.8, r, 0.1, 0, Math.PI * 2);
      ctx.stroke();
    }
    const b = document.createElement("canvas");
    b.width = 2000;
    b.height = 1400;
    ctx = b.getContext("2d");
    paper(ctx, 2000, 1400);
    ctx.fillStyle = "#111111";
    ctx.font = "italic 58px cursive";
    const words = "I, Asha Verma, hereby declare that all the information submitted by me in the application form is correct, true and valid. I will present the supporting documents as and when required.".split(" ");
    let line = "";
    let y = 200;
    for (const word of words) {
      if (ctx.measureText(line + word).width > 1700) {
        ctx.fillText(line, 150, y);
        line = "";
        y += 110;
      }
      line += `${word} `;
    }
    ctx.fillText(line, 150, y);
    return [a.toDataURL("image/jpeg", 0.92).split(",")[1], b.toDataURL("image/jpeg", 0.92).split(",")[1]];
  });
  await page.close();
  fs.writeFileSync(path.join(FIX, "thumb.jpg"), Buffer.from(thumb, "base64"));
  fs.writeFileSync(path.join(FIX, "declaration.jpg"), Buffer.from(declaration, "base64"));
}

async function make(page, kindLabel, file, buttonName) {
  await page.locator("#prepare").getByText(kindLabel, { exact: true }).click();
  await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, file));
  await page.getByRole("button", { name: buttonName }).click();
  const result = page.locator('section[aria-labelledby="result-heading"]');
  await result.waitFor({ timeout: 60_000 });
  // Below the minimum, the tool offers to enlarge the file; take it, as a user would.
  const grow = result.getByRole("button", { name: /Enlarge|Increase|Make it/i });
  if (await grow.count()) {
    await grow.first().click();
    await page.waitForTimeout(1500);
    await result.waitFor({ timeout: 60_000 });
  }
  const [download] = await Promise.all([page.waitForEvent("download"), result.getByRole("link", { name: /^Download JPG/ }).click()]);
  const target = path.join(OUT, download.suggestedFilename());
  await download.saveAs(target);
  const bytes = fs.readFileSync(target);
  return { bytes, info: jpegInfo(bytes), name: download.suggestedFilename(), text: await result.innerText() };
}

for (const route of ["/tools/ibps-photo", "/tools/sbi-photo"]) {
  const page = await context.newPage();
  page.on("pageerror", (e) => consoleErrors.push(`${route}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(`${route}: ${m.text()}`));
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  const app = route.includes("ibps") ? "IBPS" : "SBI";

  const summary = await page.locator("article").first().innerText();
  check(`${app}: requirement table lists thumb impression and declaration`, /Left thumb impression/.test(summary) && /Hand-written declaration/.test(summary) && /240 × 240/.test(summary) && /800 × 400/.test(summary));

  const thumb = await make(page, "Thumb impression", "thumb.jpg", "Create thumb impression file");
  check(`${app}: thumb impression is 240 × 240 px at 200 DPI`, thumb.info?.width === 240 && thumb.info?.height === 240 && thumb.info?.dpi === 200, thumb.info && `${thumb.info.width}×${thumb.info.height} @ ${thumb.info.dpi}`);
  check(`${app}: thumb impression is within 20–50 KB`, thumb.bytes.length >= 20 * KB && thumb.bytes.length <= 50 * KB, `${(thumb.bytes.length / KB).toFixed(1)} KB`);
  check(`${app}: thumb result explains what the size check can't judge`, /ridges are clear/.test(thumb.text) && !/pose, lighting/.test(thumb.text));
  check(`${app}: thumb file is named as a thumb impression`, /-thumb\.jpg$/.test(thumb.name), thumb.name);

  await page.getByRole("button", { name: /Reset|Remove|Start over/ }).first().click().catch(() => undefined);
  const decl = await make(page, "Declaration", "declaration.jpg", "Create declaration file");
  const exact = decl.info?.width === 800 && decl.info?.height === 400;
  const enlarged = decl.info && decl.info.width > 800 && decl.info.width === decl.info.height * 2 && /enlarged from the preferred 800 × 400 to reach the minimum file size/.test(decl.text);
  check(`${app}: declaration is 800 × 400 px (or enlarged 2:1 with an explanation, to reach 50 KB) at 200 DPI`, (exact || enlarged) && decl.info?.dpi === 200, decl.info && `${decl.info.width}×${decl.info.height} @ ${decl.info.dpi}${enlarged ? ", enlarged and explained" : ""}`);
  check(`${app}: declaration is within 50–100 KB`, decl.bytes.length >= 50 * KB && decl.bytes.length <= 100 * KB, `${(decl.bytes.length / KB).toFixed(1)} KB`);
  await page.screenshot({ path: path.join(OUT, `${app.toLowerCase()}-declaration.png`) });
  await page.close();
}

{
  const page = await context.newPage();
  await page.goto(BASE + "/tools/ssc-photo", { waitUntil: "networkidle" });
  check("SSC: no thumb or declaration option (not in its notifications)", (await page.locator("#prepare").getByText("Thumb impression", { exact: true }).count()) === 0);
  await page.close();
}

check("no requests to other origins and no uploads (POST)", offending.length === 0, offending.slice(0, 5).join(", "));
check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" || "));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
