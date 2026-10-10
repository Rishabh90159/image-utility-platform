import type { PixelRect } from "./types";

/**
 * Geometry for "fit" mode: the whole image is scaled to sit inside an output
 * frame of a different shape, and the space left over is filled with a
 * background. Pure functions, shared by the live preview and the encoder, so
 * what the user sees is exactly what gets drawn.
 */
export interface FitLayout {
  /** Output size in pixels. */
  width: number;
  height: number;
  /** 0–1 position along the axis that has spare room (0 = left/top, 0.5 = centre, 1 = right/bottom). */
  alignX: number;
  alignY: number;
  /** Border on every side, as a fraction of the shorter output side (0–0.25). */
  border: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Where the image goes inside the frame, in whole output pixels. Never stretches: the source ratio is kept. */
export function fitPlacement(sourceWidth: number, sourceHeight: number, layout: FitLayout): PixelRect {
  const { width, height } = layout;
  const inset = Math.round(Math.min(width, height) * clamp(layout.border, 0, 0.25));
  const boxW = Math.max(1, width - inset * 2);
  const boxH = Math.max(1, height - inset * 2);
  const scale = Math.min(boxW / sourceWidth, boxH / sourceHeight);
  const w = clamp(Math.round(sourceWidth * scale), 1, boxW);
  const h = clamp(Math.round(sourceHeight * scale), 1, boxH);
  return {
    x: inset + Math.round((boxW - w) * clamp(layout.alignX, 0, 1)),
    y: inset + Math.round((boxH - h) * clamp(layout.alignY, 0, 1)),
    width: w,
    height: h,
  };
}

/** The part of the source that fills the frame when scaled to cover it (used for the blurred background). */
export function coverSourceRect(sourceWidth: number, sourceHeight: number, frameWidth: number, frameHeight: number): PixelRect {
  const frameRatio = frameWidth / frameHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  if (sourceRatio > frameRatio) {
    const w = sourceHeight * frameRatio;
    return { x: (sourceWidth - w) / 2, y: 0, width: w, height: sourceHeight };
  }
  const h = sourceWidth / frameRatio;
  return { x: 0, y: (sourceHeight - h) / 2, width: sourceWidth, height: h };
}

/** True when the source and frame shapes differ by more than half a percent, i.e. crop or fit actually matters. */
export function shapesDiffer(sourceWidth: number, sourceHeight: number, frameWidth: number, frameHeight: number): boolean {
  return Math.abs(sourceWidth / sourceHeight / (frameWidth / frameHeight) - 1) > 0.005;
}
