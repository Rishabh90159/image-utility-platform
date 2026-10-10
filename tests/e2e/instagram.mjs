// End-to-end tests for the Instagram Image Resizer in a real browser.
// Usage: start the production server (npm run build && npx next start -p 3100), then
//   node tests/e2e/instagram.mjs
// Run tests/e2e/run.mjs (or phase5.mjs) once first so the shared fixtures exist.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const SITE = process.env.EXPECTED_SITE_URL || "https://www.example.com";
const CHANNEL = process.env.BROWSER_CHANNEL || "msedge";
const ROUTE = "/tools/instagram-image-resizer";
const FIX = "tests/fixtures/generated/instagram";
const OUT = "tests/e2e/output/instagram";
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

async function openPage(route = ROUTE, ctx = context) {
  const page = await ctx.newPage();
  page.on("console", (msg) => msg.type() === "error" && consoleErrors.push(`${route}: ${msg.text()}`));
  page.on("pageerror", (err) => consoleErrors.push(`${route}: ${err.message}`));
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  return page;
}

/** Visually hidden radios inside labels: click the label like a user does. */
async function pick(page, name) {
  await page.getByRole("radio", { name, exact: typeof name === "string" }).locator("xpath=..").click();
}

async function create(page) {
  await page.getByRole("button", { name: /^(Create Instagram image|Create again)$/ }).click();
  await page.getByRole("heading", { name: "Your Instagram image" }).waitFor({ timeout: 30000 });
}

async function download(page, name = /^Download (JPG|PNG|WebP)$/) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name }).first().click()]);
  const file = path.join(OUT, dl.suggestedFilename());
  await dl.saveAs(file);
  return { name: dl.suggestedFilename(), bytes: fs.readFileSync(file) };
}

/** Decodes a downloaded file in the browser and samples pixels at fractional positions. */
async function inspect(page, bytes, points = []) {
  return page.evaluate(
    async ({ data, points }) => {
      const bmp = await createImageBitmap(new Blob([new Uint8Array(data)]));
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const g = c.getContext("2d");
      g.drawImage(bmp, 0, 0);
      return {
        width: bmp.width,
        height: bmp.height,
        samples: points.map(([fx, fy]) => [...g.getImageData(Math.min(bmp.width - 1, Math.floor(fx * bmp.width)), Math.min(bmp.height - 1, Math.floor(fy * bmp.height)), 1, 1).data]),
      };
    },
    { data: [...bytes], points },
  );
}

const near = (px, rgb, tol = 24) => px.slice(0, 3).every((v, i) => Math.abs(v - rgb[i]) <= tol);
const kind = (b) => (b[0] === 0xff && b[1] === 0xd8 ? "jpeg" : b[1] === 0x50 && b[2] === 0x4e ? "png" : b.subarray(8, 12).toString() === "WEBP" ? "webp" : "?");

// ---------- Fixtures drawn by the browser ----------
const fx = await openPage("/about");
const made = await fx.evaluate(async () => {
  const enc = async (c, type, q) => [...new Uint8Array(await (await new Promise((r) => c.toBlob(r, type, q))).arrayBuffer())];
  const canvas = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });
  // 4:3 landscape: green field, red square in the centre, blue strip down the left edge.
  const land = canvas(2400, 1800);
  let g = land.getContext("2d");
  g.fillStyle = "#2e8b57";
  g.fillRect(0, 0, 2400, 1800);
  g.fillStyle = "#d62828";
  g.fillRect(900, 600, 600, 600);
  g.fillStyle = "#1d4ed8";
  g.fillRect(0, 0, 200, 1800);
  const small = canvas(400, 300);
  g = small.getContext("2d");
  g.fillStyle = "#2e8b57";
  g.fillRect(0, 0, 400, 300);
  return { landscape: await enc(land, "image/jpeg", 0.92), small: await enc(small, "image/jpeg", 0.9) };
});
await fx.close();
const files = { landscape: path.join(FIX, "landscape.jpg"), small: path.join(FIX, "small.jpg") };
for (const [k, f] of Object.entries(files)) fs.writeFileSync(f, Buffer.from(made[k]));

