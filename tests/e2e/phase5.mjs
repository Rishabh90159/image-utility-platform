// End-to-end tests for the format resizers, the GIF resizer and the homepage upload box.
// Usage: start the production server (npm run build && npx next start -p 3100), then
//   node tests/e2e/phase5.mjs
// Output GIFs are checked with the browser's own GIF decoder (WebCodecs ImageDecoder),
// which is independent of the site's encoder.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { GifWriter } from "../../lib/gif/encode.ts";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CHANNEL = process.env.BROWSER_CHANNEL || "msedge";
const FIX = "tests/fixtures/generated/phase5";
const OUT = "tests/e2e/output/phase5";
fs.mkdirSync(FIX, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

// ---------- GIF fixtures (written in Node, verified by the browser below) ----------
function makeGif(file, width, height, frames, { transparent = false } = {}) {
  const palette = new Uint8Array([255, 255, 255, 220, 30, 30, 30, 60, 200]);
  const writer = new GifWriter({ width, height, loopCount: 0 });
  for (let f = 0; f < frames; f++) {
    const indices = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const inSquare = x >= f * 10 && x < f * 10 + 30 && y >= 30 && y < 60;
        indices[y * width + x] = inSquare ? 1 : y < 10 ? 2 : 0;
      }
    }
    writer.addFrame({ left: 0, top: 0, width, height, indices, palette, transparentIndex: transparent ? 0 : -1, delayCs: 8, disposal: transparent ? 2 : 1 });
  }
  fs.writeFileSync(file, writer.finish());
}
const gifPath = path.join(FIX, "moving-square.gif");
const gifTransparentPath = path.join(FIX, "transparent.gif");
makeGif(gifPath, 120, 90, 6);
makeGif(gifTransparentPath, 120, 90, 4, { transparent: true });

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
const origin = new URL(BASE).origin;
const offending = [];
const consoleErrors = [];
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
context.on("request", (req) => {
  const url = req.url();
  if (/^https?:/.test(url) && (new URL(url).origin !== origin || req.method() !== "GET")) offending.push(`${req.method()} ${url}`);
});

async function openPage(route) {
  const page = await context.newPage();
  page.on("console", (msg) => msg.type() === "error" && consoleErrors.push(`${route}: ${msg.text()}`));
  page.on("pageerror", (err) => consoleErrors.push(`${route}: ${err.message}`));
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  return page;
}

/** Decodes every frame of a GIF with the browser's decoder; returns sizes and sampled pixels. */
async function inspectGif(page, bytes, points) {
  return page.evaluate(
    async ({ data, points }) => {
      const decoder = new ImageDecoder({ data: new Uint8Array(data), type: "image/gif" });
      await decoder.tracks.ready;
      const count = decoder.tracks.selectedTrack.frameCount;
      const frames = [];
      for (let i = 0; i < count; i++) {
        const { image } = await decoder.decode({ frameIndex: i });
        const c = new OffscreenCanvas(image.displayWidth, image.displayHeight);
        const g = c.getContext("2d");
        g.drawImage(image, 0, 0);
        frames.push({
          width: image.displayWidth,
          height: image.displayHeight,
          duration: image.duration,
          samples: points.map(([x, y]) => [...g.getImageData(x, y, 1, 1).data]),
        });
        image.close();
      }
      return { count, frames };
    },
    { data: [...bytes], points },
  );
}

const isRed = ([r, g, b, a]) => r > 180 && g < 90 && b < 90 && a > 200;
const isWhite = ([r, g, b, a]) => r > 220 && g > 220 && b > 220 && a > 200;
const isClear = ([, , , a]) => a < 20;

/** Segmented options are visually hidden radios inside labels; click the label like a user. */
async function pick(page, name) {
  await page.getByRole("radio", { name }).locator("xpath=..").click();
}

async function download(page, name) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name }).first().click()]);
  const file = path.join(OUT, dl.suggestedFilename());
  await dl.saveAs(file);
  return { file, bytes: fs.readFileSync(file) };
}

// ---------- The browser accepts our fixture as a valid animated GIF ----------
{
  const page = await openPage("/about");
  const info = await inspectGif(page, fs.readFileSync(gifPath), [[15, 45], [70, 45]]);
  check("fixture GIF decodes in the browser with 6 frames", info.count === 6, String(info.count));
  check("fixture GIF pixels decode as written", isRed(info.frames[0].samples[0]) && isWhite(info.frames[0].samples[1]) && isRed(info.frames[5].samples[1]));
  await page.close();
}

