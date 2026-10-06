// Generates test images inside a real browser (canvas encoders), plus hand-made invalid files.
import fs from "node:fs";
import path from "node:path";

export async function generateFixtures(browser, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  await page.setContent("<html><body></body></html>");

  const specs = [
    // name, width, height, kind, mime, quality
    ["photo-12mp.jpg", 4000, 3000, "photo", "image/jpeg", 0.95],
    ["photo.jpeg", 1600, 1200, "photo", "image/jpeg", 0.9],
    ["low-quality.jpg", 1600, 1200, "photo", "image/jpeg", 0.35],
    ["tiny.jpg", 3, 2, "photo", "image/jpeg", 0.9],
    ["tall.jpg", 300, 3000, "photo", "image/jpeg", 0.9],
    ["photo.png", 1600, 1200, "photo", "image/png"],
    ["graphic.png", 1280, 800, "graphic", "image/png"],
    ["transparent.png", 800, 600, "transparent", "image/png"],
    ["opaque-logo.png", 640, 640, "graphic", "image/png"],
    ["one-pixel.png", 1, 1, "graphic", "image/png"],
    ["wide.png", 3000, 200, "graphic", "image/png"],
    ["photo.webp", 1200, 800, "photo", "image/webp", 0.85],
    ["transparent.webp", 600, 400, "transparent", "image/webp", 0.85],
    ["huge-flat.png", 9000, 7000, "flat", "image/png"],
  ];

  for (const [name, width, height, kind, mime, quality] of specs) {
    const base64 = await page.evaluate(
      async ({ width, height, kind, mime, quality }) => {
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext("2d");
        if (kind === "flat") {
          ctx.fillStyle = "#3a7bd5";
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(width / 4, height / 4, width / 2, height / 2);
        } else if (kind === "graphic") {
          ctx.fillStyle = "#f4f5f7";
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = "#0b6b5d";
          ctx.fillRect(0, 0, width, Math.max(1, height / 10));
          ctx.fillStyle = "#222";
          ctx.font = `${Math.max(8, Math.round(height / 25))}px sans-serif`;
          for (let i = 0; i < 12; i++) ctx.fillText("Screenshot text line " + i, 20, height / 6 + i * (height / 16));
          const g = ctx.createLinearGradient(0, 0, width, 0);
          g.addColorStop(0, "#ff7a59");
          g.addColorStop(1, "#5b8def");
          ctx.fillStyle = g;
          ctx.fillRect(width * 0.6, height * 0.5, width * 0.35, height * 0.4);
        } else {
          // Photo-like: smooth gradients, shapes and per-pixel noise (noise makes files realistically large).
          const g = ctx.createLinearGradient(0, 0, width, height);
          g.addColorStop(0, "#87b5e0");
          g.addColorStop(0.5, "#e8c07d");
          g.addColorStop(1, "#4d6b3c");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, width, height);
          for (let i = 0; i < 60; i++) {
            ctx.fillStyle = `hsla(${(i * 37) % 360}, 60%, 50%, 0.35)`;
            ctx.beginPath();
            ctx.arc(((i * 97) % 100) / 100 * width, ((i * 53) % 100) / 100 * height, (((i * 29) % 20) + 3) / 100 * Math.min(width, height), 0, Math.PI * 2);
            ctx.fill();
          }
          const img = ctx.getImageData(0, 0, width, height);
          let seed = 12345;
          for (let i = 0; i < img.data.length; i += 4) {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            const n = (seed % 41) - 20;
            img.data[i] += n;
            img.data[i + 1] += n;
            img.data[i + 2] += n;
          }
          ctx.putImageData(img, 0, 0);
          if (kind === "transparent") {
            // Clear everything outside a soft-edged circle.
            ctx.globalCompositeOperation = "destination-in";
            const r = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.3, width / 2, height / 2, Math.min(width, height) * 0.45);
            r.addColorStop(0, "rgba(0,0,0,1)");
            r.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = r;
            ctx.fillRect(0, 0, width, height);
          }
        }
        const blob = await canvas.convertToBlob({ type: mime, quality });
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(binary);
      },
      { width, height, kind, mime, quality },
    );
    fs.writeFileSync(path.join(dir, name), Buffer.from(base64, "base64"));
  }
  await page.close();

  // Invalid inputs.
  fs.writeFileSync(path.join(dir, "empty.jpg"), Buffer.alloc(0));
  fs.writeFileSync(path.join(dir, "not-an-image.png"), "This is a text file pretending to be a PNG.\n".repeat(20));
  fs.writeFileSync(path.join(dir, "notes.txt"), "plain text");
  const corrupt = Buffer.alloc(20000);
  for (let i = 0; i < corrupt.length; i++) corrupt[i] = (i * 7919) % 251;
  corrupt.set([0xff, 0xd8, 0xff, 0xe0], 0); // JPEG signature followed by garbage
  fs.writeFileSync(path.join(dir, "corrupt.jpg"), corrupt);
  const truncatedPng = fs.readFileSync(path.join(dir, "graphic.png")).subarray(0, 200);
  fs.writeFileSync(path.join(dir, "truncated.png"), truncatedPng);
  const heic = Buffer.alloc(64);
  heic.set([0, 0, 0, 0x18], 0);
  heic.write("ftypheic", 4, "ascii");
  fs.writeFileSync(path.join(dir, "iphone.heic"), heic);
  // A PNG whose header claims 12,000 × 10,000 px (120 MP): must be rejected before decoding.
  const hugeHeader = Buffer.alloc(64);
  hugeHeader.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82], 0);
  hugeHeader.writeUInt32BE(12000, 16);
  hugeHeader.writeUInt32BE(10000, 20);
  fs.writeFileSync(path.join(dir, "too-many-pixels.png"), hugeHeader);

  return Object.fromEntries(fs.readdirSync(dir).map((f) => [f, path.join(dir, f)]));
}
