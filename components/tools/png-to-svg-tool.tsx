"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { Alert } from "@/components/controls/alert";
import { Checkbox, FieldLabel, Segmented } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import { toImageToolError } from "@/lib/image-processing/errors";
import { ALL_INPUT_FORMATS, FORMATS } from "@/lib/image-processing/formats";
import type { TraceDetail, TraceMode, TraceOptions } from "@/lib/vectorize/trace";
import { formatBytes, MB, outputFileName, sizeBucket } from "@/lib/utils/format";
import { useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const TOOL = "png-to-svg" as const;
const DEFAULTS: TraceOptions = { mode: "color", colors: 8, threshold: 128, detail: "medium", removeBackground: false };

interface TraceState {
  key: string;
  image: ResultImage;
  paths: number;
  colors: number;
}

export function PngToSvgTool() {
  useToolOpen(TOOL);
  const { source, loading, error, select, clear, setError } = useSourceImage({ tool: TOOL, accept: ALL_INPUT_FORMATS });
  const colorsId = useId();
  const thresholdId = useId();
  const [options, setOptions] = useState<TraceOptions>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TraceState | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const set = (patch: Partial<TraceOptions>) => setOptions((current) => ({ ...current, ...patch }));
  const keyFor = (image: SourceImage, o: TraceOptions) => JSON.stringify([image.id, o]);

  const trace = async (image: SourceImage, o: TraceOptions) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setError(null);
    setBusy(true);
    try {
      const { vectorize } = await import("@/lib/vectorize/client");
      const traced = await vectorize({ file: image.file, options: o }, current.signal);
      const blob = new Blob([traced.svg], { type: "image/svg+xml" });
      setResult({
        key: keyFor(image, o),
        image: { blob, width: traced.width, height: traced.height, mime: "image/svg+xml" },
        paths: traced.pathCount,
        colors: traced.colorCount,
      });
      track("png_svg_conversion_completed", {
        tool: TOOL,
        input_format: FORMATS[image.mime].label,
        output_format: "SVG",
        size_bucket: sizeBucket(image.size),
        mode: o.mode,
        preset: o.detail,
      });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    } finally {
      if (controller.current === current) setBusy(false);
    }
  };

  const onFile = async (file: File) => {
    controller.current?.abort();
    setBusy(false);
    const loaded = await select(file);
    if (!loaded) return;
    setResult(null);
    await trace(loaded, options);
  };

  const reset = () => {
    controller.current?.abort();
    setBusy(false);
    clear();
    setResult(null);
    setOptions(DEFAULTS);
  };

  const current = source && result?.key === keyFor(source, options) ? result : null;
  const heavy = current && (current.image.blob.size > 1.5 * MB || current.paths > 6000);

  const controls = source ? (
    <>
      <Segmented<TraceMode>
        legend="Tracing mode"
        value={options.mode}
        onChange={(mode) => set({ mode })}
        options={[
          { value: "color", label: "Colour" },
          { value: "bw", label: "Black & white" },
        ]}
        hint="Black & white suits line art, text, stamps and one-colour logos."
      />

      {options.mode === "color" ? (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <FieldLabel htmlFor={colorsId}>Number of colours</FieldLabel>
            <output htmlFor={colorsId} className="font-mono text-sm tabular-nums text-ink">
              {options.colors}
            </output>
          </div>
          <input
            id={colorsId}
            type="range"
            min={2}
            max={32}
            value={options.colors}
            onChange={(event) => set({ colors: Number(event.target.value) })}
            className="mt-2 h-2 w-full cursor-pointer accent-[var(--color-accent)]"
          />
          <p className="mt-1 text-xs text-muted">Use roughly the number of distinct colours in your logo. More colours mean more paths and a bigger file.</p>
        </div>
      ) : (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <FieldLabel htmlFor={thresholdId}>Threshold</FieldLabel>
            <output htmlFor={thresholdId} className="font-mono text-sm tabular-nums text-ink">
              {options.threshold}
            </output>
          </div>
          <input
            id={thresholdId}
            type="range"
            min={10}
            max={245}
            value={options.threshold}
            onChange={(event) => set({ threshold: Number(event.target.value) })}
            className="mt-2 h-2 w-full cursor-pointer accent-[var(--color-accent)]"
          />
          <div className="mt-1 flex justify-between text-xs text-muted" aria-hidden="true">
            <span>Less black</span>
            <span>More black</span>
          </div>
        </div>
      )}

      <Segmented<TraceDetail>
        legend="Detail"
        value={options.detail}
        onChange={(detail) => set({ detail })}
        options={[
          { value: "low", label: "Simple" },
          { value: "medium", label: "Balanced" },
          { value: "high", label: "Detailed" },
        ]}
        hint="Simple gives smoother shapes and smaller files; Detailed keeps small features but takes longer."
      />

      <Checkbox
        checked={options.removeBackground}
        onChange={(removeBackground) => set({ removeBackground })}
        description="Leaves out the colour that fills the image's edges, so the SVG has a transparent background."
      >
        Remove background colour
      </Checkbox>

      <ActionButton onClick={() => trace(source, options)} busy={busy} busyLabel="Tracing…">
        {current ? "Trace again" : "Convert to SVG"}
      </ActionButton>
      {busy ? <p className="text-xs text-muted">Large or detailed images can take several seconds.</p> : null}
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
      prompt="Drop a PNG logo, icon or graphic"
      controls={controls}
      result={
        source && current ? (
          <ResultPanel
            tool={TOOL}
            heading="Your SVG is ready"
            original={source}
            output={current.image}
            fileName={outputFileName(source.name, "vector", "svg")}
            downloadLabel="Download SVG"
            extraRows={[
              { label: "Type", before: "Raster (pixels)", after: "Vector (paths)" },
              { label: "Shapes", before: "—", after: `${current.paths.toLocaleString("en-US")} paths in ${current.colors} colour${current.colors === 1 ? "" : "s"}` },
            ]}
            status={
              heavy ? (
                <Alert tone="warning" title="This image doesn't trace cleanly">
                  The SVG needs {current.paths.toLocaleString("en-US")} paths ({formatBytes(current.image.blob.size)}). That
                  usually means a photo or a detailed, shaded image. Try fewer colours or the Simple detail level, or keep it
                  as a PNG.
                </Alert>
              ) : (
                <Alert tone="success" title="Traced into vector paths">
                  Zoom in on the result: edges stay sharp at any size. Fine detail may be simplified, so compare it with the
                  original before using it.
                </Alert>
              )
            }
          />
        ) : null
      }
    />
  );
}
