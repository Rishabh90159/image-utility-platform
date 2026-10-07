// End-to-end tests for the Phase 2 tools in a real browser (Edge or Chrome via playwright-core).
// Usage: start the production server (npm run build && npx next start -p 3100), then
//   node tests/e2e/phase2.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { generateFixtures, generatePhase2Fixtures } from "./fixtures.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CHANNEL = process.env.BROWSER_CHANNEL || "msedge";
const OUT = "tests/e2e/output/phase2";
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

const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const origin = new URL(BASE).origin;
const offending = [];
const watchRequests = (ctx) =>
  ctx.on("request", (req) => {
    const url = req.url();
    if (!/^https?:/.test(url)) return;
    if (new URL(url).origin !== origin || req.method() !== "GET") offending.push(`${req.method()} ${url}`);
  });
watchRequests(context);

const consoleErrors = [];
const dialogs = [];
async function openPage(route, ctx = context) {
  const page = await ctx.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${route}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`${route}: ${err.message}`));
  page.on("dialog", async (dialog) => {
    dialogs.push(`${route}: ${dialog.message()}`);
    await dialog.dismiss();
  });
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  return page;
}

const upload = (page, ...names) => page.locator('input[type="file"]').first().setInputFiles(names.map((n) => files[n]));
async function waitResult(page, timeout = 90_000) {
  await page.locator("#result-heading").waitFor({ timeout });
  await page.locator('section[aria-labelledby="result-heading"] a[download]').waitFor({ timeout });
}
async function shownBytes(page) {
  const text = await page.locator("#result-heading + p").innerText();
  return Number(text.match(/\(([\d,]+) bytes\)/)[1].replace(/,/g, ""));
}
async function download(page, locator = page.locator('section[aria-labelledby="result-heading"] a[download]')) {
  const [dl] = await Promise.all([page.waitForEvent("download"), locator.click()]);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
}
function kind(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "png";
  if (buf.subarray(0, 4).toString() === "RIFF") return "webp";
  if (/^\s*<svg/.test(buf.subarray(0, 100).toString())) return "svg";
  return "unknown";
}
async function inspect(page, buf, points = []) {
  return page.evaluate(
    async ({ b64, points }) => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const isSvg = new TextDecoder().decode(bytes.subarray(0, 100)).trimStart().startsWith("<svg");
      let bmp;
      if (isSvg) {
        // Browsers can't decode SVG with createImageBitmap; render it through an <img> like a user would see it.
        const img = new Image();
        img.src = URL.createObjectURL(new Blob([bytes], { type: "image/svg+xml" }));
        await img.decode();
        bmp = img;
        bmp.width = img.naturalWidth;
        bmp.height = img.naturalHeight;
      } else {
        bmp = await createImageBitmap(new Blob([bytes]));
      }
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = c.getContext("2d");
      ctx.drawImage(bmp, 0, 0);
      const px = (x, y) => [...ctx.getImageData(Math.min(bmp.width - 1, x), Math.min(bmp.height - 1, y), 1, 1).data];
      return { width: bmp.width, height: bmp.height, corner: px(0, 0), centre: px(Math.floor(bmp.width / 2), Math.floor(bmp.height / 2)), points: points.map(([x, y]) => px(x, y)) };
    },
    { b64: buf.toString("base64"), points },
  );
}
async function alertText(page) {
  const alert = page.locator('[role="alert"]').filter({ hasText: /\S/ }).first();
  await alert.waitFor({ timeout: 30_000 });
  return alert.innerText();
}
const tool = (page) => page.locator('section[aria-label="Image and settings"]');
const jfifDpi = (buf) => (buf[2] === 0xff && buf[3] === 0xe0 && buf[13] === 1 ? (buf[14] << 8) | buf[15] : null);