// ---------- GIF resizer ----------
{
  const page = await openPage("/tools/resize-gif");
  await page.locator('input[type="file"]').first().setInputFiles(gifPath);
  await page.getByText("6 frames").waitFor({ timeout: 15000 });
  check("GIF: shows frame count, duration and loop", /6 frames · 0\.5 s · loops forever/.test(await page.locator("main").innerText()));
  await page.locator("#gif-width").fill("60");
  check("GIF: aspect ratio maintained", (await page.locator("#gif-height").inputValue()) === "45");
  await page.getByRole("button", { name: "Resize GIF" }).click();
  await page.getByRole("heading", { name: "Your resized GIF" }).waitFor({ timeout: 30000 });
  const { file, bytes } = await download(page, "Download GIF");
  check("GIF: download is a .gif file", file.endsWith("60x45.gif") && bytes.subarray(0, 6).toString() === "GIF89a", path.basename(file));
  const out = await inspectGif(page, bytes, [[7, 22], [35, 22], [30, 2]]);
  check("GIF: browser decodes every frame of the result", out.count === 6, String(out.count));
  check("GIF: dimensions are 60 × 45 in every frame", out.frames.every((f) => f.width === 60 && f.height === 45));
  check("GIF: frame timing kept (80 ms)", out.frames.every((f) => Math.abs(f.duration - 80000) < 1000), String(out.frames[0].duration));
  check("GIF: animation content correct in first and last frames", isRed(out.frames[0].samples[0]) && isWhite(out.frames[0].samples[1]) && isRed(out.frames[5].samples[1]) && !isRed(out.frames[5].samples[0]));
  const table = await page.locator("#result-heading").locator("xpath=ancestor::section").innerText();
  check("GIF: result shows dimensions, size change and frames", /Dimensions/.test(table) && /Size change/.test(table) && /Frames/.test(table));
  await page.screenshot({ path: path.join(OUT, "gif-desktop.png"), fullPage: false });

  // Transparent GIF stays transparent.
  await page.getByRole("button", { name: "Reset" }).click();
  await page.locator('input[type="file"]').first().setInputFiles(gifTransparentPath);
  await page.getByText("4 frames").waitFor({ timeout: 15000 });
  await pick(page, /Sharp pixels/);
  await page.locator("#gif-width").fill("60");
  await page.getByRole("button", { name: "Resize GIF" }).click();
  await page.getByRole("heading", { name: "Your resized GIF" }).waitFor({ timeout: 30000 });
  const t = await download(page, "Download GIF");
  const tr = await inspectGif(page, t.bytes, [[7, 22], [55, 40], [2, 22]]);
  check("GIF: transparency kept in every frame", tr.count === 4 && tr.frames.every((f) => isClear(f.samples[1])) && isRed(tr.frames[0].samples[0]) && isClear(tr.frames[3].samples[2]));
  await page.close();
}

// ---------- Other tools point GIFs to the GIF resizer ----------
{
  const page = await openPage("/tools/image-resizer");
  await page.locator('input[type="file"]').first().setInputFiles(gifPath);
  const link = page.getByRole("link", { name: "Resize a GIF and keep the animation" });
  await link.waitFor({ timeout: 10000 });
  check("image resizer: GIF gets a link to the GIF resizer", (await link.getAttribute("href")) === "/tools/resize-gif");
  await page.close();
}

// ---------- Browser-made fixtures ----------
const fx = await openPage("/about");
const made = await fx.evaluate(async () => {
  const enc = async (c, type, q) => [...new Uint8Array(await (await new Promise((r) => c.toBlob(r, type, q))).arrayBuffer())];
  const canvas = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });
  const photo = canvas(4000, 3000);
  const g = photo.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 4000, 3000);
  grad.addColorStop(0, "#2d6a8a");
  grad.addColorStop(1, "#e8c070");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4000, 3000);
  const logo = canvas(800, 600);
  const l = logo.getContext("2d");
  l.fillStyle = "#0b6b5d";
  l.beginPath();
  l.arc(400, 300, 200, 0, Math.PI * 2);
  l.fill();
  return { jpg: await enc(photo, "image/jpeg", 0.9), png: await enc(logo, "image/png"), webp: await enc(photo, "image/webp", 0.8) };
});
await fx.close();
const files = {
  jpg: path.join(FIX, "photo.jpg"),
  png: path.join(FIX, "logo.png"),
  webp: path.join(FIX, "photo.webp"),
};
for (const [k, f] of Object.entries(files)) fs.writeFileSync(f, Buffer.from(made[k]));

