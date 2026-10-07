import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { TargetSizeTool } from "@/components/tools/target-size-tool";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("100kb-photo");

const description =
  "Reduce a photo to 100KB online while keeping it sharp. See the before and after size, dimensions and quality, then download. Runs in your browser, no upload.";

export const metadata: Metadata = pageMetadata({
  title: "100KB Photo Resizer – Resize Image to 100KB Online",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How do I reduce a photo to 100KB?",
    answer:
      "Add the photo. The target is set to 100 KB, so select Resize to 100 KB. The tool first tries the photo at full size and high quality, then lowers quality, and only if needed reduces the dimensions. The result card shows the original size, the result and the percentage saved.",
  },
  {
    question: "Why isn't the result exactly 100KB?",
    answer:
      "Image encoders work in quality steps, and each step changes the file size by an amount that depends on the picture. So the tool aims for the best result at or below 100 KB, for example 97.8 KB, and shows the exact byte count. It never displays a rounded-down number: a file shown as 100.0 KB is at most 102,400 bytes.",
  },
  {
    question: "Will my photo keep its full resolution at 100KB?",
    answer:
      "Smaller photos usually do. A full 12-megapixel phone photo doesn't: in our tests a detailed 4000 × 3000 photo fitted 100 KB at about 1245 × 933 pixels, which is still plenty for screens and most forms. Turn off “Allow smaller dimensions” if you must keep the original size; quality then drops instead.",
  },
  {
    question: "How do I reduce photo size without losing too much quality?",
    answer:
      "Let the tool reduce dimensions rather than forcing quality down. Crop away unneeded background, avoid noisy low-light photos, and don't upscale small images. For most uses, a 1000–1500 pixel wide image at 75–85% quality looks clean at 100 KB.",
  },
  {
    question: "The application rejected my 100KB photo. What should I check?",
    answer:
      "Check the four things forms usually validate: file size (some count 1 KB as 1,000 bytes, so try 97 KB), format (most want JPG), pixel dimensions (some require an exact size), and content rules such as background colour or a recent photo. This tool handles the first two; the requirements page of the specific application tells you the rest.",
  },
  {
    question: "Is 100KB good quality for a photo?",
    answer:
      "For viewing on screens, yes: 100 KB holds a sharp image around 1000–1200 pixels wide. It's not enough for large prints. For printing, keep the original.",
  },
  {
    question: "Should I compress or resize to get under 100KB?",
    answer:
      "Let the tool decide unless the form fixes the pixel size. It tries compression first and keeps the quality level high (around 78% or more) by also reducing the dimensions when needed: our 12-megapixel test photo became about 1245 × 933 pixels. If the dimensions must stay the same, turn off Allow smaller dimensions and the tool only compresses.",
  }
];

