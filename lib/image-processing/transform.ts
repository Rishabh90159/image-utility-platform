import { createCanvas, getContext2D, releaseCanvas, type AnyCanvas, type DrawableSource } from "./canvas";
import { ImageToolError } from "./errors";
import type { BackgroundCleanup, ImageTransform, PixelRect, QuarterTurn } from "./types";

/** Size of the image after a quarter-turn rotation. */
export function rotatedSize(width: number, height: number, rotate: QuarterTurn = 0): { width: number; height: number } {
  return rotate === 90 || rotate === 270 ? { width: height, height: width } : { width, height };
}

/**
 * Rounds a crop rectangle to whole pixels and keeps it inside the image.
 * Throws a friendly error when nothing would be left.
 */
export function normalizeCrop(crop: PixelRect, width: number, height: number): PixelRect {
  const values = [crop.x, crop.y, crop.width, crop.height];
  if (!values.every(Number.isFinite)) {
    throw new ImageToolError("INVALID_DIMENSIONS", "The crop area isn't valid. Please adjust it and try again.");
  }
  const x = Math.min(Math.max(0, Math.round(crop.x)), width - 1);
  const y = Math.min(Math.max(0, Math.round(crop.y)), height - 1);
  const w = Math.min(Math.round(crop.width), width - x);
  const h = Math.min(Math.round(crop.height), height - y);
  if (w < 1 || h < 1) {
    throw new ImageToolError("INVALID_DIMENSIONS", "The crop area is too small. Select an area of at least 1 × 1 pixel.");
  }
  return { x, y, width: w, height: h };
}

function isIdentity(transform: ImageTransform | undefined, width: number, height: number): boolean {
  if (!transform) return true;
  const { rotate = 0, flipH = false, crop } = transform;
  if (rotate !== 0 || flipH) return false;
  return !crop || (crop.x <= 0 && crop.y <= 0 && crop.width >= width && crop.height >= height);
}

export interface PreparedSource {
  source: DrawableSource;
  /** Frees any canvas created for this job (never the shared decoded bitmap). */
  release: () => void;
}

/**
 * Applies rotation, mirroring, cropping and background clean-up to a decoded
 * image. Returns the original bitmap untouched when nothing needs to change.
 */
export function prepareSource(
  bitmap: DrawableSource,
  transform: ImageTransform | undefined,
  cleanup: BackgroundCleanup | undefined,
): PreparedSource {
  let canvas: AnyCanvas | null = null;
  if (!isIdentity(transform, bitmap.width, bitmap.height)) {
    canvas = drawTransformed(bitmap, transform!);
  }
  if (cleanup) {
    if (!canvas) {
      canvas = createCanvas(bitmap.width, bitmap.height);
      getContext2D(canvas).drawImage(bitmap, 0, 0);
    }
    const ctx = getContext2D(canvas, { willReadFrequently: true });
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    cleanBackground(pixels.data, canvas.width, canvas.height, cleanup);
    ctx.putImageData(pixels, 0, 0);
  }
  if (!canvas) return { source: bitmap, release: () => {} };
  const owned = canvas;
  return { source: owned, release: () => releaseCanvas(owned) };
}

