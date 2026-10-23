import { Breadcrumbs } from "@/components/breadcrumbs/breadcrumbs";

/** Layout for informational pages: breadcrumb, heading, optional date, and readable prose. */
export function ContentPage({
  title,
  path,
  intro,
  updated,
  toc,
  children,
}: {
  title: string;
  path: string;
  intro?: React.ReactNode;
  /** ISO date shown as "Last updated". */
  updated?: string;
  /** Optional "On this page" links; each id must match a heading in the content. */
  toc?: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: title, path },
        ]}
      />
      <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.02em] text-ink sm:text-4xl">{title}</h1>
      {updated ? (
        <p className="mt-2 text-sm text-muted">
          Last updated{" "}
          <time dateTime={updated}>
            {new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
          </time>
        </p>
      ) : null}
      {intro ? <div className="mt-4 text-lg leading-relaxed text-ink-soft">{intro}</div> : null}
      {toc && toc.length > 0 ? (
        <nav aria-label="On this page" className="mt-6 rounded-lg border border-line bg-surface p-4">
          <p className="text-sm font-semibold text-ink">On this page</p>
          <ol className="mt-2 grid gap-x-6 text-sm sm:grid-cols-2">
            {toc.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="inline-flex min-h-8 items-center text-accent hover:underline">
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="prose-content mt-2">{children}</div>
    </div>
  );
}
