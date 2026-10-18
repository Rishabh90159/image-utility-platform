import type * as PdfJs from "pdfjs-dist/legacy/build/pdf.mjs";
import { setJpegDpi } from "@/lib/image-processing/jpeg-dpi";
import { QUALITY, searchTargetSize } from "@/lib/image-processing/target-size";
import { encodeJpeg, openRenderablePdf } from "./pdf-render";
import { assertPdf, documentFileName, DOC_LIMITS } from "./validate";

/**
 * PDF to JPG: each page is rendered at the chosen resolution and saved as a
 * JPG. With a size limit, each page uses the shared target-size search, so a
 * page is only made smaller (quality first, then pixels) when it has to be.
 * One page gives one .jpg; more pages give a .zip of numbered JPGs.
 */
export interface PdfToJpgResult {
  bytes: Uint8Array;
  kind: "jpg" | "zip";
  fileName: string;
  pages: number;
  /** Largest single JPG, in bytes. */
  largest: number;
  /** Pages that stayed above the size limit even at the smallest allowed size. */
  overLimit: number;
  /** Pages saved below the chosen resolution to meet the size limit or the pixel limit. */
  reduced: number;
}

export const PDF_TO_JPG_DPI = [72, 150, 300] as const;
export type PdfToJpgDpi = (typeof PDF_TO_JPG_DPI)[number];

/** JPEG quality without a size limit: visually lossless for text and photos. */
const DEFAULT_QUALITY = QUALITY.max;

export async function convertPdfToJpg(
  pdfjs: typeof PdfJs,
  bytes: Uint8Array,
  options: { dpi: number; maxBytes?: number; title: string; onProgress?: (fraction: number) => void },
): Promise<PdfToJpgResult> {
  const { dpi, maxBytes, onProgress } = options;
  assertPdf(bytes, DOC_LIMITS.pdfToJpgMaxBytes);
  const pdf = await openRenderablePdf(pdfjs, bytes, DOC_LIMITS.pdfToJpgMaxPages);
  const pages = pdf.pageCount;
  const digits = String(pages).length < 2 ? 2 : String(pages).length;
  const files: { name: string; data: Uint8Array }[] = [];
  let largest = 0;
  let overLimit = 0;
  let reduced = 0;

  try {
    for (let index = 0; index < pages; index++) {
      const rendered = await pdf.render(index, dpi);
      const { canvas } = rendered;
      let blob: Blob;
      let usedDpi = rendered.dpi;
      if (maxBytes) {
        const search = await searchTargetSize(
          async (scale, quality) => ({ blob: await encodeJpeg(canvas, canvas.width * scale, canvas.height * scale, quality), width: canvas.width * scale, height: canvas.height * scale }),
          {
            targetBytes: maxBytes,
            allowResize: true,
            minScale: Math.min(1, 200 / Math.max(canvas.width, canvas.height)),
            onProgress: (fraction) => onProgress?.((index + fraction) / pages),
          },
        );
        blob = search.attempt.blob;
        usedDpi = rendered.dpi * search.attempt.scale;
        if (search.outcome !== "met") overLimit++;
      } else {
        blob = await encodeJpeg(canvas, canvas.width, canvas.height, DEFAULT_QUALITY);
      }
      if (usedDpi < dpi - 0.5) reduced++;
      canvas.width = 0;
      canvas.height = 0;
      const withDpi = await setJpegDpi(blob, Math.max(1, Math.round(usedDpi)));
      const data = new Uint8Array(await withDpi.arrayBuffer());
      largest = Math.max(largest, data.length);
      files.push({ name: documentFileName(options.title, "jpg", pages === 1 ? "" : `page-${String(index + 1).padStart(digits, "0")}`), data });
      onProgress?.((index + 1) / pages);
    }
  } finally {
    await pdf.destroy();
  }

  if (files.length === 1) {
    return { bytes: files[0].data, kind: "jpg", fileName: files[0].name, pages, largest, overLimit, reduced };
  }
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  // JPGs are already compressed; storing them avoids slow, pointless deflate.
  for (const file of files) zip.file(file.name, file.data, { compression: "STORE" });
  const zipped = await zip.generateAsync({ type: "uint8array" });
  return { bytes: zipped, kind: "zip", fileName: documentFileName(options.title, "zip", "jpg"), pages, largest, overLimit, reduced };
}
