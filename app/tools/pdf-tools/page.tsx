import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs/breadcrumbs";
import { ToolCard } from "@/components/tool-card/tool-card";
import { DOC_LIMITS } from "@/lib/documents/validate";
import { pageMetadata } from "@/lib/seo/metadata";
import { getTool, PDF_HUB, toolsIn, type ToolId } from "@/lib/tools/registry";
import { formatBytes } from "@/lib/utils/format";

export const metadata: Metadata = pageMetadata({
  title: "Free Online PDF Tools – Convert and Combine Documents",
  description:
    "Free PDF tools that run in your browser: convert Word to PDF and PDF to Word, merge PDF files, and turn photos into PDFs. No upload, no sign-up.",
  path: PDF_HUB.path,
});

/** Image tools that also produce PDFs. */
const IMAGE_TO_PDF: ToolId[] = ["jpg-to-pdf", "photo-to-pdf"];

export default function PdfToolsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Tools", path: "/tools" },
          { name: PDF_HUB.name, path: PDF_HUB.path },
        ]}
      />
      <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.02em] text-ink sm:text-4xl">Free online PDF tools</h1>
      <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-soft">
        Convert Word documents to PDF and PDFs to editable Word, combine several PDFs into one, or make a PDF from photos. Like
        every Imgifyr tool, they run in your browser: your documents aren&apos;t uploaded.
      </p>

      <section aria-labelledby="document-tools-heading" className="mt-10">
        <h2 id="document-tools-heading" className="text-xl font-bold tracking-tight text-ink">
          Convert and combine documents
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {toolsIn("pdf").map((tool) => (
            <li key={tool.id}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="image-pdf-heading" className="mt-12">
        <h2 id="image-pdf-heading" className="text-xl font-bold tracking-tight text-ink">
          Make a PDF from images
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {IMAGE_TO_PDF.map((id) => (
            <li key={id}>
              <ToolCard tool={getTool(id)} />
            </li>
          ))}
        </ul>
      </section>

      <div className="prose-content mx-auto max-w-3xl">
        <h2>Which tool do I need?</h2>
        <ul>
          <li>
            <strong>Sending a document that shouldn&apos;t change:</strong> <Link href="/tools/word-to-pdf">convert Word to
            PDF</Link>. Everyone sees the same pages, whatever software they use.
          </li>
          <li>
            <strong>Editing text you only have as a PDF:</strong> <Link href="/tools/pdf-to-word">convert the PDF to
            Word</Link>. This works for PDFs with selectable text, not scans.
          </li>
          <li>
            <strong>A form asks for one PDF but you have several:</strong> <Link href="/tools/merge-pdf">merge the PDFs</Link>{" "}
            in the order you need.
          </li>
          <li>
            <strong>You have photos or scans of pages:</strong> <Link href="/tools/jpg-to-pdf">JPG to PDF</Link> keeps JPGs
            unchanged, and <Link href="/tools/photo-to-pdf">Photo to PDF</Link> also accepts PNG, WebP and iPhone HEIC photos.
          </li>
        </ul>

        <h2>Formats and limits at a glance</h2>
        <div className="not-prose overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">What each PDF tool accepts, produces and leaves out</caption>
            <thead className="bg-surface text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="px-3 py-2 font-medium">Tool</th>
                <th scope="col" className="px-3 py-2 font-medium">Accepts</th>
                <th scope="col" className="px-3 py-2 font-medium">Limits</th>
                <th scope="col" className="px-3 py-2 font-medium">Not carried over</th>
              </tr>
            </thead>
            <tbody className="text-ink-soft">
              <tr className="border-b border-line align-top">
                <th scope="row" className="px-3 py-2 font-medium text-ink">
                  <Link href="/tools/word-to-pdf" className="text-accent hover:underline">Word to PDF</Link>
                </th>
                <td className="px-3 py-2">Word .docx</td>
                <td className="px-3 py-2">{formatBytes(DOC_LIMITS.wordMaxBytes)}, {DOC_LIMITS.wordMaxPages} pages</td>
                <td className="px-3 py-2">Some text boxes, charts and equations; fonts that aren&apos;t embedded or installed are replaced by a similar font</td>
              </tr>
              <tr className="border-b border-line align-top">
                <th scope="row" className="px-3 py-2 font-medium text-ink">
                  <Link href="/tools/pdf-to-word" className="text-accent hover:underline">PDF to Word</Link>
                </th>
                <td className="px-3 py-2">PDF with selectable text</td>
                <td className="px-3 py-2">{formatBytes(DOC_LIMITS.pdfToWordMaxBytes)}, {DOC_LIMITS.pdfToWordMaxPages} pages</td>
                <td className="px-3 py-2">Images, scanned pages (no OCR), form fields</td>
              </tr>
              <tr className="align-top">
                <th scope="row" className="px-3 py-2 font-medium text-ink">
                  <Link href="/tools/merge-pdf" className="text-accent hover:underline">Merge PDF</Link>
                </th>
                <td className="px-3 py-2">PDF files that open without a password</td>
                <td className="px-3 py-2">
                  {DOC_LIMITS.mergeMaxFiles} files, {formatBytes(DOC_LIMITS.mergeMaxFileBytes)} each, {formatBytes(DOC_LIMITS.mergeMaxTotalBytes)} in total
                </td>
                <td className="px-3 py-2">Bookmarks, digital signatures, form fields</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Tips for better results</h2>
        <ul>
          <li>
            <strong>Password-protected files</strong> can&apos;t be opened by any tool here. Remove the password in Word or
            your PDF reader first, then convert or merge the copy.
          </li>
          <li>
            <strong>Older .doc files</strong> need saving as .docx first: in Word choose File › Save as › Word Document, or
            open the file in Google Docs and download it as .docx.
          </li>
          <li>
            <strong>Scanned documents</strong> are pictures of text, so PDF to Word can&apos;t read them. To share scans as one
            file, make them into a PDF with <Link href="/tools/jpg-to-pdf">JPG to PDF</Link> and combine it with other PDFs
            using <Link href="/tools/merge-pdf">Merge PDF</Link>.
          </li>
          <li>
            <strong>Upload limits on forms</strong> often apply to the final PDF. Converting is quick, so check the size shown
            next to the download button before you submit.
          </li>
        </ul>

        <h2>How the PDF tools handle your files</h2>
        <p>
          The files you choose are read by your browser and processed on your device. They aren&apos;t uploaded to Imgifyr or
          to a conversion service, and nothing is kept after you close the page. Because the work happens on your device, very
          large documents can be slow on older phones; each tool states its size and page limits. See{" "}
          <Link href="/methodology">how the tools work</Link> and the <Link href="/privacy">privacy policy</Link>.
        </p>
      </div>
    </div>
  );
}
