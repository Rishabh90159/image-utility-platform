import type { Metadata } from "next";
import Link from "next/link";
import { RequirementSummary } from "@/components/requirements/requirement-summary";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { RequirementPhotoTool } from "@/components/tools/requirement-photo-tool";
import { APPLICATIONS } from "@/lib/requirements/applications";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("ibps-photo");
const app = APPLICATIONS.ibps;

const description =
  "Make an IBPS photo of 200 × 230 px and 20–50 KB, and a 140 × 60 px, 10–20 KB signature, as stated in the current IBPS CRP notifications. Sources listed.";

export const metadata: Metadata = pageMetadata({
  title: "IBPS Photo, Signature & Thumb Impression Resizer",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "What is the IBPS photo size?",
    answer:
      "The current IBPS notifications for CRP PO/MT-XVI, CRP CSA-XVI and CRP SPL-XVI state: dimensions 200 × 230 pixels (preferred), file size between 20 KB and 50 KB, JPG or JPEG, a recent passport-style colour photo against a light, preferably white, background. The photograph image is described as 4.5 cm × 3.5 cm.",
  },
  {
    question: "What is the IBPS signature size?",
    answer:
      "140 × 60 pixels (preferred) and 10–20 KB, JPG or JPEG. Sign on white paper with a black ink pen. A signature in capital letters is not accepted.",
  },
  {
    question: "What is the IBPS left thumb impression size?",
    answer:
      "The CRP PO/MT-XVI, CSA-XVI and SPL-XVI notifications ask for a left thumb impression in black or blue ink on white paper, 240 × 240 pixels at 200 DPI (preferred), that is 3 × 3 cm, and 20–50 KB as JPG. Without a left thumb, the right thumb may be used; the notification lists what to use if both are missing.",
  },
  {
    question: "What size is the IBPS hand-written declaration?",
    answer:
      "800 × 400 pixels at 200 DPI (preferred), which is 10 × 5 cm, between 50 KB and 100 KB, as JPG. It must be in your own handwriting, in English and not in capital letters, using the wording given in the notification.",
  },
  {
    question: "Do all IBPS exams use the same photo requirements?",
    answer:
      "The three current CRP notifications we checked state the same photo and signature specifications. Other recruitments run on the IBPS portal can differ, so the tool lets you pick the notification, and choose “Other” to enter different numbers.",
  },
  {
    question: "Can I resize my IBPS photo online?",
    answer:
      "Yes. Pick your notification, add your photo, frame your face in the 200:230 crop box and select Create photo file. The tool outputs exactly 200 × 230 pixels and keeps the file between 20 and 50 KB, in your browser.",
  },
  {
    question: "What happens if my IBPS photo doesn't meet the specification?",
    answer:
      "The notifications say the system will not let you move to the next stage of the application until the photograph and signature match the specification. They also say an application can be rejected if the face in the photo is unclear or smudged.",
  },
  {
    question: "Where can I verify the official IBPS requirement?",
    answer:
      "In the detailed notification for your CRP on ibps.in, in the guidelines for scanning and uploading the photograph and signature. Each notification we used is linked on this page with the date we checked it.",
  },
];

