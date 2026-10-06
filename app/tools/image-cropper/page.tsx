import type { Metadata } from "next";
import Link from "next/link";
import { ImageCropperTool } from "@/components/tools/image-cropper-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("image-cropper");

const description =
  "Crop JPG, PNG, WebP and HEIC images online. Choose free crop or a ratio such as 1:1, 4:3 or 16:9, zoom, rotate and download the result. No upload.";

export const metadata: Metadata = pageMetadata({
  title: "Image Cropper – Crop Photos Online to Any Aspect Ratio",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "Does cropping reduce image quality?",
    answer:
      "Cropping itself removes pixels outside the selection but doesn't change the ones you keep. Saving as PNG keeps them exactly; JPG and WebP re-compress them slightly at the quality you choose. The cropped image has fewer pixels, so it can look softer if you then display it larger.",
  },
  {
    question: "How do I crop an image to a square?",
    answer:
      "Choose the 1:1 aspect ratio. The crop box becomes the largest square that fits, and it stays square as you move or resize it from the corners.",
  },
  {
    question: "Can I crop to an exact pixel size, like 1080 × 1080?",
    answer:
      "Choose the matching ratio (1:1), frame the crop, then turn on “Resize the cropped image” and enter 1080 as the width. The output is exactly 1080 × 1080. For a size with an unusual ratio, use Custom and enter the width and height as the ratio.",
  },
  {
    question: "Does it work on a phone?",
    answer:
      "Yes. Drag the box with one finger, drag a corner to resize, and pinch to zoom in for precise framing. When zoomed in, drag outside the box to look around the photo.",
  },
  {
    question: "Can I crop with the keyboard?",
    answer:
      "Yes. Tab to the crop area, then use the arrow keys to move it and Shift with the arrow keys to resize it. Hold Alt for finer steps.",
  },
  {
    question: "What's the difference between cropping and resizing?",
    answer:
      "Cropping cuts away part of the picture to change what's shown and its shape. Resizing keeps the whole picture but changes how many pixels it has. You often need both: crop to the right framing and ratio, then resize to the required dimensions.",
  },
  {
    question: "Are my photos uploaded?",
    answer: "No. The crop is made by your browser on your device. Your photo is never sent to a server.",
  },
];

export default function ImageCropperPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Image Cropper: Crop Photos Online"
      intro={
        <p>
          Crop a photo freely or to a fixed ratio such as 1:1, 4:3, 3:2 or 16:9. Zoom in for precision, rotate or mirror,
          and download the result in the format you need. Works with touch, mouse and keyboard, and nothing is uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to crop an image</h2>
          <ol>
            <li>Choose, drop or paste an image (JPG, PNG, WebP or iPhone HEIC).</li>
            <li>Pick an aspect ratio, or keep Free to crop any shape.</li>
            <li>Drag the box to frame your subject; drag the corners to resize it. Pinch or use the zoom slider for detail.</li>
            <li>Rotate or mirror if needed, choose the output format, and select Crop image.</li>
            <li>Check the result and download.</li>
          </ol>

          <h2>Aspect ratios explained</h2>
          <p>
            An aspect ratio is the proportion between width and height. It describes shape, not size: a 1200 × 900 photo and
            a 400 × 300 photo are both 4:3.
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Ratio</th>
                <th scope="col">Shape</th>
                <th scope="col">Typical uses</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1:1</td>
                <td>Square</td>
                <td>Profile pictures, avatars, product thumbnails, square social posts</td>
              </tr>
              <tr>
                <td>4:3 / 3:4</td>
                <td>Classic photo</td>
                <td>Most phone and compact camera photos, presentations, tablets</td>
              </tr>
              <tr>
                <td>3:2 / 2:3</td>
                <td>Standard print</td>
                <td>DSLR and mirrorless photos, 6 × 4 inch prints</td>
              </tr>
              <tr>
                <td>16:9 / 9:16</td>
                <td>Widescreen / vertical</td>
                <td>Video thumbnails, website banners, desktop wallpapers; stories and reels in portrait</td>
              </tr>
            </tbody>
          </table>
          <p>
            Use <strong>Landscape</strong> or <strong>Portrait</strong> to flip a ratio, and <strong>Custom</strong> for
            anything else, for example 5:4 or 2.35:1.
          </p>

          <h2>Cropping vs resizing</h2>
          <p>
            Cropping changes <em>what</em> is in the picture and its shape. <Link href="/tools/image-resizer">Resizing</Link>{" "}
            changes <em>how many pixels</em> it has without cutting anything. If you resize a photo to a different shape without
            cropping, it gets stretched. So for an exact size such as 1080 × 1080, crop to the ratio first, then scale; this
            tool can do both in one step.
          </p>

          <h2>Tips for social media and profile photos</h2>
          <ul>
            <li>Leave some space around faces; many sites show profile pictures in a circle that cuts off the corners.</li>
            <li>Use the grid lines to place eyes or the horizon about a third of the way from the edge.</li>
            <li>Check the platform&apos;s current recommended size in its help pages; they change over time.</li>
            <li>
              After cropping, <Link href="/tools/image-compressor">compress the image</Link> if the site limits upload size.
            </li>
          </ul>
          <p>
            Preparing a photo for an official form? The <Link href="/tools/passport-photo-resizer">passport photo resizer</Link>{" "}
            crops to a required size in pixels or millimetres, and the <Link href="/tools/signature-resizer">signature
            resizer</Link> cleans up and sizes a signature scan.
          </p>

          <PrivacyNote>
            <p>
              Cropping happens in your browser, using the image features built into it. Your photo isn&apos;t uploaded, and
              the cropped file doesn&apos;t include location or camera metadata.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <ImageCropperTool />
    </ToolPageShell>
  );
}
