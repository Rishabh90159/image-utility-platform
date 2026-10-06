import type { Metadata } from "next";
import Link from "next/link";
import { PngToSvgTool } from "@/components/tools/png-to-svg-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("png-to-svg");

const description =
  "Convert PNG logos, icons and simple graphics into true vector SVG using image tracing. Adjust colours, detail and background, then download your SVG.";

export const metadata: Metadata = pageMetadata({
  title: "PNG to SVG Converter – Trace PNG Images to Vector",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "Is the result a real vector SVG?",
    answer:
      "Yes. The output contains only vector <path> shapes traced from your image. It doesn't embed the PNG inside an SVG wrapper, which some converters do and which gives you none of the benefits of a vector file.",
  },
  {
    question: "Why doesn't my photo convert well?",
    answer:
      "Photos contain smooth gradients, texture and noise. Tracing turns every area of similar colour into a separate shape, so a photo becomes thousands of blotchy shapes and a very large file. Tracing works best for logos, icons, text, line art and flat illustrations with a few solid colours.",
  },
  {
    question: "How many colours should I choose?",
    answer:
      "About the number of distinct colours in your image. A two-colour logo traces cleanly with 2–3 colours; a flat illustration might need 8–16. Extra colours mostly capture anti-aliased edges and add paths without improving the result.",
  },
  {
    question: "When should I use black & white mode?",
    answer:
      "For signatures, stamps, line drawings, scanned text and one-colour logos. Move the threshold to decide which pixels count as black: higher values keep more of faint strokes, lower values remove grey smudges.",
  },
  {
    question: "Can I edit the SVG afterwards?",
    answer:
      "Yes. Open it in a vector editor such as Inkscape, Illustrator, Affinity Designer or Figma. Each colour is a single path you can recolour, and you can simplify or adjust the shapes.",
  },
  {
    question: "What resolution PNG works best?",
    answer:
      "A clean, reasonably large image: a logo 500–2000 pixels wide traces better than a tiny or blurry one. Low-resolution images have jagged edges that get traced as jagged shapes. The tool reduces very large images to a tracing size before processing.",
  },
  {
    question: "Is my image uploaded?",
    answer: "No. Tracing runs in a background thread in your browser. Your image never leaves your device.",
  },
];

export default function PngToSvgPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="PNG to SVG Converter: Trace Images into Vectors"
      intro={
        <p>
          Turn a PNG logo, icon or simple graphic into a scalable SVG made of real vector paths. Choose colour or black &amp;
          white tracing and the level of detail; it all runs in your browser.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to convert PNG to SVG</h2>
          <ol>
            <li>Choose or drop a PNG (JPG and WebP also work). It&apos;s traced right away with balanced settings.</li>
            <li>
              Pick <strong>Colour</strong> or <strong>Black &amp; white</strong>, then adjust the number of colours or the
              threshold.
            </li>
            <li>Choose the detail level, and remove the background colour if you want a transparent SVG.</li>
            <li>Compare the original and the traced SVG, then download.</li>
          </ol>

          <h2>Raster vs vector</h2>
          <p>
            A PNG is a <strong>raster</strong> image: a grid of coloured pixels with no idea of shapes. An SVG can describe{" "}
            <strong>vector</strong> shapes: outlines made from lines and curves that can be scaled to any size without
            blurring. You can&apos;t get from one to the other by changing the file extension; the shapes have to be
            reconstructed. That process is called <em>tracing</em> or <em>vectorization</em>.
          </p>

          <h2>How the tracing works</h2>
          <ol>
            <li>
              <strong>Colour reduction:</strong> the image is reduced to the number of colours you choose (or to black and
              white using your threshold). Fully transparent areas stay transparent.
            </li>
            <li>
              <strong>Region outlines:</strong> the edges of each colour region are found, and tiny specks are discarded.
            </li>
            <li>
              <strong>Curve fitting:</strong> each outline is approximated with straight lines and smooth curves. The detail
              level controls how closely the curves follow the pixels.
            </li>
            <li>
              <strong>SVG output:</strong> the shapes of each colour are written as one SVG path, at your image&apos;s original
              dimensions.
            </li>
          </ol>
          <p>
            The tracing engine is ImageTracer.js, an open-source (public domain) tracer that runs entirely in the browser.
          </p>

          <h2>Best use cases</h2>
          <ul>
            <li>
              <strong>Logos</strong> you only have as a PNG and need for print, signage or a website.
            </li>
            <li>
              <strong>Icons and simple illustrations</strong> with flat colours.
            </li>
            <li>
              <strong>Signatures, stamps and line art</strong>, using black &amp; white mode.
            </li>
            <li>
              <strong>Cutting machines and laser engravers</strong>, which need vector outlines.
            </li>
          </ul>
          <p>
            Gradients, shadows, textures and photographs don&apos;t trace cleanly. For photos, keep the original raster image,
            and use the <Link href="/tools/image-compressor">image compressor</Link> if you need it smaller.
          </p>

          <h2>Tips for a cleaner result</h2>
          <ul>
            <li>
              <Link href="/tools/image-cropper">Crop the image</Link> to just the logo first, so stray marks aren&apos;t
              traced.
            </li>
            <li>Start with fewer colours and the Balanced detail level, then add detail only if something is missing.</li>
            <li>Use the largest, sharpest version of the image you have.</li>
            <li>
              To check the result as a picture, render the SVG back to PNG with the{" "}
              <Link href="/tools/svg-to-png">SVG to PNG converter</Link>.
            </li>
          </ul>

          <PrivacyNote>
            <p>
              Tracing runs in a background thread inside your browser. Your image is never uploaded, and the SVG is created
              on your device.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <PngToSvgTool />
    </ToolPageShell>
  );
}
