"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/controls/alert";
import { buttonClass } from "@/components/controls/button";
import { DownloadButton } from "@/components/download-button/download-button";
import { useObjectUrl, useToolOpen } from "@/components/tools/hooks";
import { ActionButton } from "@/components/tools/tool-workspace";
import { track } from "@/lib/analytics";
import { isAbortError, toDocumentToolError, type DocumentToolError } from "@/lib/documents/errors";
import type { ToolId } from "@/lib/tools/registry";
import { formatBytes, sizeBucket } from "@/lib/utils/format";
import { DocumentDropzone, FileBadge } from "./document-dropzone";

export interface ConversionOutput {
  blob: Blob;
  fileName: string;
  /** Short facts shown under the result heading, e.g. "3 pages". */
  details: string[];
  /** Optional caveats about this particular result. */
  notes?: string[];
}

export interface SingleFileConverterProps {
  tool: ToolId;
  accept: string;
  hint: string;
  prompt: string;
  buttonLabel: string;
  inputLabel: string;
  outputLabel: string;
  actionLabel: string;
  busyLabel: string;
  downloadLabel: string;
  /** Quick check when a file is chosen; throws DocumentToolError for unusable files. */
  check: (file: File) => Promise<void>;
  convert: (file: File, options: { signal: AbortSignal; onProgress: (fraction: number) => void }) => Promise<ConversionOutput>;
  /** Shown with the selected file, before converting. */
  beforeConvert?: React.ReactNode;
}

type Phase = "empty" | "checking" | "ready" | "converting" | "done";

/**
 * One document in, one document out: choose a file, convert, download.
 * Used by Word to PDF and PDF to Word. A new run can't start while one is in
 * progress, and every run can be cancelled.
 */
export function SingleFileConverter(props: SingleFileConverterProps) {
  const { tool, check, convert } = props;
  useToolOpen(tool);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("empty");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<DocumentToolError | null>(null);
  const [result, setResult] = useState<ConversionOutput | null>(null);
  const [status, setStatus] = useState("");
  const controller = useRef<AbortController | null>(null);
  const request = useRef(0);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const url = useObjectUrl(result?.blob ?? null);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (phase === "done") resultHeading.current?.focus();
  }, [phase]);

  const select = async (files: File[]) => {
    const chosen = files[0];
    if (!chosen) return;
    controller.current?.abort();
    const id = ++request.current;
    setFile(chosen);
    setResult(null);
    setError(null);
    setPhase("checking");
    setStatus(`Checking ${chosen.name}…`);
    try {
      await check(chosen);
      if (id !== request.current) return;
      setPhase("ready");
      setStatus(`${chosen.name} is ready to convert.`);
      track("image_uploaded", { tool, input_format: props.inputLabel, size_bucket: sizeBucket(chosen.size) });
    } catch (caught) {
      if (id !== request.current) return;
      const normalized = toDocumentToolError(caught);
      setFile(null);
      setPhase("empty");
      setError(normalized);
      setStatus("");
      track("processing_failed", { tool, error_code: normalized.code });
    }
  };

  const run = async () => {
    if (!file || phase === "converting") return;
    const current = new AbortController();
    controller.current = current;
    const id = ++request.current;
    setPhase("converting");
    setError(null);
    setResult(null);
    setProgress(0);
    setStatus(`${props.busyLabel}`);
    track("processing_started", { tool, input_format: props.inputLabel });
    try {
      const output = await convert(file, {
        signal: current.signal,
        onProgress: (value) => {
          if (id === request.current) setProgress(value);
        },
      });
      if (id !== request.current) return;
      setResult(output);
      setPhase("done");
      setStatus(`Done. ${output.details.join(", ")}. Your ${props.outputLabel} is ready to download.`);
      track("conversion_completed", { tool, input_format: props.inputLabel, output_format: props.outputLabel, size_bucket: sizeBucket(output.blob.size) });
    } catch (caught) {
      if (id !== request.current) return;
      if (isAbortError(caught)) {
        setPhase("ready");
        setStatus("Conversion cancelled.");
        return;
      }
      const normalized = toDocumentToolError(caught);
      setError(normalized);
      setPhase("ready");
      setStatus("");
      track("processing_failed", { tool, error_code: normalized.code });
    } finally {
      if (id === request.current) setProgress(null);
      if (controller.current === current) controller.current = null;
    }
  };

  const cancel = () => {
    controller.current?.abort();
  };

  const reset = () => {
    controller.current?.abort();
    controller.current = null;
    request.current++;
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(null);
    setPhase("empty");
    setStatus("File removed. Choose another document to convert.");
  };

  const errorAlert = error ? (
    <Alert tone="error" title={phase === "empty" ? "This file can't be used" : "The conversion didn't work"}>
      {error.message}
    </Alert>
  ) : null;

  return (
    <div className="space-y-5">
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
      {phase === "empty" || !file ? (
        <>
          {errorAlert}
          <DocumentDropzone accept={props.accept} hint={props.hint} prompt={props.prompt} buttonLabel={props.buttonLabel} onFiles={select} />
        </>
      ) : (
        <section aria-label="Selected document" className="rounded-lg border border-line bg-canvas shadow-sm">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
            <FileBadge label={props.inputLabel} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-muted">
                {formatBytes(file.size)} · {phase === "checking" ? "Checking…" : phase === "converting" ? "Converting…" : phase === "done" ? "Converted" : "Ready to convert"}
              </p>
            </div>
            <button type="button" onClick={reset} className={buttonClass("ghost", "min-h-10 px-3 text-sm")} aria-label={`Remove ${file.name}`}>
              Remove
            </button>
          </div>

          {phase !== "done" ? (
            <div className="space-y-4 px-4 py-4 sm:px-5">
              {props.beforeConvert}
              {errorAlert}
              <div className="flex flex-wrap items-start gap-3">
                <ActionButton onClick={run} busy={phase === "converting"} busyLabel={props.busyLabel} progress={progress} disabled={phase === "checking"}>
                  {props.actionLabel}
                </ActionButton>
                {phase === "converting" ? (
                  <button type="button" onClick={cancel} className={buttonClass("secondary", "px-5")}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {phase === "done" && result && url ? (
            <div className="border-t border-line px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 id="result-heading" ref={resultHeading} tabIndex={-1} className="text-lg font-bold text-ink outline-none">
                    Your {props.outputLabel} is ready
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">{[...result.details, formatBytes(result.blob.size)].join(" · ")}</p>
                </div>
                <DownloadButton href={url} fileName={result.fileName} label={props.downloadLabel} tool={tool} outputFormat={props.outputLabel} />
              </div>
              {result.notes?.length ? (
                <div className="mt-4 space-y-2">
                  {result.notes.map((note) => (
                    <Alert key={note} tone="warning">
                      {note}
                    </Alert>
                  ))}
                </div>
              ) : null}
              <button type="button" onClick={reset} className="mt-4 text-sm font-medium text-accent underline">
                Convert another document
              </button>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
