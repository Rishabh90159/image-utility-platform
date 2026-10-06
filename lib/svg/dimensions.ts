/**
 * Reads an SVG's intended size from its width, height and viewBox attributes.
 * Pure functions, so they can be unit-tested without a browser.
 */
const UNIT_TO_PX: Record<string, number> = {
  "": 1,
  px: 1,
  pt: 96 / 72,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 101.6,
  em: 16,
  rem: 16,
  ex: 8,
};

/** Converts an SVG length such as "24", "24px", "10mm" or "2in" to CSS pixels. Percentages and invalid values return null. */
export function parseSvgLength(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^\s*([+]?\d*\.?\d+(?:e[+-]?\d+)?)\s*([a-z]*)\s*$/i.exec(value);
  if (!match) return null;
  const factor = UNIT_TO_PX[match[2].toLowerCase()];
  if (factor === undefined) return null;
  const px = Number(match[1]) * factor;
  return Number.isFinite(px) && px > 0 ? px : null;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function parseViewBox(value: string | null | undefined): ViewBox | null {
  if (!value) return null;
  const parts = value.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return null;
  const [x, y, width, height] = parts;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}

export interface SvgSize {
  width: number;
  height: number;
  /** False when the SVG declares neither a size nor a viewBox, so a browser default was assumed. */
  declared: boolean;
}

/** The size the SVG asks to be drawn at, following the same rules browsers use for <img>. */
export function intrinsicSvgSize(width: string | null, height: string | null, viewBox: string | null): SvgSize {
  const w = parseSvgLength(width);
  const h = parseSvgLength(height);
  const box = parseViewBox(viewBox);
  const round = (n: number) => Math.max(1, Math.round(n));
  if (w && h) return { width: round(w), height: round(h), declared: true };
  if (box) {
    const ratio = box.width / box.height;
    if (w) return { width: round(w), height: round(w / ratio), declared: true };
    if (h) return { width: round(h * ratio), height: round(h), declared: true };
    return { width: round(box.width), height: round(box.height), declared: true };
  }
  // Browsers fall back to 300 × 150 for SVGs without any size information.
  return { width: round(w ?? 300), height: round(h ?? 150), declared: Boolean(w || h) };
}

/**
 * Checks the document type declaration. Custom entities are allowed only as
 * plain text (as Adobe Illustrator writes them); entities that reference other
 * entities ("billion laughs") or external files are rejected.
 */
export function hasUnsafeEntities(markup: string): boolean {
  const doctype = /<!DOCTYPE[\s\S]*?\[([\s\S]*?)\]\s*>/i.exec(markup);
  if (!doctype) return /<!ENTITY/i.test(markup);
  const subset = doctype[1];
  const entities = [...subset.matchAll(/<!ENTITY\s+(%\s+)?[^\s]+\s+([\s\S]*?)>/gi)];
  if (entities.length > 50) return true;
  for (const entity of entities) {
    if (entity[1]) return true; // Parameter entities
    const definition = entity[2].trim();
    if (/^(SYSTEM|PUBLIC)\b/i.test(definition)) return true; // External entities
    if (definition.includes("&")) return true; // Nested expansion
    if (definition.length > 2048) return true;
  }
  return false;
}
