"use client";

import { buttonClass } from "@/components/controls/button";
import { track, type AnalyticsEvent } from "@/lib/analytics";
import type { ToolId } from "@/lib/tools/registry";

/** Saves a locally generated image. The link points to a blob: URL in this browser tab. */
export function DownloadButton({
  href,
  fileName,
  label,
  tool,
  outputFormat,
  extraEvent,
}: {
  href: string;
  fileName: string;
  label: string;
  tool: ToolId;
  outputFormat: string;
  /** Additional event for pages that track downloads separately (e.g. photo_downloaded). */
  extraEvent?: AnalyticsEvent;
}) {
  return (
    <a
      href={href}
      download={fileName}
      onClick={() => {
        track("download_clicked", { tool, output_format: outputFormat });
        if (extraEvent) track(extraEvent, { tool, output_format: outputFormat });
      }}
      className={buttonClass("primary", "w-full px-6 sm:w-auto")}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M9 2.5v9M5 8l4 4 4-4M3 15.5h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </a>
  );
}
