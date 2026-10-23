import Link from "next/link";
import type { ToolDefinition } from "@/lib/tools/registry";
import { ToolIcon } from "./tool-icon";

/**
 * Card linking to a tool page. The whole card is the link; the heading is its accessible name.
 * On phones it is a compact row (icon, name, two-line summary) so long tool lists stay scannable;
 * from the sm breakpoint up it is the full card.
 */
export function ToolCard({ tool, headingLevel = "h3" }: { tool: ToolDefinition; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <Link
      href={tool.path}
      className="group flex h-full items-start gap-3 rounded-lg border border-line bg-canvas p-4 transition-colors hover:border-accent/50 hover:bg-accent-soft/40 sm:flex-col sm:gap-0 sm:p-5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white">
        <ToolIcon category={tool.category} id={tool.id} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col self-stretch">
        <Heading className="text-base font-bold text-ink sm:mt-4">{tool.name}</Heading>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted sm:mt-1.5 sm:line-clamp-none">{tool.summary}</p>
        <span className="mt-auto hidden pt-4 text-sm font-medium text-accent group-hover:underline sm:inline">
          Open tool <span aria-hidden="true">→</span>
        </span>
      </span>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="mt-3 shrink-0 text-muted sm:hidden">
        <path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
