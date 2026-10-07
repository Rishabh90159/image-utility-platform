import type { Metadata } from "next";
import Link from "next/link";
import { RequirementSummary } from "@/components/requirements/requirement-summary";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { RequirementPhotoTool } from "@/components/tools/requirement-photo-tool";
import { APPLICATIONS } from "@/lib/requirements/applications";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("neet-photo");
const app = APPLICATIONS.neet;

const description =
  "Prepare your NEET (UG) photo as a JPG of 10–200 KB and your signature within 10–100 KB, following the NTA information bulletin. Source and check date shown.";

export const metadata: Metadata = pageMetadata({
  title: "NEET Photo Resizer – Photo Size & Upload Requirements",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "What is the NEET photo size?",
    answer:
      "The NEET (UG) 2026 Information Bulletin asks for a recent passport-size photograph in JPG/JPEG format between 10 KB and 200 KB, in colour or black & white, against a white background, with the face (without mask, ears visible) covering about 80% of the image. It does not specify pixel dimensions.",
  },
  {
    question: "What is the NEET signature size?",
    answer: "A JPG/JPEG file between 10 KB and 100 KB, according to the NEET (UG) 2026 bulletin.",
  },
  {
    question: "Do NEET photo requirements change every year?",
    answer:
      "They can. NTA publishes a new information bulletin for each cycle. This page shows the requirement from the latest bulletin we've verified and the date we checked it. When a new bulletin is published, follow it, and we update the data here.",
  },
  {
    question: "Can I resize my NEET photo online?",
    answer:
      "Yes. Add your photo, crop it so your face fills about 80% of the frame with ears visible, and create the file. The tool keeps it within 10–200 KB as a JPG, entirely in your browser. It only crops and resizes; it doesn't alter your face, which matters because computer-generated photos are not acceptable.",
  },
  {
    question: "What happens if my NEET photo is rejected?",
    answer:
      "The bulletin says applications that don't follow the instructions, or with unclear photographs, are liable to be rejected, and applications without photographs are rejected. Fabricated or someone else's photographs are treated as unfair means.",
  },
  {
    question: "Where can I verify the official NEET requirement?",
    answer:
      "In the Information Bulletin on neet.nta.nic.in, in the section on uploading scanned images. The link and the date we last checked it are shown on this page.",
  },
];

export default function NeetPhotoPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="NEET Photo Resizer"
      intro={
        <p>
          Prepare the photograph and signature for your NEET (UG) application, based on the requirements in NTA&apos;s
          information bulletin. The tool keeps your files in the stated KB ranges and in JPG format. Not affiliated with NTA.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to Resize Your NEET Photo</h2>
          <ol>
            <li>Take a recent photo against a white wall, in good light, without a mask, with both ears visible.</li>
            <li>Add it to the tool with <strong>Photograph</strong> selected.</li>
            <li>Crop so your face fills about 80% of the frame, as the bulletin requires.</li>
            <li>Select <strong>Create photo file</strong>. The checklist confirms the size is within 10–200 KB, then download.</li>
          </ol>

          <h2>How to Resize Your NEET Signature</h2>
          <ol>
            <li>Sign on white paper, photograph or scan it, and switch the tool to <strong>Signature</strong>.</li>
            <li>Crop tightly around the signature so the strokes fill the image.</li>
            <li>Create the file; the checklist confirms it&apos;s within 10–100 KB. Download it.</li>
          </ol>
          <p>
            Preparing images for other forms as well? The <Link href="/tools/image-resizer">image resizer</Link>,{" "}
            <Link href="/tools/image-compressor">image compressor</Link> and{" "}
            <Link href="/tools/100kb-photo">100KB photo resizer</Link> cover the usual limits.
          </p>

          <h2>No pixel size? What that means</h2>
          <p>
            The 2026 bulletin specifies the format, file size and what the photo must show, but not a width and height in
            pixels. So the tool doesn&apos;t force one: it keeps your cropped area and only reduces it if that&apos;s needed to stay
            under 200 KB. Don&apos;t rely on a pixel size from a website that isn&apos;t NTA&apos;s; if a future bulletin adds one,
            we&apos;ll add it here with the source.
          </p>

          <h2>Common mistakes</h2>
          <ul>
            <li>
              <strong>Face too small.</strong> A full-length or half-body photo doesn&apos;t meet the 80% face rule. Crop in.
            </li>
            <li>
              <strong>Ears hidden or mask on.</strong> The bulletin asks for the face without a mask, ears visible.
            </li>
            <li>
              <strong>Coloured background.</strong> Use white.
            </li>
            <li>
              <strong>Edited or filtered photos.</strong> Polaroid and computer-generated photos are not acceptable, and
              fabricated photos are treated as unfair means. Cropping and resizing are fine; beauty filters and background
              replacement are not.
            </li>
            <li>
              <strong>An old photo.</strong> The 2026 bulletin asks for a photograph taken after 1 January 2026.
            </li>
          </ul>

          <h2>NEET-specific tips</h2>
          <ul>
            <li>
              Use the same photo everywhere: the bulletin says the same passport-size photo is used on the form and pasted on
              the attendance sheet, and asks you to keep 6–8 passport-size and 4–6 postcard-size (4&quot; × 6&quot;) prints.
            </li>
            <li>
              A live photo is also captured during the application and matched with your Aadhaar record, so look like your
              photo.
            </li>
            <li>Spectacles are allowed only if you wear them regularly.</li>
            <li>
              Just need a file under 200 KB? The <Link href="/tools/200kb-photo">200KB photo resizer</Link> does that. For
              signatures, the <Link href="/tools/signature-resizer">signature resizer</Link> offers more clean-up options.
            </li>
          </ul>

          <h2>How we keep this page accurate</h2>
          <p>
            The values above come from the NEET (UG) 2026 Information Bulletin, linked with the date we read it. Because NTA
            publishes a new bulletin each cycle, the requirement is stored as data we can update as soon as a new bulletin is
            out, without guessing in between. See <Link href="/methodology">how the tools work</Link>.
          </p>

          <PrivacyNote>
            <p>
              Your NEET photo and signature are prepared on your own device. They aren&apos;t uploaded to this site, and nothing
              is kept once you close the page.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <div className="space-y-6">
        <RequirementSummary heading="NEET Photo and Signature Size Requirements" app={app} />
        <RequirementPhotoTool tool="neet-photo" sets={app.sets} setLabel="Information bulletin" appName="NEET" />
      </div>
    </ToolPageShell>
  );
}
