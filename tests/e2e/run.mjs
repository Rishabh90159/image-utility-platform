// End-to-end tests in a real browser (Microsoft Edge or Chrome via playwright-core).
// Usage: start the production server (npm run build && npx next start -p 3100), then
//   node tests/e2e/run.mjs
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { generateFixtures } from "./fixtures.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CHANNEL = process.env.BROWSER_CHANNEL || "msedge";
const OUT = "tests/e2e/output";
const KB = 1024;
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
const files = await generateFixtures(browser, "tests/fixtures/generated");
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });

// Privacy monitor: every request must be a same-origin GET.
const origin = new URL(BASE).origin;
const offending = [];
context.on("request", (req) => {
  const url = req.url();
  if (!/^https?:/.test(url)) return; // blob:, data: and the browser's own download UI
  if (new URL(url).origin !== origin || req.method() !== "GET") offending.push(`${req.method()} ${url}`);
});

const consoleErrors = [];
async function openPage(route) {
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${route}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`${route}: ${err.message}`));
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  return page;
}

async function upload(page, name) {
  await page.locator('input[type="file"]').first().setInputFiles(files[name]);
}

/** Uploads a valid image and waits until the tool shows it as the current image. */
async function loadImage(page, name) {
  await upload(page, name);
  await page.waitForFunction(
    (n) => [...document.querySelectorAll('section[aria-label="Image and settings"] p')].some((p) => p.textContent === n),
    name,
    { timeout: 60_000 },
  );
}

async function waitResult(page, timeout = 90_000) {
  await page.locator("#result-heading").waitFor({ timeout });
  await page.locator('section[aria-labelledby="result-heading"] a[download]').waitFor({ timeout });
}

async function shownBytes(page) {
  const text = await page.locator("#result-heading + p").innerText();
  return Number(text.match(/\(([\d,]+) bytes\)/)[1].replace(/,/g, ""));
}

async function download(page) {
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.locator('section[aria-labelledby="result-heading"] a[download]').click(),
  ]);
  const buf = fs.readFileSync(await dl.path());
  return { name: dl.suggestedFilename(), buf };
}

function kind(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  return "unknown";
}

/** Decodes bytes in the browser; returns size and RGBA of the corner and centre pixels. */
async function inspect(page, buf) {
  return page.evaluate(async (b64) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([bytes]));
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = c.getContext("2d");
    ctx.drawImage(bmp, 0, 0);
    const px = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
    return { width: bmp.width, height: bmp.height, corner: px(0, 0), centre: px(Math.floor(bmp.width / 2), Math.floor(bmp.height / 2)) };
  }, buf.toString("base64"));
}

async function alertText(page) {
  // Ignore Next.js's empty route announcer, which also has role="alert".
  const alert = page.locator('[role="alert"]').filter({ hasText: /\S/ }).first();
  await alert.waitFor({ timeout: 20_000 });
  return alert.innerText();
}

const ui = (page) => page.getByRole("region", { name: "Image and settings" });
const near = (a, b, tol = 12) => Math.abs(a - b) <= tol;

