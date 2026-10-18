import type { Metadata } from "next";
import Link from "next/link";
import { FormatConverterTool, type ConverterConfig } from "@/components/tools/format-converter-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("image-to-jpg");

const description =
  "Convert any image to JPG: PNG, WebP, HEIC, GIF, BMP or AVIF. Optionally keep the JPG under 20, 50, 100 or 200 KB for forms. Free, in your browser, no upload.";

export const metadata: Metadata = pageMetadata({
  title: "Image to JPG Converter – PNG, WebP, HEIC, AVIF to JPG",
  description,
  path: tool.path,
});

const config: ConverterConfig = {
  tool: "image-to-jpg",
  from: ["image/png", "image/webp", "image/heic", "image/gif", "image/bmp", "image/avif"],
  to: "image/jpeg",
  reverse: { href: "/tools/resize-image-to-kb", label: "Already a JPG? Make it smaller, such as 100 KB" },
  maxSizesKB: [20, 50, 100, 200, 500],
};

const faqs: FaqItem[] = [
  {
    question: "How do I convert an image to JPG?",
    answer:
      "Drop or choose the picture. It's converted straight away, whatever its format, and you can download the JPG. Change the quality or the background colour and convert again if you want a different result.",
  },
  {
    question: "Can I convert a photo to a JPG under 50 KB or 100 KB?",
    answer:
      "Yes. After adding the picture, choose a maximum file size and convert again. The tool picks the highest quality that fits and makes the picture smaller in pixels only if quality alone can't reach the limit, then shows the exact file size.",
  },
  {
    question: "Which formats can I convert?",
    answer:
      "PNG, WebP, iPhone HEIC and HEIF, GIF, BMP and AVIF. Your browser decodes BMP and AVIF itself, so a very old browser may not open AVIF; update it or try another browser. TIFF isn't supported.",
  },
  {
    question: "What happens to an animated GIF?",
    answer:
      "JPG holds a single picture, so only the first frame is converted. To change the size of an animated GIF and keep it moving, use the GIF resizer instead.",
  },
  {
    question: "What happens to transparent areas?",
    answer:
      "JPG can't store transparency, so transparent pixels are filled with a solid colour. White is the default; you can choose black or any other colour before converting.",
  },
  {
    question: "Is JPG the same as JPEG?",
    answer: "Yes. JPG and JPEG are two names for the same format. The converted file uses the .jpg extension, which every app and upload form accepts.",
  },
  {
    question: "Are my images uploaded?",
    answer: "No. The image is decoded and saved as a JPG by your browser, on your device. It isn't sent to Imgifyr or anywhere else.",
  },
];

export default function ImageToJpgPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Image to JPG Converter: Any Format to JPG"
      intro={
        <p>
          Turn a picture in almost any format into a JPG that every app, website and application form accepts. Need a small
          file? Set a limit such as 50 KB or 100 KB and the tool keeps the JPG under it. Nothing is uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to convert a picture to JPG</h2>
          <ol>
            <li>Choose or drop the image: PNG, WebP, HEIC, GIF, BMP or AVIF.</li>
            <li>Optionally pick a maximum file size, or adjust the quality.</li>
            <li>Download the JPG. Change a setting and convert again as often as you like.</li>
          </ol>

          <h2>Where these formats come from</h2>
          <ul>
            <li>
              <strong>WebP and AVIF</strong> are what many websites send to load faster, so pictures saved from a browser often
              arrive in one of them. Some apps and forms won&apos;t accept either.
            </li>
            <li>
              <strong>HEIC</strong> is the default photo format on iPhones. Dedicated help is on the{" "}
              <Link href="/tools/heic-to-jpg">HEIC to JPG</Link> page.
            </li>
            <li>
              <strong>PNG</strong> is common for screenshots and graphics. They often become much smaller as JPG; see{" "}
              <Link href="/tools/png-to-jpg">PNG to JPG</Link> for when that&apos;s a good idea.
            </li>
            <li>
              <strong>BMP</strong> files come from older Windows programs, some scanners and webcams. They&apos;re uncompressed,
              so the JPG is usually a fraction of the size.
            </li>
            <li>
              <strong>GIF</strong> is used for short animations and simple graphics; only the first frame becomes the JPG.
            </li>
          </ul>

          <h2>Converting for an upload form with a KB limit</h2>
          <p>
            Forms for exams, jobs and government services often accept only JPG and set a maximum size. Choosing a limit here
            does both in one step. If the form also needs exact pixel dimensions, set those first with the{" "}
            <Link href="/tools/image-resizer">image resizer</Link>, or use a dedicated page such as the{" "}
            <Link href="/tools/50kb-photo">50KB photo resizer</Link>. A form that sets a minimum size too needs the{" "}
            <Link href="/tools/image-size-increase">image size increaser</Link> if the JPG comes out too small.
          </p>

          <h2>Quality and file size</h2>
          <p>
            Without a size limit, the JPG is saved at 90% quality, which keeps photos and text sharp. Lower the quality for a
            smaller file, or use the <Link href="/tools/image-compressor">image compressor</Link> afterwards to shrink it
            without changing its dimensions. Converting a JPG to another format and back never restores lost detail, so keep
            your original.
          </p>

          <PrivacyNote>
            <p>Pictures are converted on your device. Photos of documents and IDs stay private because nothing is uploaded.</p>
          </PrivacyNote>
        </>
      }
    >
      <FormatConverterTool config={config} />
    </ToolPageShell>
  );
}
