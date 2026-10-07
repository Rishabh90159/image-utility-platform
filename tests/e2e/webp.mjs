// End-to-end tests for the WebP to JPG converter and the requirements hub, in a real browser.
// Usage: start the production server (npm run build && npx next start -p 3100), then
//   node tests/e2e/webp.mjs
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CHANNEL = process.env.BROWSER_CHANNEL || "msedge";
const FIX = "tests/fixtures/generated";
fs.mkdirSync(FIX, { recursive: true });

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 } });
const origin = new URL(BASE).origin;
const offending = [];
const consoleErrors = [];
context.on("request", (req) => {
  const url = req.url();
  if (!/^https?:/.test(url)) return;
  if (req.isNavigationRequest() && new URL(url).origin !== origin) return;
  if (new URL(url).origin !== origin || req.method() !== "GET") offending.push(`${req.method()} ${url}`);
});

// --- Fixtures, encoded by the browser's own WebP encoder ---
const scratch = await context.newPage();
await scratch.goto(BASE + "/about");
const encoded = await scratch.evaluate(async () => {
  async function webp(draw, w = 320, h = 200, alpha = true) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d", { alpha }), w, h);
    const blob = await new Promise((r) => c.toBlob(r, "image/webp", 0.9));
    return [...new Uint8Array(await blob.arrayBuffer())];
  }
  return {
    opaque: await webp((g, w, h) => {
      g.fillStyle = "#d02020";
      g.fillRect(0, 0, w / 2, h);
      g.fillStyle = "#2040d0";
      g.fillRect(w / 2, 0, w / 2, h);
    }),
    transparent: await webp((g, w, h) => {
      g.fillStyle = "#2040d0";
      g.fillRect(w / 2, 0, w / 2, h); // left half stays transparent
    }),
    red: await webp((g, w, h) => ((g.fillStyle = "#e01010"), g.fillRect(0, 0, w, h)), 64, 64, false),
    green: await webp((g, w, h) => ((g.fillStyle = "#10c010"), g.fillRect(0, 0, w, h)), 64, 64, false),
  };
});
await scratch.close();

/** Wraps two still lossy WebPs into an animated WebP (VP8X + ANIM + ANMF). */
function animatedWebp(frames, w, h) {
  const chunk = (fourcc, payload) => {
    const pad = payload.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0);
    const head = Buffer.alloc(8);
    head.write(fourcc, 0, "ascii");
    head.writeUInt32LE(payload.length, 4);
    return Buffer.concat([head, payload, pad]);
  };
  const u24 = (n) => Buffer.from([n & 255, (n >> 8) & 255, (n >> 16) & 255]);
  const vp8Chunk = (file) => {
    const b = Buffer.from(file);
    // Browsers may add VP8X/ICCP chunks; the frame only needs the lossy "VP8 " bitstream chunk.
    for (let i = 12; i + 8 <= b.length; ) {
      const size = b.readUInt32LE(i + 4);
      if (b.toString("ascii", i, i + 4) === "VP8 ") return b.subarray(i, i + 8 + size + (size % 2));
      i += 8 + size + (size % 2);
    }
    throw new Error("no lossy VP8 chunk in the encoder output");
  };
  const vp8x = Buffer.concat([Buffer.from([0x02, 0, 0, 0]), u24(w - 1), u24(h - 1)]);
  const anim = Buffer.from([255, 255, 255, 255, 0, 0]);
  const anmf = frames.map((f) => chunk("ANMF", Buffer.concat([u24(0), u24(0), u24(w - 1), u24(h - 1), u24(200), Buffer.from([0]), vp8Chunk(f)])));
  const body = Buffer.concat([Buffer.from("WEBP"), chunk("VP8X", vp8x), chunk("ANIM", anim), ...anmf]);
  const riff = Buffer.alloc(8);
  riff.write("RIFF", 0, "ascii");
  riff.writeUInt32LE(body.length, 4);
  return Buffer.concat([riff, body]);
}

const files = {
  opaque: path.join(FIX, "webp-opaque.webp"),
  transparent: path.join(FIX, "webp-transparent.webp"),
  animated: path.join(FIX, "webp-animated.webp"),
};
fs.writeFileSync(files.opaque, Buffer.from(encoded.opaque));
fs.writeFileSync(files.transparent, Buffer.from(encoded.transparent));
fs.writeFileSync(files.animated, animatedWebp([encoded.red, encoded.green], 64, 64));

