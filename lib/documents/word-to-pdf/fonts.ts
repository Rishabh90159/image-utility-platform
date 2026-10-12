/**
 * Fonts for Word to PDF.
 *
 * A .docx names its fonts (Calibri, Aptos, Times New Roman…) but rarely
 * includes them, and the browser only has the fonts installed on this device.
 * When a named font is missing, CSS falls back to the browser's default,
 * usually Times New Roman, so a Calibri or Aptos document turned serif.
 *
 * Two fixes, both applied inside the rendering frame only:
 * 1. Metric-compatible open fonts (same character widths, so the same line
 *    breaks) are bundled for the five most common Office fonts and used when
 *    the real font isn't installed: Carlito = Calibri, Caladea = Cambria,
 *    Arimo = Arial, Tinos = Times New Roman, Cousine = Courier New.
 * 2. Every font list gets a fallback chain of the same kind (sans-serif,
 *    serif or monospace) so other missing fonts stay close in style.
 *
 * Font files are in public/fonts/documents (copied by scripts/copy-document-fonts.mjs)
 * and are downloaded only when a document actually needs one.
 */
type Metric = "Carlito" | "Caladea" | "Arimo" | "Tinos" | "Cousine";

/** Our own family names, so they never clash with fonts installed on the device. */
export const METRIC_FAMILY: Record<Metric, string> = {
  Carlito: "Imgifyr Carlito",
  Caladea: "Imgifyr Caladea",
  Arimo: "Imgifyr Arimo",
  Tinos: "Imgifyr Tinos",
  Cousine: "Imgifyr Cousine",
};

const RANGES = {
  latin:
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  "latin-ext":
    "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
};

/** @font-face rules for the bundled fonts. `base` is the site origin, since the frame is about:blank. */
export function bundledFontFaces(base: string): string {
  const rules: string[] = [];
  for (const [metric, family] of Object.entries(METRIC_FAMILY)) {
    for (const [subset, range] of Object.entries(RANGES)) {
      for (const weight of [400, 700]) {
        for (const style of ["normal", "italic"]) {
          const url = `${base}/fonts/documents/${metric.toLowerCase()}-${subset}-${weight}-${style}.woff2`;
          rules.push(
            `@font-face{font-family:"${family}";src:url("${url}") format("woff2");font-weight:${weight};font-style:${style};font-display:block;unicode-range:${range};}`,
          );
        }
      }
    }
  }
  return rules.join("\n");
}

type Kind = "sans-serif" | "serif" | "monospace";

/** Known fonts: their kind, and the bundled metric-compatible font if there is one. */
const KNOWN: Record<string, { kind: Kind; metric?: Metric }> = {
  calibri: { kind: "sans-serif", metric: "Carlito" },
  "calibri light": { kind: "sans-serif", metric: "Carlito" },
  carlito: { kind: "sans-serif", metric: "Carlito" },
  cambria: { kind: "serif", metric: "Caladea" },
  caladea: { kind: "serif", metric: "Caladea" },
  arial: { kind: "sans-serif", metric: "Arimo" },
  helvetica: { kind: "sans-serif", metric: "Arimo" },
  "liberation sans": { kind: "sans-serif", metric: "Arimo" },
  arimo: { kind: "sans-serif", metric: "Arimo" },
  "times new roman": { kind: "serif", metric: "Tinos" },
  times: { kind: "serif", metric: "Tinos" },
  "liberation serif": { kind: "serif", metric: "Tinos" },
  tinos: { kind: "serif", metric: "Tinos" },
  "courier new": { kind: "monospace", metric: "Cousine" },
  courier: { kind: "monospace", metric: "Cousine" },
  "liberation mono": { kind: "monospace", metric: "Cousine" },
  cousine: { kind: "monospace", metric: "Cousine" },
};

const SERIF = /georgia|garamond|book antiqua|palatino|bookman|constantia|century schoolbook|baskerville|didot|bodoni|minion|cambria|times|serif$|^noto serif|^pt serif|^source serif|^droid serif|^roboto slab|rockwell|mangal|kokila|nirmala text/i;
const MONO = /consolas|lucida console|courier|mono|menlo|monaco|inconsolata|source code/i;

function kindOf(name: string): Kind {
  if (MONO.test(name)) return "monospace";
  if (SERIF.test(name) && !/sans/i.test(name)) return "serif";
  // Most modern document fonts (Aptos, Segoe UI, Verdana, Tahoma, Open Sans…) are sans-serif.
  return "sans-serif";
}

/** Fallbacks to append after a family, closest first. */
function fallbacksFor(name: string): string[] {
  const known = KNOWN[name.toLowerCase()];
  const kind = known?.kind ?? kindOf(name);
  const chain: string[] = [];
  if (known?.metric) chain.push(`"${METRIC_FAMILY[known.metric]}"`);
  // Unknown sans fonts such as Aptos are closest to Arial; serif to Times New Roman.
  if (kind === "sans-serif") chain.push("Arial", `"${METRIC_FAMILY.Arimo}"`);
  if (kind === "serif") chain.push('"Times New Roman"', `"${METRIC_FAMILY.Tinos}"`);
  if (kind === "monospace") chain.push('"Courier New"', `"${METRIC_FAMILY.Cousine}"`);
  chain.push(kind);
  return chain;
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
