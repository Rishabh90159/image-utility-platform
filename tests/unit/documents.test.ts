import { PDFDocument, StandardFonts, degrees } from "@cantoo/pdf-lib";
import { Document, Packer, Paragraph, TextRun } from "docx";
import JSZip from "jszip";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { DocumentToolError, toDocumentToolError } from "@/lib/documents/errors";
import { inspectPdf, mergePdfs } from "@/lib/documents/merge";
import { convertPdfToWord } from "@/lib/documents/pdf-to-word/convert";
import { wordFontName } from "@/lib/documents/pdf-to-word/extract";
import { buildLines, layoutPage, orderColumns, type PdfTextItem } from "@/lib/documents/pdf-to-word/layout";
import { addFallbacksToCss, bundledFontFaces, METRIC_FAMILY, withFallbacks } from "@/lib/documents/word-to-pdf/fonts";
import fs from "node:fs";
import { assertDocx, assertPdf, documentFileName, DOC_LIMITS, isEncryptedOfficeFile, sniffDocument } from "@/lib/documents/validate";

const enc = (text: string) => new TextEncoder().encode(text);

async function expectCode(promise: Promise<unknown> | (() => unknown), code: string) {
  const run = typeof promise === "function" ? Promise.resolve().then(promise) : promise;
  const error = await run.then(
    () => null,
    (caught) => caught,
  );
  expect(error, `expected ${code}`).toBeInstanceOf(DocumentToolError);
  expect((error as DocumentToolError).code).toBe(code);
  return error as DocumentToolError;
}

/** A PDF whose pages each show one label, with optional sizes and rotation. */
async function labelledPdf(pages: { label: string; size?: [number, number]; rotate?: number }[], encrypt?: { userPassword: string; ownerPassword: string }) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const spec of pages) {
    const page = doc.addPage(spec.size ?? [595, 842]);
    page.drawText(spec.label, { x: 72, y: page.getHeight() - 100, size: 14, font });
    if (spec.rotate) page.setRotation(degrees(spec.rotate));
  }
  if (encrypt) doc.encrypt(encrypt);
  return doc.save();
}

async function pageTexts(bytes: Uint8Array): Promise<{ text: string; width: number; height: number; rotate: number }[]> {
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const out = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const [, , w, h] = page.view;
    out.push({ text: content.items.map((item) => ("str" in item ? item.str : "")).join("").trim(), width: w, height: h, rotate: page.rotate });
  }
  return out;
}

async function sampleDocx(): Promise<Uint8Array> {
  const doc = new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun("Hello from Word")] })] }] });
  return new Uint8Array(await Packer.toArrayBuffer(doc));
}

describe("file validation by content", () => {
  it("recognises PDFs, zip, OLE and RTF from their bytes", () => {
    expect(sniffDocument(enc("%PDF-1.7\n..."))).toBe("pdf");
    expect(sniffDocument(enc("\n\n  junk %PDF-1.4"))).toBe("pdf");
    expect(sniffDocument(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]))).toBe("zip");
    expect(sniffDocument(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBe("ole");
    expect(sniffDocument(enc("{\\rtf1\\ansi"))).toBe("rtf");
    expect(sniffDocument(enc("hello"))).toBe("unknown");
  });

  it("rejects empty, oversized and non-PDF files with clear codes", async () => {
    await expectCode(() => assertPdf(new Uint8Array(), 100), "EMPTY_FILE");
    await expectCode(() => assertPdf(enc("%PDF-1.4 more bytes"), 5), "FILE_TOO_LARGE");
    await expectCode(() => assertPdf(enc("<html>not a pdf</html>"), 1000), "NOT_A_PDF");
    const docx = await sampleDocx();
    await expectCode(() => assertPdf(docx, DOC_LIMITS.pdfToWordMaxBytes), "NOT_A_PDF");
  });

  it("accepts a real .docx and explains legacy, encrypted, RTF, PDF and other Office files", async () => {
    await expect(assertDocx(await sampleDocx())).resolves.toBeUndefined();
    const ole = new Uint8Array(4096);
    ole.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    await expectCode(assertDocx(ole), "LEGACY_DOC");
    const encrypted = ole.slice();
    const name = "EncryptionInfo";
    for (let i = 0; i < name.length; i++) encrypted[1024 + i * 2] = name.charCodeAt(i);
    expect(isEncryptedOfficeFile(encrypted)).toBe(true);
    await expectCode(assertDocx(encrypted), "PASSWORD_PROTECTED");
    await expectCode(assertDocx(enc("{\\rtf1 hello}")), "NOT_A_DOCX");
    await expectCode(assertDocx(enc("%PDF-1.4")), "NOT_A_DOCX");
    await expectCode(assertDocx(new Uint8Array()), "EMPTY_FILE");
    const xlsx = new JSZip();
    xlsx.file("[Content_Types].xml", "<Types/>");
    xlsx.file("xl/workbook.xml", "<workbook/>");
    await expectCode(assertDocx(await xlsx.generateAsync({ type: "uint8array" })), "NOT_A_DOCX");
    const corrupt = new Uint8Array(200);
    corrupt.set([0x50, 0x4b, 0x03, 0x04]);
    await expectCode(assertDocx(corrupt), "CORRUPT");
  });

  it("makes safe download names", () => {
    expect(documentFileName("Report Final.docx", "pdf")).toBe("Report Final.pdf");
    expect(documentFileName("../../etc/passwd", "pdf")).toBe("etcpasswd.pdf");
    expect(documentFileName("<script>.pdf", "docx")).toBe("script.docx");
    expect(documentFileName("", "pdf")).toBe("document.pdf");
  });

  it("never passes library error text through to users", () => {
    const fromLibrary = Object.assign(new Error("ENOENT: /var/task/secret/path"), { code: "ENOENT" });
    const normalized = toDocumentToolError(fromLibrary);
    expect(normalized.code).toBe("CONVERSION_FAILED");
    expect(normalized.message).not.toContain("/var/task");
    expect(toDocumentToolError({ code: "CORRUPT", message: "This PDF is damaged." }).code).toBe("CORRUPT");
    expect(toDocumentToolError({ code: "SOMETHING_ELSE", message: "raw" }).code).toBe("CONVERSION_FAILED");
  });
});

