import type { Metadata } from "next";
import Link from "next/link";
import { ImageResizerTool } from "@/components/tools/image-resizer-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("resize-png");

const description =
  "Resize PNG images by pixels or percentage and keep the transparent background. Optional colour reduction makes the PNG far smaller. Free, runs in your browser.";

export const metadata: Metadata = pageMetadata({
  title: "Resize PNG Online – Keep Transparency, Shrink File Size",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "Will my PNG keep its transparent background?",
    answer:
      "Yes. The result is always a PNG, and transparent and semi-transparent pixels are kept. Edges are scaled with premultiplied alpha, which avoids the dark or white fringe that some resizers leave around cut-out logos.",
  },
  {
    question: "Why is my resized PNG still large?",
    answer:
      "PNG is lossless: it stores every pixel exactly, so a photo saved as PNG stays big even after resizing. Turn on “Reduce colours” to store the image with a palette of up to 256 colours, which is often 50–80% smaller. For photos without transparency, converting PNG to JPG gives the smallest file.",
  },
  {
    question: "How many colours should I keep?",
    answer:
      "256 looks identical to the original for almost every logo, icon, chart and screenshot. 128 or 64 are usually fine for flat graphics with few colours. 32 suits simple icons. If a photo or gradient shows bands, keep 256 and leave dithering on.",
  },
  {
    question: "What is dithering?",
    answer:
      "When colours are reduced, dithering mixes neighbouring pixels of the remaining colours so that smooth gradients still look smooth instead of turning into visible stripes. Turn it off for flat artwork with sharp edges, where it can add a faint speckle.",
  },
  {
    question: "How do I make @2x images for a website?",
    answer:
      "Export or keep the large version as your @2x file, then resize a copy to exactly 50% here for the @1x version. Percentage mode does this in one step and keeps the proportions exact.",
  },
  {
    question: "Can I resize a JPG or WebP on this page?",
    answer:
      "This page is for PNG files. The image resizer accepts JPG, PNG, WebP and HEIC, and the JPG and WebP resizers have settings specific to those formats.",
  },
];

export default function ResizePngPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Resize PNG Images Without Losing Transparency"
      intro={
        <p>
          Change the size of a PNG logo, icon, screenshot or cut-out and keep its transparent background. If the file needs
          to be lighter too, reduce it to a palette of colours in the same step. Everything happens on your device.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to resize a PNG</h2>
          <ol>
            <li>Choose, drop or paste a .png file.</li>
            <li>
              Set the new width or height in pixels, or use <strong>Percentage</strong>. 50% is the quick way to turn an
              @2x graphic into @1x.
            </li>
            <li>
              For a smaller file, tick <strong>Reduce colours</strong> and pick how many colours to keep.
            </li>
            <li>
              Select <strong>Resize PNG</strong>, check the transparent areas on the checkerboard preview, then download.
            </li>
          </ol>

          <h2>Features for PNG files</h2>
          <ul>
            <li>Output is always PNG, with full transparency (alpha channel) preserved.</li>
            <li>Clean edges on cut-outs thanks to alpha-aware scaling.</li>
            <li>Optional colour reduction to 256, 128, 64 or 32 colours, with or without dithering.</li>
            <li>A lossless shortcut: if the image already uses few enough colours, they are kept exactly.</li>
            <li>Common widths and popular sizes for app icons, banners, link previews and screens.</li>
          </ul>

          <h2>Why PNG files stay big, and how colour reduction helps</h2>
          <p>
            A PNG keeps every pixel exactly as it was, which is perfect for sharp text and flat colours but expensive for
            anything with millions of shades. Resizing removes pixels, so the file shrinks, but a full-colour PNG can still be
            several times bigger than a JPG of the same size.
          </p>
          <p>
            Colour reduction rebuilds the image with a palette, the same idea as tools like pngquant. Instead of storing a full
            colour for every pixel, the file stores up to 256 colours once and a short reference per pixel.
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Colours</th>
                <th scope="col">Good for</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>256</td>
                <td>Screenshots, charts, detailed logos, UI images. Usually indistinguishable from the original.</td>
              </tr>
              <tr>
                <td>128 / 64</td>
                <td>Flat illustrations, diagrams and logos with a handful of brand colours.</td>
              </tr>
              <tr>
                <td>32</td>
                <td>Simple icons and line art.</td>
              </tr>
            </tbody>
          </table>
          <p>
            If the PNG is really a photo with no transparency, it will always be smaller as a JPG:{" "}
            <Link href="/tools/png-to-jpg">convert the PNG to JPG</Link> with a background colour of your choice. To shrink a
            PNG without changing its dimensions at all, use the <Link href="/tools/image-compressor">image compressor</Link>.
          </p>

          <h2>Supported files</h2>
          <p>
            PNG images up to 50 MB and 100 megapixels, including 8-bit palette PNGs and PNGs with an alpha channel. For other
            formats, the <Link href="/tools/image-resizer">image resizer</Link> handles JPG, WebP and HEIC, and the{" "}
            <Link href="/tools/resize-gif">GIF resizer</Link> keeps animations moving.
          </p>

          <h2>When to resize a PNG</h2>
          <ul>
            <li>
              <strong>Logos for websites and documents:</strong> a 4000 px export is rarely needed; 400–800 px is typical.
            </li>
            <li>
              <strong>App and favicon artwork:</strong> scale a master icon down to the sizes a store or browser asks for.
            </li>
            <li>
              <strong>Screenshots for guides and support tickets:</strong> shrink them so text stays readable but pages load fast.
            </li>
            <li>
              <strong>Product cut-outs:</strong> after you <Link href="/tools/background-remover">remove the background</Link>,
              resize the transparent PNG to your shop&apos;s image size.
            </li>
            <li>
              <strong>Vector-style artwork:</strong> for logos that need to scale to any size, trace the PNG with{" "}
              <Link href="/tools/png-to-svg">PNG to SVG</Link> instead.
            </li>
          </ul>

          <PrivacyNote>
            <p>
              The PNG is read, scaled and, if you choose, reduced to a palette inside your browser. No part of it is uploaded,
              and closing the tab discards everything.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <ImageResizerTool variant="png" />
    </ToolPageShell>
  );
}
