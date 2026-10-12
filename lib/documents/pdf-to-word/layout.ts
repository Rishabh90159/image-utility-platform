/**
 * Rebuilds document structure from positioned PDF text. A PDF stores glyphs
 * at coordinates, not paragraphs, so this infers lines, reading order (one or
 * two columns), simple tables, paragraphs, headings and lists from geometry
 * and font size. Pure functions: no pdf.js or DOM here, so it is unit-tested.
 *
 * Coordinates are PDF points with the origin at the top-left of the page;
 * `top` is the text baseline.
 */
export interface PdfTextItem {
  text: string;
  x: number;
  top: number;
  width: number;
  size: number;
  bold: boolean;
  italic: boolean;
  /** Word font name to use, if known. */
  font?: string;
}

export interface PdfPageText {
  width: number;
  height: number;
  items: PdfTextItem[];
  /** Number of images painted on the page (used to recognise scans). */
  imageCount: number;
}

export interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
  size: number;
  font?: string;
  /** A tab between widely separated parts of one line. */
  tab?: boolean;
}

export interface ParagraphBlock {
  type: "paragraph";
  runs: Run[];
  heading?: 1 | 2 | 3;
  list?: "bullet" | "number";
  align: "left" | "center" | "right";
  /** Left indent and first-line offset in points, relative to the left margin. */
  indent: number;
  firstLine: number;
  /** Extra space above the paragraph in points. */
  spaceBefore: number;
}

export interface TableBlock {
  type: "table";
  /** Column widths in points. */
  columns: number[];
  /** rows → cells → runs */
  rows: Run[][][];
  spaceBefore: number;
}

export interface NoteBlock {
  type: "note";
  text: string;
}

export type Block = ParagraphBlock | TableBlock | NoteBlock;

export interface PageLayout {
  width: number;
  height: number;
  margins: { top: number; right: number; bottom: number; left: number };
  blocks: Block[];
  /** No extractable text on the page. */
  noText: boolean;
  /** No text but images: most likely a scanned page. */
  scanned: boolean;
}

interface Segment {
  x: number;
  right: number;
  items: PdfTextItem[];
}

interface Line {
  top: number;
  size: number;
  segments: Segment[];
}

const BULLET = /^\s*([•●○◦▪■□‣⁃∙·•▪●]|[-–*](?=\s))\s*/;
const NUMBERED = /^\s*(\(?\d{1,3}[.)]|\(?[a-z][.)]|\(?(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)[.)])\s+/i;
const MIN_PAGE_CHARS = 10;

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Most common font size, weighted by the number of characters. */
export function bodyFontSize(items: PdfTextItem[]): number {
  const weight = new Map<number, number>();
  for (const item of items) {
    const key = Math.round(item.size * 2) / 2;
    weight.set(key, (weight.get(key) ?? 0) + item.text.trim().length);
  }
  let best = 11;
  let bestWeight = -1;
  for (const [size, count] of weight) {
    if (count > bestWeight) {
      best = size;
      bestWeight = count;
    }
  }
  return best;
}

/** Groups items into lines by baseline, and each line into segments separated by wide gaps. */
export function buildLines(items: PdfTextItem[]): Line[] {
  const sorted = items.filter((item) => item.text.length > 0 && item.size > 0).sort((a, b) => a.top - b.top || a.x - b.x);
  const rows: PdfTextItem[][] = [];
  let current: PdfTextItem[] = [];
  let currentTop = Number.NEGATIVE_INFINITY;
  let currentSize = 0;
  for (const item of sorted) {
    const tolerance = Math.max(1.5, 0.45 * Math.min(item.size, currentSize || item.size));
    if (current.length && Math.abs(item.top - currentTop) <= tolerance) {
      current.push(item);
    } else {
      if (current.length) rows.push(current);
      current = [item];
      currentTop = item.top;
      currentSize = item.size;
    }
  }
  if (current.length) rows.push(current);

  const lines: Line[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    const visible = row.filter((item) => item.text.trim().length > 0);
    if (visible.length === 0) continue;
    const size = bodyFontSize(visible);
    const segments: Segment[] = [];
    for (const item of visible) {
      const last = segments.at(-1);
      const gap = last ? item.x - last.right : 0;
      if (last && gap <= Math.max(1.6 * size, 14)) {
        last.items.push(item);
        last.right = Math.max(last.right, item.x + item.width);
      } else {
        segments.push({ x: item.x, right: item.x + item.width, items: [item] });
      }
    }
    // A bullet or list number set apart from its text belongs to the text.
    for (let i = 0; i < segments.length - 1; i++) {
      const text = segmentText(segments[i]).trim();
      if ((BULLET.test(text + " ") && text.length <= 2) || (NUMBERED.test(text + " ") && text.length <= 5)) {
        segments[i].items.push(...segments[i + 1].items);
        segments[i].right = segments[i + 1].right;
        segments.splice(i + 1, 1);
      }
    }
    lines.push({ top: median(visible.map((item) => item.top)), size, segments });
  }
  return lines;
}

