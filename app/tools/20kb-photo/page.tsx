import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { TargetSizeTool } from "@/components/tools/target-size-tool";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("20kb-photo");

const description =
  "Resize a photo or signature to 20KB or less in your browser. The tool finds the best quality that fits, shows the exact result in KB and never uploads your image.";

export const metadata: Metadata = pageMetadata({
  title: "20KB Photo Resizer – Resize Image to 20KB Online",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How can I resize a photo to 20KB?",
    answer:
      "Add your photo; the target is already set to 20 KB. Select Resize to 20 KB and the tool tries high quality first, lowers quality step by step, and reduces the pixel size only if quality alone can't get under 20 KB. The result shows the exact size before you download.",
  },
  {
    question: "Why is my photo smaller than 20KB, not exactly 20KB?",
    answer:
      "JPG files can only be saved at certain quality steps, and each step changes the size unevenly. The tool returns the best-looking file at or below 20 KB, for example 19.4 KB. Forms check a maximum, so a file slightly under the limit is what you want. The exact byte count is always shown.",
  },
  {
    question: "Can every photo be reduced to 20KB?",
    answer:
      "Almost always, if the pixel size may shrink. If you turn off “Allow smaller dimensions” and the photo is large and detailed, it may not fit even at the lowest quality. Then the tool shows the closest achievable size and explains why instead of pretending it worked.",
  },
  {
    question: "What size in pixels will a 20KB photo be?",
    answer:
      "It depends on how detailed the photo is. In our tests, a noisy 12-megapixel photo fitted 20 KB at about 600 × 450 pixels, and a 1200 × 1600 portrait at about 510 × 680 pixels. A clean signature on white paper keeps far more pixels, because plain backgrounds compress very well.",
  },
  {
    question: "Is 20KB enough for a signature?",
    answer:
      "Usually yes. Signatures are mostly white space, so they compress very well. Several recruitment forms ask for signatures of 10–20 KB. Crop tightly and whiten the paper first with the signature resizer for the cleanest result.",
  },
  {
    question: "Should I use JPG or PNG for a 20KB limit?",
    answer:
      "JPG. It reaches small sizes far better than PNG for photos, and nearly every form accepts it. PNG is lossless, so a PNG photo rarely gets near 20 KB without becoming tiny.",
  },
  {
    question: "Can I compress an image to 20KB without making it smaller in pixels?",
    answer:
      "Only if the image is small or simple to begin with. Turn off Allow smaller dimensions and the tool will only lower the quality; if 20 KB still can't be reached, it says so and shows the closest size. For a full phone photo, 20 KB is too little to keep every pixel, which is why our 12-megapixel test photo ended at about 606 × 455 pixels.",
  }
];

export default function TwentyKbPhotoPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="20KB Photo Resizer: Reduce a Photo or Signature to 20KB"
      intro={
        <p>
          20 KB is one of the tightest limits you&apos;ll meet on upload forms, often for signatures and small ID photos. Add
          your image and the tool finds the sharpest version that fits under 20 KB, then shows the real file size before you
          download. Your image never leaves your device.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to resize an image to 20KB</h2>
          <ol>
            <li>Crop first if you can: everything outside the face or signature still uses up your 20 KB.</li>
            <li>Add the photo here. The target is already set to 20 KB.</li>
            <li>
              Keep <strong>Allow smaller dimensions</strong> on unless the form fixes the pixel size.
            </li>
            <li>Select <strong>Resize to 20 KB</strong> and check the result card: original size, target, result and saving.</li>
            <li>Zoom into the preview to check the face or strokes are still clear, then download.</li>
          </ol>

          <h2>What fits in 20KB</h2>
          <p>
            20 KB is about 20,000 bytes for every pixel, colour and edge in the image. That is plenty for a small photo or a
            signature, but not for a full-resolution phone picture. Here is what the tool produced from our test images
            (deliberately detailed and noisy, so real photos often keep a little more):
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Starting image</th>
                <th scope="col">Result under 20 KB</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>12-megapixel photo (4000 × 3000)</td>
                <td>about 606 × 455 px at 78% quality</td>
              </tr>
              <tr>
                <td>Portrait photo (1200 × 1600)</td>
                <td>about 510 × 680 px at 78% quality</td>
              </tr>
              <tr>
                <td>Signature photographed on grey paper (1400 × 700)</td>
                <td>about 800 × 400 px at 79% quality</td>
              </tr>
            </tbody>
          </table>
          <p>
            The pattern: at 20 KB the tool keeps quality reasonable and reduces dimensions instead. A smaller, sharp image looks
            much better than a full-size one crushed into blocky squares.
          </p>

          <h2>When 20KB doesn&apos;t work out</h2>
          <ul>
            <li>
              <strong>&ldquo;Closest achievable size&rdquo; appears:</strong> you turned off smaller dimensions and the image is too
              detailed at its current size. Turn it back on, or crop tighter.
            </li>
            <li>
              <strong>The form says the file is too large, but it shows under 20 KB:</strong> some sites count 1 KB as 1,000
              bytes. This tool uses 1,024. Set a custom target such as 19 KB to be safe.
            </li>
            <li>
              <strong>The form also needs a minimum, like 10 KB:</strong> a 20 KB target normally lands well above 10 KB. If
              it doesn&apos;t, your image is very simple; that&apos;s rarely a problem for photos.
            </li>
            <li>
              <strong>Exact pixels required as well:</strong> set them with the{" "}
              <Link href="/tools/image-resizer">image resizer</Link> first, then come back with &ldquo;Allow smaller dimensions&rdquo;
              turned off.
            </li>
          </ul>

          <h2>Getting the best quality at 20KB</h2>
          <ul>
            <li>Use a plain, light background. Busy backgrounds eat the size budget.</li>
            <li>
              For signatures, clean the paper to pure white first with the{" "}
              <Link href="/tools/signature-resizer">signature resizer</Link>; it can also hit a KB limit directly.
            </li>
            <li>Use the &ldquo;More options&rdquo; panel to set a maximum width if the form expects a specific size range.</li>
            <li>
              If 20 KB isn&apos;t a hard limit, a larger target looks better: try the{" "}
              <Link href="/tools/50kb-photo">50KB photo resizer</Link>.
            </li>
          </ul>

          <h2>Forms that use small limits</h2>
          <p>
            Small limits are common on recruitment and exam applications. For example, current IBPS and SBI notifications ask
            for signatures of 10–20 KB, and SSC asks for a 10–20 KB signature. Each of those pages lists the official source:{" "}
            <Link href="/tools/ssc-photo">SSC photo and signature</Link>, <Link href="/tools/ibps-photo">IBPS photo</Link>{" "}
            and <Link href="/tools/sbi-photo">SBI photo</Link>. For any other size, use{" "}
            <Link href="/tools/resize-image-to-kb">resize image to an exact KB size</Link>.
          </p>

          <PrivacyNote>
            <p>
              Small-limit uploads are usually personal: signatures and ID photos. The whole size search runs in your browser,
              and nothing is uploaded or stored.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <TargetSizeTool
        tool="20kb-photo"
        defaultTargetKB={20}
        presetsKB={[10, 15, 20, 30, 50]}
        events={{ started: "kb_photo_started", completed: "kb_photo_completed", downloaded: "photo_downloaded" }}
      />
    </ToolPageShell>
  );
}
