import type { Metadata } from "next";
import Link from "next/link";
import { SourceLink } from "@/components/requirements/source-link";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { RequirementPhotoTool } from "@/components/tools/requirement-photo-tool";
import { PASSPORT_NOT_VERIFIED, PASSPORT_REQUIREMENTS } from "@/lib/requirements/passports";
import { formatKbRange, formatVerifiedDate } from "@/lib/requirements/types";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("passport-photo");

const description =
  "Passport size photo requirements by country from official government sources, printed and digital, plus a free maker that crops your photo to size.";

export const metadata: Metadata = pageMetadata({
  title: "Passport Size Photo – Official Sizes by Country & Photo Maker",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "What is the passport photo size?",
    answer:
      "It depends on the country and on whether you need a printed or a digital photo. For example, India and the United Kingdom use 35 × 45 mm printed photos, Canada uses 50 × 70 mm, and online applications in the UK and Canada set minimum pixel sizes and file-size ranges instead. The table on this page lists each requirement with its official source.",
  },
  {
    question: "What is a passport size photo in pixels?",
    answer:
      "Printed passport photos are defined in millimetres, so the pixel size depends on the print resolution. At the 300 DPI this tool uses, a 35 × 45 mm photo (India and the UK) is 413 × 531 pixels, and Canada's 50 × 70 mm photo is 591 × 827 pixels. Online applications state pixel sizes directly instead, such as at least 600 × 750 pixels for a UK digital photo.",
  },
  {
    question: "Do I need a photo for an Indian passport application?",
    answer:
      "Not if you submit the application at a Passport Seva Kendra (PSK) or Post Office Passport Seva Kendra (POPSK): the photo is taken there. According to the Passport Seva instruction booklet, a printed 4.5 cm × 3.5 cm colour photo with a plain white background is needed for applications submitted at other collection centres (DPC, SPC or CSC).",
  },
  {
    question: "Can I print a passport photo at home?",
    answer:
      "Check your country's rules. The Indian instruction booklet says photographs in computer print will not be accepted and should be printed on good-quality photo paper. In general, a photo lab print at 100% scale is the safest option.",
  },
  {
    question: "What's the difference between this page and the passport photo resizer?",
    answer:
      "This page starts from the requirements: compare countries, see the official source for each, and then make a matching photo. The passport photo resizer starts from the tool: it's for any size you already know, including custom millimetre or pixel sizes and file limits.",
  },
  {
    question: "Why isn't the United States or Australia listed?",
    answer:
      "We only list a country after reading its official government page. We couldn't complete that check for the US Department of State or the Australian Passport Office, so we link to their official pages instead of quoting numbers.",
  },
  {
    question: "Will a photo made here be accepted?",
    answer:
      "The tool sets the size, file type and file size. Acceptance also depends on pose, lighting, expression, background and how recent the photo is, which officials check. Requirements vary by country and application; verify the final image against the official requirements before submitting.",
  },
];

