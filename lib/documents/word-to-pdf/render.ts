import type { PDFDocument as PdfDocumentType, PDFFont, PDFPage } from "@cantoo/pdf-lib";
import { abortError, DocumentToolError, toDocumentToolError } from "../errors";
import { assertDocx, DOC_LIMITS } from "../validate";
import { addFallbacksToCss, bundledFontFaces, METRIC_FAMILY, withFallbacks } from "./fonts";
import { paginate } from "./paginate";

/**
 * Word (.docx) → PDF, entirely in the browser:
 *
 * 1. docx-preview lays the document out as HTML pages (page size, margins,
 *    orientation, headers and footers, tables, lists and images) inside a
 *    sandboxed, off-screen iframe, isolated from this site's styles.
 * 2. Pages that overflow are split the way a word processor would.
 * 3. Each page is drawn to a canvas and placed in a PDF page of the same size,
 *    with an invisible text layer on top so the PDF can be searched and its
 *    text selected (Latin-script text).
 *
 * Nothing is uploaded. Layout follows the fonts installed on this device, so
 * line breaks can differ from Word when the document's fonts aren't available.
 */
export interface WordToPdfResult {
  bytes: Uint8Array;
  pages: number;
  /** Words that could be added to the searchable text layer, and words that couldn't (non-Latin scripts). */
  searchableWords: number;
  unsearchableWords: number;
}

const PX_TO_PT = 0.75;
/** Longest canvas per page, in pixels, keeps memory use reasonable on phones. */
const MAX_CANVAS_PIXELS = 4_200_000;
const JPEG_QUALITY = 0.9;
const A4 = { width: 793.7, height: 1122.5 };

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const FRAME_STYLE = `
html, body { margin: 0; padding: 0; background: #ffffff; }
body { color: #000000; font-family: "Times New Roman", "${METRIC_FAMILY.Tinos}", serif; }
#pages { display: flex; flex-direction: column; align-items: flex-start; }
#pages > section { background: #ffffff; margin: 0 0 24px 0; flex: none; }
`;

