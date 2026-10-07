import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs/breadcrumbs";
import { pixelText } from "@/components/requirements/requirement-summary";
import { SourceLink } from "@/components/requirements/source-link";
import { ToolCard } from "@/components/tool-card/tool-card";
import { APPLICATIONS, type ApplicationId } from "@/lib/requirements/applications";
import { PASSPORT_REQUIREMENTS } from "@/lib/requirements/passports";
import { formatKbRange, formatVerifiedDate, type ApplicationRequirements, type ImageSpec, type RequirementSet } from "@/lib/requirements/types";
import { pageMetadata } from "@/lib/seo/metadata";
import { APPLICATION_HUB, getTool, toolsIn, type ToolId } from "@/lib/tools/registry";

export const metadata: Metadata = pageMetadata({
  title: "Exam Photo Size Requirements – IBPS, SBI, SSC, NEET & UPSC",
  description:
    "Compare photo and signature size requirements for IBPS, SBI, SSC, NEET and UPSC applications, taken from official notifications with check dates.",
  path: APPLICATION_HUB.path,
});

const ORDER: { id: ApplicationId; tool: ToolId }[] = [
  { id: "ibps", tool: "ibps-photo" },
  { id: "sbi", tool: "sbi-photo" },
  { id: "ssc", tool: "ssc-photo" },
  { id: "neet", tool: "neet-photo" },
  { id: "upsc", tool: "upsc-photo" },
];

function specLines(spec: ImageSpec | undefined): string[] {
  if (!spec) return [];
  return [pixelText(spec), formatKbRange(spec) ?? "File size not stated", spec.format ?? "Format not stated"];
}

/** Notifications whose photo and signature values are identical share one row. */
function rowsFor(sets: RequirementSet[]): RequirementSet[][] {
  const rows = new Map<string, RequirementSet[]>();
  for (const set of sets) {
    const key = JSON.stringify([specLines(set.photo), specLines(set.signature), Boolean(set.livePhotoCapture)]);
    rows.set(key, [...(rows.get(key) ?? []), set]);
  }
  return [...rows.values()];
}

