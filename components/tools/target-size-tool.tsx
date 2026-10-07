"use client";

import { useEffect, useId, useState } from "react";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { Alert } from "@/components/controls/alert";
import { Checkbox, FieldLabel, inputClass, QualitySlider, Segmented } from "@/components/controls/fields";
import { track, type AnalyticsEvent } from "@/lib/analytics";
import { toImageToolError } from "@/lib/image-processing/errors";
import { ALL_INPUT_FORMATS, FORMATS, LIMITS } from "@/lib/image-processing/formats";
import { QUALITY } from "@/lib/image-processing/target-size";
import type { TargetResult } from "@/lib/image-processing/types";
import type { ToolId } from "@/lib/tools/registry";
import { formatBytes, formatDimensions, formatExactBytes, KB, MB, outputFileName, percentSaved, sizeBucket } from "@/lib/utils/format";
import { useEncodeSupport, useJobRunner, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const DEFAULT_PRESETS_KB = [20, 50, 100, 200, 500];
const MIN_TARGET_BYTES = 2 * KB;
const MAX_TARGET_BYTES = 20 * MB;

type Unit = "KB" | "MB";
type OutputMime = "image/jpeg" | "image/webp";

interface TargetState {
  key: string;
  result: TargetResult;
  image: ResultImage;
  targetBytes: number;
}

export interface TargetSizeToolProps {
  /** Which page the tool is on, for analytics and file naming. */
  tool?: ToolId;
  /** Target selected when the page opens, in KB. */
  defaultTargetKB?: number;
  /** Quick-pick targets in KB. */
  presetsKB?: number[];
  /** Read ?target= from the URL (only the generic exact-KB page uses this). */
  readTargetFromUrl?: boolean;
  /** Analytics events for a dedicated size page (e.g. the 20KB photo page). */
  events?: { started: AnalyticsEvent; completed: AnalyticsEvent; downloaded?: AnalyticsEvent };
}

function parseTarget(preset: string, custom: string, unit: Unit): { bytes: number | null; error: string | null } {
  if (preset !== "custom") return { bytes: Number(preset) * KB, error: null };
  const trimmed = custom.trim();
  if (!trimmed) return { bytes: null, error: "Enter a target size." };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return { bytes: null, error: "Enter a positive number, such as 75." };
  const bytes = Math.floor(value * (unit === "MB" ? MB : KB));
  if (bytes < MIN_TARGET_BYTES) return { bytes: null, error: "The smallest target is 2 KB." };
  if (bytes > MAX_TARGET_BYTES) return { bytes: null, error: "The largest target is 20 MB." };
  return { bytes, error: null };
}

/**
 * Reduce an image to a target file size with the shared exact-KB engine.
 * Used by the generic "Resize Image to KB" page and by each dedicated size page
 * (20KB, 50KB, 100KB, 200KB), which preselect their own target.
 */
export function TargetSizeTool({
  tool = "resize-image-to-kb",
  defaultTargetKB = 100,
  presetsKB = DEFAULT_PRESETS_KB,
  readTargetFromUrl = false,
  events,
}: TargetSizeToolProps) {
  useToolOpen(tool);
  const { source, loading, error, select, clear, setError } = useSourceImage({ tool, accept: ALL_INPUT_FORMATS });
  const runner = useJobRunner();
  const webpSupported = useEncodeSupport("image/webp");
  const optionsId = useId();

  const initialPreset = presetsKB.includes(defaultTargetKB) ? String(defaultTargetKB) : "custom";
  const [preset, setPreset] = useState<string>(initialPreset);
  const [custom, setCustom] = useState(initialPreset === "custom" ? String(defaultTargetKB) : "");
  const [unit, setUnit] = useState<Unit>("KB");
  const [format, setFormat] = useState<OutputMime>("image/jpeg");
  const [allowResize, setAllowResize] = useState(true);
  const [maxWidth, setMaxWidth] = useState("");
  const [qualityCap, setQualityCap] = useState<number>(QUALITY.max);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [state, setState] = useState<TargetState | null>(null);

  // Links such as /tools/resize-image-to-kb?target=50 preselect a size.
  useEffect(() => {
    if (!readTargetFromUrl) return;
    const requested = Number(new URLSearchParams(window.location.search).get("target"));
    if (!Number.isFinite(requested) || requested <= 0) return;
    if (presetsKB.includes(requested)) {
      setPreset(String(requested));
    } else if (requested >= 2 && requested <= 20 * 1024) {
      setPreset("custom");
      setCustom(String(requested));
      setUnit("KB");
    }
  }, [readTargetFromUrl, presetsKB]);

  const target = parseTarget(preset, custom, unit);

  // Optional maximum width: the image is scaled down to it first, then the size search runs.
  const maxWidthValue = maxWidth.trim() ? Number(maxWidth.trim()) : null;
  const widthError =
    maxWidthValue !== null && (!Number.isInteger(maxWidthValue) || maxWidthValue < 16 || maxWidthValue > LIMITS.maxOutputSide)
      ? `Enter a whole number of pixels between 16 and ${LIMITS.maxOutputSide.toLocaleString("en-US")}, or leave it empty.`
      : null;
  const capped = source && maxWidthValue && !widthError && maxWidthValue < source.width;
  const exact = capped
    ? { width: maxWidthValue, height: Math.max(1, Math.round((maxWidthValue * source.height) / source.width)) }
    : null;
  const customQuality = qualityCap < QUALITY.max - 0.001;

  const settingsKey = source ? JSON.stringify([source.id, target.bytes, format, allowResize, exact, customQuality ? qualityCap : null]) : "";
  const current = state && state.key === settingsKey ? state : null;

  const run = async (image: SourceImage) => {
    if (!target.bytes || widthError) return;
    setError(null);
    try {
      const result = await runner.run({
        kind: "target",
        sourceId: image.id,
        file: image.file,
        sourceMime: image.mime,
        targetBytes: target.bytes,
        mime: format,
        allowResize,
        background: "#ffffff",
        width: exact?.width,
        height: exact?.height,
        maxQuality: customQuality ? qualityCap : undefined,
      });
      if (!result) return;
      const outMime = result.usedOriginal ? image.mime : format;
      setState({
        key: settingsKey,
        result,
        targetBytes: target.bytes,
        image: { blob: result.blob, width: result.width, height: result.height, mime: outMime },
      });
      track(events?.completed ?? "resize_completed", {
        tool,
        input_format: FORMATS[image.mime].label,
        output_format: FORMATS[outMime].label,
        size_bucket: sizeBucket(image.size),
        target_kb: preset === "custom" ? undefined : Number(preset),
        outcome: result.usedOriginal ? "already_under" : result.outcome,
      });
    } catch (caught) {
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool, error_code: normalized.code });
    }
  };

  const onFile = async (file: File) => {
    runner.cancel();
    const loaded = await select(file);
    if (!loaded) return;
    setState(null);
    if (events) track(events.started, { tool, input_format: FORMATS[loaded.mime].label, size_bucket: sizeBucket(loaded.size) });
  };

  const reset = () => {
    runner.cancel();
    clear();
    setState(null);
    setMaxWidth("");
    setQualityCap(QUALITY.max);
    setOptionsOpen(false);
  };

  const targetLabel = target.bytes ? formatBytes(target.bytes) : "";

  const controls = source ? (
    <>
      <Segmented<string>
        legend="Target file size"
        value={preset}
        onChange={setPreset}
        options={[...presetsKB.map((kb) => ({ value: String(kb), label: `${kb} KB` })), { value: "custom", label: "Custom" }]}
      />

      {preset === "custom" ? (
        <div className="flex max-w-xs items-end gap-2">
          <div className="flex-1">
            <FieldLabel htmlFor="target-custom">Custom size</FieldLabel>
            <input
              id="target-custom"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 75"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              aria-invalid={Boolean(target.error)}
              aria-describedby="target-custom-help"
              className={`${inputClass} mt-1.5`}
            />
          </div>
          <div>
            <label htmlFor="target-unit" className="sr-only">
              Unit
            </label>
            <select
              id="target-unit"
              value={unit}
              onChange={(event) => setUnit(event.target.value as Unit)}
              className={`${inputClass} w-24`}
            >
              <option value="KB">KB</option>
              <option value="MB">MB</option>
            </select>
          </div>
        </div>
      ) : null}
      <p id="target-custom-help" className={`text-sm ${target.error ? "font-medium text-danger" : "text-muted"}`}>
        {target.error ??
          `Target: ${targetLabel} or less (${formatExactBytes(target.bytes ?? 0)}). Sizes use 1 KB = 1,024 bytes.`}
      </p>

      <Segmented<OutputMime>
        legend="Output format"
        value={format}
        onChange={setFormat}
        options={[
          { value: "image/jpeg", label: "JPG" },
          { value: "image/webp", label: "WebP", disabled: webpSupported === false },
        ]}
        hint="JPG is accepted almost everywhere, including most application forms."
      />

      <Checkbox
        checked={allowResize}
        onChange={setAllowResize}
        description="If quality alone can't reach the target, shrink the dimensions too. Recommended: a smaller sharp image looks better than a heavily compressed one."
      >
        Allow smaller dimensions
      </Checkbox>

      <details
        className="group rounded-md border border-line"
        open={optionsOpen}
        onToggle={(event) => setOptionsOpen(event.currentTarget.open)}
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
          More options: width and quality
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="transition-transform group-open:rotate-180">
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </summary>
        <div className="space-y-5 border-t border-line px-4 py-4">
          <div className="max-w-[14rem]">
            <FieldLabel htmlFor={`${optionsId}-width`}>Maximum width (px)</FieldLabel>
            <input
              id={`${optionsId}-width`}
              inputMode="numeric"
              autoComplete="off"
              placeholder={`Optional, now ${source.width}`}
              value={maxWidth}
              onChange={(event) => setMaxWidth(event.target.value)}
              aria-invalid={Boolean(widthError)}
              aria-describedby={`${optionsId}-width-help`}
              className={`${inputClass} mt-1.5`}
            />
            <p id={`${optionsId}-width-help`} className={`mt-1.5 text-xs ${widthError ? "font-medium text-danger" : "text-muted"}`}>
              {widthError ??
                (exact
                  ? `Starts from ${formatDimensions(exact.width, exact.height)}.`
                  : "Scale down to this width first. Wider than the image? It's left as is.")}
            </p>
          </div>
          <QualitySlider
            label="Highest quality allowed"
            value={qualityCap}
            onChange={setQualityCap}
            min={0.3}
            max={QUALITY.max}
            hint={
              customQuality
                ? "The tool won't go above this quality, so the file may end up well under the target."
                : "Automatic: the tool uses the highest quality that fits the target."
            }
          />
        </div>
      </details>

      {source.hasTransparency && format === "image/jpeg" ? (
        <Alert tone="info" title="Transparent areas will become white">
          JPG doesn&apos;t support transparency. Choose WebP to keep it.
        </Alert>
      ) : null}

      <ActionButton
        onClick={() => run(source)}
        busy={runner.busy}
        busyLabel="Finding the best quality…"
        progress={runner.progress}
        disabled={Boolean(target.error || widthError)}
      >
        {target.bytes ? `Resize to ${targetLabel}` : "Resize image"}
      </ActionButton>
    </>
  ) : null;

  return (
    <ToolWorkspace
      accept={ALL_INPUT_FORMATS}
      source={source}
      loading={loading}
      error={error}
      onFile={onFile}
      onReset={reset}
      prompt={target.bytes && preset !== "custom" ? `Drop an image to reduce to ${targetLabel}` : "Drop an image to resize to a file size"}
      controls={controls}
      result={source && current ? <TargetResultView tool={tool} source={source} state={current} downloadEvent={events?.downloaded} /> : null}
    />
  );
}

