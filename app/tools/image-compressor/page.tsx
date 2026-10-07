import type { Metadata } from "next";
import Link from "next/link";
import { ImageCompressorTool } from "@/components/tools/image-compressor-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("image-compressor");

const description =
  "Free image compressor for JPG, PNG and WebP. Reduce image file size without changing the dimensions, see exactly how much you saved, then download. No upload.";

export const metadata: Metadata = pageMetadata({
  title: "Image Compressor – Compress JPG, PNG & WebP Online",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "Is this image compression lossless?",
    answer:
      "Not by default. JPG and WebP compression is lossy: it discards fine detail that is hard to see. PNG compression reduces the number of colours, which is also lossy unless the image already has 256 colours or fewer. For PNGs you can choose Manual and Lossless, which keeps every pixel but usually saves only a little.",
  },
  {
    question: "Why is my compressed image not smaller?",
    answer:
      "Some images are already heavily compressed, for example photos saved by messaging apps or exported at low quality. Re-compressing those can't remove much more. The tool tells you when this happens so you can keep your original, lower the quality in Manual mode, convert to WebP, or reduce the dimensions.",
  },
  {
    question: "What quality setting should I use for JPG?",
    answer:
      "For most photos, 70–80% looks almost identical to the original at a fraction of the size. Automatic mode uses 75%. Go to 85–90% for images with text or fine patterns, and only go below 50% when file size matters much more than appearance.",
  },
  {
    question: "How do I compress an image to a specific size, like 100 KB?",
    answer:
      "Use the Resize Image to KB tool. Instead of a fixed quality, it searches for the highest quality that fits under your target and reduces dimensions only if quality alone isn't enough.",
  },
  {
    question: "Does compression change the image dimensions?",
    answer:
      "No. The compressor keeps the width and height exactly the same and only changes how the pixels are stored. To change dimensions, use the image resizer.",
  },
  {
    question: "How is PNG compressed?",
    answer:
      "PNG is a lossless format, so the only way to make a PNG much smaller is to store fewer distinct colours. The compressor picks the best palette of up to 256 colours for your image and uses light dithering so gradients stay smooth. Transparency is preserved.",
  },
  {
    question: "Are my images uploaded?",
    answer:
      "No. Compression runs in your browser on your own device. The image isn't sent to a server, and nothing is stored once you close the page.",
  },
];

