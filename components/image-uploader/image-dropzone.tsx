"use client";

import { useEffect, useId, useRef, useState } from "react";
import { buttonClass } from "@/components/controls/button";
import { acceptAttribute, LIMITS, type ImageMime } from "@/lib/image-processing/formats";
import { acceptedLabels } from "@/lib/image-processing/validate";
import { formatBytes } from "@/lib/utils/format";

interface ImageDropzoneProps {
  accept: ImageMime[];
  onFile: (file: File) => void;
  loading?: boolean;
  /** Short line describing what happens next, e.g. "Choose a JPG to convert to PNG". */
  prompt?: string;
}

/**
 * Upload area: drag and drop, file picker, or paste from the clipboard.
 * Files are read locally; nothing is sent over the network.
 */
export function ImageDropzone({ accept, onFile, loading = false, prompt = "Drop an image here" }: ImageDropzoneProps) {
  const inputId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  // Paste an image from the clipboard (Ctrl/Cmd + V) while the upload area is shown.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const file = [...(event.clipboardData?.files ?? [])][0];
      if (file) {
        event.preventDefault();
        onFile(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFile]);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
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
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-5 py-10 text-center transition-colors sm:py-14 ${
        dragging ? "border-accent bg-accent-soft" : "border-line-strong bg-canvas"
      }`}
      aria-busy={loading}
    >
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="text-accent">
        <rect x="5" y="8" width="30" height="24" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="14" cy="16" r="2.5" fill="currentColor" />
        <path d="M5 27l9-8 7 6 5-4 9 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <p className="mt-4 text-lg font-semibold text-ink">{loading ? "Opening image…" : prompt}</p>
      <p className="mt-1 text-sm text-muted">or</p>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={acceptAttribute(accept)}
        className="peer sr-only"
        aria-describedby={hintId}
        disabled={loading}
        onChange={(event) => {
          handleFiles(event.target.files);
          // Allow choosing the same file again after a reset.
          event.target.value = "";
        }}
      />
      <label
        htmlFor={inputId}
        className={buttonClass(
          "primary",
          `mt-3 cursor-pointer px-6 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${loading ? "pointer-events-none opacity-55" : ""}`,
        )}
      >
        Choose image
      </label>

      <p id={hintId} className="mt-4 text-sm text-muted">
        {acceptedLabels(accept)} · up to {formatBytes(LIMITS.maxFileBytes)} · one image at a time
        <span className="hidden sm:inline"> · or paste with Ctrl+V</span>
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <rect x="2.5" y="6" width="9" height="6.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        Processed in your browser. Your image is not uploaded.
      </p>
    </div>
  );
}
