"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/controls/alert";
import { buttonClass } from "@/components/controls/button";
import { Checkbox, FieldLabel, inputClass, QualitySlider, Segmented } from "@/components/controls/fields";
import { ImageDropzone } from "@/components/image-uploader/image-dropzone";
import { track } from "@/lib/analytics";
import { bulkSettingsError, bulkTargetSize, type BulkResizeSettings } from "@/lib/image-processing/bulk";
import { createProcessingPool, isAbortError, newSourceId, type ProcessingPool } from "@/lib/image-processing/client";
import { toImageToolError } from "@/lib/image-processing/errors";
import { FORMATS, outputMimeFor, RASTER_INPUT_FORMATS, type ImageMime, type OutputMime } from "@/lib/image-processing/formats";
import { validateImageFile } from "@/lib/image-processing/validate";
import { countBucket, formatBytes, formatDimensions, outputFileName } from "@/lib/utils/format";
import { useEncodeSupport, useToolOpen } from "./hooks";

const TOOL = "bulk-image-resizer" as const;
/** Upper limit per batch, so a phone doesn't run out of memory holding the results. */
const MAX_FILES = 200;
const THUMB_SIZE = 96;

type Status = "checking" | "ready" | "invalid" | "queued" | "processing" | "done" | "failed";
type OutputChoice = "original" | OutputMime;

interface BulkOutput {
  blob: Blob;
  width: number;
  height: number;
  mime: OutputMime;
  url: string;
  fileName: string;
}

interface BulkItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: Status;
  mime?: ImageMime;
  width?: number;
  height?: number;
  hasTransparency?: boolean;
  thumbUrl?: string;
  error?: string;
  output?: BulkOutput;
}

function parseOptionalWhole(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  return /^\d+$/.test(v) ? Number(v) : NaN;
}

function revoke(item: BulkItem) {
  if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
  if (item.output) URL.revokeObjectURL(item.output.url);
}