// ---------- Image resizer: popular dimensions, presets and result table ----------
{
  const page = await openPage("/tools/image-resizer");
  check("resizer: upload copy", /Drop your image here/.test(await page.locator("main").innerText()) && /Processed locally — your image never leaves your device/.test(await page.locator("main").innerText()));
  await page.locator('input[type="file"]').first().setInputFiles(files.jpg);
  await page.locator("#resize-width").waitFor();
  await page.locator("#resize-fit").selectOption("fhd");
  check("resizer: popular dimension fits inside 1920 × 1080 without stretching", (await page.locator("#resize-width").inputValue()) === "1440" && (await page.locator("#resize-height").inputValue()) === "1080");
  for (const w of [640, 800, 1024, 1280, 1920, 2560, 3840]) {
    if (!(await page.getByRole("button", { name: `${w} px` }).isVisible())) check(`resizer: ${w} px preset`, false);
  }
  await page.getByRole("button", { name: "1024 px" }).click();
  check("resizer: width preset applies with ratio", (await page.locator("#resize-height").inputValue()) === "768");
  await page.getByRole("button", { name: "Resize image" }).click();
  await page.getByRole("heading", { name: "Your resized image" }).waitFor({ timeout: 20000 });
  const table = await page.locator("#result-heading").locator("xpath=ancestor::section").innerText();
  check("resizer: result shows size change", /Size change\s+—\s+[\d.]+% smaller/.test(table), table.match(/Size change[^\n]*\n?[^\n]*/)?.[0]);
  await page.screenshot({ path: path.join(OUT, "resizer-desktop.png") });
  await page.close();
}

// ---------- Resize JPG: DPI written to the file ----------
{
  const page = await openPage("/tools/resize-jpg");
  await page.locator('input[type="file"]').first().setInputFiles(files.jpg);
  await page.locator("#resize-width").fill("1200");
  await pick(page, "300");
  check("JPG: print size shown", /Prints at 4\.00 × 3\.00 in/.test(await page.locator("main").innerText()));
  await page.getByRole("button", { name: "Resize JPG" }).click();
  await page.getByRole("heading", { name: "Your resized JPG" }).waitFor({ timeout: 20000 });
  const { bytes } = await download(page, "Download JPG");
  const jfif = bytes.indexOf(Buffer.from("JFIF\0"));
  const density = jfif > 0 ? [bytes[jfif + 7], bytes.readUInt16BE(jfif + 8), bytes.readUInt16BE(jfif + 10)] : null;
  check("JPG: output records 300 DPI", density && density[0] === 1 && density[1] === 300 && density[2] === 300, JSON.stringify(density));
  await page.getByRole("button", { name: "Reset" }).click();
  await page.locator('input[type="file"]').first().setInputFiles(files.png);
  const err = page.getByText("This page resizes JPG files, and this file is a PNG.");
  await err.waitFor({ timeout: 10000 });
  check("JPG: other formats are pointed to the image resizer", await page.getByRole("link", { name: /Open the image resizer/ }).isVisible());
  await page.close();
}

// ---------- Resize PNG: colour reduction keeps transparency ----------
{
  const page = await openPage("/tools/resize-png");
  await page.locator('input[type="file"]').first().setInputFiles(files.png);
  await page.locator("#resize-width").fill("400");
  await page.getByText("Reduce colours for a smaller file").click();
  await pick(page, "64");
  await page.getByRole("button", { name: "Resize PNG" }).click();
  await page.getByRole("heading", { name: "Your resized PNG" }).waitFor({ timeout: 20000 });
  const { bytes } = await download(page, "Download PNG");
  check("PNG: output is an indexed (palette) PNG", bytes[25] === 3, `colour type ${bytes[25]}`);
  const corner = await page.evaluate(async (data) => {
    const bmp = await createImageBitmap(new Blob([new Uint8Array(data)], { type: "image/png" }));
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    c.getContext("2d").drawImage(bmp, 0, 0);
    return { size: [bmp.width, bmp.height], corner: [...c.getContext("2d").getImageData(2, 2, 1, 1).data] };
  }, [...bytes]);
  check("PNG: 400 × 300 and transparent corners kept", corner.size.join("x") === "400x300" && corner.corner[3] === 0, JSON.stringify(corner));
  await page.close();
}

