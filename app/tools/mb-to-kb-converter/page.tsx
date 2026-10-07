import type { Metadata } from "next";
import Link from "next/link";
import { MbToKbConverter } from "@/components/tools/mb-to-kb-converter";
import { ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("mb-to-kb-converter");

const description =
  "Convert MB to KB, KB to MB and more. Shows decimal (1 MB = 1000 KB) and binary (1 MiB = 1024 KiB) results side by side, and the exact size of any file.";

export const metadata: Metadata = pageMetadata({
  title: "MB to KB Converter – Convert MB to KB Online",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How many KB are in 1 MB?",
    answer:
      "1,000 KB in decimal units, which storage makers and the international standard (SI) use. In binary units, 1 MiB is 1,024 KiB; Windows and many upload forms use this binary meaning but still write it as KB and MB.",
  },
  {
    question: "How do I convert MB to KB?",
    answer:
      "Multiply by 1,000 for decimal units (2.5 MB = 2,500 KB), or by 1,024 for binary units (2.5 MiB = 2,560 KiB). To go from KB to MB, divide by the same number.",
  },
  {
    question: "Which one does an upload form mean by “KB”?",
    answer:
      "Usually 1,024 bytes, because most forms check the file's size in bytes and divide by 1,024. The difference is small for photo limits (50 KB is 51,200 bytes in binary, 50,000 in decimal), so aim a little below the limit to be safe.",
  },
  {
    question: "Why does my phone show a different file size than my computer?",
    answer:
      "macOS, iOS and Android usually count in decimal (1 MB = 1,000,000 bytes), while Windows counts in binary (1 MB = 1,048,576 bytes). The same 5,000,000-byte photo shows as 5 MB on a phone and 4.77 MB on Windows.",
  },
  {
    question: "What are KiB and MiB?",
    answer:
      "The unambiguous names for binary units, defined by the IEC: a kibibyte (KiB) is 1,024 bytes and a mebibyte (MiB) is 1,024 KiB. They exist precisely because KB and MB were used for both meanings.",
  },
  {
    question: "How do I reduce a photo from MB to KB?",
    answer:
      "Converting the units doesn't change the file. To make a 3 MB photo fit a 100 KB limit, the image itself must be compressed or resized; use resize image to KB, which aims for the exact size you enter.",
  },
];

const COMMON = [0.1, 0.5, 1, 2, 5, 10];

export default function MbToKbPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="MB to KB Converter"
      intro={
        <p>
          Convert megabytes to kilobytes and back, and see both meanings at once: decimal, where 1 MB = 1000 KB, and binary,
          where 1 MiB = 1024 KiB. The same file size converter also handles bytes and GB, and shows the exact size of any
          file on your device.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>MB to KB: the two answers</h2>
          <p>
            There are two systems of units, and both use the letters KB and MB. Decimal (SI) units step by 1000, like metres
            and kilometres. Binary units step by 1024, because computer memory is built in powers of two; their exact names are
            KiB and MiB. Both are correct; what matters is which one the place you&apos;re uploading to uses.
          </p>
          <div className="relative overflow-x-auto">
            <table>
              <caption className="sr-only">Common megabyte values in kilobytes</caption>
              <thead>
                <tr>
                  <th scope="col">Megabytes</th>
                  <th scope="col">Decimal (KB)</th>
                  <th scope="col">Binary (KiB)</th>
                </tr>
              </thead>
              <tbody>
                {COMMON.map((mb) => (
                  <tr key={mb}>
                    <td>{mb} MB</td>
                    <td>{(mb * 1000).toLocaleString("en-US")} KB</td>
                    <td>{(mb * 1024).toLocaleString("en-US", { maximumFractionDigits: 1 })} KiB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Which system to use</h2>
          <ul>
            <li>
              <strong>Hard drives, SSDs, USB sticks and phone storage</strong> are sold in decimal units.
            </li>
            <li>
              <strong>Windows File Explorer</strong> shows binary sizes but labels them KB and MB.
            </li>
            <li>
              <strong>Upload forms</strong> with photo limits, such as &ldquo;under 50 KB&rdquo;, usually count 1 KB as 1024
              bytes. The image tools on this site count the same way, and round sizes up so a file is never shown smaller
              than it is.
            </li>
          </ul>

          <h2>Getting a file under a KB limit</h2>
          <p>
            A converter only changes the numbers, not the file. To shrink a photo to a limit, use{" "}
            <Link href="/tools/resize-image-to-kb">resize image to KB</Link> for any size, or the one-step pages for{" "}
            <Link href="/tools/20kb-photo">20KB</Link>, <Link href="/tools/50kb-photo">50KB</Link>,{" "}
            <Link href="/tools/100kb-photo">100KB</Link> and <Link href="/tools/200kb-photo">200KB</Link>. To reduce the size
            without a fixed target, use the <Link href="/tools/image-compressor">image compressor</Link>.
          </p>
        </>
      }
    >
      <MbToKbConverter />
    </ToolPageShell>
  );
}