function drawTransformed(source: DrawableSource, transform: ImageTransform): AnyCanvas {
  const rotate = transform.rotate ?? 0;
  const { width: rw, height: rh } = rotatedSize(source.width, source.height, rotate);
  const crop = normalizeCrop(transform.crop ?? { x: 0, y: 0, width: rw, height: rh }, rw, rh);
  const canvas = createCanvas(crop.width, crop.height);
  const ctx = getContext2D(canvas);
  ctx.imageSmoothingEnabled = false;
  // Map rotated/mirrored image coordinates onto the crop canvas.
  ctx.translate(-crop.x, -crop.y);
  if (transform.flipH) {
    ctx.translate(rw, 0);
    ctx.scale(-1, 1);
  }
  const W = source.width;
  const H = source.height;
  if (rotate === 90) {
    ctx.translate(H, 0);
    ctx.rotate(Math.PI / 2);
  } else if (rotate === 180) {
    ctx.translate(W, H);
    ctx.rotate(Math.PI);
  } else if (rotate === 270) {
    ctx.translate(0, W);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.drawImage(source, 0, 0);
  return canvas;
}

/** Width of the soft transition between ink and background, in luminance levels. */
const SOFT_BAND = 40;

/**
 * Estimates the paper brightness around every pixel ("flat-field"), so a
 * shadow or uneven lighting across a phone photo isn't mistaken for ink.
 *
 * The image is divided into cells; each cell's brightest value approximates
 * the paper there. A 3 × 3 maximum over neighbouring cells stops cells that are
 * mostly ink from being treated as dark paper. Values are then interpolated
 * smoothly back to full resolution.
 */
export function estimatePaper(lum: Float32Array, width: number, height: number): Float32Array {
  const cell = Math.max(8, Math.round(Math.max(width, height) / 24));
  const cw = Math.ceil(width / cell);
  const ch = Math.ceil(height / cell);
  const grid = new Float32Array(cw * ch);
  for (let y = 0; y < height; y++) {
    const gy = Math.floor(y / cell) * cw;
    for (let x = 0; x < width; x++) {
      const g = gy + Math.floor(x / cell);
      const v = lum[y * width + x];
      if (v > grid[g]) grid[g] = v;
    }
  }
  const dilated = new Float32Array(cw * ch);
  for (let gy = 0; gy < ch; gy++) {
    for (let gx = 0; gx < cw; gx++) {
      let m = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx >= 0 && ny >= 0 && nx < cw && ny < ch) m = Math.max(m, grid[ny * cw + nx]);
        }
      }
      dilated[gy * cw + gx] = m;
    }
  }
  const paper = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const fy = Math.min(ch - 1, Math.max(0, (y + 0.5) / cell - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(ch - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(cw - 1, Math.max(0, (x + 0.5) / cell - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(cw - 1, x0 + 1);
      const tx = fx - x0;
      const top = dilated[y0 * cw + x0] * (1 - tx) + dilated[y0 * cw + x1] * tx;
      const bottom = dilated[y1 * cw + x0] * (1 - tx) + dilated[y1 * cw + x1] * tx;
      paper[y * width + x] = top * (1 - ty) + bottom * ty;
    }
  }
  return paper;
}

/**
 * Turns the paper background white or transparent, in place. Each pixel's
 * brightness is first compared with the paper brightness around it, so
 * shadows are evened out. Pixels whose relative brightness is above
 * `threshold` are background; pixels well below it are ink; a narrow band in
 * between is blended so anti-aliased pen strokes keep smooth edges.
 */
export function cleanBackground(data: Uint8ClampedArray, width: number, height: number, { threshold, to }: BackgroundCleanup): void {
  const t = Math.min(255, Math.max(1, threshold));
  const band = Math.min(SOFT_BAND, t);
  const count = width * height;
  const lum = new Float32Array(count);
  for (let p = 0; p < count; p++) {
    const i = p * 4;
    const a = data[i + 3] / 255;
    // Judge each pixel as it looks on white, so transparent areas count as background.
    lum[p] = 0.299 * (data[i] * a + 255 * (1 - a)) + 0.587 * (data[i + 1] * a + 255 * (1 - a)) + 0.114 * (data[i + 2] * a + 255 * (1 - a));
  }
  const paper = estimatePaper(lum, width, height);

  for (let p = 0; p < count; p++) {
    const i = p * 4;
    const a = data[i + 3] / 255;
    const bg = Math.max(paper[p], 1);
    const gain = 255 / bg;
    const relative = Math.min(255, lum[p] * gain);
    // Ink strength: 1 = keep as ink, 0 = background.
    const ink = relative >= t ? 0 : relative <= t - band ? 1 : (t - relative) / band;
    // Colour with the paper tint and shadow removed.
    const r = Math.min(255, (data[i] * a + 255 * (1 - a)) * gain);
    const g = Math.min(255, (data[i + 1] * a + 255 * (1 - a)) * gain);
    const b = Math.min(255, (data[i + 2] * a + 255 * (1 - a)) * gain);
    if (to === "white") {
      data[i] = r + (255 - r) * (1 - ink);
      data[i + 1] = g + (255 - g) * (1 - ink);
      data[i + 2] = b + (255 - b) * (1 - ink);
      data[i + 3] = 255;
    } else if (ink === 0) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 0;
    } else if (ink < 1) {
      // Separate the ink colour from the white it was blended with.
      data[i] = (r - 255 * (1 - ink)) / ink;
      data[i + 1] = (g - 255 * (1 - ink)) / ink;
      data[i + 2] = (b - 255 * (1 - ink)) / ink;
      data[i + 3] = 255 * ink;
    } else {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
}
