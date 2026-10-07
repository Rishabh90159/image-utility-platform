// End-to-end tests for the Phase 3 size and application pages in a real browser.
// Usage: start the production server (npm run build && npx next start -p 3100), then
//   node tests/e2e/phase3.mjs
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { generateFixtures, generatePhase2Fixtures } from "./fixtures.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CHANNEL = process.env.BROWSER_CHANNEL || "msedge";
const OUT = "tests/e2e/output/phase3";
const FIX = "tests/fixtures/generated";
const KB = 1024;
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
const files = await generateFixtures(browser, FIX);
Object.assign(files, await generatePhase2Fixtures(browser, FIX));

const origin = new URL(BASE).origin;
const offending = [];
const consoleErrors = [];

// Capture analytics calls: the site calls window.plausible(event, { props }) when analytics is enabled.
const captureAnalytics = "window.__events = []; window.plausible = (e, o) => window.__events.push([e, (o && o.props) || {}]);";

async function newContext(options = {}) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 }, ...options });
  await ctx.addInitScript(captureAnalytics);
  ctx.on("request", (req) => {
    const url = req.url();
    if (!/^https?:/.test(url)) return;
    // Opening an official source link is a user-initiated page navigation, not data leaving the tool.
    // Every other request (fetch, XHR, beacons, images, scripts) must stay on this site.
    if (req.isNavigationRequest() && new URL(url).origin !== origin) {
      let topLevel = true; // A new tab's first navigation has no frame yet.
      try {
        topLevel = req.frame().parentFrame() === null;
      } catch {}
      if (topLevel) return;
    }
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

const tool = (page) => page.locator('section[aria-label="Image and settings"]');
const upload = (page, name) => page.locator('input[type="file"]').first().setInputFiles(files[name]);
async function loaded(page, name) {
  await page.waitForFunction((n) => document.querySelector('section[aria-label="Image and settings"]')?.textContent?.includes(n), name, { timeout: 60_000 });
}
async function waitResult(page, timeout = 120_000) {
  await page.locator('section[aria-labelledby="result-heading"] a[download]').waitFor({ timeout });
}
async function shownBytes(page) {
  const text = await page.locator("#result-heading + p").innerText();
  return Number(text.match(/\(([\d,]+) bytes\)/)[1].replace(/,/g, ""));
}
async function download(page) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator('section[aria-labelledby="result-heading"] a[download]').click()]);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
}
const isJpeg = (buf) => buf[0] === 0xff && buf[1] === 0xd8;
const jfifDpi = (buf) => (buf[2] === 0xff && buf[3] === 0xe0 && buf[13] === 1 ? (buf[14] << 8) | buf[15] : null);
async function inspect(page, buf) {
  return page.evaluate(async (b64) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([bytes]));
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = c.getContext("2d");
    ctx.drawImage(bmp, 0, 0);
    return { width: bmp.width, height: bmp.height, corner: [...ctx.getImageData(0, 0, 1, 1).data] };
  }, buf.toString("base64"));
}
const events = (page) => page.evaluate(() => window.__events);
/** Waits for a new result after clicking an action button (the result key changes). */
async function rerun(page, buttonName) {
  const before = await page.locator("#result-heading + p").innerText().catch(() => "");
  await page.getByRole("button", { name: buttonName }).click();
  await page.waitForFunction((prev) => {
    const t = document.querySelector("#result-heading + p")?.textContent ?? "";
    return t && t !== prev && document.querySelector('section[aria-labelledby="result-heading"] a[download]');
  }, before, { timeout: 120_000 });
}

