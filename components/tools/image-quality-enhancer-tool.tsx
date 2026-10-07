"use client";

import { useEffect, useId, useState } from "react";
import { CompareSlider } from "@/components/before-after/compare-slider";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { Alert } from "@/components/controls/alert";
import { buttonClass } from "@/components/controls/button";
import { Checkbox, FieldLabel } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import { AUTO_SETTINGS, isNeutral, NEUTRAL_SETTINGS, type EnhanceSettings } from "@/lib/image-processing/enhance";
import { toImageToolError } from "@/lib/image-processing/errors";
import { FORMATS, outputMimeFor, RASTER_INPUT_FORMATS } from "@/lib/image-processing/formats";
import { formatDimensions, outputFileName, sizeBucket } from "@/lib/utils/format";
import { useJobRunner, useObjectUrl, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const TOOL = "image-quality-enhancer" as const;
/** Long side of the live preview; small enough to update quickly while dragging. */
const PREVIEW_SIDE = 1000;

type SliderKey = Exclude<keyof EnhanceSettings, "autoLevels">;
const SLIDERS: { key: SliderKey; label: string; min: number; hint: string }[] = [
  { key: "brightness", label: "Brightness", min: -100, hint: "Lifts or darkens mid-tones without clipping highlights quickly." },
  { key: "contrast", label: "Contrast", min: -100, hint: "Separates light and dark areas." },
  { key: "saturation", label: "Saturation", min: -100, hint: "Colour intensity; −100 makes the image black and white." },
  { key: "warmth", label: "Warmth", min: -100, hint: "Cooler (blue) to warmer (orange) colour balance." },
  { key: "clarity", label: "Clarity", min: 0, hint: "Local contrast that brings out texture and mid-size detail." },
  { key: "sharpen", label: "Sharpen", min: 0, hint: "Crisper fine edges. Too much creates halos." },
];

function Slider({ label, value, min, hint, onChange }: { label: string; value: number; min: number; hint: string; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <output htmlFor={id} className="font-mono text-sm tabular-nums text-ink">
          {value > 0 && min < 0 ? `+${value}` : value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={100}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-describedby={`${id}-hint`}
        className="mt-2 h-2 w-full cursor-pointer accent-[var(--color-accent)]"
      />
      <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
        {hint}
      </p>
    </div>
  );
}

export function ImageQualityEnhancerTool() {
  useToolOpen(TOOL);
  const { source, loading, error, select, clear, setError } = useSourceImage({ tool: TOOL, accept: RASTER_INPUT_FORMATS });
  const previewRunner = useJobRunner();
  const finalRunner = useJobRunner();
  const [settings, setSettings] = useState<EnhanceSettings>(AUTO_SETTINGS);
  const [preview, setPreview] = useState<{ key: string; blob: Blob; width: number; height: number } | null>(null);
  const [result, setResult] = useState<{ key: string; image: ResultImage } | null>(null);
  const previewUrl = useObjectUrl(preview?.blob ?? null);

  const settingsKey = JSON.stringify(settings);
  const outputMime = source ? outputMimeFor(source.mime) : "image/jpeg";

  // Live preview on a reduced copy, refreshed shortly after the last change.
  useEffect(() => {
    if (!source) return;
    const key = `${source.id}|${settingsKey}`;
    const timer = setTimeout(async () => {
      try {
        const done = await previewRunner.run({
          kind: "enhance",
          sourceId: source.id,
          file: source.file,
          settings: JSON.parse(settingsKey) as EnhanceSettings,
          maxSide: PREVIEW_SIDE,
          mime: source.hasTransparency ? "image/png" : "image/jpeg",
          quality: 0.9,
          background: null,
        });
        if (done) setPreview({ key, blob: done.blob, width: done.width, height: done.height });
      } catch (caught) {
        setError(toImageToolError(caught));
      }
    }, 200);
    return () => clearTimeout(timer);
    // previewRunner.run is stable; re-run only when the image or settings change.
  }, [source, settingsKey]);

  const onFile = async (file: File) => {
    previewRunner.cancel();
    finalRunner.cancel();
    setPreview(null);
    setResult(null);
    await select(file);
  };

  const reset = () => {
    previewRunner.cancel();
    finalRunner.cancel();
    clear();
    setPreview(null);
    setResult(null);
    setSettings(AUTO_SETTINGS);
  };

  const keyFor = (image: SourceImage) => `${image.id}|${settingsKey}`;
  const current = source && result?.key === keyFor(source) ? result.image : null;
  const neutral = isNeutral(settings);

  const create = async (image: SourceImage) => {
    setError(null);
    track("processing_started", { tool: TOOL });
    try {
      const done = await finalRunner.run({
        kind: "enhance",
        sourceId: image.id,
        file: image.file,
        settings,
        mime: outputMime,
        quality: FORMATS[outputMime].lossy ? 0.92 : undefined,
        background: null,
      });
      if (!done) return;
      setResult({ key: keyFor(image), image: { blob: done.blob, width: done.width, height: done.height, mime: outputMime } });
      track("enhance_completed", { tool: TOOL, output_format: FORMATS[outputMime].label, size_bucket: sizeBucket(image.size) });
    } catch (caught) {
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    }
  };

  const set = (key: keyof EnhanceSettings, value: number | boolean) => setSettings((s) => ({ ...s, [key]: value }));

  // While a new preview is being made, the previous one stays on screen.
  const livePreview = source ? (
    previewUrl && preview ? (
      <CompareSlider
        before={source.url}
        after={previewUrl}
        beforeAlt="Original photo"
        afterAlt="Preview of the enhanced photo"
        width={preview.width}
        height={preview.height}
        checkerboard={source.hasTransparency}
      />
    ) : (
      <div className="flex h-60 items-center justify-center rounded-md border border-line bg-surface text-sm text-muted" role="status">
        Preparing preview…
      </div>
    )
  ) : null;

  const controls = source ? (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setSettings(AUTO_SETTINGS)} className={buttonClass("secondary", "min-h-10 px-3 text-sm")}>
          Auto enhance
        </button>
        <button type="button" onClick={() => setSettings(NEUTRAL_SETTINGS)} className={buttonClass("ghost", "min-h-10 px-3 text-sm")}>
          Reset adjustments
        </button>
      </div>
      <Checkbox checked={settings.autoLevels} onChange={(v) => set("autoLevels", v)} description="Stretches the tones so the darkest and lightest parts use the full range. Fixes flat, hazy or faded photos.">
        Auto levels
      </Checkbox>
      <div className="grid gap-4 sm:grid-cols-2">
        {SLIDERS.map((slider) => (
          <Slider key={slider.key} label={slider.label} value={settings[slider.key]} min={slider.min} hint={slider.hint} onChange={(v) => set(slider.key, v)} />
        ))}
      </div>
      {neutral ? (
        <Alert tone="info" title="No adjustments selected">
          Choose Auto enhance or move a slider to change the photo.
        </Alert>
      ) : null}
      <ActionButton onClick={() => create(source)} busy={finalRunner.busy} busyLabel="Enhancing full image…" disabled={neutral}>
        {current ? "Create again" : "Create full-size image"}
      </ActionButton>
      <p className="text-xs text-muted">
        The preview uses a reduced copy for speed; the download is processed at the full {formatDimensions(source.width, source.height)}.
      </p>
    </>
  ) : null;

  return (
    <ToolWorkspace
      accept={RASTER_INPUT_FORMATS}
      source={source}
      loading={loading}
      error={error}
      onFile={onFile}
      onReset={reset}
      prompt="Drop a photo to enhance"
      controls={controls}
      preview={livePreview ?? undefined}
      widePreview
      result={
        source && current ? (
          <ResultPanel
            tool={TOOL}
            heading="Your enhanced image"
            original={source}
            output={current}
            fileName={outputFileName(source.name, "enhanced", FORMATS[current.mime].extension)}
            downloadLabel={`Download ${FORMATS[current.mime].label}`}
            status={
              <Alert tone="success" title="Enhanced at full resolution">
                Compare with the original before downloading. If edges show bright halos, lower Sharpen or Clarity.
              </Alert>
            }
          />
        ) : null
      }
    />
  );
}