describe("merge PDF", () => {
  it("merges real pages in the given order, keeping size and rotation", async () => {
    const a = await labelledPdf([{ label: "Alpha page 1" }]);
    const b = await labelledPdf([{ label: "Bravo page 1", size: [842, 595] }, { label: "Bravo page 2", rotate: 90 }]);
    const c = await labelledPdf([{ label: "Charlie page 1", size: [612, 792] }]);
    const progress: number[] = [];
    const merged = await mergePdfs(
      [
        { name: "c.pdf", bytes: c },
        { name: "a.pdf", bytes: a },
        { name: "b.pdf", bytes: b },
      ],
      (value) => progress.push(value),
    );
    expect(merged.pages).toBe(4);
    expect(new TextDecoder().decode(merged.bytes.subarray(0, 5))).toBe("%PDF-");
    const pages = await pageTexts(merged.bytes);
    expect(pages.map((p) => p.text)).toEqual(["Charlie page 1", "Alpha page 1", "Bravo page 1", "Bravo page 2"]);
    expect(pages.map((p) => [p.width, p.height])).toEqual([
      [612, 792],
      [595, 842],
      [842, 595],
      [595, 842],
    ]);
    expect(pages[3].rotate).toBe(90);
    expect(progress.at(-1)).toBe(1);
  });

  it("requires two PDFs and reports which file is damaged", async () => {
    const good = await labelledPdf([{ label: "ok" }]);
    await expectCode(mergePdfs([{ name: "one.pdf", bytes: good }]), "TOO_FEW_FILES");
    const truncated = good.slice(0, 40);
    const error = await expectCode(
      mergePdfs([
        { name: "one.pdf", bytes: good },
        { name: "broken.pdf", bytes: truncated },
      ]),
      "CORRUPT",
    );
    expect(error.message).toContain("File 2 (broken.pdf)");
    await expectCode(
      mergePdfs([
        { name: "one.pdf", bytes: good },
        { name: "notes.txt", bytes: enc("just text") },
      ]),
      "NOT_A_PDF",
    );
  });

  it("rejects PDFs that need a password, and opens owner-restricted ones", async () => {
    const locked = await labelledPdf([{ label: "secret" }], { userPassword: "open-me", ownerPassword: "owner" });
    await expectCode(inspectPdf(locked), "PASSWORD_PROTECTED");
    const restricted = await labelledPdf([{ label: "Restricted text" }], { userPassword: "", ownerPassword: "owner" });
    expect(await inspectPdf(restricted)).toEqual({ pages: 1, restricted: true });
    const merged = await mergePdfs([
      { name: "r.pdf", bytes: restricted },
      { name: "p.pdf", bytes: await labelledPdf([{ label: "Plain text" }]) },
    ]);
    expect((await pageTexts(merged.bytes)).map((p) => p.text)).toEqual(["Restricted text", "Plain text"]);
  });
});

