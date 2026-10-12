"use client";

import { useId, useRef, useState } from "react";
import { buttonClass } from "@/components/controls/button";

interface DocumentDropzoneProps {
  /** Value for the file input's accept attribute, e.g. ".pdf,application/pdf". */
  accept: string;
  /** Formats and limits shown under the button, e.g. "PDF · up to 50 MB". */
  hint: string;
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  prompt: string;
  buttonLabel: string;
  compact?: boolean;
  disabled?: boolean;
  privacyNote?: string;
}

/**
 * Upload area for documents: drag and drop or the file picker. Matches the
 * image upload area's look. Files are read in the browser only.
 */
export function DocumentDropzone({ accept, hint, onFiles, multiple = false, prompt, buttonLabel, compact = false, disabled = false, privacyNote }: DocumentDropzoneProps) {
  const inputId = useId();
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const handle = (list: FileList | null) => {
    const files = [...(list ?? [])];
    if (files.length === 0 || disabled) return;
    onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepth.current++;
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = disabled ? "none" : "copy";
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        handle(event.dataTransfer.files);
      }}
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-5 text-center transition-colors ${compact ? "py-6" : "py-10 sm:py-14"} ${
        dragging ? "border-accent bg-accent-soft" : "border-accent/35 bg-canvas hover:border-accent/60"
      }`}
      aria-busy={disabled}
    >
      <span className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${dragging ? "bg-accent text-white" : "bg-accent-soft text-accent"}`}>
        <svg width="28" height="28" viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
          <path d="M10 5h14l8 8v22H10z" />
          <path d="M24 5v8h8" />
          <path d="M15 21h12M15 26h12M15 31h7" strokeLinecap="round" />
        </svg>
      </span>
      <p className="mt-4 font-display text-lg font-bold text-ink">{dragging ? (multiple ? "Release to add your files" : "Release to open your file") : prompt}</p>
      <p className="mt-1 text-sm text-muted">or</p>

      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        className="peer sr-only"
        aria-describedby={hintId}
        disabled={disabled}
        onChange={(event) => {
          handle(event.target.files);
          // Allow choosing the same file again after a reset.
          event.target.value = "";
        }}
      />
      <label
        htmlFor={inputId}
        className={buttonClass(
          "primary",
          `mt-3 cursor-pointer px-6 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${disabled ? "pointer-events-none opacity-55" : ""}`,
        )}
      >
        {buttonLabel}
      </label>

      <p id={hintId} className="mt-4 text-sm text-muted">
        {hint}
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
          <rect x="2.5" y="6" width="9" height="6.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <span>{privacyNote ?? (multiple ? "Processed in your browser — your files aren't uploaded." : "Processed in your browser — your file isn't uploaded.")}</span>
      </p>
    </div>
  );
}

/** Small document icon with a format label, used in file rows. */
export function FileBadge({ label }: { label: string }) {
  return (
    <span aria-hidden="true" className="flex h-12 w-10 shrink-0 flex-col items-center justify-end rounded border border-line-strong bg-surface pb-1 text-[0.625rem] font-bold uppercase tracking-wide text-accent-ink">
      {label}
    </span>
  );
}