// ---------------------------------------------------------------- Image resizer
{
  const route = "/tools/image-resizer";
  let page = await openPage(route);
  await upload(page, "photo-12mp.jpg");
  await page.locator("#resize-width").waitFor();
  await page.locator("#resize-width").fill("1920");
  check("resizer: aspect lock updates height", (await page.locator("#resize-height").inputValue()) === "1440");
  await page.getByRole("button", { name: "Resize image" }).click();
  await waitResult(page);
  let bytes = await shownBytes(page);
  let dl = await download(page);
  let info = await inspect(page, dl.buf);
  check("resizer: 12MP JPG → 1920×1440 JPG", kind(dl.buf) === "jpeg" && info.width === 1920 && info.height === 1440, `${info.width}×${info.height}`);
  check("resizer: shown size equals downloaded size", bytes === dl.buf.length, `${bytes} vs ${dl.buf.length}`);
  check("resizer: download file name", dl.name === "photo-12mp-1920x1440.jpg", dl.name);
  await page.screenshot({ path: path.join(OUT, "resizer-desktop.png"), fullPage: false });

  // Percentage mode, transparent PNG stays PNG with alpha.
  await loadImage(page, "transparent.png");
  await ui(page).getByText("Percentage", { exact: true }).click();
  await page.locator("#resize-percent").fill("50");
  await page.getByRole("button", { name: "Resize image" }).click();
  await waitResult(page);
  dl = await download(page);
  info = await inspect(page, dl.buf);
  check("resizer: 50% of transparent PNG keeps alpha", kind(dl.buf) === "png" && info.width === 400 && info.height === 300 && info.corner[3] === 0, `${info.width}×${info.height} corner α=${info.corner[3]}`);

  // WebP → JPG with pixel mode.
  await loadImage(page, "photo.webp");
  await ui(page).getByText("Pixels", { exact: true }).click();
  await page.locator("#resize-width").fill("600");
  await ui(page).getByText("JPG", { exact: true }).click();
  await page.getByRole("button", { name: "Resize image" }).click();
  await waitResult(page);
  dl = await download(page);
  info = await inspect(page, dl.buf);
  check("resizer: WebP → 600×400 JPG", kind(dl.buf) === "jpeg" && info.width === 600 && info.height === 400, `${info.width}×${info.height}`);

  // Fresh page for the remaining cases (resets format choice).
  await page.close();
  page = await openPage(route);
  for (const [name, width, expectW, expectH] of [
    ["tiny.jpg", "1", 1, 1],
    ["tall.jpg", "100", 100, 1000],
    ["wide.png", "1500", 1500, 100],
    ["one-pixel.png", "100", 100, 100],
    ["huge-flat.png", "1920", 1920, 1493],
  ]) {
    await loadImage(page, name);
    await page.locator("#resize-width").waitFor({ timeout: 30_000 });
    await page.waitForFunction((n) => document.body.innerText.includes(n), name);
    await page.locator("#resize-width").fill(width);
    await page.getByRole("button", { name: /Resize (image|again)/ }).click();
    await waitResult(page);
    dl = await download(page);
    info = await inspect(page, dl.buf);
    check(`resizer: ${name} → ${expectW}×${expectH}`, info.width === expectW && info.height === expectH, `${info.width}×${info.height}`);
  }

  await page.locator("#resize-width").fill("20000");
  const disabled = await page.getByRole("button", { name: /Resize/ }).isDisabled();
  check("resizer: oversize output blocked with message", disabled && (await page.locator("#resize-dims-error").innerText()).includes("16,384"));
  await page.locator("#resize-width").fill("abc");
  check("resizer: non-numeric width blocked", await page.getByRole("button", { name: /Resize/ }).isDisabled());
  await page.close();
}

