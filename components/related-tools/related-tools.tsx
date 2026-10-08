import Link from "next/link";
import { getTool, type ToolId } from "@/lib/tools/registry";

/** Related tools with descriptive anchor text, generated from the registry. */
export function RelatedTools({ ids }: { ids: ToolId[] }) {
  return (
    <section aria-labelledby="related-heading" className="mt-14">
      <h2 id="related-heading" className="text-[1.375rem] font-[650] tracking-tight text-ink">
        Related tools
      </h2>
      <ul className={`mt-4 grid gap-3 ${ids.length % 3 === 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {ids.map((id) => {
          const tool = getTool(id);
          return (
            <li key={id}>
              <Link
                href={tool.path}
                className="flex h-full flex-col rounded-lg border border-line p-4 transition-colors hover:border-line-strong hover:bg-surface"
              >
                <span className="font-medium text-accent">{tool.linkText}</span>
                <span className="mt-1 text-sm leading-relaxed text-muted">{tool.summary}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