describe("PDF to Word", () => {
  async function documentXml(bytes: Uint8Array): Promise<string> {
    const zip = await JSZip.loadAsync(bytes);
    expect(zip.file("[Content_Types].xml")).toBeTruthy();
    return zip.file("word/document.xml")!.async("string");
  }

  it("rebuilds headings, paragraphs, lists, tables and page orientation as a real .docx", async () => {
    const doc = await PDFDocument.create();
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([595, 842]);
    page.drawText("Quarterly Report", { x: 72, y: 760, size: 22, font: bold });
    page.drawText("This is the first line of a paragraph that wraps onto the next line of", { x: 72, y: 720, size: 11, font: regular });
    page.drawText("the page and then ends here.", { x: 72, y: 706, size: 11, font: regular });
    page.drawText("Second paragraph starts after a gap.", { x: 72, y: 680, size: 11, font: regular });
    page.drawText("• First bullet item", { x: 80, y: 650, size: 11, font: regular });
    page.drawText("• Second bullet item", { x: 80, y: 636, size: 11, font: regular });
    const rows = [
      ["Name", "Qty", "Price"],
      ["Apples", "3", "1.20"],
      ["Pears", "10", "4.00"],
    ];
    rows.forEach((row, i) => row.forEach((cell, j) => page.drawText(cell, { x: 72 + j * 150, y: 600 - i * 16, size: 11, font: i === 0 ? bold : regular })));
    doc.addPage([842, 595]).drawText("Landscape page text here.", { x: 72, y: 500, size: 11, font: regular });

    const result = await convertPdfToWord(pdfjs, await doc.save(), { title: "Report" });
    expect(result).toMatchObject({ pages: 2, tables: 1, scannedPages: 0 });
    expect(new TextDecoder().decode(result.bytes.subarray(0, 2))).toBe("PK");
    const xml = await documentXml(result.bytes);
    expect(xml).toMatch(/<w:pStyle w:val="Heading1"\/>[\s\S]*?Quarterly Report/);
    expect(xml).toContain("This is the first line of a paragraph that wraps onto the next line of the page and then ends here.");
    expect(xml.match(/<w:numPr>/g)?.length).toBe(2);
    expect(xml).toContain("First bullet item");
    expect(xml).not.toContain("• First");
    expect(xml.match(/<w:tr>/g)?.length).toBe(3);
    expect(xml).toMatch(/<w:b\/>[\s\S]*?Name/);
    expect(xml).toMatch(/w:orient="portrait"/);
    expect(xml).toMatch(/w:w="16840" w:h="11900" w:orient="landscape"/);
  });

  it("refuses image-only (scanned) PDFs instead of returning an empty document", async () => {
    const doc = await PDFDocument.create();
    const png = await doc.embedPng(
      Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="), (c) => c.charCodeAt(0)),
    );
    doc.addPage([595, 842]).drawImage(png, { x: 0, y: 0, width: 595, height: 842 });
    await expectCode(convertPdfToWord(pdfjs, await doc.save(), { title: "scan" }), "NO_TEXT");

    doc.addPage([595, 842]).drawText("Real text on page two of the document.", { x: 72, y: 700, size: 12, font: await doc.embedFont(StandardFonts.Helvetica) });
    const mixed = await convertPdfToWord(pdfjs, await doc.save(), { title: "mixed" });
    expect(mixed.scannedPages).toBe(1);
    const xml = await documentXml(mixed.bytes);
    expect(xml).toContain("Page 1 is a scanned image");
    expect(xml).toContain("Real text on page two");
  });

  it("explains password-protected, damaged and non-PDF input", async () => {
    const locked = await labelledPdf([{ label: "secret" }], { userPassword: "pw", ownerPassword: "owner" });
    await expectCode(convertPdfToWord(pdfjs, locked, { title: "x" }), "PASSWORD_PROTECTED");
    await expectCode(convertPdfToWord(pdfjs, enc("%PDF-1.4\n garbage that is not a pdf"), { title: "x" }), "CORRUPT");
    await expectCode(convertPdfToWord(pdfjs, enc("plain text"), { title: "x" }), "NOT_A_PDF");
    await expectCode(convertPdfToWord(pdfjs, new Uint8Array(), { title: "x" }), "EMPTY_FILE");
  });
});

