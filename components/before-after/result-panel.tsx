"use client";

import { useEffect, useRef } from "react";
import { DownloadButton } from "@/components/download-button/download-button";
import { ImagePreview } from "@/components/image-preview/image-preview";
import { useObjectUrl, type SourceImage } from "@/components/tools/hooks";
import { FORMATS, type ImageMime } from "@/lib/image-processing/formats";
import type { AnalyticsEvent } from "@/lib/analytics";
import type { ToolId } from "@/lib/tools/registry";
import { formatBytes, formatDimensions, formatExactBytes, formatSavings, percentSaved } from "@/lib/utils/format";

export interface ResultImage {
  blob: Blob;
  width: number;
  height: number;
  mime: ImageMime;
}

interface ResultPanelProps {
  tool: ToolId;
  heading: string;
  original: SourceImage;
  output: ResultImage;
  fileName: string;
  downloadLabel: string;
  /** Status messages shown above the comparison (success, notes, warnings). */
  status?: React.ReactNode;
  /** Extra rows for the comparison table. */
  extraRows?: { label: string; before: string; after: string }[];
  /** Additional analytics event sent when the download is clicked. */
  downloadEvent?: AnalyticsEvent;
}

/**
 * Before/after comparison. Every size shown comes from the actual output
 * Blob that the download button saves, so the numbers always match the file.
 */
export function ResultPanel({ tool, heading, original, output, fileName, downloadLabel, status, extraRows = [], downloadEvent }: ResultPanelProps) {
  const url = useObjectUrl(output.blob);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Bring the result into view and announce it, especially on small screens.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [output.blob]);

  const saved = percentSaved(original.size, output.blob.size);
  const rows = [
    { label: "Format", before: FORMATS[original.mime].label, after: FORMATS[output.mime].label },
    {
      label: "Dimensions",
      before: formatDimensions(original.width, original.height),
      after: formatDimensions(output.width, output.height),
    },
    { label: "File size", before: formatBytes(original.size), after: formatBytes(output.blob.size) },
    ...extraRows,
  ];

  return (
    <section aria-labelledby="result-heading" className="rounded-lg border border-line bg-canvas shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-5">
        <div>
          <h2 id="result-heading" ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-ink outline-none">
            {heading}
          </h2>
          <p className="mt-0.5 text-sm text-muted" aria-live="polite">
            {formatBytes(output.blob.size)} ({formatExactBytes(output.blob.size)}) ·{" "}
            {Math.abs(saved) < 0.05 ? (
              "same size as the original"
            ) : (
              <>
                <span className={saved > 0 ? "font-medium text-success" : "font-medium text-warning"}>
                  {formatSavings(original.size, output.blob.size)}
                </span>{" "}
                than the original
              </>
            )}
          </p>
        </div>
        {url ? (
          <DownloadButton
            href={url}
            fileName={fileName}
            label={downloadLabel}
            tool={tool}
            outputFormat={FORMATS[output.mime].label}
            extraEvent={downloadEvent}
          />
        ) : null}
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        {status ? <div className="space-y-3">{status}</div> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <figure>
            <ImagePreview src={original.url} alt="Original image" width={original.width} height={original.height} className="h-48 sm:h-64" />
            <figcaption className="mt-2 text-sm text-muted">Original</figcaption>
          </figure>
          <figure>
            {url ? (
              <ImagePreview src={url} alt="Processed image" width={output.width} height={output.height} className="h-48 sm:h-64" />
            ) : (
              <div className="h-48 rounded-md border border-line bg-surface sm:h-64" />
            )}
            <figcaption className="mt-2 text-sm text-muted">Result</figcaption>
          </figure>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] text-sm">
            <caption className="sr-only">Comparison of the original and processed image</caption>
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">
                  <span className="sr-only">Property</span>
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Original
                </th>
                <th scope="col" className="py-2 font-medium">
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-ink">
                    {row.label}
                  </th>
                  <td className="py-2 pr-4 tabular-nums text-ink-soft">{row.before}</td>
                  <td className="py-2 tabular-nums font-medium text-ink">{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
