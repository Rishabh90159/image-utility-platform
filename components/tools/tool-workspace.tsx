"use client";

import Link from "next/link";
import { useId } from "react";
import { Alert } from "@/components/controls/alert";
import { buttonClass } from "@/components/controls/button";
import { ImagePreview } from "@/components/image-preview/image-preview";
import { ImageDropzone } from "@/components/image-uploader/image-dropzone";
import type { ImageToolError } from "@/lib/image-processing/errors";
import { acceptAttribute, FORMATS, type ImageMime } from "@/lib/image-processing/formats";
import { formatBytes, formatDimensions } from "@/lib/utils/format";
import type { SourceImage } from "./hooks";

interface ToolWorkspaceProps {
  accept: ImageMime[];
  source: SourceImage | null;
  loading: boolean;
  error: ImageToolError | null;
  /** Extra content shown under an error message (e.g. a link to a better-suited tool). */
  errorAction?: React.ReactNode;
  onFile: (file: File) => void;
  onReset: () => void;
  prompt: string;
  /** Settings and the primary action button. */
  controls: React.ReactNode;
  /** Result area, shown below the workspace once processing finishes. */
  result?: React.ReactNode;
  /** Replaces the static preview, e.g. with an interactive cropper. */
  preview?: React.ReactNode;
  /** Gives the preview more room than the settings (for cropping). */
  widePreview?: boolean;
  /** Overrides the file picker's accept list and labels (e.g. SVG). */
  acceptOverride?: { attribute: string; label: string };
}

/** Common frame for every tool: upload → preview + settings → result. */
export function ToolWorkspace({
  accept,
  source,
  loading,
  error,
  errorAction,
  onFile,
  onReset,
  prompt,
  controls,
  result,
  preview,
  widePreview = false,
  acceptOverride,
}: ToolWorkspaceProps) {
  const changeId = useId();
  const errorBlock = error ? (
    <Alert tone="error" title="We couldn't use that file">
      <p>{error.message}</p>
      {errorAction ??
        (error.code === "HEIC_NOT_SUPPORTED" ? (
          <p className="mt-1">
            <Link href="/tools/heic-to-jpg" className="font-medium text-accent underline">
              Convert HEIC to JPG
            </Link>
          </p>
        ) : error.code === "GIF_NOT_SUPPORTED" ? (
          <p className="mt-1">
            <Link href="/tools/resize-gif" className="font-medium text-accent underline">
              Resize a GIF and keep the animation
            </Link>
          </p>
        ) : null)}
    </Alert>
  ) : null;

  if (!source) {
    return (
      <div className="space-y-4">
        {errorBlock}
        <ImageDropzone accept={accept} onFile={onFile} loading={loading} prompt={prompt} acceptOverride={acceptOverride} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-label="Image and settings" className="rounded-lg border border-line bg-canvas shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink" title={source.name}>
              {source.name}
            </p>
            <p className="text-sm text-muted">
              {FORMATS[source.mime].label} · {formatDimensions(source.width, source.height)} · {formatBytes(source.size)}
              {source.hasTransparency ? " · has transparency" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              id={changeId}
              type="file"
              accept={acceptOverride?.attribute ?? acceptAttribute(accept)}
              className="peer sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onFile(file);
                event.target.value = "";
              }}
            />
            <label
              htmlFor={changeId}
              className={buttonClass(
                "secondary",
                "min-h-10 cursor-pointer px-3 text-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
              )}
            >
              {loading ? "Opening…" : "Change image"}
            </label>
            <button type="button" onClick={onReset} className={buttonClass("ghost", "min-h-10 px-3 text-sm")}>
              Reset
            </button>
          </div>
        </div>

        <div
          className={`grid gap-6 p-4 sm:p-5 ${widePreview ? "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : "md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"}`}
        >
          {preview ?? (
            <ImagePreview
              src={source.url}
              alt="Preview of the image you selected"
              width={source.width}
              height={source.height}
              className="h-52 sm:h-72 md:h-full md:max-h-[26rem] md:min-h-72"
            />
          )}
          <div className="min-w-0 space-y-5">
            {errorBlock}
            {controls}
          </div>
        </div>
      </section>
      {result}
    </div>
  );
}

/** Primary action with an inline progress indicator. */
export function ActionButton({
  onClick,
  busy,
  busyLabel,
  children,
  disabled,
  progress,
}: {
  onClick: () => void;
  busy: boolean;
  busyLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
  progress?: number | null;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy || disabled}
        aria-busy={busy}
        className={buttonClass("primary", "w-full px-6 sm:w-auto")}
      >
        {busy ? (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="animate-spin">
            <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
            <path d="M14 8a6 6 0 00-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : null}
        {busy ? busyLabel : children}
      </button>
      {busy && typeof progress === "number" ? (
        <div className="mt-3 max-w-sm">
          <div
            role="progressbar"
            aria-label={busyLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="h-1.5 overflow-hidden rounded-full bg-surface-strong"
          >
            <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
