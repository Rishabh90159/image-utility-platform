import type { Metadata } from "next";
import Link from "next/link";
import { MergeImagesTool } from "@/components/tools/merge-images-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("merge-images");

const description =
  "Merge images into one: stack photos vertically, place them side by side or in a grid, with optional spacing and background. Download PNG or JPG. Free, no upload.";

export const metadata: Metadata = pageMetadata({
  title: "Merge Images – Combine Photos into One Image Online",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How do I combine two photos into one image?",
    answer:
      "Add both photos, choose Horizontal to place them side by side or Vertical to stack them, and select Merge. The preview shows the result before you create it, and you can download it as JPG or PNG.",
  },
  {
    question: "What happens when the images are different sizes?",
    answer:
      "You choose. Smallest scales the bigger images down so they line up with the smallest one (nothing gets blurry from enlarging). Largest enlarges the smaller ones instead. Keep sizes leaves every image as it is and centres them. Images are always scaled in proportion, never stretched.",
  },
  {
    question: "How do I make a grid or collage?",
    answer:
      "Choose Grid and set the number of columns. Every cell gets the same size and each image is fitted inside its cell, so mixed portrait and landscape photos line up neatly with the background colour filling the gaps.",
  },
  {
    question: "Can the background be transparent?",
    answer:
      "Yes. Choose Transparent and the merged image is saved as PNG, so spacing and gaps stay see-through. JPG can't store transparency, so JPG results always have a solid background.",
  },
  {
    question: "How many images can I merge?",
    answer:
      "Up to 30. If the combined picture would be larger than browsers can create (about 50 megapixels, or 16,384 pixels on a side), it's scaled down to fit and the tool tells you by how much.",
  },
  {
    question: "Are my photos uploaded?",
    answer: "No. The images are combined by your browser, on your device.",
  },
];

export default function MergeImagesPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Merge Images: Combine Photos into One"
      intro={
        <p>
          Put two or more pictures together in one image: stacked, side by side or in a grid. Choose how differently sized
          images line up, add spacing and a background, and download a JPG or PNG. Everything happens in your browser.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to merge images</h2>
          <ol>
            <li>Add your images; JPG, PNG, WebP and HEIC can be mixed.</li>
            <li>Put them in order with the arrow buttons.</li>
            <li>Choose Vertical, Horizontal or Grid, how sizes should match, and the spacing and background.</li>
            <li>Check the live preview, select <strong>Merge</strong>, then download.</li>
          </ol>

          <h2>Lining up images of different sizes</h2>
          <p>
            Photos from different cameras and screenshots rarely share a size. In a vertical stack, every image is scaled to the
            same width; side by side, to the same height. Matching the <strong>smallest</strong> keeps everything sharp because
            nothing is enlarged. Matching the <strong>largest</strong> keeps the most detail from the big images but softens
            the small ones. <strong>Keep sizes</strong> is useful for screenshots that should stay at 100%.
          </p>

          <h2>Ideas</h2>
          <ul>
            <li>Before-and-after pairs, side by side.</li>
            <li>A long vertical strip of phone screenshots to share a conversation or a set of steps.</li>
            <li>A grid of product photos or a small photo collage.</li>
            <li>Front and back of a card or document in one image, for forms that take a single upload.</li>
          </ul>

          <h2>Tips</h2>
          <ul>
            <li>
              Crop each photo first with the <Link href="/tools/image-cropper">image cropper</Link> so they share a shape; the
              grid then has no gaps.
            </li>
            <li>
              The merged image can be large. Shrink its dimensions with the <Link href="/tools/image-resizer">image resizer</Link>{" "}
              or its file size with the <Link href="/tools/image-compressor">image compressor</Link>.
            </li>
            <li>
              Want each picture on its own page instead? Make a PDF with <Link href="/tools/photo-to-pdf">Photo to PDF</Link>.
            </li>
          </ul>

          <PrivacyNote>
            <p>Your images are decoded and combined on your device. None of them is uploaded.</p>
          </PrivacyNote>
        </>
      }
    >
      <MergeImagesTool />
    </ToolPageShell>
  );
}
