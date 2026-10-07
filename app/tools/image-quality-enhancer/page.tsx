import type { Metadata } from "next";
import Link from "next/link";
import { ImageQualityEnhancerTool } from "@/components/tools/image-quality-enhancer-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("image-quality-enhancer");

const description =
  "Enhance image quality in your browser: auto levels, brightness, contrast, colour, clarity and sharpening, with a live before-and-after preview. Free, no upload.";

export const metadata: Metadata = pageMetadata({
  title: "Image Quality Enhancer – Improve Photo Quality Online",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "What does the image quality enhancer do?",
    answer:
      "It applies classic photo corrections: auto levels to fix flat or faded tones, brightness and contrast, saturation and warmth for colour, clarity for mid-tone detail, and sharpening for crisper edges. Auto enhance sets a balanced starting point that you can adjust.",
  },
  {
    question: "Is this an AI photo enhancer?",
    answer:
      "No. Every adjustment is a standard image-processing operation that you control with a slider, and nothing is generated or invented. That makes the result predictable and keeps your photo on your device, but it can't rebuild faces or detail the way AI restoration tools try to.",
  },
  {
    question: "Can it fix a blurry photo?",
    answer:
      "It can make a slightly soft photo look crisper with Sharpen and Clarity. It can't fix strong motion blur or a photo that's badly out of focus: the detail was never captured.",
  },
  {
    question: "What are good settings to start with?",
    answer:
      "Start with Auto enhance. For dark indoor photos, raise Brightness to +20–40. For hazy landscapes, keep Auto levels on and add Clarity. For portraits, keep Clarity and Sharpen moderate (under about 40) so skin doesn't look harsh.",
  },
  {
    question: "Does enhancing make the file bigger?",
    answer:
      "Often slightly, because sharper and more contrasty images contain more detail to store. The dimensions stay the same. If you need a smaller file afterwards, use the image compressor.",
  },
  {
    question: "Is enhancement the same as upscaling?",
    answer:
      "No. Enhancement improves how the existing pixels look; upscaling adds pixels to make the image bigger. If you need both, enhance first, then upscale.",
  },
  {
    question: "Are my photos uploaded?",
    answer: "No. The preview and the final image are both processed by your browser.",
  },
];

export default function ImageQualityEnhancerPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Image Quality Enhancer"
      intro={
        <p>
          Improve dull, dark, hazy or slightly soft photos. Start with Auto enhance, fine-tune brightness, contrast, colour,
          clarity and sharpness, and compare before and after as you go. Processing happens in your browser.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to enhance a photo</h2>
          <ol>
            <li>Add a JPG, PNG, WebP or HEIC photo. Auto enhance is applied to the preview straight away.</li>
            <li>Drag the divider on the preview to compare, and adjust any slider.</li>
            <li>Select <strong>Create full-size image</strong>, then download.</li>
          </ol>

          <h2>What each adjustment fixes</h2>
          <ul>
            <li>
              <strong>Auto levels</strong>: photos that look grey, hazy or faded, by stretching the tones to use the full
              range from black to white.
            </li>
            <li>
              <strong>Brightness and contrast</strong>: under- or over-exposed photos and flat lighting.
            </li>
            <li>
              <strong>Saturation and warmth</strong>: washed-out colours and blue or orange casts from indoor lighting.
            </li>
            <li>
              <strong>Clarity</strong>: texture and depth in landscapes, buildings and products, using local contrast.
            </li>
            <li>
              <strong>Sharpen</strong>: slightly soft photos, using an unsharp mask on brightness only so colours don&apos;t
              fringe.
            </li>
          </ul>

          <h2>What enhancement can&apos;t fix</h2>
          <ul>
            <li>Strong blur from camera shake or missed focus.</li>
            <li>Heavy noise in very dark photos; sharpening makes it more visible, so keep Sharpen low on these.</li>
            <li>Blocky artefacts in images that were compressed many times.</li>
            <li>Missing resolution: for that, enlarge with the <Link href="/tools/image-upscaler">image upscaler</Link>.</li>
          </ul>

          <h2>Recommended settings</h2>
          <ul>
            <li>Everyday phone photos: Auto enhance as it is.</li>
            <li>Documents photographed under a lamp: Auto levels, Contrast +30, Warmth −20, Sharpen 40.</li>
            <li>Product photos: Auto levels, Clarity 30–50, Sharpen 30.</li>
            <li>Portraits: Auto levels, Saturation +5, Clarity under 20, Sharpen under 30.</li>
          </ul>

          <h2>Formats and output</h2>
          <p>
            Input: JPG, PNG, WebP and HEIC. The result keeps the original format (HEIC becomes JPG) and the same dimensions. For
            a smaller file afterwards, use the <Link href="/tools/image-compressor">image compressor</Link>; to change
            dimensions, the <Link href="/tools/image-resizer">image resizer</Link>.
          </p>

          <PrivacyNote>
            <p>All adjustments run on your device. Your photos aren&apos;t uploaded.</p>
          </PrivacyNote>
        </>
      }
    >
      <ImageQualityEnhancerTool />
    </ToolPageShell>
  );
}
