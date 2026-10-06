import type { Metadata } from "next";
import Link from "next/link";
import { BulkImageResizerTool } from "@/components/tools/bulk-image-resizer-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("bulk-image-resizer");

const description =
  "Resize multiple images at once in your browser. Set a width, height or percentage, choose the format and quality, and download them all as a ZIP. No upload.";

export const metadata: Metadata = pageMetadata({
  title: "Bulk Image Resizer – Resize Multiple Images at Once",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How many images can I resize at once?",
    answer:
      "Up to 200 images per batch, each up to 50 MB. In practice the limit is your device's memory: a desktop handles large batches of phone photos easily, while on a phone smaller batches of 20–50 work best.",
  },
  {
    question: "What happens to images with different shapes?",
    answer:
      "With “Lock aspect ratio” on, every image keeps its own proportions and is scaled to fit within the width and height you enter. A landscape and a portrait photo will therefore get different dimensions but neither is stretched. Turn it off only if every image must be exactly the same size.",
  },
  {
    question: "What if one of the images fails?",
    answer:
      "The rest of the batch carries on. The failed image is marked with a plain-language reason, such as a damaged file or an unsupported format, and you can remove it or try again.",
  },
  {
    question: "Can I convert formats while resizing?",
    answer:
      "Yes. Choose JPG, PNG or WebP as the output format, or keep each image's original format. iPhone HEIC photos are saved as JPG.",
  },
  {
    question: "Are the images uploaded?",
    answer:
      "No. Every image is resized by your browser on your device, and the ZIP file is assembled locally too. Nothing is sent to a server.",
  },
  {
    question: "Why is the ZIP file about the same size as the images?",
    answer:
      "JPG, PNG and WebP are already compressed, so zipping them again saves almost nothing. The ZIP simply bundles the files into one download. To make the files themselves smaller, lower the quality or the dimensions.",
  },
];

export default function BulkImageResizerPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Bulk Image Resizer: Resize Multiple Images at Once"
      intro={
        <p>
          Select a folder&apos;s worth of photos, set one size rule, and resize them all together. Download each image or the
          whole batch as a ZIP. Processing happens in your browser, a few images at a time, so nothing is uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to resize images in bulk</h2>
          <ol>
            <li>Choose or drop several JPG, PNG, WebP or HEIC images. Each file is checked and gets a thumbnail.</li>
            <li>
              Enter a target width, height or both, or switch to Percentage. Keep &ldquo;Lock aspect ratio&rdquo; on to avoid
              stretching.
            </li>
            <li>Pick the output format and quality.</li>
            <li>Select Resize all and follow the progress for each file.</li>
            <li>Download images individually, or all of them as one ZIP.</li>
          </ol>

          <h2>Size rules for a mixed batch</h2>
          <p>Batches usually mix landscape and portrait photos, so the settings work as rules rather than one fixed size:</p>
          <ul>
            <li>
              <strong>Width only</strong> (e.g. 1280): every image becomes 1280 pixels wide; heights follow each image&apos;s
              proportions.
            </li>
            <li>
              <strong>Height only</strong>: every image gets that height.
            </li>
            <li>
              <strong>Width and height, locked</strong> (e.g. 1600 × 1600): each image fits inside that box, so its longest
              side is at most 1600 pixels.
            </li>
            <li>
              <strong>Width and height, unlocked</strong>: every image becomes exactly that size, stretching any image with
              different proportions.
            </li>
            <li>
              <strong>Percentage</strong>: each image is scaled by the same factor, such as 50%.
            </li>
          </ul>
          <p>
            &ldquo;Don&apos;t enlarge smaller images&rdquo; leaves images that are already smaller than the target at their own
            size, because enlarging can&apos;t add detail.
          </p>

          <h2>Common batch jobs</h2>
          <ul>
            <li>
              <strong>Website and blog images:</strong> limit photos to 1600–2000 pixels wide so pages load quickly.
            </li>
            <li>
              <strong>Online stores:</strong> give every product photo the same maximum size, for example 1200 × 1200.
            </li>
            <li>
              <strong>Email and sharing:</strong> shrink a set of holiday photos to 50% before sending.
            </li>
            <li>
              <strong>iPhone photos:</strong> resize and convert a set of HEIC photos to JPG in one go.
            </li>
          </ul>

          <h2>How the batch is processed</h2>
          <p>
            Images are decoded and resized in background threads (Web Workers), two or three at a time depending on your
            device. Processing every image simultaneously would quickly run out of memory with large photos, so the batch
            moves through a queue, and each image&apos;s memory is freed as soon as it&apos;s done. If one file can&apos;t be
            processed, it&apos;s marked as failed and the rest continue.
          </p>
          <p>
            For a single image with more control, such as exact width and height presets, use the{" "}
            <Link href="/tools/image-resizer">image resizer</Link>. To make files smaller without changing dimensions, try
            the <Link href="/tools/image-compressor">image compressor</Link>, and to hit a strict size limit such as 100 KB,
            use <Link href="/tools/resize-image-to-kb">resize image to KB</Link>.
          </p>

          <PrivacyNote>
            <p>
              Batches are often whole photo albums. Every image is resized on your device and the ZIP is built in your
              browser, so none of your photos are uploaded.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <BulkImageResizerTool />
    </ToolPageShell>
  );
}
