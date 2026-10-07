"use client";

import { useId, useState } from "react";
import { Alert } from "@/components/controls/alert";
import { FieldLabel, inputClass, QualitySlider, Segmented } from "@/components/controls/fields";
import { DownloadButton } from "@/components/download-button/download-button";
import { ImagePreview } from "@/components/image-preview/image-preview";
import { ImageDropzone } from "@/components/image-uploader/image-dropzone";
import { track } from "@/lib/analytics";
import { toImageToolError, type ImageToolError } from "@/lib/image-processing/errors";
import { FORMATS, RASTER_INPUT_FORMATS } from "@/lib/image-processing/formats";
import { mergeLayout, type MergeDirection, type MergeLayoutOptions, type MergeMatch } from "@/lib/image-processing/merge-layout";
import { countBucket, formatBytes, formatDimensions } from "@/lib/utils/format";
import { useJobRunner, useObjectUrl, useToolOpen } from "./hooks";
import { ImageListView, useImageList } from "./image-list";
import { ActionButton } from "./tool-workspace";

const TOOL = "merge-images" as const;
const MAX_IMAGES = 30;

type Backdrop = "white" | "black" | "transparent" | "custom";
type Output = "image/png" | "image/jpeg";
type Spacing = "0" | "10" | "30" | "60";

