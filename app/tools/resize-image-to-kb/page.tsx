import type { Metadata } from "next";
import Link from "next/link";
import { TargetSizeTool } from "@/components/tools/target-size-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("resize-image-to-kb");

const description =
  "Reduce an image to a target file size such as 20KB, 50KB, 100KB or 200KB for application forms and uploads, keeping the best possible quality. Free, no upload.";

export const metadata: Metadata = pageMetadata({
  title: "Resize Image to KB – 20KB, 50KB, 100KB, 200KB or Any Size",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How do I resize an image to 50 KB?",
    answer:
      "Select your image, choose 50 KB as the target size and select Resize. The tool finds the highest quality that keeps the file at or below 50 KB, shrinking the dimensions only if needed, and shows the exact result before you download it.",
  },
  {
    question: "Can every image be reduced to exactly 100 KB?",
    answer:
      "Not to the exact byte. Image encoders work in steps, so the result is the best file at or below your target, for example 96 KB for a 100 KB limit. That is what upload forms check. In rare cases, such as a very small target for a very detailed image with dimension changes turned off, the target can't be reached and the tool shows the closest achievable size instead.",
  },
  {
    question: "Why did the dimensions of my image change?",
    answer:
      "When even a reasonable quality setting can't fit your image under the target, the tool makes the image smaller instead of crushing its quality. A sharp 1200-pixel photo usually looks far better than a blocky full-size one. Turn off “Allow smaller dimensions” if your form needs the original dimensions.",
  },
  {
    question: "Will reducing an image to 20 KB make it look bad?",
    answer:
      "It depends on the image. A passport-style photo or a signature can look clear at 20 KB, while a detailed landscape photo will need to become quite small to fit. Check the preview before downloading; if it looks too soft, use a larger target if your form allows it, or crop away unneeded background first.",
  },
  {
    question: "Is 1 KB 1,000 or 1,024 bytes?",
    answer:
      "This tool uses 1 KB = 1,024 bytes, the same as Windows and most upload forms. A few systems count 1 KB as 1,000 bytes. If a form rejects your file, choose a slightly lower target, such as 48 KB for a 50 KB limit. The exact byte count is always shown with the result.",
  },
  {
    question: "My form needs both specific dimensions and a file size. What should I do?",
    answer:
      "First use the image resizer to set the exact width and height, then bring that resized image here and turn off “Allow smaller dimensions” so only the quality is adjusted to meet the size limit.",
  },
  {
    question: "Are my photos and documents uploaded?",
    answer:
      "No. The whole search for the right size runs in your browser on your device. Your ID photo, signature or document is never sent to a server.",
  },
];

export default function ResizeImageToKbPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Resize Image to KB: Reduce a Photo to 20KB, 50KB, 100KB or Any Size"
      intro={
        <p>
          Need a photo under 50 KB for an application form, or under 200 KB for a job portal? Pick a target size and the
          tool finds the highest quality that fits, adjusting dimensions only when it has to. It runs in your browser, so
          your image is never uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to resize an image to a specific file size</h2>
          <ol>
            <li>Choose, drop or paste your JPG, PNG or WebP image.</li>
            <li>
              Pick a target: 20 KB, 50 KB, 100 KB, 200 KB, 500 KB, or <strong>Custom</strong> for any size in KB or MB.
            </li>
            <li>
              Leave <strong>Allow smaller dimensions</strong> on unless your form requires exact pixel dimensions.
            </li>
            <li>Select <strong>Resize</strong>. The result shows the original size, target, final size and saving.</li>
            <li>Check the preview, then download.</li>
          </ol>

          <h2>How the tool reaches your target size</h2>
          <p>
            File size can&apos;t be set directly; it depends on the image content, its dimensions and the compression quality.
            So the tool searches for the best combination:
          </p>
          <ol>
            <li>It first tries your image at full size and high quality. If that already fits, you get the best possible result.</li>
            <li>
              Otherwise it searches quality levels at full size, down to a level that still looks good, to find the highest
              quality that stays under your target.
            </li>
            <li>
              If quality alone isn&apos;t enough, it reduces the dimensions step by step, keeping quality good, until the file
              fits. Then it raises the quality again to use as much of your size budget as possible.
            </li>
            <li>
              Every attempt is measured using the real encoded file, so the size you see is exactly the size you download.
            </li>
          </ol>
          <p>
            Read the <Link href="/methodology">methodology</Link> for the technical details.
          </p>

          <h2>Why an exact byte size isn&apos;t always possible</h2>
          <p>
            JPG and WebP files can only be produced at certain quality steps, and each step changes the size by a variable
            amount. That&apos;s why the goal is &ldquo;at or below&rdquo; your target, which is what upload forms check, rather than
            a precise byte count. If the target is extremely small and dimension changes are turned off, the tool reports
            the closest size it could achieve and explains why, instead of claiming success.
          </p>

          <h2>Dedicated pages for common sizes</h2>
          <p>
            This page handles any target. For the most common limits there are pages with the target preset and advice for
            that size: <Link href="/tools/20kb-photo">20KB photo</Link>, <Link href="/tools/50kb-photo">50KB photo</Link>,{" "}
            <Link href="/tools/100kb-photo">100KB photo</Link> and <Link href="/tools/200kb-photo">200KB photo</Link>. Preparing
            an exam or passport photo with a pixel size too? See the{" "}
            <Link href="/tools/passport-photo">passport photo requirements</Link> or exam pages such as{" "}
            <Link href="/tools/ibps-photo">IBPS photo</Link>.
          </p>

          <h2>Typical size limits</h2>
          <p>
            Requirements vary widely, so always check the exact rules of the form you&apos;re filling in. Common examples include:
          </p>
          <ul>
            <li>
              <strong>Photos and signatures on application forms:</strong> often small limits such as 20 KB, 50 KB or 100 KB,
              sometimes with a minimum size too.
            </li>
            <li>
              <strong>Document scans for portals:</strong> often 200 KB to 1 MB per file.
            </li>
            <li>
              <strong>Email and chat attachments:</strong> smaller images send faster, even when limits are generous.
            </li>
          </ul>

          <h2>Tips for the best quality at small sizes</h2>
          <ul>
            <li>Crop away empty background before reducing the size, so the size budget goes to what matters.</li>
            <li>Plain, evenly lit backgrounds compress much better than busy or noisy ones.</li>
            <li>
              If you need exact pixel dimensions, <Link href="/tools/image-resizer">resize the image to those dimensions</Link>{" "}
              first, then set the file size here with &ldquo;Allow smaller dimensions&rdquo; turned off.
            </li>
            <li>
              Just want a smaller file without a specific target? <Link href="/tools/image-compressor">Compress the image</Link>{" "}
              instead.
            </li>
            <li>If your form needs a minimum size as well as a maximum, choose a target near the top of the allowed range.</li>
          </ul>

          <PrivacyNote>
            <p>
              Images resized to a target size are often personal: ID photos, signatures and documents. Every step of the
              search runs in your browser on your own device, and nothing is uploaded or stored.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <TargetSizeTool readTargetFromUrl />
    </ToolPageShell>
  );
}