export default function HundredKbPhotoPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="100KB Photo Resizer: Resize Any Image to 100KB"
      intro={
        <p>
          100 KB is a popular upload limit for profile pictures, job portals and application forms, and it&apos;s a comfortable
          size: big enough for a sharp photo, small enough to upload quickly. Add your image and get the best version under 100
          KB with a clear before-and-after comparison. Nothing is uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to reduce an image to 100KB</h2>
          <ol>
            <li>Add, drop or paste a JPG, PNG or WebP photo. 100 KB is preselected.</li>
            <li>
              Leave <strong>Allow smaller dimensions</strong> on for the best-looking result, or turn it off if the pixel size
              must stay the same.
            </li>
            <li>
              Optional: open <strong>More options</strong> to set a maximum width or a quality ceiling.
            </li>
            <li>Select <strong>Resize to 100 KB</strong>.</li>
            <li>
              Compare before and after: original size, target, result, saving, dimensions and quality are all shown. Then
              download.
            </li>
          </ol>

          <h2>Why the result varies slightly</h2>
          <p>
            You can&apos;t ask a JPG encoder for &ldquo;exactly 100 KB&rdquo;. You choose a quality level, and the file size follows
            from the picture: smooth skies compress tiny, while grass, hair and low-light noise produce big files. So the tool
            searches. It encodes the photo, measures the real file, adjusts, and repeats, up to about 20 times, keeping the best
            version that is at or below your target. That&apos;s why two photos with the same dimensions can end at 96 KB and
            99.6 KB. If no setting can reach 100 KB, for example with dimensions locked on a very detailed photo, the tool says
            so and shows the closest achievable size.
          </p>

          <h2>How dimensions affect file size</h2>
          <p>
            File size grows roughly with the number of pixels. A 4000 × 3000 photo has 12 million pixels; at 1000 × 750 it has
            under a million, about 1/16th, and the file shrinks in proportion. That&apos;s why the tool prefers to reduce
            dimensions modestly rather than crush quality. Results from our test images (deliberately detailed, so real photos
            often keep more):
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Starting image</th>
                <th scope="col">Result under 100 KB</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>12-megapixel photo (4000 × 3000)</td>
                <td>about 1245 × 933 px at 78% quality</td>
              </tr>
              <tr>
                <td>Photo (1600 × 1200)</td>
                <td>about 938 × 703 px at 78% quality</td>
              </tr>
              <tr>
                <td>Portrait (1200 × 1600)</td>
                <td>about 862 × 1149 px at 78% quality</td>
              </tr>
              <tr>
                <td>Screenshot (1280 × 800)</td>
                <td>kept at 1280 × 800 px, 92% quality</td>
              </tr>
            </tbody>
          </table>

          <h2>How to keep the quality high</h2>
          <ul>
            <li>
              <strong>Crop before compressing.</strong> Cutting away empty background gives the remaining pixels more of the
              budget. The <Link href="/tools/image-cropper">image cropper</Link> does this in seconds.
            </li>
            <li>
              <strong>Start from the original,</strong> not a photo that&apos;s already been compressed by a messaging app;
              repeated compression adds artefacts.
            </li>
            <li>
              <strong>Don&apos;t enlarge small images</strong> to look &ldquo;bigger&rdquo;: it adds file size without detail.
            </li>
            <li>
              <strong>Want a smaller file but no fixed target?</strong> The <Link href="/tools/image-compressor">image
              compressor</Link> lets you choose quality directly.
            </li>
          </ul>

          <h2>If an application rejects your image</h2>
          <ol>
            <li>
              <strong>Size:</strong> some systems use 1 KB = 1,000 bytes, so 100 KB to them is 97.6 KB here. Choose Custom and
              enter 97.
            </li>
            <li>
              <strong>Format:</strong> most forms want JPG. Don&apos;t rename a PNG to .jpg; convert it, which this tool does.
            </li>
            <li>
              <strong>Pixel size:</strong> if the form specifies width and height, set them first with the{" "}
              <Link href="/tools/image-resizer">image resizer</Link>, then come back with &ldquo;Allow smaller dimensions&rdquo; off.
            </li>
            <li>
              <strong>Content rules:</strong> background colour, a recent photo, no glasses and so on. Exam and passport pages
              such as <Link href="/tools/neet-photo">NEET photo</Link> and{" "}
              <Link href="/tools/passport-photo">passport photo requirements</Link> list those rules with their official
              sources.
            </li>
          </ol>

          <h2>Other common sizes</h2>
          <p>
            Tighter limit? Use the <Link href="/tools/50kb-photo">50KB photo resizer</Link> or the{" "}
            <Link href="/tools/20kb-photo">20KB photo resizer</Link>. More room, for higher-resolution uploads? Try the{" "}
            <Link href="/tools/200kb-photo">200KB photo resizer</Link>. Any other number works with{" "}
            <Link href="/tools/resize-image-to-kb">resize image to an exact KB size</Link>.
          </p>

          <PrivacyNote>
            <p>
              Every encode in the size search happens in your browser on your device. Your photo is never uploaded, and nothing
              is kept after you close the page.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <TargetSizeTool
        tool="100kb-photo"
        defaultTargetKB={100}
        presetsKB={[50, 75, 100, 150, 200]}
        events={{ started: "kb_photo_started", completed: "kb_photo_completed", downloaded: "photo_downloaded" }}
      />
    </ToolPageShell>
  );
}
