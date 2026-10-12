import type { Metadata } from "next";
import Link from "next/link";
import { PdfToWordTool } from "@/components/documents/pdf-to-word-tool";
import { ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("pdf-to-word");

const description =
  "Convert PDF to an editable Word DOCX online, free. Text, headings, lists and simple tables are rebuilt from text-based PDFs, in your browser with no upload.";

export const metadata: Metadata = pageMetadata({
  title: "PDF to Word Converter Online Free – Editable DOCX",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "Will the Word document be editable?",
    answer:
      "Yes. The result is a real .docx with normal paragraphs, Word heading styles, bulleted lists and tables that you can edit, restyle and reflow. It isn't an image of the PDF pasted into Word.",
  },
  {
    question: "Does it work with scanned PDFs?",
    answer:
      "No. A scanned PDF is a picture of a page with no text in it, and turning that picture into text needs OCR (optical character recognition), which this tool doesn't do. If a PDF has both kinds of page, the text pages are converted and each scanned page is marked in the document.",
  },
  {
    question: "How can I tell if my PDF has real text?",
    answer:
      "Open it in a PDF reader and try to select a word or search for one. If you can, the PDF has text and will convert. If the whole page highlights like a picture, it's a scan.",
  },
  {
    question: "How close is the layout to the PDF?",
    answer:
      "Each PDF page becomes a Word page of the same size and orientation, with the text in reading order, headings detected from larger type, and the PDF's fonts, sizes, bold and italic kept (the font names are used in Word; a font you don't have installed is shown in a similar one). Two-column pages are put in reading order as one column. Images aren't carried over, and complex layouts, unusual fonts, equations and forms may need tidying in Word.",
  },
  {
    question: "Is there a size or page limit?",
    answer:
      "PDFs up to 50 MB and 200 pages. Password-protected PDFs that need a password to open aren't supported; remove the password first.",
  },
  {
    question: "Is my PDF uploaded?",
    answer:
      "No. The PDF is read and the Word file is created by your browser on your device. Nothing is sent to Imgifyr or a conversion service.",
  },
];

export default function PdfToWordPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="PDF to Word Converter"
      intro={
        <p>
          Convert a PDF to an editable Word document (.docx) for free. Text, headings, lists and simple tables are rebuilt as
          real Word content from PDFs that contain selectable text. It runs in your browser, so the PDF isn&apos;t uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to convert PDF to Word</h2>
          <ol>
            <li>Choose or drop a PDF file.</li>
            <li>
              Select <strong>Convert to Word</strong>.
            </li>
            <li>
              Select <strong>Download DOCX</strong> and open the file in Word, Google Docs or LibreOffice.
            </li>
          </ol>

          <h2>Text PDFs and scanned PDFs</h2>
          <p>
            PDFs exported from Word, Google Docs, websites and most software contain real text, and convert well. Scanned
            documents and photos saved as PDF contain only pictures of text. This converter doesn&apos;t do OCR, so it tells you
            when a PDF or a page is a scan instead of producing an empty document.
          </p>

          <h2>What the converter rebuilds</h2>
          <ul>
            <li>
              <strong>Paragraphs</strong> are rejoined from the PDF&apos;s separate lines, so text reflows when you edit it.
            </li>
            <li>
              <strong>Headings</strong> are recognised from larger type and given Word heading styles, so they appear in the
              navigation pane.
            </li>
            <li>
              <strong>Lists</strong> that start with bullets become Word bulleted lists; numbered items keep their numbers.
            </li>
            <li>
              <strong>Tables</strong> with text aligned in columns become Word tables.
            </li>
            <li>
              <strong>Pages</strong> keep the PDF&apos;s page size and orientation, and bold and italic text stays bold and
              italic.
            </li>
          </ul>

          <h2>Limitations</h2>
          <p>
            A PDF records where each character is drawn, not how the document was structured, so the structure is inferred.
            Images and drawings aren&apos;t carried over. Multi-column layouts, text in shapes, footnotes, equations, form fields
            and decorative fonts may come out differently, and tables without clear columns may become plain text. Review the
            document before you use it.
          </p>

          <h2>Related tools</h2>
          <p>
            Finished editing? Turn the document back into a PDF with <Link href="/tools/word-to-pdf">Word to PDF</Link>, or
            combine several PDFs with <Link href="/tools/merge-pdf">Merge PDF</Link>. For photos of pages, use{" "}
            <Link href="/tools/photo-to-pdf">Photo to PDF</Link>. See all <Link href="/tools/pdf-tools">PDF tools</Link>.
          </p>

          <section aria-labelledby="privacy-heading">
            <h2 id="privacy-heading">Privacy: your PDF stays on your device</h2>
            <p>
              The PDF is read in your browser and the Word file is created there. Nothing is uploaded or stored by Imgifyr. Read
              the <Link href="/privacy">privacy policy</Link> for details.
            </p>
          </section>
        </>
      }
    >
      <PdfToWordTool />
    </ToolPageShell>
  );
}
