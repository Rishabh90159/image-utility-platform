"use client";

import { useId, useState } from "react";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { ImageCropper } from "@/components/cropper/image-cropper";
import { OrientationControls } from "@/components/cropper/orientation-controls";
import { useCropState } from "@/components/cropper/use-crop";
import { Alert } from "@/components/controls/alert";
import { Checkbox, FieldLabel, inputClass, Segmented } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import { toImageToolError } from "@/lib/image-processing/errors";
import { FORMATS, LIMITS, RASTER_INPUT_FORMATS, type OutputMime } from "@/lib/image-processing/formats";
import type { BackgroundCleanup } from "@/lib/image-processing/types";
import { formatBytes, formatDimensions, KB, outputFileName, sizeBucket } from "@/lib/utils/format";
import { useJobRunner, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const TOOL = "signature-resizer" as const;
const QUALITY = 0.92;

type BackgroundChoice = "keep" | "white" | "transparent";
type FormatChoice = "image/jpeg" | "image/png";

function parseWhole(value: string): number | null {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

interface SignatureResult {
  key: string;
  image: ResultImage;
  maxKB: number | null;
  overMax: boolean;
}

export function SignatureResizerTool() {
  useToolOpen(TOOL);
  const { source, loading, error, select, clear, setError } = useSourceImage({ tool: TOOL, accept: RASTER_INPUT_FORMATS });
  const runner = useJobRunner();
  const thresholdId = useId();

  const [background, setBackground] = useState<BackgroundChoice>("white");
  const [threshold, setThreshold] = useState(190);
  const [format, setFormat] = useState<FormatChoice>("image/jpeg");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [lock, setLock] = useState(true);
  const [maxKB, setMaxKB] = useState("");
  const [result, setResult] = useState<SignatureResult | null>(null);

  const cropState = useCropState(source, null);
  const { pixels } = cropState;

  const onFile = async (file: File) => {
    runner.cancel();
    const loaded = await select(file);
    if (loaded) {
      setResult(null);
      setWidth("");
      setHeight("");
    }
  };

  const reset = () => {
    runner.cancel();
    clear();
    setResult(null);
    setBackground("white");
    setThreshold(190);
    setFormat("image/jpeg");
    setWidth("");
    setHeight("");
    setLock(true);
    setMaxKB("");
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
        prompt="Drop a photo or scan of your signature"
        controls={null}
      />
    );
  }

  // Transparent backgrounds need PNG; JPG can't store transparency.
  const mime: OutputMime = background === "transparent" ? "image/png" : format;
  const ratio = pixels.height / pixels.width;
  const w = width.trim() ? parseWhole(width) : pixels.width;
  const h = lock ? (w ? Math.max(1, Math.round(w * ratio)) : null) : height.trim() ? parseWhole(height) : pixels.height;
  const sizeError =
    !w || !h || w < 1 || h < 1
      ? "Enter the width and height in whole pixels."
      : w > LIMITS.maxOutputSide || h > LIMITS.maxOutputSide
        ? `Each side can be at most ${LIMITS.maxOutputSide.toLocaleString("en-US")} pixels.`
        : null;
  const maxKBValue = maxKB.trim() ? Number(maxKB.trim()) : null;
  const kbError =
    maxKBValue !== null && (!Number.isFinite(maxKBValue) || maxKBValue < 2)
      ? "Enter a maximum file size of at least 2 KB, or leave it empty."
      : null;
  const useTarget = mime === "image/jpeg" && maxKBValue !== null && !kbError;

  const cleanup: BackgroundCleanup | undefined = background === "keep" ? undefined : { threshold, to: background };
  const settingsKey = JSON.stringify([source.id, cropState.transform, w, h, mime, cleanup, useTarget ? maxKBValue : null]);
  const current = result?.key === settingsKey ? result : null;

  const run = async (image: SourceImage) => {
    if (sizeError || kbError || !w || !h) return;
    setError(null);
    const base = { sourceId: image.id, file: image.file, transform: cropState.transform, cleanup };
    try {
      let blob: Blob;
      let overMax = false;
      if (useTarget && maxKBValue) {
        const found = await runner.run({
          ...base,
          kind: "target",
          sourceMime: image.mime,
          targetBytes: Math.floor(maxKBValue * KB),
          mime: "image/jpeg",
          allowResize: false,
          background: "#ffffff",
          width: w,
          height: h,
        });
        if (!found) return;
        blob = found.blob;
        overMax = found.outcome !== "met";
      } else {
        const encoded = await runner.run({
          ...base,
          kind: "encode",
          width: w,
          height: h,
          mime,
          quality: mime === "image/jpeg" ? QUALITY : undefined,
          background: mime === "image/jpeg" ? "#ffffff" : null,
        });
        if (!encoded) return;
        blob = encoded.blob;
      }
      setResult({ key: settingsKey, image: { blob, width: w, height: h, mime }, maxKB: useTarget ? maxKBValue : null, overMax });
      track("signature_resize_completed", {
        tool: TOOL,
        input_format: FORMATS[image.mime].label,
        output_format: FORMATS[mime].label,
        size_bucket: sizeBucket(image.size),
        mode: background,
        outcome: overMax ? "over-max" : "met",
      });
    } catch (caught) {
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    }
  };

  const controls = (
    <>
      <Segmented<BackgroundChoice>
        legend="Background"
        value={background}
        onChange={setBackground}
        options={[
          { value: "white", label: "Clean white" },
          { value: "transparent", label: "Transparent" },
          { value: "keep", label: "Keep as is" },
        ]}
        hint="Clean white turns paper tones and shadows pure white. Transparent removes the background (PNG only)."
      />
      {background !== "keep" ? (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <FieldLabel htmlFor={thresholdId}>Clean-up strength</FieldLabel>
            <output htmlFor={thresholdId} className="font-mono text-sm tabular-nums text-ink">
              {threshold}
            </output>
          </div>
          <input
            id={thresholdId}
            type="range"
            min={120}
            max={250}
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
            className="mt-2 h-2 w-full cursor-pointer accent-[var(--color-accent)]"
          />
          <div className="mt-1 flex justify-between text-xs text-muted" aria-hidden="true">
            <span>Keep more grey</span>
            <span>Remove more background</span>
          </div>
          <p className="mt-1 text-xs text-muted">If parts of the signature disappear, move the slider left. If grey shadows remain, move it right.</p>
        </div>
      ) : null}

      <OrientationControls onRotate={cropState.rotate} onFlip={cropState.flip} flipped={cropState.flipH} />

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="sig-width">Width (px)</FieldLabel>
            <input
              id="sig-width"
              inputMode="numeric"
              placeholder={String(pixels.width)}
              value={width}
              onChange={(event) => setWidth(event.target.value)}
              aria-invalid={Boolean(sizeError)}
              className={`${inputClass} mt-1.5`}
            />
          </div>
          <div>
            <FieldLabel htmlFor="sig-height">Height (px)</FieldLabel>
            <input
              id="sig-height"
              inputMode="numeric"
              placeholder={String(lock && h ? h : pixels.height)}
              value={lock ? (h ? String(h) : "") : height}
              onChange={(event) => setHeight(event.target.value)}
              disabled={lock}
              aria-invalid={Boolean(sizeError)}
              className={`${inputClass} mt-1.5 disabled:bg-surface disabled:text-muted`}
            />
          </div>
        </div>
        <Checkbox checked={lock} onChange={setLock} description="Height follows the width so the signature isn't stretched. Leave the width empty to keep the selection's size.">
          Lock aspect ratio
        </Checkbox>
        {sizeError ? <p className="text-sm font-medium text-danger">{sizeError}</p> : null}
      </div>

      {background === "transparent" ? (
        <p className="text-sm text-muted">Output format: PNG (needed for a transparent background).</p>
      ) : (
        <Segmented<FormatChoice>
          legend="Output format"
          value={format}
          onChange={setFormat}
          options={[
            { value: "image/jpeg", label: "JPG" },
            { value: "image/png", label: "PNG" },
          ]}
        />
      )}

      {mime === "image/jpeg" ? (
        <div className="max-w-[14rem]">
          <FieldLabel htmlFor="sig-max-kb">Maximum file size (KB)</FieldLabel>
          <input
            id="sig-max-kb"
            inputMode="decimal"
            placeholder="Optional, e.g. 20"
            value={maxKB}
            onChange={(event) => setMaxKB(event.target.value)}
            aria-invalid={Boolean(kbError)}
            className={`${inputClass} mt-1.5`}
          />
          {kbError ? <p className="mt-1.5 text-sm font-medium text-danger">{kbError}</p> : null}
        </div>
      ) : (
        <p className="text-xs text-muted">PNG files can&apos;t be squeezed to an exact KB limit here; choose JPG if your form sets one.</p>
      )}

      <ActionButton
        onClick={() => run(source)}
        busy={runner.busy}
        busyLabel="Preparing signature…"
        progress={runner.progress}
        disabled={Boolean(sizeError || kbError)}
      >
        {current ? "Create signature again" : "Create signature image"}
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
      prompt="Drop a photo or scan of your signature"
      widePreview
      preview={
        <ImageCropper
          src={source.url}
          imageWidth={cropState.dims.width}
          imageHeight={cropState.dims.height}
          rotation={cropState.rotation}
          flipH={cropState.flipH}
          aspect={null}
          crop={cropState.crop}
          onChange={cropState.setCrop}
          label="Signature crop area"
        />
      }
      controls={controls}
      result={
        current ? (
          <ResultPanel
            tool={TOOL}
            heading="Your signature image"
            original={source}
            output={current.image}
            fileName={outputFileName(source.name, `signature-${current.image.width}x${current.image.height}`, FORMATS[current.image.mime].extension)}
            downloadLabel={`Download ${FORMATS[current.image.mime].label}`}
            status={
              <>
                {current.overMax ? (
                  <Alert tone="warning" title={`Couldn't get under ${current.maxKB} KB at this size`}>
                    The smallest file at {formatDimensions(current.image.width, current.image.height)} is{" "}
                    {formatBytes(current.image.blob.size)}. Try smaller dimensions or a stronger background clean-up.
                  </Alert>
                ) : (
                  <Alert tone="success" title={`${formatDimensions(current.image.width, current.image.height)}, ${formatBytes(current.image.blob.size)}`}>
                    Zoom in on the preview to check the strokes are complete before downloading.
                  </Alert>
                )}
                <Alert tone="info" title="Check your form's rules">
                  Forms set their own size, file type and KB limits. Compare the result with the instructions for your application before uploading.
                </Alert>
              </>
            }
          />
        ) : null
      }
    />
  );
}
