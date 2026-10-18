import type { Metadata } from "next";
import Link from "next/link";
import { RequirementSummary } from "@/components/requirements/requirement-summary";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { RequirementPhotoTool } from "@/components/tools/requirement-photo-tool";
import { APPLICATIONS } from "@/lib/requirements/applications";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("rrb-photo");
const app = APPLICATIONS.rrb;

const description =
  "RRB NTPC 2026 (CEN 06/2026 and 07/2026) takes your photo live, so only the signature is uploaded: a 30–49 KB JPG of at least 140 × 60 px. Make it here.";

export const metadata: Metadata = pageMetadata({
  title: "RRB NTPC Photo & Signature Size 2026 – Signature Resizer",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "What is the RRB NTPC 2026 photo size?",
    answer:
      "There is no photo file to resize this time. CEN 06/2026 (Graduate) and CEN 07/2026 (Under Graduate) both say candidates are not required to upload a pre-existing photograph: the application captures a live photo with your webcam or phone camera while you fill it in.",
  },
  {
    question: "What is the RRB NTPC signature size?",
    answer:
      "A JPG/JPEG file between 30 KB and 49 KB, at least 140 pixels wide and 60 pixels high, scanned at 100 DPI or more. Sign with black ink on white paper in running handwriting; the signature has to sit within the 35 mm × 20 mm box on the form.",
  },
  {
    question: "Why does a 140 × 60 pixel signature get rejected as too small?",
    answer:
      "Because the file must also be at least 30 KB, and a JPG of only 140 × 60 pixels is a few KB. 140 × 60 is the smallest size allowed, not a target. The tool here starts at that size and, if the file is under 30 KB, offers to enlarge it until it reaches the minimum, keeping the same shape.",
  },
  {
    question: "Can I sign in capital letters for RRB?",
    answer:
      "No. Both notices require running handwriting (cursive, joined letters) and list block, capital or disjointed letters as grounds for rejection, along with blue or other non-black ink, a coloured background and a thumb impression in place of a signature.",
  },
  {
    question: "What else do SC/ST candidates upload?",
    answer:
      "Candidates who want a free train travel pass upload their SC/ST certificate as a PDF smaller than 400 KB. If your scan is larger, the Compress PDF tool can bring it under that limit.",
  },
  {
    question: "Where can I check the official RRB requirement?",
    answer:
      "In paragraphs 14.4 and 14.5 of each CEN, published on the unified RRB website, rrb.indianrailways.gov.in. The links on this page go to those documents and show the date we last read them.",
  },
];

export default function RrbPhotoPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="RRB NTPC 2026 Photo and Signature Requirements"
      intro={
        <p>
          The 2026 NTPC applications only ask you to upload one image: your signature. This page shows the rules from RRB&apos;s
          own notices and makes a signature file that fits them. It is an independent tool, not affiliated with the Railway
          Recruitment Boards.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>Making the RRB signature file</h2>
          <ol>
            <li>Sign once on clean white paper with a black pen, in joined-up handwriting, the way you normally sign.</li>
            <li>Scan it, or take a phone photo from straight above in daylight so there&apos;s no shadow across the page.</li>
            <li>Choose your notice above and add the image. Move the crop box so it hugs the ink with a little white margin.</li>
            <li>
              Leave the paper clean-up on and select <strong>Create signature file</strong>. If the checklist says the file is
              below 30 KB, accept the offer to enlarge it.
            </li>
            <li>Confirm the result reads 30–49 KB and JPG, download it, and upload it in the application.</li>
          </ol>

          <h2>Before the camera opens: the live photo</h2>
          <p>
            Since RRB takes the photo inside the form, what matters is the setting. The notices ask for a pure white, plain
            background, so stand in front of a white wall or hang a white sheet behind you. Wear something plain and darker
            than the wall. Your head should fill at least half of the picture, with nothing below the chest showing, and your
            eyes must be fully open: the module won&apos;t capture a photo with closed eyes. Take off a cap, mask or spectacles
            first. You can preview and retake until you submit, so retake if the light is uneven.
          </p>
          <p>
            RRB also checks the live photo against the photo identity proof you enter. Use a document with a clear, recent
            photo of you, and look like that photo on exam day.
          </p>

          <h2>Signature mistakes that lead to rejection</h2>
          <ul>
            <li>
              <strong>Writing your name in block letters.</strong> RRB wants running handwriting; a neatly printed name is
              treated as invalid.
            </li>
            <li>
              <strong>Blue ink, or coloured or lined paper.</strong> The rules say black ink on a white background.
            </li>
            <li>
              <strong>Uploading exactly 140 × 60 pixels.</strong> It meets the pixel minimum but not the 30 KB minimum.
            </li>
            <li>
              <strong>A signature you can&apos;t repeat.</strong> It is compared with the signatures you give at the exams,
              document verification, medical examination and appointment.
            </li>
          </ul>

          <h2>Other RRB recruitments</h2>
          <p>
            Each RRB notice (Group D, ALP, Technician, JE and others) states its own upload rules, which can differ from NTPC
            2026. If your notice isn&apos;t listed above, choose <strong>Other</strong> in the tool and enter the
            numbers from your CEN. For a plain size limit, the <Link href="/tools/signature-resizer">signature resizer</Link> or{" "}
            <Link href="/tools/resize-image-to-kb">resize image to KB</Link> also work, and the{" "}
            <Link href="/tools/application-photos">exam photo requirements</Link> page compares RRB with SSC, IBPS, SBI and more.
          </p>

          <h2>How we keep this page accurate</h2>
          <p>
            The numbers and rules above come from the CEN documents on RRB&apos;s unified website, read on the date shown with
            each one. When RRB publishes a new notice or a corrigendum, we re-read it and update this page. If your CEN says
            something different, your CEN is right. More on <Link href="/methodology">how the tools work</Link>.
          </p>

          <PrivacyNote>
            <p>The signature is prepared in your browser and is not sent to this site. Upload it only on the official RRB portal.</p>
          </PrivacyNote>
        </>
      }
    >
      <div className="space-y-6">
        <RequirementSummary heading="RRB NTPC 2026 Photo and Signature Requirements" app={app} />
        <RequirementPhotoTool tool="rrb-photo" sets={app.sets} setLabel="RRB notice (CEN)" appName="RRB" />
      </div>
    </ToolPageShell>
  );
}
