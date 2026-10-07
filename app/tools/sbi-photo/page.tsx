import type { Metadata } from "next";
import Link from "next/link";
import { RequirementSummary } from "@/components/requirements/requirement-summary";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { RequirementPhotoTool } from "@/components/tools/requirement-photo-tool";
import { APPLICATIONS } from "@/lib/requirements/applications";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("sbi-photo");
const app = APPLICATIONS.sbi;

const description =
  "Resize your photo and signature for an SBI recruitment application. Pick your advertisement to apply its stated size (200 × 230 px, 20–50 KB) with the source.";

export const metadata: Metadata = pageMetadata({
  title: "SBI Photo Resizer – Photo Size & Application Requirements",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "What is the SBI photo size for recruitment applications?",
    answer:
      "Each SBI recruitment advertisement states its own requirements. The two current advertisements we checked, Probationary Officers (CRPD/PO/2026-27/09) and Retired Bank Officers as Resolvers (CRPD/RS/2026-27/06), both ask for a recent passport-style colour photo of 200 × 230 pixels (preferred), 20–50 KB, against a light, preferably white, background.",
  },
  {
    question: "What size should my SBI signature be?",
    answer:
      "140 × 60 pixels (preferred) and 10–20 KB, signed on white paper with a black ink pen. A signature in capital letters is not accepted.",
  },
  {
    question: "Do all SBI applications use the same photo specification?",
    answer:
      "Not necessarily. SBI publishes requirements in each advertisement, and they can change. That's why the tool asks you to pick the advertisement and offers “Other” to enter different numbers from a newer advertisement.",
  },
  {
    question: "Can I make my SBI photo online?",
    answer:
      "Yes. Pick the advertisement, add a photo, frame your face in the crop box and create the file. The tool outputs 200 × 230 pixels within 20–50 KB and checks the result for you. It runs in your browser.",
  },
  {
    question: "What happens if the photo doesn't match on exam day?",
    answer:
      "The PO 2026 advertisement says that if your photo and signature on the attendance sheet or call letter don't match those uploaded during registration, you will be disqualified. It also advises keeping about 8 copies of the same photograph for later stages.",
  },
  {
    question: "Where can I verify the official SBI requirement?",
    answer:
      "In the advertisement PDF for your recruitment, on SBI's careers pages. The advertisements used here are linked with the date we last checked them.",
  },
];

export default function SbiPhotoPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="SBI Photo Resizer"
      intro={
        <p>
          Prepare your photo and signature for an SBI recruitment application, based on the requirements in SBI&apos;s current
          advertisements. Requirements are set per advertisement, so pick yours first. Not affiliated with State Bank of India.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to prepare your SBI photo and signature</h2>
          <ol>
            <li>Choose the advertisement you&apos;re applying under.</li>
            <li>Add a recent passport-style colour photo taken against a white or light wall.</li>
            <li>Frame your head and shoulders, then select <strong>Create photo file</strong>.</li>
            <li>Then select <strong>Signature</strong>, load a picture of your signature on white paper, crop closely and create it.</li>
            <li>Check both results against the checklist, then download and upload them in the SBI application.</li>
          </ol>

          <h2>Requirements differ between advertisements</h2>
          <p>
            SBI recruits for many posts, from probationary officers to specialist and contract roles, and each advertisement
            sets its own document rules. The two current advertisements we checked state the same photo and signature sizes,
            but other parts differ. The PO 2026 advertisement, for instance, adds two more uploads: a left-hand thumb impression
            at 240 × 240 px (preferred) within 20–50 KB, and a hand-written declaration at 800 × 400 px (preferred) within
            50–100 KB. To make those here, pick the &ldquo;Other&rdquo; option in the advertisement list and copy in your
            advertisement&apos;s values.
          </p>

          <h2>Common mistakes</h2>
          <ul>
            <li>
              <strong>Using a different photo later.</strong> The photo on your call letter and attendance sheet must match the
              uploaded one. Keep copies of the same photo.
            </li>
            <li>
              <strong>Capital-letter signature.</strong> Not accepted. Sign as you normally do.
            </li>
            <li>
              <strong>Glare on glasses or harsh shadows.</strong> The advertisements ask for clearly visible eyes and no harsh
              shadows.
            </li>
            <li>
              <strong>File over 50 KB.</strong> Phone photos are megabytes; the tool reduces them to the required range.
            </li>
          </ul>

          <h2>SBI-specific tips</h2>
          <ul>
            <li>
              The PO 2026 advertisement also asks you to capture a live photo by webcam or phone during the application, so
              use a recent photo that looks like you.
            </li>
            <li>
              Current IBPS notifications use the same sizes; if you&apos;re also applying there, see the{" "}
              <Link href="/tools/ibps-photo">IBPS photo resizer</Link>.
            </li>
            <li>
              For a file-size limit without a fixed pixel size, use the <Link href="/tools/50kb-photo">50KB</Link> or{" "}
              <Link href="/tools/20kb-photo">20KB</Link> photo resizers; for framing only, the{" "}
              <Link href="/tools/image-cropper">image cropper</Link>.
            </li>
          </ul>

          <h2>How we keep this page accurate</h2>
          <p>
            We copy each value from SBI&apos;s own advertisement PDF, link it, and show when we last read it. New advertisements
            are added as separate entries rather than replacing old ones, because requirements can differ. If your advertisement
            says something different, follow it. See <Link href="/methodology">how the tools work</Link>.
          </p>

          <PrivacyNote>
            <p>
              A bank application gathers a lot of personal images: photo, signature, thumb impression and declaration. Any of
              them you prepare here stay on your device; this site never receives or keeps them.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <div className="space-y-6">
        <RequirementSummary heading="Current SBI photo and signature requirements" app={app} />
        <RequirementPhotoTool tool="sbi-photo" sets={app.sets} setLabel="SBI advertisement" appName="SBI" />
      </div>
    </ToolPageShell>
  );
}