export function BulkImageResizerTool() {
  useToolOpen(TOOL);
  const webpSupported = useEncodeSupport("image/webp");
  const [items, setItems] = useState<BulkItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<"pixels" | "percent">("pixels");
  const [width, setWidth] = useState("1280");
  const [height, setHeight] = useState("");
  const [lock, setLock] = useState(true);
  const [percent, setPercent] = useState("50");
  const [noEnlarge, setNoEnlarge] = useState(true);
  const [output, setOutput] = useState<OutputChoice>("original");
  const [quality, setQuality] = useState(0.85);
  const [running, setRunning] = useState(false);
  const [zipping, setZipping] = useState<number | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);
  const pool = useRef<ProcessingPool | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const getPool = () => (pool.current ??= createProcessingPool());

  useEffect(
    () => () => {
      pool.current?.dispose();
      for (const item of itemsRef.current) revoke(item);
    },
    [],
  );

  const update = useCallback((id: string, patch: Partial<BulkItem> | ((item: BulkItem) => Partial<BulkItem>)) => {
    setItems((list) =>
      list.map((item) => {
        if (item.id !== id) return item;
        const next = typeof patch === "function" ? patch(item) : patch;
        return { ...item, ...next };
      }),
    );
  }, []);

  /** Validates each file and makes a small thumbnail, a few at a time. */
  const addFiles = (files: File[]) => {
    setNotice(null);
    const room = MAX_FILES - itemsRef.current.length;
    if (room <= 0) {
      setNotice(`A batch can hold up to ${MAX_FILES} images. Download or clear this batch first.`);
      return;
    }
    const accepted = files.slice(0, room);
    if (files.length > room) setNotice(`Only the first ${room} images were added: a batch can hold up to ${MAX_FILES}.`);
    const added: BulkItem[] = accepted.map((file) => ({
      id: newSourceId(),
      file,
      name: file.name || "image",
      size: file.size,
      status: "checking",
    }));
    setItems((list) => [...list, ...added]);

    for (const item of added) {
      (async () => {
        try {
          const { mime } = await validateImageFile(item.file, { accept: RASTER_INPUT_FORMATS });
          const probe = await getPool().run({
            kind: "probe",
            sourceId: item.id,
            file: item.file,
            checkTransparency: FORMATS[mime].supportsTransparency,
            thumbnail: THUMB_SIZE,
            noCache: true,
          });
          // The item may have been removed while it was being checked.
          if (!itemsRef.current.some((entry) => entry.id === item.id)) return;
          const thumbUrl = probe.thumbnail ? URL.createObjectURL(probe.thumbnail) : undefined;
          update(item.id, { status: "ready", mime, width: probe.width, height: probe.height, hasTransparency: probe.hasTransparency, thumbUrl });
        } catch (caught) {
          if (isAbortError(caught)) return;
          update(item.id, { status: "invalid", error: toImageToolError(caught).message });
        }
      })();
    }
  };

  const widthValue = parseOptionalWhole(width);
  const heightValue = parseOptionalWhole(height);
  const settings: BulkResizeSettings = {
    mode,
    width: widthValue,
    height: heightValue,
    lockAspect: lock,
    percent: Number(percent),
    noEnlarge,
  };
  const settingsError =
    mode === "pixels" && (Number.isNaN(widthValue) || Number.isNaN(heightValue))
      ? "Width and height must be whole numbers."
      : bulkSettingsError(settings);

  const processable = items.filter((item) => item.status !== "checking" && item.status !== "invalid");
  const checking = items.some((item) => item.status === "checking");
  const done = items.filter((item) => item.status === "done");
  const failed = items.filter((item) => item.status === "failed");
  const inFlight = items.filter((item) => item.status === "queued" || item.status === "processing").length;
  const finished = running ? processable.length - inFlight : 0;

  const resizeAll = async () => {
    if (settingsError || running) return;
    const batch = itemsRef.current.filter((item) => item.status !== "checking" && item.status !== "invalid");
    if (batch.length === 0) return;
    setRunning(true);
    setZipError(null);
    for (const item of batch) {
      if (item.output) URL.revokeObjectURL(item.output.url);
      update(item.id, { status: "queued", output: undefined, error: undefined });
    }
    const runner = getPool();
    let succeeded = 0;
    await Promise.all(
      batch.map(async (item) => {
        const size = bulkTargetSize(item.width!, item.height!, settings);
        if ("error" in size) {
          update(item.id, { status: "failed", error: size.error });
          return;
        }
        const mime = output === "original" ? outputMimeFor(item.mime!) : output;
        const info = FORMATS[mime];
        update(item.id, { status: "processing" });
        try {
          const encoded = await runner.run({
            kind: "encode",
            sourceId: item.id,
            file: item.file,
            width: size.width,
            height: size.height,
            mime,
            quality: info.lossy ? quality : undefined,
            background: item.hasTransparency && !info.supportsTransparency ? "#ffffff" : null,
            noCache: true,
          });
          const fileName = outputFileName(item.name, `${encoded.width}x${encoded.height}`, info.extension);
          const url = URL.createObjectURL(encoded.blob);
          succeeded++;
          update(item.id, { status: "done", output: { blob: encoded.blob, width: encoded.width, height: encoded.height, mime, url, fileName } });
        } catch (caught) {
          if (isAbortError(caught)) {
            update(item.id, { status: "ready" });
            return;
          }
          update(item.id, { status: "failed", error: toImageToolError(caught).message });
        }
      }),
    );
    setRunning(false);
    const ok = succeeded;
    track("bulk_resize_completed", {
      tool: TOOL,
      count_bucket: countBucket(batch.length),
      mode,
      output_format: output === "original" ? "original" : FORMATS[output].label,
      outcome: ok === batch.length ? "all" : ok === 0 ? "none" : "partial",
    });
  };

  const cancel = () => {
    pool.current?.dispose();
    pool.current = null;
  };

  const remove = (id: string) => {
    setItems((list) => {
      const target = list.find((item) => item.id === id);
      if (target) revoke(target);
      return list.filter((item) => item.id !== id);
    });
  };

  const clearAll = () => {
    cancel();
    for (const item of itemsRef.current) revoke(item);
    setItems([]);
    setNotice(null);
    setZipError(null);
    setRunning(false);
  };

  const downloadZip = async () => {
    const ready = itemsRef.current.filter((item) => item.status === "done" && item.output);
    if (ready.length === 0) return;
    setZipError(null);
    setZipping(0);
    try {
      const { createZip, safeZipName, uniqueNames } = await import("@/lib/zip/zip");
      const names = uniqueNames(ready.map((item) => safeZipName(item.output!.fileName)));
      const zip = await createZip(
        ready.map((item, index) => ({ name: names[index], blob: item.output!.blob })),
        (fraction) => setZipping(fraction),
      );
      const url = URL.createObjectURL(zip);
      const link = document.createElement("a");
      link.href = url;
      link.download = "resized-images.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Give the browser time to start the download before freeing the memory.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      track("bulk_download_completed", { tool: TOOL, count_bucket: countBucket(ready.length), mode: "zip" });
    } catch (caught) {
      setZipError(
        caught instanceof Error && caught.name === "ZipError"
          ? caught.message
          : "We couldn't create the ZIP file, possibly because your browser ran out of memory. Download the images individually instead.",
      );
      track("processing_failed", { tool: TOOL, error_code: "ZIP_FAILED" });
    } finally {
      setZipping(null);
    }
  };

  const totalOut = done.reduce((sum, item) => sum + (item.output?.blob.size ?? 0), 0);
  const totalIn = done.reduce((sum, item) => sum + item.size, 0);
  const progress = running && processable.length > 0 ? finished / processable.length : null;

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {notice ? <Alert tone="warning">{notice}</Alert> : null}
        <ImageDropzone accept={RASTER_INPUT_FORMATS} onFiles={addFiles} prompt="Drop images to resize together" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-label="Batch settings" className="rounded-lg border border-line bg-canvas shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-ink">
            {items.length} image{items.length === 1 ? "" : "s"} selected
            {checking ? <span className="font-normal text-muted"> · checking files…</span> : null}
          </p>
          <button type="button" onClick={clearAll} className={buttonClass("ghost", "min-h-10 px-3 text-sm")}>
            Clear all
          </button>
        </div>
        <div className="grid gap-6 p-4 sm:p-5 md:grid-cols-2">
          <div className="space-y-5">
            <Segmented<"pixels" | "percent">
              legend="Resize by"
              value={mode}
              onChange={setMode}
              options={[
                { value: "pixels", label: "Pixels" },
                { value: "percent", label: "Percentage" },
              ]}
            />
            {mode === "pixels" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel htmlFor="bulk-width">Target width (px)</FieldLabel>
                    <input id="bulk-width" inputMode="numeric" placeholder="Any" value={width} onChange={(e) => setWidth(e.target.value)} aria-invalid={Boolean(settingsError)} className={`${inputClass} mt-1.5`} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="bulk-height">Target height (px)</FieldLabel>
                    <input id="bulk-height" inputMode="numeric" placeholder="Any" value={height} onChange={(e) => setHeight(e.target.value)} aria-invalid={Boolean(settingsError)} className={`${inputClass} mt-1.5`} />
                  </div>
                </div>
                <Checkbox
                  checked={lock}
                  onChange={setLock}
                  description={lock ? "Each image keeps its proportions and fits inside the width and height you enter." : "Every image becomes exactly this size, which stretches images with different proportions."}
                >
                  Lock aspect ratio
                </Checkbox>
              </div>
            ) : (
              <div className="max-w-[12rem]">
                <FieldLabel htmlFor="bulk-percent">Scale (%)</FieldLabel>
                <input id="bulk-percent" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} aria-invalid={Boolean(settingsError)} className={`${inputClass} mt-1.5`} />
              </div>
            )}
            <Checkbox checked={noEnlarge} onChange={setNoEnlarge} description="Images already smaller than the target keep their size instead of becoming blurry.">
              Don&apos;t enlarge smaller images
            </Checkbox>
            {settingsError ? <p className="text-sm font-medium text-danger">{settingsError}</p> : null}
          </div>
          <div className="space-y-5">
            <Segmented<OutputChoice>
              legend="Output format"
              value={output}
              onChange={setOutput}
              options={[
                { value: "original", label: "Same as each original" },
                { value: "image/jpeg", label: "JPG" },
                { value: "image/png", label: "PNG" },
                { value: "image/webp", label: "WebP", disabled: webpSupported === false },
              ]}
              hint="HEIC photos are saved as JPG when “Same as each original” is chosen."
            />
            {output === "original" || FORMATS[output].lossy ? (
              <QualitySlider value={quality} onChange={setQuality} min={0.3} hint="Applies to JPG and WebP files. 85% suits most photos." />
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={resizeAll}
                disabled={running || checking || Boolean(settingsError) || processable.length === 0}
                aria-busy={running}
                className={buttonClass("primary", "w-full px-6 sm:w-auto")}
              >
                {running ? "Resizing…" : done.length > 0 ? `Resize all ${processable.length} again` : `Resize all ${processable.length}`}
              </button>
              {running ? (
                <button type="button" onClick={cancel} className={buttonClass("secondary", "px-4")}>
                  Stop
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {notice ? <Alert tone="warning">{notice}</Alert> : null}

      <section aria-labelledby="bulk-files-heading" className="rounded-lg border border-line bg-canvas shadow-sm">
        <div className="space-y-3 border-b border-line px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="bulk-files-heading" className="text-lg font-semibold text-ink">
              Images
            </h2>
            {done.length > 0 && !running ? (
              <button type="button" onClick={downloadZip} disabled={zipping !== null} className={buttonClass("primary", "px-5")}>
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M9 2.5v9M5 8l4 4 4-4M3 15.5h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {zipping !== null ? `Creating ZIP… ${Math.round(zipping * 100)}%` : `Download all (${done.length}) as ZIP`}
              </button>
            ) : null}
          </div>
          <div role="status" aria-live="polite" className="text-sm text-muted">
            {running ? (
              <>
                Processing: <span className="font-medium text-ink">{finished} / {processable.length}</span> · Completed: {done.length} · Failed: {failed.length}
              </>
            ) : done.length > 0 || failed.length > 0 ? (
              <>
                Completed: <span className="font-medium text-ink">{done.length}</span> · Failed: {failed.length}
                {done.length > 0 ? ` · ${formatBytes(totalIn)} → ${formatBytes(totalOut)}` : ""}
              </>
            ) : (
              "Choose your settings, then select Resize all."
            )}
          </div>
          {progress !== null ? (
            <div
              role="progressbar"
              aria-label="Batch progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              className="h-2 overflow-hidden rounded-full bg-surface-strong"
            >
              <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          ) : null}
          {zipError ? <Alert tone="error" title="ZIP download failed">{zipError}</Alert> : null}
        </div>

        <ul className="divide-y divide-line">
          {items.map((item) => (
            <BulkRow key={item.id} item={item} onRemove={remove} disabled={running} />
          ))}
        </ul>
        <div className="border-t border-line p-4 sm:p-5">
          <ImageDropzone accept={RASTER_INPUT_FORMATS} onFiles={addFiles} prompt="Add more images" compact />
        </div>
      </section>
    </div>
  );
}

const STATUS_LABEL: Record<Status, string> = {
  checking: "Checking…",
  ready: "Ready",
  invalid: "Can't open",
  queued: "Waiting",
  processing: "Resizing…",
  done: "Done",
  failed: "Failed",
};

function BulkRow({ item, onRemove, disabled }: { item: BulkItem; onRemove: (id: string) => void; disabled: boolean }) {
  const tone =
    item.status === "done"
      ? "text-success"
      : item.status === "failed" || item.status === "invalid"
        ? "text-danger"
        : "text-muted";
  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <div className="checkerboard flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-line">
        {item.thumbUrl ? <img src={item.thumbUrl} alt="" className="max-h-full max-w-full object-contain" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink" title={item.name}>
          {item.name}
        </p>
        <p className="text-xs text-muted">
          {item.width && item.height ? `${formatDimensions(item.width, item.height)} · ` : ""}
          {formatBytes(item.size)}
          {item.output ? (
            <>
              {" → "}
              <span className="font-medium text-ink">
                {formatDimensions(item.output.width, item.output.height)} · {formatBytes(item.output.blob.size)} {FORMATS[item.output.mime].label}
              </span>
            </>
          ) : null}
        </p>
        {item.error ? <p className="text-xs text-danger">{item.error}</p> : null}
      </div>
      <span className={`hidden text-xs font-medium sm:inline ${tone}`}>{STATUS_LABEL[item.status]}</span>
      {item.output ? (
        <a
          href={item.output.url}
          download={item.output.fileName}
          onClick={() => track("download_clicked", { tool: TOOL, output_format: FORMATS[item.output!.mime].label })}
          className="inline-flex min-h-10 items-center rounded-md border border-line-strong px-3 text-sm font-medium text-accent hover:bg-surface"
          aria-label={`Download ${item.output.fileName}`}
        >
          Download
        </a>
      ) : (
        <span className={`text-xs font-medium sm:hidden ${tone}`}>{STATUS_LABEL[item.status]}</span>
      )}
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        disabled={disabled}
        aria-label={`Remove ${item.name}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-ink disabled:opacity-40"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}
