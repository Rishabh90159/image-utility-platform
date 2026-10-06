"use client";

import { useId, useState } from "react";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { ImageCropper } from "@/components/cropper/image-cropper";
import { OrientationControls } from "@/components/cropper/orientation-controls";
import { useCropState } from "@/components/cropper/use-crop";
import { Alert } from "@/components/controls/alert";
import { FieldLabel, inputClass, Segmented } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import { toImageToolError } from "@/lib/image-processing/errors";
import { FORMATS, LIMITS, RASTER_INPUT_FORMATS } from "@/lib/image-processing/formats";
import type { ImageTransform } from "@/lib/image-processing/types";
import { getPreset, PHOTO_PRESETS, PRINT_DPI, type PhotoPreset } from "@/lib/presets/photo-presets";
import { formatBytes, formatDimensions, KB, outputFileName, sizeBucket } from "@/lib/utils/format";
import { useJobRunner, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const TOOL = "passport-photo-resizer" as const;
const QUALITY = 0.92;

type Unit = "mm" | "in" | "px";

interface PhotoSpec {
  widthPx: number;
  heightPx: number;
  dpi?: number;
  minKB?: number;
  maxKB?: number;
}

interface CustomState {
  unit: Unit;
  width: string;
  height: string;
  dpi: string;
  minKB: string;
  maxKB: string;
}

const DEFAULT_CUSTOM: CustomState = { unit: "mm", width: "35", height: "45", dpi: String(PRINT_DPI), minKB: "", maxKB: "" };

function optionalNumber(value: string): number | undefined | null {
  if (!value.trim()) return undefined;
  const n = Number(value.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Turns the custom form into pixel dimensions, or explains what's wrong. */
function customSpec(c: CustomState): { spec: PhotoSpec | null; error: string | null } {
  const w = Number(c.width.trim());
  const h = Number(c.height.trim());
  if (!(w > 0) || !(h > 0)) return { spec: null, error: "Enter a width and height greater than zero." };
  let dpi: number | undefined;
  let widthPx = w;
  let heightPx = h;
  if (c.unit !== "px") {
    dpi = Number(c.dpi.trim());
    if (!Number.isInteger(dpi) || dpi < 72 || dpi > 1200) return { spec: null, error: "Enter a resolution between 72 and 1200 DPI." };
    const inches = c.unit === "mm" ? 25.4 : 1;
    widthPx = Math.round((w / inches) * dpi);
    heightPx = Math.round((h / inches) * dpi);
  } else if (!Number.isInteger(w) || !Number.isInteger(h)) {
    return { spec: null, error: "Pixel sizes must be whole numbers." };
  }
  if (widthPx < 50 || heightPx < 50) return { spec: null, error: "That's too small for a photo; use at least 50 × 50 pixels." };
  if (widthPx > 6000 || heightPx > 6000 || widthPx * heightPx > LIMITS.maxOutputPixels) {
    return { spec: null, error: "That's larger than a photo needs; use at most 6000 pixels per side." };
  }
  const minKB = optionalNumber(c.minKB);
  const maxKB = optionalNumber(c.maxKB);
  if (minKB === null || maxKB === null) return { spec: null, error: "File size limits must be positive numbers in KB." };
  if (maxKB !== undefined && maxKB < 5) return { spec: null, error: "The maximum file size must be at least 5 KB." };
  if (minKB !== undefined && maxKB !== undefined && minKB >= maxKB) {
    return { spec: null, error: "The minimum file size must be smaller than the maximum." };
  }
  return { spec: { widthPx, heightPx, dpi, minKB, maxKB }, error: null };
}

interface PassportResult {
  key: string;
  image: ResultImage;
  spec: PhotoSpec;
  /** Max KB requested but not reachable at these dimensions. */
  overMax: boolean;
  underMin: boolean;
}

export function PassportPhotoTool() {
  useToolOpen(TOOL);
  const { source, loading, error, select, clear, setError } = useSourceImage({ tool: TOOL, accept: RASTER_INPUT_FORMATS });
  const runner = useJobRunner();
  const presetSelectId = useId();
  const [presetId, setPresetId] = useState<string>("custom");
  const [custom, setCustom] = useState<CustomState>(DEFAULT_CUSTOM);
  const [result, setResult] = useState<PassportResult | null>(null);

  const preset = getPreset(presetId);
  const { spec, error: specError } = preset
    ? { spec: { widthPx: preset.widthPx, heightPx: preset.heightPx, dpi: preset.dpi, minKB: preset.minKB, maxKB: preset.maxKB }, error: null }
    : customSpec(custom);
  const aspect = spec ? spec.widthPx / spec.heightPx : 35 / 45;
  const cropState = useCropState(source, aspect);

  const onFile = async (file: File) => {
    runner.cancel();
    const loaded = await select(file);
    if (loaded) setResult(null);
  };

  const reset = () => {
    runner.cancel();
    clear();
    setResult(null);
  };

  const settingsKey = source && spec ? JSON.stringify([source.id, cropState.transform, spec]) : "";
  const current = result?.key === settingsKey ? result : null;

  const run = async (image: SourceImage, photo: PhotoSpec, transform: ImageTransform) => {
    setError(null);
    const base = { sourceId: image.id, file: image.file, transform, dpi: photo.dpi };
    try {
      let blob: Blob;
      let overMax = false;
      if (photo.maxKB) {
        const found = await runner.run({
          ...base,
          kind: "target",
          sourceMime: image.mime,
          targetBytes: Math.floor(photo.maxKB * KB),
          mime: "image/jpeg",
          allowResize: false,
          background: "#ffffff",
          width: photo.widthPx,
          height: photo.heightPx,
        });
        if (!found) return;
        blob = found.blob;
        overMax = found.outcome !== "met";
      } else {
        const encoded = await runner.run({
          ...base,
          kind: "encode",
          width: photo.widthPx,
          height: photo.heightPx,
          mime: "image/jpeg",
          quality: QUALITY,
          background: "#ffffff",
        });
        if (!encoded) return;
        blob = encoded.blob;
      }
      // Some portals also set a minimum size. Use maximum quality if that helps reach it.
      if (photo.minKB && blob.size < photo.minKB * KB) {
        const best = await runner.run({
          ...base,
          kind: "encode",
          width: photo.widthPx,
          height: photo.heightPx,
          mime: "image/jpeg",
          quality: 1,
          background: "#ffffff",
        });
        if (!best) return;
        if (best.blob.size > blob.size && (!photo.maxKB || best.blob.size <= photo.maxKB * KB)) blob = best.blob;
      }
      const underMin = Boolean(photo.minKB && blob.size < photo.minKB * KB);
      setResult({
        key: settingsKey,
        image: { blob, width: photo.widthPx, height: photo.heightPx, mime: "image/jpeg" },
        spec: photo,
        overMax,
        underMin,
      });
      track("passport_photo_completed", {
        tool: TOOL,
        input_format: FORMATS[image.mime].label,
        output_format: "JPG",
        size_bucket: sizeBucket(image.size),
        preset: preset ? preset.id : "custom",
        outcome: overMax ? "over-max" : underMin ? "under-min" : "met",
      });
    } catch (caught) {
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    }
  };

  const requirementPicker = (
    <div className="space-y-4">
      <div>
        <FieldLabel htmlFor={presetSelectId}>Photo requirement</FieldLabel>
        <select
          id={presetSelectId}
          value={presetId}
          onChange={(event) => setPresetId(event.target.value)}
          className={`${inputClass} mt-1.5`}
        >
          <option value="custom">Custom size (enter your form&apos;s requirement)</option>
          {groupByCountry(PHOTO_PRESETS).map(([country, presets]) => (
            <optgroup key={country} label={country}>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.country} – {p.document}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted">
          Only requirements checked against an official government source are listed. For anything else, use Custom size.
        </p>
      </div>

      {preset ? <PresetDetails preset={preset} /> : <CustomFields value={custom} onChange={setCustom} error={specError} />}
    </div>
  );

  if (!source) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-line bg-canvas p-4 shadow-sm sm:p-5">{requirementPicker}</div>
        <ToolWorkspace
          accept={RASTER_INPUT_FORMATS}
          source={null}
          loading={loading}
          error={error}
          onFile={onFile}
          onReset={reset}
          prompt="Drop your photo"
          controls={null}
        />
      </div>
    );
  }

  const controls = (
    <>
      {requirementPicker}
      <OrientationControls onRotate={cropState.rotate} onFlip={cropState.flip} flipped={cropState.flipH} />
      {spec ? (
        <p className="text-sm text-muted">
          Output: <span className="font-medium text-ink">{formatDimensions(spec.widthPx, spec.heightPx)} JPG</span>
          {spec.dpi ? ` at ${spec.dpi} DPI` : ""}
          {spec.maxKB ? `, at most ${spec.maxKB} KB` : ""}
          {spec.minKB ? `, at least ${spec.minKB} KB` : ""}
        </p>
      ) : null}
      {cropState.pixels.width < (spec?.widthPx ?? 0) ? (
        <Alert tone="warning" title="The selected area is smaller than the output">
          Your selection is {cropState.pixels.width} pixels wide but the photo needs {spec?.widthPx}. It will be enlarged and
          may look soft. Use a higher-resolution photo if you can.
        </Alert>
      ) : null}
      <ActionButton
        onClick={() => spec && run(source, spec, cropState.transform)}
        busy={runner.busy}
        busyLabel="Preparing photo…"
        progress={runner.progress}
        disabled={!spec}
      >
        {current ? "Create photo again" : "Create photo"}
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
      prompt="Drop your photo"
      widePreview
      preview={
        <div className="space-y-3">
          <ImageCropper
            src={source.url}
            imageWidth={cropState.dims.width}
            imageHeight={cropState.dims.height}
            rotation={cropState.rotation}
            flipH={cropState.flipH}
            aspect={aspect}
            crop={cropState.crop}
            onChange={cropState.setCrop}
            guide="portrait"
            label="Photo crop area"
          />
          <p className="text-xs text-muted">
            The dashed oval is only a centring aid, not an official template. Check the head-size rule for your application.
          </p>
        </div>
      }
      controls={controls}
      result={
        current ? (
          <ResultPanel
            tool={TOOL}
            heading="Your photo is ready"
            original={source}
            output={current.image}
            fileName={outputFileName(source.name, `photo-${current.spec.widthPx}x${current.spec.heightPx}`, "jpg")}
            downloadLabel="Download JPG"
            extraRows={
              current.spec.dpi
                ? [
                    {
                      label: "Print size",
                      before: "—",
                      after: `${((current.spec.widthPx / current.spec.dpi) * 25.4).toFixed(1)} × ${((current.spec.heightPx / current.spec.dpi) * 25.4).toFixed(1)} mm at ${current.spec.dpi} DPI`,
                    },
                  ]
                : []
            }
            status={
              <>
                {current.overMax ? (
                  <Alert tone="warning" title={`Couldn't get under ${current.spec.maxKB} KB at this size`}>
                    The smallest file at {formatDimensions(current.spec.widthPx, current.spec.heightPx)} is{" "}
                    {formatBytes(current.image.blob.size)}. A plainer background or a photo with less noise compresses better.
                  </Alert>
                ) : current.underMin ? (
                  <Alert tone="warning" title={`The file is smaller than ${current.spec.minKB} KB`}>
                    Even at maximum quality this photo is {formatBytes(current.image.blob.size)}. Some forms reject files below
                    their minimum; check whether a larger pixel size is allowed.
                  </Alert>
                ) : (
                  <Alert tone="success" title={`${formatDimensions(current.spec.widthPx, current.spec.heightPx)} JPG, ${formatBytes(current.image.blob.size)}`}>
                    The size and file limits you chose are met.
                  </Alert>
                )}
                <VerifyNotice />
              </>
            }
          />
        ) : null
      }
    />
  );
}

function VerifyNotice() {
  return (
    <Alert tone="info" title="Check the official requirements before submitting">
      Requirements vary by country and application. Verify the final image against the official application requirements
      before submitting. This tool sets size and file limits; it can&apos;t check pose, lighting, expression or background.
    </Alert>
  );
}

function groupByCountry(presets: PhotoPreset[]): [string, PhotoPreset[]][] {
  const groups = new Map<string, PhotoPreset[]>();
  for (const preset of presets) groups.set(preset.country, [...(groups.get(preset.country) ?? []), preset]);
  return [...groups];
}

function PresetDetails({ preset }: { preset: PhotoPreset }) {
  const verified = new Date(`${preset.lastVerified}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <div className="rounded-md border border-line bg-surface px-4 py-3 text-sm">
      <p className="font-semibold text-ink">
        {preset.country} – {preset.document}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
        {preset.requirements.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {preset.sizeNote ? <p className="mt-2 text-muted">{preset.sizeNote}</p> : null}
      <p className="mt-2 text-muted">
        Source:{" "}
        <a href={preset.source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline">
          {preset.source.name}
        </a>{" "}
        · Last verified <time dateTime={preset.lastVerified}>{verified}</time>
      </p>
    </div>
  );
}

function CustomFields({ value, onChange, error }: { value: CustomState; onChange: (next: CustomState) => void; error: string | null }) {
  const set = (patch: Partial<CustomState>) => onChange({ ...value, ...patch });
  const unitLabel = value.unit === "in" ? "inches" : value.unit;
  return (
    <div className="space-y-4">
      <Segmented<Unit>
        legend="Size unit"
        value={value.unit}
        onChange={(unit) => set({ unit })}
        options={[
          { value: "mm", label: "Millimetres" },
          { value: "in", label: "Inches" },
          { value: "px", label: "Pixels" },
        ]}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <FieldLabel htmlFor="pp-width">Width ({unitLabel})</FieldLabel>
          <input id="pp-width" inputMode="decimal" value={value.width} onChange={(e) => set({ width: e.target.value })} aria-invalid={Boolean(error)} className={`${inputClass} mt-1.5`} />
        </div>
        <div>
          <FieldLabel htmlFor="pp-height">Height ({unitLabel})</FieldLabel>
          <input id="pp-height" inputMode="decimal" value={value.height} onChange={(e) => set({ height: e.target.value })} aria-invalid={Boolean(error)} className={`${inputClass} mt-1.5`} />
        </div>
        {value.unit !== "px" ? (
          <div>
            <FieldLabel htmlFor="pp-dpi">Resolution (DPI)</FieldLabel>
            <input id="pp-dpi" inputMode="numeric" value={value.dpi} onChange={(e) => set({ dpi: e.target.value })} aria-invalid={Boolean(error)} className={`${inputClass} mt-1.5`} />
          </div>
        ) : null}
        <div>
          <FieldLabel htmlFor="pp-min">Min file size (KB)</FieldLabel>
          <input id="pp-min" inputMode="decimal" placeholder="Optional" value={value.minKB} onChange={(e) => set({ minKB: e.target.value })} className={`${inputClass} mt-1.5`} />
        </div>
        <div>
          <FieldLabel htmlFor="pp-max">Max file size (KB)</FieldLabel>
          <input id="pp-max" inputMode="decimal" placeholder="Optional" value={value.maxKB} onChange={(e) => set({ maxKB: e.target.value })} className={`${inputClass} mt-1.5`} />
        </div>
      </div>
      {error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted">Copy these numbers from the official instructions for your application.</p>
      )}
    </div>
  );
}
