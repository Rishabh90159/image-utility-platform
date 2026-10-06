"use client";

import { useState } from "react";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { ImageCropper } from "@/components/cropper/image-cropper";
import { OrientationControls } from "@/components/cropper/orientation-controls";
import { useCropState } from "@/components/cropper/use-crop";
import { Alert } from "@/components/controls/alert";
import { Checkbox, FieldLabel, inputClass, QualitySlider, Segmented } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import { toImageToolError } from "@/lib/image-processing/errors";
import { FORMATS, LIMITS, outputMimeFor, RASTER_INPUT_FORMATS, type OutputMime } from "@/lib/image-processing/formats";
import { formatDimensions, outputFileName, sizeBucket } from "@/lib/utils/format";
import { useEncodeSupport, useJobRunner, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const TOOL = "image-cropper" as const;

type RatioChoice = "free" | "1:1" | "4:3" | "3:2" | "16:9" | "custom";
type Orientation = "landscape" | "portrait";
type OutputChoice = "original" | OutputMime;

const RATIOS: Record<Exclude<RatioChoice, "free" | "custom">, [number, number]> = {
  "1:1": [1, 1],
  "4:3": [4, 3],
  "3:2": [3, 2],
  "16:9": [16, 9],
};

function parsePositive(value: string): number | null {
  const n = Number(value.trim());
  return Number.isFinite(n) && n > 0 && n <= 10_000 ? n : null;
}

export function ImageCropperTool() {
  useToolOpen(TOOL);
  const { source, loading, error, select, clear, setError } = useSourceImage({ tool: TOOL, accept: RASTER_INPUT_FORMATS });
  const runner = useJobRunner();
  const webpSupported = useEncodeSupport("image/webp");

  const [ratio, setRatio] = useState<RatioChoice>("free");
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [customW, setCustomW] = useState("5");
  const [customH, setCustomH] = useState("4");
  const [output, setOutput] = useState<OutputChoice>("original");
  const [quality, setQuality] = useState(0.9);
  const [resizeOutput, setResizeOutput] = useState(false);
  const [outWidth, setOutWidth] = useState("1080");
  const [result, setResult] = useState<{ key: string; image: ResultImage } | null>(null);

  const aspect = (() => {
    if (ratio === "free") return null;
    if (ratio === "custom") {
      const w = parsePositive(customW);
      const h = parsePositive(customH);
      return w && h ? w / h : null;
    }
    const [w, h] = RATIOS[ratio];
    return orientation === "portrait" && w !== h ? h / w : w / h;
  })();

  const cropState = useCropState(source, aspect);
  const { pixels } = cropState;

  const onFile = async (file: File) => {
    runner.cancel();
    const loaded = await select(file);
    if (loaded) setResult(null);
  };

  const reset = () => {
    runner.cancel();
    clear();
    setResult(null);
    setRatio("free");
    setOutput("original");
    setQuality(0.9);
    setResizeOutput(false);
  };

  if (!source) {
    return (
      <ToolWorkspace
        accept={RASTER_INPUT_FORMATS}
        source={null}
        loading={loading}
        error={error}
        onFile={onFile}
        onReset={reset}
        prompt="Drop an image to crop"
        controls={null}
      />
    );
  }

  const outMime: OutputMime = output === "original" ? outputMimeFor(source.mime) : output;
  const lossy = FORMATS[outMime].lossy;
  const flattens = source.hasTransparency && !FORMATS[outMime].supportsTransparency;

  const requestedWidth = resizeOutput ? Number(outWidth) : pixels.width;
  const target = {
    width: requestedWidth,
    height: Math.max(1, Math.round((requestedWidth * pixels.height) / pixels.width)),
  };
  const sizeError =
    !Number.isInteger(target.width) || target.width < 1
      ? "Enter the output width in whole pixels."
      : target.width > LIMITS.maxOutputSide || target.height > LIMITS.maxOutputSide
        ? `Each side can be at most ${LIMITS.maxOutputSide.toLocaleString("en-US")} pixels.`
        : null;
  const customError = ratio === "custom" && !aspect ? "Enter a ratio such as 5 : 4 using positive numbers." : null;

  const settingsKey = JSON.stringify([source.id, cropState.transform, target, outMime, lossy ? quality : null]);
  const currentResult = result?.key === settingsKey ? result.image : null;

  const run = async (image: SourceImage) => {
    if (sizeError || customError) return;
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
        transform: cropState.transform,
      });
      if (!encoded) return;
      setResult({ key: settingsKey, image: { blob: encoded.blob, width: encoded.width, height: encoded.height, mime: outMime } });
      track("crop_completed", {
        tool: TOOL,
        input_format: FORMATS[image.mime].label,
        output_format: FORMATS[outMime].label,
        size_bucket: sizeBucket(image.size),
        preset: ratio,
      });
    } catch (caught) {
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    }
  };

  const ratioOptions: { value: RatioChoice; label: string }[] = [
    { value: "free", label: "Free" },
    { value: "1:1", label: "1:1" },
    { value: "4:3", label: orientation === "portrait" ? "3:4" : "4:3" },
    { value: "3:2", label: orientation === "portrait" ? "2:3" : "3:2" },
    { value: "16:9", label: orientation === "portrait" ? "9:16" : "16:9" },
    { value: "custom", label: "Custom" },
  ];

  const preview = (
    <ImageCropper
      src={source.url}
      imageWidth={cropState.dims.width}
      imageHeight={cropState.dims.height}
      rotation={cropState.rotation}
      flipH={cropState.flipH}
      aspect={aspect}
      crop={cropState.crop}
      onChange={cropState.setCrop}
      label="Crop area"
    />
  );

  const controls = (
    <>
      <Segmented<RatioChoice> legend="Aspect ratio" value={ratio} onChange={setRatio} options={ratioOptions} />
      {ratio !== "free" && ratio !== "1:1" && ratio !== "custom" ? (
        <Segmented<Orientation>
          legend="Orientation"
          value={orientation}
          onChange={setOrientation}
          options={[
            { value: "landscape", label: "Landscape" },
            { value: "portrait", label: "Portrait" },
          ]}
        />
      ) : null}
      {ratio === "custom" ? (
        <div>
          <div className="flex items-end gap-2">
            <div className="w-24">
              <FieldLabel htmlFor="crop-ratio-w">Width</FieldLabel>
              <input
                id="crop-ratio-w"
                inputMode="decimal"
                value={customW}
                onChange={(event) => setCustomW(event.target.value)}
                aria-invalid={Boolean(customError)}
                className={`${inputClass} mt-1.5`}
              />
            </div>
            <span className="pb-3 text-muted" aria-hidden="true">
              :
            </span>
            <div className="w-24">
              <FieldLabel htmlFor="crop-ratio-h">Height</FieldLabel>
              <input
                id="crop-ratio-h"
                inputMode="decimal"
                value={customH}
                onChange={(event) => setCustomH(event.target.value)}
                aria-invalid={Boolean(customError)}
                className={`${inputClass} mt-1.5`}
              />
            </div>
          </div>
          {customError ? <p className="mt-2 text-sm font-medium text-danger">{customError}</p> : null}
        </div>
      ) : null}

      <OrientationControls onRotate={cropState.rotate} onFlip={cropState.flip} flipped={cropState.flipH} />

      <Segmented<OutputChoice>
        legend="Output format"
        value={output}
        onChange={setOutput}
        options={[
          { value: "original", label: `Same as original (${FORMATS[outputMimeFor(source.mime)].label})` },
          { value: "image/jpeg", label: "JPG" },
          { value: "image/png", label: "PNG" },
          { value: "image/webp", label: "WebP", disabled: webpSupported === false },
        ]}
        hint={webpSupported === false ? "Your browser can't create WebP files." : undefined}
      />
      {lossy ? <QualitySlider value={quality} onChange={setQuality} min={0.3} hint="90% keeps photos crisp." /> : null}

      <div className="space-y-3">
        <Checkbox
          checked={resizeOutput}
          onChange={setResizeOutput}
          description="Off: the cropped area keeps its full resolution. On: scale it to a set width."
        >
          Resize the cropped image
        </Checkbox>
        {resizeOutput ? (
          <div className="max-w-[12rem]">
            <FieldLabel htmlFor="crop-out-width">Output width (px)</FieldLabel>
            <input
              id="crop-out-width"
              inputMode="numeric"
              value={outWidth}
              onChange={(event) => setOutWidth(event.target.value)}
              aria-invalid={Boolean(sizeError)}
              className={`${inputClass} mt-1.5`}
            />
          </div>
        ) : null}
        {sizeError ? (
          <p className="text-sm font-medium text-danger">{sizeError}</p>
        ) : (
          <p className="text-sm text-muted">
            Output: <span className="font-medium text-ink">{formatDimensions(target.width, target.height)}</span>
          </p>
        )}
      </div>

      {flattens ? (
        <Alert tone="info" title="Transparent areas will become white">
          JPG doesn&apos;t support transparency. Choose PNG or WebP to keep it.
        </Alert>
      ) : null}

      <ActionButton onClick={() => run(source)} busy={runner.busy} busyLabel="Cropping…" disabled={Boolean(sizeError || customError)}>
        {currentResult ? "Crop again" : "Crop image"}
      </ActionButton>
    </>
  );

  return (
    <ToolWorkspace
      accept={RASTER_INPUT_FORMATS}
      source={source}
      loading={loading}
      error={error}
      onFile={onFile}
      onReset={reset}
      prompt="Drop an image to crop"
      preview={preview}
      widePreview
      controls={controls}
      result={
        currentResult ? (
          <ResultPanel
            tool={TOOL}
            heading="Your cropped image"
            original={source}
            output={currentResult}
            fileName={outputFileName(source.name, "cropped", FORMATS[currentResult.mime].extension)}
            downloadLabel={`Download ${FORMATS[currentResult.mime].label}`}
            status={
              <Alert tone="success" title={`Cropped to ${formatDimensions(currentResult.width, currentResult.height)}`}>
                Check the result, then download. Camera details and location metadata are not copied to the new file.
              </Alert>
            }
          />
        ) : null
      }
    />
  );
}
