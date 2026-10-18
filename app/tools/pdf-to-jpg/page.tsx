import type { Metadata } from "next";
import Link from "next/link";
import { PdfToJpgTool } from "@/components/documents/pdf-to-jpg-tool";
import { ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { DOC_LIMITS } from "@/lib/documents/validate";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";
import { formatBytes } from "@/lib/utils/format";

const tool = getTool("pdf-to-jpg");

const description =
  "Convert PDF to JPG online, free: every page becomes a JPG at 72, 150 or 300 DPI, with an optional 50–500 KB limit per image. In your browser, with no upload.";

export const metadata: Metadata = pageMetadata({
  title: "PDF to JPG Converter – Convert PDF Pages to JPG Free",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How do I convert a PDF to JPG?",
    answer:
      "Choose your PDF, pick a resolution and select Convert to JPG. A one-page PDF downloads as a single JPG; a longer PDF downloads as a ZIP file with one JPG per page, numbered in page order.",
  },
  {
    question: "Which resolution should I choose?",
    answer:
      "150 DPI suits most uses: it's sharp on screen and readable when printed. Choose 72 DPI for small files to send in chat or email, and 300 DPI when the image will be printed or you need to zoom into small text. Higher resolution means larger files.",
  },
  {
    question: "Can I convert a PDF to a JPG under 100 KB?",
    answer:
      "Yes. Set Maximum size per image to 100 KB. Each page is saved at the highest quality that fits, and its pixel size is reduced only if quality alone can't reach the limit. If a page still can't fit at the smallest readable size, the result says so.",
  },
  {
    question: "Does it work with scanned PDFs?",
    answer:
      "Yes. Scanned pages are already images, so they convert just like any other page. This tool doesn't read the text (there's no OCR); to get editable text from a PDF that has real text, use PDF to Word.",
  },
  {
    question: "Can I convert only some pages?",
    answer:
      "Every page is converted. In the ZIP, the files are named by page number, so you can keep the pages you need and delete the rest.",
  },
  {
    question: "Can I convert a password-protected PDF?",
    answer: "PDFs that need a password to open can't be converted; remove the password in a PDF reader first, then try again.",
  },
  {
    question: "Are my PDFs uploaded?",
    answer: "No. The pages are drawn and saved as JPGs by your browser on your device. Nothing is sent to Imgifyr or anywhere else.",
  },
];

export default function PdfToJpgPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="PDF to JPG: Convert PDF Pages to JPG Images"
      intro={
        <p>
          Turn each page of a PDF into a JPG image, for forms that want an image, for sharing a page in a chat, or for
          slides. Choose the resolution and, if you need it, a maximum size per image. Your PDF isn&apos;t uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to convert PDF to JPG</h2>
          <ol>
            <li>Choose or drop a PDF.</li>
            <li>Pick 72, 150 or 300 DPI, and optionally a maximum size per image.</li>
            <li>
              Select <strong>Convert to JPG</strong>, then <strong>Download</strong> the JPG or the ZIP of all pages.
            </li>
          </ol>

          <h2>Resolution and file size</h2>
          <p>
            DPI sets how many pixels each inch of the page gets. An A4 page becomes about 595 × 842 pixels at 72 DPI, 1240 ×
            1754 at 150 DPI, and 2480 × 3508 at 300 DPI. The resolution is also written into each JPG, so it prints at the
            original page size.
          </p>
          <p>
            With a size limit, the tool first lowers JPG quality, and only reduces the pixel size if quality alone isn&apos;t
            enough, the same approach as <Link href="/tools/resize-image-to-kb">resizing an image to KB</Link>. Pages with
            photos need more space than pages of text.
          </p>

          <h2>Supported files and limits</h2>
          <ul>
            <li>
              PDFs up to {formatBytes(DOC_LIMITS.pdfToJpgMaxBytes)} and {DOC_LIMITS.pdfToJpgMaxPages} pages, including scans
              and pages of different sizes.
            </li>
            <li>Very large pages are drawn at up to 25 megapixels so the browser doesn&apos;t run out of memory.</li>
            <li>Transparent areas become white, since JPG has no transparency.</li>
          </ul>

          <h2>Common uses</h2>
          <ul>
            <li>An application form asks for a certificate or ID as a JPG, but you have it as a PDF.</li>
            <li>Sharing one page of a document in a messaging app that previews images but not PDFs.</li>
            <li>Putting a page of a report into a presentation or a document as a picture.</li>
          </ul>

          <h2>Related tools</h2>
          <p>
            Going the other way? <Link href="/tools/jpg-to-pdf">JPG to PDF</Link> turns images back into a PDF. To keep a
            PDF as a PDF but make it smaller, <Link href="/tools/compress-pdf">compress the PDF</Link> to a size such as 200
            KB. Need the text rather than an image? Use <Link href="/tools/pdf-to-word">PDF to Word</Link>. Shrink a JPG
            further with the <Link href="/tools/image-compressor">image compressor</Link>, or see all{" "}
            <Link href="/tools/pdf-tools">PDF tools</Link>.
          </p>

          <section aria-labelledby="privacy-heading">
            <h2 id="privacy-heading">Privacy: your PDF stays on your device</h2>
            <p>
              The PDF is opened and each page is drawn in your browser. Nothing is uploaded or stored by Imgifyr. Read the{" "}
              <Link href="/privacy">privacy policy</Link> for details.
            </p>
          </section>
        </>
      }
    >
      <PdfToJpgTool />
    </ToolPageShell>
  );
}
