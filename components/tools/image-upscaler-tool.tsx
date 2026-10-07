"use client";

import { useState } from "react";
import { CompareSlider } from "@/components/before-after/compare-slider";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { Alert } from "@/components/controls/alert";
import { FieldLabel, inputClass, QualitySlider, Segmented } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import { toImageToolError } from "@/lib/image-processing/errors";
import { FORMATS, LIMITS, RASTER_INPUT_FORMATS } from "@/lib/image-processing/formats";
import { formatDimensions, outputFileName, sizeBucket } from "@/lib/utils/format";
import { useJobRunner, useObjectUrl, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const TOOL = "image-upscaler" as const;

type Factor = "2" | "4" | "custom";
type Sharpen = "off" | "light" | "medium" | "strong";
type Output = "image/png" | "image/jpeg";

const SHARPEN: Record<Sharpen, number> = { off: 0, light: 0.35, medium: 0.7, strong: 1.1 };

/** Size for a factor or a custom width, keeping the aspect ratio. */
export function upscaleTarget(source: { width: number; height: number }, factor: Factor, customWidth: string) {
  if (factor !== "custom") {
    const f = Number(factor);
    return { width: source.width * f, height: source.height * f };
  }
  const width = /^\d+$/.test(customWidth.trim()) ? Number(customWidth.trim()) : NaN;
  return { width, height: Math.round((width * source.height) / source.width) };
}

export function upscaleError(source: { width: number; height: number }, target: { width: number; height: number }): string | null {
  if (!Number.isInteger(target.width) || target.width < 1) return "Enter the new width in whole pixels.";
  if (target.width <= source.width) return `Enter a width larger than the original ${source.width.toLocaleString("en-US")} pixels.`;
  if (target.width > LIMITS.maxOutputSide || target.height > LIMITS.maxOutputSide) {
    return `Each side can be at most ${LIMITS.maxOutputSide.toLocaleString("en-US")} pixels.`;
  }
  if (target.width * target.height > LIMITS.maxUpscalePixels) {
    return `That would be ${(Math.round((target.width * target.height) / 100_000) / 10).toLocaleString("en-US")} megapixels. The upscaler can make results up to ${LIMITS.maxUpscalePixels / 1_000_000} megapixels in a browser; choose a smaller size.`;
  }
  return null;
}

export function ImageUpscalerTool() {
  useToolOpen(TOOL);
  const { source, loading, error, select, clear, setError } = useSourceImage({ tool: TOOL, accept: RASTER_INPUT_FORMATS });
  const runner = useJobRunner();
  const [factor, setFactor] = useState<Factor>("2");
  const [customWidth, setCustomWidth] = useState("");
  const [sharpen, setSharpen] = useState<Sharpen>("light");
  const [output, setOutput] = useState<Output>("image/png");
  const [quality, setQuality] = useState(0.92);
  const [result, setResult] = useState<{ key: string; image: ResultImage } | null>(null);

  const onFile = async (file: File) => {
    runner.cancel();
    const loaded = await select(file);
    if (!loaded) return;
    setResult(null);
    setCustomWidth(String(loaded.width * 3));
    // Keep PNGs and transparent images lossless; photos default to a high-quality JPG.
    setOutput(loaded.mime === "image/png" || loaded.hasTransparency ? "image/png" : "image/jpeg");
  };

  const reset = () => {
    runner.cancel();
    clear();
    setResult(null);
    setFactor("2");
    setSharpen("light");
    setQuality(0.92);
  };

  const target = source ? upscaleTarget(source, factor, customWidth) : null;
  const targetError = source && target ? upscaleError(source, target) : null;
  const keyFor = (image: SourceImage) => JSON.stringify([image.id, target, sharpen, output, output === "image/jpeg" ? quality : null]);
  const current = source && result?.key === keyFor(source) ? result.image : null;
  const resultUrl = useObjectUrl(current?.blob ?? null);

  const run = async (image: SourceImage) => {
    if (!target || targetError) return;
    setError(null);
    track("processing_started", { tool: TOOL, mode: factor });
    try {
      const done = await runner.run({
        kind: "upscale",
        sourceId: image.id,
        file: image.file,
        width: target.width,
        height: target.height,
        sharpen: SHARPEN[sharpen],
        mime: output,
        quality: output === "image/jpeg" ? quality : undefined,
        background: null,
      });
      if (!done) return;
      setResult({ key: keyFor(image), image: { blob: done.blob, width: done.width, height: done.height, mime: output } });
      track("upscale_completed", { tool: TOOL, mode: factor, output_format: FORMATS[output].label, size_bucket: sizeBucket(image.size) });
    } catch (caught) {
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    }
  };

  const controls = source ? (
    <>
      <Segmented<Factor>
        legend="Enlarge by"
        value={factor}
        onChange={setFactor}
        options={[
          { value: "2", label: "2×" },
          { value: "4", label: "4×" },
          { value: "custom", label: "Custom width" },
        ]}
      />
      {factor === "custom" ? (
        <div>
          <FieldLabel htmlFor="upscale-width">New width (px)</FieldLabel>
          <input
            id="upscale-width"
            inputMode="numeric"
            autoComplete="off"
            value={customWidth}
            onChange={(event) => setCustomWidth(event.target.value)}
            aria-invalid={Boolean(targetError)}
            aria-describedby="upscale-size"
            className={`${inputClass} mt-1.5 max-w-[12rem]`}
          />
          <p className="mt-1 text-xs text-muted">The height follows automatically, so the image isn&apos;t stretched.</p>
        </div>
      ) : null}
      <p id="upscale-size" className={`text-sm ${targetError ? "font-medium text-danger" : "text-muted"}`} role={targetError ? "alert" : undefined}>
        {targetError ?? (
          <>
            Result: <span className="font-medium text-ink">{formatDimensions(target!.width, target!.height)}</span> (from{" "}
            {formatDimensions(source.width, source.height)})
          </>
        )}
      </p>

      <Segmented<Sharpen>
        legend="Sharpening"
        value={sharpen}
        onChange={setSharpen}
        hint="Enlarging softens edges a little. Light sharpening suits most photos; use more for text and graphics."
        options={[
          { value: "off", label: "Off" },
          { value: "light", label: "Light" },
          { value: "medium", label: "Medium" },
          { value: "strong", label: "Strong" },
        ]}
      />

      <Segmented<Output>
        legend="Save as"
        value={output}
        onChange={setOutput}
        options={[
          { value: "image/png", label: "PNG (lossless)" },
          { value: "image/jpeg", label: "JPG (smaller)" },
        ]}
      />
      {output === "image/jpeg" ? <QualitySlider value={quality} onChange={setQuality} min={0.6} /> : null}
      {output === "image/jpeg" && source.hasTransparency ? (
        <Alert tone="info" title="Transparent areas will become white">
          Choose PNG to keep the transparency.
        </Alert>
      ) : null}

      <ActionButton onClick={() => run(source)} busy={runner.busy} busyLabel="Upscaling…" progress={runner.progress} disabled={Boolean(targetError)}>
        {current ? "Upscale again" : "Upscale image"}
      </ActionButton>
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
      prompt="Drop an image to upscale"
      controls={controls}
      result={
        source && current ? (
          <ResultPanel
            tool={TOOL}
            heading="Your upscaled image"
            original={source}
            output={current}
            growthExpected
            fileName={outputFileName(source.name, `upscaled-${current.width}x${current.height}`, FORMATS[current.mime].extension)}
            downloadLabel={`Download ${FORMATS[current.mime].label}`}
            extraRows={[{ label: "Method", before: "—", after: `Lanczos-3${sharpen === "off" ? "" : ` + ${sharpen} sharpening`}` }]}
            status={
              <Alert tone="success" title={`Enlarged to ${formatDimensions(current.width, current.height)}`}>
                Zoom in on the comparison to judge edges and text. Upscaling makes the image bigger and smoother; it can&apos;t add
                detail that wasn&apos;t in the original.
              </Alert>
            }
            comparison={
              resultUrl ? (
                <CompareSlider
                  before={source.url}
                  after={resultUrl}
                  beforeAlt={`Original, ${formatDimensions(source.width, source.height)}`}
                  afterAlt={`Upscaled, ${formatDimensions(current.width, current.height)}`}
                  width={current.width}
                  height={current.height}
                  checkerboard={current.mime === "image/png"}
                />
              ) : null
            }
          />
        ) : null
      }
    />
  );
}
