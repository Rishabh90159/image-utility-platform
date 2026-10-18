import type { Metadata } from "next";
import Link from "next/link";
import { RequirementSummary } from "@/components/requirements/requirement-summary";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { RequirementPhotoTool } from "@/components/tools/requirement-photo-tool";
import { APPLICATIONS } from "@/lib/requirements/applications";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("dsssb-photo");
const app = APPLICATIONS.dsssb;

const description =
  "DSSSB's 2026 advertisements set the photo rules and a 15–60 KB scanned photo ID; photo and signature sizes are shown in OARS. Prepare every file here.";

export const metadata: Metadata = pageMetadata({
  title: "DSSSB Photo & Signature Size 2026 – Photo ID Scan Guide",
  description,
  path: tool.path,
});

const ID_PROOFS = [
  { doc: "PAN card", min: "300 × 200 px" },
  { doc: "Driving licence", min: "300 × 200 px" },
  { doc: "Voter ID card", min: "200 × 300 px" },
  { doc: "Passport", min: "450 × 350 px" },
];

const faqs: FaqItem[] = [
  {
    question: "What is the DSSSB photo size?",
    answer:
      "DSSSB's 2026 advertisements (04/2026 and 05/2026) don't give a file size or pixel size for the photograph. They ask for a recent, clear colour photo on a plain white or off-white background, showing the full face from the front with eyes open. The accepted size appears on the OARS upload screen: if it shows one, choose Other in the tool and enter it.",
  },
  {
    question: "What size should the scanned photo ID be for DSSSB?",
    answer:
      "A JPG/JPEG between 15 KB and 60 KB. The minimum resolution depends on the document: 300 × 200 pixels for a PAN card or driving licence, 200 × 300 pixels for a voter card and 450 × 350 pixels for a passport. If you give your Aadhaar number, no ID scan is needed.",
  },
  {
    question: "What does DSSSB say about the signature?",
    answer:
      "Only that a blurred or illegible photograph or signature gets the online application rejected. Sign clearly in dark ink on white paper, crop close to the signature, and use the size the OARS screen shows.",
  },
  {
    question: "Why do some websites give a DSSSB photo size of 480 × 672 pixels?",
    answer:
      "We couldn't find that size, or any photo size, in DSSSB's 2026 advertisements, so this page doesn't present it as a requirement. If the OARS upload screen asks for particular dimensions or a KB range, those apply: enter them under Other.",
  },
  {
    question: "Will I need a printed photo as well?",
    answer:
      "Yes, possibly. The advertisements say candidates must bring the same photo printed on photo-quality paper whenever the Board asks, so keep the file and get a few prints made from it.",
  },
  {
    question: "Where can I check the official DSSSB requirement?",
    answer:
      "In the advertisement for your post on dsssb.delhi.gov.in: the how-to-apply section (points 3 and 13) and general instruction (viii). The links on this page go to the 2026 advertisements and show when we last read them.",
  },
];

export default function DsssbPhotoPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="DSSSB Photo, Signature and ID Proof Requirements"
      intro={
        <p>
          A DSSSB application on OARS needs a photograph, a signature and, unless you give your Aadhaar number, a scanned
          photo ID. This page separates what DSSSB&apos;s advertisements actually specify from what they leave to the portal,
          and prepares the files. Not affiliated with the Delhi Subordinate Services Selection Board.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>Scanning your photo ID for OARS</h2>
          <p>
            This is the one upload with exact numbers in the advertisement. Scan or photograph the card flat, with every detail
            and your photo readable, and save it as JPG between 15 KB and 60 KB, at no less than the resolution below.
          </p>
          <div className="not-prose overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <caption className="sr-only">Minimum resolution of the scanned photo ID for DSSSB</caption>
              <thead className="bg-surface text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="px-3 py-2 font-medium">Document</th>
                  <th scope="col" className="px-3 py-2 font-medium">Minimum resolution</th>
                  <th scope="col" className="px-3 py-2 font-medium">File</th>
                </tr>
              </thead>
              <tbody className="text-ink-soft">
                {ID_PROOFS.map((row) => (
                  <tr key={row.doc} className="border-b border-line last:border-0">
                    <th scope="row" className="px-3 py-2 font-medium text-ink">
                      {row.doc}
                    </th>
                    <td className="px-3 py-2 tabular-nums">{row.min}</td>
                    <td className="px-3 py-2">JPG/JPEG, 15–60 KB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Crop the card with the <Link href="/tools/image-cropper">image cropper</Link>, then bring it under 60 KB with{" "}
            <Link href="/tools/resize-image-to-kb?target=60">resize image to KB</Link>. Don&apos;t upload a blurred scan: the
            advertisements say it will be cross-checked at the exam and printed on your admit card.
          </p>

          <h2>The photograph and signature</h2>
          <ol>
            <li>Choose your advertisement above and pick Photograph or Signature.</li>
            <li>
              For the photo, use a recent colour picture against a white or off-white wall, facing the camera with eyes open.
              Crop from above the head to the shoulders.
            </li>
            <li>For the signature, sign clearly in dark ink on white paper and crop close to it, keeping the paper clean-up on.</li>
            <li>
              Open the OARS upload screen and note the size it accepts. If it gives one, choose <strong>Other</strong> in the
              tool and enter it before creating the file, so the result is guaranteed to fit.
            </li>
          </ol>

          <h2>Why this page doesn&apos;t give a photo size in KB</h2>
          <p>
            Many sites quote a DSSSB photo or signature size, and they don&apos;t agree with each other. DSSSB&apos;s 2026
            advertisements state none, so a number here would be a guess presented as a rule. What is official is listed above
            with its source; anything else should come from the OARS screen itself. When DSSSB publishes sizes, we&apos;ll add
            them, and the tool will apply them automatically.
          </p>

          <h2>Related tools</h2>
          <p>
            Preparing for other boards as well? See the <Link href="/tools/upsssc-photo">UPSSSC OTR photo</Link>, the{" "}
            <Link href="/tools/rrb-photo">RRB NTPC signature</Link> and the{" "}
            <Link href="/tools/application-photos">exam photo requirements</Link> comparison. For a signature in any other size,
            use the <Link href="/tools/signature-resizer">signature resizer</Link>.
          </p>

          <h2>How we keep this page accurate</h2>
          <p>
            Everything above is taken from DSSSB&apos;s own advertisements, with the date we last read them. When a new
            advertisement or corrigendum changes the upload rules, we read it and update this page. If your advertisement says
            something different, follow it. See <Link href="/methodology">how the tools work</Link>.
          </p>

          <PrivacyNote>
            <p>Your photo, signature and ID scan are prepared on your device and are not sent to this site.</p>
          </PrivacyNote>
        </>
      }
    >
      <div className="space-y-6">
        <RequirementSummary heading="DSSSB Photo, Signature and ID Proof Requirements" app={app} />
        <RequirementPhotoTool tool="dsssb-photo" sets={app.sets} setLabel="DSSSB advertisement" appName="DSSSB" />
      </div>
    </ToolPageShell>
  );
}
