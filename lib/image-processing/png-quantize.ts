/**
 * Colour quantization for PNG compression.
 *
 * PNG is lossless, so the only way to make a PNG substantially smaller is to
 * reduce the number of distinct colours and store it as an indexed (palette)
 * image — the same idea behind tools like pngquant. This is lossy.
 *
 * Steps:
 * 1. If the image already uses <= maxColors exact colours, keep them all (no quality loss).
 * 2. Otherwise build a histogram of colours (5 bits per RGBA channel), split it
 *    with median cut into maxColors boxes, and use each box's average as a palette entry.
 * 3. Map each pixel to its nearest palette colour, optionally with Floyd–Steinberg
 *    dithering so smooth gradients don't turn into visible bands.
 */
export interface QuantizedImage {
  /** One palette index per pixel. */
  indices: Uint8Array;
  /** RGBA palette, 4 bytes per entry. */
  palette: Uint8Array;
  colorCount: number;
  /** True when the palette reproduces every pixel exactly. */
  lossless: boolean;
}

const TRANSPARENT_KEY = 0;

export function quantize(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  maxColors: number,
  dither = true,
): QuantizedImage {
  const colors = Math.max(2, Math.min(256, Math.floor(maxColors)));
  const exact = exactPalette(data, colors);
  if (exact) return exact;

  const pixelCount = width * height;

  // 1. Histogram on 5-bit RGBA keys. Nearly transparent pixels collapse into one key.
  const counts = new Uint32Array(1 << 20);
  for (let i = 0; i < pixelCount; i++) {
    counts[keyOf(data, i * 4)]++;
  }

  // 2. Compact non-empty buckets and accumulate their true average colours.
  const entryOf = new Int32Array(1 << 20).fill(-1);
  let entries = 0;
  let hasTransparent = false;
  for (let k = 0; k < counts.length; k++) {
    if (counts[k] === 0) continue;
    if (k === TRANSPARENT_KEY) {
      hasTransparent = true;
      continue;
    }
    entryOf[k] = entries++;
  }
  const sums = new Float64Array(entries * 4);
  const weights = new Float64Array(entries);
  for (let i = 0; i < pixelCount; i++) {
    const j = i * 4;
    const e = entryOf[keyOf(data, j)];
    if (e < 0) continue;
    sums[e * 4] += data[j];
    sums[e * 4 + 1] += data[j + 1];
    sums[e * 4 + 2] += data[j + 2];
    sums[e * 4 + 3] += data[j + 3];
    weights[e]++;
  }
  const entryColor = new Float64Array(entries * 4);
  for (let e = 0; e < entries; e++) {
    for (let c = 0; c < 4; c++) entryColor[e * 4 + c] = sums[e * 4 + c] / weights[e];
  }

  // 3. Median cut over the opaque/semi-opaque colours. Transparency gets its own slot.
  const opaqueSlots = hasTransparent ? colors - 1 : colors;
  const opaquePalette = medianCut(entryColor, weights, entries, opaqueSlots);
  const paletteCount = opaquePalette.length / 4 + (hasTransparent ? 1 : 0);
  const palette = new Uint8Array(paletteCount * 4);
  palette.set(opaquePalette, 0);
  const transparentIndex = hasTransparent ? paletteCount - 1 : -1;
  // A fully transparent entry: rgba(0,0,0,0) is already the zero-initialised value.

  // 4. Map pixels to the palette.
  const indices = new Uint8Array(pixelCount);
  const nearestCache = new Int16Array(1 << 20).fill(-1);
  const opaqueCount = opaquePalette.length / 4;

  const nearest = (r: number, g: number, b: number, a: number): number => {
    const key = a < 8 ? TRANSPARENT_KEY : packKey(r, g, b, a);
    if (key === TRANSPARENT_KEY && transparentIndex >= 0) return transparentIndex;
    const cached = nearestCache[key];
    if (cached >= 0) return cached;
    // Use the centre of the 5-bit bucket so cached answers are consistent.
    const cr = ((key >> 15) & 31) * 8 + 4;
    const cg = ((key >> 10) & 31) * 8 + 4;
    const cb = ((key >> 5) & 31) * 8 + 4;
    const ca = (key & 31) * 8 + 4;
    let best = 0;
    let bestDistance = Infinity;
    for (let p = 0; p < opaqueCount; p++) {
      const o = p * 4;
      const dr = palette[o] - cr;
      const dg = palette[o + 1] - cg;
      const db = palette[o + 2] - cb;
      const da = palette[o + 3] - ca;
      const distance = 2 * dr * dr + 4 * dg * dg + 3 * db * db + 3 * da * da;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = p;
      }
    }
    nearestCache[key] = best;
    return best;
  };

  if (!dither) {
    for (let i = 0; i < pixelCount; i++) {
      const j = i * 4;
      indices[i] = nearest(data[j], data[j + 1], data[j + 2], data[j + 3]);
    }
  } else {
    floydSteinberg(data, width, height, palette, indices, nearest);
  }

  return { indices, palette, colorCount: paletteCount, lossless: false };
}

