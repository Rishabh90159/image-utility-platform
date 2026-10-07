import type { Metadata } from "next";
import Link from "next/link";
import { RequirementSummary } from "@/components/requirements/requirement-summary";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { RequirementPhotoTool } from "@/components/tools/requirement-photo-tool";
import { APPLICATIONS } from "@/lib/requirements/applications";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("ssc-photo");
const app = APPLICATIONS.ssc;

const description =
  "SSC now captures your photo live in the application form. See the rules from the official 2026 notices and resize your signature to a 10–20 KB JPEG.";

export const metadata: Metadata = pageMetadata({
  title: "SSC Photo & Signature Requirements – SSC Signature Resizer",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "What is the current SSC photo requirement?",
    answer:
      "In the SSC Combined Graduate Level 2026 and Combined Higher Secondary 2026 notices, you don't upload a photo. The application module captures your photograph with your camera while you fill in the form. You need good light, a plain background, the camera at eye level, your face inside the marked area, and no cap, mask or glasses.",
  },
  {
    question: "What size should my SSC photo be?",
    answer:
      "For these examinations there is no photo file size, because the photo isn't uploaded. Capturing a photo of an existing photograph is not allowed and leads to rejection. If you're applying for a different SSC examination, check that examination's own notice, as requirements can differ.",
  },
  {
    question: "What is the SSC signature size?",
    answer:
      "Both 2026 notices ask for a scanned signature in JPEG/JPG format between 10 and 20 KB, with an image dimension of about 6.0 cm wide by 2.0 cm high. Blurred or miniature signatures are rejected.",
  },
  {
    question: "Can I resize my SSC signature online?",
    answer:
      "Yes. Use the tool on this page: choose your examination, add a photo or scan of your signature, crop it to the 3:1 shape, whiten the paper and download a JPG between 10 and 20 KB. It all runs in your browser, so your signature isn't uploaded here.",
  },
  {
    question: "What happens if my photo or signature is rejected?",
    answer:
      "The notices say applications with photographs not following the instructions, or with blurred or miniature signatures, are liable to be rejected. Applications submitted through Aadhaar-based authentication are not rejected on those grounds. Check the preview in the SSC portal before final submission.",
  },
  {
    question: "Where can I verify the official SSC requirement?",
    answer:
      "In the notice for your examination on ssc.gov.in, in the section on online application (paragraphs 9.4 to 9.6 in the 2026 CGL and CHSL notices). The links are listed on this page with the date we last checked them.",
  },
];

export default function SscPhotoPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="SSC Photo and Signature Requirements"
      intro={
        <p>
          A tool for preparing your SSC signature, based on the requirements in SSC&apos;s current notices, plus the official
          rules for the live photo that the SSC application captures. Not affiliated with the Staff Selection Commission.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to Resize Your SSC Signature</h2>
          <ol>
            <li>Sign on plain white paper with a dark pen, in your normal signature.</li>
            <li>Photograph it straight-on in good light, or scan it.</li>
            <li>Choose your examination above, then add the image.</li>
            <li>
              Drag the crop box around the signature. It&apos;s locked to about 3:1, matching 6.0 cm × 2.0 cm. (For a free-form
              crop of any other image, use the <Link href="/tools/image-cropper">image cropper</Link>.)
            </li>
            <li>Keep &ldquo;Clean the paper background to white&rdquo; on, and select Create signature file.</li>
            <li>Check the result: it should read between 10 KB and 20 KB, JPG. Then download and upload it on the SSC portal.</li>
          </ol>

          <h2>Getting the live photo right</h2>
          <p>
            Because SSC captures the photo during the application, preparation happens before you open the form, not in a
            photo editor:
          </p>
          <ul>
            <li>Sit facing a window or a bright, even light. Avoid a light behind you, which darkens your face.</li>
            <li>Use a plain wall as the background.</li>
            <li>Put the phone or webcam at eye level, about an arm&apos;s length away, and look straight at it.</li>
            <li>Remove your cap, mask and glasses before the camera opens.</li>
            <li>Keep your appearance similar on exam day: the notice says it should match the photo in the application.</li>
          </ul>

          <h2>Common mistakes</h2>
          <ul>
            <li>
              <strong>Holding up an old photo to the camera.</strong> The notices state that capturing a pre-existing
              photograph leads to rejection.
            </li>
            <li>
              <strong>A tiny signature in a large white image.</strong> Crop close to the ink so the signature fills the frame;
              &ldquo;miniature&rdquo; signatures are rejected.
            </li>
            <li>
              <strong>Signature over 20 KB.</strong> Large, grey phone photos of paper are often 1–3 MB. The tool brings
              them under 20 KB; whitening the paper helps.
            </li>
            <li>
              <strong>Uploading a PNG.</strong> SSC asks for JPEG/JPG. This tool always saves JPG.
            </li>
          </ul>

          <h2>SSC-specific tips</h2>
          <ul>
            <li>
              Printed photos are still needed later: the CGL 2026 notice asks for two recent passport-size colour photographs at
              document verification, and the CHSL 2026 notice asks candidates who couldn&apos;t complete Aadhaar authentication to
              carry two to the examination centre.
            </li>
            <li>Keep a copy of the signature file: you may need the same signature for later stages.</li>
            <li>
              Need only a 20 KB file without cropping or clean-up? Use the <Link href="/tools/20kb-photo">20KB photo resizer</Link>.
              For general signature work, the <Link href="/tools/signature-resizer">signature resizer</Link> offers transparent
              backgrounds and PNG.
            </li>
          </ul>

          <h2>How we keep this page accurate</h2>
          <p>
            The requirements shown above are copied from SSC&apos;s own notices, with links and the date we last read them. When
            SSC publishes a new notice we update the data, the date and this page. If a notice for your exam differs, follow the
            notice. Read more about <Link href="/methodology">how the tools work</Link>.
          </p>

          <PrivacyNote>
            <p>
              Your signature is processed in your browser and is never uploaded to or stored by this site. Upload it only to the
              official SSC portal.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <div className="space-y-6">
        <RequirementSummary heading="SSC Photo and Signature Requirements" app={app} />
        <RequirementPhotoTool tool="ssc-photo" sets={app.sets} setLabel="SSC examination" appName="SSC" />
      </div>
    </ToolPageShell>
  );
}
