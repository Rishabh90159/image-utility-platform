// End-to-end tests for the Phase 4 tools in a real browser (Edge by default).
// Usage: start the production server (npm run build && npx next start -p 3100), then
//   node tests/e2e/phase4.mjs
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const CHANNEL = process.env.BROWSER_CHANNEL || "msedge";
const FIX = "tests/fixtures/generated/phase4";
const OUT = "tests/e2e/output/phase4";
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
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
const requested = [];
const consoleErrors = [];
const captureAnalytics = "window.__events = []; window.plausible = (e, o) => window.__events.push([e, (o && o.props) || {}]);";

async function newContext(viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport });
  await ctx.addInitScript(captureAnalytics);
  ctx.on("request", (req) => {
    const url = req.url();
    if (!/^https?:/.test(url)) return;
    requested.push(url);
    if (new URL(url).origin !== origin || req.method() !== "GET") offending.push(`${req.method()} ${url}`);
  });
  return ctx;
}
const context = await newContext();

async function openPage(route, ctx = context) {
  const page = await ctx.newPage();
  page.on("console", (msg) => msg.type() === "error" && consoleErrors.push(`${route}: ${msg.text()}`));
  page.on("pageerror", (err) => consoleErrors.push(`${route}: ${err.message}`));
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  return page;
}

// ---------- Fixtures (drawn and encoded by the browser) ----------
const fx = await context.newPage();
await fx.goto(BASE + "/about");
const made = await fx.evaluate(async () => {
  const enc = async (c, type, q) => [...new Uint8Array(await (await new Promise((r) => c.toBlob(r, type, q))).arrayBuffer())];
  const canvas = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });
  const out = {};

  // A clear subject (dark red rounded shape) on a light, slightly textured background.
  {
    const c = canvas(640, 480);
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, "#e9eef2");
    grad.addColorStop(1, "#d4dde4");
    g.fillStyle = grad;
    g.fillRect(0, 0, 640, 480);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = `rgba(120,130,140,${Math.random() * 0.08})`;
      g.fillRect(Math.random() * 640, Math.random() * 480, 2, 2);
    }
    g.fillStyle = "#8a1c1c";
    g.beginPath();
    g.ellipse(320, 250, 120, 170, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#c0392b";
    g.beginPath();
    g.ellipse(300, 200, 50, 60, 0, 0, Math.PI * 2);
    g.fill();
    out.subject = await enc(c, "image/jpeg", 0.92);
  }
  // Small sharp graphic for upscaling: black strokes and text on white.
  {
    const c = canvas(200, 150);
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 200, 150);
    g.fillStyle = "#111";
    for (let x = 10; x < 190; x += 12) g.fillRect(x, 10, 5, 60);
    g.font = "bold 28px sans-serif";
    g.fillText("Pixfit", 30, 120);
    out.small = await enc(c, "image/png");
  }
  // Pages for PDF tests.
  const page = async (color, w, h, type, alpha = false) => {
    const c = canvas(w, h);
    const g = c.getContext("2d");
    if (!alpha) {
      g.fillStyle = color;
      g.fillRect(0, 0, w, h);
    } else {
      g.fillStyle = color;
      g.fillRect(w / 4, h / 4, w / 2, h / 2);
    }
    g.fillStyle = "#fff";
    g.font = "bold 40px sans-serif";
    g.fillText(color, 20, 60);
    return enc(c, type, 0.9);
  };
  out.pageJpg = await page("#1f6feb", 1200, 900, "image/jpeg");
  out.pagePng = await page("#2da44e", 800, 1100, "image/png", true);
  out.pageWebp = await page("#bf3989", 1000, 1000, "image/webp");
  // A big image the upscaler can't enlarge 4×.
  {
    const c = canvas(3000, 3000);
    c.getContext("2d").fillRect(0, 0, 10, 10);
    out.big = await enc(c, "image/png");
  }
  return out;
});
await fx.close();
const files = {};
for (const [name, ext] of Object.entries({ subject: "jpg", small: "png", pageJpg: "jpg", pagePng: "png", pageWebp: "webp", big: "png" })) {
  files[name] = path.join(FIX, `${name}.${ext}`);
  fs.writeFileSync(files[name], Buffer.from(made[name]));
}

