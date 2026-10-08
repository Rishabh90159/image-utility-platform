"use client";

import Link from "next/link";
import { useState } from "react";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { Alert } from "@/components/controls/alert";
import { Checkbox, FieldLabel, inputClass, QualitySlider, Segmented } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import { toImageToolError } from "@/lib/image-processing/errors";
import { FORMATS, LIMITS, outputMimeFor, RASTER_INPUT_FORMATS, type ImageMime, type OutputMime } from "@/lib/image-processing/formats";
import { formatDimensions, outputFileName, sizeBucket } from "@/lib/utils/format";
import type { ToolId } from "@/lib/tools/registry";
import { useEncodeSupport, useJobRunner, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

/**
 * The image resizer, shared by the general resizer and the format pages.
 * Each variant accepts one format and adds the setting that matters for it:
 * JPG gets a print resolution (DPI), PNG gets optional colour reduction,
 * WebP gets an animation check and a choice of output format.
 */
export type ResizerVariant = "any" | "jpg" | "png" | "webp";

interface VariantConfig {
  tool: ToolId;
  accept: ImageMime[];
  prompt: string;
  /** Fixed output, or null to let the user choose. */
  fixedOutput: OutputMime | null;
  formatName: string;
}

const VARIANTS: Record<ResizerVariant, VariantConfig> = {
  any: { tool: "image-resizer", accept: RASTER_INPUT_FORMATS, prompt: "Drop your image here", fixedOutput: null, formatName: "image" },
  jpg: { tool: "resize-jpg", accept: ["image/jpeg"], prompt: "Drop your JPG here", fixedOutput: "image/jpeg", formatName: "JPG" },
  png: { tool: "resize-png", accept: ["image/png"], prompt: "Drop your PNG here", fixedOutput: "image/png", formatName: "PNG" },
  webp: { tool: "resize-webp", accept: ["image/webp"], prompt: "Drop your WebP image here", fixedOutput: null, formatName: "WebP" },
};

const WIDTH_PRESETS = [640, 800, 1024, 1280, 1920, 2560, 3840];
const PERCENT_PRESETS = [25, 50, 75];
/** Boxes the image is scaled to fit inside, keeping its proportions. */
const FIT_PRESETS = [
  { id: "fhd", label: "Full HD screen", width: 1920, height: 1080 },
  { id: "hd", label: "HD screen", width: 1280, height: 720 },
  { id: "qhd", label: "QHD screen", width: 2560, height: 1440 },
  { id: "4k", label: "4K UHD screen", width: 3840, height: 2160 },
  { id: "square", label: "Square post", width: 1080, height: 1080 },
  { id: "portrait", label: "Portrait post (4:5)", width: 1080, height: 1350 },
  { id: "story", label: "Vertical story (9:16)", width: 1080, height: 1920 },
  { id: "og", label: "Link preview", width: 1200, height: 630 },
  { id: "email", label: "Email attachment", width: 1600, height: 1200 },
];
const DPI_OPTIONS = ["none", "72", "150", "300"] as const;
type DpiChoice = (typeof DPI_OPTIONS)[number];
const PNG_COLOR_OPTIONS = ["256", "128", "64", "32"] as const;
type PngColors = (typeof PNG_COLOR_OPTIONS)[number];

type Mode = "pixels" | "percent";
type OutputChoice = "original" | OutputMime;

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

/** Animated WebP files have the animation flag set in their VP8X header. */
async function isAnimatedWebp(file: Blob): Promise<boolean> {
  try {
    const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    const fourcc = String.fromCharCode(...head.subarray(12, 16));
    return fourcc === "VP8X" && (head[20] & 0x02) !== 0;
  } catch {
    return false;
  }
}

const chipClass =
  "min-h-9 rounded-md border border-line-strong px-3 text-sm tabular-nums text-ink-soft hover:bg-surface aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent-ink";

export function ImageResizerTool({ variant = "any" }: { variant?: ResizerVariant }) {
  const config = VARIANTS[variant];
  const TOOL = config.tool;
  useToolOpen(TOOL);
  const { source, loading, error, select, clear, setError } = useSourceImage({
    tool: TOOL,
    accept: config.accept,
    wrongFormatMessage:
      variant === "any"
        ? undefined
        : (detected) => `This page resizes ${config.formatName} files, and this file is a ${FORMATS[detected].label}.`,
  });
  const runner = useJobRunner();
  const webpSupported = useEncodeSupport("image/webp");

  const [mode, setMode] = useState<Mode>("pixels");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [lock, setLock] = useState(true);
  const [fit, setFit] = useState("");
  const [percent, setPercent] = useState("50");
  const [output, setOutput] = useState<OutputChoice>("original");
  const [quality, setQuality] = useState(0.9);
  const [dpi, setDpi] = useState<DpiChoice>("none");
  const [reduceColors, setReduceColors] = useState(false);
  const [pngColors, setPngColors] = useState<PngColors>("256");
  const [dither, setDither] = useState(true);
  const [animated, setAnimated] = useState(false);
  const [result, setResult] = useState<{ key: string; image: ResultImage } | null>(null);

  const onFile = async (file: File) => {
    runner.cancel();
    const loaded = await select(file);
    if (loaded) {
      setResult(null);
      setFit("");
      setWidth(String(loaded.width));
      setHeight(String(loaded.height));
      setAnimated(loaded.mime === "image/webp" ? await isAnimatedWebp(file) : false);
    }
  };

  const reset = () => {
    runner.cancel();
    clear();
    setResult(null);
    setMode("pixels");
    setLock(true);
    setFit("");
    setPercent("50");
    setOutput("original");
    setQuality(0.9);
    setDpi("none");
    setReduceColors(false);
    setAnimated(false);
  };

  const wrongFormatAction =
    variant !== "any" && error?.code === "WRONG_FORMAT" ? (
      <p className="mt-1">
        <Link href="/tools/image-resizer" className="font-medium text-accent underline">
          Open the image resizer, which accepts JPG, PNG, WebP and HEIC
        </Link>
      </p>
    ) : undefined;

  if (!source) {
    return (
      <ToolWorkspace
        accept={config.accept}
        source={null}
        loading={loading}
        error={error}
        errorAction={wrongFormatAction}
        onFile={onFile}
        onReset={reset}
        prompt={config.prompt}
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

  // WebP pages fall back to PNG when this browser can't write WebP (some Safari versions).
  const webpDefault: OutputMime = webpSupported === false ? "image/png" : "image/webp";
  const outMime: OutputMime =
    config.fixedOutput ??
    (output === "original" ? (variant === "webp" ? webpDefault : outputMimeFor(source.mime)) : output);
  const lossy = FORMATS[outMime].lossy;
  const flattens = source.hasTransparency && !FORMATS[outMime].supportsTransparency;
  const dpiValue = outMime === "image/jpeg" && dpi !== "none" ? Number(dpi) : undefined;
  const colors = outMime === "image/png" && reduceColors ? Number(pngColors) : undefined;
  const settingsKey = JSON.stringify([source.id, target, outMime, lossy ? quality : null, dpiValue, colors, colors ? dither : null]);
  const currentResult = result?.key === settingsKey ? result.image : null;

  const onWidth = (value: string) => {
    setFit("");
    setWidth(value);
    const w = parsePixels(value);
    if (lock && w > 0) setHeight(String(Math.max(1, Math.round(w * ratio))));
  };
  const onHeight = (value: string) => {
    setFit("");
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
    setFit("");
    setLock(true);
    setWidth(String(w));
    setHeight(String(Math.max(1, Math.round(w * ratio))));
  };
  const applyFit = (id: string) => {
    setFit(id);
    const box = FIT_PRESETS.find((p) => p.id === id);
    if (!box) return;
    const scale = Math.min(box.width / source.width, box.height / source.height);
    setLock(true);
    setWidth(String(Math.max(1, Math.round(source.width * scale))));
    setHeight(String(Math.max(1, Math.round(source.height * scale))));
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
        dpi: dpiValue,
        pngColors: colors,
        pngDither: colors ? dither : undefined,
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
  const fitBox = FIT_PRESETS.find((p) => p.id === fit);

  const outputOptions: { value: OutputChoice; label: string; disabled?: boolean }[] =
    variant === "webp"
      ? [
          { value: "original", label: webpSupported === false ? "PNG (WebP not available)" : "WebP" },
          { value: "image/jpeg", label: "JPG" },
          { value: "image/png", label: "PNG" },
        ]
      : [
          { value: "original", label: `Same as original (${FORMATS[outputMimeFor(source.mime)].label})` },
          { value: "image/jpeg", label: "JPG" },
          { value: "image/png", label: "PNG" },
          { value: "image/webp", label: "WebP", disabled: webpSupported === false },
        ];

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
            Maintain aspect ratio
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
                  aria-pressed={!fit && parsePixels(width) === w && lock}
                  className={chipClass}
                >
                  {w} px
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="resize-fit">Popular dimensions</FieldLabel>
            <select
              id="resize-fit"
              value={fit}
              onChange={(event) => applyFit(event.target.value)}
              aria-describedby="resize-fit-hint"
              className={`${inputClass} mt-1.5 sm:max-w-sm`}
            >
              <option value="">Choose a size to fit inside…</option>
              {FIT_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} – {p.width} × {p.height}
                </option>
              ))}
            </select>
            <p id="resize-fit-hint" className="mt-1 text-xs leading-relaxed text-muted">
              {fitBox ? (
                <>
                  Scaled to fit inside {fitBox.width} × {fitBox.height} without stretching. For that exact shape,{" "}
                  <Link href="/tools/image-cropper" className="text-accent underline underline-offset-2">
                    crop the image
                  </Link>{" "}
                  to the same ratio first.
                </>
              ) : (
                "The image is scaled to fit inside the size you pick, keeping its proportions."
              )}
            </p>
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
              <button key={p} type="button" onClick={() => setPercent(String(p))} aria-pressed={Number(percent) === p} className={chipClass}>
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

      {config.fixedOutput ? null : (
        <Segmented<OutputChoice>
          legend="Output format"
          value={output}
          onChange={setOutput}
          options={outputOptions}
          hint={webpSupported === false ? "Your browser can't create WebP files." : undefined}
        />
      )}

      {lossy ? (
        <QualitySlider value={quality} onChange={setQuality} min={0.3} hint="90% is a good balance for most photos." />
      ) : null}

      {variant === "jpg" ? (
        <div>
          <Segmented<DpiChoice>
            legend="Print resolution (DPI)"
            value={dpi}
            onChange={setDpi}
            options={DPI_OPTIONS.map((value) => ({ value, label: value === "none" ? "Don't set" : value }))}
            hint="Only affects printing. The pixels and file size stay the same."
          />
          {dpiValue && target && !dimsError ? (
            <p className="mt-2 text-sm text-muted">
              Prints at{" "}
              <span className="font-medium text-ink">
                {(target.width / dpiValue).toFixed(2)} × {(target.height / dpiValue).toFixed(2)} in
              </span>{" "}
              ({((target.width / dpiValue) * 2.54).toFixed(1)} × {((target.height / dpiValue) * 2.54).toFixed(1)} cm)
            </p>
          ) : null}
        </div>
      ) : null}

      {variant === "png" ? (
        <div className="space-y-3">
          <Checkbox
            checked={reduceColors}
            onChange={setReduceColors}
            description="Saves a palette PNG, often 50–80% smaller. Transparency is kept. Best for logos, icons and screenshots."
          >
            Reduce colours for a smaller file
          </Checkbox>
          {reduceColors ? (
            <div className="space-y-3 pl-8">
              <Segmented<PngColors>
                legend="Colours"
                value={pngColors}
                onChange={setPngColors}
                options={PNG_COLOR_OPTIONS.map((value) => ({ value, label: value }))}
              />
              <Checkbox checked={dither} onChange={setDither} description="Blends colours to avoid visible bands in gradients and photos.">
                Smooth gradients (dithering)
              </Checkbox>
            </div>
          ) : null}
        </div>
      ) : null}

      {animated ? (
        <Alert tone="warning" title="This WebP is animated">
          Browsers only give image tools the first frame, so the result will be a still image of that frame.
        </Alert>
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
          These dimensions don&apos;t match the original proportions. Turn on &ldquo;Maintain aspect ratio&rdquo; to avoid distortion.
        </Alert>
      ) : null}

      <ActionButton onClick={() => run(source)} busy={runner.busy} busyLabel="Resizing…" disabled={Boolean(dimsError)}>
        {currentResult ? "Resize again" : `Resize ${config.formatName}`}
      </ActionButton>
    </>
  );

  return (
    <ToolWorkspace
      accept={config.accept}
      source={source}
      loading={loading}
      error={error}
      errorAction={wrongFormatAction}
      onFile={onFile}
      onReset={reset}
      prompt={config.prompt}
      controls={controls}
      result={
        currentResult ? (
          <ResultPanel
            tool={TOOL}
            heading={`Your resized ${config.formatName}`}
            original={source}
            output={currentResult}
            fileName={outputFileName(source.name, `${currentResult.width}x${currentResult.height}`, FORMATS[currentResult.mime].extension)}
            downloadLabel={`Download ${FORMATS[currentResult.mime].label}`}
            extraRows={dpiValue ? [{ label: "Print resolution", before: "—", after: `${dpiValue} DPI` }] : undefined}
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
