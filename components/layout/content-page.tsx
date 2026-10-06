import { Breadcrumbs } from "@/components/breadcrumbs/breadcrumbs";

/** Layout for informational pages: breadcrumb, heading, optional date, and readable prose. */
export function ContentPage({
  title,
  path,
  intro,
  updated,
  children,
}: {
  title: string;
  path: string;
  intro?: React.ReactNode;
  /** ISO date shown as "Last updated". */
  updated?: string;
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
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
      {updated ? (
        <p className="mt-2 text-sm text-muted">
          Last updated{" "}
          <time dateTime={updated}>
            {new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
          </time>
        </p>
      ) : null}
      {intro ? <div className="mt-4 text-lg leading-relaxed text-ink-soft">{intro}</div> : null}
      <div className="prose-content mt-2">{children}</div>
    </div>
  );
}