// ---------------------------------------------------------------- HEIC to JPG
{
  const route = "/tools/heic-to-jpg";
  const page = await openPage(route);
  const started = Date.now();
  await upload(page, "example.heic");
  await waitResult(page, 120_000);
  const ms = Date.now() - started;
  const bytes = await shownBytes(page);
  const dl = await download(page);
  const info = await inspect(page, dl.buf);
  check("heic: HEIC → JPG with original dimensions", kind(dl.buf) === "jpeg" && info.width === 1280 && info.height === 854, `${info.width}×${info.height} in ${ms} ms`);
  check("heic: shown size equals downloaded size", bytes === dl.buf.length, `${bytes} vs ${dl.buf.length}`);
  check("heic: download name", dl.name === "example-converted.jpg", dl.name);
  check("heic: preview of the HEIC original is displayed", await page.locator('img[alt^="Original image"]').evaluate((img) => img.complete && img.naturalWidth > 0));
  await page.screenshot({ path: path.join(OUT, "heic-desktop.png") });

  // Quality slider → smaller file.
  await page.getByRole("slider", { name: /JPG quality/ }).fill("50");
  await page.getByRole("button", { name: /Convert to JPG/ }).click();
  await page.waitForFunction((prev) => {
    const t = document.querySelector("#result-heading + p")?.textContent ?? "";
    const m = t.match(/\(([\d,]+) bytes\)/);
    return m && Number(m[1].replace(/,/g, "")) !== prev;
  }, bytes, { timeout: 60_000 });
  check("heic: lower quality gives a smaller JPG", (await shownBytes(page)) < bytes);

  await upload(page, "example.heif");
  await page.waitForFunction(() => [...document.querySelectorAll('section[aria-label="Image and settings"] p')].some((p) => p.textContent === "example.heif"), null, { timeout: 60_000 });
  await waitResult(page, 60_000);
  check("heic: .heif extension accepted", true);

  await upload(page, "broken.heic");
  const text = await alertText(page);
  check("heic: damaged HEIC gives a clear error", /HEIC|damaged|couldn't/i.test(text), text.slice(0, 120));
  await upload(page, "photo.jpeg");
  check("heic: JPG dropped into HEIC tool explains itself", /already a JPG|needs a HEIC/i.test(await alertText(page)));
  await page.close();

  // Phase 1 tools point HEIC users to the converter.
  const resizer = await openPage("/tools/image-resizer");
  await upload(resizer, "example.heic");
  await alertText(resizer);
  check("heic: Phase 1 tool links to the HEIC converter", await resizer.locator('[role="alert"] a[href="/tools/heic-to-jpg"]').count() === 1);
  await resizer.close();
}

// ---------------------------------------------------------------- SVG to PNG
{
  const route = "/tools/svg-to-png";
  const page = await openPage(route);
  await upload(page, "simple.svg");
  await waitResult(page);
  let dl = await download(page);
  let info = await inspect(page, dl.buf);
  check("svg: simple SVG → PNG at intrinsic size", kind(dl.buf) === "png" && info.width === 200 && info.height === 100, `${info.width}×${info.height}`);
  check("svg: transparent background kept", info.corner[3] === 0, `corner α=${info.corner[3]}`);
  check("svg: shapes rendered", info.centre[3] === 255 && info.centre[0] > 200 && info.centre[2] < 80, `centre ${info.centre}`);

  await page.locator("#svg-width").fill("1200");
  check("svg: aspect lock computes height", (await page.locator("#svg-height").inputValue()) === "600");
  await tool(page).getByText("White", { exact: true }).click();
  await page.getByRole("button", { name: /Convert to PNG/ }).click();
  await page.waitForFunction(() => /1,200 × 600/.test(document.querySelector('section[aria-labelledby="result-heading"]')?.textContent ?? ""), null, { timeout: 30_000 });
  dl = await download(page);
  info = await inspect(page, dl.buf);
  check("svg: 1200 × 600 with white background", info.width === 1200 && info.height === 600 && info.corner.join() === "255,255,255,255", `${info.width}×${info.height} corner ${info.corner}`);

  // Unlock and choose a square: fit inside adds space rather than stretching.
  await page.getByLabel("Maintain aspect ratio").uncheck();
  await page.locator("#svg-width").fill("400");
  await page.locator("#svg-height").fill("400");
  await tool(page).getByText("Fit inside (add space)").click();
  await page.getByRole("button", { name: /Convert to PNG/ }).click();
  await page.waitForFunction(() => /400 × 400/.test(document.querySelector('section[aria-labelledby="result-heading"]')?.textContent ?? ""), null, { timeout: 30_000 });
  dl = await download(page);
  info = await inspect(page, dl.buf, [[200, 20]]);
  check("svg: different ratio with fit-inside pads instead of stretching", info.width === 400 && info.points[0].join() === "255,255,255,255", `top-centre ${info.points[0]}`);

  await upload(page, "complex.svg");
  await waitResult(page);
  dl = await download(page);
  info = await inspect(page, dl.buf);
  check("svg: complex SVG (gradients, defs/use, text, 400 shapes) renders", info.width === 800 && info.height === 600 && info.centre[3] === 255, `${info.width}×${info.height}`);

  await upload(page, "no-size.svg");
  await waitResult(page);
  check("svg: SVG without size uses browser default and says so", await page.getByText("This SVG doesn't specify a size").count() === 1);

  await upload(page, "malicious.svg");
  await waitResult(page);
  const notice = await page.getByText(/Removed \d+ unsafe item/).innerText();
  const pwned = await page.evaluate(() => window.__pwned === true || document.title === "pwned");
  dl = await download(page);
  info = await inspect(page, dl.buf);
  check("svg: malicious SVG neutralised (no script ran, no dialog)", !pwned && dialogs.length === 0, notice);
  check("svg: malicious SVG still converts its safe drawing", kind(dl.buf) === "png" && info.centre[3] === 255);
  // The site's CSP blocks fetch() of blob: URLs, so read the cleaned SVG from a CSP-bypassing test context.
  const inspector = await browser.newContext({ bypassCSP: true });
  const ip = await inspector.newPage();
  await ip.goto(BASE + route, { waitUntil: "networkidle" });
  await ip.locator('input[type="file"]').first().setInputFiles(files["malicious.svg"]);
  await ip.locator('img[alt^="Original image"]').waitFor({ timeout: 30_000 });
  const sanitized = await ip.evaluate(async () => (await (await fetch(document.querySelector('img[alt^="Original image"]').src)).text()));
  await inspector.close();
  check("svg: sanitized markup has no script, handlers, foreignObject or external links", !/<script|onload|onclick|foreignObject|evil\.example|javascript:/i.test(sanitized), sanitized.slice(0, 80));

  for (const [name, pattern] of [["invalid.svg", /couldn't be read|not valid/i], ["entity-bomb.svg", /entity|entities/i], ["not-svg.svg", /isn't an SVG/i]]) {
    const p = await openPage(route);
    await upload(p, name);
    const t = await alertText(p);
    check(`svg: ${name} rejected with a clear message`, pattern.test(t), t.slice(0, 100));
    await p.close();
  }
  await page.close();
}

// ---------------------------------------------------------------- PNG to SVG
{
  const route = "/tools/png-to-svg";
  const page = await openPage(route);
  const started = Date.now();
  await upload(page, "logo.png");
  await waitResult(page, 120_000);
  let dl = await download(page);
  let svg = dl.buf.toString();
  check("png→svg: logo traced into vector paths", kind(dl.buf) === "svg" && /<path /.test(svg) && !/<image|base64|href=/.test(svg), `${svg.length} bytes in ${Date.now() - started} ms`);
  check("png→svg: SVG keeps original dimensions", /width="600" height="400"/.test(svg));
  check("png→svg: download name", dl.name === "logo-vector.svg", dl.name);
  let rendered = await inspect(page, dl.buf);
  check("png→svg: SVG renders the logo colours", rendered.width === 600 && rendered.centre[3] === 255, `centre ${rendered.centre}`);
  await page.screenshot({ path: path.join(OUT, "png-to-svg-desktop.png"), fullPage: true });

  await page.getByLabel("Remove background colour").check();
  await page.getByRole("button", { name: /Convert to SVG|Trace again/ }).click();
  await page.waitForFunction(() => /Shapes/.test(document.querySelector('section[aria-labelledby="result-heading"]')?.textContent ?? ""), null, { timeout: 60_000 });
  await page.waitForTimeout(500);
  await page.locator('section[aria-labelledby="result-heading"] a[download]').waitFor();
  dl = await download(page);
  rendered = await inspect(page, dl.buf);
  check("png→svg: background removal leaves a transparent corner", rendered.corner[3] === 0, `corner ${rendered.corner}`);

  await upload(page, "icon-transparent.png");
  await waitResult(page, 60_000);
  await tool(page).getByText("Black & white", { exact: true }).click();
  await page.getByRole("button", { name: /Convert to SVG|Trace again/ }).click();
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 60_000 });
  await page.locator('section[aria-labelledby="result-heading"] a[download]').waitFor();
  dl = await download(page);
  svg = dl.buf.toString();
  check("png→svg: transparent icon in black & white", /fill="#000000"/.test(svg) && !/fill="#ffffff"/.test(svg));

  await upload(page, "photo.png");
  await waitResult(page, 120_000);
  const status = await page.locator('section[aria-labelledby="result-heading"]').innerText();
  check("png→svg: photograph traced and flagged when it doesn't trace cleanly", /doesn't trace cleanly|Traced into vector/.test(status), status.match(/[\d,]+ paths/)?.[0] ?? "");

  await upload(page, "tiny-logo.png");
  await waitResult(page, 60_000);
  check("png→svg: low-resolution image still produces an SVG", true);
  await page.close();
}

