"use client";

import { useRef, useState } from "react";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { Alert } from "@/components/controls/alert";
import { Checkbox, FieldLabel, inputClass, Segmented } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import type { GifInfo } from "@/lib/gif/decode";
import { readGifInfoAsync, resizeGifAsync } from "@/lib/gif/client";
import { toImageToolError } from "@/lib/image-processing/errors";
import { formatDimensions, outputFileName, sizeBucket } from "@/lib/utils/format";
import { useSourceImage, useToolOpen } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const TOOL = "resize-gif" as const;
const ACCEPT: ["image/gif"] = ["image/gif"];
const WIDTH_PRESETS = [160, 240, 320, 480, 640, 800];
const PERCENT_PRESETS = [25, 50, 75];
const MAX_SIDE = 4096;

type Mode = "pixels" | "percent";
type Resample = "smooth" | "pixel";

const chipClass =
  "min-h-9 rounded-md border border-line-strong px-3 text-sm tabular-nums text-ink-soft hover:bg-surface aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent-ink";

function parsePixels(value: string): number {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN;
}

function describeInfo(info: GifInfo): string {
  const parts = [info.frameCount === 1 ? "1 frame (not animated)" : `${info.frameCount} frames`];
  if (info.frameCount > 1) parts.push(`${(info.durationMs / 1000).toFixed(1)} s`);
  if (info.frameCount > 1) parts.push(info.loopCount === 0 ? "loops forever" : info.loopCount === null ? "plays once" : `loops ${info.loopCount}×`);
  return parts.join(" · ");
}

