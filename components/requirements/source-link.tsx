"use client";

import { track } from "@/lib/analytics";

/** Link to an official source, opened in a new tab. Only the preset id is sent to analytics. */
export function SourceLink({ href, children, preset }: { href: string; children: React.ReactNode; preset: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("requirement_source_clicked", { preset })}
      className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