// --- Helpers ---
async function openPage(route) {
  const page = await context.newPage();
  page.on("console", (msg) => msg.type() === "error" && consoleErrors.push(`${route}: ${msg.text()}`));
  page.on("pageerror", (err) => consoleErrors.push(`${route}: ${err.message}`));
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  return page;
}
const resultLink = (page) => page.locator('section[aria-labelledby="result-heading"] a[download]');
async function convert(page, file) {
  await page.locator('input[type="file"]').first().setInputFiles(file);
  await resultLink(page).waitFor({ timeout: 60_000 });
  const [dl] = await Promise.all([page.waitForEvent("download"), resultLink(page).click()]);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
}
/** Decodes a JPG in the page and returns [r,g,b] at the given fractional position. */
async function pixelAt(page, buf, fx, fy) {
  return page.evaluate(
    async ({ bytes, fx, fy }) => {
      const bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }));
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const g = c.getContext("2d");
      g.drawImage(bmp, 0, 0);
      const d = g.getImageData(Math.floor(bmp.width * fx), Math.floor(bmp.height * fy), 1, 1).data;
      return { rgb: [d[0], d[1], d[2]], width: bmp.width, height: bmp.height };
    },
    { bytes: [...buf], fx, fy },
  );
}
const near = (rgb, target, tol = 40) => rgb.every((v, i) => Math.abs(v - target[i]) <= tol);
const isJpeg = (buf) => buf[0] === 0xff && buf[1] === 0xd8;

// --- WebP to JPG ---
{
  const page = await openPage("/tools/webp-to-jpg");
  let dl = await convert(page, files.opaque);
  let px = await pixelAt(page, dl.buf, 0.25, 0.5);
  check("WebP→JPG: opaque WebP becomes a real JPG with the same pixels", isJpeg(dl.buf) && /\.jpg$/.test(dl.name) && px.width === 320 && px.height === 200 && near(px.rgb, [0xd0, 0x20, 0x20]), `${dl.name} ${px.width}×${px.height} rgb ${px.rgb}`);

  await page.goto(BASE + "/tools/webp-to-jpg", { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles(files.transparent);
  await page.getByText("This image has transparent areas").waitFor({ timeout: 30_000 });
  check("WebP→JPG: transparency detected and a background colour offered", true);
  await resultLink(page).waitFor({ timeout: 60_000 });
  const [d2] = await Promise.all([page.waitForEvent("download"), resultLink(page).click()]);
  dl = { buf: fs.readFileSync(await d2.path()) };
  px = await pixelAt(page, dl.buf, 0.25, 0.5);
  check("WebP→JPG: transparent area filled with white by default", near(px.rgb, [255, 255, 255], 12), `rgb ${px.rgb}`);

  await page.goto(BASE + "/tools/webp-to-jpg", { waitUntil: "networkidle" });
  dl = await convert(page, files.animated);
  px = await pixelAt(page, dl.buf, 0.5, 0.5);
  check("WebP→JPG: animated WebP converts to its first frame (as the FAQ states)", isJpeg(dl.buf) && near(px.rgb, [0xe0, 0x10, 0x10]), `rgb ${px.rgb}`);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("WebP→JPG: no horizontal scroll at phone width", !overflow);
  await page.close();
}

// --- Requirements hub ---
{
  const page = await openPage("/tools/application-photos");
  const rows = await page.locator("table tbody tr").count();
  const text = await page.locator("main").innerText();
  check("hub: comparison table lists every exam plus passports", rows >= 6 && ["IBPS", "SBI", "SSC", "NEET", "UPSC", "Passport"].every((n) => text.includes(n)), `${rows} rows`);
  check("hub: values come from the requirement data (IBPS 200 × 230 px, 20 KB – 50 KB)", /200 × 230 px \(preferred\)/.test(text) && text.includes("20 KB – 50 KB"));
  check("hub: SSC shown as live capture, UPSC as not verified", /Captured live in the application form/.test(text) && /Not verified/.test(text));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("hub: no page-level horizontal scroll at phone width (table scrolls inside its box)", !overflow);
  await page.close();
}

check("privacy: no cross-origin or non-GET requests", offending.length === 0, offending.slice(0, 5).join(", "));
check("console: no errors", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