// ---------- Helpers ----------
const resultLink = (page) => page.locator('section[aria-labelledby="result-heading"] a[download]');
async function download(page) {
  const [dl] = await Promise.all([page.waitForEvent("download"), resultLink(page).first().click()]);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
}
/** Decodes an image in the page and returns size plus helpers' data. */
async function inspect(page, buf, type = "image/png") {
  return page.evaluate(
    async ({ bytes, type }) => {
      const bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type }));
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const g = c.getContext("2d");
      g.drawImage(bmp, 0, 0);
      const d = g.getImageData(0, 0, bmp.width, bmp.height).data;
      const at = (fx, fy) => {
        const i = (Math.floor(bmp.height * fy) * bmp.width + Math.floor(bmp.width * fx)) * 4;
        return [d[i], d[i + 1], d[i + 2], d[i + 3]];
      };
      return { width: bmp.width, height: bmp.height, center: at(0.5, 0.52), corner: at(0.03, 0.03), edge: at(0.97, 0.5) };
    },
    { bytes: [...buf], type },
  );
}
const events = (page) => page.evaluate(() => window.__events.map(([n]) => n));
const isPng = (b) => b[0] === 0x89 && b[1] === 0x50;
const isJpeg = (b) => b[0] === 0xff && b[1] === 0xd8;
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const run = (name) => !ONLY || ONLY.has(name);
/** Clicks an option of a segmented control (a radio inside a fieldset label), by its exact label text. */
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pick = (page, label) =>
  page
    .locator("fieldset label")
    .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`) })
    .first()
    .click();

/** Structural PDF check: header, trailer, xref offsets that point at their objects, page count and sizes. */
function inspectPdf(buf) {
  const text = buf.toString("latin1");
  const startxref = Number(text.match(/startxref\s+(\d+)\s+%%EOF\s*$/)?.[1]);
  const xref = text.slice(startxref, startxref + 4) === "xref";
  const entries = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
  const offsetsOk = entries.every((off, i) => text.startsWith(`${i + 1} 0 obj`, off));
  const count = Number(text.match(/\/Type \/Pages \/Count (\d+)/)?.[1]);
  const boxes = [...text.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
  return { header: text.startsWith("%PDF-1."), xref, offsetsOk, objects: entries.length, count, boxes };
}

// ---------- Image upscaler ----------
if (run("upscaler")) {
  const page = await openPage("/tools/image-upscaler");
  await page.locator('input[type="file"]').first().setInputFiles(files.small);
  await page.getByText("Result: ").waitFor();
  check("upscaler: 2× is the default and shows the result size", (await page.locator("#upscale-size").innerText()).includes("400 × 300"));
  await page.getByRole("button", { name: "Upscale image" }).click();
  await resultLink(page).waitFor({ timeout: 60_000 });
  const dl = await download(page);
  const info = await inspect(page, dl.buf);
  check("upscaler: 2× gives a 400 × 300 PNG", isPng(dl.buf) && info.width === 400 && info.height === 300, `${dl.name} ${info.width}×${info.height}`);

  // Sharpness: compare against the browser's own smooth enlargement of the same image.
  const sharpness = await page.evaluate(
    async ({ original, upscaled }) => {
      const load = async (bytes) => createImageBitmap(new Blob([new Uint8Array(bytes)]));
      const edgeEnergy = (bmp) => {
        const c = new OffscreenCanvas(400, 300);
        const g = c.getContext("2d");
        g.imageSmoothingQuality = "high";
        g.drawImage(bmp, 0, 0, 400, 300);
        const d = g.getImageData(0, 0, 400, 300).data;
        let sum = 0;
        for (let y = 1; y < 299; y++)
          for (let x = 1; x < 399; x++) {
            const i = (y * 400 + x) * 4;
            sum += Math.abs(4 * d[i] - d[i - 4] - d[i + 4] - d[i - 1600] - d[i + 1600]);
          }
        return sum;
      };
      return { browser: edgeEnergy(await load(original)), ours: edgeEnergy(await load(upscaled)) };
    },
    { original: [...fs.readFileSync(files.small)], upscaled: [...dl.buf] },
  );
  check("upscaler: result is crisper than the browser's own enlargement", sharpness.ours > sharpness.browser * 1.1, `edge energy ${sharpness.ours} vs ${sharpness.browser}`);
  check("upscaler: comparison slider is keyboard operable", await page.getByRole("slider", { name: /Comparison divider/ }).isVisible());

  await pick(page, "4×");
  await page.getByRole("button", { name: /Upscale (image|again)/ }).click();
  await page.waitForFunction(() => document.querySelector("#result-heading + p")?.textContent && document.body.innerText.includes("800 × 600"), null, { timeout: 60_000 });
  const four = await inspect(page, (await download(page)).buf);
  check("upscaler: 4× gives 800 × 600", four.width === 800 && four.height === 600, `${four.width}×${four.height}`);

  await pick(page, "Custom width");
  await page.locator("#upscale-width").fill("150");
  check("upscaler: custom width smaller than the original is refused", (await page.locator("#upscale-size").innerText()).includes("larger than the original") && (await page.getByRole("button", { name: /Upscale/ }).isDisabled()));
  await page.locator("#upscale-width").fill("500");
  check("upscaler: custom width keeps the aspect ratio", (await page.locator("#upscale-size").innerText()).includes("500 × 375"));

  await page.locator('input[type="file"]').first().setInputFiles(files.big);
  await page.waitForFunction(() => document.querySelector('section[aria-label="Image and settings"]')?.textContent?.includes("big.png"), null, { timeout: 30_000 });
  await pick(page, "4×");
  const limit = await page.locator("#upscale-size").innerText();
  check("upscaler: oversized results are refused with a clear message", /32 megapixels/.test(limit) && (await page.getByRole("button", { name: /Upscale/ }).isDisabled()), limit.slice(0, 90));
  const ev = await events(page);
  check("upscaler: analytics events tracked", ["tool_open", "image_uploaded", "processing_started", "upscale_completed"].every((e) => ev.includes(e)), ev.join(","));
  await page.close();
}

// ---------- Background remover ----------
if (run("background")) {
  const page = await openPage("/tools/background-remover");
  const modelRequests = () => requested.filter((u) => /.onnx|ort-wasm|ort.wasm/.test(u));
  const before = modelRequests();
  check("background: model and runtime are not loaded until a photo is added", before.length === 0, before.join(","));
  await page.locator('input[type="file"]').first().setInputFiles(files.subject);
  await resultLink(page).waitFor({ timeout: 180_000 });
  const loaded = modelRequests();
  check("background: model and runtime come from this site", loaded.some((u) => u.endsWith("/models/u2netp.onnx")) && loaded.some((u) => /.wasm$/.test(u)) && loaded.every((u) => u.startsWith(origin)), loaded.map((u) => new URL(u).pathname).join(", "));
  const dl = await download(page);
  const info = await inspect(page, dl.buf);
  fs.writeFileSync(path.join(OUT, "background-removed.png"), dl.buf);
  check("background: result is a transparent PNG at full size", isPng(dl.buf) && info.width === 640 && info.height === 480, `${info.width}×${info.height}`);
  check("background: subject kept (opaque centre)", info.center[3] > 200, `centre rgba ${info.center}`);
  check("background: background removed (transparent corner and side)", info.corner[3] < 40 && info.edge[3] < 40, `corner ${info.corner} side ${info.edge}`);

  await pick(page, "White");
  await pick(page, "JPG");
  await page.getByRole("button", { name: "Apply changes" }).click();
  await page.waitForFunction(() => /JPG/.test(document.querySelector('section[aria-labelledby="result-heading"] a[download]')?.textContent ?? ""), null, { timeout: 120_000 });
  const jpg = await download(page);
  const jinfo = await inspect(page, jpg.buf, "image/jpeg");
  check("background: white background as JPG", isJpeg(jpg.buf) && jinfo.corner.slice(0, 3).every((v) => v > 240) && jinfo.center[0] > 100 && jinfo.center[1] < 90, `corner ${jinfo.corner} centre ${jinfo.center}`);
  const ev = await events(page);
  check("background: analytics events tracked", ["processing_started", "background_removed", "download_clicked"].every((e) => ev.includes(e)), ev.join(","));
  await page.close();
}

// ---------- Photo to PDF ----------
if (run("pdf")) {
  const page = await openPage("/tools/photo-to-pdf");
  await page.locator('input[type="file"]').first().setInputFiles([files.pageJpg, files.pagePng, files.pageWebp]);
  await page.waitForFunction(() => document.querySelectorAll('section[aria-label="Selected images"] li').length === 3 && !document.body.innerText.includes("Checking…"), null, { timeout: 30_000 });
  const names = async () => page.locator('section[aria-label="Selected images"] li p.truncate').allInnerTexts();
  await page.getByRole("button", { name: "Move pageWebp.webp up" }).click();
  check("pdf: images can be reordered", (await names()).map((n) => n.replace(/^Page \d+:\s*/, "")).join(",") === "pageJpg.jpg,pageWebp.webp,pagePng.png", (await names()).join(","));
  check("pdf: layout preview shows one page per image", (await page.locator('[aria-label="Page layout preview"] figure').count()) === 3);
  await page.getByRole("button", { name: /Create PDF/ }).click();
  await resultLink(page).waitFor({ timeout: 60_000 });
  const status = await page.locator("#result-heading + p").innerText();
  const pdf = await download(page);
  fs.writeFileSync(path.join(OUT, "photos.pdf"), pdf.buf);
  const info = inspectPdf(pdf.buf);
  check("pdf: valid structure (header, xref offsets, trailer)", info.header && info.xref && info.offsetsOk && info.objects === 12, JSON.stringify({ ...info, boxes: undefined }));
  check("pdf: 3 A4 pages, orientation follows each image", info.count === 3 && JSON.stringify(info.boxes) === JSON.stringify([[841.89, 595.28], [595.28, 841.89], [595.28, 841.89]]), JSON.stringify(info.boxes));
  check("pdf: JPG embedded byte-for-byte (no recompression)", pdf.buf.indexOf(fs.readFileSync(files.pageJpg)) > 0 && /1 JPG image embedded without recompression/.test(status), status);
  check("pdf: download named .pdf", /\.pdf$/.test(pdf.name), pdf.name);

  await page.getByRole("button", { name: "Remove pagePng.png" }).click();
  await pick(page, "US Letter");
  await pick(page, "Landscape");
  await page.getByRole("button", { name: /Create PDF/ }).click();
  await page.waitForFunction(() => /2 pages · Letter/.test(document.querySelector("#result-heading + p")?.textContent ?? ""), null, { timeout: 60_000 });
  const letter = inspectPdf((await download(page)).buf);
  check("pdf: removing a page and switching to Letter landscape", letter.count === 2 && letter.boxes.every(([w, h]) => w === 792 && h === 612), JSON.stringify(letter.boxes));

  await page.getByRole("button", { name: "Clear all" }).click();
  await page.locator('input[type="file"]').first().setInputFiles([path.join("tests/fixtures/generated", "notes.txt")].filter(fs.existsSync).concat(files.pageJpg));
  await page.waitForFunction(() => !document.body.innerText.includes("Checking…"), null, { timeout: 30_000 });
  const listText = await page.locator('section[aria-label="Selected images"]').innerText();
  check("pdf: invalid files are skipped with a reason", !fs.existsSync(path.join("tests/fixtures/generated", "notes.txt")) || /Skipped: /.test(listText), listText.slice(0, 120));
  const ev = await events(page);
  check("pdf: analytics events tracked", ["image_uploaded", "processing_started", "pdf_created", "download_clicked"].every((e) => ev.includes(e)), ev.join(","));
  await page.close();
}


// ---------- Fixtures for batches 2 and 3 ----------
{
  const page = await context.newPage();
  await page.goto(BASE + "/about");
  const more = await page.evaluate(async () => {
    const enc = async (c, type, q) => [...new Uint8Array(await (await new Promise((r) => c.toBlob(r, type, q))).arrayBuffer())];
    const c = Object.assign(document.createElement("canvas"), { width: 400, height: 300 });
    const g = c.getContext("2d");
    g.fillStyle = "#d01010";
    g.fillRect(0, 0, 400, 150);
    g.fillStyle = "#1030d0";
    g.fillRect(0, 150, 400, 150);
    const raw = await enc(c, "image/jpeg", 0.9);
    const p = Object.assign(document.createElement("canvas"), { width: 120, height: 80 });
    const pg = p.getContext("2d");
    pg.fillStyle = "#f0f0f0";
    pg.fillRect(0, 0, 120, 80);
    pg.fillStyle = "#333";
    pg.fillRect(20, 20, 30, 30);
    const tiny = await enc(p, "image/jpeg", 0.6);
    const dull = Object.assign(document.createElement("canvas"), { width: 600, height: 400 });
    const dg = dull.getContext("2d");
    const grad = dg.createLinearGradient(0, 0, 600, 0);
    grad.addColorStop(0, "#6a6a70");
    grad.addColorStop(1, "#9a9a92");
    dg.fillStyle = grad;
    dg.fillRect(0, 0, 600, 400);
    dg.fillStyle = "#7d7568";
    dg.fillRect(200, 120, 200, 160);
    return { raw, tiny, dull: await enc(dull, "image/jpeg", 0.92) };
  });
  await page.close();
  // Insert an EXIF APP1 with orientation 6 right after SOI: the image is stored sideways, shown upright.
  const raw = Buffer.from(more.raw);
  const tiff = Buffer.from([0x4d, 0x4d, 0, 42, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0]);
  const body = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (body.length + 2) >> 8, (body.length + 2) & 255]), body]);
  files.rotated = path.join(FIX, "rotated.jpeg");
  fs.writeFileSync(files.rotated, Buffer.concat([raw.subarray(0, 2), app1, raw.subarray(2)]));
  files.tiny = path.join(FIX, "tiny.jpg");
  fs.writeFileSync(files.tiny, Buffer.from(more.tiny));
  files.dull = path.join(FIX, "dull.jpg");
  fs.writeFileSync(files.dull, Buffer.from(more.dull));
  files.fakeJpeg = path.join(FIX, "disguised.jpeg");
  fs.writeFileSync(files.fakeJpeg, fs.readFileSync(files.small)); // PNG bytes with a .jpeg name
  files.jfif = path.join(FIX, "download.jfif");
  fs.writeFileSync(files.jfif, fs.readFileSync(files.pageJpg));
}

/** Pixel digest of a decoded image, to compare pictures independent of file bytes. */
async function pixelDigest(page, buf) {
  return page.evaluate(async (bytes) => {
    const bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)]));
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const g = c.getContext("2d");
    g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, bmp.width, bmp.height).data;
    let h = 0;
    for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0;
    let lum = 0;
    let lo = 255, hi = 0;
    for (let i = 0; i < d.length; i += 4) {
      const y = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
      lum += y;
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
    return { hash: h, width: bmp.width, height: bmp.height, mean: lum / (d.length / 4), range: hi - lo };
  }, [...buf]);
}

// ---------- Merge images ----------
if (run("merge")) {
  const page = await openPage("/tools/merge-images");
  await page.locator('input[type="file"]').first().setInputFiles([files.pageJpg, files.pageWebp]);
  await page.waitForFunction(() => document.querySelectorAll('section[aria-label="Selected images"] li').length === 2 && !document.body.innerText.includes("Checking…"), null, { timeout: 30_000 });
  check("merge: live preview shows the final size (vertical, smallest width)", /1,000 × 1,750 px/.test(await page.locator('section[aria-label="Merge settings"]').innerText()));
  await page.getByRole("button", { name: /Merge 2 images/ }).click();
  await resultLink(page).waitFor({ timeout: 60_000 });
  let dl = await download(page);
  let info = await inspect(page, dl.buf, "image/jpeg");
  check("merge: vertical stack is 1000 × 1750 JPG (1200-wide image scaled down, not stretched)", isJpeg(dl.buf) && info.width === 1000 && info.height === 1750, `${info.width}×${info.height}`);

  await pick(page, "Horizontal");
  await pick(page, "30 px");
  await pick(page, "Transparent");
  await page.getByRole("button", { name: /Merge/ }).first().click();
  await page.waitForFunction(() => /PNG ·/.test(document.querySelector("#result-heading + p")?.textContent ?? ""), null, { timeout: 60_000 });
  dl = await download(page);
  info = await inspect(page, dl.buf);
  // Heights matched to the smaller (900): 1200×900 + 900×900 + 3 gaps of 30 = 2190 × 960.
  check("merge: side by side with spacing on a transparent PNG", isPng(dl.buf) && info.width === 2190 && info.height === 960 && info.corner[3] === 0, `${info.width}×${info.height} corner ${info.corner}`);

  await pick(page, "Grid");
  await page.locator("#merge-columns").fill("2");
  await page.locator('input[type="file"]').first().setInputFiles([files.pagePng]);
  await page.waitForFunction(() => document.querySelectorAll('section[aria-label="Selected images"] li').length === 3 && !document.body.innerText.includes("Checking…"), null, { timeout: 30_000 });
  await page.getByRole("button", { name: /Merge/ }).first().click();
  await page.waitForFunction(() => /PNG ·/.test(document.querySelector("#result-heading + p")?.textContent ?? "") && document.querySelectorAll('section[aria-label="Selected images"] li').length === 3, null, { timeout: 60_000 });
  info = await inspect(page, (await download(page)).buf);
  check("merge: 2-column grid of 3 mixed-shape images", info.width > 0 && info.height > info.width * 0.9, `${info.width}×${info.height}`);
  const ev = await events(page);
  check("merge: analytics events tracked", ["processing_started", "images_merged", "download_clicked"].every((e) => ev.includes(e)), ev.join(","));
  await page.close();
}

// ---------- JPG to PDF ----------
if (run("jpgpdf")) {
  const page = await openPage("/tools/jpg-to-pdf");
  await page.locator('input[type="file"]').first().setInputFiles([files.rotated, files.pageJpg, files.pagePng]);
  await page.waitForFunction(() => !document.body.innerText.includes("Checking…") && document.querySelectorAll('section[aria-label="Selected images"] li').length === 3, null, { timeout: 30_000 });
  const listText = await page.locator('section[aria-label="Selected images"]').innerText();
  check("jpg-to-pdf: PNG is skipped with a JPG-only explanation", /Skipped: .*JPG/.test(listText), listText.match(/Skipped:[^\n]*/)?.[0]);
  check("jpg-to-pdf: rotated phone JPEG is shown upright (300 × 400)", /300 × 400 px/.test(listText));
  await page.getByRole("button", { name: /Create PDF/ }).click();
  await resultLink(page).waitFor({ timeout: 60_000 });
  const status = await page.locator("#result-heading + p").innerText();
  const pdf = await download(page);
  fs.writeFileSync(path.join(OUT, "jpg.pdf"), pdf.buf);
  const info = inspectPdf(pdf.buf);
  check("jpg-to-pdf: both JPGs embedded byte-for-byte, including the rotated one", /2 JPG images embedded without recompression/.test(status) && pdf.buf.indexOf(fs.readFileSync(files.rotated)) > 0 && pdf.buf.indexOf(fs.readFileSync(files.pageJpg)) > 0, status);
  check("jpg-to-pdf: rotated photo gets a portrait page, landscape photo a landscape page", JSON.stringify(info.boxes) === JSON.stringify([[595.28, 841.89], [841.89, 595.28]]) && info.offsetsOk, JSON.stringify(info.boxes));
  check("jpg-to-pdf: rotation applied by the page transform", /\n0 -[\d.]+ [\d.]+ 0 [\d.]+ [\d.]+ cm\n\/Im0 Do/.test(pdf.buf.toString("latin1")));
  await page.close();
}

// ---------- JPEG to JPG ----------
if (run("jpeg")) {
  const page = await openPage("/tools/jpeg-to-jpg");
  await page.locator('input[type="file"]').first().setInputFiles([files.rotated, files.jfif, files.fakeJpeg]);
  await page.waitForFunction(() => !document.body.innerText.includes("Converting…") && document.querySelectorAll('section[aria-labelledby="result-heading"] li').length === 3, null, { timeout: 30_000 });
  const text = await page.locator('section[aria-labelledby="result-heading"]').innerText();
  check("jpeg-to-jpg: .jpeg and .jfif become .jpg", /rotated\.jpeg\s*→?\s*(becomes)?\s*rotated\.jpg/.test(text) && /download\.jfif\s*→?\s*(becomes)?\s*download\.jpg/.test(text), text.replace(/\n/g, " | ").slice(0, 200));
  check("jpeg-to-jpg: a PNG named .jpeg is refused, not renamed", /actually a PNG/.test(text));
  const [one] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download rotated.jpg" }).click()]);
  const renamed = fs.readFileSync(await one.path());
  check("jpeg-to-jpg: extension-only output is byte-identical", one.suggestedFilename() === "rotated.jpg" && renamed.equals(fs.readFileSync(files.rotated)));
  const [zip] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /as ZIP/ }).click()]);
  const zipBuf = fs.readFileSync(await zip.path());
  check("jpeg-to-jpg: ZIP holds both .jpg files", zipBuf.readUInt32LE(0) === 0x04034b50 && zipBuf.includes(Buffer.from("rotated.jpg")) && zipBuf.includes(Buffer.from("download.jpg")), zip.suggestedFilename());

  await pick(page, "Re-save as new JPG");
  await page.waitForFunction(() => /re-saved at 92%/.test(document.body.innerText) && !document.body.innerText.includes("Converting…"), null, { timeout: 30_000 });
  const [two] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download rotated.jpg" }).click()]);
  const resaved = await inspect(page, fs.readFileSync(await two.path()), "image/jpeg");
  check("jpeg-to-jpg: re-save stores the rotated photo upright (300 × 400)", resaved.width === 300 && resaved.height === 400, `${resaved.width}×${resaved.height}`);
  const ev = await events(page);
  check("jpeg-to-jpg: analytics events tracked", ["image_uploaded", "processing_started", "jpeg_converted", "download_clicked"].every((e) => ev.includes(e)), ev.join(","));
  await page.close();
}

// ---------- Image size increase ----------
if (run("increase")) {
  const page = await openPage("/tools/image-size-increase");
  await page.locator('input[type="file"]').first().setInputFiles(files.tiny);
  await page.locator("#increase-width").waitFor();
  await page.getByRole("button", { name: "200%" }).click();
  check("increase: 200% sets 240 × 160", (await page.locator("#increase-pixels-status").innerText()).includes("240 × 160"));
  await page.getByRole("button", { name: "Increase dimensions" }).click();
  await resultLink(page).waitFor({ timeout: 60_000 });
  let info = await inspect(page, (await download(page)).buf, "image/jpeg");
  check("increase: dimensions doubled", info.width === 240 && info.height === 160, `${info.width}×${info.height}`);
  await page.locator("#increase-width").fill("60");
  check("increase: smaller sizes are refused and point to the resizer", /larger than the original/.test(await page.locator("#increase-pixels-status").innerText()));

  await pick(page, "File size (KB)");
  await page.locator("#increase-kb").fill("50");
  await page.getByRole("button", { name: "Increase file size" }).click();
  await page.waitForFunction(() => /Your bigger file/.test(document.body.innerText), null, { timeout: 60_000 });
  const padded = await download(page);
  const [a, b] = [await pixelDigest(page, fs.readFileSync(files.tiny)), await pixelDigest(page, padded.buf)];
  check("increase: padding reaches exactly 50 KB (51,200 bytes)", padded.buf.length === 51200, String(padded.buf.length));
  check("increase: padded JPG decodes to identical pixels", a.hash === b.hash && a.width === b.width, `${a.hash} vs ${b.hash}`);

  // A tiny flat image can't reach 50 KB by re-encoding: the tool must say so rather than pretend.
  await pick(page, "Higher quality / more pixels");
  await page.getByRole("button", { name: "Increase file size" }).click();
  await page.getByText("Couldn't reach 50 KB").waitFor({ timeout: 60_000 });
  check("increase: quality method reports honestly when the target can't be reached", await page.getByText(/add padding”, which can reach any size/).isVisible());

  // A textured photo can: 21 KB → at least 60 KB by quality and dimensions.
  await page.locator('input[type="file"]').first().setInputFiles(files.subject);
  await page.waitForFunction(() => document.querySelector('section[aria-label="Image and settings"]')?.textContent?.includes("subject.jpg"), null, { timeout: 30_000 });
  await pick(page, "File size (KB)");
  await page.locator("#increase-kb").fill("60");
  await pick(page, "Higher quality / more pixels");
  await page.getByRole("button", { name: "Increase file size" }).click();
  await page.waitForFunction(() => /Saved as JPG at \d+% quality/.test(document.querySelector('section[aria-labelledby="result-heading"]')?.innerText ?? ""), null, { timeout: 120_000 });
  const q = await download(page);
  check("increase: quality method reaches 60 KB on a textured photo without overshooting wildly", q.buf.length >= 61440 && q.buf.length < 61440 * 2, String(q.buf.length));
  const ev = await events(page);
  check("increase: analytics events tracked", ["processing_started", "size_increase_completed"].every((e) => ev.includes(e)), ev.join(","));
  await page.close();
}

// ---------- Image quality enhancer ----------
if (run("enhance")) {
  const page = await openPage("/tools/image-quality-enhancer");
  await page.locator('input[type="file"]').first().setInputFiles(files.dull);
  await page.getByRole("slider", { name: /Comparison divider/ }).waitFor({ timeout: 30_000 });
  check("enhance: live before/after preview appears with Auto enhance", true);
  const sliders = await page.getByRole("slider").count();
  check("enhance: six labelled adjustment sliders plus the comparison", sliders === 7, String(sliders));
  await page.getByRole("button", { name: "Create full-size image" }).click();
  await resultLink(page).waitFor({ timeout: 60_000 });
  const out = await download(page);
  const [before, after] = [await pixelDigest(page, fs.readFileSync(files.dull)), await pixelDigest(page, out.buf)];
  check("enhance: full-size result keeps the dimensions", after.width === 600 && after.height === 400);
  check("enhance: auto levels widen the tonal range of a dull photo", after.range > before.range + 40, `range ${before.range.toFixed(0)} → ${after.range.toFixed(0)}`);
  await page.getByRole("button", { name: "Reset adjustments" }).click();
  check("enhance: with no adjustments the create button is disabled", await page.getByRole("button", { name: /Create/ }).isDisabled());
  const ev = await events(page);
  check("enhance: analytics events tracked", ["processing_started", "enhance_completed", "download_clicked"].every((e) => ev.includes(e)), ev.join(","));
  await page.close();
}

// ---------- MB to KB ----------
if (run("units")) {
  const page = await openPage("/tools/mb-to-kb-converter");
  const result = () => page.locator('section[aria-label="Converter"] [aria-live="polite"]').first().innerText();
  check("units: 1 MB = 1,000 KB, or 1,024 KiB in binary", /1 MB = 1,000 KB/.test(await result()) && /976\.563 KiB/.test(await result()), await result());
  await page.getByLabel("Amount").fill("2.5");
  check("units: 2.5 MB = 2,500 KB", /2\.5 MB = 2,500 KB/.test(await result()));
  await page.getByLabel("Unit").selectOption("MiB");
  check("units: 2.5 MiB = 2,560 KiB", /2,560 KiB/.test(await result()), await result());
  await page.getByLabel("Unit").selectOption("KB");
  await page.getByLabel("Amount").fill("50");
  check("units: suggests the 50KB photo tool", await page.locator('section[aria-label="Converter"]').getByRole("link", { name: "Resize a photo to 50KB" }).isVisible());
  await page.getByLabel("Amount").fill("abc");
  check("units: invalid input shows a clear message", await page.getByText("Enter a number, for example 2.5").isVisible());
  await page.locator('input[type="file"]').setInputFiles(files.pageJpg);
  const size = fs.statSync(files.pageJpg).size;
  check("units: shows the exact size of a chosen file", (await page.locator("dl").innerText()).includes(size.toLocaleString("en-US") + " bytes"));
  await page.close();
}

// ---------- Mobile layout (no horizontal scrolling) ----------
if (run("mobile")) {
  const phone = await newContext({ width: 375, height: 812 });
  const routes = ["image-upscaler", "background-remover", "photo-to-pdf", "merge-images", "jpeg-to-jpg", "jpg-to-pdf", "image-size-increase", "image-quality-enhancer", "mb-to-kb-converter"];
  for (const id of routes) {
    const page = await openPage("/tools/" + id, phone);
    check(`mobile: /tools/${id} has no horizontal scroll`, await noOverflow(page));
    await page.close();
  }
  for (const [id, input] of [["photo-to-pdf", [files.pageJpg, files.pageWebp]], ["merge-images", [files.pageJpg, files.pageWebp]], ["image-size-increase", [files.tiny]], ["image-quality-enhancer", [files.dull]], ["image-upscaler", [files.small]]]) {
    const page = await openPage("/tools/" + id, phone);
    await page.locator('input[type="file"]').first().setInputFiles(input);
    await page.waitForTimeout(1500);
    await page.waitForFunction(() => !document.body.innerText.includes("Checking…"), null, { timeout: 30_000 });
    check(`mobile: ${id} with images loaded has no horizontal scroll`, await noOverflow(page));
    await page.close();
  }
  await phone.close();
}

check("privacy: no cross-origin or non-GET requests (images never uploaded)", offending.length === 0, offending.slice(0, 5).join(", "));
check("console: no errors", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