export function GifResizerTool() {
  useToolOpen(TOOL);
  const { source, loading, error, select, clear, setError } = useSourceImage({
    tool: TOOL,
    accept: ACCEPT,
    wrongFormatMessage: (detected) =>
      `This page resizes GIF files only. For a ${detected === "image/jpeg" ? "JPG" : detected === "image/png" ? "PNG" : "still image"}, use the image resizer.`,
  });
  const [info, setInfo] = useState<GifInfo | null>(null);
  const [mode, setMode] = useState<Mode>("pixels");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [lock, setLock] = useState(true);
  const [percent, setPercent] = useState("50");
  const [resample, setResample] = useState<Resample>("smooth");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<{ key: string; image: ResultImage; frames: number } | null>(null);
  const controller = useRef<AbortController | null>(null);

  const cancel = () => {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setProgress(null);
  };

  const onFile = async (file: File) => {
    cancel();
    setInfo(null);
    const loaded = await select(file);
    if (!loaded) return;
    setResult(null);
    setWidth(String(loaded.width));
    setHeight(String(loaded.height));
    try {
      setInfo(await readGifInfoAsync(file));
    } catch (caught) {
      setError(toImageToolError(caught));
    }
  };

  const reset = () => {
    cancel();
    clear();
    setInfo(null);
    setResult(null);
    setMode("pixels");
    setLock(true);
    setPercent("50");
    setResample("smooth");
  };

  if (!source) {
    return (
      <ToolWorkspace
        accept={ACCEPT}
        source={null}
        loading={loading}
        error={error}
        onFile={onFile}
        onReset={reset}
        prompt="Drop your GIF here"
        controls={null}
        acceptOverride={{ attribute: "image/gif,.gif", label: "GIF, animated or still" }}
      />
    );
  }

  const ratio = source.height / source.width;
  const target = (() => {
    if (mode === "percent") {
      const p = Number(percent);
      if (!Number.isFinite(p) || p <= 0) return null;
      return { width: Math.max(1, Math.round((source.width * p) / 100)), height: Math.max(1, Math.round((source.height * p) / 100)) };
    }
    const w = parsePixels(width);
    const h = parsePixels(height);
    return Number.isNaN(w) || Number.isNaN(h) ? null : { width: w, height: h };
  })();
  const dimsError = !target
    ? "Enter a width and height in pixels."
    : target.width < 1 || target.height < 1
      ? "Width and height must be at least 1 pixel."
      : target.width > MAX_SIDE || target.height > MAX_SIDE
        ? `Each side of a GIF can be at most ${MAX_SIDE.toLocaleString("en-US")} pixels here.`
        : mode === "percent" && Number(percent) > 400
          ? "Use a percentage between 1 and 400."
          : null;

  const settingsKey = JSON.stringify([source.id, target, resample]);
  const current = result?.key === settingsKey ? result : null;

  const onWidth = (value: string) => {
    setWidth(value);
    const w = parsePixels(value);
    if (lock && w > 0) setHeight(String(Math.max(1, Math.round(w * ratio))));
  };
  const onHeight = (value: string) => {
    setHeight(value);
    const h = parsePixels(value);
    if (lock && h > 0) setWidth(String(Math.max(1, Math.round(h / ratio))));
  };
  const onLock = (checked: boolean) => {
    setLock(checked);
    const w = parsePixels(width);
    if (checked && w > 0) setHeight(String(Math.max(1, Math.round(w * ratio))));
  };

  const run = async () => {
    if (!target || dimsError) return;
    cancel();
    const own = new AbortController();
    controller.current = own;
    setError(null);
    setBusy(true);
    setProgress(0);
    try {
      const resized = await resizeGifAsync(
        source.file,
        { width: target.width, height: target.height, resample },
        { signal: own.signal, onProgress: (value) => controller.current === own && setProgress(value) },
      );
      if (controller.current !== own) return;
      const blob = new Blob([resized.bytes as BlobPart], { type: "image/gif" });
      setResult({ key: settingsKey, image: { blob, width: resized.width, height: resized.height, mime: "image/gif" }, frames: resized.frameCount });
      track("resize_completed", { tool: TOOL, input_format: "GIF", output_format: "GIF", size_bucket: sizeBucket(source.size), mode });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    } finally {
      if (controller.current === own) {
        controller.current = null;
        setBusy(false);
        setProgress(null);
      }
    }
  };

  const enlarging = target && (target.width > source.width || target.height > source.height);
  const stretched = mode === "pixels" && !lock && target && Math.abs(target.height / target.width - ratio) / ratio > 0.01;

  const controls = (
    <>
      {info ? <p className="text-sm text-muted">{describeInfo(info)}</p> : null}

      <Segmented<Mode>
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
              <FieldLabel htmlFor="gif-width">Width (px)</FieldLabel>
              <input id="gif-width" inputMode="numeric" autoComplete="off" value={width} onChange={(e) => onWidth(e.target.value)} aria-invalid={Boolean(dimsError)} aria-describedby={dimsError ? "gif-dims-error" : undefined} className={`${inputClass} mt-1.5`} />
            </div>
            <div>
              <FieldLabel htmlFor="gif-height">Height (px)</FieldLabel>
              <input id="gif-height" inputMode="numeric" autoComplete="off" value={height} onChange={(e) => onHeight(e.target.value)} aria-invalid={Boolean(dimsError)} aria-describedby={dimsError ? "gif-dims-error" : undefined} className={`${inputClass} mt-1.5`} />
            </div>
          </div>
          <Checkbox checked={lock} onChange={onLock} description="Keeps the original proportions so the animation isn't stretched.">
            Maintain aspect ratio
          </Checkbox>
          <div>
            <p className="text-sm font-medium text-ink" id="gif-width-presets">
              Common GIF widths
            </p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="gif-width-presets">
              {WIDTH_PRESETS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setLock(true);
                    setWidth(String(w));
                    setHeight(String(Math.max(1, Math.round(w * ratio))));
                  }}
                  aria-pressed={parsePixels(width) === w && lock}
                  className={chipClass}
                >
                  {w} px
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="max-w-[12rem]">
            <FieldLabel htmlFor="gif-percent">Scale (%)</FieldLabel>
            <input id="gif-percent" inputMode="decimal" autoComplete="off" value={percent} onChange={(e) => setPercent(e.target.value)} aria-invalid={Boolean(dimsError)} aria-describedby={dimsError ? "gif-dims-error" : undefined} className={`${inputClass} mt-1.5`} />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Percentage presets">
            {PERCENT_PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setPercent(String(p))} aria-pressed={Number(percent) === p} className={chipClass}>
                {p}%
              </button>
            ))}
          </div>
        </div>
      )}

      {dimsError ? (
        <p id="gif-dims-error" className="text-sm font-medium text-danger">
          {dimsError}
        </p>
      ) : target ? (
        <p className="text-sm text-muted">
          New size: <span className="font-medium text-ink">{formatDimensions(target.width, target.height)}</span>
          <span className="text-muted"> (was {formatDimensions(source.width, source.height)})</span>
        </p>
      ) : null}

      <Segmented<Resample>
        legend="Scaling"
        value={resample}
        onChange={setResample}
        options={[
          { value: "smooth", label: "Smooth (photos, video clips)" },
          { value: "pixel", label: "Sharp pixels (pixel art)" },
        ]}
        hint="Sharp pixels keeps the original colours exactly and works best at 50%, 200% and other whole steps."
      />

      {enlarging && !dimsError ? (
        <Alert tone="info" title="Enlarging a GIF">
          A bigger GIF can&apos;t gain detail and its file grows quickly. Sharp pixels is usually the better choice for enlarging.
        </Alert>
      ) : null}
      {stretched && !dimsError ? (
        <Alert tone="warning" title="The GIF will be stretched">
          These dimensions don&apos;t match the original proportions. Turn on &ldquo;Maintain aspect ratio&rdquo; to avoid distortion.
        </Alert>
      ) : null}

      <ActionButton onClick={run} busy={busy} busyLabel="Resizing frames…" disabled={Boolean(dimsError)} progress={progress}>
        {current ? "Resize again" : "Resize GIF"}
      </ActionButton>
    </>
  );

  return (
    <ToolWorkspace
      accept={ACCEPT}
      source={source}
      loading={loading}
      error={error}
      onFile={onFile}
      onReset={reset}
      prompt="Drop your GIF here"
      controls={controls}
      acceptOverride={{ attribute: "image/gif,.gif", label: "GIF, animated or still" }}
      result={
        current ? (
          <ResultPanel
            tool={TOOL}
            heading="Your resized GIF"
            original={source}
            output={current.image}
            fileName={outputFileName(source.name, `${current.image.width}x${current.image.height}`, "gif")}
            downloadLabel="Download GIF"
            extraRows={info ? [{ label: "Frames", before: String(info.frameCount), after: String(current.frames) }] : undefined}
            status={
              <Alert tone="success" title={`Resized to ${formatDimensions(current.image.width, current.image.height)}`}>
                {info && info.frameCount > 1
                  ? current.frames < info.frameCount
                    ? "Animation, timing and looping are kept. Identical frames were merged into one longer frame, which looks the same and saves space."
                    : "Animation, timing and looping are kept. The preview plays the new file."
                  : "Check the preview, then download."}
              </Alert>
            }
          />
        ) : null
      }
    />
  );
}
