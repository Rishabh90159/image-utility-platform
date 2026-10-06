"use client";

import { useState } from "react";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { Alert } from "@/components/controls/alert";
import { Checkbox, FieldLabel, inputClass, QualitySlider, Segmented } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import { toImageToolError } from "@/lib/image-processing/errors";
import { ALL_INPUT_FORMATS, FORMATS, LIMITS, type ImageMime } from "@/lib/image-processing/formats";
import { formatDimensions, outputFileName, sizeBucket } from "@/lib/utils/format";
import { useEncodeSupport, useJobRunner, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const TOOL = "image-resizer" as const;
const WIDTH_PRESETS = [3840, 1920, 1280, 1080, 800, 640];
const PERCENT_PRESETS = [25, 50, 75];

type Mode = "pixels" | "percent";
type OutputChoice = "original" | ImageMime;

interface Target {
  width: number;
  height: number;
}

function dimensionError(target: Target | null): string | null {
  if (!target) return "Enter a width and height in pixels.";
  const { width, height } = target;
  if (!Number.isInteger(width) || !Number.isInteger(height)) return "Enter a width and height in whole pixels.";
  if (width < 1 || height < 1) return "Width and height must be at least 1 pixel.";
  if (width > LIMITS.maxOutputSide || height > LIMITS.maxOutputSide) {
    return `Each side can be at most ${LIMITS.maxOutputSide.toLocaleString("en-US")} pixels.`;
  }
  if (width * height > LIMITS.maxOutputPixels) {
    return `That's ${Math.round((width * height) / 1_000_000)} megapixels. The maximum is ${LIMITS.maxOutputPixels / 1_000_000} megapixels.`;
  }
  return null;
}

function parsePixels(value: string): number {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN;
}

export function ImageResizerTool() {
  useToolOpen(TOOL);
  const { source, loading, error, select, clear, setError } = useSourceImage({ tool: TOOL, accept: ALL_INPUT_FORMATS });
  const runner = useJobRunner();
  const webpSupported = useEncodeSupport("image/webp");

  const [mode, setMode] = useState<Mode>("pixels");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [lock, setLock] = useState(true);
  const [percent, setPercent] = useState("50");
  const [output, setOutput] = useState<OutputChoice>("original");
  const [quality, setQuality] = useState(0.9);
  const [result, setResult] = useState<{ key: string; image: ResultImage } | null>(null);

  const onFile = async (file: File) => {
    runner.cancel();
    const loaded = await select(file);
    if (loaded) {
      setResult(null);
      setWidth(String(loaded.width));
      setHeight(String(loaded.height));
    }
  };

  const reset = () => {
    runner.cancel();
    clear();
    setResult(null);
    setMode("pixels");
    setLock(true);
    setPercent("50");
    setOutput("original");
    setQuality(0.9);
  };

  if (!source) {
    return (
      <ToolWorkspace
        accept={ALL_INPUT_FORMATS}
        source={null}
        loading={loading}
        error={error}
        onFile={onFile}
        onReset={reset}
        prompt="Drop an image to resize"
        controls={null}
      />
    );
  }

  const ratio = source.height / source.width;
  const target: Target | null = (() => {
    if (mode === "percent") {
      const p = Number(percent);
      if (!Number.isFinite(p) || p <= 0) return null;
      return {
        width: Math.max(1, Math.round((source.width * p) / 100)),
        height: Math.max(1, Math.round((source.height * p) / 100)),
      };
    }
    const w = parsePixels(width);
    const h = parsePixels(height);
    return Number.isNaN(w) || Number.isNaN(h) ? null : { width: w, height: h };
  })();
  const dimsError = mode === "percent" && Number(percent) > 400 ? "Use a percentage between 1 and 400." : dimensionError(target);

  const outMime: ImageMime = output === "original" ? source.mime : output;
  const lossy = FORMATS[outMime].lossy;
  const flattens = source.hasTransparency && !FORMATS[outMime].supportsTransparency;
  const settingsKey = JSON.stringify([source.id, target, outMime, lossy ? quality : null]);
  const currentResult = result?.key === settingsKey ? result.image : null;

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
  const applyWidthPreset = (w: number) => {
    setLock(true);
    setWidth(String(w));
    setHeight(String(Math.max(1, Math.round(w * ratio))));
  };

  const run = async (image: SourceImage) => {
    if (!target || dimsError) return;
    setError(null);
    try {
      const encoded = await runner.run({
        kind: "encode",
        sourceId: image.id,
        file: image.file,
        width: target.width,
        height: target.height,
        mime: outMime,
        quality: lossy ? quality : undefined,
        background: flattens ? "#ffffff" : null,
      });
      if (!encoded) return;
      setResult({ key: settingsKey, image: { blob: encoded.blob, width: encoded.width, height: encoded.height, mime: outMime } });
      track("resize_completed", {
        tool: TOOL,
        input_format: FORMATS[image.mime].label,
        output_format: FORMATS[outMime].label,
        size_bucket: sizeBucket(image.size),
        mode,
      });
    } catch (caught) {
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    }
  };

  const enlarging = target && (target.width > source.width || target.height > source.height);
  const stretched =
    mode === "pixels" && !lock && target && Math.abs(target.height / target.width - ratio) / ratio > 0.01;

  const controls = (
    <>
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
              <FieldLabel htmlFor="resize-width">Width (px)</FieldLabel>
              <input
                id="resize-width"
                inputMode="numeric"
                autoComplete="off"
                value={width}
                onChange={(event) => onWidth(event.target.value)}
                aria-invalid={Boolean(dimsError)}
                aria-describedby={dimsError ? "resize-dims-error" : undefined}
                className={`${inputClass} mt-1.5`}
              />
            </div>
            <div>
              <FieldLabel htmlFor="resize-height">Height (px)</FieldLabel>
              <input
                id="resize-height"
                inputMode="numeric"
                autoComplete="off"
                value={height}
                onChange={(event) => onHeight(event.target.value)}
                aria-invalid={Boolean(dimsError)}
                aria-describedby={dimsError ? "resize-dims-error" : undefined}
                className={`${inputClass} mt-1.5`}
              />
            </div>
          </div>
          <Checkbox checked={lock} onChange={onLock} description="Keeps the original proportions so the image isn't stretched.">
            Lock aspect ratio
          </Checkbox>
          <div>
            <p className="text-sm font-medium text-ink" id="width-presets-label">
              Common widths
            </p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="width-presets-label">
              {WIDTH_PRESETS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => applyWidthPreset(w)}
                  aria-pressed={parsePixels(width) === w && lock}
                  className="min-h-9 rounded-md border border-line-strong px-3 text-sm text-ink-soft hover:bg-surface aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent-ink"
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
            <FieldLabel htmlFor="resize-percent">Scale (%)</FieldLabel>
            <input
              id="resize-percent"
              inputMode="decimal"
              autoComplete="off"
              value={percent}
              onChange={(event) => setPercent(event.target.value)}
              aria-invalid={Boolean(dimsError)}
              aria-describedby={dimsError ? "resize-dims-error" : undefined}
              className={`${inputClass} mt-1.5`}
            />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Percentage presets">
            {PERCENT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPercent(String(p))}
                aria-pressed={Number(percent) === p}
                className="min-h-9 rounded-md border border-line-strong px-3 text-sm text-ink-soft hover:bg-surface aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent-ink"
              >
                {p}%
              </button>
            ))}
          </div>
        </div>
      )}

      {dimsError ? (
        <p id="resize-dims-error" className="text-sm font-medium text-danger">
          {dimsError}
        </p>
      ) : target ? (
        <p className="text-sm text-muted">
          New size: <span className="font-medium text-ink">{formatDimensions(target.width, target.height)}</span>
          <span className="text-muted"> (was {formatDimensions(source.width, source.height)})</span>
        </p>
      ) : null}

      <Segmented<OutputChoice>
        legend="Output format"
        value={output}
        onChange={setOutput}
        options={[
          { value: "original", label: `Same as original (${FORMATS[source.mime].label})` },
          { value: "image/jpeg", label: "JPG" },
          { value: "image/png", label: "PNG" },
          { value: "image/webp", label: "WebP", disabled: webpSupported === false },
        ]}
        hint={webpSupported === false ? "Your browser can't create WebP files." : undefined}
      />

      {lossy ? (
        <QualitySlider value={quality} onChange={setQuality} min={0.3} hint="90% is a good balance for most photos." />
      ) : null}

      {flattens ? (
        <Alert tone="info" title="Transparent areas will become white">
          JPG doesn&apos;t support transparency. Choose PNG or WebP to keep it.
        </Alert>
      ) : null}
      {enlarging && !dimsError ? (
        <Alert tone="info" title="Enlarging an image">
          Making an image bigger than its original can&apos;t add detail, so it may look softer.
        </Alert>
      ) : null}
      {stretched && !dimsError ? (
        <Alert tone="warning" title="The image will be stretched">
          These dimensions don&apos;t match the original proportions. Turn on &ldquo;Lock aspect ratio&rdquo; to avoid distortion.
        </Alert>
      ) : null}

      <ActionButton onClick={() => run(source)} busy={runner.busy} busyLabel="Resizing…" disabled={Boolean(dimsError)}>
        {currentResult ? "Resize again" : "Resize image"}
      </ActionButton>
    </>
  );

  return (
    <ToolWorkspace
      accept={ALL_INPUT_FORMATS}
      source={source}
      loading={loading}
      error={error}
      onFile={onFile}
      onReset={reset}
      prompt="Drop an image to resize"
      controls={controls}
      result={
        currentResult ? (
          <ResultPanel
            tool={TOOL}
            heading="Your resized image"
            original={source}
            output={currentResult}
            fileName={outputFileName(source.name, `${currentResult.width}x${currentResult.height}`, FORMATS[currentResult.mime].extension)}
            downloadLabel={`Download ${FORMATS[currentResult.mime].label}`}
            status={
              <Alert tone="success" title={`Resized to ${formatDimensions(currentResult.width, currentResult.height)}`}>
                Check the preview, then download. Metadata such as camera details and location is not copied to the new file.
              </Alert>
            }
          />
        ) : null
      }
    />
  );
}
