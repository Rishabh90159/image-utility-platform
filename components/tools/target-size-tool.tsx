"use client";

import { useEffect, useState } from "react";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { Alert } from "@/components/controls/alert";
import { Checkbox, FieldLabel, inputClass, Segmented } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import { toImageToolError } from "@/lib/image-processing/errors";
import { ALL_INPUT_FORMATS, FORMATS } from "@/lib/image-processing/formats";
import type { TargetResult } from "@/lib/image-processing/types";
import { formatBytes, formatDimensions, formatExactBytes, KB, MB, outputFileName, percentSaved, sizeBucket } from "@/lib/utils/format";
import { useEncodeSupport, useJobRunner, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const TOOL = "resize-image-to-kb" as const;
const PRESETS_KB = [20, 50, 100, 200, 500] as const;
const MIN_TARGET_BYTES = 2 * KB;
const MAX_TARGET_BYTES = 20 * MB;

type Preset = `${(typeof PRESETS_KB)[number]}` | "custom";
type Unit = "KB" | "MB";
type OutputMime = "image/jpeg" | "image/webp";

interface TargetState {
  key: string;
  result: TargetResult;
  image: ResultImage;
  targetBytes: number;
}

function parseTarget(preset: Preset, custom: string, unit: Unit): { bytes: number | null; error: string | null } {
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

export function TargetSizeTool() {
  useToolOpen(TOOL);
  const { source, loading, error, select, clear, setError } = useSourceImage({ tool: TOOL, accept: ALL_INPUT_FORMATS });
  const runner = useJobRunner();
  const webpSupported = useEncodeSupport("image/webp");

  const [preset, setPreset] = useState<Preset>("100");
  const [custom, setCustom] = useState("");
  const [unit, setUnit] = useState<Unit>("KB");
  const [format, setFormat] = useState<OutputMime>("image/jpeg");
  const [allowResize, setAllowResize] = useState(true);
  const [state, setState] = useState<TargetState | null>(null);

  // Links such as /tools/resize-image-to-kb?target=50 preselect a size.
  useEffect(() => {
    const requested = Number(new URLSearchParams(window.location.search).get("target"));
    if (!Number.isFinite(requested) || requested <= 0) return;
    if ((PRESETS_KB as readonly number[]).includes(requested)) {
      setPreset(String(requested) as Preset);
    } else if (requested >= 2 && requested <= 20 * 1024) {
      setPreset("custom");
      setCustom(String(requested));
      setUnit("KB");
    }
  }, []);

  const target = parseTarget(preset, custom, unit);
  const settingsKey = source ? JSON.stringify([source.id, target.bytes, format, allowResize]) : "";
  const current = state && state.key === settingsKey ? state : null;

  const run = async (image: SourceImage) => {
    if (!target.bytes) return;
    setError(null);
    const background = "#ffffff";
    try {
      const result = await runner.run({
        kind: "target",
        sourceId: image.id,
        file: image.file,
        sourceMime: image.mime,
        targetBytes: target.bytes,
        mime: format,
        allowResize,
        background,
      });
      if (!result) return;
      const outMime = result.usedOriginal ? image.mime : format;
      setState({
        key: settingsKey,
        result,
        targetBytes: target.bytes,
        image: { blob: result.blob, width: result.width, height: result.height, mime: outMime },
      });
      track("resize_completed", {
        tool: TOOL,
        input_format: FORMATS[image.mime].label,
        output_format: FORMATS[outMime].label,
        size_bucket: sizeBucket(image.size),
        target_kb: preset === "custom" ? undefined : Number(preset),
        outcome: result.usedOriginal ? "already_under" : result.outcome,
      });
    } catch (caught) {
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    }
  };

  const onFile = async (file: File) => {
    runner.cancel();
    const loaded = await select(file);
    if (loaded) setState(null);
  };

  const reset = () => {
    runner.cancel();
    clear();
    setState(null);
  };

  const targetLabel = target.bytes ? formatBytes(target.bytes) : "";

  const controls = source ? (
    <>
      <Segmented<Preset>
        legend="Target file size"
        value={preset}
        onChange={setPreset}
        options={[...PRESETS_KB.map((kb) => ({ value: String(kb) as Preset, label: `${kb} KB` })), { value: "custom", label: "Custom" }]}
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
        disabled={Boolean(target.error)}
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
      prompt="Drop an image to resize to a file size"
      controls={controls}
      result={source && current ? <TargetResultView source={source} state={current} /> : null}
    />
  );
}

function TargetResultView({ source, state }: { source: SourceImage; state: TargetState }) {
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
            Quality alone couldn&apos;t reach {formatBytes(targetBytes)} without visible blockiness, so the image was made smaller
            ({formatDimensions(source.width, source.height)} → {formatDimensions(image.width, image.height)}). If you need the
            original dimensions, turn off &ldquo;Allow smaller dimensions&rdquo; or choose a larger target.
          </Alert>
        ) : null}
      </>
    );
  } else {
    message = (
      <Alert tone="warning" title={`Closest achievable size: ${formatBytes(size)}`}>
        {result.outcome === "needs-resize"
          ? `At its full ${formatDimensions(source.width, source.height)} size, this image can't get below ${formatBytes(size)}, even at the lowest quality. Turn on "Allow smaller dimensions" to reach ${formatBytes(targetBytes)}.`
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
      tool={TOOL}
      heading={met ? "Your image is ready" : "Closest result"}
      original={source}
      output={image}
      fileName={outputFileName(source.name, `${Math.ceil(size / KB)}kb`, FORMATS[image.mime].extension)}
      downloadLabel={`Download ${FORMATS[image.mime].label} (${formatBytes(size)})`}
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
