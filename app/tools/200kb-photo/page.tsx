import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { TargetSizeTool } from "@/components/tools/target-size-tool";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("200kb-photo");

const description =
  "Compress a large photo to 200KB while keeping high resolution. Preset 200 KB target, optional width cap, exact result size shown. Free, in your browser.";

export const metadata: Metadata = pageMetadata({
  title: "200KB Photo Resizer – Resize Image to 200KB Online",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How do I compress a photo to 200KB?",
    answer:
      "Add the photo; 200 KB is already selected. Select Resize to 200 KB. With this much room, many photos keep their full dimensions and only the quality is adjusted. Large phone photos are reduced to a resolution that still looks sharp on any screen.",
  },
  {
    question: "Why is my photo a few KB under 200KB?",
    answer:
      "The tool picks the highest quality that keeps the file at or below 200 KB. Quality comes in steps, so the result usually lands slightly under the limit, such as 196 KB. The exact size is always the size of the file you download.",
  },
  {
    question: "Will a 12MP photo still look good at 200KB?",
    answer:
      "Yes, for screens. In our tests a detailed 4000 × 3000 photo fitted 200 KB at about 1670 × 1250 pixels with 78% quality, larger than most laptop displays. It won't keep all 12 megapixels; for large prints, keep the original.",
  },
  {
    question: "Does reducing dimensions help reach 200KB?",
    answer:
      "Yes. Size scales with pixel count, so a slightly smaller image saves a lot. If your form doesn't fix the pixel size, leave “Allow smaller dimensions” on so the tool can balance size and quality.",
  },
  {
    question: "My photo is already smaller than 200KB. What happens?",
    answer:
      "If it's already a JPG under 200 KB, the tool returns your original file unchanged rather than re-compressing it, and tells you so. A PNG or WebP under 200 KB is converted to JPG because you asked for a JPG output.",
  },
  {
    question: "What format works best at 200KB?",
    answer:
      "JPG for photos. It's widely accepted and efficient. WebP gives slightly smaller files at the same quality, but check that the site you're uploading to accepts it.",
  },
];

export default function TwoHundredKbPhotoPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="200KB Photo Resizer: Compress a Photo to 200KB"
      intro={
        <p>
          200 KB gives you room for a detailed, high-resolution photo, about the right size for portals that accept larger
          images, online listings, email and shared albums. Add a photo and get the sharpest version under 200 KB, with the
          real file size shown. Your image stays on your device.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to resize a photo to 200KB</h2>
          <ol>
            <li>Add your photo. JPG, PNG and WebP are supported; 200 KB is preselected.</li>
            <li>
              If the photo must not exceed a certain width (some sites list a maximum, such as 1920 px), set it under{" "}
              <strong>More options</strong>.
            </li>
            <li>Select <strong>Resize to 200 KB</strong>.</li>
            <li>Check the dimensions and quality in the comparison, then download.</li>
          </ol>

          <h2>What 200KB keeps</h2>
          <p>
            At 200 KB the tool rarely has to compromise much. It can usually keep quality around 70–90% and either the full size
            or a large share of it. From our test images (deliberately detailed and noisy):
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Starting image</th>
                <th scope="col">Result under 200 KB</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>12-megapixel photo (4000 × 3000)</td>
                <td>about 1672 × 1254 px at 78% quality</td>
              </tr>
              <tr>
                <td>Portrait photo (1200 × 1600)</td>
                <td>full 1200 × 1600 px at 68% quality</td>
              </tr>
              <tr>
                <td>Screenshot (1280 × 800)</td>
                <td>full size at 92% quality, well under 200 KB</td>
              </tr>
            </tbody>
          </table>
          <p>
            Notice the portrait: with dimensions that are already moderate, the tool kept every pixel and lowered quality a
            little instead. That&apos;s the balance it looks for: full size when a reasonable quality fits, smaller dimensions
            when it doesn&apos;t.
          </p>

          <h2>Typical uses for a 200KB limit</h2>
          <ul>
            <li>
              <strong>Application portals with generous limits.</strong> For example, the NEET (UG) 2026 information bulletin
              allows a photograph of 10–200 KB. The <Link href="/tools/neet-photo">NEET photo resizer</Link> applies that range
              and lists the source.
            </li>
            <li>
              <strong>Listings and marketplaces</strong> where large photos slow pages down.
            </li>
            <li>
              <strong>Email and messaging</strong>, so several photos fit under attachment limits.
            </li>
          </ul>

          <h2>Tips for large originals</h2>
          <ul>
            <li>
              Very large files (20–50 MB) are fine: decoding happens on your device, and images up to 100 megapixels are
              accepted.
            </li>
            <li>
              Resizing a whole album? The <Link href="/tools/bulk-image-resizer">bulk image resizer</Link> resizes many photos to
              a width at once; then fine-tune any that are still over 200 KB here.
            </li>
            <li>
              If the exact pixel size matters more than the KB value, start with the{" "}
              <Link href="/tools/image-resizer">image resizer</Link>.
            </li>
          </ul>

          <h2>Smaller targets</h2>
          <p>
            For tighter limits use the <Link href="/tools/100kb-photo">100KB photo resizer</Link> or{" "}
            <Link href="/tools/50kb-photo">50KB photo resizer</Link>. For any other value, such as 150 KB or 1 MB, use{" "}
            <Link href="/tools/resize-image-to-kb">resize image to an exact KB size</Link>.
          </p>

          <PrivacyNote>
            <p>Large personal photos never leave your device: decoding, resizing and every compression attempt happen locally.</p>
          </PrivacyNote>
        </>
      }
    >
      <TargetSizeTool
        tool="200kb-photo"
        defaultTargetKB={200}
        presetsKB={[100, 150, 200, 300, 500]}
        events={{ started: "kb_photo_started", completed: "kb_photo_completed", downloaded: "photo_downloaded" }}
      />
    </ToolPageShell>
  );
}
