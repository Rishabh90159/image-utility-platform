import type { Metadata } from "next";
import Link from "next/link";
import { FormatConverterTool, type ConverterConfig } from "@/components/tools/format-converter-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("webp-to-jpg");

const description =
  "Convert WebP images to JPG online for free. Turn pictures saved from websites into JPGs that any app or upload form accepts. Converted in your browser.";

export const metadata: Metadata = pageMetadata({
  title: "WebP to JPG Converter – Convert WebP to JPG Online",
  description,
  path: tool.path,
});

const config: ConverterConfig = {
  tool: "webp-to-jpg",
  from: ["image/webp"],
  to: "image/jpeg",
};

const faqs: FaqItem[] = [
  {
    question: "Why do images I save from websites end up as WebP?",
    answer:
      "Many websites serve pictures as WebP because it makes pages load faster. When you save one, you get the file exactly as the site sent it, so it keeps the .webp extension even if the page showed it like any other picture.",
  },
  {
    question: "Why convert WebP to JPG?",
    answer:
      "Some photo editors, older software, printing services and many application or government upload forms only accept JPG or PNG. A JPG opens almost everywhere, so converting removes that problem.",
  },
  {
    question: "Does converting WebP to JPG lose quality?",
    answer:
      "A little, because the picture is saved again with JPG compression. At the default 90% quality the difference is very hard to see. Converting can't restore detail the WebP had already lost, so the JPG looks the same as the WebP, not better.",
  },
  {
    question: "Why is the JPG bigger than the WebP?",
    answer:
      "WebP usually stores the same picture in fewer bytes than JPG, so the converted file is often larger. If you need it smaller, lower the quality slider, or use the image compressor or the resize to KB tool on the JPG.",
  },
  {
    question: "What happens to a transparent WebP?",
    answer:
      "JPG can't store transparency, so the converter asks for a background colour (white, black or custom) and blends transparent and soft edges onto it. If you need to keep the transparency, a PNG is the right format instead.",
  },
  {
    question: "Can I convert an animated WebP?",
    answer:
      "Only as a still picture. A JPG holds a single image, so the converter saves the first frame of the animation.",
  },
  {
    question: "Is my WebP uploaded?",
    answer: "No. Your browser decodes the WebP and creates the JPG on your device. The image isn't sent to a server.",
  },
];

export default function WebpToJpgPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="WebP to JPG Converter"
      intro={
        <p>
          Saved an image from a website and got a .webp file that your app or upload form won&apos;t accept? Convert it to a
          JPG here. Pick a background for transparent areas, set the quality and download. The conversion runs in your
          browser.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to convert WebP to JPG</h2>
          <ol>
            <li>Choose, drop or paste a WebP image. It&apos;s converted to JPG straight away at 90% quality.</li>
            <li>If the WebP has transparent areas, choose the background colour the JPG should use.</li>
            <li>Lower the quality if you want a smaller file, and compare the before and after sizes.</li>
            <li>Download the JPG.</li>
          </ol>

          <h2>What WebP is, and why it causes problems</h2>
          <p>
            WebP is an image format created by Google for the web. It can be lossy like JPG or lossless like PNG, it supports
            transparency, and it can even hold an animation. Browsers display it without any trouble, which is why so many
            websites use it. Outside the browser, support is patchier: some editors, print shops, document tools and most
            exam and job application portals still ask for JPG or PNG.
          </p>

          <h2>WebP vs JPG</h2>
          <ul>
            <li>
              <strong>Compatibility:</strong> JPG is accepted almost everywhere; WebP is accepted by browsers and newer apps.
            </li>
            <li>
              <strong>File size:</strong> WebP is usually smaller for the same visual quality, so expect the JPG to be larger.
            </li>
            <li>
              <strong>Transparency:</strong> WebP can be transparent; JPG can&apos;t, so a background colour is added.
            </li>
            <li>
              <strong>Animation:</strong> WebP can be animated; a JPG is always a single still picture.
            </li>
          </ul>

          <h2>After converting</h2>
          <p>
            Upload forms often combine a JPG requirement with a size limit. If the JPG is too big, use{" "}
            <Link href="/tools/resize-image-to-kb">resize image to KB</Link> to reach a limit such as 50 KB or 100 KB, or the{" "}
            <Link href="/tools/image-resizer">image resizer</Link> to change its dimensions. The resize to KB tool also accepts
            WebP directly and outputs a JPG, so you can do both in one step. Only need a smaller file and want to keep transparency? The{" "}
            <Link href="/tools/image-compressor">image compressor</Link> can shrink it and keep it as a WebP. Have PNG
            files to change too? The <Link href="/tools/png-to-jpg">PNG to JPG converter</Link> works the same way.
          </p>

          <PrivacyNote>
            <p>
              The WebP is decoded and saved as a JPG by your own browser. It isn&apos;t uploaded, and nothing is kept after you
              close the page. As with our other converters, the JPG contains only the picture, not the original file&apos;s
              metadata.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <FormatConverterTool config={config} />
    </ToolPageShell>
  );
}
