import type { Metadata } from "next";
import Link from "next/link";
import { JpegToJpgTool } from "@/components/tools/jpeg-to-jpg-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("jpeg-to-jpg");

const description =
  "Change .jpeg, .jfif and .jpe files to .jpg, unchanged or re-saved, one at a time or in a batch. JPEG and JPG are the same format; this fixes the extension.";

export const metadata: Metadata = pageMetadata({
  title: "JPEG to JPG Converter – Convert JPEG Images to JPG Online",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "Is JPEG different from JPG?",
    answer:
      "No. They are the same image format. JPEG stands for Joint Photographic Experts Group; .jpg became common because early versions of Windows only allowed three-letter extensions. A .jpeg file renamed to .jpg is exactly the same picture.",
  },
  {
    question: "Then why convert JPEG to JPG?",
    answer:
      "Some upload forms, apps and older software check the file name and only accept .jpg. Changing the extension gets past that check without touching the picture.",
  },
  {
    question: "Does converting JPEG to JPG change the quality or size?",
    answer:
      "Not with Change extension only: the file's bytes are copied unchanged. Re-save as new JPG decodes and saves the image again at 92% quality, which can make the file slightly smaller or larger and loses a tiny amount of detail.",
  },
  {
    question: "When should I choose Re-save as new JPG?",
    answer:
      "When a phone photo appears sideways in some apps (the re-saved file is stored upright), when you want location and camera details removed, or when a picky upload form rejects the original even after renaming.",
  },
  {
    question: "What is a JFIF file?",
    answer:
      "JFIF is the most common way of packaging JPEG data, and some browsers on Windows save downloaded pictures with a .jfif extension. It's a normal JPEG, so it converts to .jpg like any other.",
  },
  {
    question: "Can I convert several files at once?",
    answer:
      "Yes. Add up to 200 files, then download them one by one or all together as a ZIP. Files that aren't really JPEGs are flagged instead of being renamed into broken .jpg files.",
  },
];

export default function JpegToJpgPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="JPEG to JPG Converter"
      intro={
        <p>
          JPEG and JPG are the same format; only the extension differs. If a form or app insists on .jpg, add your .jpeg, .jfif
          or .jpe files here to get .jpg copies, either byte-for-byte identical or freshly re-saved.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to convert JPEG to JPG</h2>
          <ol>
            <li>Choose <strong>Change extension only</strong> (recommended) or <strong>Re-save as new JPG</strong>.</li>
            <li>Add one or more files. Each is checked to confirm it really is a JPEG.</li>
            <li>Download each .jpg file, or all of them as a ZIP.</li>
          </ol>

          <h2>What each option does</h2>
          <ul>
            <li>
              <strong>Change extension only</strong> copies the file unchanged and names it .jpg. Quality, size, EXIF data
              and colour profile are all exactly as before.
            </li>
            <li>
              <strong>Re-save as new JPG</strong> creates a new file: the image is stored upright, metadata such as GPS
              location is not copied, and it&apos;s compressed at 92% quality.
            </li>
          </ul>
          <p>
            Neither option improves quality: a JPG can&apos;t become sharper by being renamed or re-saved. Files with a JPEG
            extension that actually contain PNG or WebP data are flagged, because renaming them to .jpg would produce a file
            that many programs can&apos;t open; convert those with <Link href="/tools/png-to-jpg">PNG to JPG</Link> or{" "}
            <Link href="/tools/webp-to-jpg">WebP to JPG</Link>.
          </p>

          <h2>Other things you might need</h2>
          <ul>
            <li>
              A smaller file for an upload limit: <Link href="/tools/image-compressor">image compressor</Link> or{" "}
              <Link href="/tools/resize-image-to-kb">resize image to KB</Link>.
            </li>
            <li>
              Different dimensions: <Link href="/tools/image-resizer">image resizer</Link>.
            </li>
            <li>
              A lossless copy for editing: <Link href="/tools/jpg-to-png">JPG to PNG</Link>.
            </li>
            <li>
              Several JPGs as one document: <Link href="/tools/jpg-to-pdf">JPG to PDF</Link>.
            </li>
          </ul>

          <PrivacyNote>
            <p>Files are renamed or re-saved in your browser. Nothing is uploaded.</p>
          </PrivacyNote>
        </>
      }
    >
      <JpegToJpgTool />
    </ToolPageShell>
  );
}
