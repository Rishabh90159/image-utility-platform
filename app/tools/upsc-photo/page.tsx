import type { Metadata } from "next";
import Link from "next/link";
import { RequirementSummary } from "@/components/requirements/requirement-summary";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { RequirementPhotoTool } from "@/components/tools/requirement-photo-tool";
import { APPLICATIONS } from "@/lib/requirements/applications";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("upsc-photo");
const app = APPLICATIONS.upsc;

const description =
  "Crop and resize your photo and signature for a UPSC application using the pixel and KB limits in your UPSC instructions. Shows where to find them. No upload.";

export const metadata: Metadata = pageMetadata({
  title: "UPSC Photo Resizer – Prepare Your UPSC Photo & Signature",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "What is the current UPSC photo requirement?",
    answer:
      "UPSC's Civil Services Examination 2026 notice asks candidates to upload a photograph and also capture a live photograph while filling in the Common Application Form, following the instructions under “Instructions and FAQs > Instruction for filling the form > Photos and Signature” on upsconline.nic.in. Those instructions contain the pixel and file-size limits.",
  },
  {
    question: "Why doesn't this page show UPSC's photo size?",
    answer:
      "Because we couldn't verify the current values. The public UPSC documents we checked give different pixel limits from each other, and the current instructions are inside the application portal. Rather than guess, the tool lets you enter the numbers you see in your own instructions.",
  },
  {
    question: "Can I resize my UPSC photo online?",
    answer:
      "Yes. Choose “Other – enter the requirement from my notification”, type the width, height and KB limits from the UPSC instructions, add your photo, crop and download. Processing happens in your browser.",
  },
  {
    question: "What happens if the photo is rejected?",
    answer:
      "Rule 19 of the CSE 2026 rules lists uploading an irrelevant or incorrect photo or signature among the grounds for disciplinary action. Make sure the photo is genuinely yours, recent, clear and matches your appearance and the live photo you capture.",
  },
  {
    question: "Where can I verify the official UPSC requirement?",
    answer:
      "On upsconline.nic.in, under Instructions and FAQs, and in the examination notice on upsc.gov.in. Both links are on this page.",
  },
];

export default function UpscPhotoPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="UPSC Photo Resizer"
      intro={
        <p>
          Prepare your photograph and signature for a UPSC online application. Because UPSC publishes its current photo
          limits inside its application portal, enter the numbers from your instructions and the tool applies them exactly. Not
          affiliated with UPSC.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to prepare a UPSC photo</h2>
          <ol>
            <li>
              Open the UPSC instructions for photos and signature (link above) and note the minimum and maximum pixel size and
              the file size range.
            </li>
            <li>In the tool, choose whether you&apos;re preparing the photograph or the signature.</li>
            <li>Enter the width and height in pixels and the KB limits exactly as written. Leave anything that isn&apos;t specified empty.</li>
            <li>Add your photo, frame your face with the crop box, and create the file.</li>
            <li>Check the requirement checklist under the result, then download the JPG.</li>
          </ol>

          <h2>What the CSE 2026 notice says</h2>
          <ul>
            <li>You upload a photograph and also capture a live photograph while filling in the Common Application Form.</li>
            <li>
              Both should be clear, following the &ldquo;Photos and Signature&rdquo; instructions on the Commission&apos;s
              online portal.
            </li>
            <li>
              Uploading an irrelevant or incorrect photo or signature in place of your actual one is listed in Rule 19 of the CSE
              2026 rules among the grounds for disciplinary action.
            </li>
          </ul>

          <h2>Common mistakes</h2>
          <ul>
            <li>
              <strong>Using numbers from an old year or a coaching site.</strong> UPSC&apos;s own documents have differed over
              time. Use the instructions for your current application.
            </li>
            <li>
              <strong>Mixing up width and height.</strong> Portals usually write width × height. A photo should be taller than
              wide unless the instructions say square.
            </li>
            <li>
              <strong>Face too small.</strong> Crop to head and shoulders so your face is clearly visible.
            </li>
            <li>
              <strong>A photo that doesn&apos;t match the live capture.</strong> Use a recent photo that looks like you today.
            </li>
          </ul>

          <h2>Tips</h2>
          <ul>
            <li>Take the photo against a plain, light wall in daylight; it&apos;s clearer and compresses better.</li>
            <li>
              For the signature, sign on white paper with a dark pen. The tool can whiten the paper; the{" "}
              <Link href="/tools/signature-resizer">signature resizer</Link> has more options.
            </li>
            <li>
              If the instructions give only a file size, use <Link href="/tools/resize-image-to-kb">resize image to KB</Link>;
              for framing, the <Link href="/tools/image-cropper">image cropper</Link>.
            </li>
          </ul>

          <h2>How we keep this page accurate</h2>
          <p>
            We only show requirement values that we can confirm in a current official UPSC document. When we can verify the
            current instructions, we&apos;ll add them here with the source and date. Until then this page tells you where to
            look, and doesn&apos;t guess. See <Link href="/methodology">how the tools work</Link>.
          </p>

          <PrivacyNote>
            <p>
              The photo and signature you prepare for UPSC never leave your device: cropping, resizing and compression all run
              locally in your browser, and nothing is stored.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <div className="space-y-6">
        <RequirementSummary heading="UPSC photo requirements" app={app} />
        <RequirementPhotoTool tool="upsc-photo" sets={app.sets} setLabel="Requirement" appName="UPSC" />
      </div>
    </ToolPageShell>
  );
}
