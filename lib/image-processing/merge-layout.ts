import { LIMITS } from "./formats";

/**
 * Layout for combining several images into one. Pure geometry, so it is
 * tested without a browser. Images keep their aspect ratio: they are scaled
 * uniformly and never stretched.
 */
export type MergeDirection = "vertical" | "horizontal" | "grid";
/** How differently sized images are matched: shrink to the smallest, enlarge to the largest, or leave as they are. */
export type MergeMatch = "smallest" | "largest" | "original";

export interface MergeLayoutOptions {
  direction: MergeDirection;
  match: MergeMatch;
  /** Grid only. */
  columns: number;
  /** Gap between images and around the edge, in output pixels (before any limit scaling). */
  spacing: number;
}

export interface MergeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MergeLayout {
  width: number;
  height: number;
  rects: MergeRect[];
  /** Scale applied to everything to stay within browser canvas limits (1 = none). */
  limitScale: number;
}

type Size = { width: number; height: number };

function pick(values: number[], match: MergeMatch): number {
  return match === "largest" ? Math.max(...values) : Math.min(...values);
}

export function mergeLayout(sizes: Size[], options: MergeLayoutOptions): MergeLayout {
  if (sizes.length === 0) throw new Error("No images");
  const gap = Math.max(0, Math.round(options.spacing));
  let rects: MergeRect[] = [];
  let width = 0;
  let height = 0;

  if (options.direction === "vertical") {
    const target = options.match === "original" ? null : pick(sizes.map((s) => s.width), options.match);
    const scaled = sizes.map((s) => (target ? { width: target, height: (s.height * target) / s.width } : s));
    width = Math.max(...scaled.map((s) => s.width)) + gap * 2;
    let y = gap;
    rects = scaled.map((s) => {
      const r = { x: gap + (width - gap * 2 - s.width) / 2, y, width: s.width, height: s.height };
      y += s.height + gap;
      return r;
    });
    height = y;
  } else if (options.direction === "horizontal") {
    const target = options.match === "original" ? null : pick(sizes.map((s) => s.height), options.match);
    const scaled = sizes.map((s) => (target ? { width: (s.width * target) / s.height, height: target } : s));
    height = Math.max(...scaled.map((s) => s.height)) + gap * 2;
    let x = gap;
    rects = scaled.map((s) => {
      const r = { x, y: gap + (height - gap * 2 - s.height) / 2, width: s.width, height: s.height };
      x += s.width + gap;
      return r;
    });
    width = x;
  } else {
    const columns = Math.max(1, Math.min(Math.round(options.columns) || 1, sizes.length));
    const rows = Math.ceil(sizes.length / columns);
    // Every cell has the same size; each image is fitted inside its cell and centred.
    const cellW = options.match === "original" ? Math.max(...sizes.map((s) => s.width)) : pick(sizes.map((s) => s.width), options.match);
    const cellH = options.match === "original" ? Math.max(...sizes.map((s) => s.height)) : pick(sizes.map((s) => s.height), options.match);
    width = gap + columns * (cellW + gap);
    height = gap + rows * (cellH + gap);
    rects = sizes.map((s, i) => {
      const scale = options.match === "original" ? Math.min(1, cellW / s.width, cellH / s.height) : Math.min(cellW / s.width, cellH / s.height);
      const w = s.width * scale;
      const h = s.height * scale;
      const col = i % columns;
      const row = Math.floor(i / columns);
      return { x: gap + col * (cellW + gap) + (cellW - w) / 2, y: gap + row * (cellH + gap) + (cellH - h) / 2, width: w, height: h };
    });
  }

  // Shrink everything uniformly if the result would exceed what browsers can draw.
  const limitScale = Math.min(1, LIMITS.maxOutputSide / width, LIMITS.maxOutputSide / height, Math.sqrt(LIMITS.maxOutputPixels / (width * height)));
  const round = (r: MergeRect): MergeRect => {
    const x = Math.round(r.x * limitScale);
    const y = Math.round(r.y * limitScale);
    return { x, y, width: Math.max(1, Math.round((r.x + r.width) * limitScale) - x), height: Math.max(1, Math.round((r.y + r.height) * limitScale) - y) };
  };
  return {
    width: Math.max(1, Math.floor(width * limitScale)),
    height: Math.max(1, Math.floor(height * limitScale)),
    rects: rects.map(round),
    limitScale,
  };
}
