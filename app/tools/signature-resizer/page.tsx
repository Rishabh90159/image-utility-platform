import type { Metadata } from "next";
import Link from "next/link";
import { SignatureResizerTool } from "@/components/tools/signature-resizer-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("signature-resizer");

const description =
  "Resize, crop and clean up a signature image for online forms. Whiten or remove the background, set exact pixels and a KB limit, and download JPG or PNG.";

export const metadata: Metadata = pageMetadata({
  title: "Signature Resizer – Resize Signature Image for Online Forms",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How do I reduce my signature to 20 KB?",
    answer:
      "Crop tightly around the signature, choose Clean white background, set the pixel size your form asks for, keep JPG and enter 20 as the maximum file size. A cleaned signature on a pure white background compresses very well, so small limits are usually easy to reach.",
  },
  {
    question: "What size should a signature image be?",
    answer:
      "It depends entirely on the form. Many application portals state a width and height in pixels (or in centimetres at a given DPI) and a file size range. Use exactly the numbers in the form's instructions; this tool doesn't assume a standard size.",
  },
  {
    question: "How do I make a signature background transparent?",
    answer:
      "Choose Transparent as the background. Paper and shadows become transparent and the ink is kept, with smooth edges. Transparent images must be PNG; use them for documents and designs. Most application forms want a white background instead.",
  },
  {
    question: "Parts of my signature disappeared. What should I do?",
    answer:
      "Move the clean-up strength slider to the left so lighter strokes are kept. If grey shadows remain, move it to the right. Signing with a dark pen on plain white paper in good light gives the cleanest result.",
  },
  {
    question: "Should I use JPG or PNG?",
    answer:
      "Use whatever the form asks for. JPG is the most widely accepted and can be squeezed to a KB limit. PNG keeps edges perfectly crisp and is needed for a transparent background.",
  },
  {
    question: "Is my signature uploaded?",
    answer:
      "No. Your signature is processed entirely in your browser and never leaves your device, which matters for something that can authorise documents.",
  },
];

export default function SignatureResizerPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Signature Resizer: Resize a Signature for Online Forms"
      intro={
        <p>
          Turn a phone photo or scan of your signature into a clean image that meets an online form&apos;s pixel and KB limits.
          Crop, whiten or remove the background, resize, and download JPG or PNG. Your signature never leaves your device.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to resize a signature</h2>
          <ol>
            <li>Sign on plain white paper with a dark pen, and photograph or scan it in good light.</li>
            <li>Add the image and drag the crop box tightly around the signature. Rotate if it&apos;s sideways.</li>
            <li>Choose Clean white to turn grey paper and shadows white, or Transparent for a PNG without background.</li>
            <li>Enter the width (and height, if the form fixes both) in pixels, and a maximum file size if there is one.</li>
            <li>Create the image, zoom in on the preview to check every stroke, and download.</li>
          </ol>

          <h2>Common places a signature image is needed</h2>
          <ul>
            <li>
              <strong>Online application forms</strong> for government services, licences and registrations.
            </li>
            <li>
              <strong>Exam and recruitment applications</strong>, which often ask for a photo and a signature with separate
              size limits.
            </li>
            <li>
              <strong>Job portals and onboarding</strong> documents.
            </li>
            <li>
              <strong>Document uploads</strong> and e-forms that place your signature on a page.
            </li>
          </ul>
          <p>
            Each of these sets its own rules, so check the instructions for dimensions, file type and minimum and maximum KB.
            Specific requirements aren&apos;t pre-filled here, because they differ between forms and change over time.
          </p>

          <h2>Why clean up the background?</h2>
          <p>
            A phone photo of paper is rarely white: it has grey tones, shadows and noise. That makes the signature look dirty
            and makes the file bigger, because the encoder has to store all that texture. The clean-up looks at each pixel&apos;s
            brightness: light pixels become pure white (or transparent) and dark ink is kept, with a soft transition so pen
            edges stay smooth. The result is clearer and often several times smaller.
          </p>

          <h2>Getting under a KB limit</h2>
          <ul>
            <li>Crop tightly: empty space still costs bytes.</li>
            <li>Use Clean white; flat white compresses extremely well.</li>
            <li>Use the pixel size the form asks for, not larger.</li>
            <li>
              The tool keeps your exact dimensions and lowers JPG quality only as much as needed. If the limit still
              can&apos;t be met, it tells you the smallest size it reached.
            </li>
          </ul>
          <p>
            Only need to hit a file size without cleanup? Use{" "}
            <Link href="/tools/resize-image-to-kb">resize image to KB</Link>. For general framing, try the{" "}
            <Link href="/tools/image-cropper">image cropper</Link>, or <Link href="/tools/image-compressor">compress the
            image</Link> to reduce its size while keeping dimensions. Applying with a photo too? The{" "}
            <Link href="/tools/passport-photo-resizer">passport photo resizer</Link> prepares that.
          </p>

          <PrivacyNote>
            <p>
              Your signature is processed by your own browser, never uploaded, and not stored anywhere. Close the page or
              select Reset and it&apos;s gone.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <SignatureResizerTool />
    </ToolPageShell>
  );
}
