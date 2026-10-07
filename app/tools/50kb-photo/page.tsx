import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { TargetSizeTool } from "@/components/tools/target-size-tool";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("50kb-photo");

const description =
  "Make a photo under 50KB that still shows a clear face. Built for application forms: preset 50 KB target, honest results, optional width limit. No upload.";

export const metadata: Metadata = pageMetadata({
  title: "Resize Image to 50KB Online – Free 50KB Image Compressor",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How do I make my photo less than 50KB?",
    answer:
      "Add the photo; the target is already 50 KB. Select Resize to 50 KB. The tool keeps the full size if a good quality level fits, and otherwise reduces the dimensions slightly while keeping the face sharp. You see the final KB before downloading.",
  },
  {
    question: "My form says “between 20 KB and 50 KB”. Will the result be above 20 KB?",
    answer:
      "In almost every case. The tool uses as much of the 50 KB as it can, so a normal photo usually lands between about 40 and 50 KB. Check the size shown on the result card. If a very plain image ends up below the minimum, choose a larger, more detailed photo.",
  },
  {
    question: "Does reducing the dimensions reduce the file size?",
    answer:
      "Yes, strongly. File size grows roughly with the number of pixels, so halving the width and height cuts the size to about a quarter. That's why a 12-megapixel phone photo can't stay full size at 50 KB without heavy blockiness.",
  },
  {
    question: "Why does my 50KB photo look blurry?",
    answer:
      "Usually because the face is small in the frame, so most of the 50 KB is spent on background. Crop to head and shoulders first, then resize. Blur can also come from the original photo itself; reducing size can't add sharpness.",
  },
  {
    question: "The form needs 200 × 230 pixels and under 50 KB. What do I do?",
    answer:
      "Use a tool that applies both at once: the IBPS and SBI photo pages crop to that shape, output exactly 200 × 230 pixels and keep the file within 20–50 KB, as their current notifications specify.",
  },
  {
    question: "Which format should I choose?",
    answer:
      "JPG, unless the form asks for something else. It's accepted almost everywhere and compresses photos efficiently. WebP is smaller still but many government and recruitment portals don't accept it.",
  },
  {
    question: "Is compressing an image to 50KB the same as resizing it to 50KB?",
    answer:
      "Here they're the same job. The tool first lowers the JPG quality, which is compression, and only reduces the pixel dimensions if quality alone can't reach 50 KB at a level that still looks good. A signature scan usually stays full size, while a 12-megapixel photo in our tests came down to about 991 × 743 pixels.",
  }
];

