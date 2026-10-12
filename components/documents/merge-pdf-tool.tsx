"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Alert } from "@/components/controls/alert";
import { buttonClass } from "@/components/controls/button";
import { DownloadButton } from "@/components/download-button/download-button";
import { useObjectUrl, useToolOpen } from "@/components/tools/hooks";
import { ActionButton } from "@/components/tools/tool-workspace";
import { track } from "@/lib/analytics";
import { runDocumentRequest } from "@/lib/documents/client";
import { DocumentToolError, isAbortError, toDocumentToolError } from "@/lib/documents/errors";
import { assertPdfHeader, DOC_LIMITS } from "@/lib/documents/validate";
import { countBucket, formatBytes } from "@/lib/utils/format";
import { DocumentDropzone, FileBadge } from "./document-dropzone";

interface PdfItem {
  id: string;
  file: File;
  status: "checking" | "ready" | "invalid";
  pages?: number;
  restricted?: boolean;
  error?: string;
}

const ACCEPT = ".pdf,application/pdf";
const HINT = `PDF files · up to ${DOC_LIMITS.mergeMaxFiles} files, ${formatBytes(DOC_LIMITS.mergeMaxFileBytes)} each and ${formatBytes(DOC_LIMITS.mergeMaxTotalBytes)} in total`;

let nextId = 0;
const newId = () => `pdf-${++nextId}`;

/**
 * Merge PDF: an ordered list of PDFs, each checked in a worker (is it a
 * readable PDF, how many pages), then merged in that order in a worker.
 */
