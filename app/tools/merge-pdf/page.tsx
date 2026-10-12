import type { Metadata } from "next";
import Link from "next/link";
import { MergePdfTool } from "@/components/documents/merge-pdf-tool";
import { ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("merge-pdf");

const description =
  "Merge PDF files online for free: combine up to 30 PDFs into one, in the order you choose. Pages are copied unchanged, in your browser with no upload.";

export const metadata: Metadata = pageMetadata({
  title: "Merge PDF Files Online Free – Combine PDFs into One",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "Does merging change the quality of my PDFs?",
    answer:
      "No. The pages are copied into the new PDF as they are: text stays text, images aren't recompressed, and each page keeps its size and orientation.",
  },
  {
    question: "How do I change the order?",
    answer:
      "The PDFs are merged from the top of the list down. Use the up and down arrows next to each file, or drag files on a computer. Remove a file with its × button.",
  },
  {
    question: "How many PDFs can I combine?",
    answer:
      "Up to 30 PDFs at once, up to 100 MB each and 200 MB together. To join more, merge them in groups and then merge the results.",
  },
  {
    question: "Can I merge password-protected PDFs?",
    answer:
      "PDFs that need a password to open can't be merged; remove the password in a PDF reader first. PDFs that open without a password but restrict printing or editing are merged, and the merged PDF doesn't keep those restrictions.",
  },
  {
    question: "What isn't kept in the merged PDF?",
    answer:
      "Page content is kept. Bookmarks (the outline), digital signatures, fillable form fields and file attachments from the original PDFs may not carry over.",
  },
  {
    question: "Are my PDFs uploaded?",
    answer: "No. The PDFs are combined by your browser on your device and aren't sent to Imgifyr or anywhere else.",
  },
];

export default function MergePdfPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Merge PDF Files"
      intro={
        <p>
          Combine several PDF files into one PDF online, for free. Put the files in the order you want and download a single
          document. The pages are copied unchanged, and your PDFs aren&apos;t uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to merge PDF files</h2>
          <ol>
            <li>Choose or drop two or more PDF files. You can add more at any time.</li>
            <li>Put them in order with the up and down arrows; the top file comes first.</li>
            <li>
              Select the <strong>Merge</strong> button, then <strong>Download PDF</strong>.
            </li>
          </ol>

          <h2>Joining PDFs without losing quality</h2>
          <p>
            Merging doesn&apos;t print or convert anything. Each page, with its text, fonts, images and size, is copied from
            its original file into the new one, so a mix of A4 and Letter, portrait and landscape pages stays exactly as it
            was. Damaged files and PDFs that need a password are detected and skipped with an explanation, so they can&apos;t
            break the merged document.
          </p>

          <h2>Typical uses</h2>
          <ul>
            <li>Combining a cover letter, CV and certificates into the single PDF an application form asks for.</li>
            <li>Joining monthly statements or invoices into one file for your records.</li>
            <li>Putting scanned pages, exported slides and reports together before sharing them.</li>
          </ul>

          <h2>Related tools</h2>
          <p>
            Have photos or scans rather than PDFs? Make them into a PDF first with{" "}
            <Link href="/tools/jpg-to-pdf">JPG to PDF</Link> or <Link href="/tools/photo-to-pdf">Photo to PDF</Link>, then
            merge. Convert a Word document with <Link href="/tools/word-to-pdf">Word to PDF</Link>, or get editable text back
            with <Link href="/tools/pdf-to-word">PDF to Word</Link>. See all <Link href="/tools/pdf-tools">PDF tools</Link>.
          </p>

          <section aria-labelledby="privacy-heading">
            <h2 id="privacy-heading">Privacy: your PDFs stay on your device</h2>
            <p>
              The PDFs are combined in your browser. They aren&apos;t uploaded or stored by Imgifyr. Read the{" "}
              <Link href="/privacy">privacy policy</Link> for details.
            </p>
          </section>
        </>
      }
    >
      <MergePdfTool />
    </ToolPageShell>
  );
}
