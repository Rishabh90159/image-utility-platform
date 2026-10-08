import type { Metadata } from "next";
import Link from "next/link";
import { ImageResizerTool } from "@/components/tools/image-resizer-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("image-resizer");

const description =
  "Free online image resizer for JPG, PNG, WebP and HEIC photos. Resize by pixels or percentage, keep the aspect ratio, pick a popular size and download. No upload.";

export const metadata: Metadata = pageMetadata({
  title: "Image Resizer – Resize Images Online by Pixels or Percentage",
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
    question: "Should I resize by pixels or by percentage?",
    answer:
      "Use pixels when you've been given a number, such as “1200 px wide” for a website or “600 × 600” for a profile photo. Use percentage when you just want the image smaller or bigger by a fixed amount, such as 50%, without working out the new numbers yourself. Both keep the proportions unless you turn that off.",
  },
  {
    question: "What does “maintain aspect ratio” do?",
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
          Change the width and height of a JPG, PNG, WebP or iPhone HEIC photo in pixels or by percentage, keep its
          proportions, and download the resized image. Resizing happens in your browser, so your image is never uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to Resize an Image Online</h2>
          <ol>
            <li>Choose, drop or paste a JPG, PNG, WebP or HEIC image.</li>
            <li>
              Enter a new width or height in pixels, pick a common width or a popular size, or switch to{" "}
              <strong>Percentage</strong> to scale by a fixed amount such as 50%.
            </li>
            <li>Keep the original format or choose JPG, PNG or WebP, and set the quality for JPG and WebP.</li>
            <li>
              Select <strong>Resize image</strong>, compare the before and after sizes, then download the result.
            </li>
          </ol>

          <h2>Features</h2>
          <ul>
            <li>Resize by exact pixels or by percentage, with the aspect ratio maintained by default.</li>
            <li>One-click common widths, from 640 px for email up to 3840 px for 4K screens.</li>
            <li>Popular dimensions such as Full HD, square and portrait posts, stories and link previews, fitted without stretching.</li>
            <li>Opens iPhone HEIC photos and saves them as JPG, PNG or WebP.</li>
            <li>Shows original and new dimensions, file size and the percentage saved side by side.</li>
            <li>Multi-step downscaling for clean, sharp results on large reductions.</li>
            <li>Optional format change while resizing, with a quality control for JPG and WebP.</li>
            <li>Respects photo orientation from phone cameras, so images aren&apos;t sideways.</li>
            <li>No sign-up, no watermark, no limit on how many images you resize.</li>
          </ul>

          <h2>Resize an Image by Pixels or by Percentage</h2>
          <p>
            <strong>Pixels</strong> is for when you have been given a number: a website that wants images 1200 px wide, a
            profile photo of 400 × 400, a screen of 1920 × 1080. Type one side and the other follows, so the picture keeps its
            shape. <strong>Percentage</strong> is for when you simply want it smaller or bigger: 50% halves both sides, 25%
            makes a quick thumbnail, 200% doubles it. The new size is shown before you resize, so you always know what you
            will get.
          </p>

          <h2>Popular Image Dimensions</h2>
          <p>
            The <strong>Popular dimensions</strong> menu scales the image to fit inside a common size without stretching it.
            If your photo has a different shape from the target, one side will be shorter; to fill the exact shape,{" "}
            <Link href="/tools/image-cropper">crop the image to the same ratio</Link> first.
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Size</th>
                <th scope="col">Pixels</th>
                <th scope="col">Typical use</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>HD / Full HD / 4K</td>
                <td>1280 × 720 / 1920 × 1080 / 3840 × 2160</td>
                <td>Wallpapers, slides, video thumbnails, website banners</td>
              </tr>
              <tr>
                <td>Square post</td>
                <td>1080 × 1080</td>
                <td>Social media feeds, marketplace listings</td>
              </tr>
              <tr>
                <td>Portrait post (4:5)</td>
                <td>1080 × 1350</td>
                <td>Taller feed posts that fill more of a phone screen</td>
              </tr>
              <tr>
                <td>Vertical story (9:16)</td>
                <td>1080 × 1920</td>
                <td>Stories, reels and status updates</td>
              </tr>
              <tr>
                <td>Link preview</td>
                <td>1200 × 630</td>
                <td>The image shown when a web page is shared</td>
              </tr>
            </tbody>
          </table>

          <h2>Resize JPG, PNG, WebP, HEIC and GIF Images</h2>
          <p>
            The resizer opens the formats used for almost every photo and web graphic. A JPG keeps being a JPG unless you pick
            another format, so it still opens everywhere; PNGs keep their transparency; WebP stays small; iPhone HEIC photos are
            saved as JPG. Each format also has its own page with extra settings: the{" "}
            <Link href="/tools/resize-jpg">JPG resizer</Link> can set a print DPI, the{" "}
            <Link href="/tools/resize-png">PNG resizer</Link> can reduce colours for a much smaller file, the{" "}
            <Link href="/tools/resize-webp">WebP resizer</Link> flags animated files, and the{" "}
            <Link href="/tools/resize-gif">GIF resizer</Link> resizes every frame of an animation.
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
              <tr>
                <td>HEIC / HEIF</td>
                <td>Yes</td>
                <td>No (saved as JPG)</td>
                <td>iPhone photos. Decoded on your device, then saved in a format everything opens.</td>
              </tr>
              <tr>
                <td>GIF</td>
                <td>
                  <Link href="/tools/resize-gif">GIF resizer</Link>
                </td>
                <td>Yes</td>
                <td>Animated GIFs need their own tool so every frame is kept.</td>
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
              background colour of your choice, or go the other way and{" "}
              <Link href="/tools/jpg-to-png">convert JPG to PNG</Link> to avoid further compression while editing.
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
