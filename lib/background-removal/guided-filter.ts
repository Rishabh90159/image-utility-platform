/**
 * Edge-aware mask refinement (He, Sun & Tang, "Guided Image Filtering").
 *
 * The segmentation model works at 320 × 320 pixels, so its mask is blurry
 * when stretched to a full photo. The guided filter fits the mask to the
 * edges of the photo itself: each output value is a local linear function of
 * the photo's brightness, so mask boundaries snap to real edges.
 */

/** Mean over a (2r+1)² window, using only pixels inside the image. */
export function boxMean(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    let count = 0;
    for (let x = 0; x <= Math.min(r, w - 1); x++) {
      sum += src[row + x];
      count++;
    }
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / count;
      const add = x + r + 1;
      const remove = x - r;
      if (add < w) {
        sum += src[row + add];
        count++;
      }
      if (remove >= 0) {
        sum -= src[row + remove];
        count--;
      }
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    let count = 0;
    for (let y = 0; y <= Math.min(r, h - 1); y++) {
      sum += tmp[y * w + x];
      count++;
    }
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / count;
      const add = y + r + 1;
      const remove = y - r;
      if (add < h) {
        sum += tmp[add * w + x];
        count++;
      }
      if (remove >= 0) {
        sum -= tmp[remove * w + x];
        count--;
      }
    }
  }
  return out;
}

/**
 * Returns the smoothed linear coefficients (a, b) such that refined = a · guide + b.
 * Keeping the coefficients instead of the result lets the caller apply them to a
 * higher-resolution guide ("fast guided filter").
 */
export function guidedCoefficients(guide: Float32Array, mask: Float32Array, w: number, h: number, r: number, eps: number) {
  const n = w * h;
  const ip = new Float32Array(n);
  const ii = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    ip[i] = guide[i] * mask[i];
    ii[i] = guide[i] * guide[i];
  }
  const meanI = boxMean(guide, w, h, r);
  const meanP = boxMean(mask, w, h, r);
  const meanIP = boxMean(ip, w, h, r);
  const meanII = boxMean(ii, w, h, r);
  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const cov = meanIP[i] - meanI[i] * meanP[i];
    const variance = meanII[i] - meanI[i] * meanI[i];
    a[i] = cov / (variance + eps);
    b[i] = meanP[i] - a[i] * meanI[i];
  }
  return { a: boxMean(a, w, h, r), b: boxMean(b, w, h, r) };
}

/** Bilinear sample of a w×h float map at fractional coordinates. */
export function sampleBilinear(map: Float32Array, w: number, h: number, x: number, y: number): number {
  const x0 = Math.max(0, Math.min(w - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(h - 1, Math.floor(y)));
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const fx = Math.max(0, Math.min(1, x - x0));
  const fy = Math.max(0, Math.min(1, y - y0));
  const top = map[y0 * w + x0] * (1 - fx) + map[y0 * w + x1] * fx;
  const bottom = map[y1 * w + x0] * (1 - fx) + map[y1 * w + x1] * fx;
  return top * (1 - fy) + bottom * fy;
}
