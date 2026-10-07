import { Alert } from "@/components/controls/alert";
import {
  formatKbRange,
  formatVerifiedDate,
  type ApplicationRequirements,
  type ImageSpec,
  type RequirementSet,
} from "@/lib/requirements/types";
import { SourceLink } from "./source-link";

/**
 * Server-rendered summary of verified requirements: values, the official
 * source, and when it was last checked. Rendered from the same data the tool
 * uses, so the page and the tool can't disagree.
 */
export function RequirementSummary({
  heading,
  app,
  sets,
}: {
  heading: string;
  app?: ApplicationRequirements;
  sets?: RequirementSet[];
}) {
  const list = sets ?? app?.sets ?? [];
  return (
    <section aria-labelledby="requirements-heading" className="rounded-lg border border-line bg-canvas p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="requirements-heading" className="text-lg font-semibold text-ink">
          {heading}
        </h2>
        <a
          href="#prepare"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Prepare your file now
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M7 2v9M3 7.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
      {app?.unverified ? (
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
          <Alert tone="warning" title="No verified requirement to apply yet">
            {app.unverified.reason}
          </Alert>
          <p>Check the current requirement here, then enter it in the tool below:</p>
          <ul className="list-disc space-y-1 pl-5">
            {app.unverified.whereToCheck.map((item) => (
              <li key={item.url}>
                <SourceLink href={item.url} preset={`${app.name.toLowerCase()}-unverified`}>
                  {item.label}
                </SourceLink>
              </li>
            ))}
          </ul>
          <p className="text-muted">
            Last checked: <time dateTime={app.unverified.checkedOn}>{formatVerifiedDate(app.unverified.checkedOn)}</time>
          </p>
        </div>
      ) : null}

      <div className="mt-3 space-y-4">
        {groupIdentical(list).map((group) => (
          <RequirementCard key={group[0].id} sets={group} />
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        <strong className="text-ink">Important:</strong> Application requirements can change. Always verify the final image
        against the latest official notification or application portal before submitting. This is an independent tool and is
        not affiliated with any examination body or government.
      </p>
    </section>
  );
}

/**
 * Notifications that state exactly the same requirements are shown as one card
 * listing every notification and its own source, instead of repeating the same
 * table several times above the tool.
 */
function groupIdentical(sets: RequirementSet[]): RequirementSet[][] {
  const groups = new Map<string, RequirementSet[]>();
  for (const set of sets) {
    const key = JSON.stringify([set.group, set.photo, set.signature, set.livePhotoCapture, set.notes]);
    groups.set(key, [...(groups.get(key) ?? []), set]);
  }
  return [...groups.values()];
}

function RequirementCard({ sets }: { sets: RequirementSet[] }) {
  const set = sets[0];
  const specs = [set.photo, set.signature].filter((s): s is ImageSpec => Boolean(s));
  return (
    <article className="rounded-md border border-line" aria-labelledby={`req-${set.id}`}>
      <h3 id={`req-${set.id}`} className="border-b border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink">
        {sets.length === 1 ? (
          <>
            {set.group ? `${set.group} – ` : ""}
            {set.name}
          </>
        ) : (
          `Same requirements in ${sets.length} notifications`
        )}
      </h3>
      {sets.length > 1 ? (
        <ul className="list-disc border-b border-line bg-surface px-4 pb-2.5 pl-9 text-sm text-ink-soft">
          {sets.map((s) => (
            <li key={s.id}>{s.name}</li>
          ))}
        </ul>
      ) : null}
      <div className="space-y-3 px-4 py-3 text-sm">
        {set.livePhotoCapture ? (
          <div>
            <p className="font-medium text-ink">Photograph: captured live in the application form</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-soft">
              {set.livePhotoCapture.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {specs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[18rem] text-left">
              <caption className="sr-only">Requirements for {set.name}</caption>
              <thead>
                <tr className="border-b border-line text-muted">
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    <span className="sr-only">Item</span>
                  </th>
                  {specs.map((s) => (
                    <th key={s.kind} scope="col" className="py-1.5 pr-3 font-medium">
                      {s.kind === "photo" ? "Photograph" : "Signature"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-ink-soft">
                <Row label="Pixel size" specs={specs} value={pixelText} />
                <Row label="Physical size" specs={specs} value={(s) => s.physical ?? "—"} />
                <Row label="File size" specs={specs} value={(s) => formatKbRange(s) ?? "—"} />
                <Row label="Format" specs={specs} value={(s) => s.format ?? "Not stated"} />
              </tbody>
            </table>
          </div>
        ) : null}
        {/* The detailed rules are collapsed so the tool stays near the top on phones; they remain in the page. */}
        <details className="group rounded-md border border-line">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 font-medium text-ink [&::-webkit-details-marker]:hidden">
            {specs.length > 1 ? "Photo and signature rules" : specs[0]?.kind === "signature" ? "Signature rules and notes" : "Photo rules and notes"}
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180">
              <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </summary>
          <div className="space-y-3 border-t border-line px-3 py-3">
            {specs.map((s) =>
              s.rules.length > 0 ? (
                <div key={`${s.kind}-rules`}>
                  <p className="font-medium text-ink">{s.kind === "photo" ? "Photograph" : "Signature"}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-soft">
                    {s.rules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
            {set.notes && set.notes.length > 0 ? (
              <div>
                <p className="font-medium text-ink">Also note</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-soft">
                  {set.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>
        <div className="text-muted">
          {sets.length === 1 ? "Source:" : "Sources:"}
          <ul className={sets.length === 1 ? "inline" : "mt-1 list-disc space-y-0.5 pl-5"}>
            {sets.map((s) => (
              <li key={s.id} className={sets.length === 1 ? "inline" : undefined}>
                {" "}
                <SourceLink href={s.source.url} preset={s.id}>
                  {s.source.title}
                </SourceLink>{" "}
                ({s.source.publisher}
                {s.source.section ? `, ${s.source.section}` : ""}) · Last verified{" "}
                <time dateTime={s.source.lastVerified}>{formatVerifiedDate(s.source.lastVerified)}</time>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function pixelText(s: ImageSpec): string {
  if (!s.widthPx || !s.heightPx) return "Not specified";
  const size = `${s.widthPx} × ${s.heightPx} px`;
  switch (s.pixelBasis) {
    case "preferred":
      return `${size} (preferred)`;
    case "minimum":
      return `at least ${size}`;
    case "derived":
      return `${size} (print size at ${s.dpi ?? 300} DPI)`;
    default:
      return size;
  }
}

function Row({ label, specs, value }: { label: string; specs: ImageSpec[]; value: (s: ImageSpec) => string }) {
  return (
    <tr className="border-b border-line last:border-0">
      <th scope="row" className="py-1.5 pr-3 font-medium text-ink">
        {label}
      </th>
      {specs.map((s) => (
        <td key={s.kind} className="py-1.5 pr-3 tabular-nums">
          {value(s)}
        </td>
      ))}
    </tr>
  );
}