// ---------- Page, metadata and empty state ----------
{
  const res = await fetch(BASE + ROUTE, { redirect: "manual" });
  const html = await res.text();
  const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"');
  check("page returns 200", res.status === 200, String(res.status));
  check("title", decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "") === "Instagram Image Resizer Online Free | Imgifyr");
  check("canonical", html.includes(`<link rel="canonical" href="${SITE}${ROUTE}"/>`));
  check("indexable (no noindex)", !/<meta name="robots" content="[^"]*noindex/.test(html));
  check("one H1: Instagram Image Resizer", (html.match(/<h1[\s>]/g) ?? []).length === 1 && /<h1[^>]*>Instagram Image Resizer<\/h1>/.test(html));
  check("size table rendered in HTML", /1080 × 1350/.test(html) && /1080 × 1920/.test(html) && /1\.91:1/.test(html));
  const slash = await fetch(BASE + ROUTE + "/", { redirect: "manual" });
  check("trailing slash redirects to the canonical path", [301, 308].includes(slash.status), `${slash.status} → ${slash.headers.get("location")}`);
  const sitemap = await (await fetch(BASE + "/sitemap.xml")).text();
  check("in sitemap", sitemap.includes(`<loc>${SITE}${ROUTE}</loc>`));
  const resizer = await (await fetch(BASE + "/tools/image-resizer")).text();
  const home = await (await fetch(BASE + "/")).text();
  check("linked from the image resizer and homepage", resizer.includes(`href="${ROUTE}"`) && home.includes(`href="${ROUTE}"`));

  const page = await openPage();
  check("empty state: upload area and size picker", (await page.getByText("Choose image", { exact: true }).isVisible()) && (await page.getByText("Drop your photo here").isVisible()) && (await page.getByRole("radio", { name: /Story/ }).count()) === 1);
  check("empty state: formats, limit and privacy shown", /JPG, PNG, WebP, HEIC · up to 50 MB/.test(await page.locator("main").innerText()) && /never leaves your device/.test(await page.locator("main").innerText()));
  await page.screenshot({ path: path.join(OUT, "empty-desktop.png") });

  // Keyboard: the preset radios are reachable and arrow keys change the selection.
  await page.getByRole("radio", { name: /Portrait post/ }).focus();
  await page.keyboard.press("ArrowRight");
  const checked = await page.getByRole("radio", { checked: true }).first().evaluate((el) => el.value);
  check("keyboard: arrow keys move between presets", checked !== "portrait", checked);
  await page.close();
}

// ---------- Every preset: exact output dimensions (crop mode) ----------
const page = await openPage();
await page.locator('input[type="file"]').first().setInputFiles(files.landscape);
await page.getByRole("button", { name: "Create Instagram image" }).waitFor();
const presets = [
  [/^Square post/, 1080, 1080, "square"],
  [/^Portrait post/, 1080, 1350, "portrait"],
  [/^Tall portrait post/, 1080, 1440, "tall"],
  [/^Landscape post/, 1080, 566, "landscape"],
  [/^Story/, 1080, 1920, "story"],
  [/^Reel cover/, 1080, 1920, "reel-cover"],
];
for (const [name, w, h, id] of presets) {
  await pick(page, name);
  await create(page);
  const dl = await download(page);
  const info = await inspect(page, dl.bytes, [[0.5, 0.5]]);
  check(`preset ${id}: exactly ${w} × ${h}`, info.width === w && info.height === h, `${info.width}×${info.height}`);
  check(`preset ${id}: descriptive file name`, dl.name === `landscape-instagram-${id}-${w}x${h}.jpg`, dl.name);
  check(`preset ${id}: crop keeps the centre`, near(info.samples[0], [214, 40, 40], 40), JSON.stringify(info.samples[0]));
}
{
  await pick(page, /^Tall portrait post/);
  check("tall preset: publishing-method note visible", /depend on the app version and how you publish/.test(await page.locator("main").innerText()));
  await pick(page, /^Story/);
  await create(page);
  check("story: safe-area guide on the result preview", await page.getByText("Often covered by Instagram's interface").first().isVisible());
  await page.screenshot({ path: path.join(OUT, "story-result.png"), fullPage: false });
  await pick(page, /^Reel cover/);
  check("reel cover: grid guide on the crop/fit preview controls", await page.getByText("Show profile grid crop guide").isVisible());
}

