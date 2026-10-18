import type * as PdfJs from "pdfjs-dist/legacy/build/pdf.mjs";
import { DocumentToolError } from "./errors";

type PdfJsModule = typeof PdfJs;
type GetDocumentParams = Parameters<PdfJsModule["getDocument"]>[0];

/**
 * Renders PDF pages to pixels with pdf.js, inside the document worker. pdf.js
 * normally draws on DOM canvases and loads fonts into the document; a worker
 * has neither, so it gets OffscreenCanvas helpers and draws glyphs as paths.
 * Nothing is fetched: no fonts, colour profiles or other resources.
 */

/** Largest page image, so a huge or very tall page can't exhaust memory. */
export const RENDER_LIMITS = { maxSide: 8000, maxPixels: 25_000_000 } as const;

/** pdf.js creates helper canvases (patterns, masks) through this factory. */
class OffscreenCanvasFactory {
  constructor(_options: unknown) {}
  create(width: number, height: number) {
    if (width <= 0 || height <= 0) throw new Error("Invalid canvas size");
    const canvas = new OffscreenCanvas(width, height);
    return { canvas, context: canvas.getContext("2d", { willReadFrequently: true }) };
  }
  reset(target: { canvas: OffscreenCanvas | null }, width: number, height: number) {
    if (!target.canvas) throw new Error("Canvas is not specified");
    target.canvas.width = width;
    target.canvas.height = height;
  }
  destroy(target: { canvas: OffscreenCanvas | null; context: unknown }) {
    if (target.canvas) {
      target.canvas.width = 0;
      target.canvas.height = 0;
    }
    target.canvas = null;
    target.context = null;
  }
}

/** SVG filters (a few rare blend effects) need a DOM; without one, pdf.js draws those parts unfiltered. */
class NoFilterFactory {
  constructor(_options: unknown) {}
  addFilter() {
    return "none";
  }
  addHCMFilter() {
    return "none";
  }
  addAlphaFilter() {
    return "none";
  }
  addLuminosityFilter() {
    return "none";
  }
  addKnockoutFilter() {
    return "none";
  }
  addHighlightHCMFilter() {
    return "none";
  }
  addSelectionHCMFilter() {
    return "none";
  }
  addSelectionFilter() {
    return "none";
  }
  createSelectionStyle() {
    return null;
  }
  destroy() {}
}

export interface RenderablePdf {
  pageCount: number;
  /** Page size in points (1/72 inch), after the page's own rotation. */
  pageSize(index: number): Promise<{ width: number; height: number }>;
  /** Renders a page on white at about `dpi`, within RENDER_LIMITS; returns the DPI actually used. */
  render(index: number, dpi: number): Promise<{ canvas: OffscreenCanvas; dpi: number }>;
  destroy(): Promise<void>;
}

/** Opens a PDF for rendering. Password-protected, damaged and over-long PDFs get a clear error. */
export async function openRenderablePdf(pdfjs: PdfJsModule, bytes: Uint8Array, maxPages: number): Promise<RenderablePdf> {
  const params = {
    // pdf.js may take ownership of the buffer; callers keep their own copy.
    data: bytes.slice(),
    CanvasFactory: OffscreenCanvasFactory,
    FilterFactory: NoFilterFactory,
    disableFontFace: true,
    useSystemFonts: false,
    enableXfa: false,
    stopAtErrors: false,
    verbosity: 0,
  } as unknown as GetDocumentParams;
  const task = pdfjs.getDocument(params);
  let pdf: Awaited<typeof task.promise>;
  try {
    pdf = await task.promise;
  } catch (error) {
    await task.destroy().catch(() => undefined);
    if ((error as { name?: string } | null)?.name === "PasswordException") {
      throw new DocumentToolError("PASSWORD_PROTECTED", "This PDF is password-protected. Remove the password in a PDF reader, then try again.");
    }
    throw new DocumentToolError("CORRUPT", "This PDF is damaged and can't be read. Try opening it and saving a new copy, or download it again.");
  }
  if (pdf.numPages > maxPages) {
    await task.destroy().catch(() => undefined);
    throw new DocumentToolError("TOO_MANY_PAGES", `This PDF has ${pdf.numPages} pages. Up to ${maxPages} pages can be processed at once; split it into smaller PDFs first.`);
  }

  return {
    pageCount: pdf.numPages,
    async pageSize(index) {
      const page = await pdf.getPage(index + 1);
      const { width, height } = page.getViewport({ scale: 1 });
      return { width, height };
    },
    async render(index, dpi) {
      const page = await pdf.getPage(index + 1);
      const base = page.getViewport({ scale: 1 });
      let scale = dpi / 72;
      const fit = Math.min(
        1,
        RENDER_LIMITS.maxSide / (base.width * scale),
        RENDER_LIMITS.maxSide / (base.height * scale),
        Math.sqrt(RENDER_LIMITS.maxPixels / (base.width * scale * base.height * scale)),
      );
      scale *= fit;
      const viewport = page.getViewport({ scale });
      const width = Math.max(1, Math.floor(viewport.width));
      const height = Math.max(1, Math.floor(viewport.height));
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new DocumentToolError("OUT_OF_MEMORY", "Your browser ran out of memory rendering this PDF. Try a smaller file or a lower resolution.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      try {
        await page.render({
          canvasContext: context as unknown as CanvasRenderingContext2D,
          canvas: canvas as unknown as HTMLCanvasElement,
          viewport,
          background: "#ffffff",
        }).promise;
      } catch {
        throw new DocumentToolError("CONVERSION_FAILED", `Page ${index + 1} of this PDF couldn't be drawn. The file may be damaged.`);
      } finally {
        page.cleanup();
      }
      return { canvas, dpi: dpi * fit };
    },
    async destroy() {
      await task.destroy().catch(() => undefined);
    },
  };
}

/** Encodes an image source as a JPEG of the given size on a white background. */
export async function encodeJpeg(source: CanvasImageSource, width: number, height: number, quality: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new DocumentToolError("OUT_OF_MEMORY", "Your browser ran out of memory. Try a smaller file or a lower resolution.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}