describe("fonts", () => {
  it("turns PDF font names into Word font families", () => {
    expect(wordFontName("AAAAAA+Arial-BoldMT")).toBe("Arial");
    expect(wordFontName("BAAAAA+ArialMT")).toBe("Arial");
    expect(wordFontName("TimesNewRomanPS-BoldItalicMT")).toBe("Times New Roman");
    expect(wordFontName("ABCDEF+Calibri,Bold")).toBe("Calibri");
    expect(wordFontName("ABCDEF+Calibri-Light")).toBe("Calibri Light");
    expect(wordFontName("Calibri-LightItalic")).toBe("Calibri Light");
    expect(wordFontName("ArialNarrow-Bold")).toBe("Arial Narrow");
    expect(wordFontName("SegoeUI-Semibold")).toBe("Segoe UI");
    expect(wordFontName("CourierNewPSMT")).toBe("Courier New");
    expect(wordFontName("", "serif")).toBe("Times New Roman");
    expect(wordFontName("g_d0_f1", "sans-serif")).toBeUndefined();
  });

  it("gives missing fonts a fallback of the same kind instead of the browser's serif default", () => {
    expect(withFallbacks("Calibri")).toBe(`Calibri, "${METRIC_FAMILY.Carlito}", Arial, "${METRIC_FAMILY.Arimo}", sans-serif`);
    expect(withFallbacks("Aptos")).toBe(`Aptos, Arial, "${METRIC_FAMILY.Arimo}", sans-serif`);
    expect(withFallbacks('"Times New Roman"')).toBe(`"Times New Roman", "${METRIC_FAMILY.Tinos}", serif`);
    expect(withFallbacks("Georgia")).toBe(`Georgia, "Times New Roman", "${METRIC_FAMILY.Tinos}", serif`);
    expect(withFallbacks("Consolas")).toBe(`Consolas, "Courier New", "${METRIC_FAMILY.Cousine}", monospace`);
    expect(withFallbacks("Arial, sans-serif")).toBe("Arial, sans-serif");
    expect(withFallbacks("var(--docx-minorHAnsi-font)")).toBe("var(--docx-minorHAnsi-font)");
  });

  it("rewrites stylesheets, including theme font variables, but never @font-face rules", () => {
    const css = `.docx{--docx-minorHAnsi-font: Aptos;--docx-majorHAnsi-font: Calibri Light}
p.docx_normal{font-family: var(--docx-minorHAnsi-font); font-size: 11pt}
@font-face{font-family: "Embedded Font"; src: url(data:font/ttf;base64,AAAA)}
span{font-family: Cambria !important}`;
    const out = addFallbacksToCss(css);
    expect(out).toContain(`--docx-minorHAnsi-font: Aptos, Arial, "${METRIC_FAMILY.Arimo}", sans-serif;`);
    expect(out).toContain(`--docx-majorHAnsi-font: Calibri Light, "${METRIC_FAMILY.Carlito}"`);
    expect(out).toContain("font-family: var(--docx-minorHAnsi-font);");
    expect(out).toContain('@font-face{font-family: "Embedded Font"; src: url(data:font/ttf;base64,AAAA)}');
    expect(out).toContain(`font-family: Cambria, "${METRIC_FAMILY.Caladea}", "Times New Roman", "${METRIC_FAMILY.Tinos}", serif !important`);
  });

  it("references bundled font files that exist", () => {
    const urls = [...bundledFontFaces("https://www.imgifyr.com").matchAll(/url\("https:\/\/www\.imgifyr\.com(\/fonts\/documents\/[^"]+)"\)/g)].map((m) => m[1]);
    expect(urls).toHaveLength(40);
    for (const url of urls) expect(fs.existsSync(`public${url}`), url).toBe(true);
  });
});

describe("layout reconstruction", () => {
  const item = (text: string, x: number, top: number, extra: Partial<PdfTextItem> = {}): PdfTextItem => ({
    text,
    x,
    top,
    width: text.length * 5.5,
    size: 11,
    bold: false,
    italic: false,
    ...extra,
  });

  it("reads a two-column page column by column", () => {
    const items: PdfTextItem[] = [];
    for (let i = 0; i < 10; i++) {
      items.push(item(`Left column line ${i} with enough words`, 50, 100 + i * 14));
      items.push(item(`Right column line ${i} with enough words`, 320, 100 + i * 14));
    }
    const ordered = orderColumns(buildLines(items), 595);
    const texts = ordered.map((line) => line.segments.map((s) => s.items.map((i) => i.text).join("")).join(" | "));
    expect(texts.slice(0, 10).every((t) => t.startsWith("Left"))).toBe(true);
    expect(texts.slice(10).every((t) => t.startsWith("Right"))).toBe(true);
  });

  it("joins wrapped lines but keeps short consecutive lines (list items without bullet glyphs) apart", () => {
    const long = "This line runs nearly the full width of the text column on this page, so the";
    const items = [
      item(long, 72, 100, { width: 440 }),
      item("paragraph continues here.", 72, 114),
      item("Apples are listed first", 100, 140),
      item("Oranges come second", 100, 154),
    ];
    const page = layoutPage({ width: 595, height: 842, items, imageCount: 0 }, [], 11);
    const texts = page.blocks.map((block) => (block.type === "paragraph" ? block.runs.map((r) => r.text).join("") : ""));
    expect(texts).toEqual([`${long} paragraph continues here.`, "Apples are listed first", "Oranges come second"]);
    const indent = page.blocks[1].type === "paragraph" ? page.blocks[1].indent : 0;
    expect(indent).toBeCloseTo(28, 0);
  });

  it("marks pages without text, and scans, without inventing content", () => {
    const empty = layoutPage({ width: 595, height: 842, items: [], imageCount: 1 }, [], 11);
    expect(empty).toMatchObject({ noText: true, scanned: true, blocks: [] });
  });
});