// ---------- Crop vs fit ----------
await pick(page, /^Portrait post/);
await create(page);
let dl = await download(page);
let info = await inspect(page, dl.bytes, [[0.5, 0.05]]);
check("crop: top of a portrait frame is filled with photo", near(info.samples[0], [46, 139, 87], 40), JSON.stringify(info.samples[0]));

await pick(page, "Fit whole photo");
await page.locator('[role="img"][aria-label^="Preview"]').waitFor();
check("fit: live preview of the framed photo", await page.locator('[role="img"][aria-label^="Preview"]').isVisible());
await create(page);
dl = await download(page);
info = await inspect(page, dl.bytes, [[0.5, 0.05], [0.5, 0.95], [0.5, 0.5], [0.02, 0.5]]);
check("fit: exact 1080 × 1350 output", info.width === 1080 && info.height === 1350);
check("fit: white padding above and below, photo not cropped", near(info.samples[0], [255, 255, 255], 6) && near(info.samples[1], [255, 255, 255], 6) && near(info.samples[2], [214, 40, 40], 40) && near(info.samples[3], [29, 78, 216], 45), JSON.stringify(info.samples));
// Never stretched: the photo band is 1080 × 810 (4:3) inside the frame.
const band = await page.evaluate(async (data) => {
  const bmp = await createImageBitmap(new Blob([new Uint8Array(data)]));
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const g = c.getContext("2d");
  g.drawImage(bmp, 0, 0);
  const col = g.getImageData(540, 0, 1, bmp.height).data;
  let first = -1, last = -1;
  for (let y = 0; y < bmp.height; y++) {
    const white = col[y * 4] > 245 && col[y * 4 + 1] > 245 && col[y * 4 + 2] > 245;
    if (!white) { if (first < 0) first = y; last = y; }
  }
  return { first, last };
}, [...dl.bytes]);
check("fit: photo keeps its 4:3 shape (not stretched)", Math.abs(band.last - band.first + 1 - 810) <= 3, JSON.stringify(band));

await pick(page, "Black");
await create(page);
info = await inspect(page, (await download(page)).bytes, [[0.5, 0.05]]);
check("fit: black background", near(info.samples[0], [0, 0, 0], 8), JSON.stringify(info.samples[0]));

await pick(page, "Blurred photo");
await create(page);
info = await inspect(page, (await download(page)).bytes, [[0.5, 0.03], [0.5, 0.5]]);
check("fit: blurred background uses the photo's colours", near(info.samples[0], [46, 139, 87], 70) && !near(info.samples[0], [255, 255, 255], 30), JSON.stringify(info.samples[0]));
await page.screenshot({ path: path.join(OUT, "fit-blur.png") });

await pick(page, "White");
await page.locator('input[type="range"]').first().fill("0");
await create(page);
info = await inspect(page, (await download(page)).bytes, [[0.5, 0.02], [0.5, 0.97]]);
check("fit: position moves the photo to the top", !near(info.samples[0], [255, 255, 255], 6) && near(info.samples[1], [255, 255, 255], 6), JSON.stringify(info.samples));
await page.locator('input[type="range"]').first().fill("50");
await page.locator("#ig-border").fill("10");
await create(page);
info = await inspect(page, (await download(page)).bytes, [[0.03, 0.5], [0.5, 0.5]]);
check("fit: border adds space on the sides too", near(info.samples[0], [255, 255, 255], 6) && near(info.samples[1], [214, 40, 40], 40), JSON.stringify(info.samples));
await page.locator("#ig-border").fill("0");
await pick(page, "Crop to fill");