export function MergeImagesTool() {
  useToolOpen(TOOL);
  const list = useImageList({ tool: TOOL, accept: RASTER_INPUT_FORMATS, max: MAX_IMAGES });
  const runner = useJobRunner();
  const colorId = useId();
  const [direction, setDirection] = useState<MergeDirection>("vertical");
  const [columns, setColumns] = useState("2");
  const [match, setMatch] = useState<MergeMatch>("smallest");
  const [spacing, setSpacing] = useState<Spacing>("0");
  const [backdrop, setBackdrop] = useState<Backdrop>("white");
  const [customColor, setCustomColor] = useState("#f1f5f9");
  const [output, setOutput] = useState<Output>("image/jpeg");
  const [quality, setQuality] = useState(0.92);
  const [error, setError] = useState<ImageToolError | null>(null);
  const [result, setResult] = useState<{ key: string; blob: Blob; width: number; height: number; limitScale: number; mime: Output } | null>(null);

  const ready = list.ready;
  const columnCount = Math.max(1, Math.min(Number(columns) || 1, 10));
  const layoutOptions: MergeLayoutOptions = { direction, match, columns: columnCount, spacing: Number(spacing) };
  const background = backdrop === "transparent" ? null : backdrop === "white" ? "#ffffff" : backdrop === "black" ? "#000000" : customColor;
  const mime: Output = backdrop === "transparent" ? "image/png" : output;
  const key = JSON.stringify([ready.map((item) => item.id), layoutOptions, background, mime, mime === "image/jpeg" ? quality : null]);
  const current = result?.key === key ? result : null;
  const url = useObjectUrl(current?.blob ?? null);
  const preview = ready.length >= 2 ? mergeLayout(ready.map((item) => ({ width: item.width!, height: item.height! })), layoutOptions) : null;

  const merge = async () => {
    if (ready.length < 2) return;
    setError(null);
    track("processing_started", { tool: TOOL, count_bucket: countBucket(ready.length), mode: direction });
    try {
      const done = await runner.run({
        kind: "merge",
        sourceId: ready[0].id,
        file: ready[0].file,
        files: ready.map((item) => item.file),
        layout: layoutOptions,
        background,
        mime,
        quality: mime === "image/jpeg" ? quality : undefined,
      });
      if (!done) return;
      setResult({ key, blob: done.blob, width: done.width, height: done.height, limitScale: done.limitScale, mime });
      track("images_merged", { tool: TOOL, count_bucket: countBucket(ready.length), mode: direction, output_format: FORMATS[mime].label });
    } catch (caught) {
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    }
  };

  const reset = () => {
    runner.cancel();
    list.clear();
    setResult(null);
    setError(null);
  };

  if (list.items.length === 0) {
    return <ImageDropzone accept={RASTER_INPUT_FORMATS} onFiles={list.add} prompt="Drop two or more images to merge" />;
  }

  const scaleNote =
    match === "smallest"
      ? "Larger images are scaled down to match the smallest, so nothing is blown up."
      : match === "largest"
        ? "Smaller images are enlarged to match the largest; they may look softer."
        : "Every image keeps its own size.";

  return (
    <div className="space-y-6">
      <ImageListView list={list} accept={RASTER_INPUT_FORMATS} itemLabel="Image" />

      <section aria-label="Merge settings" className="space-y-5 rounded-lg border border-line bg-canvas p-4 shadow-sm sm:p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Segmented<MergeDirection>
            legend="Layout"
            value={direction}
            onChange={setDirection}
            options={[
              { value: "vertical", label: "Vertical" },
              { value: "horizontal", label: "Horizontal" },
              { value: "grid", label: "Grid" },
            ]}
          />
          {direction === "grid" ? (
            <div>
              <FieldLabel htmlFor="merge-columns">Columns</FieldLabel>
              <input
                id="merge-columns"
                type="number"
                min={1}
                max={10}
                inputMode="numeric"
                value={columns}
                onChange={(event) => setColumns(event.target.value)}
                className={`${inputClass} mt-1.5 max-w-[8rem]`}
              />
            </div>
          ) : null}
          <Segmented<MergeMatch>
            legend={direction === "horizontal" ? "Match heights" : direction === "vertical" ? "Match widths" : "Cell size"}
            value={match}
            onChange={setMatch}
            hint={scaleNote}
            options={[
              { value: "smallest", label: "Smallest" },
              { value: "largest", label: "Largest" },
              { value: "original", label: "Keep sizes" },
            ]}
          />
          <Segmented<Spacing>
            legend="Spacing"
            value={spacing}
            onChange={setSpacing}
            options={[
              { value: "0", label: "None" },
              { value: "10", label: "10 px" },
              { value: "30", label: "30 px" },
              { value: "60", label: "60 px" },
            ]}
          />
          <Segmented<Backdrop>
            legend="Background"
            value={backdrop}
            onChange={setBackdrop}
            hint="Shows in the spacing and around images of different shapes."
            options={[
              { value: "white", label: "White" },
              { value: "black", label: "Black" },
              { value: "transparent", label: "Transparent" },
              { value: "custom", label: "Colour" },
            ]}
          />
          {backdrop === "custom" ? (
            <div className="flex items-center gap-3">
              <input
                id={colorId}
                type="color"
                value={customColor}
                onChange={(event) => setCustomColor(event.target.value)}
                className="h-11 w-14 cursor-pointer rounded-md border border-line-strong bg-canvas p-1"
              />
              <label htmlFor={colorId} className="text-sm text-ink">
                Background colour <span className="font-mono text-muted">{customColor.toUpperCase()}</span>
              </label>
            </div>
          ) : null}
          {backdrop === "transparent" ? (
            <p className="text-sm text-muted">A transparent background is saved as PNG.</p>
          ) : (
            <Segmented<Output>
              legend="Save as"
              value={output}
              onChange={setOutput}
              options={[
                { value: "image/jpeg", label: "JPG" },
                { value: "image/png", label: "PNG" },
              ]}
            />
          )}
          {mime === "image/jpeg" ? <QualitySlider value={quality} onChange={setQuality} min={0.6} /> : null}
        </div>

        {preview ? (
          <div>
            <p className="text-sm font-medium text-ink">
              Preview <span className="font-normal text-muted">· {formatDimensions(preview.width, preview.height)}</span>
            </p>
            <div
              className={`relative mx-auto mt-2 max-h-80 overflow-hidden border border-line ${backdrop === "transparent" ? "checkerboard" : ""}`}
              style={{ aspectRatio: `${preview.width} / ${preview.height}`, maxWidth: `min(100%, calc(20rem * ${preview.width} / ${preview.height}))`, background: background ?? undefined }}
              role="img"
              aria-label={`Layout preview: ${ready.length} images, ${direction}, ${formatDimensions(preview.width, preview.height)}`}
            >
              {ready.map((item, index) => {
                const r = preview.rects[index];
                return item.thumbUrl ? (
                  <img
                    key={item.id}
                    src={item.thumbUrl}
                    alt=""
                    className="absolute max-w-none"
                    style={{ left: `${(r.x / preview.width) * 100}%`, top: `${(r.y / preview.height) * 100}%`, width: `${(r.width / preview.width) * 100}%`, height: `${(r.height / preview.height) * 100}%` }}
                  />
                ) : null;
              })}
            </div>
            {preview.limitScale < 1 ? (
              <p className="mt-2 text-sm text-muted">
                The combined image would be larger than browsers can create, so it will be scaled to {Math.round(preview.limitScale * 100)}%.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted">Add at least two images to merge.</p>
        )}

        {error ? (
          <Alert tone="error" title="The images couldn't be merged">
            {error.message}
          </Alert>
        ) : null}
        <ActionButton onClick={merge} busy={runner.busy} busyLabel="Merging…" progress={runner.progress} disabled={ready.length < 2 || list.checking}>
          {current ? "Merge again" : `Merge ${ready.length} images`}
        </ActionButton>
        <button type="button" onClick={reset} className="text-sm font-medium text-accent underline">
          Start over
        </button>
      </section>

      {current && url ? (
        <section aria-labelledby="result-heading" className="rounded-lg border border-line bg-canvas shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-5">
            <div>
              <h2 id="result-heading" tabIndex={-1} className="text-lg font-semibold text-ink outline-none">
                Your merged image
              </h2>
              <p className="mt-0.5 text-sm text-muted" aria-live="polite">
                {FORMATS[current.mime].label} · {formatDimensions(current.width, current.height)} · {formatBytes(current.blob.size)}
              </p>
            </div>
            <DownloadButton href={url} fileName={`merged-${ready.length}-images.${FORMATS[current.mime].extension}`} label={`Download ${FORMATS[current.mime].label}`} tool={TOOL} outputFormat={FORMATS[current.mime].label} />
          </div>
          <div className="p-4 sm:p-5">
            <ImagePreview src={url} alt={`Merged image of ${ready.length} pictures, ${formatDimensions(current.width, current.height)}`} width={current.width} height={current.height} className="h-64 sm:h-96" />
            {current.limitScale < 1 ? (
              <p className="mt-3 text-sm text-muted">Scaled to {Math.round(current.limitScale * 100)}% to stay within the size browsers can create.</p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
