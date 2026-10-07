"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CompareSlider } from "@/components/before-after/compare-slider";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { Alert } from "@/components/controls/alert";
import { QualitySlider, Segmented } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import { removeImageBackground } from "@/lib/background-removal/client";
import { isAbortError } from "@/lib/image-processing/client";
import { toImageToolError } from "@/lib/image-processing/errors";
import { FORMATS, RASTER_INPUT_FORMATS } from "@/lib/image-processing/formats";
import { outputFileName, sizeBucket } from "@/lib/utils/format";
import { useObjectUrl, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const TOOL = "background-remover" as const;

type Backdrop = "transparent" | "white" | "custom";
type Edges = "soft" | "crisp";
type Output = "image/png" | "image/jpeg";

let modelReady = false;

export function BackgroundRemoverTool() {
  useToolOpen(TOOL);
  const { source, loading, error, select, clear, setError } = useSourceImage({ tool: TOOL, accept: RASTER_INPUT_FORMATS });
  const colorId = useId();
  const [backdrop, setBackdrop] = useState<Backdrop>("transparent");
  const [customColor, setCustomColor] = useState("#3b82f6");
  const [edges, setEdges] = useState<Edges>("soft");
  const [output, setOutput] = useState<Output>("image/png");
  const [quality, setQuality] = useState(0.92);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<{ key: string; image: ResultImage; foreground: number } | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const background = backdrop === "transparent" ? null : backdrop === "white" ? "#ffffff" : customColor;
  const mime: Output = backdrop === "transparent" ? "image/png" : output;
  const keyFor = (image: SourceImage) => JSON.stringify([image.id, background, edges, mime, mime === "image/jpeg" ? quality : null]);
  const current = source && result?.key === keyFor(source) ? result : null;
  const resultUrl = useObjectUrl(current?.image.blob ?? null);

  const cancel = () => {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setProgress(null);
  };

  const run = async (image: SourceImage) => {
    controller.current?.abort();
    const mine = new AbortController();
    controller.current = mine;
    setError(null);
    setBusy(true);
    setProgress(0);
    track("processing_started", { tool: TOOL });
    try {
      const done = await removeImageBackground(
        { file: image.file, background, mime, quality: mime === "image/jpeg" ? quality : undefined, edges },
        { signal: mine.signal, onProgress: (value) => controller.current === mine && setProgress(value) },
      );
      modelReady = true;
      setResult({ key: keyFor(image), image: { blob: done.blob, width: done.width, height: done.height, mime }, foreground: done.foreground });
      track("background_removed", { tool: TOOL, output_format: FORMATS[mime].label, mode: backdrop, size_bucket: sizeBucket(image.size) });
    } catch (caught) {
      if (isAbortError(caught)) return;
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    } finally {
      if (controller.current === mine) {
        controller.current = null;
        setBusy(false);
        setProgress(null);
      }
    }
  };

  const onFile = async (file: File) => {
    cancel();
    const loaded = await select(file);
    if (!loaded) return;
    setResult(null);
    await run(loaded);
  };

  const reset = () => {
    cancel();
    clear();
    setResult(null);
    setBackdrop("transparent");
    setEdges("soft");
  };

  const controls = source ? (
    <>
      {!modelReady ? (
        <Alert tone="info" title="First use downloads the model">
          The background is removed by a small neural network that runs in your browser. The first time, your browser downloads
          it from this site (up to about 19 MB, then cached). Your photo itself is never uploaded.
        </Alert>
      ) : null}
      <Segmented<Backdrop>
        legend="New background"
        value={backdrop}
        onChange={setBackdrop}
        options={[
          { value: "transparent", label: "Transparent" },
          { value: "white", label: "White" },
          { value: "custom", label: "Colour" },
        ]}
      />
      {backdrop === "custom" ? (
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
      <Segmented<Edges>
        legend="Edges"
        value={edges}
        onChange={setEdges}
        hint="Soft keeps hair and fur natural. Crisp gives a cleaner outline for products and objects."
        options={[
          { value: "soft", label: "Soft" },
          { value: "crisp", label: "Crisp" },
        ]}
      />
      {backdrop !== "transparent" ? (
        <>
          <Segmented<Output>
            legend="Save as"
            value={output}
            onChange={setOutput}
            options={[
              { value: "image/png", label: "PNG" },
              { value: "image/jpeg", label: "JPG" },
            ]}
          />
          {output === "image/jpeg" ? <QualitySlider value={quality} onChange={setQuality} min={0.6} /> : null}
        </>
      ) : (
        <p className="text-sm text-muted">Transparent results are saved as PNG, the format that keeps transparency.</p>
      )}
      <ActionButton onClick={() => run(source)} busy={busy} busyLabel={modelReady ? "Removing background…" : "Loading model and removing background…"} progress={progress}>
        {result ? "Apply changes" : "Remove background"}
      </ActionButton>
      {busy ? (
        <button type="button" onClick={cancel} className="text-sm font-medium text-accent underline">
          Cancel
        </button>
      ) : null}
    </>
  ) : null;

  const subjectWarning =
    current && (current.foreground < 0.02 || current.foreground > 0.97) ? (
      <Alert tone="warning" title="No clear subject found">
        The model couldn&apos;t separate a main subject from the background in this image. It works best on photos with one clear
        subject, such as a person, pet or product, that stands out from what&apos;s behind it.
      </Alert>
    ) : null;

  return (
    <ToolWorkspace
      accept={RASTER_INPUT_FORMATS}
      source={source}
      loading={loading}
      error={error}
      onFile={onFile}
      onReset={reset}
      prompt="Drop a photo to remove its background"
      controls={controls}
      result={
        source && current ? (
          <ResultPanel
            tool={TOOL}
            heading="Background removed"
            original={source}
            output={current.image}
            growthExpected
            fileName={outputFileName(source.name, "no-background", FORMATS[current.image.mime].extension)}
            downloadLabel={`Download ${FORMATS[current.image.mime].label}`}
            status={
              subjectWarning ?? (
                <Alert tone="success" title="Check the edges before you download">
                  Drag the divider to compare. Fine hair, glass and objects that blend into the background can need a second try
                  with the other edge setting.
                </Alert>
              )
            }
            comparison={
              resultUrl ? (
                <CompareSlider
                  before={source.url}
                  after={resultUrl}
                  beforeAlt="Original photo"
                  afterAlt={background ? "Photo with the background replaced" : "Photo with the background removed"}
                  width={current.image.width}
                  height={current.image.height}
                  checkerboard
                />
              ) : null
            }
          />
        ) : null
      }
    />
  );
}
