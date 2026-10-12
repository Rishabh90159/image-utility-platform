import type * as PdfJs from "pdfjs-dist/legacy/build/pdf.mjs";
import { DocumentToolError } from "../errors";
import type { PdfPageText, PdfTextItem } from "./layout";

type PdfJsModule = typeof PdfJs;

/**
 * Reads positioned text from every page with pdf.js. Only text and a count of
 * images are extracted: nothing is rendered, and pdf.js is configured not to
 * evaluate code or load fonts or other resources.
 */
export async function extractPdfText(
  pdfjs: PdfJsModule,
  bytes: Uint8Array,
  options: { maxPages: number; onProgress?: (fraction: number) => void },
): Promise<PdfPageText[]> {
  const task = pdfjs.getDocument({
    data: bytes,
    disableFontFace: true,
    // Exposes each font's real name (e.g. "ABCDEF+Arial-BoldMT"), used for the Word font and for bold/italic.
    fontExtraProperties: true,
    useSystemFonts: false,
    enableXfa: false,
    stopAtErrors: false,
    verbosity: 0,
  });
  let pdf: Awaited<typeof task.promise>;
  try {
    pdf = await task.promise;
  } catch (error) {
    await task.destroy().catch(() => undefined);
    const name = (error as { name?: string } | null)?.name;
    if (name === "PasswordException") {
      throw new DocumentToolError("PASSWORD_PROTECTED", "This PDF is password-protected. Remove the password in a PDF reader, then try again.");
    }
    throw new DocumentToolError("CORRUPT", "This PDF is damaged and can't be read. Try opening it and saving a new copy, or download it again.");
  }

  try {
    if (pdf.numPages > options.maxPages) {
      throw new DocumentToolError("TOO_MANY_PAGES", `This PDF has ${pdf.numPages} pages. Up to ${options.maxPages} pages can be converted at once; split it into smaller PDFs first.`);
    }
    const pages: PdfPageText[] = [];
    const imageOps = new Set([
      pdfjs.OPS.paintImageXObject,
      pdfjs.OPS.paintInlineImageXObject,
      pdfjs.OPS.paintImageXObjectRepeat,
      pdfjs.OPS.paintImageMaskXObject,
    ]);
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      // The operator list loads the page's fonts, which tells us which are bold or italic.
      const operators = await page.getOperatorList();
      const imageCount = operators.fnArray.filter((fn) => imageOps.has(fn)).length;
      const fonts = new Map<string, { bold: boolean; italic: boolean; font?: string }>();
      const fontInfo = (name: string) => {
        let info = fonts.get(name);
        if (!info) {
          info = { bold: false, italic: false };
          try {
            const font = page.commonObjs.get(name) as { bold?: boolean; black?: boolean; italic?: boolean; name?: string; loadedName?: string } | undefined;
            const fontName = font?.name ?? "";
            info = {
              bold: Boolean(font?.bold || font?.black) || /bold|black|heavy|semibold|demi/i.test(fontName),
              italic: Boolean(font?.italic) || /italic|oblique/i.test(fontName),
              font: wordFontName(fontName, content.styles[name]?.fontFamily),
            };
          } catch {
            info.font = wordFontName("", content.styles[name]?.fontFamily);
          }
          fonts.set(name, info);
        }
        return info;
      };

      const items: PdfTextItem[] = [];
      for (const raw of content.items) {
        if (!("str" in raw) || raw.str.length === 0) continue;
        const [a, b, c, d, e, f] = pdfjs.Util.transform(viewport.transform, raw.transform);
        // Skip rotated or vertical text: it can't be placed in a normal paragraph.
        if (Math.abs(b) > Math.abs(a) * 0.2 || Math.abs(c) > Math.abs(d) * 0.2) continue;
        const size = Math.hypot(c, d);
        if (!(size > 0.5)) continue;
        const scaleX = Math.hypot(raw.transform[0], raw.transform[1]) || 1;
        const width = (raw.width * Math.hypot(a, b)) / scaleX;
        const font = fontInfo(raw.fontName);
        items.push({ text: raw.str, x: e, top: f, width, size, bold: font.bold, italic: font.italic, font: font.font });
      }
      pages.push({ width: viewport.width, height: viewport.height, items, imageCount });
      page.cleanup();
      options.onProgress?.(number / pdf.numPages);
    }
    return pages;
  } finally {
    await task.destroy().catch(() => undefined);
  }
}

const STANDARD_FONTS: [RegExp, string][] = [
  [/^(helvetica( neue)?|arial)$/i, "Arial"],
  [/^times( new roman)?$/i, "Times New Roman"],
  [/^courier( new)?$/i, "Courier New"],
];

/**
 * Turns a PDF font name such as "ABCDEF+Calibri-Bold" into a family name Word
 * understands ("Calibri"). Light, narrow and condensed cuts are separate
 * families in Word ("Calibri Light", "Arial Narrow"), so they are kept.
 * Falls back to a generic family.
 */
export function wordFontName(pdfName: string, generic?: string): string | undefined {
  const cleaned = pdfName
    .replace(/^[A-Z]{6}\+/, "")
    .replace(/[-,](light|narrow|condensed)(?=[A-Z]|$)/i, (_, word: string) => ` ${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`)
    .replace(/[-,](bold|italic|oblique|regular|roman|black|medium|semibold|demibold|boldit|bolditalic|it)\w*$/i, "")
    // "Calibri LightItalic" → "Calibri Light"
    .replace(/(?<=[a-z])(Bold|Italic|Oblique)\w*$/, "")
    .replace(/(PSMT|PS|MT)$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  for (const [pattern, name] of STANDARD_FONTS) if (pattern.test(cleaned)) return name;
  if (/^[\w ]{2,40}$/.test(cleaned) && !/^g_d\d/.test(cleaned)) return cleaned;
  if (generic === "serif") return "Times New Roman";
  if (generic === "monospace") return "Courier New";
  return undefined;
}
