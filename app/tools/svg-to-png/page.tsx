import type { Metadata } from "next";
import Link from "next/link";
import { SvgToPngTool } from "@/components/tools/svg-to-png-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("svg-to-png");

const description =
  "Convert SVG graphics to PNG online at any size. Choose exact pixel dimensions, keep a transparent background or add a colour, then download your PNG.";

export const metadata: Metadata = pageMetadata({
  title: "SVG to PNG Converter – Convert SVG to PNG at Any Size",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "What size should my PNG be?",
    answer:
      "Use the size it will be displayed at, multiplied by 2 for sharp results on high-density (Retina) screens. For example, a logo shown at 200 × 60 pixels on a website looks crisp as a 400 × 120 PNG. The quick-size buttons multiply the SVG's own size by 1–4.",
  },
  {
    question: "Will the PNG keep the transparent background?",
    answer:
      "Yes. Transparent areas of the SVG stay transparent in the PNG unless you choose a white or custom background colour.",
  },
  {
    question: "Why does my PNG look different from the SVG in my design app?",
    answer:
      "The PNG is rendered by your browser. Custom fonts that aren't embedded in the SVG, external images, and some editor-specific effects can't be used, so text may fall back to a different font. Convert text to outlines (paths) in your design tool before exporting the SVG for an exact match.",
  },
  {
    question: "Is it safe to open an SVG from someone else?",
    answer:
      "SVG files can contain scripts and links. This tool never inserts your SVG into the page: it removes scripts, event handlers, embedded HTML and external links, then renders it as an image, a mode in which browsers don't run scripts at all. Anything removed is listed.",
  },
  {
    question: "Can I convert PNG back to SVG?",
    answer:
      "Not by simply changing the format: a PNG has no shapes, only pixels. The PNG to SVG converter traces the pixels into vector paths, which works well for logos and icons but not for photos.",
  },
  {
    question: "Is my SVG uploaded?",
    answer: "No. Reading, cleaning and rendering the SVG all happen in your browser. The file never leaves your device.",
  },
];

export default function SvgToPngPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="SVG to PNG Converter"
      intro={
        <p>
          Turn an SVG logo, icon or illustration into a PNG at exactly the pixel size you need, with a transparent or solid
          background. Everything runs in your browser, and unsafe SVG content is stripped before rendering.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to convert SVG to PNG</h2>
          <ol>
            <li>Choose or drop an .svg file. It&apos;s checked, cleaned and converted at its own size right away.</li>
            <li>Set the output width and height, or use a quick size such as 2× or 4×.</li>
            <li>Keep the background transparent, or pick white or any colour.</li>
            <li>Convert and download the PNG.</li>
          </ol>

          <h2>Vector vs raster: why the size matters</h2>
          <p>
            An SVG is a <strong>vector</strong> image: it describes shapes, lines and curves mathematically, so it can be
            drawn sharply at any size. A PNG is a <strong>raster</strong> image: a fixed grid of pixels. Converting means
            choosing that grid once, so pick the largest size you&apos;ll need. Enlarging the PNG later makes it blurry, but you
            can always come back and render the SVG again at a bigger size.
          </p>

          <h2>Why convert SVG to PNG?</h2>
          <ul>
            <li>
              <strong>Apps that don&apos;t accept SVG:</strong> many social networks, email clients, office documents and
              marketplaces only take raster images.
            </li>
            <li>
              <strong>Consistent display:</strong> a PNG looks the same everywhere, while SVG rendering can vary slightly
              between programs.
            </li>
            <li>
              <strong>App icons and favicons</strong> often need PNGs at several exact sizes.
            </li>
            <li>
              <strong>Thumbnails and previews</strong> of vector artwork.
            </li>
          </ul>

          <h2>Getting the best quality</h2>
          <ul>
            <li>Render at the final display size, or 2× for high-resolution screens. Very large renders only add file size.</li>
            <li>
              Keep &ldquo;Maintain aspect ratio&rdquo; on. If you need a different shape, such as a square icon from a wide logo,
              choose &ldquo;Fit inside&rdquo; to add transparent space instead of stretching the artwork.
            </li>
            <li>Outline text in your design tool so the right font is used.</li>
            <li>
              The PNG can be large for big dimensions. <Link href="/tools/image-compressor">Compress the PNG</Link> to reduce
              colours and size, or <Link href="/tools/image-resizer">resize it</Link> later for smaller copies.
            </li>
          </ul>

          <h2>How unsafe SVG content is handled</h2>
          <p>
            Unlike a PNG, an SVG file is code. It can include JavaScript, event handlers like <code>onload</code>, embedded
            web pages and links to files on other servers. Before your SVG is displayed, the tool parses it without running
            anything, removes those elements and links, and blocks XML tricks that can freeze a browser. The cleaned SVG is
            then only shown through an image element, where browsers disable scripts entirely. If anything was removed,
            you&apos;ll see a short notice.
          </p>
          <p>
            Have a PNG logo you need as a vector? Try the <Link href="/tools/png-to-svg">PNG to SVG converter</Link>, which
            traces it into real paths.
          </p>

          <PrivacyNote>
            <p>
              Your SVG is read, cleaned and rendered to PNG by your own browser. Nothing is uploaded, and the site&apos;s
              security policy blocks requests to other servers, so even a hostile SVG can&apos;t call home.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <SvgToPngTool />
    </ToolPageShell>
  );
}
