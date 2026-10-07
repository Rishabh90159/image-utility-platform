/**
 * High-quality resampling and sharpening on raw RGBA pixels.
 *
 * Browsers' own canvas scaling uses bilinear or bicubic filters, which look
 * soft when enlarging. Lanczos-3 keeps edges noticeably crisper. It is still
 * interpolation: it can't invent detail that isn't in the original. These
 * functions are pure and run in the image worker.
 */

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

const LOBES = 3;

function sinc(x: number): number {
  if (x === 0) return 1;
  const px = Math.PI * x;
  return Math.sin(px) / px;
}

function lanczos(x: number): number {
  return Math.abs(x) < LOBES ? sinc(x) * sinc(x / LOBES) : 0;
}

interface Contributions {
  /** First source index for each output index. */
  start: Int32Array;
  /** Number of taps for each output index. */
  count: Int32Array;
  /** Normalised weights, `taps` per output index. */
  weights: Float32Array;
  taps: number;
}

/** Precomputes filter taps for one axis. */
function contributions(inSize: number, outSize: number): Contributions {
  const scale = outSize / inSize;
  // When shrinking, widen the filter so every source pixel contributes (no aliasing).
  const filterScale = Math.max(1, 1 / scale);
  const support = LOBES * filterScale;
  const taps = Math.ceil(support) * 2 + 1;
  const start = new Int32Array(outSize);
  const count = new Int32Array(outSize);
  const weights = new Float32Array(outSize * taps);
  for (let o = 0; o < outSize; o++) {
    const center = (o + 0.5) / scale - 0.5;
    const first = Math.max(0, Math.floor(center - support) + 1);
    const last = Math.min(inSize - 1, Math.floor(center + support));
    let sum = 0;
    let n = 0;
    for (let i = first; i <= last && n < taps; i++, n++) {
      const w = lanczos((i - center) / filterScale);
      weights[o * taps + n] = w;
      sum += w;
    }
    if (sum !== 0) for (let k = 0; k < n; k++) weights[o * taps + k] /= sum;
    start[o] = first;
    count[o] = n;
  }
  return { start, count, weights, taps };
}

/**
 * Lanczos-3 resize. Works on premultiplied alpha so transparent edges don't
 * pick up dark fringes. Horizontal rows are computed on demand and only a few
 * are kept in memory, so enlarging to tens of megapixels doesn't need a
 * full-size floating-point copy.
 */
export function resampleLanczos(src: Pixels, outWidth: number, outHeight: number, onRow?: (fraction: number) => void): Pixels {
  const { data, width: inW, height: inH } = src;
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);
  const xc = contributions(inW, outWidth);
  const yc = contributions(inH, outHeight);

  const rowCache = new Map<number, Float32Array>();
  const horizontalRow = (y: number): Float32Array => {
    let row = rowCache.get(y);
    if (row) return row;
    row = new Float32Array(outWidth * 4);
    const base = y * inW * 4;
    for (let x = 0; x < outWidth; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      const s = xc.start[x];
      const off = x * xc.taps;
      for (let k = 0; k < xc.count[x]; k++) {
        const p = base + (s + k) * 4;
        // Premultiply alpha on the fly (no full-size float copy of the source).
        const alpha = data[p + 3];
        const wa = (xc.weights[off + k] * alpha) / 255;
        r += data[p] * wa;
        g += data[p + 1] * wa;
        b += data[p + 2] * wa;
        a += alpha * xc.weights[off + k];
      }
      const o = x * 4;
      row[o] = r;
      row[o + 1] = g;
      row[o + 2] = b;
      row[o + 3] = a;
    }
    rowCache.set(y, row);
    return row;
  };

  const reportEvery = Math.max(1, Math.floor(outHeight / 50));
  for (let y = 0; y < outHeight; y++) {
    const s = yc.start[y];
    const n = yc.count[y];
    const off = y * yc.taps;
    // Rows above the current window are never needed again.
    for (const key of rowCache.keys()) if (key < s) rowCache.delete(key);
    const rows: Float32Array[] = [];
    for (let k = 0; k < n; k++) rows.push(horizontalRow(s + k));
    const outBase = y * outWidth * 4;
    for (let x = 0; x < outWidth * 4; x += 4) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < n; k++) {
        const w = yc.weights[off + k];
        const row = rows[k];
        r += row[x] * w;
        g += row[x + 1] * w;
        b += row[x + 2] * w;
        a += row[x + 3] * w;
      }
      const o = outBase + x;
      if (a <= 0.5) {
        out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0;
      } else {
        const alpha = Math.min(255, a);
        const inv = 255 / alpha;
        out[o] = r * inv;
        out[o + 1] = g * inv;
        out[o + 2] = b * inv;
        out[o + 3] = alpha;
      }
    }
    if (onRow && y % reportEvery === 0) onRow(y / outHeight);
  }
  return { data: out, width: outWidth, height: outHeight };
}

