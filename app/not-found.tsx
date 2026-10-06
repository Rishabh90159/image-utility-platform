import type { Metadata } from "next";
import Link from "next/link";
import { ToolCard } from "@/components/tool-card/tool-card";
import { allTools } from "@/lib/tools/registry";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
      <p className="text-sm font-semibold text-accent">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">This page doesn&apos;t exist</h1>
      <p className="mt-3 text-lg text-ink-soft">
        The link may be broken or the page may have moved. Try one of the tools below, or go to the{" "}
        <Link href="/" className="text-accent underline underline-offset-2">
          homepage
        </Link>
        .
      </p>
      <h2 className="sr-only">Image tools</h2>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allTools.map((tool) => (
          <li key={tool.id}>
            <ToolCard tool={tool} />
          </li>
        ))}
      </ul>
    </div>
  );
}