function createFrame(): { frame: HTMLIFrameElement; doc: Document; container: HTMLElement; styles: HTMLElement } {
  const frame = document.createElement("iframe");
  // Same-origin so this page can lay it out and read it; no scripts run inside.
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.title = "Document rendering";
  Object.assign(frame.style, { position: "fixed", left: "-20000px", top: "0", width: "2000px", height: "1200px", border: "0", pointerEvents: "none" });
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    throw new DocumentToolError("CONVERSION_FAILED", "Your browser couldn't prepare the document for conversion.");
  }
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><style>${bundledFontFaces(window.location.origin)}${FRAME_STYLE}</style></head><body><div id="docx-styles" hidden></div><div id="pages"></div></body></html>`,
  );
  doc.close();
  // docx-preview empties its style container before rendering, so it gets its own, separate from ours.
  return { frame, doc, container: doc.getElementById("pages")!, styles: doc.getElementById("docx-styles")! };
}

/** Only embedded images may load: anything pointing elsewhere is removed, so nothing is fetched. */
function stripExternalResources(container: HTMLElement) {
  for (const img of container.querySelectorAll("img")) {
    const src = img.getAttribute("src") ?? "";
    if (!/^(data|blob):/i.test(src)) img.removeAttribute("src");
  }
  for (const image of container.querySelectorAll("image")) {
    for (const attr of ["href", "xlink:href"]) {
      const value = image.getAttribute(attr);
      if (value && !/^(data|blob):/i.test(value)) image.removeAttribute(attr);
    }
  }
}

/** Gives every font list in the rendered document a fallback chain (see fonts.ts). */
function applyFontFallbacks(doc: Document) {
  for (const style of doc.querySelectorAll("style")) {
    const css = style.textContent ?? "";
    if (/font-family|--docx-[\w-]*-font/i.test(css)) style.textContent = addFallbacksToCss(css);
  }
  for (const element of doc.querySelectorAll<HTMLElement>("[style*='font-family']")) {
    element.style.fontFamily = withFallbacks(element.style.fontFamily);
  }
}

/**
 * Fonts load only once layout asks for them, so lay the pages out first, then
 * wait for any font that started loading. A font that fails keeps its fallback.
 */
async function fontsLoaded(doc: Document, root: HTMLElement) {
  root.getBoundingClientRect();
  if (!doc.fonts) return;
  await doc.fonts.ready;
  await Promise.all([...doc.fonts].filter((face) => face.status === "loading").map((face) => face.loaded.catch(() => undefined)));
}

async function imagesReady(container: HTMLElement) {
  await Promise.all(
    [...container.querySelectorAll("img")].map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))),
  );
}

function pageHeightOf(section: HTMLElement): number {
  const minHeight = parseFloat(section.ownerDocument.defaultView!.getComputedStyle(section).minHeight);
  return Number.isFinite(minHeight) && minHeight > 50 ? minHeight : A4.height;
}

interface Word {
  text: string;
  x: number;
  bottom: number;
  width: number;
  height: number;
}

/** Positions of every word on the page, in CSS pixels relative to the page's top-left corner. */
function collectWords(section: HTMLElement, pageHeight: number): Word[] {
  const doc = section.ownerDocument;
  const origin = section.getBoundingClientRect();
  const walker = doc.createTreeWalker(section, NodeFilter.SHOW_TEXT);
  const range = doc.createRange();
  const words: Word[] = [];
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const pattern = /\S+/g;
    for (let match = pattern.exec(node.data); match; match = pattern.exec(node.data)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const rect = range.getClientRects()[0];
      if (!rect || rect.width < 0.5 || rect.height < 2) continue;
      const bottom = rect.bottom - origin.top;
      if (bottom > pageHeight || rect.top - origin.top < 0) continue;
      words.push({ text: match[0], x: rect.left - origin.left, bottom, width: rect.width, height: rect.height });
    }
  }
  range.detach();
  return words;
}

interface TextLayerTools {
  font: PDFFont;
  ops: typeof import("@cantoo/pdf-lib");
}

/** Invisible text (PDF text render mode 3) stretched to each word's box, so search and selection follow the image. */
function addTextLayer(page: PDFPage, words: Word[], pageHeightPt: number, tools: TextLayerTools): { added: number; skipped: number } {
  const { font, ops } = tools;
  const supported = new Set(font.getCharacterSet());
  const key = page.node.newFontDictionary(font.name, font.ref);
  const operators = [ops.beginText(), ops.setTextRenderingMode(ops.TextRenderingMode.Invisible)];
  let added = 0;
  let skipped = 0;
  for (const word of words) {
    const text = word.text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
    if ([...text].some((char) => !supported.has(char.codePointAt(0)!))) {
      skipped++;
      continue;
    }
    const size = Math.max(1, (word.height * PX_TO_PT) / 1.18);
    const natural = font.widthOfTextAtSize(text, size);
    if (!(natural > 0)) continue;
    const squeeze = Math.min(1000, Math.max(10, ((word.width * PX_TO_PT) / natural) * 100));
    const baseline = pageHeightPt - (word.bottom - word.height * 0.22) * PX_TO_PT;
    operators.push(
      ops.setFontAndSize(key, size),
      ops.setCharacterSqueeze(squeeze),
      ops.setTextMatrix(1, 0, 0, 1, word.x * PX_TO_PT, baseline),
      ops.showText(font.encodeText(text)),
    );
    added++;
  }
  operators.push(ops.endText());
  if (added > 0) page.pushOperators(...operators);
  return { added, skipped };
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new DocumentToolError("OUT_OF_MEMORY", "Your browser ran out of memory while drawing the pages. Try a desktop browser, or a shorter document."));
        else blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export async function convertWordToPdf(
  file: Blob,
  options: { title: string; signal?: AbortSignal; onProgress?: (fraction: number) => void },
): Promise<WordToPdfResult> {
  const { signal, onProgress } = options;
  const check = () => {
    if (signal?.aborted) throw abortError();
  };
  const bytes = new Uint8Array(await file.arrayBuffer());
  await assertDocx(bytes);
  check();
  const [{ renderAsync }, { default: html2canvas }, pdfLib] = await Promise.all([import("docx-preview"), import("html2canvas-pro"), import("@cantoo/pdf-lib")]);
  check();

  const { frame, doc, container, styles } = createFrame();
  try {
    try {
      await renderAsync(new Blob([bytes]), container, styles, {
        className: "docx",
        inWrapper: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        // Fonts embedded in the document are used (as data: URLs, allowed by the site's font-src policy).
        ignoreFonts: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
        renderComments: false,
        renderChanges: false,
        useBase64URL: true,
        experimental: true,
      });
    } catch {
      throw new DocumentToolError("CORRUPT", "This document couldn't be read. It may be damaged, or use features this converter doesn't support. Try opening and re-saving it in Word.");
    }
    check();
    stripExternalResources(container);
    applyFontFallbacks(doc);
    await imagesReady(container);
    await fontsLoaded(doc, container);
    check();
    onProgress?.(0.1);

    const pages = paginate(container, pageHeightOf);
    if (pages.length === 0) throw new DocumentToolError("CORRUPT", "This document has no pages to convert.");
    if (pages.length > DOC_LIMITS.wordMaxPages) {
      throw new DocumentToolError("TOO_MANY_PAGES", `This document is about ${pages.length} pages long. Up to ${DOC_LIMITS.wordMaxPages} pages can be converted at once; split it into smaller documents first.`);
    }

    const pdf: PdfDocumentType = await pdfLib.PDFDocument.create();
    pdf.setTitle(options.title);
    pdf.setProducer("Imgifyr");
    pdf.setCreator("Imgifyr Word to PDF");
    const font = await pdf.embedFont(pdfLib.StandardFonts.Helvetica);
    let searchableWords = 0;
    let unsearchableWords = 0;

    for (const [index, section] of pages.entries()) {
      await tick();
      check();
      const width = section.offsetWidth || A4.width;
      const height = pageHeightOf(section);
      const scale = Math.min(2, Math.sqrt(MAX_CANVAS_PIXELS / (width * height)));
      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(section, {
          scale,
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: false,
          allowTaint: false,
          width,
          height,
          // Only this page is copied for drawing, not the whole document.
          ignoreElements: (element) => element.tagName === "SECTION" && element !== section && element.parentElement === container,
          // The copy loads its fonts again; wait for them, or the page would be drawn in a fallback font.
          onclone: (clone, element) => fontsLoaded(clone, element as HTMLElement),
        });
      } catch (error) {
        throw toDocumentToolError(error, "A page of this document couldn't be drawn. Try re-saving the document in Word, or removing unusual objects.");
      }
      const jpeg = await canvasToJpeg(canvas);
      canvas.width = 0;
      canvas.height = 0;

      const widthPt = width * PX_TO_PT;
      const heightPt = height * PX_TO_PT;
      const page = pdf.addPage([widthPt, heightPt]);
      const image = await pdf.embedJpg(jpeg);
      page.drawImage(image, { x: 0, y: 0, width: widthPt, height: heightPt });
      const { added, skipped } = addTextLayer(page, collectWords(section, height), heightPt, { font, ops: pdfLib });
      searchableWords += added;
      unsearchableWords += skipped;
      onProgress?.(0.1 + (0.85 * (index + 1)) / pages.length);
    }

    const output = await pdf.save({ useObjectStreams: true });
    onProgress?.(1);
    return { bytes: output, pages: pages.length, searchableWords, unsearchableWords };
  } finally {
    frame.remove();
  }
}
