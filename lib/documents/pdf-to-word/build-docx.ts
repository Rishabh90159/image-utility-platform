import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  SectionType,
  Tab,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ISectionOptions,
} from "docx";
import type { Block, PageLayout, ParagraphBlock, Run } from "./layout";

/**
 * Writes the reconstructed layout as a real, editable .docx with the docx
 * library: one Word section per PDF page (same size and orientation), real
 * paragraphs, heading styles, bulleted lists and tables.
 */
const twips = (points: number) => Math.round(points * 20);
const halfPoints = (points: number) => Math.max(2, Math.round(points * 2));

const HEADINGS = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 } as const;

function textRuns(runs: Run[]): TextRun[] {
  return runs.map((run) =>
    run.tab
      ? new TextRun({ children: [new Tab()] })
      : new TextRun({ text: run.text, bold: run.bold, italics: run.italic, size: halfPoints(run.size), font: run.font }),
  );
}

function paragraph(block: ParagraphBlock): Paragraph {
  return new Paragraph({
    children: textRuns(block.runs),
    heading: block.heading ? HEADINGS[block.heading] : undefined,
    bullet: block.list === "bullet" ? { level: 0 } : undefined,
    alignment: block.align === "center" ? AlignmentType.CENTER : block.align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
    indent:
      block.list === "bullet"
        ? undefined
        : {
            left: twips(block.indent),
            ...(block.firstLine >= 0 ? { firstLine: twips(block.firstLine) } : { hanging: twips(-block.firstLine) }),
          },
    spacing: { before: twips(block.spaceBefore), after: 0 },
  });
}

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "999999" };

function blockToDocx(block: Block): (Paragraph | Table)[] {
  if (block.type === "paragraph") return [paragraph(block)];
  if (block.type === "note") {
    return [new Paragraph({ children: [new TextRun({ text: block.text, italics: true, color: "666666" })] })];
  }
  const total = block.columns.reduce((a, b) => a + b, 0);
  const table = new Table({
    width: { size: twips(total), type: WidthType.DXA },
    columnWidths: block.columns.map(twips),
    rows: block.rows.map(
      (row) =>
        new TableRow({
          children: row.map(
            (cell, index) =>
              new TableCell({
                width: { size: twips(block.columns[index]), type: WidthType.DXA },
                borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
                children: [new Paragraph({ children: textRuns(cell) })],
              }),
          ),
        }),
    ),
  });
  const items: (Paragraph | Table)[] = [];
  if (block.spaceBefore > 4) items.push(new Paragraph({ children: [], spacing: { before: 0, after: 0, line: Math.max(20, twips(block.spaceBefore)), lineRule: "exact" } }));
  items.push(table);
  // Word needs a paragraph between consecutive tables, or it joins them.
  items.push(new Paragraph({ children: [], spacing: { before: 0, after: 0 } }));
  return items;
}

function section(page: PageLayout, number: number): ISectionOptions {
  const landscape = page.width > page.height;
  const children: (Paragraph | Table)[] = [];
  if (page.noText) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: page.scanned
              ? `Page ${number} is a scanned image with no selectable text, so it could not be converted.`
              : `Page ${number} has no text to convert.`,
            italics: true,
            color: "666666",
          }),
        ],
      }),
    );
  } else {
    for (const block of page.blocks) children.push(...blockToDocx(block));
  }
  if (children.length === 0) children.push(new Paragraph({ children: [] }));
  return {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: {
        // docx expects portrait dimensions and swaps them for landscape.
        size: { width: twips(Math.min(page.width, page.height)), height: twips(Math.max(page.width, page.height)), orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
        margin: { top: twips(page.margins.top), right: twips(page.margins.right), bottom: twips(page.margins.bottom), left: twips(page.margins.left), header: 0, footer: 0 },
      },
    },
    children,
  };
}

/** Most used font across the document, for the default style. */
function mainFont(pages: PageLayout[]): string | undefined {
  const usage = new Map<string, number>();
  for (const page of pages)
    for (const block of page.blocks) {
      const runs = block.type === "paragraph" ? block.runs : block.type === "table" ? block.rows.flat(2) : [];
      for (const run of runs) if (run.font) usage.set(run.font, (usage.get(run.font) ?? 0) + run.text.length);
    }
  return [...usage.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function buildDocx(pages: PageLayout[], title: string): Document {
  const font = mainFont(pages) ?? "Calibri";
  // Heading styles keep the PDF's look (black, the font's own size) while still
  // appearing in Word's navigation pane.
  const headingStyle = (id: string, name: string) => ({
    id,
    name,
    basedOn: "Normal",
    next: "Normal",
    quickFormat: true,
    run: { bold: true, color: "000000", font },
    paragraph: { keepNext: true, spacing: { before: 0, after: 0 } },
  });
  return new Document({
    creator: "Imgifyr PDF to Word",
    title,
    styles: {
      default: { document: { run: { font, size: 22 }, paragraph: { spacing: { after: 0, line: 240 } } } },
      paragraphStyles: [headingStyle("Heading1", "Heading 1"), headingStyle("Heading2", "Heading 2"), headingStyle("Heading3", "Heading 3")],
    },
    sections: pages.map((page, index) => section(page, index + 1)),
  });
}

export async function docxBytes(document: Document): Promise<Uint8Array> {
  return new Uint8Array(await Packer.toArrayBuffer(document));
}