// ---------------------------------------------------------------- Image cropper
async function cropAndDownload(page, label = "Crop image") {
  await page.getByRole("button", { name: new RegExp(`^(${label}|Crop again)$`) }).click();
  await waitResult(page);
  const dl = await download(page);
  return { dl, info: await inspect(page, dl.buf) };
}
{
  const route = "/tools/image-cropper";
  const page = await openPage(route);
  await upload(page, "photo.jpeg");
  await page.locator('[aria-label^="Crop area"]').waitFor();
  const ui = page.getByRole("region", { name: "Image and settings" });

  await ui.getByText("1:1", { exact: true }).click();
  let { dl, info } = await cropAndDownload(page);
  check("crop: 1:1 is the largest centred square", info.width === 1200 && info.height === 1200 && kind(dl.buf) === "jpeg", `${info.width}×${info.height}`);

  await ui.getByText("16:9", { exact: true }).click();
  ({ info } = await cropAndDownload(page));
  check("crop: 16:9", Math.abs(info.width / info.height - 16 / 9) < 0.01 && info.width === 1600, `${info.width}×${info.height}`);

  await ui.getByText("4:3", { exact: true }).click();
  ({ info } = await cropAndDownload(page));
  check("crop: 4:3 on a 4:3 photo keeps everything", info.width === 1600 && info.height === 1200, `${info.width}×${info.height}`);

  await ui.getByText("Portrait", { exact: true }).click();
  ({ info } = await cropAndDownload(page));
  check("crop: 3:4 portrait", Math.abs(info.width / info.height - 3 / 4) < 0.01, `${info.width}×${info.height}`);

  await ui.getByText("Custom", { exact: true }).click();
  await page.locator("#crop-ratio-w").fill("5");
  await page.locator("#crop-ratio-h").fill("2");
  ({ info } = await cropAndDownload(page));
  check("crop: custom 5:2", Math.abs(info.width / info.height - 2.5) < 0.01, `${info.width}×${info.height}`);

  // Drag the crop box with the mouse and check the selection moved (keyboard too).
  await ui.getByText("1:1", { exact: true }).click();
  const box = page.locator('[data-crop-role="move"]');
  const before = await box.getAttribute("aria-label");
  const bb = await box.boundingBox();
  // Shrink from the bottom-right corner, then move it.
  const handle = page.locator('[data-crop-role="handle-se"]');
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x - bb.width / 2, hb.y - bb.height / 2, { steps: 8 });
  await page.mouse.up();
  const resized = await box.getAttribute("aria-label");
  await box.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  const moved = await box.getAttribute("aria-label");
  check("crop: mouse resize changes the selection", resized !== before, `${before.match(/\d+ × \d+/)} → ${resized.match(/\d+ × \d+/)}`);
  check("crop: arrow keys move the selection", moved !== resized && moved.match(/\d+ × \d+/)[0] === resized.match(/\d+ × \d+/)[0]);
  ({ info } = await cropAndDownload(page));
  check("crop: resized square crop is still square", info.width === info.height && info.width < 1200, `${info.width}×${info.height}`);

  // Rotation: free crop of a rotated 4:3 photo gives a portrait image.
  await ui.getByText("Free", { exact: true }).click();
  await page.getByRole("button", { name: "Rotate right" }).click();
  ({ info } = await cropAndDownload(page));
  check("crop: rotate right swaps orientation", info.height > info.width, `${info.width}×${info.height}`);

  // Output resize + PNG.
  await ui.getByText("1:1", { exact: true }).click();
  await page.getByLabel("Resize the cropped image").check();
  await page.locator("#crop-out-width").fill("1080");
  await ui.getByText("PNG", { exact: true }).click();
  ({ dl, info } = await cropAndDownload(page));
  check("crop: 1080 × 1080 PNG output", kind(dl.buf) === "png" && info.width === 1080 && info.height === 1080, `${info.width}×${info.height}`);
  await page.screenshot({ path: path.join(OUT, "cropper-desktop.png") });

  // Large image.
  await upload(page, "photo-12mp.jpg");
  await page.waitForFunction(() => /photo-12mp/.test(document.querySelector('section[aria-label="Image and settings"]')?.textContent ?? ""), null, { timeout: 60_000 });
  await page.getByLabel("Resize the cropped image").uncheck();
  await ui.getByText("1:1", { exact: true }).click();
  ({ info } = await cropAndDownload(page));
  check("crop: 12 MP photo 1:1 at full resolution", info.width === 3000 && info.height === 3000, `${info.width}×${info.height}`);
  await page.close();
}