/** Radii of three box blurs that together approximate a Gaussian blur of the given sigma. */
function boxSizes(sigma: number): number[] {
  const n = 3;
  const ideal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(ideal);
  if (wl % 2 === 0) wl--;
  const wu = wl + 2;
  const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  return Array.from({ length: n }, (_, i) => ((i < m ? wl : wu) - 1) / 2);
}

function boxBlurH(src: Uint8Array, dst: Uint8Array, w: number, h: number, r: number) {
  const size = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    const first = src[row];
    let sum = first * (r + 1);
    for (let i = 0; i < r; i++) sum += src[row + Math.min(i, w - 1)];
    for (let x = 0; x < w; x++) {
      sum += src[row + Math.min(x + r, w - 1)] - (x - r - 1 >= 0 ? src[row + x - r - 1] : first);
      dst[row + x] = (sum / size + 0.5) | 0;
    }
  }
}

function boxBlurV(src: Uint8Array, dst: Uint8Array, w: number, h: number, r: number) {
  const size = r * 2 + 1;
  for (let x = 0; x < w; x++) {
    const first = src[x];
    let sum = first * (r + 1);
    for (let i = 0; i < r; i++) sum += src[Math.min(i, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      sum += src[Math.min(y + r, h - 1) * w + x] - (y - r - 1 >= 0 ? src[(y - r - 1) * w + x] : first);
      dst[y * w + x] = (sum / size + 0.5) | 0;
    }
  }
}

/** Approximate Gaussian blur of a single 8-bit channel. */
export function gaussianBlur(channel: Uint8Array, width: number, height: number, sigma: number): Uint8Array {
  let a: Uint8Array = Uint8Array.from(channel);
  let b: Uint8Array = new Uint8Array(channel.length);
  if (sigma < 0.3) return a;
  for (const r of boxSizes(sigma)) {
    if (r < 1) continue;
    boxBlurH(a, b, width, height, r);
    boxBlurV(b, a, width, height, r);
  }
  return a;
}

/** Rec. 601 luma of every pixel. */
export function luminance(data: Uint8ClampedArray): Uint8Array {
  const y = new Uint8Array(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) y[p] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114 + 500) / 1000;
  return y;
}

/**
 * Unsharp mask on brightness only, so colours don't shift or fringe.
 * `amount` 0–3 (1 = add the full difference), `radius` is the blur sigma in
 * pixels, and differences below `threshold` (0–255) are left alone so flat
 * areas and noise aren't amplified.
 */
export function unsharpMask(px: Pixels, amount: number, radius: number, threshold = 0): void {
  if (amount <= 0 || radius <= 0) return;
  const { data, width, height } = px;
  const luma = luminance(data);
  const blurred = gaussianBlur(luma, width, height, radius);
  for (let p = 0, i = 0; p < luma.length; p++, i += 4) {
    const diff = luma[p] - blurred[p];
    if (Math.abs(diff) <= threshold) continue;
    const delta = diff * amount;
    data[i] += delta;
    data[i + 1] += delta;
    data[i + 2] += delta;
  }
}
