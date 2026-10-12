/**
 * Fonts for Word to PDF.
 *
 * A .docx names its fonts (Calibri, Aptos, Times New Roman…) but rarely
 * includes them, and the browser only has the fonts installed on this device.
 * When a named font is missing, CSS falls back to the browser's default,
 * usually Times New Roman, so a Calibri or Aptos document turned serif.
 *
 * Every font list in the rendered document therefore gets a fallback chain of
 * the same kind (sans-serif, serif or monospace), so a missing font is
 * replaced by a similar installed one. Character widths can differ, so line
 * breaks may not match Word exactly.
 */
type Kind = "sans-serif" | "serif" | "monospace";

const SERIF = /georgia|garamond|book antiqua|palatino|bookman|constantia|century schoolbook|baskerville|didot|bodoni|minion|cambria|caladea|times|tinos|serif$|^noto serif|^pt serif|^source serif|^droid serif|^roboto slab|rockwell|mangal|kokila|nirmala text/i;
const MONO = /consolas|lucida console|courier|cousine|mono|menlo|monaco|inconsolata|source code/i;

function kindOf(name: string): Kind {
  if (MONO.test(name)) return "monospace";
  if (SERIF.test(name) && !/sans/i.test(name)) return "serif";
  // Most document fonts (Calibri, Aptos, Arial, Segoe UI, Verdana, Tahoma…) are sans-serif.
  return "sans-serif";
}

/** Fallbacks to append after a family, closest first: a common installed font of the same kind, then the generic family. */
function fallbacksFor(name: string): string[] {
  const kind = kindOf(name);
  if (kind === "serif") return ['"Times New Roman"', "serif"];
  if (kind === "monospace") return ['"Courier New"', "monospace"];
  return ["Arial", "sans-serif"];
}

const GENERIC = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "inherit", "initial", "unset"]);

function unquote(value: string): string {
  return value.trim().replace(/^(['"])(.*)\1$/, "$2").trim();
}

/**
 * Adds a fallback chain to a CSS font-family list, based on its first named
 * font. Lists that already end in a generic family, or that only reference
 * a CSS variable (theme fonts, handled where the variable is defined), are
 * left alone.
 */
export function withFallbacks(list: string): string {
  const parts = list.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return list;
  if (parts.some((part) => GENERIC.has(unquote(part).toLowerCase()))) return list;
  const first = parts.find((part) => !part.startsWith("var("));
  if (!first) return list;
  const seen = new Set(parts.map((part) => unquote(part).toLowerCase()));
  const extra = fallbacksFor(unquote(first)).filter((font) => {
    const key = unquote(font).toLowerCase();
    return seen.has(key) ? false : (seen.add(key), true);
  });
  return [...parts, ...extra].join(", ");
}

/**
 * Rewrites a stylesheet: every font-family declaration and every theme font
 * variable (--docx-minorHAnsi-font: Aptos) gets its fallback chain.
 */
export function addFallbacksToCss(css: string): string {
  // @font-face blocks (embedded fonts) declare one family name and are left exactly as they are.
  return css.replace(/(@font-face\s*\{[^}]*\})|((?:font-family|--docx-[\w-]*-font)\s*:\s*)([^;}]+)/gi, (match, fontFace?: string, prefix?: string, value?: string) => {
    if (fontFace || !prefix || !value) return match;
    const important = /!important\s*$/i.test(value);
    return `${prefix}${withFallbacks(value.replace(/\s*!important\s*$/i, ""))}${important ? " !important" : ""}`;
  });
}