// ---------------------------------------------------------------- Cropper on a touch phone
{
  const mobile = await browser.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  watchRequests(mobile);
  const page = await openPage("/tools/image-cropper", mobile);
  await upload(page, "photo.jpeg");
  const box = page.locator('[data-crop-role="move"]');
  await box.waitFor();
  const before = await box.getAttribute("aria-label");
  await page.locator(".touch-none").scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 120));
  const hb = await page.locator('[data-crop-role="handle-se"]').boundingBox();
  const cdp = await mobile.newCDPSession(page);
  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  const sx = hb.x + hb.width / 2;
  const sy = hb.y + hb.height / 2;
  await touch("touchStart", sx, sy);
  for (let i = 1; i <= 8; i++) await touch("touchMove", sx - i * 12, sy - i * 12);
  await touch("touchEnd", 0, 0);
  const afterResize = await box.getAttribute("aria-label");
  check("mobile crop: touch drag on a corner resizes", afterResize !== before, `${before.match(/\d+ × \d+/)} → ${afterResize.match(/\d+ × \d+/)}`);

  // Pinch to zoom with two fingers.
  const area = await page.locator(".touch-none").boundingBox();
  const cx = area.x + area.width / 2;
  const cy = area.y + area.height / 2;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx - 30, y: cy, id: 1 }, { x: cx + 30, y: cy, id: 2 }] });
  for (let i = 1; i <= 6; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx - 30 - i * 15, y: cy, id: 1 }, { x: cx + 30 + i * 15, y: cy, id: 2 }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const zoom = Number(await page.locator('input[type="range"][aria-valuetext$="percent"]').first().inputValue());
  check("mobile crop: pinch zooms in", zoom > 100, `${zoom}%`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("mobile crop: no horizontal page scroll", !overflow);
  await page.getByRole("button", { name: "Crop image" }).click();
  await waitResult(page);
  check("mobile crop: crop completes on a phone", true);
  await page.screenshot({ path: path.join(OUT, "cropper-mobile.png"), fullPage: true });
  await page.close();

  for (const route of ["/tools/passport-photo-resizer", "/tools/signature-resizer", "/tools/bulk-image-resizer", "/tools/svg-to-png", "/tools/png-to-svg", "/tools/heic-to-jpg"]) {
    const p = await openPage(route, mobile);
    const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check(`mobile: ${route} has no horizontal scroll`, !wide);
    await p.screenshot({ path: path.join(OUT, `mobile-${route.split("/").pop()}.png`) });
    await p.close();
  }
  await mobile.close();
}