export default function FiftyKbPhotoPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Resize Image to 50KB Online"
      intro={
        <p>
          Under 50 KB is a common limit for photos on recruitment, exam and admission forms. It&apos;s enough for a clear,
          passport-style photo if the image is prepared well. Add your photo and the tool finds the best version under 50 KB,
          entirely in your browser.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to Resize an Image to 50KB</h2>
          <ol>
            <li>
              <Link href="/tools/image-cropper">Crop the photo</Link> to head and shoulders. A larger face means a clearer
              result at the same file size.
            </li>
            <li>Add it here. 50 KB is preselected; quick picks of 30, 40, 75 and 100 KB are next to it.</li>
            <li>Select <strong>Resize to 50 KB</strong>.</li>
            <li>Check the result card: the result size, how much was saved, and whether the dimensions changed.</li>
            <li>Download the JPG and upload it to your form.</li>
          </ol>

          <h2>Compress an Image to 50KB</h2>
          <p>
            With 50 KB, quality stays high and only large photos need to shrink. Results from our test images (detailed and
            noisy, so a harder case than most real photos):
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Starting image</th>
                <th scope="col">Result under 50 KB</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>12-megapixel phone photo (4000 × 3000)</td>
                <td>about 991 × 743 px at 78% quality</td>
              </tr>
              <tr>
                <td>Portrait photo (1200 × 1600)</td>
                <td>about 677 × 902 px at 78% quality</td>
              </tr>
              <tr>
                <td>Signature scan (1400 × 700)</td>
                <td>kept at 1400 × 700 px, 86% quality</td>
              </tr>
            </tbody>
          </table>
          <p>
            Forms that ask for a 50 KB photo rarely need more than a few hundred pixels across, so these sizes are more than
            enough for a face to be recognisable. If you&apos;d rather pick the quality yourself without a fixed target, use the{" "}
            <Link href="/tools/image-compressor">image compressor</Link>; for a limit other than 50 KB, use{" "}
            <Link href="/tools/resize-image-to-kb">resize image to KB</Link>.
          </p>

          <h2>Common problems with 50KB uploads</h2>
          <ul>
            <li>
              <strong>&ldquo;File size should be between 20 KB and 50 KB&rdquo; but the form still rejects it:</strong> check the
              format (JPG) and any pixel size the form also requires. Some portals count 1 KB as 1,000 bytes; set a custom
              target of 48 KB to leave a margin.
            </li>
            <li>
              <strong>The photo is sideways:</strong> phones store rotation separately. The tool applies it automatically, so
              the downloaded file is the right way up.
            </li>
            <li>
              <strong>Transparent PNG turned white:</strong> JPG has no transparency, so transparent areas become white,
              which is what most forms want for photos anyway.
            </li>
            <li>
              <strong>Result shows &ldquo;Closest achievable size&rdquo;:</strong> dimension changes are switched off and the image is
              too large to fit. Turn them on, or crop first.
            </li>
          </ul>

          <h2>Quality tips for a face at 50KB</h2>
          <ul>
            <li>Shoot in daylight facing a window; noise from dim light costs a lot of bytes.</li>
            <li>A plain white or light wall compresses much better than a patterned one.</li>
            <li>Don&apos;t use beauty filters or heavy sharpening; they add detail the encoder must store.</li>
            <li>
              Use &ldquo;More options&rdquo; to cap the width (for example 600 px) if the form prefers a small image; the
              remaining budget then goes to quality.
            </li>
          </ul>

          <h2>Reduce JPG Image Size to 50KB</h2>
          <p>
            For a JPG portrait, 50 KB is enough to keep a face sharp at the few hundred pixels most forms display. The tool
            holds the quality around 78% or higher and trims the dimensions only as far as needed. A scanned document page
            with fine text is harder: if letters look soft, crop away the margins first so more of the 50 KB goes to the text.
          </p>

          <h2>Reduce PNG Image Size to 50KB</h2>
          <p>
            A PNG photo or screenshot is converted to JPG on the way, since a lossless PNG of a photo is usually many times
            larger than 50 KB. Any transparent background is filled with white. Choose WebP as the output format only if the
            site you&apos;re uploading to accepts it.
          </p>

          <h2>Image Requirements for Online Forms</h2>
          <p>
            Current IBPS Common Recruitment Process notifications and SBI recruitment advertisements ask for a photo of 20–50
            KB at 200 × 230 pixels (preferred). The <Link href="/tools/ibps-photo">IBPS photo resizer</Link> and{" "}
            <Link href="/tools/sbi-photo">SBI photo resizer</Link> apply those exact values and cite the notification. Need
            something smaller, such as a signature? Use the <Link href="/tools/20kb-photo">20KB photo resizer</Link>. Allowed
            more room? The <Link href="/tools/100kb-photo">100KB photo resizer</Link> keeps more detail.
          </p>

          <PrivacyNote>
            <p>
              Your photo is compressed by your own browser. It isn&apos;t uploaded, stored or seen by anyone else.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <TargetSizeTool
        tool="50kb-photo"
        defaultTargetKB={50}
        presetsKB={[30, 40, 50, 75, 100]}
        events={{ started: "kb_photo_started", completed: "kb_photo_completed", downloaded: "photo_downloaded" }}
      />
    </ToolPageShell>
  );
}
