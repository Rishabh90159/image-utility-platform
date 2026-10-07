import type { Metadata } from "next";
import Link from "next/link";
import { ImageResizerTool } from "@/components/tools/image-resizer-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("image-resizer");

const description =
  "Free online image resizer for JPG, PNG and WebP photos. Set new pixel dimensions or a percentage, keep the aspect ratio, and download instantly. No upload.";

export const metadata: Metadata = pageMetadata({
  title: "Free Image Resizer – Resize JPG, PNG & WebP Online",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How do I resize an image without losing quality?",
    answer:
      "Make the image smaller rather than larger, keep the aspect ratio locked, and save as PNG (lossless) or as JPG or WebP at 90% quality or higher. The resizer scales large reductions in several steps with high-quality smoothing, which keeps edges clean instead of jagged.",
  },
  {
    question: "Does resizing an image reduce its file size?",
    answer:
      "Usually, yes. Fewer pixels means less data, so halving the width and height typically cuts the file size to roughly a quarter. If you need to meet a specific limit such as 100 KB, use the Resize Image to KB tool, which adjusts quality and dimensions to hit the target for you.",
  },
  {
    question: "What does “lock aspect ratio” do?",
    answer:
      "It keeps the width and height in the same proportion as the original. When you change one value, the other updates automatically so the image is never stretched or squashed. Turn it off only if you deliberately need exact dimensions with different proportions.",
  },
  {
    question: "Can I make an image bigger?",
    answer:
      "Yes, you can enlarge an image up to 16,384 pixels per side. Enlarging can't create detail that wasn't captured, so the result will look softer than the original. For sharp large images, start from the highest-resolution original you have.",
  },
  {
    question: "Is there a maximum image size?",
    answer:
      "Files can be up to 50 MB and up to 100 megapixels. Output images can be up to 16,384 pixels on each side and 50 megapixels in total. Phones and tablets have less memory than computers, so very large images may need a desktop browser.",
  },
  {
    question: "Does the resized image keep EXIF data such as location?",
    answer:
      "No. The resized image is a new file that contains only the pixels, so camera details, timestamps and GPS location are not copied. The photo's orientation is applied before resizing, so it appears the right way up.",
  },
  {
    question: "Are my images uploaded to a server?",
    answer:
      "No. The image is read and resized by your own browser, and the result is created on your device. The image never leaves your device, and nothing is kept after you close the tab.",
  },
];

