import type { Metadata } from "next";
import Link from "next/link";
import { FormatConverterTool, type ConverterConfig } from "@/components/tools/format-converter-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("jpg-to-png");

const description =
  "Convert JPG and JPEG images to PNG online for free. Lossless PNG output with no extra compression, converted in your browser with no upload.";

export const metadata: Metadata = pageMetadata({
  title: "JPG to PNG Converter – Convert JPG to PNG Online Free",
  description,
  path: tool.path,
});

const config: ConverterConfig = {
  tool: "jpg-to-png",
  from: ["image/jpeg"],
  to: "image/png",
  reverse: { href: "/tools/png-to-jpg", label: "Convert PNG to JPG instead" },
};

const faqs: FaqItem[] = [
  {
    question: "Does converting JPG to PNG improve image quality?",
    answer:
      "No. JPG compression permanently removes some detail when the JPG is saved. Converting to PNG keeps the image exactly as it is now and prevents any further loss when you edit and re-save it, but it can't bring back detail that's already gone.",
  },
  {
    question: "Will the PNG have a transparent background?",
    answer:
      "No. JPG images have no transparency, so the converted PNG has the same solid background as the original. Removing a background is a separate editing step; once removed, PNG can store the transparency.",
  },
  {
    question: "Why is the PNG file bigger than the JPG?",
    answer:
      "PNG uses lossless compression, which stores every pixel exactly. Photos contain lots of subtle variation that lossless compression can't shrink much, so a photo as PNG is often several times larger than the same photo as JPG. That's normal.",
  },
  {
    question: "What's the difference between JPG and JPEG?",
    answer:
      "None. They are the same format; .jpg became common because older versions of Windows only allowed three-letter file extensions. This converter accepts both.",
  },
  {
    question: "Can I convert several JPGs at once?",
    answer:
      "This converter handles one image at a time: select the next image after downloading and it converts immediately. To convert a whole batch, the bulk image resizer can save many images as PNG in one go and download them as a ZIP.",
  },
  {
    question: "Is my image uploaded during conversion?",
    answer:
      "No. Your browser decodes the JPG and encodes the PNG locally on your device. The image is not uploaded or stored anywhere.",
  },
];

export default function JpgToPngPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="JPG to PNG Converter"
      intro={
        <p>
          Convert JPG and JPEG images to PNG in one step. The PNG keeps every pixel of your JPG exactly, with no further
          compression loss. Conversion happens in your browser, so your image is never uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to convert JPG to PNG</h2>
          <ol>
            <li>Choose, drop or paste a JPG or JPEG image.</li>
            <li>The image is converted to PNG automatically.</li>
            <li>Compare the original and converted file, then select <strong>Download PNG</strong>.</li>
          </ol>

          <h2>JPG vs PNG</h2>
          <table>
            <thead>
              <tr>
                <th scope="col"></th>
                <th scope="col">JPG / JPEG</th>
                <th scope="col">PNG</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Compression</th>
                <td>Lossy: smaller files, some detail discarded</td>
                <td>Lossless: every pixel kept exactly</td>
              </tr>
              <tr>
                <th scope="row">Transparency</th>
                <td>Not supported</td>
                <td>Supported</td>
              </tr>
              <tr>
                <th scope="row">Best for</th>
                <td>Photos</td>
                <td>Screenshots, graphics, logos, text, images you&apos;ll keep editing</td>
              </tr>
              <tr>
                <th scope="row">Typical file size for photos</th>
                <td>Small</td>
                <td>Often several times larger</td>
              </tr>
            </tbody>
          </table>

          <h2>When to convert JPG to PNG</h2>
          <ul>
            <li>
              <strong>Editing in several rounds:</strong> each JPG re-save loses a little more detail. Working in PNG stops
              that generational loss.
            </li>
            <li>
              <strong>Software or forms that require PNG:</strong> some design tools, app stores and upload forms only
              accept PNG.
            </li>
            <li>
              <strong>Preparing for transparency:</strong> if you plan to remove the background later, PNG can store the
              transparent areas; JPG can&apos;t.
            </li>
            <li>
              <strong>Graphics saved as JPG by mistake:</strong> converting keeps them from getting worse with further edits.
            </li>
          </ul>

          <h2>Transparency</h2>
          <p>
            Converting doesn&apos;t make any part of the image transparent. A JPG always has a solid background, and the PNG
            will look exactly the same. PNG simply makes transparency possible for later edits.
          </p>

          <h2>Quality and file size</h2>
          <p>
            The PNG is a pixel-perfect copy of the decoded JPG. It won&apos;t look sharper, and any JPG artefacts (blockiness or
            halos around edges) stay as they are. Because PNG stores every pixel without lossy compression, expect the file
            to be larger, often much larger for photos. If file size matters more than lossless editing, keep the JPG or{" "}
            <Link href="/tools/image-compressor">compress the image</Link> instead.
          </p>
          <p>
            Going the other way? <Link href="/tools/png-to-jpg">Convert PNG to JPG</Link> to get a smaller file from a PNG.
            Only need a .jpeg file renamed to .jpg? Use <Link href="/tools/jpeg-to-jpg">JPEG to JPG</Link>; to put JPGs in a
            document, <Link href="/tools/jpg-to-pdf">JPG to PDF</Link>.
          </p>

          <PrivacyNote>
            <p>
              The JPG is decoded and saved as PNG by your own browser. No copy of your image is sent to a server, and the
              converted file is created on your device.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <FormatConverterTool config={config} />
    </ToolPageShell>
  );
}
