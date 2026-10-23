import type { Metadata } from "next";
import Link from "next/link";
import { ToolCard } from "@/components/tool-card/tool-card";
import { allTools, getTool, type ToolId } from "@/lib/tools/registry";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/** The most-used tools, so a broken link still leads somewhere useful without listing every tool. */
const popular: ToolId[] = [
  "image-resizer",
  "resize-image-to-kb",
  "image-compressor",
  "passport-photo",
  "image-to-jpg",
  "compress-pdf",
];

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
      <p className="text-sm font-semibold text-accent">404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] text-ink">This page doesn&apos;t exist</h1>
      <p className="mt-3 text-lg text-ink-soft">
        The link may be broken or the page may have moved. Try one of the popular tools below, or go to the{" "}
        <Link href="/" className="text-accent underline underline-offset-2">
          homepage
        </Link>
        .
      </p>
      <h2 className="mt-10 text-xl font-bold tracking-tight text-ink">Popular tools</h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {popular.map((id) => {
          const tool = getTool(id);
          return (
            <li key={id}>
              <ToolCard tool={tool} />
            </li>
          );
        })}
      </ul>
      <Link
        href="/tools"
        className="mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-md bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover"
      >
        See all {allTools.length} tools <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