// ---------- Custom size and aspect lock ----------
await pick(page, "Custom size");
check("custom: starts from the previous preset", (await page.locator("#ig-width").inputValue()) === "1080" && (await page.locator("#ig-height").inputValue()) === "1350");
await page.locator("#ig-width").fill("800");
check("custom: locked ratio updates the height", (await page.locator("#ig-height").inputValue()) === "1000");
await page.getByText("Lock aspect ratio").click();
await page.locator("#ig-height").fill("600");
check("custom: unlocked height is independent", (await page.locator("#ig-width").inputValue()) === "800");
await create(page);
dl = await download(page);
info = await inspect(page, dl.bytes);
check("custom: exactly 800 × 600", info.width === 800 && info.height === 600 && dl.name === "landscape-instagram-800x600.jpg", `${info.width}×${info.height} ${dl.name}`);
await page.locator("#ig-width").fill("5000");
check("custom: oversized dimensions refused with a message", (await page.getByText(/at most 4,096 pixels/).isVisible()) && (await page.getByRole("button", { name: /Create/ }).isDisabled()));
await page.locator("#ig-width").fill("abc");
check("custom: invalid input explained", await page.getByText("Enter a width and height in whole pixels.").isVisible());
await pick(page, /^Square post/);

// ---------- Formats and quality ----------
await pick(page, "PNG");
await create(page);
dl = await download(page, "Download PNG");
check("format: PNG", kind(dl.bytes) === "png" && dl.name.endsWith(".png"));
await pick(page, "WebP");
await create(page);
dl = await download(page, "Download WebP");
check("format: WebP", kind(dl.bytes) === "webp" && dl.name.endsWith(".webp"));
await pick(page, "JPG");
await page.getByRole("slider", { name: /Quality/ }).fill("95");
await create(page);
const highQ = (await download(page)).bytes.length;
await page.getByRole("slider", { name: /Quality/ }).fill("55");
await create(page);
const lowQ = (await download(page)).bytes.length;
check("quality: lower quality gives a smaller JPG", lowQ < highQ, `${highQ} → ${lowQ} bytes`);
const table = await page.locator("#result-heading").locator("xpath=ancestor::section").innerText();
check("result: original vs output dimensions and sizes shown", /Dimensions/.test(table) && /2,400 × 1,800 px/.test(table) && /1,080 × 1,080 px/.test(table) && /File size/.test(table) && /Size change/.test(table));
await page.screenshot({ path: path.join(OUT, "result-desktop.png"), fullPage: true });

// ---------- Small image is enlarged, with a warning ----------
await page.getByRole("button", { name: "Reset" }).click();
await page.locator('input[type="file"]').first().setInputFiles(files.small);
await page.getByRole("button", { name: "Create Instagram image" }).waitFor();
check("small photo: enlargement warning", await page.locator('[role="status"]', { hasText: "Your photo will be enlarged" }).isVisible());
await page.close();

// ---------- Invalid, unsupported and oversized files ----------
for (const [file, expected] of [
  ["tests/fixtures/generated/notes.txt", /isn't an image we can open/],
  ["tests/fixtures/generated/too-many-pixels.png", /too large to process safely/],
  ["tests/fixtures/generated/phase5/moving-square.gif", /can't open GIF images/],
]) {
  if (!fs.existsSync(file)) {
    check(`error: ${path.basename(file)} fixture missing (run run.mjs / phase5.mjs first)`, false);
    continue;
  }
  const p = await openPage();
  await p.locator('input[type="file"]').first().setInputFiles(file);
  const alert = p.locator('[role="alert"]').filter({ hasText: /\S/ }).first();
  await alert.waitFor({ timeout: 15000 });
  check(`error: ${path.basename(file)} explained`, expected.test(await alert.innerText()), (await alert.innerText()).slice(0, 100));
  await p.close();
}

// ---------- Mobile ----------
{
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  const p = await openPage(ROUTE, mobile);
  check("mobile: empty state has no horizontal scroll", await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await p.locator('input[type="file"]').first().setInputFiles(files.landscape);
  await p.getByRole("button", { name: "Create Instagram image" }).waitFor();
  await pick(p, /^Story/);
  await pick(p, "Fit whole photo");
  check("mobile: editor has no horizontal scroll", await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await p.getByRole("button", { name: "Create Instagram image" }).tap();
  await p.getByRole("heading", { name: "Your Instagram image" }).waitFor({ timeout: 30000 });
  check("mobile: full workflow completes", true);
  await p.screenshot({ path: path.join(OUT, "mobile.png"), fullPage: true });
  await mobile.close();
}

check("no requests to other origins and no uploads", offending.length === 0, offending.slice(0, 3).join(", "));
check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

await browser.close();
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
