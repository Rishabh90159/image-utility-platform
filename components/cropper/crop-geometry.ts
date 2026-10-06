/**
 * Crop geometry in normalized coordinates: 0–1 across the (rotated) image's
 * width and height. Keeping the crop independent of pixels means the preview
 * can be any size while the real crop is computed at full resolution.
 *
 * `aspect` is the desired output ratio in pixels (width / height). In
 * normalized units that is `aspect * imageHeight / imageWidth`.
 */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export function normalizedAspect(aspect: number, imageWidth: number, imageHeight: number): number {
  return (aspect * imageHeight) / imageWidth;
}

/** The largest crop with the given aspect ratio, centred. Free crops start slightly inset so the handles are easy to grab. */
export function defaultCrop(aspect: number | null, imageWidth: number, imageHeight: number): CropRect {
  if (!aspect) return { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };
  const a = normalizedAspect(aspect, imageWidth, imageHeight);
  const width = a >= 1 ? 1 : a;
  const height = a >= 1 ? 1 / a : 1;
  return { x: (1 - width) / 2, y: (1 - height) / 2, width, height };
}

/**
 * Re-fits a crop to a new aspect ratio: the largest crop of that shape, kept
 * as close as possible to the current crop's centre. (Preserving the old area
 * instead would make the crop shrink a little with every ratio change.)
 */
export function refitCrop(crop: CropRect, aspect: number | null, imageWidth: number, imageHeight: number): CropRect {
  if (!aspect) return clampRect(crop);
  const { width, height } = defaultCrop(aspect, imageWidth, imageHeight);
  const cx = crop.x + crop.width / 2;
  const cy = crop.y + crop.height / 2;
  const x = clamp(cx - width / 2, 0, 1 - width);
  const y = clamp(cy - height / 2, 0, 1 - height);
  return { x, y, width, height };
}

export function moveRect(start: CropRect, dx: number, dy: number): CropRect {
  return {
    ...start,
    x: clamp(start.x + dx, 0, 1 - start.width),
    y: clamp(start.y + dy, 0, 1 - start.height),
  };
}

/**
 * Resizes by dragging a handle by (dx, dy). With an aspect ratio only corner
 * handles are used, and the opposite corner stays fixed.
 */
export function resizeRect(
  start: CropRect,
  handle: Handle,
  dx: number,
  dy: number,
  aspectN: number | null,
  min: { width: number; height: number },
): CropRect {
  const minW = Math.min(min.width, 1);
  const minH = Math.min(min.height, 1);
  let left = start.x;
  let top = start.y;
  let right = start.x + start.width;
  let bottom = start.y + start.height;

  if (!aspectN) {
    if (handle.includes("w")) left = clamp(left + dx, 0, right - minW);
    if (handle.includes("e")) right = clamp(right + dx, left + minW, 1);
    if (handle.includes("n")) top = clamp(top + dy, 0, bottom - minH);
    if (handle.includes("s")) bottom = clamp(bottom + dy, top + minH, 1);
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  // Corner resize with a fixed ratio, anchored at the opposite corner.
  const east = handle.includes("e") || handle === "n" || handle === "s";
  const south = handle.includes("s") || handle === "e" || handle === "w";
  const anchorX = east ? left : right;
  const anchorY = south ? top : bottom;
  const pointerX = (east ? right : left) + dx;
  const pointerY = (south ? bottom : top) + dy;
  let width = Math.abs(pointerX - anchorX);
  let height = Math.abs(pointerY - anchorY);
  // Follow whichever direction the pointer moved further.
  width = Math.max(width, height * aspectN);
  height = width / aspectN;
  const maxW = east ? 1 - anchorX : anchorX;
  const maxH = south ? 1 - anchorY : anchorY;
  if (width > maxW) {
    width = maxW;
    height = width / aspectN;
  }
  if (height > maxH) {
    height = maxH;
    width = height * aspectN;
  }
  const minWidth = Math.max(minW, minH * aspectN);
  if (width < minWidth) {
    width = Math.min(minWidth, maxW, maxH * aspectN);
    height = width / aspectN;
  }
  return {
    x: east ? anchorX : anchorX - width,
    y: south ? anchorY : anchorY - height,
    width,
    height,
  };
}

export function clampRect(rect: CropRect): CropRect {
  const width = clamp(rect.width, 0.001, 1);
  const height = clamp(rect.height, 0.001, 1);
  return { x: clamp(rect.x, 0, 1 - width), y: clamp(rect.y, 0, 1 - height), width, height };
}

/** Converts a normalized crop to whole pixels within the image. */
export function cropToPixels(crop: CropRect, imageWidth: number, imageHeight: number) {
  const x = clamp(Math.round(crop.x * imageWidth), 0, imageWidth - 1);
  const y = clamp(Math.round(crop.y * imageHeight), 0, imageHeight - 1);
  const width = clamp(Math.round(crop.width * imageWidth), 1, imageWidth - x);
  const height = clamp(Math.round(crop.height * imageHeight), 1, imageHeight - y);
  return { x, y, width, height };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