// ---------------------------------------------------------------- KB pages
for (const kb of [20, 50, 100, 200]) {
  const route = `/tools/${kb}kb-photo`;
  const page = await openPage(route);
  await upload(page, "photo-12mp.jpg");
  await loaded(page, "photo-12mp.jpg");
  const preset = await tool(page).locator('input[type="radio"]:checked').first().evaluate((el) => el.value);
  check(`${kb}KB: target preselected`, preset === String(kb), preset);
  await page.getByRole("button", { name: `Resize to ${kb}.0 KB` }).or(page.getByRole("button", { name: `Resize to ${kb} KB` })).click();
  await waitResult(page);
  const bytes = await shownBytes(page);
  const dl = await download(page);
  const info = await inspect(page, dl.buf);
  check(`${kb}KB: 12 MP photo at or below ${kb} KB, shown size = downloaded size`, isJpeg(dl.buf) && dl.buf.length <= kb * KB && bytes === dl.buf.length, `${dl.buf.length} bytes, ${info.width}×${info.height}`);
  check(`${kb}KB: result card shows original, target, result and saving`, /Original size[\s\S]*Target[\s\S]*Result[\s\S]*Saved/i.test(await page.locator('section[aria-labelledby="result-heading"]').innerText()));
  const ev = await events(page);
  check(`${kb}KB: kb_photo_started/completed and photo_downloaded tracked`, ["kb_photo_started", "kb_photo_completed", "photo_downloaded"].every((e) => ev.some(([n]) => n === e)), ev.map(([n]) => n).join(","));
  check(`${kb}KB: analytics never include file names or image data`, !JSON.stringify(ev).includes("photo-12mp") && JSON.stringify(ev).length < 3000);
  if (kb === 100) await page.screenshot({ path: path.join(OUT, "100kb-desktop.png"), fullPage: true });
  await page.close();
}

// PNG with transparency, WebP, a tiny image already under the target, an impossible target, options.
{
  const page = await openPage("/tools/20kb-photo");
  await upload(page, "transparent.png");
  await loaded(page, "transparent.png");
  await page.getByRole("button", { name: /^Resize to/ }).click();
  await waitResult(page);
  let dl = await download(page);
  let info = await inspect(page, dl.buf);
  check("20KB: transparent PNG → JPG ≤ 20 KB with white background", isJpeg(dl.buf) && dl.buf.length <= 20 * KB && info.corner.join() === "255,255,255,255", `${dl.buf.length} bytes corner ${info.corner}`);

  await upload(page, "photo.webp");
  await loaded(page, "photo.webp");
  await page.getByRole("button", { name: /^Resize to/ }).click();
  await waitResult(page);
  dl = await download(page);
  check("20KB: WebP input works", isJpeg(dl.buf) && dl.buf.length <= 20 * KB, `${dl.buf.length} bytes`);

  await upload(page, "tiny.jpg");
  await loaded(page, "tiny.jpg");
  await page.getByRole("button", { name: /^Resize to/ }).click();
  await waitResult(page);
  dl = await download(page);
  check("20KB: image already under the target is returned unchanged", (await page.getByText("Already under your target").count()) === 1 && dl.buf.equals(fs.readFileSync(files["tiny.jpg"])));

  await upload(page, "photo-12mp.jpg");
  await loaded(page, "photo-12mp.jpg");
  await page.getByLabel("Allow smaller dimensions").uncheck();
  await tool(page).getByText("10 KB", { exact: true }).click();
  await page.getByRole("button", { name: /^Resize to/ }).click();
  await waitResult(page);
  const shown = await shownBytes(page);
  dl = await download(page);
  const text = await page.locator('section[aria-labelledby="result-heading"]').innerText();
  check("20KB: impossible target reports the closest achievable size honestly", /Closest achievable size/.test(text) && dl.buf.length > 10 * KB && shown === dl.buf.length, `${dl.buf.length} bytes`);
  await page.close();
}
{
  const page = await openPage("/tools/100kb-photo");
  await upload(page, "photo-12mp.jpg");
  await loaded(page, "photo-12mp.jpg");
  await page.getByText("More options: width and quality").click();
  await page.getByLabel("Maximum width (px)").fill("800");
  await page.getByRole("button", { name: /^Resize to/ }).click();
  await waitResult(page);
  let info = await inspect(page, (await download(page)).buf);
  check("100KB: maximum width option caps the width", info.width <= 800, `${info.width}×${info.height}`);

  await page.getByLabel("Maximum width (px)").fill("");
  await page.getByRole("slider", { name: "Highest quality allowed" }).fill("50");
  await rerun(page, /^Resize to/);
  const text = await page.locator('section[aria-labelledby="result-heading"]').innerText();
  const q = Number(text.match(/Quality\s+—\s+(\d+)%/)?.[1]);
  check("100KB: quality ceiling is respected", q <= 50, `${q}%`);
  await page.getByLabel("Maximum width (px)").fill("abc");
  check("100KB: invalid width explained and button disabled", (await page.getByText(/whole number of pixels between 16/).count()) === 1 && (await page.getByRole("button", { name: /^Resize to/ }).isDisabled()));
  await page.close();
}
{
  const page = await openPage("/tools/200kb-photo");
  await upload(page, "huge-flat.png");
  await loaded(page, "huge-flat.png");
  await page.getByRole("button", { name: /^Resize to/ }).click();
  await waitResult(page, 180_000);
  const dl = await download(page);
  const info = await inspect(page, dl.buf);
  check("200KB: very large 63 MP PNG handled", isJpeg(dl.buf) && dl.buf.length <= 200 * KB, `${info.width}×${info.height}, ${dl.buf.length} bytes`);
  await page.close();
}
{
  // The generic page still honours ?target= links.
  const page = await openPage("/tools/resize-image-to-kb?target=50");
  await upload(page, "photo.jpeg");
  await loaded(page, "photo.jpeg");
  const preset = await tool(page).locator('input[type="radio"]:checked').first().evaluate((el) => el.value);
  check("exact-KB page: ?target=50 still preselects 50 KB", preset === "50", preset);
  await page.close();
}

