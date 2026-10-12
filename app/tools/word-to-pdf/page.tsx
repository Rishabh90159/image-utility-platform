import type { Metadata } from "next";
import Link from "next/link";
import { WordToPdfTool } from "@/components/documents/word-to-pdf-tool";
import { ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("word-to-pdf");

const description =
  "Convert Word DOCX documents to PDF online, free. Page size, orientation, tables, lists and images are kept, and the document is converted in your browser.";

export const metadata: Metadata = pageMetadata({
  title: "Word to PDF Converter Online Free – Convert DOCX to PDF",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "Which Word files can I convert?",
    answer:
      "Word .docx documents up to 25 MB and 100 pages, from Word, Google Docs, LibreOffice or Pages. Older .doc files, RTF and password-protected documents aren't supported: open them in Word or Google Docs, save as .docx without a password, and convert that.",
  },
  {
    question: "Is my document uploaded?",
    answer:
      "No. The document is opened, laid out and turned into a PDF by your browser on your device. It isn't sent to Imgifyr or anyone else, which you can confirm in your browser's network tools.",
  },
  {
    question: "Will the PDF look exactly like my Word document?",
    answer:
      "Page size, margins, orientation, headers and footers, tables, lists, images and page breaks are kept. Fonts embedded in the document are used, then the fonts installed on your device. A font you don't have, such as Aptos or Calibri on a phone, is replaced by a similar font of the same style (sans-serif, serif or monospace), so lines may break slightly differently than in Word. Text boxes, charts, SmartArt, equations and tracked changes may not appear exactly as in Word.",
  },
  {
    question: "Can I search and copy text in the PDF?",
    answer:
      "Yes, for text in the Latin alphabet: each page is drawn as a high-resolution image with an invisible text layer on top, so search, selection and copying work. Text in other scripts, such as Hindi or Chinese, displays correctly but can't be searched. For a PDF with fully editable text and fonts, use Word's own File › Save as › PDF.",
  },
  {
    question: "Why is the PDF larger than my Word file?",
    answer:
      "Each page is stored as a detailed image so it looks the same in every PDF viewer, which takes more space than the text in a .docx. A typical text page adds a few hundred KB. To combine the PDF with other files, use Merge PDF.",
  },
];

export default function WordToPdfPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Word to PDF Converter"
      intro={
        <p>
          Convert a Word document (.docx) to PDF online for free. The page size, orientation, tables, lists and images are kept,
          and the conversion runs in your browser, so the document isn&apos;t uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to convert Word to PDF</h2>
          <ol>
            <li>Choose or drop a .docx file.</li>
            <li>
              Select <strong>Convert to PDF</strong> and wait while each page is drawn.
            </li>
            <li>
              Select <strong>Download PDF</strong>. To convert another file, choose <strong>Convert another document</strong>.
            </li>
          </ol>

          <h2>What&apos;s kept, and what to check</h2>
          <ul>
            <li>
              <strong>Kept:</strong> paragraphs and headings with their fonts, sizes and colours; bulleted and numbered lists;
              tables; pictures; page breaks; page size, margins and landscape sections; headers and footers.
            </li>
            <li>
              <strong>Fonts:</strong> fonts embedded in the document are used, then fonts installed on this device. A
              missing font is replaced by a similar one of the same style, so a sans-serif document stays sans-serif. Line
              breaks are closest to Word on a computer that has the document&apos;s fonts.
            </li>
            <li>
              <strong>May differ:</strong> floating text boxes and shapes, charts, SmartArt, equations, comments and tracked
              changes. Check the PDF before sending it.
            </li>
            <li>
              <strong>Not supported:</strong> .doc, .rtf, .odt and password-protected files. Save them as .docx first.
            </li>
          </ul>

          <h2>How the converter works</h2>
          <p>
            The .docx file is opened in your browser and laid out as pages in a hidden, sandboxed frame, separate from this
            site. Pages that run long are split the way a word processor would. Each page is then drawn as an image, placed on a
            PDF page of the same size and given an invisible text layer so the PDF stays searchable. Macros and other active
            content in the document are never run.
          </p>

          <h2>Related tools</h2>
          <p>
            Need to edit a PDF&apos;s text in Word? Use <Link href="/tools/pdf-to-word">PDF to Word</Link>. To join this PDF
            with others into one file, use <Link href="/tools/merge-pdf">Merge PDF</Link>. For scans and photos of documents,{" "}
            <Link href="/tools/jpg-to-pdf">JPG to PDF</Link> and <Link href="/tools/photo-to-pdf">Photo to PDF</Link> turn
            images into PDF pages. See all <Link href="/tools/pdf-tools">PDF tools</Link>.
          </p>

          <section aria-labelledby="privacy-heading">
            <h2 id="privacy-heading">Privacy: your document stays on your device</h2>
            <p>
              The conversion happens in your browser. Your document isn&apos;t uploaded or stored by Imgifyr, and it&apos;s gone
              from memory when you close or reload the page. Read the <Link href="/privacy">privacy policy</Link> for details.
            </p>
          </section>
        </>
      }
    >
      <WordToPdfTool />
    </ToolPageShell>
  );
}