// ---------------------------------------------------------------- Invalid files (shared validation, tested on resizer)
{
  const page = await openPage("/tools/image-resizer");
  const expectations = [
    ["empty.jpg", "empty"],
    ["not-an-image.png", "doesn't look like a valid image"],
    ["notes.txt", "isn't an image"],
    ["corrupt.jpg", "couldn't open this image"],
    ["truncated.png", "couldn't open this image"],
    ["iphone.heic", "HEIC"],
    ["too-many-pixels.png", "12,000 × 10,000"],
  ];
  for (const [name, snippet] of expectations) {
    await page.reload({ waitUntil: "networkidle" });
    await upload(page, name);
    const text = await alertText(page);
    check(`errors: ${name} shows a clear message`, text.includes(snippet) && !/at\s+\w+\s+\(|TypeError|DOMException/.test(text), text.replace(/\s+/g, " ").slice(0, 120));
  }
  await page.close();
}

// ---------------------------------------------------------------- Image compressor
{
  const route = "/tools/image-compressor";
  const page = await openPage(route);

  await upload(page, "photo-12mp.jpg");
  await waitResult(page);
  let bytes = await shownBytes(page);
  let dl = await download(page);
  let info = await inspect(page, dl.buf);
  const original = fs.statSync(files["photo-12mp.jpg"]).size;
  check("compressor: auto JPG is smaller, same dimensions", kind(dl.buf) === "jpeg" && dl.buf.length < original && info.width === 4000 && info.height === 3000, `${original} → ${dl.buf.length}`);
  check("compressor: shown size equals downloaded size", bytes === dl.buf.length);
  const autoSize = dl.buf.length;
  await page.screenshot({ path: path.join(OUT, "compressor-desktop.png"), fullPage: true });

  await ui(page).getByText("Manual", { exact: true }).click();
  await page.locator('input[type="range"]').fill("30");
  await page.getByRole("button", { name: /Compress/ }).click();
  await waitResult(page);
  dl = await download(page);
  check("compressor: manual 30% smaller than auto 75%", dl.buf.length < autoSize, `${dl.buf.length} < ${autoSize}`);

  for (const name of ["graphic.png", "transparent.png", "photo.png"]) {
    await page.reload({ waitUntil: "networkidle" });
    await upload(page, name);
    await waitResult(page);
    bytes = await shownBytes(page);
    dl = await download(page);
    info = await inspect(page, dl.buf);
    const orig = fs.statSync(files[name]).size;
    const indexed = dl.buf[25] === 3;
    check(`compressor: ${name} → palette PNG, smaller`, kind(dl.buf) === "png" && indexed && dl.buf.length < orig && bytes === dl.buf.length, `${orig} → ${dl.buf.length} (${(100 * (1 - dl.buf.length / orig)).toFixed(1)}% saved)`);
    if (name === "transparent.png") check("compressor: transparency preserved", info.corner[3] === 0 && info.centre[3] === 255, `corner α=${info.corner[3]} centre α=${info.centre[3]}`);
  }

  // PNG → WebP
  await page.reload({ waitUntil: "networkidle" });
  await upload(page, "photo.png");
  await waitResult(page);
  await ui(page).getByText("WebP", { exact: true }).click();
  await page.getByRole("button", { name: /Compress/ }).click();
  await waitResult(page);
  dl = await download(page);
  check("compressor: PNG photo → WebP", kind(dl.buf) === "webp" && dl.buf.length < fs.statSync(files["photo.png"]).size, `${dl.buf.length} bytes`);

  // Lossless PNG option
  await ui(page).getByText("Keep PNG", { exact: true }).click();
  await ui(page).getByText("Manual", { exact: true }).click();
  await ui(page).getByText("Lossless", { exact: true }).click();
  await page.getByRole("button", { name: /Compress/ }).click();
  await waitResult(page);
  dl = await download(page);
  check("compressor: lossless PNG option produces truecolour PNG", kind(dl.buf) === "png" && dl.buf[25] !== 3);

  // Already-compressed JPG: must warn instead of claiming savings.
  await page.reload({ waitUntil: "networkidle" });
  await upload(page, "low-quality.jpg");
  await waitResult(page);
  const lowOrig = fs.statSync(files["low-quality.jpg"]).size;
  bytes = await shownBytes(page);
  const statusText = await page.locator('section[aria-labelledby="result-heading"]').innerText();
  if (bytes >= lowOrig) check("compressor: warns when result isn't smaller", statusText.includes("already well compressed"), `${lowOrig} → ${bytes}`);
  else check("compressor: low-quality JPG still reports real saving", statusText.includes("smaller"), `${lowOrig} → ${bytes}`);
  await page.close();
}

// ---------------------------------------------------------------- Resize to KB
{
  const route = "/tools/resize-image-to-kb";
  const page = await openPage(route);
  await upload(page, "photo-12mp.jpg");
  const original = fs.statSync(files["photo-12mp.jpg"]).size;
  for (const kb of [20, 50, 100, 200, 500]) {
    await ui(page).getByText(`${kb} KB`, { exact: true }).click();
    const started = Date.now();
    await page.getByRole("button", { name: `Resize to ${kb}.0 KB` }).or(page.getByRole("button", { name: `Resize to ${kb} KB` })).click();
    await waitResult(page, 120_000);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    const bytes = await shownBytes(page);
    const dl = await download(page);
    const info = await inspect(page, dl.buf);
    const text = await page.locator('section[aria-labelledby="result-heading"]').innerText();
    check(
      `kb: 12MP photo → ${kb} KB`,
      dl.buf.length <= kb * KB && bytes === dl.buf.length && text.includes("within your") && kind(dl.buf) === "jpeg",
      `${dl.buf.length} bytes (${((dl.buf.length / (kb * KB)) * 100).toFixed(1)}% of budget), ${info.width}×${info.height}, ${seconds}s`,
    );
  }
  await page.screenshot({ path: path.join(OUT, "kb-desktop.png"), fullPage: true });

  // Custom sizes
  await ui(page).getByText("Custom", { exact: true }).click();
  await page.locator("#target-custom").fill("75");
  await page.getByRole("button", { name: /Resize to/ }).click();
  await waitResult(page, 120_000);
  let dl = await download(page);
  check("kb: custom 75 KB", dl.buf.length <= 75 * KB, `${dl.buf.length} bytes`);

  await page.locator("#target-custom").fill("1.5");
  await page.locator("#target-unit").selectOption("MB");
  await page.getByRole("button", { name: /Resize to/ }).click();
  await waitResult(page, 120_000);
  dl = await download(page);
  let info = await inspect(page, dl.buf);
  check("kb: custom 1.5 MB keeps full dimensions", dl.buf.length <= 1.5 * 1024 * KB && info.width === 4000, `${dl.buf.length} bytes, ${info.width}×${info.height}`);

  // Impossible without resizing.
  await page.locator("#target-unit").selectOption("KB");
  await page.locator("#target-custom").fill("20");
  await ui(page).getByText("Allow smaller dimensions").click();
  await page.getByRole("button", { name: /Resize to/ }).click();
  await waitResult(page, 120_000);
  let bytes = await shownBytes(page);
  let text = await page.locator('section[aria-labelledby="result-heading"]').innerText();
  check("kb: impossible target reports closest achievable size", bytes > 20 * KB && text.includes("Closest achievable size") && !text.includes("within your"), `${bytes} bytes`);
  await ui(page).getByText("Allow smaller dimensions").click();

  // Validation
  await page.locator("#target-custom").fill("abc");
  check("kb: invalid custom target blocked", await page.getByRole("button", { name: /Resize/ }).isDisabled());
  await page.locator("#target-custom").fill("1");
  check("kb: below-minimum target blocked", (await page.locator("#target-custom-help").innerText()).includes("smallest target is 2 KB"));

  // Very small target with resizing allowed.
  await page.locator("#target-custom").fill("3");
  await page.getByRole("button", { name: /Resize to/ }).click();
  await waitResult(page, 120_000);
  bytes = await shownBytes(page);
  text = await page.locator('section[aria-labelledby="result-heading"]').innerText();
  const honest = (bytes <= 3 * KB && text.includes("within your")) || (bytes > 3 * KB && text.includes("Closest achievable"));
  check("kb: 3 KB target result is reported honestly", honest, `${bytes} bytes`);

  // Already under the target: the original is returned unchanged.
  await loadImage(page, "tiny.jpg");
  await ui(page).getByText("20 KB", { exact: true }).click();
  await page.getByRole("button", { name: /Resize to/ }).click();
  await waitResult(page);
  dl = await download(page);
  text = await page.locator('section[aria-labelledby="result-heading"]').innerText();
  check("kb: image already under target returned unchanged", dl.buf.equals(fs.readFileSync(files["tiny.jpg"])) && text.includes("Already under your target"));

  // Transparent PNG → 50 KB JPG with white background; WebP output.
  await loadImage(page, "transparent.png");
  await ui(page).getByText("50 KB", { exact: true }).click();
  await page.getByRole("button", { name: /Resize to/ }).click();
  await waitResult(page, 120_000);
  dl = await download(page);
  info = await inspect(page, dl.buf);
  check("kb: transparent PNG → 50 KB JPG on white", kind(dl.buf) === "jpeg" && dl.buf.length <= 50 * KB && info.corner.slice(0, 3).every((v) => v > 240), `${dl.buf.length} bytes, corner ${info.corner}`);

  await loadImage(page, "photo.webp");
  await ui(page).getByText("100 KB", { exact: true }).click();
  await page.locator("label", { hasText: /^WebP$/ }).click();
  await page.getByRole("button", { name: /Resize to/ }).click();
  await waitResult(page, 120_000);
  dl = await download(page);
  check("kb: WebP output under 100 KB", kind(dl.buf) === "webp" && dl.buf.length <= 100 * KB, `${dl.buf.length} bytes`);
  await page.close();

  // Query parameter preselects a target.
  const q = await openPage("/tools/resize-image-to-kb?target=50");
  await upload(q, "photo.jpeg");
  await q.getByRole("button", { name: /Resize to 50/ }).waitFor();
  check("kb: ?target=50 preselects 50 KB", true);
  await q.close();
}

// ---------------------------------------------------------------- JPG → PNG
{
  const page = await openPage("/tools/jpg-to-png");
  await upload(page, "photo.jpeg");
  await waitResult(page);
  const bytes = await shownBytes(page);
  const dl = await download(page);
  const info = await inspect(page, dl.buf);
  check("jpg-to-png: converts with same dimensions", kind(dl.buf) === "png" && info.width === 1600 && info.height === 1200 && bytes === dl.buf.length);
  check("jpg-to-png: file name", dl.name === "photo-converted.png", dl.name);
  check("jpg-to-png: explains larger PNG", (await page.locator('section[aria-labelledby="result-heading"]').innerText()).includes("larger than the original"));

  await upload(page, "transparent.png");
  const text = await alertText(page);
  check("jpg-to-png: PNG input rejected with reverse link", text.includes("already a PNG") && (await page.getByRole("link", { name: "Convert PNG to JPG instead" }).count()) === 1);
  await page.close();
}

// ---------------------------------------------------------------- PNG → JPG
{
  const page = await openPage("/tools/png-to-jpg");
  await upload(page, "transparent.png");
  await waitResult(page);
  let dl = await download(page);
  let info = await inspect(page, dl.buf);
  check("png-to-jpg: transparency → white by default", kind(dl.buf) === "jpeg" && info.corner.slice(0, 3).every((v) => v > 245), `corner ${info.corner}`);
  check("png-to-jpg: background options shown for transparent PNG", await ui(page).getByText("This image has transparent areas").isVisible());
  await page.screenshot({ path: path.join(OUT, "png-to-jpg-desktop.png"), fullPage: true });

  await ui(page).getByText("Black", { exact: true }).click();
  check("png-to-jpg: changing settings hides stale result", (await page.locator("#result-heading").count()) === 0);
  await page.getByRole("button", { name: /Convert to JPG/ }).click();
  await waitResult(page);
  dl = await download(page);
  info = await inspect(page, dl.buf);
  check("png-to-jpg: black background", info.corner.slice(0, 3).every((v) => v < 10), `corner ${info.corner}`);

  await ui(page).getByText("Custom", { exact: true }).click();
  await page.locator('input[type="color"]').fill("#ff0000");
  await page.getByRole("button", { name: /Convert to JPG/ }).click();
  await waitResult(page);
  dl = await download(page);
  info = await inspect(page, dl.buf);
  check("png-to-jpg: custom red background", near(info.corner[0], 254) && info.corner[1] < 12 && info.corner[2] < 12, `corner ${info.corner}`);

  await page.locator('input[type="range"]').fill("50");
  await page.getByRole("button", { name: /Convert to JPG/ }).click();
  await waitResult(page);
  const q50 = (await download(page)).buf.length;
  check("png-to-jpg: lower quality → smaller file", q50 < dl.buf.length, `${q50} < ${dl.buf.length}`);

  await upload(page, "graphic.png");
  await page.waitForFunction(() => document.body.innerText.includes("graphic.png"));
  await waitResult(page);
  check("png-to-jpg: opaque PNG needs no background", await ui(page).getByText("No transparent pixels found").isVisible());

  await upload(page, "photo.jpeg");
  const text = await alertText(page);
  check("png-to-jpg: JPG input rejected", text.includes("already a JPG"));
  await page.close();
}

// ---------------------------------------------------------------- Mobile layout
{
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
  for (const route of ["/", "/tools/resize-image-to-kb", "/tools/image-resizer"]) {
    const page = await mobile.newPage();
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`mobile: no horizontal scroll on ${route}`, overflow <= 0, `overflow ${overflow}px`);
    if (route === "/tools/resize-image-to-kb") {
      await page.locator('input[type="file"]').first().setInputFiles(files["photo.jpeg"]);
      await page.getByRole("button", { name: /Resize to/ }).click();
      await page.locator("#result-heading").waitFor({ timeout: 60_000 });
      const overflowAfter = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check("mobile: KB tool result fits the screen", overflowAfter <= 0, `overflow ${overflowAfter}px`);
      await page.screenshot({ path: path.join(OUT, "kb-mobile.png"), fullPage: true });
    } else {
      await page.screenshot({ path: path.join(OUT, `mobile${route.replace(/\//g, "-") || "-home"}.png`), fullPage: true });
    }
    await page.close();
  }
  await mobile.close();
}

// ---------------------------------------------------------------- Keyboard access
{
  const page = await openPage("/tools/image-compressor");
  let reached = false;
  for (let i = 0; i < 30 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => document.activeElement?.getAttribute("type") === "file");
  }
  const ring = await page.evaluate(() => {
    const label = document.querySelector(`label[for="${document.activeElement.id}"]`);
    return label ? getComputedStyle(label).outlineStyle : "none";
  });
  check("a11y: upload control reachable by keyboard with visible focus", reached && ring !== "none", `outline ${ring}`);
  await page.close();
}

check("privacy: no cross-origin or non-GET requests during all tests", offending.length === 0, offending.slice(0, 5).join(", "));
check("console: no errors on any page", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
