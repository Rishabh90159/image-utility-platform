import { luminance, unsharpMask, type Pixels } from "./resample";

/**
 * Photo adjustments for the image quality enhancer. These are classic image
 * processing operations (levels, tone curves, colour, unsharp masking), not a
 * machine-learning model. They improve images that are dull, flat, dark or a
 * little soft; they can't restore detail that was never captured.
 */
export interface EnhanceSettings {
  /** Stretch the brightness range so the darkest and lightest tones use the full range. */
  autoLevels: boolean;
  /** −100 … 100 */
  brightness: number;
  /** −100 … 100 */
  contrast: number;
  /** −100 … 100 (−100 = greyscale) */
  saturation: number;
  /** −100 … 100: cooler (blue) to warmer (orange). */
  warmth: number;
  /** 0 … 100: local contrast that brings out texture and mid-tone detail. */
  clarity: number;
  /** 0 … 100: fine-edge sharpening. */
  sharpen: number;
}

export const NEUTRAL_SETTINGS: EnhanceSettings = { autoLevels: false, brightness: 0, contrast: 0, saturation: 0, warmth: 0, clarity: 0, sharpen: 0 };

/** A balanced starting point for typical phone photos. */
export const AUTO_SETTINGS: EnhanceSettings = { autoLevels: true, brightness: 0, contrast: 10, saturation: 10, warmth: 0, clarity: 25, sharpen: 30 };

export function isNeutral(s: EnhanceSettings): boolean {
  return !s.autoLevels && s.brightness === 0 && s.contrast === 0 && s.saturation === 0 && s.warmth === 0 && s.clarity === 0 && s.sharpen === 0;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Narrowest tonal range auto levels will stretch to full scale. */
const MIN_LEVEL_RANGE = 96;

/** Darkest and lightest luma levels after ignoring the extreme 0.5% at each end. */
export function levelRange(luma: Uint8Array, alpha?: Uint8ClampedArray): { low: number; high: number } {
  const hist = new Uint32Array(256);
  let total = 0;
  for (let p = 0; p < luma.length; p++) {
    if (alpha && alpha[p * 4 + 3] < 128) continue;
    hist[luma[p]]++;
    total++;
  }
  if (total === 0) return { low: 0, high: 255 };
  const cut = total * 0.005;
  let low = 0;
  for (let acc = 0; low < 255 && acc + hist[low] <= cut; low++) acc += hist[low];
  let high = 255;
  for (let acc = 0; high > 0 && acc + hist[high] <= cut; high--) acc += hist[high];
  if (high - low < 16) return { low: 0, high: 255 };
  // Cap the stretch (at most about 2.7×). Stretching a very narrow range much further
  // turns tiny colour differences into strong colour casts and visible banding.
  if (high - low < MIN_LEVEL_RANGE) {
    const mid = (low + high) / 2;
    low = Math.max(0, Math.round(mid - MIN_LEVEL_RANGE / 2));
    high = Math.min(255, low + MIN_LEVEL_RANGE);
    low = high - MIN_LEVEL_RANGE;
  }
  return { low, high };
}

/** Tone curve for levels, brightness and contrast, as a 256-entry lookup table. */
export function toneCurve(s: EnhanceSettings, range: { low: number; high: number }): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const { low, high } = s.autoLevels ? range : { low: 0, high: 255 };
  const b = s.brightness / 100;
  // Contrast pivots around mid-grey; +100 roughly doubles the slope.
  const c = Math.tan(((s.contrast / 100) * 0.5 + 1) * (Math.PI / 4));
  for (let v = 0; v < 256; v++) {
    let x = clamp((v - low) / (high - low), 0, 1);
    // Brightness as a gamma-like lift so highlights don't clip as fast as a plain offset.
    x = b >= 0 ? 1 - Math.pow(1 - x, 1 + b * 1.5) : Math.pow(x, 1 - b * 1.5);
    x = (x - 0.5) * c + 0.5;
    lut[v] = clamp(x, 0, 1) * 255 + 0.5;
  }
  return lut;
}

/** Applies the adjustments in place. */
export function enhancePixels(px: Pixels, s: EnhanceSettings): void {
  const { data, width, height } = px;
  if (isNeutral(s)) return;

  if (s.autoLevels || s.brightness || s.contrast) {
    const lut = toneCurve(s, levelRange(luminance(data), data));
    for (let i = 0; i < data.length; i += 4) {
      data[i] = lut[data[i]];
      data[i + 1] = lut[data[i + 1]];
      data[i + 2] = lut[data[i + 2]];
    }
  }

  if (s.saturation || s.warmth) {
    const sat = 1 + s.saturation / 100;
    const warm = (s.warmth / 100) * 18;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = y + (r - y) * sat + warm;
      data[i + 1] = y + (g - y) * sat + warm * 0.25;
      data[i + 2] = y + (b - y) * sat - warm;
    }
  }

  if (s.clarity > 0) {
    // Local contrast: a large-radius unsharp mask, kept gentle and applied to brightness only.
    const radius = Math.max(2, Math.round(Math.max(width, height) / 120));
    unsharpMask(px, (s.clarity / 100) * 0.6, radius, 2);
  }
  if (s.sharpen > 0) {
    const radius = Math.max(0.8, Math.max(width, height) / 2400);
    unsharpMask(px, (s.sharpen / 100) * 1.4, radius, 3);
  }
}