// ---------------------------------------------------------------- Passport photo
{
  const route = "/tools/passport-photo-resizer";
  const page = await openPage(route);
  await page.getByLabel("Photo requirement").selectOption("uk-passport-digital");
  check("passport: preset shows official source and verification date", await page.getByText(/Last verified/).count() === 1 && await page.locator('a[href^="https://www.gov.uk/"]').count() >= 1);
  await upload(page, "portrait.jpg");
  await page.locator('[aria-label^="Photo crop area"]').waitFor();
  await page.getByRole("button", { name: "Create photo" }).click();
  await waitResult(page);
  let dl = await download(page);
  let info = await inspect(page, dl.buf);
  check("passport: UK digital preset → 600 × 750 JPG within 50 KB–10 MB", kind(dl.buf) === "jpeg" && info.width === 600 && info.height === 750 && dl.buf.length >= 50 * KB, `${info.width}×${info.height}, ${dl.buf.length} bytes`);
  check("passport: verify-before-submitting notice shown", await page.getByText("Verify the final image against the official application requirements before submitting").count() === 1);

  await page.getByLabel("Photo requirement").selectOption("custom");
  await page.locator("#pp-width").fill("35");
  await page.locator("#pp-height").fill("45");
  await page.locator("#pp-dpi").fill("300");
  await page.locator("#pp-max").fill("50");
  await page.getByRole("button", { name: /Create photo/ }).click();
  await page.waitForFunction(() => /413 × 531/.test(document.querySelector('section[aria-labelledby="result-heading"]')?.textContent ?? ""), null, { timeout: 60_000 });
  dl = await download(page);
  info = await inspect(page, dl.buf);
  check("passport: 35 × 45 mm at 300 DPI → 413 × 531 px under 50 KB", info.width === 413 && info.height === 531 && dl.buf.length <= 50 * KB, `${dl.buf.length} bytes`);
  check("passport: DPI recorded in the JPG for printing", jfifDpi(dl.buf) === 300, String(jfifDpi(dl.buf)));
  check("passport: print size shown", /34\.\d × 45\.\d mm at 300 DPI|35\.0 × 45\.0 mm/.test(await page.locator('section[aria-labelledby="result-heading"]').innerText()));

  await page.locator("#pp-max").fill("4");
  check("passport: invalid KB limit explained and button disabled", /at least 5 KB/.test(await page.locator('[role="alert"]').filter({ hasText: /KB/ }).first().innerText()) && await page.getByRole("button", { name: /Create photo/ }).isDisabled());
  await page.locator("#pp-max").fill("30");
  await page.locator("#pp-min").fill("40");
  check("passport: min above max rejected", /smaller than the maximum/.test(await page.locator('[role="alert"]').filter({ hasText: /minimum/ }).first().innerText()));

  await page.locator("#pp-min").fill("");
  await page.locator("#pp-max").fill("");
  await tool(page).getByText("Pixels", { exact: true }).click();
  await page.locator("#pp-width").fill("600");
  await page.locator("#pp-height").fill("900");
  await page.getByRole("button", { name: /Create photo/ }).click();
  await page.waitForFunction(() => /600 × 900/.test(document.querySelector('section[aria-labelledby="result-heading"]')?.textContent ?? ""), null, { timeout: 60_000 });
  info = await inspect(page, (await download(page)).buf);
  check("passport: custom 2:3 pixel size", info.width === 600 && info.height === 900);

  await page.getByLabel("Photo requirement").selectOption("canada-passport-digital");
  await page.getByRole("button", { name: /Create photo/ }).click();
  await page.waitForFunction(() => /1,200 × 1,800/.test(document.querySelector('section[aria-labelledby="result-heading"]')?.textContent ?? ""), null, { timeout: 60_000 });
  dl = await download(page);
  info = await inspect(page, dl.buf);
  const caText = await page.locator('section[aria-labelledby="result-heading"]').innerText();
  check("passport: Canada digital preset 1200 × 1800, and honest about the 200 KB minimum", info.width === 1200 && info.height === 1800 && (dl.buf.length >= 200 * KB || /smaller than 200 KB/.test(caText)), `${dl.buf.length} bytes`);
  await page.screenshot({ path: path.join(OUT, "passport-desktop.png"), fullPage: true });
  await page.close();
}

