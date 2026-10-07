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

/** Extra fixtures for the Phase 2 and Phase 3 tools: HEIC, SVGs, logos, portraits and signatures. */
export async function generatePhase2Fixtures(browser, FIX) {
  const out = {};
  const heicDir = "tests/fixtures/heic";
  const heic = path.join(heicDir, "example.heic");
  if (!fs.existsSync(heic)) {
    fs.mkdirSync(heicDir, { recursive: true });
    const res = await fetch("https://github.com/strukturag/libheif/raw/master/examples/example.heic");
    fs.writeFileSync(heic, Buffer.from(await res.arrayBuffer()));
  }
  out["example.heic"] = heic;
  const heif = path.join(FIX, "example.heif");
  fs.copyFileSync(heic, heif);
  out["example.heif"] = heif;
  const broken = Buffer.from(fs.readFileSync(heic).subarray(0, 4000));
  for (let i = 1200; i < broken.length; i++) broken[i] = (i * 31) % 256;
  fs.writeFileSync(path.join(FIX, "broken.heic"), broken);
  out["broken.heic"] = path.join(FIX, "broken.heic");

  const svgs = {
    "simple.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect x="40" y="20" width="120" height="60" rx="8" fill="#e8402a"/></svg>`,
    "complex.svg": `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY ns_svg "http://www.w3.org/2000/svg">]>
<svg xmlns="&ns_svg;" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" inkscape:version="1.3" width="800" height="600" viewBox="0 0 800 600">
<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#0b6b5d"/><stop offset="1" stop-color="#5b8def"/></linearGradient>
<filter id="blur"><feGaussianBlur stdDeviation="3"/></filter><symbol id="star" viewBox="0 0 10 10"><path d="M5 0l1.5 3.5L10 4 7.5 6.5 8 10 5 8 2 10l.5-3.5L0 4l3.5-.5z"/></symbol>
<style>.t{font:bold 48px sans-serif;fill:#fff}</style></defs>
<rect width="800" height="600" fill="url(#g)"/>
${Array.from({ length: 400 }, (_, i) => `<circle cx="${(i * 37) % 800}" cy="${(i * 53) % 600}" r="${(i % 9) + 2}" fill="hsl(${i % 360},70%,60%)" opacity="0.6"/>`).join("")}
<use xlink:href="#star" x="350" y="250" width="100" height="100" fill="#ffd400" filter="url(#blur)"/>
<text x="400" y="560" text-anchor="middle" class="t">Complex SVG</text></svg>`,
    "no-size.svg": `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#123"/></svg>`,
    "malicious.svg": `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="300" height="300" onload="window.__pwned=true;alert('svg onload')">
<script>window.__pwned = true; document.title = "pwned"; alert("script");</script>
<style>@import url("https://evil.example/x.css"); rect { fill: url("https://evil.example/p.svg#a"); }</style>
<foreignObject width="300" height="300"><iframe xmlns="http://www.w3.org/1999/xhtml" src="https://evil.example/"></iframe></foreignObject>
<image href="https://evil.example/track.png" width="10" height="10"/>
<a xlink:href="javascript:alert('link')"><text x="10" y="20">click</text></a>
<rect x="50" y="50" width="200" height="200" fill="#2a7" onclick="alert('click')"/>
<animate attributeName="href" values="javascript:alert(1)"/>
<circle cx="150" cy="150" r="60" fill="#2a7"/></svg>`,
    "invalid.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"></svg>`,
    "entity-bomb.svg": `<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;"><!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;">]><svg xmlns="http://www.w3.org/2000/svg"><text>&c;</text></svg>`,
    "not-svg.svg": "just some text, not an svg at all",
  };
  for (const [name, text] of Object.entries(svgs)) {
    fs.writeFileSync(path.join(FIX, name), text);
    out[name] = path.join(FIX, name);
  }

  const page = await browser.newPage();
  await page.setContent("<html><body></body></html>");
  const specs = {
    "logo.png": { w: 600, h: 400, mime: "image/png", draw: "logo" },
    "icon-transparent.png": { w: 256, h: 256, mime: "image/png", draw: "icon" },
    "tiny-logo.png": { w: 32, h: 24, mime: "image/png", draw: "logo" },
    "portrait.jpg": { w: 1200, h: 1600, mime: "image/jpeg", draw: "portrait" },
    "signature.jpg": { w: 1400, h: 700, mime: "image/jpeg", draw: "signature" },
    "signature-transparent.png": { w: 600, h: 240, mime: "image/png", draw: "signature-alpha" },
    "signature-small.png": { w: 120, h: 45, mime: "image/png", draw: "signature" },
  };
  for (const [name, spec] of Object.entries(specs)) {
    const b64 = await page.evaluate(async ({ w, h, mime, draw }) => {
      const c = new OffscreenCanvas(w, h);
      const ctx = c.getContext("2d");
      const scribble = (color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, h / 40);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(w * 0.1, h * 0.6);
        for (let i = 0; i <= 40; i++) ctx.lineTo(w * (0.1 + i * 0.02), h * (0.5 + 0.25 * Math.sin(i * 0.9)));
        ctx.stroke();
      };
      if (draw === "logo") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#0b6b5d";
        ctx.beginPath();
        ctx.arc(w * 0.35, h * 0.5, h * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f2a900";
        ctx.fillRect(w * 0.5, h * 0.25, w * 0.3, h * 0.5);
      } else if (draw === "icon") {
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.moveTo(w / 2, h * 0.1);
        ctx.lineTo(w * 0.9, h * 0.9);
        ctx.lineTo(w * 0.1, h * 0.9);
        ctx.closePath();
        ctx.fill();
      } else if (draw === "portrait") {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#e9ecef");
        g.addColorStop(1, "#cfd4da");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#c68e6d";
        ctx.beginPath();
        ctx.ellipse(w / 2, h * 0.4, w * 0.18, h * 0.17, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2b3a55";
        ctx.fillRect(w * 0.2, h * 0.62, w * 0.6, h * 0.38);
        const img = ctx.getImageData(0, 0, w, h);
        let seed = 7;
        for (let i = 0; i < img.data.length; i += 4) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          const n = (seed % 25) - 12;
          img.data[i] += n;
          img.data[i + 1] += n;
          img.data[i + 2] += n;
        }
        ctx.putImageData(img, 0, 0);
      } else if (draw === "signature") {
        ctx.fillStyle = "#d9d4c7"; // greyish paper
        ctx.fillRect(0, 0, w, h);
        const s = ctx.createLinearGradient(0, 0, w, 0);
        s.addColorStop(0, "rgba(0,0,0,0.12)");
        s.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = s;
        ctx.fillRect(0, 0, w, h);
        scribble("#1a2a6c");
      } else {
        scribble("#000000");
      }
      const blob = await c.convertToBlob({ type: mime, quality: 0.92 });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    }, spec);
    fs.writeFileSync(path.join(FIX, name), Buffer.from(b64, "base64"));
    out[name] = path.join(FIX, name);
  }
  await page.close();
  return out;
}
