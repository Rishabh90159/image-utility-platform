import type { Metadata } from "next";
import Link from "next/link";
import { ImageResizerTool } from "@/components/tools/image-resizer-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("resize-jpg");

const description =
  "Resize JPG and JPEG photos to exact pixels or a percentage, choose the JPG quality and an optional print DPI, then download. Free, and done in your browser.";

export const metadata: Metadata = pageMetadata({
  title: "Resize JPG Online – Change JPG Image Dimensions Free",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "Does resizing a JPG reduce its quality?",
    answer:
      "Every time a JPG is saved it is compressed again, so some detail is always lost. At 90% quality the difference is very hard to see, and making the photo smaller usually hides it completely. Avoid resizing the same JPG over and over; go back to the original each time instead.",
  },
  {
    question: "What JPG quality should I choose?",
    answer:
      "90% suits most photos. Choose 80–85% for web pages and email, where a smaller file matters more than invisible detail. Use 95% or more only when the photo will be edited or printed again. Below about 60%, blocky artefacts start to show around edges and in skies.",
  },
  {
    question: "What does the DPI setting change?",
    answer:
      "Only the print size recorded in the file. A 3000 × 2000 pixel JPG set to 300 DPI prints at 10 × 6.67 inches; set to 150 DPI it prints at 20 × 13.3 inches. The pixels, sharpness and file size stay the same. If a form asks for 300 DPI, set it here and make sure the pixel size is big enough for the print size they want.",
  },
  {
    question: "Is JPEG different from JPG?",
    answer:
      "No. They are two names for the same format; .jpeg and .jpg files open and resize identically here. The downloaded file always uses the .jpg extension. To rename .jpeg or .jfif files without resizing, use the JPEG to JPG converter.",
  },
  {
    question: "My JPG comes out sideways on other sites. Will this fix it?",
    answer:
      "Yes. Phones often store photos sideways with a rotation tag that some websites ignore. The resizer applies that rotation to the pixels before resizing and doesn't copy the tag, so the new JPG is the right way up everywhere.",
  },
  {
    question: "Can I resize a JPG to a file size such as 100 KB?",
    answer:
      "This page sets dimensions. When a form gives a limit in KB instead, use Resize Image to KB, which searches for the quality and size that fit, or the ready-made 50 KB and 100 KB pages.",
  },
];

export default function ResizeJpgPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Resize JPG Images Online"
      intro={
        <p>
          Make a JPG or JPEG photo smaller or larger in pixels, choose how much compression the new file gets, and optionally
          record a print resolution. The photo is resized on your device and saved as a JPG that opens anywhere.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to resize a JPG</h2>
          <ol>
            <li>Choose, drop or paste a .jpg or .jpeg file.</li>
            <li>
              Type a width or height, tap one of the common widths, or switch to <strong>Percentage</strong> and enter
              something like 50%.
            </li>
            <li>Set the JPG quality. Leave it at 90% unless you need a much smaller file.</li>
            <li>For printing, pick 150 or 300 DPI and check the print size shown underneath.</li>
            <li>
              Select <strong>Resize JPG</strong>, compare the old and new sizes, and download.
            </li>
          </ol>

          <h2>What this JPG resizer does</h2>
          <ul>
            <li>Keeps the result a JPG, so it is accepted by every upload form, phone and photo app.</li>
            <li>Quality slider from 30% to 100% to trade file size against detail.</li>
            <li>Optional DPI (72, 150 or 300) written into the file header, with the resulting print size in inches and centimetres.</li>
            <li>Applies the phone&apos;s rotation tag, so portrait photos don&apos;t turn up sideways.</li>
            <li>Removes camera details and GPS location from the new file.</li>
            <li>Shows the exact KB size and how much smaller the new JPG is before you save it.</li>
          </ul>

          <h2>JPG quality and file size after resizing</h2>
          <p>
            Two settings decide how big the new JPG is: the number of pixels and the quality. Pixels matter most. Halving the
            width and height leaves a quarter of the pixels, and the file typically ends up around a quarter of its old size.
            Quality then fine-tunes it. Dropping from 95% to 85% often saves another third with no visible change, because JPG
            compression throws away detail the eye barely notices first.
          </p>
          <p>
            Photos straight from a phone are usually 3000–4000 pixels wide and 2–6 MB. For a web page or a message, 1280 to
            1920 pixels at 80–90% quality is plenty. When the target is a KB number rather than a width, the{" "}
            <Link href="/tools/resize-image-to-kb">resize image to KB tool</Link> works out both settings for you, and the{" "}
            <Link href="/tools/image-compressor">JPG compressor</Link> shrinks a photo without touching its dimensions.
          </p>

          <h2>Setting DPI for printing</h2>
          <p>
            DPI (dots per inch) tells a printer how large to print the pixels. It is a label in the file, not a property of the
            picture, so a JPG at 72 DPI and the same JPG at 300 DPI look identical on screen. What matters for a sharp print is
            having enough pixels for the size you need at around 300 DPI:
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Print size</th>
                <th scope="col">Pixels needed at 300 DPI</th>
                <th scope="col">At 150 DPI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Passport photo, 35 × 45 mm</td>
                <td>413 × 531</td>
                <td>207 × 266</td>
              </tr>
              <tr>
                <td>6 × 4 in photo print</td>
                <td>1800 × 1200</td>
                <td>900 × 600</td>
              </tr>
              <tr>
                <td>A4 page, 210 × 297 mm</td>
                <td>2480 × 3508</td>
                <td>1240 × 1754</td>
              </tr>
            </tbody>
          </table>
          <p>
            Passport and visa photos also have rules about head size and background; the{" "}
            <Link href="/tools/passport-photo-resizer">passport photo resizer</Link> handles those in millimetres.
          </p>

          <h2>Supported files</h2>
          <p>
            This page opens .jpg and .jpeg files up to 50 MB and 100 megapixels, and always saves a .jpg. Got a
            PNG, WebP or iPhone HEIC photo instead? The <Link href="/tools/image-resizer">image resizer</Link> takes all of them,
            the <Link href="/tools/resize-png">PNG resizer</Link> keeps transparency, and{" "}
            <Link href="/tools/jpg-to-png">JPG to PNG</Link> converts without further compression.
          </p>

          <h2>Common reasons to resize a JPG</h2>
          <ul>
            <li>
              <strong>Uploads that reject large photos:</strong> marketplaces, job portals and school sites often cap width
              or megabytes.
            </li>
            <li>
              <strong>Faster web pages:</strong> a hero image rarely needs more than 1920 px; a blog image rarely more than 1280 px.
            </li>
            <li>
              <strong>Email and chat:</strong> 1600 px keeps photos clear while keeping attachments small.
            </li>
            <li>
              <strong>Printing:</strong> set the DPI a print shop or form asks for without changing the photo.
            </li>
            <li>
              <strong>A folder of photos:</strong> the <Link href="/tools/bulk-image-resizer">bulk image resizer</Link> applies
              one size to many JPGs and gives you a ZIP.
            </li>
          </ul>

          <PrivacyNote>
            <p>
              Your JPG is decoded, scaled and re-encoded by your browser. The new file is created in memory on your device and
              saved straight to your downloads; the photo is never uploaded.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <ImageResizerTool variant="jpg" />
    </ToolPageShell>
  );
}