// ---------------------------------------------------------------- Signature
{
  const route = "/tools/signature-resizer";
  const page = await openPage(route);
  await upload(page, "signature.jpg");
  await page.locator('[aria-label^="Signature crop area"]').waitFor();
  await page.locator("#sig-width").fill("300");
  await page.locator("#sig-max-kb").fill("20");
  await page.getByRole("button", { name: /Create signature/ }).click();
  await waitResult(page);
  let dl = await download(page);
  let info = await inspect(page, dl.buf, [[5, 5]]);
  check("signature: JPG 300 px wide under 20 KB", kind(dl.buf) === "jpeg" && info.width === 300 && dl.buf.length <= 20 * KB, `${info.width}×${info.height}, ${dl.buf.length} bytes`);
  check("signature: grey paper cleaned to white", info.points[0].slice(0, 3).every((v) => v >= 250), `corner ${info.points[0]}`);

  await tool(page).getByText("Transparent", { exact: true }).click();
  await page.getByRole("button", { name: /Create signature/ }).click();
  await page.waitForFunction(() => /Download PNG/.test(document.querySelector('section[aria-labelledby="result-heading"]')?.textContent ?? ""), null, { timeout: 60_000 });
  dl = await download(page);
  info = await inspect(page, dl.buf);
  const inkAlpha = await page.evaluate(async (b64) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([bytes]));
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = c.getContext("2d");
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
    let opaque = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 200) opaque++;
    return opaque;
  }, dl.buf.toString("base64"));
  check("signature: transparent PNG keeps ink and drops paper", kind(dl.buf) === "png" && info.corner[3] === 0 && inkAlpha > 100, `corner α=${info.corner[3]}, ${inkAlpha} ink px`);

  await upload(page, "signature-transparent.png");
  await page.waitForFunction(() => /signature-transparent/.test(document.querySelector('section[aria-label="Image and settings"]')?.textContent ?? ""), null, { timeout: 30_000 });
  await tool(page).getByText("Keep as is", { exact: true }).click();
  await tool(page).getByText("PNG", { exact: true }).click();
  await page.getByRole("button", { name: /Create signature/ }).click();
  await waitResult(page);
  info = await inspect(page, (await download(page)).buf);
  check("signature: transparent PNG input kept transparent", info.corner[3] === 0);

  await upload(page, "signature-small.png");
  await page.waitForFunction(() => /signature-small/.test(document.querySelector('section[aria-label="Image and settings"]')?.textContent ?? ""), null, { timeout: 30_000 });
  await page.locator("#sig-width").fill("240");
  await page.getByRole("button", { name: /Create signature/ }).click();
  await waitResult(page);
  info = await inspect(page, (await download(page)).buf);
  check("signature: small signature enlarged to 240 px", info.width === 240, `${info.width}×${info.height}`);
  await page.screenshot({ path: path.join(OUT, "signature-desktop.png"), fullPage: true });
  await page.close();
}

