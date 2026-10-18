/**
 * Print sheets: several copies of one photo on a sheet of photo paper, with
 * small gaps for cutting. Pure geometry in millimetres, so it can be tested
 * without a browser. Photos are never rotated; only the sheet is, whichever
 * way fits more copies.
 */
export type SheetPaper = "4x6" | "a4";

export const SHEET_PAPERS: Record<SheetPaper, { label: string; width: number; height: number; margin: number }> = {
  // 4 × 6 in photo paper, printed by photo shops and photo printers, often borderless.
  "4x6": { label: "4 × 6 in photo paper", width: 101.6, height: 152.4, margin: 3 },
  // Home printers can't print to the edge, so A4 keeps a wider margin.
  a4: { label: "A4 paper", width: 210, height: 297, margin: 5 },
};

/** Space between photos, in mm: room for a cutting line on each side. */
export const SHEET_GAP_MM = 2;

export interface SheetLayout {
  paper: SheetPaper;
  /** Sheet size in mm, after choosing its orientation. */
  width: number;
  height: number;
  landscape: boolean;
  columns: number;
  rows: number;
  count: number;
  /** Top-left corner of each photo, in mm from the sheet's top-left corner. */
  positions: { x: number; y: number }[];
}

function grid(available: number, item: number, gap: number): number {
  return item > available ? 0 : Math.floor((available + gap + 1e-9) / (item + gap));
}

/** Most copies of a photoWidth × photoHeight mm photo on the paper; the block of photos is centred. */
export function layoutSheet(photoWidth: number, photoHeight: number, paper: SheetPaper): SheetLayout {
  const spec = SHEET_PAPERS[paper];
  const options = [false, true].map((landscape) => {
    const width = landscape ? spec.height : spec.width;
    const height = landscape ? spec.width : spec.height;
    const columns = grid(width - spec.margin * 2, photoWidth, SHEET_GAP_MM);
    const rows = grid(height - spec.margin * 2, photoHeight, SHEET_GAP_MM);
    return { landscape, width, height, columns, rows, count: columns * rows };
  });
  // Prefer portrait when both orientations hold the same number.
  const best = options[1].count > options[0].count ? options[1] : options[0];
  const blockWidth = best.columns * photoWidth + Math.max(0, best.columns - 1) * SHEET_GAP_MM;
  const blockHeight = best.rows * photoHeight + Math.max(0, best.rows - 1) * SHEET_GAP_MM;
  const left = (best.width - blockWidth) / 2;
  const top = (best.height - blockHeight) / 2;
  const positions: { x: number; y: number }[] = [];
  for (let row = 0; row < best.rows; row++) {
    for (let column = 0; column < best.columns; column++) {
      positions.push({ x: left + column * (photoWidth + SHEET_GAP_MM), y: top + row * (photoHeight + SHEET_GAP_MM) });
    }
  }
  return { paper, ...best, positions };
}

export function mmToPoints(mm: number): number {
  return (mm / 25.4) * 72;
}
