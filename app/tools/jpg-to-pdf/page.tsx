import type { Metadata } from "next";
import Link from "next/link";
import { PdfTool, type PdfToolConfig } from "@/components/tools/pdf-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("jpg-to-pdf");

const description =
  "Convert JPG to PDF without recompressing your photos: each JPG is placed in the PDF exactly as it is, one per page. A4 or Letter, any order. Free, in your browser.";

export const metadata: Metadata = pageMetadata({
  title: "JPG to PDF Converter – Convert JPG to PDF Without Quality Loss",
  description,
  path: tool.path,
});

const config: PdfToolConfig = {
  tool: "jpg-to-pdf",
  accept: ["image/jpeg"],
  prompt: "Drop JPG images to convert to PDF",
  maxFiles: 100,
};

const faqs: FaqItem[] = [
  {
    question: "Does converting JPG to PDF reduce quality?",
    answer:
      "Not with Best quality selected. A PDF can store JPEG data directly, so each JPG's original bytes are copied into the PDF unchanged: no decoding, no re-saving and no extra compression. The result tells you how many images were embedded this way.",
  },
  {
    question: "My phone photos are sideways in other converters. Will they be here?",
    answer:
      "No. Phones often save a photo sideways and add a note (EXIF orientation) saying how to turn it. This converter reads that note and turns the page content to match, while still embedding the original JPG unchanged.",
  },
  {
    question: "Why does the PDF have about the same size as my JPGs?",
    answer:
      "Because the JPGs are inside it unchanged, plus a few hundred bytes per page for the PDF structure. To make the PDF smaller, choose Smaller file, which reduces each photo to 2000 pixels on the long side and compresses it again.",
  },
  {
    question: "Are .jpeg and .jfif files accepted?",
    answer:
      "Yes. The tool checks the content of each file rather than its name, so any real JPEG works, whatever its extension. Files that aren't JPEG are skipped with a message; use Photo to PDF for PNG, WebP or HEIC images.",
  },
  {
    question: "Are any JPGs re-encoded?",
    answer:
      "Only in two cases: when you choose Smaller file, and for rare CMYK JPGs (usually from print workflows), which are converted to normal RGB so every PDF viewer shows the colours correctly.",
  },
  {
    question: "How many JPGs can I put in one PDF?",
    answer:
      "Up to 100 in one go. Because the JPGs aren't re-encoded, even large batches are quick; the main limit is your device's memory for very large photos.",
  },
  {
    question: "Are my JPGs uploaded?",
    answer: "No. The PDF is assembled by your browser on your device, and your JPGs are never sent anywhere.",
  },
];

export default function JpgToPdfPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="JPG to PDF Converter"
      intro={
        <p>
          Convert JPG photos and scans to a PDF without losing quality: each JPG goes into the PDF exactly as it is, one image
          per page, in the order you choose. Works with .jpg, .jpeg and .jfif files, in your browser.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to convert JPG to PDF</h2>
          <ol>
            <li>Choose or drop your JPG files.</li>
            <li>Arrange them with the up and down arrows; page 1 is at the top.</li>
            <li>Choose A4 or US Letter, orientation, Fit or Fill and a margin, and check the layout preview.</li>
            <li>Keep <strong>Best quality</strong> to embed the JPGs unchanged, then select <strong>Create PDF</strong>.</li>
          </ol>

          <h2>Why there&apos;s no quality loss</h2>
          <p>
            A JPG is already compressed. Many converters decode it and compress it again when building the PDF, which adds a
            second round of JPEG artefacts and can blur text in scanned documents. PDF supports JPEG data natively (the
            &ldquo;DCTDecode&rdquo; filter), so this tool copies each file&apos;s bytes straight into the PDF. What you see in
            the PDF is pixel-for-pixel your original photo, just placed and scaled on a page.
          </p>

          <h2>JPG details the converter handles</h2>
          <ul>
            <li>
              <strong>Rotation:</strong> portrait phone photos stored sideways are turned upright using their EXIF
              orientation, without re-encoding.
            </li>
            <li>
              <strong>Greyscale JPGs</strong> from document scanners stay greyscale.
            </li>
            <li>
              <strong>Progressive JPGs</strong>, common on the web, are embedded as they are.
            </li>
            <li>
              <strong>CMYK JPGs</strong> are converted to RGB, because some PDF viewers display CMYK JPEGs with inverted or
              wrong colours.
            </li>
          </ul>

          <h2>Typical uses</h2>
          <ul>
            <li>Scanned pages or phone photos of documents that a portal only accepts as one PDF.</li>
            <li>Photos of receipts or invoices for expense claims.</li>
            <li>A set of exported JPG slides or designs to share as a single file.</li>
          </ul>

          <h2>Related tools</h2>
          <p>
            Mixing JPG with PNG, WebP or iPhone HEIC images? Use <Link href="/tools/photo-to-pdf">Photo to PDF</Link>, which
            accepts all of them. Need the extension changed from .jpeg to .jpg for a form instead? Use{" "}
            <Link href="/tools/jpeg-to-jpg">JPEG to JPG</Link>. If the PDF must be under an upload limit, reduce the photos
            first with the <Link href="/tools/image-compressor">image compressor</Link> or choose Smaller file.
          </p>

          <PrivacyNote>
            <p>Your JPGs are read and the PDF is built on your device. Scans of documents never leave your browser.</p>
          </PrivacyNote>
        </>
      }
    >
      <PdfTool config={config} />
    </ToolPageShell>
  );
}
