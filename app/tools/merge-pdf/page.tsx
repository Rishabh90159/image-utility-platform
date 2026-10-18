import type { Metadata } from "next";
import Link from "next/link";
import { MergePdfTool } from "@/components/documents/merge-pdf-tool";
import { ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("merge-pdf");

const description =
  "Merge up to 30 PDFs into one in your order, and keep the result under 200 KB, 500 KB or 1 MB if a form sets a limit. Free, in your browser, no upload.";

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
    question: "Can I merge PDFs and keep the file under 200 KB?",
    answer:
      "Yes. Choose a limit under Keep the merged PDF under. The PDFs are merged first; if the result is bigger than the limit, it's compressed to fit, in the same way as the Compress PDF tool. If pages have to become images to fit, the result tells you, since their text is then no longer selectable.",
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

          <h2>Merging PDFs under a size limit</h2>
          <p>
            A form&apos;s limit applies to the single PDF you upload, so the size that matters is the merged one. With a limit
            chosen, the tool merges first and then compresses only if needed: if the merged file already fits, it is left
            exactly as merged. Up to 50 pages can be compressed this way; for longer documents, remove pages you don&apos;t
            need first.
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
