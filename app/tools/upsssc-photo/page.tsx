import type { Metadata } from "next";
import Link from "next/link";
import { RequirementSummary } from "@/components/requirements/requirement-summary";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { RequirementPhotoTool } from "@/components/tools/requirement-photo-tool";
import { APPLICATIONS } from "@/lib/requirements/applications";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("upsssc-photo");
const app = APPLICATIONS.upsssc;

const description =
  "UPSSSC One Time Registration asks for a 50–100 KB photo and a 30–50 KB signature with your name in Hindi below it. Make both JPGs here, free.";

export const metadata: Metadata = pageMetadata({
  title: "UPSSSC Photo & Signature Size – OTR Photo Resizer",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "What is the UPSSSC photo size?",
    answer:
      "The commission's OTR notice of 14 July 2026 asks for a recent colour photograph, taken within the last six months, as a JPEG/JPG between 50 KB and 100 KB. It doesn't set pixel dimensions, so any clear passport-style crop works as long as the file size is right.",
  },
  {
    question: "What is the UPSSSC signature size?",
    answer:
      "A JPEG/JPG between 30 KB and 50 KB. You can sign in Hindi or English, but you must also write your name in Hindi in your own handwriting below the signature, and a signature in English capital letters is invalid. Crop the image so both the signature and your name are inside it.",
  },
  {
    question: "Do I need to upload a new photo for the Inter Level or other mains applications?",
    answer:
      "Not for the Inter (12th) Level exam under advertisement 26-Exam/2026: the photo and signature you uploaded for PET-2025 are shown automatically and can't be changed there. New photos are uploaded in the One Time Registration, which the commission has made compulsory for PET and every later exam.",
  },
  {
    question: "Can I change my OTR photo later?",
    answer:
      "The OTR launch notice says details can't be modified once the OTR number is issued, but a later notice of 31 July 2026 allows changes through “Modify OTR Form Details” on upsssc.gov.in. The mobile number can't be changed, and if you registered with your PET-2025 registration number, your name and date of birth can't either. Make any change before registering for the next PET.",
  },
  {
    question: "What pixel size should the UPSSSC photo be?",
    answer:
      "None is stated, only the file size. If the file comes out below 50 KB, enlarge it with the image size increaser rather than adding blur or borders; if it is above 100 KB, this tool reduces it.",
  },
  {
    question: "Where can I check the official UPSSSC requirement?",
    answer:
      "In the commission's OTR notice (No. 45, dated 14 July 2026, points 8 and 9), on upsssc.gov.in under notifications. The link on this page goes to that notice, which is in Hindi, and shows when we last read it.",
  },
];

export default function UpssscPhotoPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="UPSSSC OTR Photo and Signature Size"
      intro={
        <p>
          Every UPSSSC exam now starts with One Time Registration, and that is where your photo and signature are uploaded.
          Here are the limits from the commission&apos;s own notice, and a tool that makes both files to match. Not affiliated
          with the Uttar Pradesh Subordinate Services Selection Commission.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>Preparing the OTR photograph</h2>
          <ol>
            <li>Use a colour photo taken within the last six months, with your face clearly lit and looking at the camera.</li>
            <li>
              Pick <strong>Photograph</strong> in the tool, add the picture and crop from just above the head to the shoulders.
            </li>
            <li>
              Select <strong>Create photo file</strong> and check the result is between 50 KB and 100 KB, JPG.
            </li>
          </ol>

          <h2>The signature with your name in Hindi</h2>
          <p>
            UPSSSC&apos;s signature image is different from most exams: under your usual signature, write your name in Hindi
            in your own hand, and upload both lines as one image. Use dark ink on white paper so the writing stays sharp when
            the file is compressed. In the tool, choose <strong>Signature</strong>, crop around both lines with a small margin,
            keep the paper clean-up on, and create a file of 30–50 KB. Never sign in English capital letters; the notice
            treats that as invalid.
          </p>

          <h2>Which UPSSSC applications use these files</h2>
          <p>
            The OTR started on 14 July 2026. From then on the commission uses the OTR number for its Preliminary Eligibility
            Test and its mains recruitments, so you upload the photo and signature once instead of in every form. Mains
            advertisements reuse what you gave for PET: the Inter (12th) Level advertisement (26-Exam/2026), for example,
            shows the PET-2025 photo and signature automatically. Check your own advertisement for anything it adds, such as
            certificates.
          </p>

          <h2>Fixing a file that is too small or too large</h2>
          <ul>
            <li>
              <strong>Below the minimum</strong> (under 50 KB for the photo or 30 KB for the signature): use the{" "}
              <Link href="/tools/image-size-increase">image size increaser</Link>, which adds bytes without changing the
              picture.
            </li>
            <li>
              <strong>Above the maximum:</strong> this tool reduces it automatically; for a single size limit you can also use
              the <Link href="/tools/100kb-photo">100KB photo resizer</Link> or the{" "}
              <Link href="/tools/50kb-photo">50KB photo resizer</Link>.
            </li>
            <li>
              Comparing exams? The <Link href="/tools/application-photos">exam photo requirements</Link> page lists UPSSSC next
              to RRB, SSC, IBPS, SBI and NEET.
            </li>
          </ul>

          <h2>How we keep this page accurate</h2>
          <p>
            The limits come from the commission&apos;s OTR notice, read in the original Hindi on the date shown above. When
            UPSSSC issues a new notice about the OTR or an advertisement changes the upload rules, we re-read it and update the
            page. If an advertisement says something different, follow the advertisement. See{" "}
            <Link href="/methodology">how the tools work</Link>.
          </p>

          <PrivacyNote>
            <p>Your photo and signature are prepared on your device and not sent to this site. Upload them only on upsssc.gov.in.</p>
          </PrivacyNote>
        </>
      }
    >
      <div className="space-y-6">
        <RequirementSummary heading="UPSSSC OTR Photo and Signature Size" app={app} />
        <RequirementPhotoTool tool="upsssc-photo" sets={app.sets} setLabel="UPSSSC registration" appName="UPSSSC" />
      </div>
    </ToolPageShell>
  );
}