function packKey(r: number, g: number, b: number, a: number): number {
  return ((r >> 3) << 15) | ((g >> 3) << 10) | ((b >> 3) << 5) | (a >> 3);
}

function keyOf(data: Uint8ClampedArray, j: number): number {
  const a = data[j + 3];
  if (a < 8) return TRANSPARENT_KEY;
  return packKey(data[j], data[j + 1], data[j + 2], a);
}

/** Returns a lossless palette if the image has at most `maxColors` exact colours. */
function exactPalette(data: Uint8ClampedArray, maxColors: number): QuantizedImage | null {
  const pixelCount = data.length >>> 2;
  const map = new Map<number, number>();
  const indices = new Uint8Array(pixelCount);
  let lastColor = -1;
  let lastIndex = 0;
  for (let i = 0; i < pixelCount; i++) {
    const j = i * 4;
    const a = data[j + 3];
    // All fully transparent pixels are equivalent regardless of their RGB values.
    const color = a === 0 ? 0 : ((data[j] << 24) | (data[j + 1] << 16) | (data[j + 2] << 8) | a) >>> 0;
    if (color === lastColor) {
      indices[i] = lastIndex;
      continue;
    }
    let index = map.get(color);
    if (index === undefined) {
      if (map.size >= maxColors) return null;
      index = map.size;
      map.set(color, index);
    }
    indices[i] = index;
    lastColor = color;
    lastIndex = index;
  }
  const palette = new Uint8Array(map.size * 4);
  for (const [color, index] of map) {
    palette[index * 4] = (color >>> 24) & 255;
    palette[index * 4 + 1] = (color >>> 16) & 255;
    palette[index * 4 + 2] = (color >>> 8) & 255;
    palette[index * 4 + 3] = color & 255;
  }
  return { indices, palette, colorCount: map.size, lossless: true };
}

interface Box {
  start: number;
  end: number; // exclusive
  population: number;
  score: number;
  channel: number;
}