function Cell({ spec, live }: { spec?: ImageSpec; live?: boolean }) {
  if (live) return <span>Captured live in the application form (no upload)</span>;
  const lines = specLines(spec);
  if (lines.length === 0) return <span className="text-muted">Not stated</span>;
  return (
    <ul className="space-y-0.5">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function ComparisonTable() {
  return (
    <div className="relative overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <caption className="sr-only">Photo and signature requirements by examination, from official sources</caption>
        <thead className="bg-surface">
          <tr className="border-b border-line text-muted">
            <th scope="col" className="px-3 py-2 font-medium">Application</th>
            <th scope="col" className="px-3 py-2 font-medium">Photograph</th>
            <th scope="col" className="px-3 py-2 font-medium">Signature</th>
            <th scope="col" className="px-3 py-2 font-medium">Official source</th>
          </tr>
        </thead>
        <tbody className="text-ink-soft">
          {ORDER.map(({ id, tool }) => {
            const app: ApplicationRequirements = APPLICATIONS[id];
            const page = getTool(tool);
            if (app.sets.length === 0) {
              return (
                <tr key={id} className="border-b border-line align-top">
                  <th scope="row" className="px-3 py-3 font-medium text-ink">
                    <Link href={page.path} className="text-accent hover:underline">
                      {app.name}
                    </Link>
                    <span className="block font-normal text-muted">{app.fullName}</span>
                  </th>
                  <td colSpan={2} className="px-3 py-3">
                    Not verified. {app.unverified?.reason}
                  </td>
                  <td className="px-3 py-3">
                    <ul className="space-y-1">
                      {app.unverified?.whereToCheck.map((item) => (
                        <li key={item.url}>
                          <SourceLink href={item.url} preset={`${id}-unverified`}>
                            {item.label}
                          </SourceLink>
                        </li>
                      ))}
                    </ul>
                    {app.unverified ? (
                      <span className="mt-1 block text-xs text-muted">
                        Checked <time dateTime={app.unverified.checkedOn}>{formatVerifiedDate(app.unverified.checkedOn)}</time>
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            }
            return rowsFor(app.sets).map((row, index) => (
              <tr key={row[0].id} className="border-b border-line align-top">
                <th scope="row" className="px-3 py-3 font-medium text-ink">
                  <Link href={page.path} className="text-accent hover:underline">
                    {app.name}
                  </Link>
                  {index === 0 ? <span className="block font-normal text-muted">{app.fullName}</span> : null}
                  <ul className="mt-1 space-y-0.5 text-xs font-normal text-muted">
                    {row.map((set) => (
                      <li key={set.id}>{set.name}</li>
                    ))}
                  </ul>
                </th>
                <td className="px-3 py-3 tabular-nums">
                  <Cell spec={row[0].photo} live={Boolean(row[0].livePhotoCapture)} />
                </td>
                <td className="px-3 py-3 tabular-nums">
                  <Cell spec={row[0].signature} />
                </td>
                <td className="px-3 py-3">
                  <ul className="space-y-1.5">
                    {row.map((set) => (
                      <li key={set.id}>
                        <SourceLink href={set.source.url} preset={set.id}>
                          {set.source.title}
                        </SourceLink>
                        <span className="block text-xs text-muted">
                          Verified <time dateTime={set.source.lastVerified}>{formatVerifiedDate(set.source.lastVerified)}</time>
                        </span>
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ));
          })}
          <tr className="align-top">
            <th scope="row" className="px-3 py-3 font-medium text-ink">
              <Link href="/tools/passport-photo" className="text-accent hover:underline">
                Passport
              </Link>
              <span className="block font-normal text-muted">{[...new Set(PASSPORT_REQUIREMENTS.map((set) => set.group))].join(", ")}</span>
            </th>
            <td colSpan={3} className="px-3 py-3">
              Depends on the country and on printed vs online applications. See the{" "}
              <Link href="/tools/passport-photo" className="text-accent hover:underline">
                passport size photo requirements by country
              </Link>
              , each with its government source.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function ApplicationPhotosPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Tools", path: "/tools" },
          { name: APPLICATION_HUB.name, path: APPLICATION_HUB.path },
        ]}
      />
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Exam and Passport Photo Requirements</h1>
      <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-soft">
        Applying to more than one exam? Each one sets its own photo and signature size. This table puts the current
        requirements side by side, each copied from the official notification and dated. Open an exam&apos;s page to prepare
        a file that matches it.
      </p>

      <section aria-labelledby="compare-heading" className="mt-8">
        <h2 id="compare-heading" className="sr-only">
          Requirements compared
        </h2>
        <ComparisonTable />
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
          <strong className="text-ink">Important:</strong> Application requirements can change. Always verify the final
          image against the latest official notification or application portal before submitting. This is an independent
          site and is not affiliated with any examination body or government.
        </p>
      </section>

      <section aria-labelledby="pages-heading" className="mt-12">
        <h2 id="pages-heading" className="text-xl font-semibold text-ink">
          Prepare a photo or signature
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {toolsIn("application").map((tool) => (
            <li key={tool.id}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      </section>

      <div className="prose-content mx-auto max-w-3xl">
        <h2>How to read a photo requirement</h2>
        <ul>
          <li>
            <strong>Pixel size</strong> is the width × height of the image file. Some notifications state it exactly, some
            call it &ldquo;preferred&rdquo;, and some (like the NEET bulletin) give none, in which case only the file size
            and format apply.
          </li>
          <li>
            <strong>File size range</strong>, such as 20–50 KB, has a minimum as well as a maximum. A file that is too small
            can be rejected just like one that is too big.
          </li>
          <li>
            <strong>Physical size</strong>, such as 3.5 cm × 4.5 cm, describes the printed photo the scan should come from.
            It isn&apos;t a pixel size, and we don&apos;t convert it into one unless the source does.
          </li>
          <li>
            <strong>Live capture</strong> means the form takes the photo with your camera during the application. SSC&apos;s
            2026 notices work this way, so there&apos;s no photo file to upload.
          </li>
        </ul>

        <h2>If your exam isn&apos;t listed</h2>
        <p>
          Find the photo and signature section of its notification, then use a general tool with those numbers: the{" "}
          <Link href="/tools/passport-photo-resizer">passport photo resizer</Link> for a pixel size and KB limit together,
          the <Link href="/tools/signature-resizer">signature resizer</Link> for signatures, or{" "}
          <Link href="/tools/resize-image-to-kb">resize image to KB</Link> when only a file size is given. For the most
          common limits there are one-step pages for <Link href="/tools/20kb-photo">20KB</Link> and{" "}
          <Link href="/tools/50kb-photo">50KB</Link> photos.
        </p>

        <h2>How this table is kept accurate</h2>
        <p>
          Every value comes from the examining body&apos;s own notification or website, never from coaching or photo-service
          sites. Values the source doesn&apos;t state are shown as &ldquo;not stated&rdquo; rather than filled in, and the
          date shows when we last read the source. See <Link href="/methodology">how the tools work</Link> for the full
          process.
        </p>
      </div>
    </div>
  );
}