export function MergePdfTool() {
  const tool = "merge-pdf" as const;
  useToolOpen(tool);
  const [items, setItems] = useState<PdfItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<DocumentToolError | null>(null);
  const [result, setResult] = useState<{ key: string; blob: Blob; pages: number; files: number } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const controller = useRef<AbortController | null>(null);
  const checks = useRef<Promise<void>>(Promise.resolve());
  const addInputId = useId();
  const resultHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const ready = items.filter((item) => item.status === "ready");
  const checking = items.some((item) => item.status === "checking");
  const invalid = items.filter((item) => item.status === "invalid").length;
  const key = ready.map((item) => item.id).join(",");
  const current = result?.key === key ? result : null;
  const url = useObjectUrl(current?.blob ?? null);

  useEffect(() => {
    if (current) resultHeading.current?.focus();
  }, [current]);

  const update = (id: string, patch: Partial<PdfItem>) => setItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const add = useCallback((files: File[]) => {
    setNotice(null);
    setError(null);
    const existing = itemsRef.current;
    const room = DOC_LIMITS.mergeMaxFiles - existing.length;
    if (room <= 0) {
      setNotice(`You can merge up to ${DOC_LIMITS.mergeMaxFiles} PDFs at once.`);
      return;
    }
    let total = existing.reduce((sum, item) => sum + item.file.size, 0);
    const accepted: File[] = [];
    let overTotal = false;
    for (const file of files.slice(0, room)) {
      if (total + file.size > DOC_LIMITS.mergeMaxTotalBytes) {
        overTotal = true;
        continue;
      }
      total += file.size;
      accepted.push(file);
    }
    if (files.length > room) setNotice(`Only the first ${room} were added: the limit is ${DOC_LIMITS.mergeMaxFiles} PDFs.`);
    else if (overTotal) setNotice(`Some files weren't added: all files together must be under ${formatBytes(DOC_LIMITS.mergeMaxTotalBytes)}.`);
    const added: PdfItem[] = accepted.map((file) => ({ id: newId(), file, status: "checking" }));
    if (added.length === 0) return;
    setItems((list) => [...list, ...added]);
    setAnnouncement(`${added.length} ${added.length === 1 ? "file" : "files"} added.`);
    track("image_uploaded", { tool, count_bucket: countBucket(added.length) });
    // Check files one at a time: each check opens the whole PDF.
    for (const item of added) {
      checks.current = checks.current.then(async () => {
        if (!itemsRef.current.some((entry) => entry.id === item.id)) return;
        try {
          assertPdfHeader(new Uint8Array(await item.file.slice(0, 1024).arrayBuffer()), item.file.size, DOC_LIMITS.mergeMaxFileBytes);
          const response = await runDocumentRequest({ type: "inspect-pdf", data: await item.file.arrayBuffer() }, { timeoutMs: 60_000 });
          if (response.type !== "inspect-pdf") throw new DocumentToolError("CORRUPT", "This PDF couldn't be read.");
          update(item.id, { status: "ready", pages: response.summary.pages, restricted: response.summary.restricted });
        } catch (caught) {
          update(item.id, { status: "invalid", error: toDocumentToolError(caught).message });
        }
      });
    }
  }, []);

  const remove = (item: PdfItem) => {
    setItems((list) => list.filter((entry) => entry.id !== item.id));
    setAnnouncement(`${item.file.name} removed.`);
  };

  const moveTo = (id: string, to: number) => {
    setItems((list) => {
      const from = list.findIndex((entry) => entry.id === id);
      if (from < 0 || to < 0 || to >= list.length || from === to) return list;
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setAnnouncement(`${moved.file.name} moved to position ${to + 1} of ${list.length}.`);
      return next;
    });
  };

  const merge = async () => {
    if (busy) return;
    const files = ready;
    if (files.length < 2) {
      setError(new DocumentToolError("TOO_FEW_FILES", "Add at least two valid PDFs to merge."));
      return;
    }
    const run = new AbortController();
    controller.current = run;
    setBusy(true);
    setError(null);
    setProgress(0);
    track("processing_started", { tool, count_bucket: countBucket(files.length) });
    try {
      const data = await Promise.all(files.map(async (item) => ({ name: item.file.name, data: await item.file.arrayBuffer() })));
      const response = await runDocumentRequest({ type: "merge-pdf", files: data }, { signal: run.signal, onProgress: setProgress });
      if (response.type !== "merge-pdf") throw new DocumentToolError("CONVERSION_FAILED", "The PDFs couldn't be merged. Please try again.");
      setResult({ key: files.map((item) => item.id).join(","), blob: new Blob([response.bytes as BlobPart], { type: "application/pdf" }), pages: response.pages, files: files.length });
      setAnnouncement(`Merged ${files.length} PDFs into one PDF with ${response.pages} pages. Ready to download.`);
      track("pdf_created", { tool, count_bucket: countBucket(files.length), mode: "merge" });
    } catch (caught) {
      if (isAbortError(caught)) {
        setAnnouncement("Merge cancelled.");
        return;
      }
      const normalized = toDocumentToolError(caught);
      setError(normalized);
      track("processing_failed", { tool, error_code: normalized.code });
    } finally {
      if (controller.current === run) controller.current = null;
      setBusy(false);
      setProgress(null);
    }
  };

  const reset = () => {
    controller.current?.abort();
    controller.current = null;
    setItems([]);
    setResult(null);
    setError(null);
    setNotice(null);
    setBusy(false);
    setAnnouncement("All files removed. Choose PDFs to start a new merge.");
  };

  const live = (
    <p className="sr-only" aria-live="polite">
      {announcement}
    </p>
  );

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {live}
        {notice ? <Alert tone="warning">{notice}</Alert> : null}
        <DocumentDropzone accept={ACCEPT} hint={HINT} prompt="Drop the PDFs you want to merge" buttonLabel="Choose PDF files" multiple onFiles={add} />
      </div>
    );
  }

  const totalPages = ready.reduce((sum, item) => sum + (item.pages ?? 0), 0);

  return (
    <div className="space-y-5">
      {live}
      <section aria-label="PDFs to merge" className="rounded-lg border border-line bg-canvas shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-ink">
            {items.length} {items.length === 1 ? "PDF" : "PDFs"}
            <span className="font-normal text-muted"> · merged in this order{totalPages ? ` · ${totalPages} pages` : ""}</span>
          </p>
          <div className="flex gap-2">
            <input
              id={addInputId}
              type="file"
              multiple
              accept={ACCEPT}
              className="peer sr-only"
              disabled={busy}
              onChange={(event) => {
                const files = [...(event.target.files ?? [])];
                if (files.length) add(files);
                event.target.value = "";
              }}
            />
            <label
              htmlFor={addInputId}
              className={buttonClass("secondary", `min-h-10 cursor-pointer px-3 text-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${busy ? "pointer-events-none opacity-55" : ""}`)}
            >
              Add PDFs
            </label>
            <button type="button" onClick={reset} className={buttonClass("ghost", "min-h-10 px-3 text-sm")}>
              Clear all
            </button>
          </div>
        </div>
        {notice ? (
          <div className="px-4 pt-3 sm:px-5">
            <Alert tone="warning">{notice}</Alert>
          </div>
        ) : null}
        <p className="px-4 pt-3 text-xs text-muted sm:px-5">Use the arrows to change the order, or drag a file on a computer.</p>
        <ol className="divide-y divide-line">
          {items.map((item, index) => (
            <li
              key={item.id}
              draggable={!busy}
              onDragStart={(event) => {
                setDragId(item.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", item.id);
              }}
              onDragOver={(event) => {
                if (dragId) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragId) moveTo(dragId, index);
                setDragId(null);
              }}
              onDragEnd={() => setDragId(null)}
              className={`flex items-center gap-3 px-4 py-2.5 sm:px-5 ${dragId === item.id ? "opacity-50" : ""} ${dragId ? "cursor-grabbing" : "sm:cursor-grab"}`}
            >
              <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted" aria-hidden="true">
                {index + 1}
              </span>
              <FileBadge label="PDF" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink" title={item.file.name}>
                  <span className="sr-only">File {index + 1}: </span>
                  {item.file.name}
                </p>
                <p className={`text-xs ${item.status === "invalid" ? "font-medium text-danger-ink" : "text-muted"}`}>
                  {item.status === "checking"
                    ? `${formatBytes(item.file.size)} · Checking…`
                    : item.status === "invalid"
                      ? `Skipped: ${item.error}`
                      : `${formatBytes(item.file.size)} · ${item.pages} ${item.pages === 1 ? "page" : "pages"}${item.restricted ? " · has usage restrictions" : ""}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton label={`Move ${item.file.name} up`} disabled={busy || index === 0} onClick={() => moveTo(item.id, index - 1)} path="M3 9l4-4 4 4" />
                <IconButton label={`Move ${item.file.name} down`} disabled={busy || index === items.length - 1} onClick={() => moveTo(item.id, index + 1)} path="M3 5l4 4 4-4" />
                <IconButton label={`Remove ${item.file.name}`} disabled={busy} onClick={() => remove(item)} path="M3.5 3.5l7 7M10.5 3.5l-7 7" />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Merge" className="space-y-4 rounded-lg border border-line bg-canvas p-4 shadow-sm sm:p-5">
        {invalid > 0 ? (
          <Alert tone="warning" title={`${invalid} ${invalid === 1 ? "file is" : "files are"} skipped`}>
            Only the PDFs marked with a page count are merged. Remove skipped files or replace them.
          </Alert>
        ) : null}
        {ready.some((item) => item.restricted) ? (
          <Alert tone="info" title="Restricted PDFs">
            Some PDFs have owner restrictions (for example on printing or editing). Their pages are copied as they are; the merged
            PDF doesn&apos;t carry those restrictions or any digital signatures.
          </Alert>
        ) : null}
        {error ? (
          <Alert tone="error" title="The PDFs couldn't be merged">
            {error.message}
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-start gap-3">
          <ActionButton onClick={merge} busy={busy} busyLabel="Merging PDFs…" progress={progress} disabled={checking || ready.length < 2}>
            {current ? "Merge again" : `Merge ${ready.length} PDFs`}
          </ActionButton>
          {busy ? (
            <button type="button" onClick={() => controller.current?.abort()} className={buttonClass("secondary", "px-5")}>
              Cancel
            </button>
          ) : null}
        </div>
        {!busy && ready.length < 2 && !checking ? <p className="text-sm text-muted">Add at least two valid PDFs to merge.</p> : null}
        {checking ? <p className="text-sm text-muted">Checking files…</p> : null}
      </section>

      {current && url ? (
        <section aria-labelledby="result-heading" className="rounded-lg border border-line bg-canvas shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
            <div>
              <h2 id="result-heading" ref={resultHeading} tabIndex={-1} className="text-lg font-bold text-ink outline-none">
                Your merged PDF is ready
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                {current.files} files · {current.pages} {current.pages === 1 ? "page" : "pages"} · {formatBytes(current.blob.size)}
              </p>
            </div>
            <DownloadButton href={url} fileName={`merged-${current.pages}-pages.pdf`} label="Download PDF" tool={tool} outputFormat="PDF" />
          </div>
          <div className="border-t border-line px-4 py-3 sm:px-5">
            <button type="button" onClick={reset} className="text-sm font-medium text-accent underline">
              Start a new merge
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function IconButton({ label, disabled, onClick, path }: { label: string; disabled?: boolean; onClick: () => void; path: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line-strong text-ink-soft hover:bg-surface disabled:opacity-40"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
