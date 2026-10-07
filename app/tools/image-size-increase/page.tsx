import type { Metadata } from "next";
import Link from "next/link";
import { ImageSizeIncreaseTool } from "@/components/tools/image-size-increase-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("image-size-increase");

const description =
  "Increase image size in pixels, or increase the file size in KB to meet an upload minimum such as 20 KB, without changing how the picture looks. Free, in your browser.";

export const metadata: Metadata = pageMetadata({
  title: "Increase Image Size – In Pixels or in KB",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How do I increase an image's size in KB?",
    answer:
      "Choose File size (KB), enter the minimum the form asks for, and keep “Keep the picture, add padding”. The tool adds a block of comment data to the JPG that image viewers ignore, so the file reaches exactly the size you need while the picture stays pixel-for-pixel the same.",
  },
  {
    question: "Is adding padding safe? Will the form accept the file?",
    answer:
      "The result is a standard JPG; comment blocks are part of the JPEG format and every viewer and browser skips them. Upload forms check the file type and size, which both meet the requirement. If a form also states pixel dimensions, set those first with the image resizer.",
  },
  {
    question: "Does increasing the file size improve quality?",
    answer:
      "No. Padding adds bytes but not detail. The other method, higher quality and more pixels, re-saves the photo with less compression, which can remove a little of the blockiness of a heavily compressed file but can't restore detail that was lost.",
  },
  {
    question: "What's the difference between increasing dimensions and file size?",
    answer:
      "Dimensions are the width and height in pixels: what you change to make a picture bigger on screen or in print. File size is how many kilobytes the file takes up: what upload forms limit. Increasing dimensions also increases the file size, but you can increase the file size without touching the dimensions.",
  },
  {
    question: "How much can I enlarge an image?",
    answer:
      "Up to 32 megapixels and 16,384 pixels on a side. For big enlargements of small images, the image upscaler offers 2× and 4× with stronger sharpening.",
  },
  {
    question: "Why does my form say my photo is too small?",
    answer:
      "Some forms set a minimum file size, such as 10 KB or 20 KB, as well as a maximum. A small, simple image can fall below it. Use File size (KB) here to bring it above the minimum, and check you're still under the maximum.",
  },
  {
    question: "Is my image uploaded?",
    answer: "No. It's enlarged or padded by your browser, on your device.",
  },
];

export default function ImageSizeIncreasePage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Increase Image Size in Pixels or KB"
      intro={
        <p>
          Two different jobs, one tool: make the picture bigger in pixels, or make the file bigger in KB to pass an upload
          form&apos;s minimum size. Choose which one you need below; everything runs in your browser.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to increase image size</h2>
          <ol>
            <li>Add a JPG, PNG or WebP image.</li>
            <li>Choose <strong>Dimensions (pixels)</strong> or <strong>File size (KB)</strong>.</li>
            <li>For pixels, enter the new width or height, or pick 125–300%. For KB, enter the minimum size you need.</li>
            <li>Select the button, check the before and after sizes, and download.</li>
          </ol>

          <h2>Increasing dimensions</h2>
          <p>
            The image is enlarged with Lanczos-3 resampling, and light sharpening counteracts the softness that every
            enlargement causes. The aspect ratio is locked by default, so the picture isn&apos;t stretched. Expect a smoother
            image, not a more detailed one. For 2× and 4× enlargements with adjustable sharpening, use the{" "}
            <Link href="/tools/image-upscaler">image upscaler</Link>; to make an image smaller, use the{" "}
            <Link href="/tools/image-resizer">image resizer</Link>.
          </p>

          <h2>Increasing the file size in KB</h2>
          <p>
            Recruitment, exam and government forms often require files <em>between</em> two sizes, for example 20–50 KB. A
            small or plain image can come out below the minimum and get rejected even though it looks fine. Two methods are
            offered:
          </p>
          <ul>
            <li>
              <strong>Keep the picture, add padding</strong>: a comment block, which the JPEG standard allows and viewers
              ignore, is added until the file reaches your target exactly. A JPG keeps its original pixels; PNG and WebP
              images are first saved as a 92% JPG.
            </li>
            <li>
              <strong>Higher quality / more pixels</strong>: the photo is re-saved with less compression and, if needed,
              slightly larger dimensions. Use this if you&apos;d rather the extra size go into the image itself.
            </li>
          </ul>
          <p>
            If your file is too <em>big</em> instead, use <Link href="/tools/resize-image-to-kb">resize image to KB</Link>.
          </p>

          <h2>Tips</h2>
          <ul>
            <li>Check both limits: after increasing the size, the file must still be under the form&apos;s maximum.</li>
            <li>If the form also gives pixel dimensions, set those first, then raise the KB.</li>
            <li>
              Dull or soft photos may look better after the <Link href="/tools/image-quality-enhancer">image quality enhancer</Link>.
            </li>
          </ul>

          <PrivacyNote>
            <p>Your image is processed on your device and isn&apos;t uploaded.</p>
          </PrivacyNote>
        </>
      }
    >
      <ImageSizeIncreaseTool />
    </ToolPageShell>
  );
}
