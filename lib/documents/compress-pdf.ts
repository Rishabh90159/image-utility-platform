import { PDFDocument } from "@cantoo/pdf-lib";
import type * as PdfJs from "pdfjs-dist/legacy/build/pdf.mjs";
import { searchTargetSize } from "@/lib/image-processing/target-size";
import { DocumentToolError } from "./errors";
import { openPdf } from "./merge";
import { encodeJpeg, openRenderablePdf } from "./pdf-render";
import { assertPdf, DOC_LIMITS } from "./validate";

/**
 * Compress PDF to a target size, in this order:
 *   1. Already at or under the target: the original file, unchanged.
 *   2. Re-saved without changing any content (compact object streams): text stays text.
 *   3. Otherwise every page becomes a JPEG image, and the shared target-size
 *      search picks the highest resolution and quality that fit, exactly as
 *      the image KB tools do. Text in the result is no longer selectable.
 */
export interface CompressPdfResult {
  bytes: Uint8Array;
  pages: number;
  /** How the result was made. */
  method: "original" | "resaved" | "images";
  /** "too-small": the target couldn't be reached; this is the smallest file the tool could make. */
  outcome: "met" | "too-small";
  originalBytes: number;
  /** Page image resolution and JPEG quality, for "images" results. */
  dpi?: number;
  quality?: number;
}

/** Page images start at this resolution: sharp on screen and readable when printed. */
export const COMPRESS_BASE_DPI = 150;
/** Lowest resolution the search may use; below this, small print becomes hard to read. */
export const COMPRESS_MIN_DPI = 60;
/** Lets decoded page images stay in memory between attempts up to this many pixels in total. */
const DECODED_CACHE_PIXELS = 30_000_000;

interface MasterPage {
  jpeg: Blob;
  width: number;
  height: number;
  /** Page size in points. */
  widthPt: number;
  heightPt: number;
}

export async function compressPdf(
  pdfjs: typeof PdfJs,
  bytes: Uint8Array,
  options: { targetBytes: number; onProgress?: (fraction: number) => void },
): Promise<CompressPdfResult> {
  const { targetBytes, onProgress } = options;
  assertPdf(bytes, DOC_LIMITS.compressMaxBytes);
  const originalBytes = bytes.length;

  // 2. A lossless re-save, if pdf-lib can read the file (pdf.js reads more damaged files, so failure isn't fatal).
  let resaved: Uint8Array | null = null;
  let pageCount = 0;
  try {
    const { doc } = await openPdf(bytes);
    pageCount = doc.getPageCount();
    doc.setProducer("Imgifyr");
    resaved = await doc.save({ useObjectStreams: true });
  } catch (error) {
    if (error instanceof DocumentToolError && error.code === "PASSWORD_PROTECTED") throw error;
  }
  if (originalBytes <= targetBytes) {
    onProgress?.(1);
    return { bytes, pages: pageCount || (await countPages(pdfjs, bytes)), method: "original", outcome: "met", originalBytes };
  }
  if (resaved && resaved.length <= targetBytes) {
    onProgress?.(1);
    return { bytes: resaved, pages: pageCount, method: "resaved", outcome: "met", originalBytes };
  }
  onProgress?.(0.02);

  // 3. Render each page once at the base resolution; attempts re-encode these copies.
  const pdf = await openRenderablePdf(pdfjs, bytes, DOC_LIMITS.compressMaxPages);
  const masters: MasterPage[] = [];
  try {
    for (let index = 0; index < pdf.pageCount; index++) {
      const size = await pdf.pageSize(index);
      const { canvas } = await pdf.render(index, COMPRESS_BASE_DPI);
      masters.push({ jpeg: await encodeJpeg(canvas, canvas.width, canvas.height, 0.95), width: canvas.width, height: canvas.height, widthPt: size.width, heightPt: size.height });
      canvas.width = 0;
      canvas.height = 0;
      onProgress?.(0.02 + (0.28 * (index + 1)) / pdf.pageCount);
    }
  } finally {
    await pdf.destroy();
  }

  const totalPixels = masters.reduce((sum, page) => sum + page.width * page.height, 0);
  const cache: (ImageBitmap | null)[] = masters.map(() => null);
  const decoded = async (index: number) => {
    const cached = cache[index];
    if (cached) return cached;
    const bitmap = await createImageBitmap(masters[index].jpeg);
    if (totalPixels <= DECODED_CACHE_PIXELS) cache[index] = bitmap;
    return bitmap;
  };

  try {
    const search = await searchTargetSize(
      async (scale, quality) => {
        const jpegs: Uint8Array[] = [];
        for (const [index, page] of masters.entries()) {
          const bitmap = await decoded(index);
          const blob = await encodeJpeg(bitmap, page.width * scale, page.height * scale, quality);
          if (!cache[index]) bitmap.close();
          jpegs.push(new Uint8Array(await blob.arrayBuffer()));
        }
        const pdfBytes = await buildImagePdf(masters, jpegs);
        return { blob: new Blob([pdfBytes as BlobPart], { type: "application/pdf" }), width: masters[0].width, height: masters[0].height };
      },
      {
        targetBytes,
        allowResize: true,
        minScale: COMPRESS_MIN_DPI / COMPRESS_BASE_DPI,
        onProgress: (fraction) => onProgress?.(0.3 + fraction * 0.7),
      },
    );
    const { attempt, outcome } = search;
    // If even the smallest image version is bigger than the original, the original is the better answer.
    if (outcome !== "met" && attempt.blob.size >= originalBytes) {
      return { bytes: resaved && resaved.length < originalBytes ? resaved : bytes, pages: masters.length, method: resaved && resaved.length < originalBytes ? "resaved" : "original", outcome: "too-small", originalBytes };
    }
    return {
      bytes: new Uint8Array(await attempt.blob.arrayBuffer()),
      pages: masters.length,
      method: "images",
      outcome: outcome === "met" ? "met" : "too-small",
      originalBytes,
      dpi: Math.round(COMPRESS_BASE_DPI * attempt.scale),
      quality: Math.round(attempt.quality * 100) / 100,
    };
  } finally {
    for (const bitmap of cache) bitmap?.close();
  }
}

/** One page per image, each page keeping its original size in points. */
async function buildImagePdf(pages: MasterPage[], jpegs: Uint8Array[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  for (const [index, page] of pages.entries()) {
    const image = await doc.embedJpg(jpegs[index]);
    doc.addPage([page.widthPt, page.heightPt]).drawImage(image, { x: 0, y: 0, width: page.widthPt, height: page.heightPt });
  }
  doc.setProducer("Imgifyr");
  doc.setCreator("Imgifyr Compress PDF");
  return doc.save({ useObjectStreams: true });
}

async function countPages(pdfjs: typeof PdfJs, bytes: Uint8Array): Promise<number> {
  const pdf = await openRenderablePdf(pdfjs, bytes, Number.MAX_SAFE_INTEGER);
  const count = pdf.pageCount;
  await pdf.destroy();
  return count;
}
