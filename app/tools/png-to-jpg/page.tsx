import type { Metadata } from "next";
import Link from "next/link";
import { FormatConverterTool, type ConverterConfig } from "@/components/tools/format-converter-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("png-to-jpg");

const description =
  "Convert PNG images to JPG online for free. Choose a background colour for transparent areas, set the JPG quality and download a smaller file. No upload.";

export const metadata: Metadata = pageMetadata({
  title: "PNG to JPG Converter – Convert PNG to JPG Online Free",
  description,
  path: tool.path,
});

const config: ConverterConfig = {
  tool: "png-to-jpg",
  from: ["image/png"],
  to: "image/jpeg",
  reverse: { href: "/tools/jpg-to-png", label: "Convert JPG to PNG instead" },
};

const faqs: FaqItem[] = [
  {
    question: "What happens to transparent areas when converting PNG to JPG?",
    answer:
      "JPG has no transparency, so transparent pixels must be filled with a solid colour. The converter detects transparency and lets you choose white, black or any custom colour. Semi-transparent edges are blended onto that colour so they stay smooth.",
  },
  {
    question: "Why did my transparent PNG get a black background elsewhere?",
    answer:
      "Some converters drop the transparency information, and the hidden colour behind it, often black, shows through. This converter always fills transparent areas with the background colour you choose, white by default.",
  },
  {
    question: "What JPG quality should I choose?",
    answer:
      "The default of 90% keeps photos and most graphics looking crisp. 75–85% gives noticeably smaller files with little visible difference for photos. Keep it at 90% or higher for images containing text.",
  },
  {
    question: "Will converting PNG to JPG reduce quality?",
    answer:
      "Slightly. JPG uses lossy compression, so some fine detail is simplified. For photos this is usually invisible at high quality settings. Sharp text, line art and flat-colour graphics show JPG artefacts more easily, so those are often better left as PNG.",
  },
  {
    question: "Is PNG to JPEG the same as PNG to JPG?",
    answer: "Yes. JPG and JPEG are two names for the same format. The converted file uses the .jpg extension, which is accepted wherever JPEG is.",
  },
  {
    question: "Are my PNG files uploaded?",
    answer:
      "No. The conversion runs in your browser on your device. Your PNG isn't sent to a server and isn't stored after you leave the page.",
  },
];

export default function PngToJpgPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="PNG to JPG Converter"
      intro={
        <p>
          Convert PNG images to JPG to get smaller files that work everywhere. Pick a background colour for any transparent
          areas and set the JPG quality. Conversion runs in your browser, so your image is never uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to convert PNG to JPG</h2>
          <ol>
            <li>Choose, drop or paste a PNG image. It&apos;s converted to JPG right away using sensible defaults.</li>
            <li>If the PNG has transparent areas, choose a background colour: white, black or a custom colour.</li>
            <li>Adjust the JPG quality if you want a smaller file, then convert again.</li>
            <li>Download the JPG.</li>
          </ol>

          <h2>Transparency and background colour</h2>
          <p>
            PNG can store transparent and semi-transparent pixels; JPG can&apos;t. When a PNG with transparency becomes a JPG,
            every transparent pixel has to be given a solid colour. The converter checks your image for transparency and,
            if it finds any, asks which background to use:
          </p>
          <ul>
            <li>
              <strong>White</strong> suits documents, product photos and most websites.
            </li>
            <li>
              <strong>Black</strong> suits dark designs and presentations.
            </li>
            <li>
              <strong>Custom</strong> lets you match the page or slide where the image will appear.
            </li>
          </ul>
          <p>
            Soft edges, such as anti-aliased text or shadows, are blended onto the chosen colour, so they stay smooth instead
            of turning jagged.
          </p>

          <h2>When to convert PNG to JPG</h2>
          <ul>
            <li>
              <strong>Photos saved as PNG:</strong> converting can make the file several times smaller with no visible
              difference.
            </li>
            <li>
              <strong>Upload forms that only accept JPG:</strong> many application and government portals require JPG.
            </li>
            <li>
              <strong>Email and messaging:</strong> smaller JPGs send faster and fit attachment limits.
            </li>
          </ul>
          <p>
            Keep PNG for screenshots with small text, logos, and anything that must stay transparent. If you need a smaller
            transparent image, <Link href="/tools/image-compressor">compress the PNG</Link> instead. To keep editing a JPG
            without further loss, you can <Link href="/tools/jpg-to-png">convert JPG to PNG</Link>.
          </p>

          <h2>File size and quality</h2>
          <p>
            For photographs, JPG at 80–90% quality is typically much smaller than PNG and looks the same at normal viewing
            sizes. For flat graphics, the saving is smaller and JPG artefacts are easier to spot around sharp edges, so check
            the preview. If you have a strict size limit, use{" "}
            <Link href="/tools/resize-image-to-kb">resize an image to a target size in KB</Link>, which accepts PNG files and
            produces a JPG under your limit.
          </p>

          <PrivacyNote>
            <p>
              Your PNG is read and converted to JPG by your own browser. It never leaves your device, and the JPG you
              download is created locally.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <FormatConverterTool config={config} />
    </ToolPageShell>
  );
}