export default function IbpsPhotoPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="IBPS Photo Resizer"
      intro={
        <p>
          Prepare your photo and signature for an IBPS Common Recruitment Process application, using the requirements stated
          in the current IBPS notifications. Choose your notification and the tool applies its sizes. Not affiliated with IBPS.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to Resize Your IBPS Photo</h2>
          <ol>
            <li>Choose your notification: PO/MT, CSA (clerk) or Specialist Officers.</li>
            <li>Select <strong>Photograph</strong>, add a recent colour photo and frame your head and shoulders in the crop box.</li>
            <li>Select <strong>Create photo file</strong>. The checklist confirms 200 × 230 px and a size between 20 and 50 KB.</li>
            <li>Download the JPG and upload it in the IBPS application.</li>
          </ol>

          <h2>How to Resize Your IBPS Signature</h2>
          <ol>
            <li>Sign on plain white paper and take a straight, well-lit photo of it, or scan it.</li>
            <li>Switch to <strong>Signature</strong>, add the image and crop tightly around the signature.</li>
            <li>
              Create the file. A clean signature at the preferred 140 × 60 px can come out below the 10 KB minimum; when that
              happens the checklist says so and offers to make it larger, which the notification allows because the pixel
              size is only &ldquo;preferred&rdquo;.
            </li>
            <li>Download the JPG and upload it next to your photo.</li>
          </ol>
          <p>
            Need a different size for another form? The <Link href="/tools/signature-resizer">signature resizer</Link> takes
            any pixel size and KB limit, and the <Link href="/tools/image-resizer">image resizer</Link> and{" "}
            <Link href="/tools/image-compressor">image compressor</Link> handle general photos.
          </p>

          <h2>Left thumb impression and hand-written declaration</h2>
          <p>
            The IBPS application also asks for two scanned documents, and the tool above prepares both: choose{" "}
            <strong>Thumb impression</strong> or <strong>Declaration</strong> under &ldquo;What are you preparing?&rdquo;.
            According to Annexure III of the notification:
          </p>
          <ul>
            <li>
              <strong>Left thumb impression:</strong> black or blue ink on white paper, 240 × 240 pixels at 200 DPI (preferred),
              which is 3 × 3 cm, and 20–50 KB, as JPG.
            </li>
            <li>
              <strong>Hand-written declaration:</strong> written in English in your own handwriting with black ink on white
              paper, not in capital letters; 800 × 400 pixels at 200 DPI (preferred), which is 10 × 5 cm, and 50–100 KB, as JPG.
              The exact text to copy is shown with the requirement above.
            </li>
          </ul>
          <p>
            Press firmly once and lift the thumb straight up so the ridges stay sharp. The paper clean-up is off for thumb
            impressions by default: if you switch it on, keep it light so no ridges disappear. For the declaration, photograph
            the whole page straight on in good light, then crop to the written text.
          </p>

          <h2>Common mistakes</h2>
          <ul>
            <li>
              <strong>Uploading a full phone photo.</strong> A 3–5 MB photo is far over 50 KB and the wrong shape. The tool
              crops to 200:230 and compresses in one step.
            </li>
            <li>
              <strong>Dark or patterned background.</strong> The notifications ask for a light-coloured, preferably white
              background.
            </li>
            <li>
              <strong>Signature in capital letters.</strong> Not accepted. Use your normal running signature.
            </li>
            <li>
              <strong>Caps, hats or dark glasses.</strong> Not acceptable; religious headwear is allowed if it doesn&apos;t cover
              the face.
            </li>
            <li>
              <strong>Forgetting the live photo.</strong> In addition to the uploaded photo, the application asks you to capture
              a live photo with a webcam or phone, so look similar to your uploaded photo.
            </li>
          </ul>

          <h2>IBPS-specific tips</h2>
          <ul>
            <li>Take the photo in daylight, facing a window, to avoid shadows and red-eye.</li>
            <li>If you wear glasses, tilt them slightly to avoid reflections; your eyes must be clearly visible.</li>
            <li>
              The same specifications currently apply in SBI recruitment advertisements; see the{" "}
              <Link href="/tools/sbi-photo">SBI photo resizer</Link>.
            </li>
            <li>
              Only need a file under 50 KB without a fixed pixel size? Use the{" "}
              <Link href="/tools/50kb-photo">50KB photo resizer</Link>; for signatures, the{" "}
              <Link href="/tools/20kb-photo">20KB photo resizer</Link>.
            </li>
          </ul>

          <h2>How we keep this page accurate</h2>
          <p>
            Every value above is copied from an IBPS notification, and each requirement set links to its PDF with the date we
            last read it. When IBPS publishes a new notification, we add or update its entry. If your notification says
            something different, follow your notification. See <Link href="/methodology">how the tools work</Link>.
          </p>

          <PrivacyNote>
            <p>
              IBPS files are processed entirely in your browser. Nothing you add here is sent to this site&apos;s servers, so the
              only place your photo and signature are uploaded is the IBPS portal itself.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <div className="space-y-6">
        <RequirementSummary heading="IBPS Photo and Signature Size Requirements" app={app} />
        <RequirementPhotoTool tool="ibps-photo" sets={app.sets} setLabel="IBPS notification" appName="IBPS" />
      </div>
    </ToolPageShell>
  );
}
