import type { Metadata } from "next";
import Link from "next/link";
import { ImageResizerTool } from "@/components/tools/image-resizer-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("resize-webp");

const description =
  "Resize WebP images by pixels or percentage and save the result as WebP, JPG or PNG. Transparency is kept and animated WebP files are flagged. Free, no upload.";

export const metadata: Metadata = pageMetadata({
  title: "Resize WebP Images Online – Save as WebP, JPG or PNG",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "Should I save the resized image as WebP, JPG or PNG?",
    answer:
      "Keep WebP for websites and apps you control: it gives the smallest file and supports transparency. Choose JPG when the image is going into an upload form, an email or an older program that doesn't open WebP. Choose PNG when you need transparency and the destination doesn't accept WebP.",
  },
  {
    question: "Why does it say WebP isn't available in my browser?",
    answer:
      "Every current browser can open WebP, but some versions of Safari can't create WebP files. In that case the resizer saves PNG instead (or JPG if you choose it). Chrome, Edge and Firefox can save WebP.",
  },
  {
    question: "Can I resize an animated WebP?",
    answer:
      "Not with the animation kept. Browsers only let web tools read the first frame of an animated WebP, so the result is a still image of that frame, and the tool warns you when it detects an animated file. Animated GIFs are different: the GIF resizer keeps every frame.",
  },
  {
    question: "Does the WebP keep its transparent background?",
    answer:
      "Yes, when you save as WebP or PNG. JPG has no transparency, so transparent areas are filled with white if you choose JPG.",
  },
  {
    question: "What quality should I use for WebP?",
    answer:
      "80–90% is a good range for photos on websites. WebP at 80% generally looks as good as a JPG at a higher quality setting while being noticeably smaller. Raise it for images with fine text or sharp graphics.",
  },
  {
    question: "Which widths should I make for responsive images?",
    answer:
      "A common set is 640, 1024, 1600 and 1920 pixels, used together in an img srcset so phones download the small file and large screens the big one. Resize the original once for each width.",
  },
];

export default function ResizeWebpPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Resize WebP Images Online"
      intro={
        <p>
          Change the dimensions of a WebP picture and choose what you get back: a smaller WebP for the web, a JPG for forms
          and email, or a PNG with transparency. The image is processed in your browser and never uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to resize a WebP image</h2>
          <ol>
            <li>Choose, drop or paste a .webp file. Images saved from websites are often WebP.</li>
            <li>
              Enter a width or height, pick a common width, or switch to <strong>Percentage</strong>.
            </li>
            <li>
              Choose the output: <strong>WebP</strong>, <strong>JPG</strong> or <strong>PNG</strong>, and set the quality
              for WebP or JPG.
            </li>
            <li>
              Select <strong>Resize WebP</strong>, compare the sizes, then download.
            </li>
          </ol>

          <h2>Features</h2>
          <ul>
            <li>Resize and change format in one step, so there&apos;s no separate conversion.</li>
            <li>Keeps the alpha channel when saving as WebP or PNG.</li>
            <li>Detects animated WebP files and tells you only the first frame can be resized.</li>
            <li>Falls back to PNG automatically on browsers that can&apos;t write WebP.</li>
            <li>Quality slider for WebP and JPG output, with the exact new file size shown.</li>
          </ul>

          <h2>WebP, JPG or PNG: which output to choose</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Save as</th>
                <th scope="col">File size</th>
                <th scope="col">Transparency</th>
                <th scope="col">Best for</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>WebP</td>
                <td>Smallest</td>
                <td>Yes</td>
                <td>Your own website, apps, CMS uploads that accept WebP</td>
              </tr>
              <tr>
                <td>JPG</td>
                <td>Small</td>
                <td>No (white background)</td>
                <td>Application forms, email, printing, older software</td>
              </tr>
              <tr>
                <td>PNG</td>
                <td>Largest for photos</td>
                <td>Yes</td>
                <td>Logos and graphics where WebP isn&apos;t accepted</td>
              </tr>
            </tbody>
          </table>
          <p>
            If you only need a JPG copy at the same size, the <Link href="/tools/webp-to-jpg">WebP to JPG converter</Link> is
            the shorter route. For a WebP that must fit under a KB limit, use{" "}
            <Link href="/tools/resize-image-to-kb">resize image to KB</Link>.
          </p>

          <h2>Sizing WebP images for websites</h2>
          <p>
            WebP exists to make web pages faster, and the biggest saving comes from not sending more pixels than a screen can
            show. A full-width banner rarely needs more than 1920 pixels; an image inside an article column is usually 800–1280
            pixels wide. Producing two or three widths and listing them in <code>srcset</code> lets phones download a fraction
            of the data. Use the <Link href="/tools/bulk-image-resizer">bulk image resizer</Link> when you have a whole set to
            prepare.
          </p>

          <h2>Supported files</h2>
          <p>
            Still WebP images, lossy or lossless, with or without transparency, up to 50 MB. Animated WebP files open but only
            their first frame is resized. For JPG photos the <Link href="/tools/resize-jpg">JPG resizer</Link> adds print DPI,
            and the <Link href="/tools/resize-png">PNG resizer</Link> can reduce colours.
          </p>

          <h2>Typical uses</h2>
          <ul>
            <li>
              <strong>Images downloaded from websites:</strong> resize and save as JPG so a form or editor accepts them.
            </li>
            <li>
              <strong>Website images:</strong> scale a large WebP export down to the column or banner width.
            </li>
            <li>
              <strong>Online shops:</strong> match the marketplace&apos;s square or portrait product size.
            </li>
            <li>
              <strong>Stickers and cut-outs:</strong> resize a transparent WebP and keep the background clear.
            </li>
          </ul>

          <PrivacyNote>
            <p>
              Your WebP image is decoded and re-encoded by your own browser. No copy is sent to a server, and nothing is kept
              once you leave the page.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <ImageResizerTool variant="webp" />
    </ToolPageShell>
  );
}