function segmentText(segment: Segment): string {
  return runsText(segmentRuns(segment));
}

function runsText(runs: Run[]): string {
  return runs.map((run) => (run.tab ? "\t" : run.text)).join("");
}

/** Text runs of one segment, with spaces restored where glyphs are visibly apart. */
function segmentRuns(segment: Segment): Run[] {
  const runs: Run[] = [];
  let prev: PdfTextItem | null = null;
  for (const item of segment.items) {
    let text = item.text;
    if (prev) {
      const gap = item.x - (prev.x + prev.width);
      if (gap > 0.15 * Math.min(item.size, prev.size) && !/\s$/.test(prev.text) && !/^\s/.test(text)) text = ` ${text}`;
    }
    appendRun(runs, { text, bold: item.bold, italic: item.italic, size: item.size, font: item.font });
    prev = item;
  }
  return runs;
}

function appendRun(runs: Run[], run: Run) {
  const last = runs.at(-1);
  if (last && !last.tab && !run.tab && last.bold === run.bold && last.italic === run.italic && Math.abs(last.size - run.size) < 0.6 && last.font === run.font) {
    last.text += run.text;
  } else {
    runs.push({ ...run });
  }
}

/**
 * Two-column pages: find a vertical gutter that many lines leave empty. Lines
 * that cross it (titles, full-width figures) split the page into regions, and
 * each region is read left column first, then right.
 */
export function orderColumns(lines: Line[], pageWidth: number): Line[] {
  if (lines.length < 8) return lines;
  const split = lines.filter((line) => line.segments.length === 2);
  if (split.length < Math.max(6, lines.length * 0.3)) return lines;
  const gutter = median(split.map((line) => (line.segments[0].right + line.segments[1].x) / 2));
  const inGutter = split.filter((line) => line.segments[0].right <= gutter && line.segments[1].x >= gutter);
  if (inGutter.length < split.length * 0.8) return lines;
  // Columns of text have wide segments; a table's cells are usually narrow.
  const leftWidth = median(inGutter.map((line) => line.segments[0].right - line.segments[0].x));
  const rightWidth = median(inGutter.map((line) => line.segments[1].right - line.segments[1].x));
  if (leftWidth < pageWidth * 0.25 || rightWidth < pageWidth * 0.25) return lines;

  const ordered: Line[] = [];
  let left: Line[] = [];
  let right: Line[] = [];
  const flush = () => {
    ordered.push(...left, ...right);
    left = [];
    right = [];
  };
  for (const line of lines) {
    const leftSegs = line.segments.filter((seg) => seg.right <= gutter + 2);
    const rightSegs = line.segments.filter((seg) => seg.x >= gutter - 2);
    if (leftSegs.length + rightSegs.length !== line.segments.length) {
      flush();
      ordered.push(line);
      continue;
    }
    if (leftSegs.length) left.push({ ...line, segments: leftSegs });
    if (rightSegs.length) right.push({ ...line, segments: rightSegs });
  }
  flush();
  return ordered;
}

interface TableCandidate {
  start: number;
  end: number;
  anchors: number[];
  rows: (Segment[] | null)[][];
}