// ---------------------------------------------------------------- Bulk resizer
async function bulkRun(page, names, { width = "800", expectDone, expectFailed = 0 }) {
  await upload(page, ...names);
  await page.waitForFunction(() => !/checking files/.test(document.querySelector('section[aria-label="Batch settings"]')?.textContent ?? ""), null, { timeout: 180_000 });
  await page.locator("#bulk-width").fill(width);
  const started = Date.now();
  await page.getByRole("button", { name: /^Resize all/ }).click();
  await page.waitForFunction(
    (n) => new RegExp(`Completed: ${n}\\b`).test(document.querySelector('[role="status"][aria-live="polite"]')?.textContent ?? "") && !/Processing/.test(document.querySelector('[role="status"][aria-live="polite"]')?.textContent ?? ""),
    expectDone,
    { timeout: 300_000 },
  );
  const status = await page.locator('[role="status"][aria-live="polite"]').innerText();
  return { ms: Date.now() - started, status, failedOk: new RegExp(`Failed: ${expectFailed}\\b`).test(status) };
}
{
  const route = "/tools/bulk-image-resizer";
  let page = await openPage(route);
  let run = await bulkRun(page, ["photo.jpeg"], { expectDone: 1 });
  const single = await download(page, page.getByRole("link", { name: /^Download photo/ }));
  const singleInfo = await inspect(page, single.buf);
  check("bulk: single image resized to 800 wide", singleInfo.width === 800 && singleInfo.height === 600, `${singleInfo.width}×${singleInfo.height} ${run.ms} ms`);
  await page.getByRole("button", { name: "Clear all" }).click();

  const ten = ["photo.jpeg", "photo-12mp.jpg", "tall.jpg", "photo.png", "graphic.png", "transparent.png", "opaque-logo.png", "wide.png", "photo.webp", "example.heic", "corrupt.jpg"];
  run = await bulkRun(page, ten, { expectDone: 10, expectFailed: 0 });
  const invalid = await page.locator("li").filter({ hasText: "corrupt.jpg" }).filter({ hasText: "Can't open" }).count();
  check("bulk: 10 mixed images (incl. HEIC) + 1 corrupt: 10 done, corrupt flagged", invalid === 1 && run.failedOk, `${run.status.replace(/\n/g, " ")} in ${run.ms} ms`);
  check("bulk: corrupt file has a readable reason", /damaged|valid image|couldn't/i.test(await page.locator("li").filter({ hasText: "corrupt.jpg" }).innerText()));
  const zip = await download(page, page.getByRole("button", { name: /Download all \(10\) as ZIP/ }));
  fs.writeFileSync(path.join(OUT, "batch.zip"), zip.buf);
  const tar = process.platform === "win32" ? "C:\\Windows\\System32\\tar.exe" : "bsdtar";
  const listing = execFileSync(tar, ["-tf", "batch.zip"], { cwd: OUT, encoding: "utf8" }).trim().split(/\r?\n/);
  check("bulk: ZIP contains 10 uniquely named files", zip.name === "resized-images.zip" && listing.length === 10 && new Set(listing).size === 10 && listing.every((n) => !n.includes("/")), listing.slice(0, 3).join(", "));
  check("bulk: HEIC saved as JPG in the ZIP", listing.some((n) => /^example-800x\d+\.jpg$/.test(n)), listing.find((n) => n.startsWith("example")));
  await page.screenshot({ path: path.join(OUT, "bulk-desktop.png"), fullPage: true });

  // Remove one file.
  await page.getByRole("button", { name: "Remove corrupt.jpg" }).click();
  check("bulk: remove individual file", (await page.getByText(/11 images selected|10 images selected/).innerText()).startsWith("10"));
  await page.close();

  page = await openPage(route);
  const fifty = [];
  const pool = ["photo.jpeg", "photo.png", "graphic.png", "photo.webp", "transparent.png"];
  for (let i = 0; i < 50; i++) {
    const src = files[pool[i % pool.length]];
    const name = `batch-${String(i).padStart(2, "0")}${path.extname(src)}`;
    const dest = path.join(FIX, name);
    if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
    files[name] = dest;
    fifty.push(name);
  }
  run = await bulkRun(page, fifty, { width: "640", expectDone: 50 });
  check("bulk: 50 images processed without failures", run.failedOk, `${run.ms} ms`);
  const memory = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? 0);
  console.log(`INFO  bulk 50 images: ${run.ms} ms, JS heap ${(memory / 1024 / 1024).toFixed(0)} MB`);
  await page.close();
}

// ---------------------------------------------------------------- Keyboard and labels
{
  const page = await openPage("/tools/image-cropper");
  await upload(page, "photo.jpeg");
  await page.locator('[data-crop-role="move"]').waitFor();
  let reached = false;
  for (let i = 0; i < 60 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => document.activeElement?.getAttribute("data-crop-role") === "move");
  }
  check("a11y: crop area reachable by keyboard", reached);
  const unlabeled = await page.evaluate(() =>
    [...document.querySelectorAll("input, select, button")].filter((el) => {
      if (el.type === "file" || el.type === "hidden") return false;
      const id = el.id;
      return !(el.getAttribute("aria-label") || el.closest("label") || (id && document.querySelector(`label[for="${id}"]`)) || el.textContent.trim());
    }).length,
  );
  check("a11y: every control on the cropper has a label", unlabeled === 0, `${unlabeled} unlabeled`);
  await page.close();
}

check("privacy: no cross-origin or non-GET requests during all tests", offending.length === 0, offending.slice(0, 5).join(", "));
check("console: no errors on any page (including CSP violations)", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