function TargetResultView({
  tool,
  source,
  state,
  downloadEvent,
}: {
  tool: ToolId;
  source: SourceImage;
  state: TargetState;
  downloadEvent?: AnalyticsEvent;
}) {
  const { result, image, targetBytes } = state;
  const size = image.blob.size;
  const met = size <= targetBytes;
  const resized = image.width !== source.width || image.height !== source.height;
  const saved = percentSaved(source.size, size);

  let message: React.ReactNode;
  if (result.usedOriginal) {
    message = (
      <Alert tone="success" title="Already under your target">
        Your image is {formatBytes(size)}, which is within {formatBytes(targetBytes)}, so no changes were needed. The download is
        your original file, unchanged.
      </Alert>
    );
  } else if (met) {
    message = (
      <>
        <Alert tone="success" title={`${formatBytes(size)} — within your ${formatBytes(targetBytes)} target`}>
          Saved at {Math.round((result.quality ?? 0) * 100)}% quality
          {resized ? `, resized to ${formatDimensions(image.width, image.height)}` : " at the original dimensions"}.
        </Alert>
        {resized ? (
          <Alert tone="info" title="Dimensions were reduced">
            {formatDimensions(source.width, source.height)} → {formatDimensions(image.width, image.height)}. Quality alone
            couldn&apos;t reach {formatBytes(targetBytes)} without visible blockiness, or you set a maximum width. If you need the
            original dimensions, turn off &ldquo;Allow smaller dimensions&rdquo; or choose a larger target.
          </Alert>
        ) : null}
      </>
    );
  } else {
    message = (
      <Alert tone="warning" title={`Closest achievable size: ${formatBytes(size)}`}>
        {result.outcome === "needs-resize"
          ? `At ${formatDimensions(image.width, image.height)}, this image can't get below ${formatBytes(size)}, even at the lowest quality. Turn on "Allow smaller dimensions" to reach ${formatBytes(targetBytes)}.`
          : `${formatBytes(targetBytes)} is smaller than this image can go, even at tiny dimensions and the lowest quality. Every image file has a minimum size for its headers and colour data. Try a larger target.`}
      </Alert>
    );
  }

  const stats = [
    { label: "Original size", value: formatBytes(source.size) },
    { label: "Target", value: `≤ ${formatBytes(targetBytes)}` },
    { label: "Result", value: formatBytes(size), emphasis: true },
    { label: "Saved", value: saved > 0.05 ? `${saved.toFixed(1)}%` : "—" },
  ];

  return (
    <ResultPanel
      tool={tool}
      heading={met ? "Your image is ready" : "Closest result"}
      original={source}
      output={image}
      fileName={outputFileName(source.name, `${Math.ceil(size / KB)}kb`, FORMATS[image.mime].extension)}
      downloadLabel={`Download ${FORMATS[image.mime].label} (${formatBytes(size)})`}
      downloadEvent={downloadEvent}
      extraRows={[
        { label: "Quality", before: "—", after: result.quality === null ? "Unchanged" : `${Math.round(result.quality * 100)}%` },
      ]}
      status={
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-canvas px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">{stat.label}</dt>
                <dd className={`mt-1 tabular-nums ${stat.emphasis ? "text-lg font-semibold text-ink" : "text-base text-ink"}`}>
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
          {message}
        </>
      }
    />
  );
}
