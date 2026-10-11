import Link from "next/link";
import { TINTS, type Tint } from "@/components/controls/tints";
import { ToolIcon } from "@/components/tool-card/tool-icon";
import type { ToolDefinition } from "@/lib/tools/registry";

export function ArrowCircle() {
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white"
    >
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Homepage tool card: tinted icon, name, a short blurb (defaults to the tool summary) and an arrow. The whole card is the link. */
export function ToolTile({ tool, tint, blurb, compact = false }: { tool: ToolDefinition; tint: Tint; blurb?: string; compact?: boolean }) {
  return (
    <Link
      href={tool.path}
      className={`group flex h-full gap-3.5 rounded-lg border border-line bg-canvas transition-[border-color,box-shadow] hover:border-accent/50 hover:shadow ${
        compact ? "flex-col p-4" : "p-4 sm:p-5"
      }`}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-lg ${compact ? "h-10 w-10" : "h-12 w-12"} ${TINTS[tint]}`}>
        <ToolIcon category={tool.category} id={tool.id} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-display text-[0.9375rem] font-bold text-ink group-hover:text-accent">{tool.name}</h3>
        <span className="mt-1 flex flex-1 items-end gap-2">
          <span className="flex-1 text-sm leading-snug text-muted">{blurb ?? tool.summary}</span>
          <ArrowCircle />
        </span>
      </span>
    </Link>
  );
}
