import type { Metadata } from "next";
import Link from "next/link";
import { CompressPdfTool } from "@/components/documents/compress-pdf-tool";
import { ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { COMPRESS_BASE_DPI, COMPRESS_MIN_DPI } from "@/lib/documents/compress-pdf";
import { DOC_LIMITS } from "@/lib/documents/validate";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";
import { formatBytes } from "@/lib/utils/format";

const tool = getTool("compress-pdf");

const description =
  "Compress a PDF to 100KB, 200KB, 500KB or any size for upload forms. A free PDF size reducer that keeps pages readable and runs in your browser, with no upload.";

export const metadata: Metadata = pageMetadata({
  title: "Compress PDF to 100KB, 200KB or Any Size Online",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How do I compress a PDF to 200 KB?",
    answer:
      "Choose your PDF, select 200 KB as the target and select Compress. The tool returns a PDF of 200 KB or less and shows its exact size before you download it. If the PDF is already under 200 KB, you get the original file back unchanged.",
  },
  {
    question: "Will the text in my PDF still be selectable?",
    answer:
      "Only if the PDF could be made small enough without changing its content. When it can't, each page is saved as an image, which looks the same but whose text can't be selected, searched or copied, and links and fillable fields are removed. The result tells you which of the two happened.",
  },
  {
    question: "Why can't my PDF reach the size I chose?",
    answer: `A target can be too small for the number of pages: every page needs some space to stay readable. The tool goes down to about ${COMPRESS_MIN_DPI} DPI before it stops, and then gives you the smallest version it could make. Try a larger target, remove pages you don't need, or split the PDF and upload the parts separately if the form allows it.`,
  },
  {
    question: "Does compressing reduce the quality?",
    answer: `Re-saving without changes loses nothing. Saving pages as images does lose some sharpness: the tool starts at ${COMPRESS_BASE_DPI} DPI and the highest JPG quality that fits, and lowers resolution step by step only as far as your target requires. Zoom in on the result before uploading to check small print.`,
  },
  {
    question: "Is 1 KB 1,000 or 1,024 bytes?",
    answer:
      "This tool uses 1 KB = 1,024 bytes, as Windows and most upload forms do. A few systems count 1,000 bytes. If a form rejects a file that looks right, choose a slightly lower target, such as 190 KB for a 200 KB limit.",
  },
  {
    question: "Can I compress a password-protected PDF?",
    answer:
      "PDFs that need a password to open can't be compressed; remove the password in a PDF reader first. PDFs that open without a password but restrict editing or printing are compressed, and the result doesn't keep those restrictions.",
  },
  {
    question: "Are my PDFs uploaded?",
    answer: "No. The PDF is read and compressed by your browser on your device, and isn't sent to Imgifyr or anywhere else.",
  },
];

export default function CompressPdfPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Compress PDF: Reduce PDF Size to 100KB, 200KB or Any Size"
      intro={
        <p>
          Make a PDF small enough for an upload form. Choose a target such as 100 KB, 200 KB, 500 KB or 1 MB, and the tool
          returns the most readable PDF at or under that size. It runs in your browser: your PDF isn&apos;t uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to compress a PDF to a specific size</h2>
          <ol>
            <li>Choose or drop your PDF.</li>
            <li>Pick the size the form allows, or enter your own in KB or MB.</li>
            <li>
              Select <strong>Compress</strong>, check the size shown with the result, then <strong>Download PDF</strong>.
            </li>
          </ol>

          <h2>How the tool reaches your target</h2>
          <p>It tries the least destructive option first and stops as soon as the file fits:</p>
          <ol>
            <li>
              <strong>Already small enough:</strong> you get the original file back, untouched.
            </li>
            <li>
              <strong>Re-saved:</strong> the PDF is written again in a more compact form. Nothing on the page changes, and text
              stays selectable. This helps most with PDFs exported by older software.
            </li>
            <li>
              <strong>Pages as images:</strong> each page is drawn at {COMPRESS_BASE_DPI} DPI and saved as a JPG inside a new
              PDF of the same page size. The tool searches for the highest quality that fits and lowers the resolution only if
              it has to, down to about {COMPRESS_MIN_DPI} DPI. This is what makes large scans and photo-heavy PDFs small.
            </li>
          </ol>

          <h2>What changes when pages become images</h2>
          <p>
            The pages look the same, but they are now pictures of the original pages. Text can&apos;t be selected, searched or
            copied, links stop working, and fillable fields become part of the page image. For an application
            upload this rarely matters, since the reviewer only views the pages. For a document someone needs to edit or
            search, keep the original as well.
          </p>

          <h2>Supported files and limits</h2>
          <ul>
            <li>
              PDFs up to {formatBytes(DOC_LIMITS.compressMaxBytes)} and {DOC_LIMITS.compressMaxPages} pages, including scans,
              exported documents and mixed page sizes.
            </li>
            <li>Targets from 10 KB to 50 MB. The result is always a standard PDF that opens in any reader.</li>
            <li>PDFs that need a password to open must be unlocked first.</li>
          </ul>

          <h2>Tips for a small, readable PDF</h2>
          <ul>
            <li>
              <strong>Remove pages the form doesn&apos;t need.</strong> Every page takes space, so fewer pages leave more room
              for each one.
            </li>
            <li>
              <strong>Scanning from photos?</strong> Crop each photo to the page first with the{" "}
              <Link href="/tools/image-cropper">image cropper</Link>, then build the PDF with{" "}
              <Link href="/tools/jpg-to-pdf">JPG to PDF</Link> using its <em>Smaller file</em> setting before compressing.
            </li>
            <li>
              <strong>Need one PDF from several?</strong> <Link href="/tools/merge-pdf">Merge the PDFs</Link> first, then
              compress the merged file, so the limit applies to the file you actually upload.
            </li>
            <li>
              <strong>Form wants an image, not a PDF?</strong> Use <Link href="/tools/pdf-to-jpg">PDF to JPG</Link>, which can
              keep each image under a size such as 100 KB, or <Link href="/tools/resize-image-to-kb">resize an image to KB</Link>
              .
            </li>
          </ul>

          <h2>Related tools</h2>
          <p>
            Turn a Word file into a PDF with <Link href="/tools/word-to-pdf">Word to PDF</Link>, make a PDF from phone photos
            with <Link href="/tools/photo-to-pdf">Photo to PDF</Link>, or see all <Link href="/tools/pdf-tools">PDF tools</Link>
            .
          </p>

          <section aria-labelledby="privacy-heading">
            <h2 id="privacy-heading">Privacy: your PDF stays on your device</h2>
            <p>
              Certificates, ID documents and statements are often what people compress, so nothing is uploaded: the PDF is
              read, redrawn and saved in your browser. Read the <Link href="/privacy">privacy policy</Link> for details.
            </p>
          </section>
        </>
      }
    >
      <CompressPdfTool />
    </ToolPageShell>
  );
}
