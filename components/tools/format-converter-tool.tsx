"use client";

import Link from "next/link";
import { useCallback, useId, useState } from "react";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { Alert } from "@/components/controls/alert";
import { QualitySlider, Segmented } from "@/components/controls/fields";
import { track, type AnalyticsEvent } from "@/lib/analytics";
import { toImageToolError } from "@/lib/image-processing/errors";
import { FORMATS, type ImageMime, type OutputMime } from "@/lib/image-processing/formats";
import type { ToolId } from "@/lib/tools/registry";
import { formatBytes, KB, outputFileName, sizeBucket } from "@/lib/utils/format";
import { useJobRunner, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

/**
 * One converter component for every "X to Y" tool. Adding a Phase 2 converter
 * (e.g. WebP to JPG) only needs a new config and page.
 */
export interface ConverterConfig {
  tool: ToolId;
  from: ImageMime[];
  to: OutputMime;
  /** Shown when someone drops a file that is already in the target format. */
  reverse?: { href: string; label: string };
  /** Analytics event sent after a successful conversion. */
  completedEvent?: AnalyticsEvent;
  /** JPG/WebP only: offer a maximum file size (in KB), reached with the shared target-size search. */
  maxSizesKB?: number[];
}

type BackgroundChoice = "white" | "black" | "custom";
const BACKGROUNDS: Record<Exclude<BackgroundChoice, "custom">, string> = { white: "#ffffff", black: "#000000" };
const DEFAULT_QUALITY = 0.9;

export function FormatConverterTool({ config }: { config: ConverterConfig }) {
  const { tool, from, to, reverse, completedEvent = "conversion_completed", maxSizesKB } = config;
  const target = FORMATS[to];
  useToolOpen(tool);

  const wrongFormatMessage = useCallback(
    (detected: ImageMime) =>
      detected === to
        ? `This image is already a ${target.label}, so there's nothing to convert.`
        : `This converter needs a ${from.map((m) => FORMATS[m].label).join(" or ")} image, but this file is a ${FORMATS[detected].label}.`,
    [from, to, target.label],
  );

  const { source, loading, error, select, clear, setError } = useSourceImage({ tool, accept: from, wrongFormatMessage });
  const runner = useJobRunner();
  const colorId = useId();
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [background, setBackground] = useState<BackgroundChoice>("white");
  const [customColor, setCustomColor] = useState("#f2f2f2");
  const [limit, setLimit] = useState("none");
  const [result, setResult] = useState<{ key: string; image: ResultImage; overLimit: boolean } | null>(null);
  const limitBytes = maxSizesKB && limit !== "none" && (to === "image/jpeg" || to === "image/webp") ? Number(limit) * KB : null;

  const fillColor = background === "custom" ? customColor : BACKGROUNDS[background];
  const needsBackground = (image: SourceImage) => image.hasTransparency && !target.supportsTransparency;
  const keyFor = (image: SourceImage) =>
    JSON.stringify([image.id, target.lossy && !limitBytes ? quality : null, limitBytes, needsBackground(image) ? fillColor : null]);

  const convert = async (image: SourceImage) => {
    setError(null);
    try {
      if (limitBytes && (to === "image/jpeg" || to === "image/webp")) {
        const made = await runner.run({
          kind: "target",
          sourceId: image.id,
          file: image.file,
          sourceMime: image.mime,
          targetBytes: limitBytes,
          mime: to,
          allowResize: true,
          background: fillColor,
        });
        if (!made) return;
        setResult({ key: keyFor(image), image: { blob: made.blob, width: made.width, height: made.height, mime: to }, overLimit: made.outcome !== "met" });
        track(completedEvent, { tool, input_format: FORMATS[image.mime].label, output_format: target.label, size_bucket: sizeBucket(image.size), target_kb: Number(limit) });
        return;
      }
      const encoded = await runner.run({
        kind: "encode",
        sourceId: image.id,
        file: image.file,
        width: image.width,
        height: image.height,
        mime: to,
        quality: target.lossy ? quality : undefined,
        // JPG has no alpha channel: always flatten onto a solid colour so no pixel turns black unexpectedly.
        background: target.supportsTransparency ? null : fillColor,
      });
      if (!encoded) return;
      setResult({ key: keyFor(image), image: { blob: encoded.blob, width: encoded.width, height: encoded.height, mime: to }, overLimit: false });
      track(completedEvent, {
        tool,
        input_format: FORMATS[image.mime].label,
        output_format: target.label,
        size_bucket: sizeBucket(image.size),
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
    setResult(null);
    await convert(loaded);
  };

  const reset = () => {
    runner.cancel();
    clear();
    setResult(null);
    setQuality(DEFAULT_QUALITY);
    setBackground("white");
    setLimit("none");
  };

  const current = source && result?.key === keyFor(source) ? result : null;
  const currentResult = current?.image ?? null;
  const fromLabel = from.map((m) => FORMATS[m].label).join("/");

  const controls = source ? (
    <>
      {needsBackground(source) ? (
        <>
          <Alert tone="info" title="This image has transparent areas">
            {target.label} doesn&apos;t support transparency, so transparent pixels need a solid background colour.
          </Alert>
          <Segmented<BackgroundChoice>
            legend="Background colour"
            value={background}
            onChange={setBackground}
            options={[
              { value: "white", label: "White" },
              { value: "black", label: "Black" },
              { value: "custom", label: "Custom" },
            ]}
          />
          {background === "custom" ? (
            <div className="flex items-center gap-3">
              <input
                id={colorId}
                type="color"
                value={customColor}
                onChange={(event) => setCustomColor(event.target.value)}
                className="h-11 w-14 cursor-pointer rounded-md border border-line-strong bg-canvas p-1"
              />
              <label htmlFor={colorId} className="text-sm text-ink">
                Custom colour <span className="font-mono text-muted">{customColor.toUpperCase()}</span>
              </label>
            </div>
          ) : null}
        </>
      ) : !target.supportsTransparency && source.mime !== "image/jpeg" ? (
        <p className="text-sm text-muted">No transparent pixels found, so no background colour is needed.</p>
      ) : null}

      {source.mime === "image/gif" ? (
        <p className="text-sm text-muted">
          Only the first frame of an animated GIF is converted. To keep the animation, use the{" "}
          <Link href="/tools/resize-gif" className="font-medium text-accent underline">
            GIF resizer
          </Link>
          .
        </p>
      ) : null}

      {maxSizesKB ? (
        <Segmented<string>
          legend="Maximum file size"
          value={limit}
          onChange={setLimit}
          hint={limitBytes ? `The ${target.label} will be ${formatBytes(limitBytes)} or less; quality and, if needed, pixel size are chosen for you.` : "Leave at No limit for the best quality."}
          options={[{ value: "none", label: "No limit" }, ...maxSizesKB.map((kb) => ({ value: String(kb), label: `${kb} KB` }))]}
        />
      ) : null}

      {limitBytes ? null : target.lossy ? (
        <QualitySlider
          label={`${target.label} quality`}
          value={quality}
          onChange={setQuality}
          min={0.3}
          hint="90% keeps photos and text crisp. Lower values make smaller files."
        />
      ) : (
        <p className="text-sm leading-relaxed text-muted">
          {target.label} is lossless: the converted file keeps every pixel of your {fromLabel} exactly as it is now. It
          can&apos;t restore detail that {fromLabel} compression already removed.
        </p>
      )}

      <ActionButton onClick={() => convert(source)} busy={runner.busy} busyLabel="Converting…">
        {currentResult ? `Convert to ${target.label} again` : `Convert to ${target.label}`}
      </ActionButton>
    </>
  ) : null;

  return (
    <ToolWorkspace
      accept={from}
      source={source}
      loading={loading}
      error={error}
      errorAction={
        error?.code === "WRONG_FORMAT" && reverse ? (
          <p className="mt-1">
            <Link href={reverse.href} className="font-medium text-accent underline">
              {reverse.label}
            </Link>
          </p>
        ) : null
      }
      onFile={onFile}
      onReset={reset}
      prompt={`Drop a ${fromLabel} image to convert to ${target.label}`}
      controls={controls}
      result={
        source && currentResult ? (
          <ResultPanel
            tool={tool}
            heading={`Your ${target.label} is ready`}
            original={source}
            output={currentResult}
            fileName={outputFileName(source.name, "converted", target.extension)}
            downloadLabel={`Download ${target.label}`}
            status={
              current?.overLimit && limitBytes ? (
                <Alert tone="warning" title={`Couldn't get under ${formatBytes(limitBytes)}`}>
                  This is the smallest readable {target.label} the tool could make. Choose a larger limit, or crop the image first.
                </Alert>
              ) : currentResult.blob.size > source.size && !target.lossy ? (
                <Alert tone="info" title={`The ${target.label} is larger than the original`}>
                  That&apos;s expected: {target.label} stores every pixel without lossy compression. If you need a smaller file,
                  keep the original or{" "}
                  <Link href="/tools/image-compressor" className="font-medium underline">
                    compress the image
                  </Link>
                  .
                </Alert>
              ) : null
            }
          />
        ) : null
      }
    />
  );
}