/** Median cut on weighted colour entries. Returns an RGBA palette. */
function medianCut(colors: Float64Array, weights: Float64Array, count: number, maxColors: number): Uint8Array {
  if (count === 0) return new Uint8Array(0);
  const order = new Uint32Array(count);
  for (let i = 0; i < count; i++) order[i] = i;

  const describe = (start: number, end: number): Box => {
    const min = [255, 255, 255, 255];
    const max = [0, 0, 0, 0];
    let population = 0;
    for (let i = start; i < end; i++) {
      const e = order[i];
      population += weights[e];
      for (let c = 0; c < 4; c++) {
        const v = colors[e * 4 + c];
        if (v < min[c]) min[c] = v;
        if (v > max[c]) max[c] = v;
      }
    }
    // Perceptual weighting: green differences matter most, then red, blue, alpha.
    const ranges = [(max[0] - min[0]) * 1.2, (max[1] - min[1]) * 1.6, (max[2] - min[2]) * 1.0, (max[3] - min[3]) * 1.4];
    let channel = 0;
    for (let c = 1; c < 4; c++) if (ranges[c] > ranges[channel]) channel = c;
    const range = ranges[channel];
    // Splitting boxes with many pixels and a wide colour range reduces visible error the most.
    const score = end - start > 1 ? range * Math.sqrt(population) : 0;
    return { start, end, population, score, channel };
  };

  const boxes: Box[] = [describe(0, count)];
  while (boxes.length < maxColors) {
    let target = -1;
    for (let b = 0; b < boxes.length; b++) {
      if (boxes[b].score > 0 && (target < 0 || boxes[b].score > boxes[target].score)) target = b;
    }
    if (target < 0) break;
    const box = boxes[target];
    const channel = box.channel;
    const slice = order.subarray(box.start, box.end);
    slice.sort((a, b) => colors[a * 4 + channel] - colors[b * 4 + channel]);

    // Split at the weighted median.
    const half = box.population / 2;
    let acc = 0;
    let split = box.start + 1;
    for (let i = box.start; i < box.end - 1; i++) {
      acc += weights[order[i]];
      if (acc >= half) {
        split = i + 1;
        break;
      }
      split = i + 2;
    }
    split = Math.min(Math.max(split, box.start + 1), box.end - 1);
    boxes.splice(target, 1, describe(box.start, split), describe(split, box.end));
  }

  const palette = new Uint8Array(boxes.length * 4);
  boxes.forEach((box, p) => {
    const acc = [0, 0, 0, 0];
    let total = 0;
    for (let i = box.start; i < box.end; i++) {
      const e = order[i];
      const w = weights[e];
      total += w;
      for (let c = 0; c < 4; c++) acc[c] += colors[e * 4 + c] * w;
    }
    for (let c = 0; c < 4; c++) palette[p * 4 + c] = Math.round(acc[c] / total);
    // Snap near-opaque averages to fully opaque so opaque images stay opaque.
    if (palette[p * 4 + 3] >= 250) palette[p * 4 + 3] = 255;
  });
  return palette;
}

function floydSteinberg(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  palette: Uint8Array,
  indices: Uint8Array,
  nearest: (r: number, g: number, b: number, a: number) => number,
): void {
  // Slightly reduced error diffusion keeps noise low while still breaking up banding.
  const strength = 0.85;
  let current = new Float32Array((width + 2) * 3);
  let next = new Float32Array((width + 2) * 3);
  for (let y = 0; y < height; y++) {
    next.fill(0);
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const j = i * 4;
      const a = data[j + 3];
      const e = (x + 1) * 3;
      if (a < 8) {
        indices[i] = nearest(0, 0, 0, 0);
        continue;
      }
      const r = clamp(data[j] + current[e]);
      const g = clamp(data[j + 1] + current[e + 1]);
      const b = clamp(data[j + 2] + current[e + 2]);
      const p = nearest(r, g, b, a);
      indices[i] = p;
      // Alpha is not dithered: noisy edges look worse than slightly stepped ones.
      if (palette[p * 4 + 3] < 8) continue;
      const er = (r - palette[p * 4]) * strength;
      const eg = (g - palette[p * 4 + 1]) * strength;
      const eb = (b - palette[p * 4 + 2]) * strength;
      // Right: 7/16, below-left: 3/16, below: 5/16, below-right: 1/16.
      current[e + 3] += (er * 7) / 16;
      current[e + 4] += (eg * 7) / 16;
      current[e + 5] += (eb * 7) / 16;
      next[e - 3] += (er * 3) / 16;
      next[e - 2] += (eg * 3) / 16;
      next[e - 1] += (eb * 3) / 16;
      next[e] += (er * 5) / 16;
      next[e + 1] += (eg * 5) / 16;
      next[e + 2] += (eb * 5) / 16;
      next[e + 3] += er / 16;
      next[e + 4] += eg / 16;
      next[e + 5] += eb / 16;
    }
    const swap = current;
    current = next;
    next = swap;
  }
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}