// ---------- Resize WebP ----------
{
  const page = await openPage("/tools/resize-webp");
  await page.locator('input[type="file"]').first().setInputFiles(files.webp);
  await pick(page, "Percentage");
  await page.getByRole("button", { name: "25%" }).click();
  await page.getByRole("button", { name: "Resize WebP" }).click();
  await page.getByRole("heading", { name: "Your resized WebP" }).waitFor({ timeout: 20000 });
  const { file, bytes } = await download(page, "Download WebP");
  check("WebP: default output is WebP at 25%", file.endsWith("1000x750.webp") && bytes.subarray(8, 12).toString() === "WEBP", path.basename(file));
  await page.close();
}

// ---------- FAQ accordion ----------
{
  const page = await openPage("/");
  const items = page.locator('section[aria-labelledby="faq-heading"] details');
  const first = items.first();
  const answer = first.locator("p");
  check("FAQ: questions listed, answers closed by default", (await items.count()) >= 5 && !(await answer.isVisible()));
  await first.locator("summary").click();
  check("FAQ: clicking a question shows its answer", await answer.isVisible());
  await first.locator("summary").click();
  check("FAQ: clicking again hides it", !(await answer.isVisible()));
  await items.nth(1).locator("summary").focus();
  await page.keyboard.press("Enter");
  check("FAQ: opens with the keyboard", await items.nth(1).locator("p").isVisible());
  await page.locator('section[aria-labelledby="faq-heading"]').screenshot({ path: path.join(OUT, "faq.png") });
  await page.close();
}

// ---------- Footer: two columns on phones, regular columns on desktop ----------
{
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await mctx.newPage();
  await mobile.goto(BASE + "/", { waitUntil: "networkidle" });
  const footer = mobile.locator("footer");
  const groups = footer.locator("nav");
  const boxes = [];
  for (let i = 0; i < (await groups.count()); i++) boxes.push(await groups.nth(i).boundingBox());
  const lefts = [...new Set(boxes.map((b) => Math.round(b.x)))];
  check("footer (mobile): link groups in two columns", lefts.length === 2, `column x: ${lefts.join(", ")}`);
  check("footer (mobile): every group and link visible, nothing to tap open", (await footer.locator("details").count()) === 0 && (await footer.getByRole("link", { name: "PNG to JPG Converter" }).isVisible()) && (await footer.getByRole("link", { name: "Privacy policy" }).isVisible()));
  check("footer (mobile): no horizontal scroll", await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await footer.screenshot({ path: path.join(OUT, "footer-mobile.png") });
  await mctx.close();

  const desktop = await openPage("/");
  const dGroups = desktop.locator("footer nav");
  const dLefts = new Set();
  for (let i = 0; i < (await dGroups.count()); i++) dLefts.add(Math.round((await dGroups.nth(i).boundingBox()).x));
  check("footer (desktop): one column per group, as before", dLefts.size === 5, `${dLefts.size} columns`);
  await desktop.locator("footer").screenshot({ path: path.join(OUT, "footer-desktop.png") });
  await desktop.close();
}

// ---------- Homepage: choose an image, pick a tool, it opens there ----------
for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const label = viewport.width < 500 ? "mobile" : "desktop";
  check(`home (${label}): hero copy`, (await page.locator("h1").innerText()) === "Free Online Image Tools" && /No upload/.test(await page.locator("main").innerText()));
  const order = await page.locator("main h2").allInnerTexts();
  const expected = ["Popular tools", "Image tools", "Image converters", "Photo size tools", "Exam and passport photos", "Your images stay on your device", "How Imgifyr works", "Frequently asked questions"];
  check(`home (${label}): section order`, expected.every((h, i) => order.indexOf(h) >= 0 && (i === 0 || order.indexOf(h) > order.indexOf(expected[i - 1]))), order.join(" | "));
  await page.screenshot({ path: path.join(OUT, `home-${label}.png`) });
  await page.locator('input[type="file"]').first().setInputFiles(files.png);
  await page.getByText("What do you want to do?").waitFor();
  check(`home (${label}): PNG offers Convert to JPG`, await page.getByRole("link", { name: "Convert to JPG" }).isVisible());
  await page.getByRole("link", { name: "Compress", exact: true }).click();
  await page.waitForURL("**/tools/image-compressor");
  await page.getByText("logo.png").first().waitFor({ timeout: 15000 });
  check(`home (${label}): chosen image opens in the selected tool`, true);
  await page.close();
}

check("no requests to other origins and no uploads", offending.length === 0, offending.slice(0, 3).join(", "));
check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

await browser.close();
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
