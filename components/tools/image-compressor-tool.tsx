"use client";

import Link from "next/link";
import { useState } from "react";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { Alert } from "@/components/controls/alert";
import { QualitySlider, Segmented } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import { toImageToolError } from "@/lib/image-processing/errors";
import { ALL_INPUT_FORMATS, FORMATS, type ImageMime } from "@/lib/image-processing/formats";
import { formatBytes, outputFileName, percentSaved, sizeBucket } from "@/lib/utils/format";
import { useEncodeSupport, useJobRunner, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const TOOL = "image-compressor" as const;

type Mode = "auto" | "manual";
type OutputChoice = "original" | "image/jpeg" | "image/webp";
type ColorChoice = "256" | "128" | "64" | "32" | "16" | "lossless";

/** Automatic mode settings: a quality level that is visually close to the original for most photos. */
const AUTO_QUALITY = 0.75;
const AUTO_PNG_COLORS = 256;

interface Settings {
  mode: Mode;
  output: OutputChoice;
  quality: number;
  colors: ColorChoice;
}

const DEFAULT_SETTINGS: Settings = { mode: "auto", output: "original", quality: 0.7, colors: "256" };

interface CompressionResult {
  key: string;
  image: ResultImage;
  paletteColors?: number;
  paletteLossless?: boolean;
}

function resolveJob(source: SourceImage, settings: Settings) {
  const mime: ImageMime = settings.output === "original" ? source.mime : settings.output;
  const isPng = mime === "image/png";
  const pngColors = isPng
    ? settings.mode === "auto"
      ? AUTO_PNG_COLORS
      : settings.colors === "lossless"
        ? undefined
        : Number(settings.colors)
    : undefined;
  const quality = isPng ? undefined : settings.mode === "auto" ? AUTO_QUALITY : settings.quality;
  const background = source.hasTransparency && !FORMATS[mime].supportsTransparency ? "#ffffff" : null;
  return { mime, pngColors, quality, background };
}

export function ImageCompressorTool() {
  useToolOpen(TOOL);
  const { source, loading, error, select, clear, setError } = useSourceImage({ tool: TOOL, accept: ALL_INPUT_FORMATS });
  const runner = useJobRunner();
  const webpSupported = useEncodeSupport("image/webp");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [result, setResult] = useState<CompressionResult | null>(null);

  const update = (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch }));
  const keyFor = (image: SourceImage, s: Settings) => JSON.stringify([image.id, resolveJob(image, s)]);

  const compress = async (image: SourceImage, s: Settings) => {
    const job = resolveJob(image, s);
    setError(null);
    try {
      const encoded = await runner.run({
        kind: "encode",
        sourceId: image.id,
        file: image.file,
        width: image.width,
        height: image.height,
        mime: job.mime,
        quality: job.quality,
        background: job.background,
        pngColors: job.pngColors,
        pngDither: true,
      });
      if (!encoded) return;
      setResult({
        key: keyFor(image, s),
        image: { blob: encoded.blob, width: encoded.width, height: encoded.height, mime: job.mime },
        paletteColors: encoded.paletteColors,
        paletteLossless: encoded.paletteLossless,
      });
      track("compression_completed", {
        tool: TOOL,
        input_format: FORMATS[image.mime].label,
        output_format: FORMATS[job.mime].label,
        size_bucket: sizeBucket(image.size),
        mode: s.mode,
        outcome: encoded.blob.size < image.size ? "smaller" : "not_smaller",
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
    if (!loaded) return;
    setResult(null);
    // Automatic mode compresses straight away; there is nothing to configure first.
    if (settings.mode === "auto") await compress(loaded, settings);
  };

  const reset = () => {
    runner.cancel();
    clear();
    setResult(null);
    setSettings(DEFAULT_SETTINGS);
  };

  const currentResult = source && result?.key === keyFor(source, settings) ? result : null;
  const job = source ? resolveJob(source, settings) : null;

  const controls =
    source && job ? (
      <>
        <Segmented<Mode>
          legend="Compression"
          value={settings.mode}
          onChange={(mode) => update({ mode })}
          options={[
            { value: "auto", label: "Automatic" },
            { value: "manual", label: "Manual" },
          ]}
          hint={
            settings.mode === "auto"
              ? job.mime === "image/png"
                ? "Reduces the PNG to up to 256 colours — usually much smaller with little visible change."
                : "Uses 75% quality, which keeps photos looking close to the original."
              : "Choose the trade-off between file size and quality yourself."
          }
        />

        <Segmented<OutputChoice>
          legend="Output format"
          value={settings.output}
          onChange={(output) => update({ output })}
          options={[
            { value: "original", label: `Keep ${FORMATS[source.mime].label}` },
            ...(source.mime !== "image/jpeg" ? [{ value: "image/jpeg" as const, label: "JPG" }] : []),
            ...(source.mime !== "image/webp"
              ? [{ value: "image/webp" as const, label: "WebP", disabled: webpSupported === false }]
              : []),
          ]}
          hint={
            webpSupported === false
              ? "Your browser can't create WebP files."
              : source.mime === "image/png"
                ? "WebP keeps transparency and is usually far smaller than PNG for photos."
                : undefined
          }
        />

        {settings.mode === "manual" && job.mime === "image/png" ? (
          <Segmented<ColorChoice>
            legend="Maximum colours"
            value={settings.colors}
            onChange={(colors) => update({ colors })}
            options={[
              { value: "256", label: "256" },
              { value: "128", label: "128" },
              { value: "64", label: "64" },
              { value: "32", label: "32" },
              { value: "16", label: "16" },
              { value: "lossless", label: "Lossless" },
            ]}
            hint="Fewer colours give smaller files. Lossless keeps every pixel but usually saves little."
          />
        ) : null}
        {settings.mode === "manual" && job.mime !== "image/png" ? (
          <QualitySlider
            value={settings.quality}
            onChange={(quality) => update({ quality })}
            min={0.1}
            max={1}
            hint="60–80% suits most photos. Below 50% compression artefacts become visible."
          />
        ) : null}

        {job.background ? (
          <Alert tone="info" title="Transparent areas will become white">
            JPG doesn&apos;t support transparency. Keep PNG or choose WebP to preserve it.
          </Alert>
        ) : null}

        <ActionButton onClick={() => compress(source, settings)} busy={runner.busy} busyLabel="Compressing…">
          {currentResult ? "Compress again" : "Compress image"}
        </ActionButton>
      </>
    ) : null;

  let status: React.ReactNode = null;
  if (source && currentResult) {
    const output = currentResult.image;
    const saved = percentSaved(source.size, output.blob.size);
    status = (
      <>
        {saved > 0.05 ? (
          <Alert tone="success" title={`${saved.toFixed(1)}% smaller`}>
            {formatBytes(source.size)} → {formatBytes(output.blob.size)}. Compare the previews, then download.
          </Alert>
        ) : (
          <Alert tone="warning" title="This image is already well compressed">
            The new file isn&apos;t smaller than your original ({formatBytes(source.size)}), so we recommend keeping the original.
            Try Manual mode with a lower setting, convert to WebP, or{" "}
            <Link href="/tools/image-resizer" className="font-medium underline">
              reduce its dimensions with the image resizer
            </Link>
            .
          </Alert>
        )}
        {currentResult.paletteColors ? (
          <Alert tone="info" title={currentResult.paletteLossless ? "No quality lost" : `Reduced to ${currentResult.paletteColors} colours`}>
            {currentResult.paletteLossless
              ? `This image uses only ${currentResult.paletteColors} colours, so all of them were kept exactly.`
              : "Colour reduction is lossy. Zoom in on gradients and fine detail to check the result looks right to you."}
          </Alert>
        ) : null}
      </>
    );
  }

  return (
    <ToolWorkspace
      accept={ALL_INPUT_FORMATS}
      source={source}
      loading={loading}
      error={error}
      onFile={onFile}
      onReset={reset}
      prompt="Drop an image to compress"
      controls={controls}
      result={
        source && currentResult ? (
          <ResultPanel
            tool={TOOL}
            heading="Your compressed image"
            original={source}
            output={currentResult.image}
            fileName={outputFileName(source.name, "compressed", FORMATS[currentResult.image.mime].extension)}
            downloadLabel={`Download ${FORMATS[currentResult.image.mime].label}`}
            status={status}
          />
        ) : null
      }
    />
  );
}