// ---------------------------------------------------------------- Application pages
async function makeFile(page, fileName, kindLabel) {
  if (kindLabel) await tool(page).getByText(kindLabel, { exact: true }).click();
  await upload(page, fileName);
  await loaded(page, fileName);
  await page.getByRole("button", { name: /^Create (photo|signature) file$|^Create again$/ }).click();
  await waitResult(page);
  const shown = await shownBytes(page);
  const dl = await download(page);
  const info = await inspect(page, dl.buf);
  const checklist = await page.getByRole("list", { name: "Requirement check" }).innerText();
  return { dl, info, shown, checklist };
}

{
  const page = await openPage("/tools/ibps-photo");
  check("IBPS: requirement summary with official PDF link and verified date", (await page.locator('a[href^="https://www.ibps.in/wp-content/uploads/Detailed-Notification_CRP-PO-XVI"]').count()) >= 1 && /Last verified\s+7 October 2026/.test(await page.locator('section[aria-labelledby="requirements-heading"]').innerText()));
  let r = await makeFile(page, "portrait.jpg");
  check("IBPS: photo exactly 200 × 230 px JPG within 20–50 KB", isJpeg(r.dl.buf) && r.info.width === 200 && r.info.height === 230 && r.dl.buf.length >= 20 * KB && r.dl.buf.length <= 50 * KB, `${r.dl.buf.length} bytes`);
  check("IBPS: shown size = downloaded size; checklist all passed", r.shown === r.dl.buf.length && !r.checklist.includes("does not meet"), r.checklist.replace(/\n/g, " | "));
  r = await makeFile(page, "signature.jpg", "Signature");
  check("IBPS: signature made at the preferred 140 × 60 px", r.info.width === 140 && r.info.height === 60, `${r.dl.buf.length} bytes`);
  if (r.dl.buf.length < 10 * KB) {
    // A clean signature at 140 × 60 can't reach 10 KB; the tool must say so and offer to enlarge it.
    const status = await page.locator('section[aria-labelledby="result-heading"]').innerText();
    check("IBPS: under-minimum signature reported honestly with an enlarge option", /below the 10 KB minimum/.test(status) && /preferred, not mandatory/.test(status));
    await page.getByRole("button", { name: "Make it larger to reach 10 KB" }).click();
    await page.waitForFunction(() => /enlarged from the preferred/.test(document.querySelector('[aria-label="Requirement check"]')?.textContent ?? ""), null, { timeout: 120_000 });
    const grown = await download(page);
    const gi = await inspect(page, grown.buf);
    check("IBPS: enlarged signature reaches 10–20 KB and keeps the 140:60 shape", grown.buf.length >= 10 * KB && grown.buf.length <= 20 * KB && Math.abs(gi.width / gi.height - 140 / 60) < 0.03, `${gi.width}×${gi.height}, ${grown.buf.length} bytes`);
  } else {
    check("IBPS: signature within 10–20 KB", r.dl.buf.length <= 20 * KB, `${r.dl.buf.length} bytes`);
  }
  const ev = await events(page);
  check("IBPS: application_photo_started/completed tracked with preset id", ev.some(([n, p]) => n === "application_photo_completed" && p.preset === "ibps-crp-po-mt-xvi"), ev.map(([n]) => n).join(","));
  await page.screenshot({ path: path.join(OUT, "ibps-desktop.png"), fullPage: true });

  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.locator('section[aria-labelledby="requirements-heading"] a[target="_blank"]').first().click({ modifiers: [] }),
  ]);
  await popup.close().catch(() => {});
  check("IBPS: requirement_source_clicked tracked", (await events(page)).some(([n]) => n === "requirement_source_clicked"));
  await page.close();
}
{
  const page = await openPage("/tools/sbi-photo");
  await page.getByLabel("SBI advertisement").selectOption("sbi-rs-2026-27-06");
  const r = await makeFile(page, "portrait.jpg");
  check("SBI: Resolvers advertisement → 200 × 230 px, 20–50 KB", r.info.width === 200 && r.info.height === 230 && r.dl.buf.length >= 20 * KB && r.dl.buf.length <= 50 * KB, `${r.dl.buf.length} bytes`);
  check("SBI: both advertisements listed with sources", (await page.locator('a[href^="https://sbi.bank.in/"]').count()) >= 2);
  await page.close();
}
{
  const page = await openPage("/tools/ssc-photo");
  check("SSC: live photo capture explained, no photo option", (await page.getByText("The photo is captured live, not uploaded").count()) === 1 && (await page.getByText("Photograph", { exact: true }).count()) === 0);
  const r = await makeFile(page, "signature.jpg");
  const ratio = r.info.width / r.info.height;
  check("SSC: signature JPEG within 10–20 KB at about 3:1", isJpeg(r.dl.buf) && r.dl.buf.length >= 10 * KB && r.dl.buf.length <= 20 * KB && Math.abs(ratio - 3) < 0.05, `${r.info.width}×${r.info.height}, ${r.dl.buf.length} bytes`);
  check("SSC: paper cleaned to white", r.info.corner.slice(0, 3).every((v) => v >= 250), `corner ${r.info.corner}`);
  await page.close();
}
{
  const page = await openPage("/tools/neet-photo");
  let r = await makeFile(page, "photo-12mp.jpg");
  check("NEET: photo JPG within 10–200 KB, pixel size not forced", isJpeg(r.dl.buf) && r.dl.buf.length >= 10 * KB && r.dl.buf.length <= 200 * KB && /no pixel size is specified/.test(r.checklist), `${r.info.width}×${r.info.height}, ${r.dl.buf.length} bytes`);
  r = await makeFile(page, "signature.jpg", "Signature");
  check("NEET: signature within 10–100 KB", r.dl.buf.length >= 10 * KB && r.dl.buf.length <= 100 * KB, `${r.dl.buf.length} bytes`);
  await page.close();
}
{
  const page = await openPage("/tools/upsc-photo");
  check("UPSC: honest 'no verified requirement' notice with official links", (await page.getByText("No verified requirement to apply yet").count()) === 1 && (await page.locator('a[href="https://upsconline.nic.in/"]').count()) >= 1);
  await page.locator("#req-width").fill("350");
  await page.locator("#req-height").fill("350");
  await page.locator("#req-minKB").fill("20");
  await page.locator("#req-maxKB").fill("300");
  const r = await makeFile(page, "portrait.jpg");
  check("UPSC: user-entered 350 × 350 px, 20–300 KB applied", r.info.width === 350 && r.info.height === 350 && r.dl.buf.length >= 20 * KB && r.dl.buf.length <= 300 * KB, `${r.dl.buf.length} bytes`);
  await page.locator("#req-width").fill("350");
  await page.locator("#req-height").fill("");
  check("UPSC: half-entered size explained", (await page.getByText("Enter both width and height in pixels").count()) === 1 && (await page.getByRole("button", { name: /^Create/ }).isDisabled()));
  await page.close();
}
{
  const page = await openPage("/tools/passport-photo");
  check("Passport: comparison table lists India, UK and Canada with sources", (await page.locator("table").first().innerText()).match(/India[\s\S]*United Kingdom[\s\S]*Canada/) !== null && (await page.locator('a[href^="https://www.passportindia.gov.in/"]').count()) >= 1);
  check("Passport: US and Australia listed as not yet verified", /United States:[\s\S]*Australia:/.test(await page.locator('section[aria-labelledby="requirements-heading"]').innerText()));
  await page.getByLabel("Country").selectOption("India");
  let r = await makeFile(page, "portrait.jpg");
  check("Passport India: 413 × 531 px JPG with 300 DPI for printing", r.info.width === 413 && r.info.height === 531 && jfifDpi(r.dl.buf) === 300, `dpi ${jfifDpi(r.dl.buf)}`);
  await page.getByLabel("Country").selectOption("Canada");
  await page.getByLabel("Application").selectOption("canada-passport-digital");
  await rerun(page, /^Create (photo file|again)$/);
  r = { dl: await download(page) };
  r.info = await inspect(page, r.dl.buf);
  const caText = await page.locator('section[aria-labelledby="result-heading"]').innerText();
  check("Passport Canada digital: 1200 × 1800 px and honest about the 200 KB minimum", r.info.width === 1200 && r.info.height === 1800 && (r.dl.buf.length >= 200 * KB || /below the 200 KB minimum/.test(caText)), `${r.dl.buf.length} bytes`);
  await page.close();
}