export default function ImageResizerPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Image Resizer – Resize Images & Photos Online"
      intro={
        <p>
          Change the width and height of a photo in pixels or by percentage, keep its proportions locked, and download the
          resized image. Resizing happens in your browser, so your image is never uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to Resize an Image Online</h2>
          <ol>
            <li>Choose, drop or paste a JPG, PNG or WebP image.</li>
            <li>
              Enter a new width or height in pixels, pick a common width, or switch to <strong>Percentage</strong> to scale
              by a fixed amount such as 50%.
            </li>
            <li>Keep the original format or choose JPG, PNG or WebP, and set the quality for JPG and WebP.</li>
            <li>
              Select <strong>Resize image</strong>, compare the before and after sizes, then download the result.
            </li>
          </ol>

          <h2>Features</h2>
          <ul>
            <li>Resize by exact pixels or by percentage, with the aspect ratio locked by default.</li>
            <li>One-click common widths, from 640 px for email up to 3840 px for 4K screens.</li>
            <li>Shows original and new dimensions and file size side by side.</li>
            <li>Multi-step downscaling for clean, sharp results on large reductions.</li>
            <li>Optional format change while resizing, with a quality control for JPG and WebP.</li>
            <li>Respects photo orientation from phone cameras, so images aren&apos;t sideways.</li>
            <li>No sign-up, no watermark, no limit on how many images you resize.</li>
          </ul>

          <h2>Resize JPG, PNG and WebP Images</h2>
          <p>
            The resizer opens the three formats used for almost every photo and web graphic. A JPG resize keeps the file a
            JPG unless you pick another format, so it still opens everywhere; PNGs keep their transparency; WebP stays small.
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Format</th>
                <th scope="col">Open</th>
                <th scope="col">Save as</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>JPG / JPEG</td>
                <td>Yes</td>
                <td>Yes</td>
                <td>Best for photos. Lossy, with adjustable quality.</td>
              </tr>
              <tr>
                <td>PNG</td>
                <td>Yes</td>
                <td>Yes</td>
                <td>Lossless and supports transparency. Larger files for photos.</td>
              </tr>
              <tr>
                <td>WebP</td>
                <td>Yes</td>
                <td>Most browsers</td>
                <td>Small files with transparency support. Some Safari versions can&apos;t save WebP.</td>
              </tr>
            </tbody>
          </table>

          <h2>Photo Size Reducer</h2>
          <p>
            Most photos are too big for what people need them for: a 12-megapixel phone picture is around 4000 pixels wide and
            several megabytes. Bringing it down to 1280 or 1600 pixels makes it a fraction of the size and still looks sharp
            on screens. That&apos;s why resizing is usually the first step when an upload is too large. When the limit is a
            file size rather than a width, such as &ldquo;under 100 KB&rdquo;, the{" "}
            <Link href="/tools/resize-image-to-kb">image size reducer for KB limits</Link> finds the right dimensions and
            quality for you, and there are ready-made pages for <Link href="/tools/50kb-photo">50KB</Link> and{" "}
            <Link href="/tools/100kb-photo">100KB</Link> photos. Photos for passports and exam forms often need an exact
            pixel size and a KB range together; the <Link href="/tools/passport-photo-resizer">passport photo resizer</Link>{" "}
            and the <Link href="/tools/application-photos">exam photo requirement pages</Link> handle both at once.
          </p>

          <h2>When to resize an image</h2>
          <ul>
            <li>
              <strong>Websites and blogs:</strong> images wider than about 2000 px rarely look better on screen but load more
              slowly.
            </li>
            <li>
              <strong>Email attachments:</strong> a 1280–1600 px wide photo is plenty for viewing and keeps messages small.
            </li>
            <li>
              <strong>Online forms and profiles:</strong> many upload forms specify exact pixel dimensions for photos.
            </li>
            <li>
              <strong>Social media and marketplaces:</strong> uploading at the platform&apos;s preferred width avoids an
              extra round of compression on their side.
            </li>
          </ul>

          <h2>Resize Image Without Losing Quality</h2>
          <p>
            Making an image smaller always discards pixels, but it doesn&apos;t have to look worse. The resizer reduces large
            images in several halving steps with high-quality smoothing, which avoids the jagged edges of a single big jump.
            Keep the aspect ratio locked, save photos as JPG or WebP at 90% or higher, and use PNG for screenshots and
            graphics with text. Enlarging is different: no resizer can add detail that isn&apos;t there.
          </p>
          <ul>
            <li>
              Resize before you compress. Reducing dimensions first is the most effective way to cut file size; then{" "}
              <Link href="/tools/image-compressor">compress the image</Link> if you need it smaller still.
            </li>
            <li>
              If a form gives a file size limit rather than dimensions, use{" "}
              <Link href="/tools/resize-image-to-kb">resize image to a specific KB size</Link> instead.
            </li>
            <li>
              Making a small image much bigger? The <Link href="/tools/image-upscaler">image upscaler</Link> uses a sharper
              enlargement filter.
            </li>
            <li>
              Only want part of the picture? <Link href="/tools/image-cropper">Crop the image</Link> first, then resize what&apos;s
              left. To apply the same size to a whole folder of photos, use the{" "}
              <Link href="/tools/bulk-image-resizer">bulk image resizer</Link>.
            </li>
            <li>Keep screenshots, text and logos as PNG to avoid blurry edges around letters.</li>
            <li>
              Need a smaller file for a transparent PNG? <Link href="/tools/png-to-jpg">Convert PNG to JPG</Link> with a
              background colour of your choice.
            </li>
          </ul>

          <PrivacyNote>
            <p>
              The resizer runs entirely in your browser using built-in image features. Your image is decoded and redrawn at
              the new size on your device, and the download is created locally. It is not uploaded, stored or seen by
              anyone else.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <ImageResizerTool />
    </ToolPageShell>
  );
}
