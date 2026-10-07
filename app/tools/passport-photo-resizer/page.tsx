import type { Metadata } from "next";
import Link from "next/link";
import { PassportPhotoTool } from "@/components/tools/passport-photo-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { PHOTO_PRESETS, PRINT_DPI } from "@/lib/presets/photo-presets";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("passport-photo-resizer");

const description =
  "Crop and resize a photo for a passport, visa or ID application. Set the size in mm, inches or pixels plus a KB limit, or use an officially sourced preset.";

export const metadata: Metadata = pageMetadata({
  title: "Passport Photo Resizer – Resize Photos for Passport & Visa",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "What size is a passport photo?",
    answer:
      "There is no single size. Each country, and often each application type, sets its own rules: the UK asks for 35 × 45 mm printed photos while Canada asks for 50 × 70 mm, and online applications usually specify pixel dimensions and a file size range instead. Always use the numbers in the official instructions for your application.",
  },
  {
    question: "Does this tool guarantee my photo will be accepted?",
    answer:
      "No. It sets the dimensions, file type and file size you choose. Authorities also check things a resizing tool can't judge, such as lighting, expression, glasses, head position, background and how recent the photo is. Requirements vary by country and application, so verify the final image against the official requirements before submitting.",
  },
  {
    question: "How do I convert millimetres to pixels for a passport photo?",
    answer: `Pixels = millimetres ÷ 25.4 × DPI. At ${PRINT_DPI} DPI, the common print resolution, 35 × 45 mm is 413 × 531 pixels. Choose Millimetres in Custom size and the tool does the conversion, and records the DPI in the JPG so it prints at the right physical size.`,
  },
  {
    question: "My form needs the photo under 50 KB. Can this do that?",
    answer:
      "Yes. Enter 50 as the maximum file size. The tool keeps the exact pixel dimensions and finds the highest JPG quality that fits. If it can't get under the limit at that size, it tells you instead of silently shrinking the photo.",
  },
  {
    question: "Can it change the background to white?",
    answer:
      "No. Replacing a background reliably needs person-detection technology, and many authorities don't allow edited photos. Take the photo against a plain, evenly lit wall in the colour your application asks for.",
  },
  {
    question: "Why are only a few countries listed?",
    answer:
      "A preset is only added after its numbers are checked against the issuing government's own website, with the source and the date shown. For other countries and applications, copy the size from the official instructions into Custom size.",
  },
  {
    question: "Is my photo uploaded?",
    answer: "No. Cropping, resizing and compression all run in your browser. Your photo is never sent to a server.",
  },
];

export default function PassportPhotoResizerPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Passport Photo Resizer"
      intro={
        <p>
          Crop and resize a photo to the exact size your passport, visa or ID application asks for, in millimetres, inches or
          pixels, with an optional KB limit. Your photo stays on your device.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to prepare a passport photo</h2>
          <ol>
            <li>Find the photo requirements in the official instructions for your application.</li>
            <li>
              Choose a matching preset, or select <strong>Custom size</strong> and enter the width, height, unit and any file
              size limits.
            </li>
            <li>Add your photo. The crop box is locked to the required shape.</li>
            <li>Move and zoom so your head is centred and sized as the rules describe; use the dashed oval as a guide.</li>
            <li>Select Create photo, check the result, and download the JPG.</li>
          </ol>

          <h2>Requirements differ by country and application</h2>
          <p>
            A printed photo for one country&apos;s passport, a digital photo for the same country&apos;s online renewal, and a
            visa photo for another country can all have different dimensions, head-size rules, backgrounds and file limits.
            That&apos;s why this tool doesn&apos;t assume a universal &ldquo;passport size&rdquo;. Typical requirements include:
          </p>
          <ul>
            <li>
              <strong>Dimensions</strong>, either physical (mm or inches) for printed photos or in pixels for online forms.
            </li>
            <li>
              <strong>File size</strong> limits for uploads, sometimes with a minimum as well as a maximum.
            </li>
            <li>
              <strong>Head size and position</strong>, for example the distance from chin to crown as a share of the photo
              height.
            </li>
            <li>
              <strong>Background</strong> colour and evenness, lighting, expression and recency.
            </li>
          </ul>

          <h2>Presets checked against official sources</h2>
          <p>
            Each preset quotes the issuing government&apos;s website and shows when it was last checked. Rules change, so
            follow the link and confirm before you apply.
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Preset</th>
                <th scope="col">Output</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {PHOTO_PRESETS.map((preset) => (
                <tr key={preset.id}>
                  <td>
                    {preset.country} – {preset.document}
                  </td>
                  <td>
                    {preset.widthMm && preset.heightMm ? `${preset.widthMm} × ${preset.heightMm} mm (` : ""}
                    {preset.widthPx} × {preset.heightPx} px{preset.widthMm ? ")" : ""}
                    {preset.minKB || preset.maxKB
                      ? `, ${preset.minKB ? `${preset.minKB} KB` : "0"}–${preset.maxKB ? (preset.maxKB >= 1024 ? `${preset.maxKB / 1024} MB` : `${preset.maxKB} KB`) : "any"}`
                      : ""}
                  </td>
                  <td>
                    <a href={preset.source.url} target="_blank" rel="noopener noreferrer">
                      {preset.source.name}
                    </a>{" "}
                    (verified {preset.lastVerified})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Background and lighting guidance</h2>
          <ul>
            <li>Stand about half a metre in front of a plain wall in the colour your application asks for, often white, cream or light grey.</li>
            <li>Face a window or use soft, even light so there are no shadows on your face or behind you.</li>
            <li>Keep a neutral expression, look straight at the camera, and keep hair away from your eyes.</li>
            <li>Ask someone else to take the photo from head height; selfies distort facial proportions.</li>
          </ul>
          <p>This tool doesn&apos;t retouch or replace backgrounds, because many authorities reject edited photos.</p>

          <p>
            Not sure of your country&apos;s rules? <Link href="/tools/passport-photo">Compare passport photo requirements by
            country</Link>, each with its official source.
          </p>

          <h2>Printed vs digital photos</h2>
          <p>
            For printed photos, the tool records the resolution ({PRINT_DPI} DPI by default) in the JPG, so a 35 × 45 mm photo
            prints at that size when you choose &ldquo;actual size&rdquo; or 100% in the print dialog. For online applications,
            the pixel dimensions and file size are what matter. If you only need to hit a file size, use{" "}
            <Link href="/tools/resize-image-to-kb">resize image to KB</Link>; for general framing, the{" "}
            <Link href="/tools/image-cropper">image cropper</Link> offers free and fixed ratios; and to simply make a photo
            smaller, <Link href="/tools/image-compressor">compress the image</Link>.
          </p>

          <PrivacyNote>
            <p>
              Identity photos are sensitive. Your photo is cropped, resized and compressed by your own browser and is never
              uploaded or stored by us.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <PassportPhotoTool />
    </ToolPageShell>
  );
}