// ---------------------------------------------------------------- Navigation
{
  const page = await openPage("/");
  const nav = page.getByRole("navigation", { name: "Image tools" }).first();
  for (const [label, link] of [["Image tools", "Image Cropper"], ["Photo size", "100KB Photo Resizer"], ["Exam & passport", "IBPS Photo Resizer"]]) {
    await nav.getByText(label, { exact: true }).click();
    const visible = await nav.getByRole("link", { name: link }).isVisible();
    check(`nav: "${label}" menu shows ${link}`, visible);
  }
  const open = await page.locator("details[data-disclosure-menu][open]").count();
  check("nav: only one menu open at a time", open === 1, String(open));
  await page.keyboard.press("Escape");
  check("nav: Escape closes the menu", (await page.locator("details[data-disclosure-menu][open]").count()) === 0);
  await page.close();
}

// ---------------------------------------------------------------- Mobile: one-handed flow on a phone
{
  const mobile = await newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  for (const route of ["/tools/20kb-photo", "/tools/50kb-photo", "/tools/100kb-photo", "/tools/200kb-photo", "/tools/ssc-photo", "/tools/upsc-photo", "/tools/ibps-photo", "/tools/sbi-photo", "/tools/neet-photo", "/tools/passport-photo"]) {
    const p = await openPage(route, mobile);
    const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check(`mobile: ${route} has no horizontal scroll`, !wide);
    await p.close();
  }
  const page = await openPage("/tools/ibps-photo", mobile);
  await page.getByRole("link", { name: "Prepare your file now" }).tap();
  await page.waitForTimeout(400);
  const pickerTop = await page.getByLabel("IBPS notification").evaluate((el) => el.getBoundingClientRect().top);
  check("mobile: 'Prepare your file now' jumps to the tool", pickerTop >= 0 && pickerTop < 400, `picker at ${Math.round(pickerTop)} px`);
  await upload(page, "portrait.jpg");
  await loaded(page, "portrait.jpg");
  const btn = page.getByRole("button", { name: "Create photo file" });
  const box = await btn.boundingBox();
  check("mobile: action button is a comfortable touch target", box && box.height >= 44, `${box?.width.toFixed(0)}×${box?.height.toFixed(0)}`);
  await btn.tap();
  await waitResult(page);
  const dl = await download(page);
  const info = await inspect(page, dl.buf);
  check("mobile: IBPS photo completes on a phone", info.width === 200 && info.height === 230);
  await page.screenshot({ path: path.join(OUT, "ibps-mobile.png"), fullPage: true });
  const menu = await openPage("/tools/neet-photo", mobile);
  await menu.locator("header summary >> visible=true").tap();
  check("mobile: menu groups tools into four sections", (await menu.locator("header nav >> visible=true").locator("p").allInnerTexts()).join("|") === "IMAGE TOOLS|CONVERT|PHOTO SIZE|EXAM & PASSPORT");
  await menu.screenshot({ path: path.join(OUT, "menu-mobile.png") });
  await menu.close();
  await mobile.close();
}

// ---------------------------------------------------------------- Keyboard
{
  const page = await openPage("/tools/sbi-photo");
  let reached = false;
  for (let i = 0; i < 80 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => document.activeElement?.tagName === "SELECT");
  }
  check("a11y: requirement picker reachable by keyboard", reached);
  const unlabeled = await page.evaluate(() =>
    [...document.querySelectorAll("main input, main select, main button")].filter((el) => {
      if (el.type === "file" || el.type === "hidden") return false;
      return !(el.getAttribute("aria-label") || el.closest("label") || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.textContent.trim());
    }).length,
  );
  check("a11y: every control on the SBI page has a label", unlabeled === 0, `${unlabeled} unlabeled`);
  await page.close();
}

check("privacy: no cross-origin or non-GET requests (photos never uploaded)", offending.length === 0, offending.slice(0, 5).join(", "));
check("console: no errors on any page", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
