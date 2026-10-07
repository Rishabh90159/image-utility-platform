/**
 * Minimal PDF 1.4 writer for image documents: one image per page, embedded as
 * JPEG (DCTDecode). No dependency and no network access; the PDF is assembled
 * from Blob parts so large images are never copied into one big string.
 */

export interface PdfImage {
  /** JPEG bytes, embedded as-is. */
  jpeg: Blob;
  /** Stored (unrotated) pixel size of the JPEG. */
  width: number;
  height: number;
  colorSpace: "DeviceRGB" | "DeviceGray";
  /** EXIF orientation 1–8 of the embedded JPEG; the page applies it, so the bytes stay untouched. */
  orientation?: number;
}

/** Size as displayed after applying EXIF orientation (5–8 swap width and height). */
export function displaySize(width: number, height: number, orientation = 1): { width: number; height: number } {
  return orientation >= 5 && orientation <= 8 ? { width: height, height: width } : { width, height };
}

/**
 * Unit-square transform [a b c d e f] that turns a stored JPEG into its displayed
 * orientation, in PDF coordinates (y up). Derived from the EXIF definitions:
 * 2 mirror, 3 rotate 180°, 4 flip, 5 transpose, 6 rotate 90° clockwise,
 * 7 transverse, 8 rotate 90° anticlockwise.
 */
export function orientationMatrix(orientation = 1): [number, number, number, number, number, number] {
  switch (orientation) {
    case 2:
      return [-1, 0, 0, 1, 1, 0];
    case 3:
      return [-1, 0, 0, -1, 1, 1];
    case 4:
      return [1, 0, 0, -1, 0, 1];
    case 5:
      return [0, -1, -1, 0, 1, 1];
    case 6:
      return [0, -1, 1, 0, 0, 1];
    case 7:
      return [0, 1, 1, 0, 0, 0];
    case 8:
      return [0, 1, -1, 0, 1, 0];
    default:
      return [1, 0, 0, 1, 0, 0];
  }
}

export type PageSize = "a4" | "letter";
export type Orientation = "portrait" | "landscape" | "auto";
export type Fit = "fit" | "fill";

export interface PageOptions {
  size: PageSize;
  orientation: Orientation;
  fit: Fit;
  /** Margin in points (1/72 inch). */
  margin: number;
}

/** Page sizes in points. */
export const PAGE_SIZES: Record<PageSize, { width: number; height: number; label: string }> = {
  a4: { width: 595.28, height: 841.89, label: "A4" },
  letter: { width: 612, height: 792, label: "Letter" },
};

/** Margins offered in the UI, in points. */
export const MARGINS = { none: 0, small: 28.35, large: 56.69 } as const;

export interface Placement {
  pageWidth: number;
  pageHeight: number;
  /** Image rectangle in PDF coordinates (origin bottom-left). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Visible area; equal to the page's content box when the image is cropped by "fill". */
  clip: { x: number; y: number; width: number; height: number } | null;
}

/** Where an image goes on its page. Pure, so it can be tested without a browser. */
export function placeImage(imageWidth: number, imageHeight: number, options: PageOptions): Placement {
  const base = PAGE_SIZES[options.size];
  const landscape = options.orientation === "landscape" || (options.orientation === "auto" && imageWidth > imageHeight);
  const pageWidth = landscape ? base.height : base.width;
  const pageHeight = landscape ? base.width : base.height;
  const margin = Math.max(0, Math.min(options.margin, Math.min(pageWidth, pageHeight) / 4));
  const boxW = pageWidth - margin * 2;
  const boxH = pageHeight - margin * 2;
  const scale = options.fit === "fill" ? Math.max(boxW / imageWidth, boxH / imageHeight) : Math.min(boxW / imageWidth, boxH / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const x = margin + (boxW - width) / 2;
  const y = margin + (boxH - height) / 2;
  const cropped = options.fit === "fill" && (width > boxW + 0.01 || height > boxH + 0.01);
  return { pageWidth, pageHeight, x, y, width, height, clip: cropped ? { x: margin, y: margin, width: boxW, height: boxH } : null };
}

const num = (n: number) => (Math.round(n * 100) / 100).toString();

/** The full `cm` operands: orientation, then scale to the placed size, then move into position. */
function placementMatrix(p: Placement, orientation?: number): string {
  const [a, b, c, d, e, f] = orientationMatrix(orientation);
  return [a * p.width, b * p.height, c * p.width, d * p.height, e * p.width + p.x, f * p.height + p.y].map(num).join(" ");
}

/** Builds the PDF. Each entry becomes one page. */
export function buildPdf(pages: { image: PdfImage; placement: Placement }[]): Blob {
  if (pages.length === 0) throw new Error("No pages");
  const parts: BlobPart[] = [];
  const offsets: number[] = [];
  let position = 0;
  const encoder = new TextEncoder();
  const push = (part: string | Blob) => {
    if (typeof part === "string") {
      const bytes = encoder.encode(part);
      parts.push(bytes);
      position += bytes.length;
    } else {
      parts.push(part);
      position += part.size;
    }
  };
  const startObject = (id: number) => {
    offsets[id] = position;
    push(`${id} 0 obj\n`);
  };

  // Object numbers: 1 catalog, 2 page tree, 3 info, then 3 per page (page, content, image).
  const pageId = (i: number) => 4 + i * 3;
  push("%PDF-1.4\n%âãÏÓ\n");

  startObject(1);
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  startObject(2);
  push(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(" ")}] >>\nendobj\n`);
  startObject(3);
  push("<< /Producer (Pixfit) >>\nendobj\n");

  pages.forEach(({ image, placement: p }, i) => {
    const id = pageId(i);
    const content =
      "q\n" +
      (p.clip ? `${num(p.clip.x)} ${num(p.clip.y)} ${num(p.clip.width)} ${num(p.clip.height)} re W n\n` : "") +
      `${placementMatrix(p, image.orientation)} cm\n/Im0 Do\nQ\n`;
    startObject(id);
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(p.pageWidth)} ${num(p.pageHeight)}] ` +
        `/Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>\nendobj\n`,
    );
    startObject(id + 1);
    push(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream\nendobj\n`);
    startObject(id + 2);
    push(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /${image.colorSpace} ` +
        `/BitsPerComponent 8 /Filter /DCTDecode /Length ${image.jpeg.size} >>\nstream\n`,
    );
    push(image.jpeg);
    push("\nendstream\nendobj\n");
  });

  const count = pageId(pages.length);
  const xref = position;
  let table = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let id = 1; id < count; id++) table += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  push(table);
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: "application/pdf" });
}
