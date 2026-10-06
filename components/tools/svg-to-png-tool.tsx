"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { Alert } from "@/components/controls/alert";
import { Checkbox, FieldLabel, inputClass, Segmented } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import { ImageToolError, toImageToolError } from "@/lib/image-processing/errors";
import { LIMITS } from "@/lib/image-processing/formats";
import type { SvgFit } from "@/lib/svg/rasterize";
import { formatDimensions, outputFileName, sizeBucket } from "@/lib/utils/format";
import { newSourceId } from "@/lib/image-processing/client";
import { useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const TOOL = "svg-to-png" as const;
const ACCEPT = { attribute: ".svg,image/svg+xml", label: "SVG" };

type BackgroundChoice = "transparent" | "white" | "custom";

interface SvgSource extends SourceImage {
  markup: string;
  declaredSize: boolean;
  removedCount: number;
  removedKinds: string[];
}

function parseWhole(value: string): number | null {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

export function SvgToPngTool() {
  useToolOpen(TOOL);
  const colorId = useId();
  const [source, setSource] = useState<SvgSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ImageToolError | null>(null);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [lock, setLock] = useState(true);
  const [fit, setFit] = useState<SvgFit>("contain");
  const [background, setBackground] = useState<BackgroundChoice>("transparent");
  const [customColor, setCustomColor] = useState("#f2f2f2");
  const [result, setResult] = useState<{ key: string; image: ResultImage } | null>(null);
  const request = useRef(0);

  // Revoke the preview URL when the source changes or the page closes.
  useEffect(() => () => (source ? URL.revokeObjectURL(source.url) : undefined), [source]);

  const fill = background === "transparent" ? null : background === "white" ? "#ffffff" : customColor;
  const w = source ? parseWhole(width) : null;
  const h = source ? (lock && w ? Math.max(1, Math.round((w * source.height) / source.width)) : parseWhole(height)) : null;
  const sizeError = !source
    ? null
    : !w || !h || w < 1 || h < 1
      ? "Enter the width and height in whole pixels."
      : w > LIMITS.maxOutputSide || h > LIMITS.maxOutputSide
        ? `Each side can be at most ${LIMITS.maxOutputSide.toLocaleString("en-US")} pixels.`
        : w * h > LIMITS.maxOutputPixels
          ? `That's ${Math.round((w * h) / 1_000_000)} megapixels. The maximum is ${LIMITS.maxOutputPixels / 1_000_000} megapixels.`
          : null;
  const ratioDiffers = Boolean(source && w && h && Math.abs(h / w - source.height / source.width) / (source.height / source.width) > 0.01);
  const keyFor = (s: SvgSource, ow: number, oh: number) => JSON.stringify([s.id, ow, oh, ratioDiffers ? fit : "contain", fill]);

  const convert = async (s: SvgSource, ow: number, oh: number) => {
    setError(null);
    setBusy(true);
    try {
      const { rasterizeSvg } = await import("@/lib/svg/rasterize");
      const blob = await rasterizeSvg(s.markup, { width: s.width, height: s.height }, {
        width: ow,
        height: oh,
        background: fill,
        fit: ratioDiffers ? fit : "contain",
      });
      setResult({ key: keyFor(s, ow, oh), image: { blob, width: ow, height: oh, mime: "image/png" } });
      track("svg_conversion_completed", { tool: TOOL, input_format: "SVG", output_format: "PNG", size_bucket: sizeBucket(s.size) });
    } catch (caught) {
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File) => {
    const id = ++request.current;
    setError(null);
    setLoading(true);
    try {
      const { sanitizeSvgFile } = await import("@/lib/svg/sanitize");
      const clean = await sanitizeSvgFile(file);
      if (id !== request.current) return;
      const next: SvgSource = {
        id: newSourceId(),
        file,
        name: file.name || "image.svg",
        mime: "image/svg+xml",
        size: file.size,
        width: clean.size.width,
        height: clean.size.height,
        hasTransparency: false,
        // Previews load the sanitized copy through <img>, which never runs scripts.
        url: URL.createObjectURL(new Blob([clean.markup], { type: "image/svg+xml" })),
        markup: clean.markup,
        declaredSize: clean.size.declared,
        removedCount: clean.removedCount,
        removedKinds: clean.removedKinds,
      };
      setSource(next);
      setResult(null);
      setWidth(String(next.width));
      setHeight(String(next.height));
      setLock(true);
      track("image_uploaded", { tool: TOOL, input_format: "SVG", size_bucket: sizeBucket(file.size) });
      await convert(next, next.width, next.height);
    } catch (caught) {
      if (id !== request.current) return;
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    } finally {
      if (id === request.current) setLoading(false);
    }
  };

  const reset = () => {
    request.current++;
    setSource(null);
    setResult(null);
    setError(null);
    setBackground("transparent");
    setFit("contain");
  };

  const scaleTo = (factor: number) => {
    if (!source) return;
    setLock(true);
    setWidth(String(Math.round(source.width * factor)));
  };

  const currentResult = source && w && h && result?.key === keyFor(source, w, h) ? result.image : null;

  const controls = source ? (
    <>
      {source.removedCount > 0 ? (
        <Alert tone="info" title={`Removed ${source.removedCount} unsafe item${source.removedCount === 1 ? "" : "s"}`}>
          For your safety we removed {source.removedKinds.join(", ")} before displaying this SVG. Normal drawings are not affected.
        </Alert>
      ) : null}
      {!source.declaredSize ? (
        <Alert tone="info" title="This SVG doesn't specify a size">
          It has no width, height or viewBox, so the browser default of 300 × 150 pixels was used. Enter the size you need.
        </Alert>
      ) : null}

      <div>
        <p className="text-sm font-medium text-ink" id="svg-scale-label">
          Quick size
        </p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="svg-scale-label">
          {[1, 2, 3, 4].map((factor) => (
            <button
              key={factor}
              type="button"
              onClick={() => scaleTo(factor)}
              aria-pressed={lock && w === Math.round(source.width * factor)}
              className="min-h-9 rounded-md border border-line-strong px-3 text-sm text-ink-soft hover:bg-surface aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent-ink"
            >
              {factor}× ({Math.round(source.width * factor)} px)
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="svg-width">Width (px)</FieldLabel>
          <input
            id="svg-width"
            inputMode="numeric"
            value={width}
            onChange={(event) => setWidth(event.target.value)}
            aria-invalid={Boolean(sizeError)}
            className={`${inputClass} mt-1.5`}
          />
        </div>
        <div>
          <FieldLabel htmlFor="svg-height">Height (px)</FieldLabel>
          <input
            id="svg-height"
            inputMode="numeric"
            value={lock ? (h ? String(h) : "") : height}
            onChange={(event) => setHeight(event.target.value)}
            disabled={lock}
            aria-invalid={Boolean(sizeError)}
            className={`${inputClass} mt-1.5 disabled:bg-surface disabled:text-muted`}
          />
        </div>
      </div>
      <Checkbox
        checked={lock}
        onChange={(checked) => {
          setLock(checked);
          if (!checked && h) setHeight(String(h));
        }}
        description="Keeps the SVG's proportions."
      >
        Maintain aspect ratio
      </Checkbox>
      {sizeError ? <p className="text-sm font-medium text-danger">{sizeError}</p> : null}

      {ratioDiffers ? (
        <Segmented<SvgFit>
          legend="Different proportions"
          value={fit}
          onChange={setFit}
          options={[
            { value: "contain", label: "Fit inside (add space)" },
            { value: "stretch", label: "Stretch to fill" },
          ]}
        />
      ) : null}

      <Segmented<BackgroundChoice>
        legend="Background"
        value={background}
        onChange={setBackground}
        options={[
          { value: "transparent", label: "Transparent" },
          { value: "white", label: "White" },
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
            Background colour <span className="font-mono text-muted">{customColor.toUpperCase()}</span>
          </label>
        </div>
      ) : null}

      <ActionButton onClick={() => w && h && convert(source, w, h)} busy={busy} busyLabel="Converting…" disabled={Boolean(sizeError)}>
        {currentResult ? "Convert to PNG again" : "Convert to PNG"}
      </ActionButton>
    </>
  ) : null;

  return (
    <ToolWorkspace
      accept={["image/svg+xml"]}
      acceptOverride={ACCEPT}
      source={source}
      loading={loading}
      error={error}
      onFile={onFile}
      onReset={reset}
      prompt="Drop an SVG file to convert to PNG"
      controls={controls}
      result={
        source && currentResult ? (
          <ResultPanel
            tool={TOOL}
            heading="Your PNG is ready"
            original={source}
            output={currentResult}
            fileName={outputFileName(source.name, `${currentResult.width}x${currentResult.height}`, "png")}
            downloadLabel="Download PNG"
            status={
              <Alert tone="success" title={`Rendered at ${formatDimensions(currentResult.width, currentResult.height)}`}>
                The PNG is a fixed-size image: to get a sharper or larger PNG later, convert the SVG again at a bigger size
                rather than enlarging this file.
              </Alert>
            }
          />
        ) : null
      }
    />
  );
}
