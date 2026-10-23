// End-to-end tests for the RRB NTPC and UPSSSC OTR pages in a real browser (Edge by default).
// Usage: start the production server (npm run build && npx next start -p 3100), then
//   node tests/e2e/rrb-upsssc.mjs
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { generateFixtures } from "./fixtures.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CHANNEL = process.env.BROWSER_CHANNEL || "msedge";
const FIX = "tests/fixtures/generated";
const OUT = "tests/e2e/output/rrb-upsssc";
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

async function open(route) {
  const page = await context.newPage();
  page.on("pageerror", (e) => consoleErrors.push(`${route}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(`${route}: ${m.text()}`));
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  return page;
}

/** Makes a file; accepts the offer to enlarge when it comes out under the minimum, as a user would. */
async function make(page, file, button, kindLabel) {
  if (kindLabel) await page.locator("#prepare").getByText(kindLabel, { exact: true }).click();
  await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, file));
  await page.getByRole("button", { name: button }).click();
  const result = page.locator('section[aria-labelledby="result-heading"]');
  await result.waitFor({ timeout: 60_000 });
  const grow = result.getByRole("button", { name: /Enlarge|Increase|Make it/i });
  if (await grow.count()) {
    await grow.first().click();
    await page.waitForFunction(() => /enlarged from the/.test(document.querySelector('section[aria-labelledby="result-heading"]')?.textContent ?? ""), null, { timeout: 60_000 });
  }
  const [download] = await Promise.all([page.waitForEvent("download"), result.getByRole("link", { name: /^Download JPG/ }).click()]);
  const target = path.join(OUT, download.suggestedFilename());
  await download.saveAs(target);
  const bytes = fs.readFileSync(target);
  return { bytes, size: jpegSize(bytes), text: await result.innerText() };
}

// ---------- RRB ----------
{
  const page = await open("/tools/rrb-photo");
  // The notification list and rules sit in a collapsed <details>, so read textContent.
  const summary = await page.locator('section[aria-labelledby="requirements-heading"]').evaluate((el) => el.textContent ?? "");
  check("RRB: says the photo is captured live, not uploaded", /captured live/i.test(summary));
  check("RRB: both CEN 06/2026 and 07/2026 listed with official links", (await page.locator('a[href^="https://rrb.indianrailways.gov.in/"]').count()) >= 2 && /06\/2026/.test(summary) && /07\/2026/.test(summary));
  check("RRB: signature minimum and KB range shown", /at least 140 × 60/.test(summary) && /30 KB – 49 KB/.test(summary), summary.match(/at least 140 × 60[^\n]*/)?.[0]);
  check("RRB: no photo option in the tool (signature only)", (await page.locator("#prepare").getByText("Photograph", { exact: true }).count()) === 0);
  const sig = await make(page, "signature.jpg", "Create signature file");
  check("RRB: signature is at least 140 × 60 px", sig.size && sig.size.width >= 140 && sig.size.height >= 60, sig.size && `${sig.size.width}×${sig.size.height}`);
  check("RRB: signature is 30–49 KB", sig.bytes.length >= 30 * KB && sig.bytes.length <= 49 * KB, `${(sig.bytes.length / KB).toFixed(1)} KB`);
  check("RRB: enlargement (if any) is explained as from the minimum", !/enlarged/.test(sig.text) || /enlarged from the minimum 140 × 60/.test(sig.text));
  await page.screenshot({ path: path.join(OUT, "rrb.png") });
  await page.close();
}

// ---------- UPSSSC ----------
{
  const page = await open("/tools/upsssc-photo");
  const summary = await page.locator('section[aria-labelledby="requirements-heading"]').innerText();
  check("UPSSSC: OTR notice linked on upsssc.gov.in", (await page.locator('a[href^="https://upsssc.gov.in/"]').count()) >= 1);
  check("UPSSSC: photo 50–100 KB and signature 30–50 KB shown", /50 KB – 100 KB/.test(summary) && /30 KB – 50 KB/.test(summary));
  // The rules sit in a collapsed <details>, so read textContent rather than the visible text.
  const rules = await page.locator('section[aria-labelledby="requirements-heading"]').evaluate((el) => el.textContent ?? "");
  check("UPSSSC: Hindi-name rule shown with the signature", /write your name in Hindi/.test(rules) && /CAPITAL LETTERS are invalid/.test(rules));
  const photo = await make(page, "portrait.jpg", "Create photo file", "Photograph");
  check("UPSSSC: photo is 50–100 KB", photo.bytes.length >= 50 * KB && photo.bytes.length <= 100 * KB, `${(photo.bytes.length / KB).toFixed(1)} KB`);
  check("UPSSSC: checklist says no pixel size is specified", /no pixel size is specified/.test(photo.text));
  await page.getByRole("button", { name: /Reset|Remove|Start over/ }).first().click().catch(() => undefined);
  const sig = await make(page, "signature.jpg", "Create signature file", "Signature");
  const sigOk = sig.bytes.length >= 30 * KB && sig.bytes.length <= 50 * KB;
  check("UPSSSC: signature is 30–50 KB, or the shortfall is reported honestly", sigOk || /smaller than|below|under the minimum|at least 30/i.test(sig.text), `${(sig.bytes.length / KB).toFixed(1)} KB`);
  await page.screenshot({ path: path.join(OUT, "upsssc.png") });
  await page.close();
}

// ---------- DSSSB ----------
{
  const page = await open("/tools/dsssb-photo");
  const summary = await page.locator('section[aria-labelledby="requirements-heading"]').evaluate((el) => el.textContent ?? "");
  check("DSSSB: both 2026 advertisements linked on dsssb.delhi.gov.in", (await page.locator('a[href^="https://dsssb.delhi.gov.in/"]').count()) >= 2 && summary.includes("04/2026") && summary.includes("05/2026"));
  check("DSSSB: photo rules shown, no invented KB size", /white or off-white/.test(summary) && /doesn't state a file size/.test(summary));
  check("DSSSB: ID proof spec with per-document minimums", /15 KB and 60 KB/.test(summary) && /450 × 350/.test(summary));
  const table = await page.locator("table", { hasText: "Minimum resolution" }).innerText();
  check("DSSSB: ID proof table lists all four documents", ["PAN card", "Driving licence", "Voter ID card", "Passport"].every((d) => table.includes(d)));
  await page.locator('input[type="file"]').first().setInputFiles(path.join(FIX, "portrait.jpg"));
  await page.getByRole("button", { name: "Create photo file" }).click();
  const result = page.locator('section[aria-labelledby="result-heading"]');
  await result.waitFor({ timeout: 60_000 });
  check("DSSSB: photo file made, checklist says no pixel size is specified", /no pixel size is specified/.test(await result.innerText()));
  await page.close();
}

// ---------- Hub ----------
{
  const page = await open("/tools/application-photos");
  const table = await page.locator("table").first().innerText();
  check("hub: comparison lists RRB, UPSSSC and DSSSB", /RRB/.test(table) && /UPSSSC/.test(table) && /DSSSB/.test(table));
  await page.close();
}

check("no requests to other origins and no uploads (POST)", offending.length === 0, offending.slice(0, 5).join(", "));
check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" || "));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