function PassportComparison() {
  return (
    <section aria-labelledby="requirements-heading" className="rounded-lg border border-line bg-canvas p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="requirements-heading" className="text-lg font-semibold text-ink">
          Verified passport photo requirements
        </h2>
        <a
          href="#prepare"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Make your photo now
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M7 2v9M3 7.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
      <p className="mt-1 text-sm text-muted">Each row is copied from the government source shown, on the date shown.</p>
      <div className="relative mt-3 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="sr-only">Passport photo requirements by country and application</caption>
          <thead>
            <tr className="border-b border-line text-muted">
              <th scope="col" className="py-2 pr-3 font-medium">Country and photo type</th>
              <th scope="col" className="py-2 pr-3 font-medium">Size</th>
              <th scope="col" className="py-2 pr-3 font-medium">File size</th>
              <th scope="col" className="py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody className="text-ink-soft">
            {PASSPORT_REQUIREMENTS.map((set) => {
              const photo = set.photo!;
              return (
                <tr key={set.id} className="border-b border-line align-top last:border-0">
                  <th scope="row" className="py-2.5 pr-3 font-medium text-ink">
                    {set.group}
                    <span className="block font-normal text-ink-soft">{set.name}</span>
                  </th>
                  <td className="py-2.5 pr-3 tabular-nums">
                    {photo.physical ?? (photo.pixelBasis === "minimum" ? `at least ${photo.widthPx} × ${photo.heightPx} px` : `${photo.widthPx} × ${photo.heightPx} px`)}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">{formatKbRange(photo) ?? "Not stated"}</td>
                  <td className="py-2.5">
                    <SourceLink href={set.source.url} preset={set.id}>
                      {set.source.title}
                    </SourceLink>
                    <span className="block text-xs text-muted">
                      Verified <time dateTime={set.source.lastVerified}>{formatVerifiedDate(set.source.lastVerified)}</time>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="mt-5 text-sm font-semibold text-ink">Not yet verified</h3>
      <ul className="mt-2 space-y-2 text-sm text-ink-soft">
        {PASSPORT_NOT_VERIFIED.map((item) => (
          <li key={item.country}>
            <strong className="text-ink">{item.country}:</strong> {item.reason} Official page:{" "}
            <SourceLink href={item.url} preset={`passport-${item.country.toLowerCase().replace(/\s+/g, "-")}-unverified`}>
              {item.label}
            </SourceLink>{" "}
            <span className="text-muted">(checked {formatVerifiedDate(item.checkedOn)})</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        <strong className="text-ink">Important:</strong> Application requirements can change. Always verify the final image
        against the latest official notification or application portal before submitting. This is an independent tool and is
        not affiliated with any government.
      </p>
    </section>
  );
}

export default function PassportPhotoPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Passport Size Photo: Official Sizes by Country"
      intro={
        <p>
          A passport size photo isn&apos;t one size: every country sets its own, and online applications often use pixel
          and file-size limits instead of millimetres. Compare the requirements we&apos;ve verified from official government
          sources, then pick your country and make a photo that matches. Your photo stays on your device.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to make a passport photo for your country</h2>
          <ol>
            <li>Pick your country, then the type of application (printed photo or online application).</li>
            <li>Read the requirement summary and open the official source if anything is unclear.</li>
            <li>Add a photo taken against a plain background in even light, and frame your head with the crop box.</li>
            <li>Create the photo. The checklist confirms the pixel size and file size.</li>
            <li>For printed photos, have the JPG printed at a photo lab at 100% scale, on photo paper.</li>
          </ol>

          <h2>Printed photos vs digital photos</h2>
          <p>
            <strong>Printed photos</strong> are defined in millimetres. The tool turns millimetres into pixels at 300 DPI and
            writes that resolution into the JPG, so a 35 × 45 mm photo prints at 35 × 45 mm when printed at actual size.{" "}
            <strong>Digital photos</strong> for online applications are defined in pixels and file size: for example, the UK
            asks for at least 600 × 750 pixels and 50 KB–10 MB, and Canada for a 3:2 portrait JPEG of at least 1,200 × 1,800
            pixels and 200 KB–5 MB. The tool produces exactly the minimum pixel size and checks the file size.
          </p>

          <h2>Country notes</h2>
          <ul>
            <li>
              <strong>India:</strong> no photo is needed if you apply at a Passport Seva Kendra or Post Office Passport Seva
              Kendra, where your photo is taken. Other collection centres need a printed colour photo with a plain white
              background; computer prints aren&apos;t accepted.
            </li>
            <li>
              <strong>United Kingdom:</strong> GOV.UK asks for digital photos to be &ldquo;unaltered by computer software&rdquo;.
              This tool only crops and resizes; it doesn&apos;t retouch or replace backgrounds.
            </li>
            <li>
              <strong>Canada:</strong> the head (chin to crown) must be 31–36 mm on printed photos, or 45–50% of the photo
              height on digital ones. Use the crop box to size your head accordingly.
            </li>
          </ul>

          <h2>Common mistakes</h2>
          <ul>
            <li>Using one country&apos;s size for another country&apos;s application.</li>
            <li>Printing with &ldquo;fit to page&rdquo;, which changes the physical size.</li>
            <li>Shadows on the face or background, or a background that isn&apos;t the required colour.</li>
            <li>Filters, retouching or background replacement apps.</li>
          </ul>

          <h2>More tools</h2>
          <p>
            Already know the exact size you need, in millimetres or pixels, with or without a KB limit? Use the{" "}
            <Link href="/tools/passport-photo-resizer">passport photo resizer</Link>. To adjust framing only, use the{" "}
            <Link href="/tools/image-cropper">image cropper</Link>; to hit a file-size limit, use{" "}
            <Link href="/tools/resize-image-to-kb">resize image to KB</Link> or the{" "}
            <Link href="/tools/image-compressor">image compressor</Link>.
          </p>

          <h2>How we keep this page accurate</h2>
          <p>
            We add a country only after reading its official government page, record the link and the date, and re-check before
            changing any value. Pages we couldn&apos;t check are listed as not yet verified, with a link, rather than filled in from
            unofficial sites. See <Link href="/methodology">how the tools work</Link>.
          </p>

          <PrivacyNote>
            <p>Passport photos are identity documents. Yours is processed in your browser and never uploaded or stored.</p>
          </PrivacyNote>
        </>
      }
    >
      <div className="space-y-6">
        <PassportComparison />
        <RequirementPhotoTool
          tool="passport-photo"
          sets={PASSPORT_REQUIREMENTS}
          groupLabel="Country"
          setLabel="Application"
          appName="passport"
        />
      </div>
    </ToolPageShell>
  );
}
