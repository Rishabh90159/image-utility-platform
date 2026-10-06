import Link from "next/link";
import type { ToolDefinition } from "@/lib/tools/registry";
import { ToolIcon } from "./tool-icon";

/** Card linking to a tool page. The whole card is the link; the heading is its accessible name. */
export function ToolCard({ tool, headingLevel = "h3" }: { tool: ToolDefinition; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <Link
      href={tool.path}
      className="group flex h-full flex-col rounded-lg border border-line bg-canvas p-5 transition-colors hover:border-line-strong hover:bg-surface"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-accent">
        <ToolIcon category={tool.category} id={tool.id} />
      </span>
      <Heading className="mt-4 text-base font-semibold text-ink">{tool.name}</Heading>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{tool.summary}</p>
      <span className="mt-auto pt-4 text-sm font-medium text-accent group-hover:underline">
        Open tool <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