function anchorIndex(anchors: number[], x: number, tolerance: number): number {
  let best = -1;
  let bestDistance = Infinity;
  anchors.forEach((anchor, index) => {
    const distance = Math.abs(anchor - x);
    if (distance <= tolerance && distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

/**
 * Finds runs of consecutive lines whose segments line up in the same columns.
 * Returns the tables found, as line index ranges with their cells.
 */
export function findTables(lines: Line[]): TableCandidate[] {
  const tables: TableCandidate[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].segments.length < 2) {
      i++;
      continue;
    }
    const tolerance = Math.max(6, lines[i].size * 0.8);
    let anchors = lines[i].segments.map((seg) => seg.x);
    const rows: (Segment[] | null)[][] = [];
    let j = i;
    while (j < lines.length) {
      const line = lines[j];
      const prev = lines[j - 1];
      if (j > i && line.top - prev.top > Math.max(prev.size, line.size) * 2.6) break;
      if (line.segments.length >= 2) {
        const indices = line.segments.map((seg) => anchorIndex(anchors, seg.x, tolerance));
        const unmatched = indices.filter((index) => index < 0).length;
        // Allow new columns to appear only while the table is being established.
        if (unmatched > 0 && (rows.length >= 2 || unmatched > 1)) break;
        if (unmatched > 0) {
          anchors = [...anchors, ...line.segments.filter((_, k) => indices[k] < 0).map((seg) => seg.x)].sort((a, b) => a - b);
        }
        const finalIndices = line.segments.map((seg) => anchorIndex(anchors, seg.x, tolerance));
        if (new Set(finalIndices).size !== finalIndices.length) break;
        const row: (Segment[] | null)[] = [];
        line.segments.forEach((seg, k) => {
          row[finalIndices[k]] = [...(row[finalIndices[k]] ?? []), seg];
        });
        rows.push(row);
        j++;
        continue;
      }
      // A single segment under a non-first column is wrapped cell text.
      if (rows.length > 0 && line.segments.length === 1 && line.top - prev.top <= line.size * 1.6) {
        const index = anchorIndex(anchors, line.segments[0].x, tolerance);
        if (index > 0) {
          const last = rows[rows.length - 1];
          last[index] = [...(last[index] ?? []), line.segments[0]];
          j++;
          continue;
        }
      }
      break;
    }
    const multi = rows.filter((row) => row.filter(Boolean).length >= 2).length;
    if (rows.length >= 2 && multi >= 2 && anchors.length >= 2) {
      tables.push({ start: i, end: j, anchors, rows });
      i = j;
    } else {
      i++;
    }
  }
  return tables;
}

interface LineInfo {
  line: Line;
  x: number;
  right: number;
  runs: Run[];
  text: string;
}

function lineInfo(line: Line): LineInfo {
  const runs: Run[] = [];
  line.segments.forEach((segment, index) => {
    if (index > 0) runs.push({ text: "", bold: false, italic: false, size: line.size, tab: true });
    for (const run of segmentRuns(segment)) appendRun(runs, run);
  });
  const x = line.segments[0].x;
  const right = line.segments[line.segments.length - 1].right;
  return { line, x, right, runs, text: runsText(runs) };
}

function stripPrefix(runs: Run[], pattern: RegExp): Run[] {
  const copy = runs.map((run) => ({ ...run }));
  const first = copy.find((run) => !run.tab && run.text.trim().length > 0);
  if (first) first.text = first.text.replace(pattern, "");
  return copy.filter((run) => run.tab || run.text.length > 0);
}

/** Lays out one page: margins, then blocks in reading order. */
export function layoutPage(page: PdfPageText, headingSizes: number[], bodySize: number): PageLayout {
  const items = page.items.filter((item) => item.text.trim().length > 0);
  const chars = sum(items.map((item) => item.text.trim().length));
  const base = { width: page.width, height: page.height };
  const defaultMargins = { top: 72, right: 72, bottom: 72, left: 72 };
  if (chars < MIN_PAGE_CHARS) {
    return { ...base, margins: defaultMargins, blocks: [], noText: true, scanned: page.imageCount > 0 };
  }

  const lines = orderColumns(buildLines(items), page.width);
  const minX = Math.min(...lines.map((line) => line.segments[0].x));
  const maxRight = Math.max(...lines.map((line) => line.segments[line.segments.length - 1].right));
  const firstTop = Math.min(...lines.map((line) => line.top - line.size));
  const lastTop = Math.max(...lines.map((line) => line.top));
  const margins = {
    left: clamp(Math.floor(minX), 18, page.width * 0.3),
    right: clamp(Math.floor(page.width - maxRight), 18, page.width * 0.3),
    top: clamp(Math.floor(firstTop), 18, page.height * 0.25),
    // Word's fonts rarely match the PDF's exactly; a modest bottom margin leaves room for reflow.
    bottom: clamp(Math.floor(page.height - lastTop - 8), 18, 54),
  };
  const contentLeft = margins.left;
  const contentRight = page.width - margins.right;
  const contentWidth = contentRight - contentLeft;
  const center = (contentLeft + contentRight) / 2;

  const tables = findTables(lines);
  const blocks: Block[] = [];
  let paragraph: { lines: LineInfo[]; list?: "bullet" | "number" } | null = null;
  let prevTop: number | null = null;
  let prevSize = bodySize;

  const gapAbove = (top: number, size: number) => (prevTop === null ? 0 : clamp(top - prevTop - size * 1.25, 0, 48));

  const flushParagraph = () => {
    if (!paragraph) return;
    const infos = paragraph.lines;
    const first = infos[0];
    const size = first.line.size;
    const runs: Run[] = [];
    infos.forEach((info, index) => {
      if (index > 0) {
        const previous = runs.at(-1);
        const joinWithout = previous && !previous.tab && /[-\s]$/.test(previous.text);
        if (!joinWithout) appendRun(runs, { ...info.runs[0], text: " ", tab: false });
      }
      for (const run of info.runs) appendRun(runs, run);
    });
    const textLength = runsText(runs).trim().length;
    const isCentered =
      infos.every((info) => Math.abs((info.x + info.right) / 2 - center) < contentWidth * 0.05 && info.right - info.x < contentWidth * 0.85) &&
      first.x - contentLeft > size * 2;
    const isRight = !isCentered && infos.every((info) => Math.abs(info.right - contentRight) < 4 && info.x - contentLeft > contentWidth * 0.3);
    const minLineX = Math.min(...infos.map((info) => info.x));
    let heading: ParagraphBlock["heading"];
    const level = headingSizes.findIndex((s) => Math.abs(s - size) < 0.6);
    if (level >= 0 && textLength > 0 && textLength < 200 && !paragraph.list) heading = Math.min(3, level + 1) as 1 | 2 | 3;
    const list = paragraph.list;
    const finalRuns = list === "bullet" ? stripPrefix(runs, BULLET) : runs;
    const block: ParagraphBlock = {
      type: "paragraph",
      runs: finalRuns,
      heading,
      list,
      align: isCentered ? "center" : isRight ? "right" : "left",
      indent: isCentered || isRight ? 0 : Math.max(0, minLineX - contentLeft),
      firstLine: isCentered || isRight ? 0 : first.x - minLineX,
      spaceBefore: (first as LineInfo & { spaceBefore?: number }).spaceBefore ?? 0,
    };
    if (list === "number" && infos.length > 1) {
      // Hanging indent: continuation lines align with the text after the number.
      block.indent = Math.max(0, infos[1].x - contentLeft);
      block.firstLine = first.x - infos[1].x;
    }
    if (finalRuns.length) blocks.push(block);
    paragraph = null;
  };

  for (let index = 0; index < lines.length; index++) {
    const table = tables.find((t) => t.start === index);
    if (table) {
      flushParagraph();
      const firstLine = lines[table.start];
      const spaceBefore = gapAbove(firstLine.top, firstLine.size);
      const anchors = table.anchors;
      const tableRight = Math.max(...lines.slice(table.start, table.end).map((line) => line.segments[line.segments.length - 1].right));
      const columns = anchors.map((anchor, k) => Math.max(18, (k + 1 < anchors.length ? anchors[k + 1] : tableRight) - anchor));
      const rows = table.rows.map((row) =>
        anchors.map((_, k) => {
          const runs: Run[] = [];
          (row[k] ?? []).forEach((segment, n) => {
            if (n > 0) appendRun(runs, { ...segmentRuns(segment)[0], text: " " });
            for (const run of segmentRuns(segment)) appendRun(runs, run);
          });
          return runs;
        }),
      );
      blocks.push({ type: "table", columns, rows, spaceBefore });
      prevTop = lines[table.end - 1].top;
      prevSize = lines[table.end - 1].size;
      index = table.end - 1;
      continue;
    }

    const line = lines[index];
    const info = lineInfo(line) as LineInfo & { spaceBefore?: number };
    const listKind: "bullet" | "number" | undefined = BULLET.test(info.text) ? "bullet" : NUMBERED.test(info.text) ? "number" : undefined;
    const last = paragraph?.lines.at(-1);
    let startNew = !paragraph || !last;
    if (paragraph && last) {
      const leading = Math.max(last.line.size, line.size) * 1.45;
      const gap = line.top - last.line.top;
      const sizeChanged = Math.abs(line.size - last.line.size) > last.line.size * 0.12;
      // A line that stops well short of the margin ends its paragraph if it ends a sentence, or if it is so
      // short that ragged-right wrapping can't explain it (list items drawn with graphic bullets, for example).
      const endsEarly = last.right < contentRight - Math.max(3 * line.size, contentWidth * 0.15);
      const previousShort = endsEarly && (/[.!?:;]["')\]]?$/.test(last.text.trim()) || last.right - last.x < contentWidth * 0.6);
      const continuationX = paragraph.list && paragraph.lines.length === 1 ? null : paragraph.lines.length > 1 ? paragraph.lines[1].x : null;
      const indentedMore = info.x > last.x + line.size * 0.8 && !(paragraph.list && Math.abs(info.x - (continuationX ?? info.x)) < 3);
      const listContinuation = paragraph.list && info.x > paragraph.lines[0].x + line.size * 0.5;
      startNew =
        gap > leading ||
        gap < 0 ||
        sizeChanged ||
        Boolean(listKind) ||
        previousShort ||
        (indentedMore && !listContinuation) ||
        (paragraph.list !== undefined && !listContinuation) ||
        info.x < last.x - line.size * 0.8 && paragraph.lines.length > 1 ||
        line.segments.length > 1 ||
        last.line.segments.length > 1;
    }
    if (startNew) {
      flushParagraph();
      info.spaceBefore = gapAbove(line.top, prevSize);
      paragraph = { lines: [info], list: listKind };
    } else {
      paragraph!.lines.push(info);
    }
    prevTop = line.top;
    prevSize = line.size;
  }
  flushParagraph();
  return { ...base, margins, blocks, noText: false, scanned: false };
}

/**
 * Font sizes used for headings across the document, largest first: sizes at
 * least 15% above the body size that are used for short text only.
 */
export function headingSizesFor(pages: PdfPageText[], bodySize: number): number[] {
  const usage = new Map<number, number>();
  for (const page of pages) {
    for (const item of page.items) {
      const size = Math.round(item.size * 2) / 2;
      if (size >= bodySize * 1.15) usage.set(size, (usage.get(size) ?? 0) + item.text.trim().length);
    }
  }
  const total = sum(pages.flatMap((page) => page.items.map((item) => item.text.trim().length)));
  return [...usage.entries()]
    .filter(([, count]) => count < total * 0.3)
    .map(([size]) => size)
    .sort((a, b) => b - a)
    .slice(0, 3);
}

export function layoutDocument(pages: PdfPageText[]): PageLayout[] {
  const bodySize = bodyFontSize(pages.flatMap((page) => page.items));
  const headingSizes = headingSizesFor(pages, bodySize);
  return pages.map((page) => layoutPage(page, headingSizes, bodySize));
}