export default function ImageCompressorPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Image Compressor – Reduce Image File Size Online"
      intro={
        <p>
          Make JPG, PNG and WebP images smaller without changing their dimensions. Use Automatic for a good balance or
          Manual to choose the quality yourself, then compare before and after. Your image is compressed in your browser,
          never uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to compress an image</h2>
          <ol>
            <li>Choose, drop or paste a JPG, PNG or WebP image. Automatic mode compresses it straight away.</li>
            <li>Check the result: the original size, the new size and the percentage saved are shown side by side.</li>
            <li>
              For more control, switch to <strong>Manual</strong> and adjust the quality (JPG and WebP) or the number of
              colours (PNG), or change the output format.
            </li>
            <li>Download the compressed image.</li>
          </ol>

          <h2>How Image Compression Works</h2>
          <p>
            A compressed image has the same width and height as before, but it&apos;s stored more efficiently. Lossy
            compression throws away detail your eyes are unlikely to notice, such as tiny colour variations in a sky. Lossless
            compression only finds a shorter way to write the same pixels. This compressor uses lossy settings by default
            because they save far more; the only fully lossless option is PNG with <strong>Lossless</strong> selected in
            Manual mode. Different formats get smaller in different ways, so the same setting doesn&apos;t behave identically
            for all of them.
          </p>

          <h2>Compress JPG and JPEG Images Online</h2>
          <p>
            JPG and JPEG are the same format, so there&apos;s nothing different to do for a .jpeg file.
          </p>
          <p>
            JPG compression is lossy. The quality setting controls how much fine detail is simplified: high settings keep
            images looking identical to the eye, while low settings produce visible blockiness, especially around edges and
            text. Re-saving a JPG that was already compressed gives smaller savings than compressing a camera original.
          </p>
          <h2>Compress PNG Images Online</h2>
          <p>
            PNG is lossless, so it can&apos;t simply be &ldquo;saved at lower quality&rdquo;. To shrink it, the compressor reduces the
            image to a palette of at most 256 carefully chosen colours (the same idea as tools like pngquant). Savings are
            usually largest for screenshots, graphics and illustrations. It is lossy, though often hard to notice.
            Choose <strong>Lossless</strong> in Manual mode to keep every pixel exactly, with smaller savings. If your PNG is
            actually a photo, it will shrink far more as a JPG: use <Link href="/tools/png-to-jpg">PNG to JPG</Link>. Going the
            other way, <Link href="/tools/jpg-to-png">JPG to PNG</Link> makes files bigger, not smaller; it&apos;s for
            editing without further loss.
          </p>
          <h3>WebP</h3>
          <p>
            WebP uses modern lossy compression and supports transparency. Converting a PNG photo to WebP is frequently the
            biggest single saving available. Nearly all current browsers display WebP, but some older software and upload
            forms still only accept JPG or PNG.
          </p>

          <h2>Features</h2>
          <ul>
            <li>Automatic mode with sensible defaults, or Manual mode with full control.</li>
            <li>Real colour-palette compression for PNG, with transparency preserved.</li>
            <li>Keep the original format or convert to JPG or WebP while compressing.</li>
            <li>Exact before and after sizes, with an honest warning when the result isn&apos;t smaller.</li>
            <li>Dimensions are never changed, and metadata such as GPS location is removed from the output.</li>
          </ul>

          <h2>Reduce Image Size Online</h2>
          <p>
            &ldquo;Image size&rdquo; can mean the file size in KB or MB, or the dimensions in pixels. This tool reduces the
            file size and leaves the dimensions alone. If a photo is several thousand pixels wide, reducing the dimensions
            with the <Link href="/tools/image-resizer">image resizer</Link> usually saves more than any quality setting, and
            the two work well together. Common reasons to compress:
          </p>
          <ul>
            <li>Speeding up a website: smaller images load faster, especially on mobile data.</li>
            <li>Fitting under an email or upload size limit.</li>
            <li>Saving storage when archiving many screenshots or scans.</li>
            <li>Sharing photos over slow connections.</li>
          </ul>

          <h2>Photo Size Reducer</h2>
          <p>
            Application portals, email services and websites often cap uploads at a fixed size. Automatic mode is a good first
            try for a photo; if the result is still above the limit, a target-size tool is quicker than adjusting quality by
            hand, because it tests settings until the file fits.
          </p>
          <h3>Using it as a JPG size reducer</h3>
          <p>
            For a JPG photo, Manual quality between 75% and 85% typically cuts the file substantially with little visible
            change. Below about 60%, blockiness starts to show around edges and text. When a form names an exact limit, go
            straight to <Link href="/tools/resize-image-to-kb">resize image to KB</Link>.
          </p>

          <h2>Tips for smaller files</h2>
          <ul>
            <li>
              Very large photos? <Link href="/tools/image-resizer">Resize the image</Link> to the size it will actually be
              displayed first; this usually saves more than any quality setting.
            </li>
            <li>
              Have a strict limit such as 50 KB or 100 KB?{" "}
              <Link href="/tools/resize-image-to-kb">Reduce an image to an exact KB size</Link> instead of guessing quality
              settings. For the most common limits there are one-step pages:{" "}
              <Link href="/tools/20kb-photo">compress to 20KB</Link>, <Link href="/tools/50kb-photo">50KB</Link>,{" "}
              <Link href="/tools/100kb-photo">100KB</Link> and <Link href="/tools/200kb-photo">200KB</Link>.
            </li>
            <li>
              Photos saved as PNG are often several times larger than needed.{" "}
              <Link href="/tools/png-to-jpg">Convert the PNG to JPG</Link> if you don&apos;t need transparency.
            </li>
            <li>Compress from the original whenever possible. Each lossy re-save loses a little more detail.</li>
          </ul>

          <PrivacyNote>
            <p>
              Compression happens on your device using your browser&apos;s own image encoders. Your image isn&apos;t uploaded,
              so even private or sensitive images never leave your computer or phone.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <ImageCompressorTool />
    </ToolPageShell>
  );
}
