import type { Metadata } from "next";
import Link from "next/link";
import { FormatConverterTool, type ConverterConfig } from "@/components/tools/format-converter-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("heic-to-jpg");

const description =
  "Convert HEIC and HEIF photos from your iPhone to JPG online. Adjust quality, preview the result and download a JPG that opens anywhere. No upload.";

export const metadata: Metadata = pageMetadata({
  title: "HEIC to JPG Converter – Convert iPhone HEIC Photos to JPG",
  description,
  path: tool.path,
});

const config: ConverterConfig = {
  tool: "heic-to-jpg",
  from: ["image/heic"],
  to: "image/jpeg",
  completedEvent: "heic_conversion_completed",
};

const faqs: FaqItem[] = [
  {
    question: "Why are my iPhone photos HEIC files?",
    answer:
      "Since iOS 11, iPhones save photos as HEIC by default when the camera format is set to “High Efficiency”. HEIC stores a photo at similar visual quality in roughly half the space of a JPG, which saves storage on the phone. The trade-off is compatibility: many websites, Windows apps and upload forms still expect JPG.",
  },
  {
    question: "Does converting HEIC to JPG improve or reduce quality?",
    answer:
      "It can't improve quality: a JPG can only contain the detail that was decoded from the HEIC. Re-encoding as JPG adds a small amount of compression loss, which is hard to see at the default 90% quality. The JPG is usually larger than the HEIC because JPG compression is less efficient.",
  },
  {
    question: "Is HEIF the same as HEIC?",
    answer:
      "HEIF is the container format and HEIC is HEIF with HEVC-compressed images, which is what iPhones produce. This converter accepts both .heic and .heif files.",
  },
  {
    question: "Are my photos uploaded to convert them?",
    answer:
      "No. The HEIC decoder is downloaded to your browser once (about 2 MB) and then runs on your device. The photo itself is never sent to a server. In Safari, which can read HEIC natively, the decoder isn't needed at all.",
  },
  {
    question: "Is the photo's location and camera data kept?",
    answer:
      "No. The JPG is a new file containing only the image pixels, so EXIF metadata such as GPS location, date and camera model is not copied. That's useful when sharing photos publicly, but keep the original if you need that information.",
  },
  {
    question: "What if a HEIC file won't convert?",
    answer:
      "Some HEIC files are damaged, only partly downloaded, or use a rare HEIF variant. Try exporting the photo again from the Photos app, or AirDrop/email it as “Most Compatible”. Live Photos and bursts convert their main still image.",
  },
  {
    question: "How do I stop my iPhone taking HEIC photos?",
    answer:
      "Go to Settings > Camera > Formats and choose “Most Compatible”. New photos will then be saved as JPG. Existing HEIC photos stay HEIC, so convert those here when you need a JPG.",
  },
];

export default function HeicToJpgPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="HEIC to JPG Converter"
      intro={
        <p>
          Turn iPhone HEIC and HEIF photos into JPGs that open on Windows, websites and upload forms. Conversion happens in
          your browser, so your photos are never uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to convert HEIC to JPG</h2>
          <ol>
            <li>Choose or drop a .heic or .heif photo. The first time, the HEIC decoder loads in your browser.</li>
            <li>The photo is converted to JPG straight away at 90% quality, and you see both versions side by side.</li>
            <li>Adjust the quality if you want a smaller file, then convert again.</li>
            <li>Download the JPG.</li>
          </ol>

          <h2>What is a HEIC file?</h2>
          <p>
            HEIC (High Efficiency Image Container) is Apple&apos;s name for photos stored in the HEIF format using HEVC
            compression, the same technology used for 4K video. It keeps photos looking the same as a JPG at around half the
            file size, and it can store extras such as depth information for Portrait mode.
          </p>
          <p>
            Apple devices handle HEIC seamlessly, which is why you may only notice the format when you move photos elsewhere:
            a Windows PC without the HEIF extension, a website that rejects the file, or an application form that only
            accepts JPG.
          </p>

          <h2>HEIC vs JPG</h2>
          <table>
            <thead>
              <tr>
                <th scope="col"> </th>
                <th scope="col">HEIC</th>
                <th scope="col">JPG</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">File size</th>
                <td>Smaller at the same quality</td>
                <td>Larger</td>
              </tr>
              <tr>
                <th scope="row">Compatibility</th>
                <td>Apple devices, recent systems with add-ons</td>
                <td>Almost everything</td>
              </tr>
              <tr>
                <th scope="row">Transparency</th>
                <td>Supported</td>
                <td>Not supported</td>
              </tr>
              <tr>
                <th scope="row">Best for</th>
                <td>Storing photos on Apple devices</td>
                <td>Sharing, uploading, printing</td>
              </tr>
            </tbody>
          </table>

          <h2>When converting is useful</h2>
          <ul>
            <li>
              <strong>Upload forms and portals</strong> that accept only JPG or JPEG.
            </li>
            <li>
              <strong>Windows and older software</strong> that can&apos;t open HEIC files.
            </li>
            <li>
              <strong>Sharing with people</strong> who don&apos;t use Apple devices.
            </li>
            <li>
              <strong>Websites and online stores</strong>, where JPG is the safe choice for photos.
            </li>
          </ul>

          <h2>Quality considerations</h2>
          <p>
            HEIC and JPG are both lossy, so converting re-compresses the photo once. At 85–92% quality the difference is
            very hard to see; lower values give smaller files with softer fine detail. Converting doesn&apos;t add sharpness or
            colour that wasn&apos;t in the original, and it doesn&apos;t make an already-compressed photo look better.
          </p>
          <p>
            iPhone photos are often 3–8 MB as JPG. If a form needs something smaller,{" "}
            <Link href="/tools/image-compressor">compress the JPG</Link>,{" "}
            <Link href="/tools/image-resizer">resize it to smaller dimensions</Link>, or hit an exact limit with{" "}
            <Link href="/tools/resize-image-to-kb">resize an image to a target size in KB</Link>. Need a PNG instead? Convert
            the JPG with the <Link href="/tools/jpg-to-png">JPG to PNG converter</Link>.
          </p>
          <p>
            Converting many iPhone photos at once? The <Link href="/tools/bulk-image-resizer">bulk image resizer</Link>{" "}
            also accepts HEIC and saves them as JPG.
          </p>

          <PrivacyNote>
            <p>
              Photos from your phone can be very personal. The decoder that reads HEIC runs inside your browser, and the
              converted JPG is created on your device. Neither your photo nor its location data is uploaded.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <FormatConverterTool config={config} />
    </ToolPageShell>
  );
}
