import type { Metadata } from "next";
import Link from "next/link";
import { PdfTool, type PdfToolConfig } from "@/components/tools/pdf-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { RASTER_INPUT_FORMATS } from "@/lib/image-processing/formats";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("photo-to-pdf");

const description =
  "Convert photos to PDF in your browser: combine JPG, PNG, WebP and iPhone HEIC images into one file, reorder pages, choose A4 or Letter, and download.";

export const metadata: Metadata = pageMetadata({
  title: "Photo to PDF Converter – Convert Images to PDF Online",
  description,
  path: tool.path,
});

const config: PdfToolConfig = {
  tool: "photo-to-pdf",
  accept: RASTER_INPUT_FORMATS,
  prompt: "Drop photos to turn into a PDF",
  maxFiles: 100,
};

const faqs: FaqItem[] = [
  {
    question: "How do I combine several photos into one PDF?",
    answer:
      "Add all the photos at once, or add more with Add images. Put them in order with the up and down arrows; each photo becomes one page, in that order. Then select Create PDF and download it.",
  },
  {
    question: "Can I mix JPG, PNG, WebP and HEIC photos in one PDF?",
    answer:
      "Yes. Every supported image becomes a page. iPhone HEIC photos are decoded in your browser first. PNG and WebP images with transparent areas are placed on white, like a printed page.",
  },
  {
    question: "Will my photos lose quality in the PDF?",
    answer:
      "With Best quality, JPG photos are placed in the PDF exactly as they are, with no recompression. Other formats are saved as high-quality JPG (92%), which looks the same at normal viewing size. Smaller file reduces large images and compresses more, which you'll notice only when zooming in.",
  },
  {
    question: "Why is my PDF so large?",
    answer:
      "A PDF of photos is about as big as the photos inside it, and phone photos are often 3–5 MB each. Choose Smaller file to reduce each image to 2000 pixels, or compress the photos first.",
  },
  {
    question: "What do Fit and Fill mean?",
    answer:
      "Fit shows the whole photo on the page, leaving white space where the shapes differ. Fill covers the page edge to edge (inside the margin) and crops whatever doesn't fit. The layout preview shows the result before you create the PDF.",
  },
  {
    question: "Does it work on a phone?",
    answer:
      "Yes. Pick photos from your gallery or camera roll, reorder them with the arrow buttons and download the PDF. Very large batches are limited to 100 images to keep memory use reasonable.",
  },
  {
    question: "Are my photos uploaded?",
    answer: "No. The PDF is built by your browser from the photos on your device. Nothing is sent to a server.",
  },
];

export default function PhotoToPdfPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Photo to PDF Converter"
      intro={
        <p>
          Turn photos, scans and screenshots into one PDF: JPG, PNG, WebP or iPhone HEIC, in any mix. Put the pages in order,
          choose the page size and layout, and download. The PDF is created in your browser.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to convert photos to PDF</h2>
          <ol>
            <li>Choose or drop your photos. You can add more later.</li>
            <li>Reorder them with the arrow buttons and remove any you don&apos;t want. Each photo becomes one page.</li>
            <li>Pick A4 or US Letter, the orientation, Fit or Fill, and a margin. The preview shows each page.</li>
            <li>Select <strong>Create PDF</strong> and download it.</li>
          </ol>

          <h2>Page settings explained</h2>
          <ul>
            <li>
              <strong>Orientation: Auto</strong> turns each page to suit its photo, so a landscape photo gets a landscape page
              in the same PDF as portrait ones.
            </li>
            <li>
              <strong>Fit</strong> keeps the whole photo visible; <strong>Fill</strong> covers the page and crops the overflow.
            </li>
            <li>
              <strong>Margins</strong> leave white space round the photo, which matters if the PDF will be printed: most home
              printers can&apos;t print to the very edge.
            </li>
          </ul>

          <h2>Supported formats</h2>
          <p>
            JPG/JPEG, PNG, WebP and HEIC/HEIF. Transparent areas in PNG and WebP become white. GIF, TIFF and BMP aren&apos;t
            supported; convert them first. If every file you have is a JPG, the{" "}
            <Link href="/tools/jpg-to-pdf">JPG to PDF converter</Link> explains how JPGs are embedded without any quality loss
            and what to do about rotated or CMYK JPGs.
          </p>

          <h2>Common uses</h2>
          <ul>
            <li>Sending photographed documents, receipts or ID pages as one attachment.</li>
            <li>Uploading certificates or mark sheets to forms that only accept PDF.</li>
            <li>Turning a set of whiteboard or homework photos into a single file to share.</li>
            <li>A simple printable album of screenshots or pictures.</li>
          </ul>

          <h2>Tips</h2>
          <ul>
            <li>
              Crop photos of documents to the paper edge first with the <Link href="/tools/image-cropper">image cropper</Link>,
              so each page shows only the document.
            </li>
            <li>
              Want several photos on one page instead of one per page? <Link href="/tools/merge-images">Merge the images</Link>{" "}
              into one picture first, then convert that.
            </li>
            <li>
              Need individual image files rather than a PDF? Use <Link href="/tools/png-to-jpg">PNG to JPG</Link> or{" "}
              <Link href="/tools/jpg-to-png">JPG to PNG</Link>.
            </li>
          </ul>

          <PrivacyNote>
            <p>
              Your photos are read and the PDF is assembled entirely by your browser. Photos of documents and IDs stay on your
              device.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <PdfTool config={config} />
    </ToolPageShell>
  );
}
