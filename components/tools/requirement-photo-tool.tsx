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
import { FORMATS, RASTER_INPUT_FORMATS } from "@/lib/image-processing/formats";
import type { BackgroundCleanup } from "@/lib/image-processing/types";
import { formatKbRange, type ImageKind, type ImageSpec, type RequirementSet } from "@/lib/requirements/types";
import type { ToolId } from "@/lib/tools/registry";
import { formatBytes, formatDimensions, KB, outputFileName, sizeBucket } from "@/lib/utils/format";
import { useJobRunner, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { growToMinimum, runSpec, type OutputSpec } from "./spec-runner";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const CUSTOM = "custom";

interface CustomSpec {
  width: string;
  height: string;
  minKB: string;
  maxKB: string;
}

interface Made {
  key: string;
  image: ResultImage;
  spec: OutputSpec;
  overMax: boolean;
  underMin: boolean;
  /** Set when the user chose to enlarge a "preferred" pixel size to reach the minimum KB. */
  grownFrom?: { width: number; height: number };
}

export interface RequirementPhotoToolProps {
  tool: ToolId;
  sets: RequirementSet[];
  /** Label for the first picker when sets are grouped (e.g. "Country"). Sets need a `group`. */
  groupLabel?: string;
  /** Label for the requirement picker, e.g. "Exam / notification". */
  setLabel: string;
  /** Short name used in messages, e.g. "IBPS". */
  appName: string;
}

function parseOptional(value: string): number | undefined | null {
  if (!value.trim()) return undefined;
  const n = Number(value.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function customToSpec(c: CustomSpec): { spec: OutputSpec | null; error: string | null } {
  const w = parseOptional(c.width);
  const h = parseOptional(c.height);
  const min = parseOptional(c.minKB);
  const max = parseOptional(c.maxKB);
  if (w === null || h === null || min === null || max === null) return { spec: null, error: "Use positive numbers, or leave a field empty." };
  if ((w === undefined) !== (h === undefined)) return { spec: null, error: "Enter both width and height in pixels, or leave both empty." };
  if (w !== undefined && h !== undefined && (!Number.isInteger(w) || !Number.isInteger(h) || w < 20 || h < 20 || w > 6000 || h > 6000)) {
    return { spec: null, error: "Width and height must be whole numbers between 20 and 6000 pixels." };
  }
  if (max !== undefined && max < 2) return { spec: null, error: "The maximum file size must be at least 2 KB." };
  if (min !== undefined && max !== undefined && min >= max) return { spec: null, error: "The minimum file size must be smaller than the maximum." };
  return { spec: { widthPx: w, heightPx: h, minKB: min, maxKB: max }, error: null };
}

function specToOutput(spec: ImageSpec): OutputSpec {
  return { widthPx: spec.widthPx, heightPx: spec.heightPx, minKB: spec.minKB, maxKB: spec.maxKB, dpi: spec.dpi };
}

/**
 * Prepares a photo or signature for a specific application from verified
 * requirement data. Every value comes from `sets`; when none applies, the user
 * enters the numbers from their own notification.
 */
export function RequirementPhotoTool(props: RequirementPhotoToolProps) {
  // Anchor target for the "jump to the tool" link in the requirement summary.
  return (
    <div id="prepare" className="scroll-mt-4">
      <RequirementPhotoToolInner {...props} />
    </div>
  );
}

function RequirementPhotoToolInner({ tool, sets, groupLabel, setLabel, appName }: RequirementPhotoToolProps) {
  useToolOpen(tool);
  const { source, loading, error, select, clear, setError } = useSourceImage({ tool, accept: RASTER_INPUT_FORMATS });
  const runner = useJobRunner();
  const groupId = useId();
  const setId = useId();
  const thresholdId = useId();

  const groups = groupLabel ? [...new Set(sets.map((s) => s.group ?? ""))] : [];
  const [group, setGroup] = useState(groups[0] ?? "");
  const visibleSets = groupLabel ? sets.filter((s) => (s.group ?? "") === group) : sets;
  const [selected, setSelected] = useState<string>(visibleSets[0]?.id ?? CUSTOM);
  const set = visibleSets.find((s) => s.id === selected) ?? null;

  const kinds: ImageKind[] = set ? (["photo", "signature"] as const).filter((k) => set[k]) : ["photo", "signature"];
  const [kindChoice, setKindChoice] = useState<ImageKind>("photo");
  const kind = kinds.includes(kindChoice) ? kindChoice : kinds[0];
  const imageSpec = set ? set[kind] : undefined;

  const [custom, setCustom] = useState<CustomSpec>({ width: "", height: "", minKB: "", maxKB: "" });
  const customResult = set ? null : customToSpec(custom);
  const output: OutputSpec | null = imageSpec ? specToOutput(imageSpec) : (customResult?.spec ?? null);
  const specError = customResult?.error ?? null;

  const [cleanBg, setCleanBg] = useState(true);
  const [threshold, setThreshold] = useState(190);
  const cleanup: BackgroundCleanup | undefined = kind === "signature" && cleanBg ? { threshold, to: "white" } : undefined;

  const aspect = imageSpec?.aspect ?? (output?.widthPx && output.heightPx ? output.widthPx / output.heightPx : null);
  const cropState = useCropState(source, aspect);
  const [made, setMade] = useState<Made | null>(null);

  const presetName = set?.id ?? CUSTOM;
  const settingsKey = source && output ? JSON.stringify([source.id, presetName, kind, output, cropState.transform, cleanup]) : "";
  const current = made?.key === settingsKey ? made : null;

  const changeGroup = (value: string) => {
    setGroup(value);
    setSelected(sets.find((s) => (s.group ?? "") === value)?.id ?? CUSTOM);
  };

  const onFile = async (file: File) => {
    runner.cancel();
    const loaded = await select(file);
    if (!loaded) return;
    setMade(null);
    track("application_photo_started", { tool, preset: presetName, mode: kind, input_format: FORMATS[loaded.mime].label });
  };

  const reset = () => {
    runner.cancel();
    clear();
    setMade(null);
  };

  const create = async (image: SourceImage, spec: OutputSpec) => {
    setError(null);
    try {
      const result = await runSpec(runner.run, image, spec, cropState.transform, cleanup);
      if (!result) return;
      setMade({
        key: settingsKey,
        image: { blob: result.blob, width: result.width, height: result.height, mime: "image/jpeg" },
        spec,
        overMax: result.overMax,
        underMin: result.underMin,
      });
      track("application_photo_completed", {
        tool,
        preset: presetName,
        mode: kind,
        size_bucket: sizeBucket(image.size),
        outcome: result.overMax ? "over-max" : result.underMin ? "under-min" : "met",
      });
    } catch (caught) {
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool, error_code: normalized.code });
    }
  };

  const grow = async (image: SourceImage, spec: OutputSpec) => {
    setError(null);
    try {
      const grown = await growToMinimum(runner.run, image, spec, cropState.transform, cleanup);
      if (!grown) return;
      setMade({
        key: settingsKey,
        image: { blob: grown.result.blob, width: grown.result.width, height: grown.result.height, mime: "image/jpeg" },
        spec: grown.spec,
        overMax: grown.result.overMax,
        underMin: grown.result.underMin,
        grownFrom: spec.widthPx && spec.heightPx ? { width: spec.widthPx, height: spec.heightPx } : undefined,
      });
      track("application_photo_completed", { tool, preset: presetName, mode: `${kind}-enlarged`, outcome: grown.result.underMin ? "under-min" : "met" });
    } catch (caught) {
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool, error_code: normalized.code });
    }
  };

  const picker = (
    <div className="space-y-4">
      {groupLabel ? (
        <div>
          <FieldLabel htmlFor={groupId}>{groupLabel}</FieldLabel>
          <select id={groupId} value={group} onChange={(e) => changeGroup(e.target.value)} className={`${inputClass} mt-1.5`}>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div>
        <FieldLabel htmlFor={setId}>{setLabel}</FieldLabel>
        <select id={setId} value={set ? set.id : CUSTOM} onChange={(e) => setSelected(e.target.value)} className={`${inputClass} mt-1.5`}>
          {visibleSets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value={CUSTOM}>Other – enter the requirement from my notification</option>
        </select>
      </div>

      {set?.livePhotoCapture && !set.photo ? (
        <Alert tone="info" title="The photo is captured live, not uploaded">
          The {appName} application takes your photo with your camera while you fill in the form, so there is no photo file to
          prepare. This tool prepares the signature you upload.
        </Alert>
      ) : null}

      {kinds.length > 1 ? (
        <Segmented<ImageKind>
          legend="What are you preparing?"
          value={kind}
          onChange={setKindChoice}
          options={kinds.map((k) => ({ value: k, label: k === "photo" ? "Photograph" : "Signature" }))}
        />
      ) : null}

      {set && imageSpec ? (
        <SpecLine spec={imageSpec} />
      ) : !set ? (
        <CustomFields value={custom} onChange={setCustom} error={specError} />
      ) : null}
    </div>
  );

  if (!source) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-line bg-canvas p-4 shadow-sm sm:p-5">{picker}</div>
        <ToolWorkspace
          accept={RASTER_INPUT_FORMATS}
          source={null}
          loading={loading}
          error={error}
          onFile={onFile}
          onReset={reset}
          prompt={kind === "signature" ? "Drop a photo or scan of your signature" : "Drop your photo"}
          controls={null}
        />
      </div>
    );
  }

  const controls = (
    <>
      {picker}
      <OrientationControls onRotate={cropState.rotate} onFlip={cropState.flip} flipped={cropState.flipH} />
      {kind === "signature" ? (
        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={cleanBg}
              onChange={(e) => setCleanBg(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
            />
            <span>
              Clean the paper background to white
              <span className="mt-0.5 block text-xs font-normal text-muted">Removes grey paper tones and shadows; keeps the ink.</span>
            </span>
          </label>
          {cleanBg ? (
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
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="mt-2 h-2 w-full cursor-pointer accent-[var(--color-accent)]"
              />
            </div>
          ) : null}
        </div>
      ) : null}
      <ActionButton
        onClick={() => output && create(source, output)}
        busy={runner.busy}
        busyLabel={kind === "signature" ? "Preparing signature…" : "Preparing photo…"}
        progress={runner.progress}
        disabled={!output}
      >
        {current ? "Create again" : kind === "signature" ? "Create signature file" : "Create photo file"}
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
        <ImageCropper
          src={source.url}
          imageWidth={cropState.dims.width}
          imageHeight={cropState.dims.height}
          rotation={cropState.rotation}
          flipH={cropState.flipH}
          aspect={aspect}
          crop={cropState.crop}
          onChange={cropState.setCrop}
          guide={kind === "photo" ? "portrait" : "thirds"}
          label={kind === "photo" ? "Photo crop area" : "Signature crop area"}
        />
      }
      controls={controls}
      result={
        current ? (
          <ResultPanel
            tool={tool}
            heading={kind === "signature" ? "Your signature file" : "Your photo file"}
            original={source}
            output={current.image}
            fileName={outputFileName(source.name, `${appName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${kind}`, "jpg")}
            downloadLabel={`Download JPG (${formatBytes(current.image.blob.size)})`}
            downloadEvent="photo_downloaded"
            status={
              <Checklist
                made={current}
                spec={imageSpec}
                appName={appName}
                busy={runner.busy}
                onGrow={
                  current.underMin && !current.grownFrom && imageSpec?.pixelBasis === "preferred" && output
                    ? () => grow(source, output)
                    : undefined
                }
              />
            }
          />
        ) : null
      }
    />
  );
}

function SpecLine({ spec }: { spec: ImageSpec }) {
  const parts = [
    spec.widthPx && spec.heightPx
      ? `${spec.widthPx} × ${spec.heightPx} px${spec.pixelBasis === "preferred" ? " (preferred)" : spec.pixelBasis === "minimum" ? " (minimum accepted)" : ""}`
      : spec.physical
        ? `${spec.physical}`
        : "Any pixel size (none specified)",
    formatKbRange(spec),
    spec.format,
  ].filter(Boolean);
  return (
    <p className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink-soft">
      Applying: <span className="font-medium text-ink">{parts.join(" · ")}</span>
    </p>
  );
}

function Checklist({
  made,
  spec,
  appName,
  onGrow,
  busy,
}: {
  made: Made;
  spec?: ImageSpec;
  appName: string;
  onGrow?: () => void;
  busy: boolean;
}) {
  const { image, spec: out } = made;
  const size = image.blob.size;
  const checks: { label: string; ok: boolean; detail: string }[] = [];
  if (made.grownFrom) {
    checks.push({
      label: "Pixel size",
      ok: image.width === out.widthPx && image.height === out.heightPx,
      detail: `${formatDimensions(image.width, image.height)}, enlarged from the preferred ${made.grownFrom.width} × ${made.grownFrom.height} to reach the minimum file size`,
    });
  } else if (out.widthPx && out.heightPx) {
    const ok = image.width === out.widthPx && image.height === out.heightPx;
    const word = spec?.pixelBasis === "preferred" ? "preferred" : "required";
    checks.push({ label: "Pixel size", ok, detail: `${formatDimensions(image.width, image.height)} (${word} ${out.widthPx} × ${out.heightPx})` });
  } else {
    checks.push({ label: "Pixel size", ok: true, detail: `${formatDimensions(image.width, image.height)}; no pixel size is specified` });
  }
  if (out.minKB || out.maxKB) {
    const ok = (!out.minKB || size >= out.minKB * KB) && (!out.maxKB || size <= out.maxKB * KB);
    checks.push({ label: "File size", ok, detail: `${formatBytes(size)} (required ${formatKbRange({ minKB: out.minKB, maxKB: out.maxKB })})` });
  }
  checks.push({
    label: "Format",
    ok: !spec?.format || /jp(e)?g/i.test(spec.format),
    detail: spec?.format ? `JPG (accepted: ${spec.format})` : "JPG",
  });
  const allOk = checks.every((c) => c.ok);

  return (
    <>
      <ul className="divide-y divide-line rounded-md border border-line" aria-label="Requirement check">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-3 px-4 py-2.5 text-sm">
            <span aria-hidden="true" className={`mt-0.5 font-semibold ${c.ok ? "text-success" : "text-warning"}`}>
              {c.ok ? "✓" : "!"}
            </span>
            <span>
              <span className="font-medium text-ink">
                {c.label}: <span className="sr-only">{c.ok ? "meets the requirement" : "does not meet the requirement"}. </span>
              </span>
              <span className="text-ink-soft">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      {made.overMax ? (
        <Alert tone="warning" title={`Couldn't get under ${out.maxKB} KB at this size`}>
          The smallest file at {formatDimensions(image.width, image.height)} is {formatBytes(size)}. A plainer background or a
          tighter crop compresses better.
        </Alert>
      ) : made.underMin ? (
        <Alert tone="warning" title={`The file is below the ${out.minKB} KB minimum`}>
          Even at maximum quality this image is {formatBytes(size)} at {formatDimensions(image.width, image.height)}. Portals usually
          reject files below their minimum.{" "}
          {onGrow
            ? `The notification lists ${out.widthPx} × ${out.heightPx} px as preferred, not mandatory, so a slightly larger image with the same shape can reach the minimum.`
            : "Use a more detailed image, turn off the background clean-up, or check the notification for an alternative size."}
          {onGrow ? (
            <span className="mt-2 block">
              <button
                type="button"
                onClick={onGrow}
                disabled={busy}
                className="inline-flex min-h-11 items-center rounded-md border border-line-strong bg-canvas px-4 text-sm font-medium text-ink hover:bg-surface disabled:opacity-55"
              >
                {busy ? "Enlarging…" : `Make it larger to reach ${out.minKB} KB`}
              </button>
            </span>
          ) : null}
        </Alert>
      ) : allOk ? (
        <Alert tone="success" title="Meets the size and file limits shown above">
          This tool checks dimensions, file size and format only. It can&apos;t check pose, lighting, expression, background or
          how recent the photo is.
        </Alert>
      ) : null}
      <Alert tone="info" title="Verify before submitting">
        Application requirements can change. Always verify the final image against the latest official {appName} notification or
        application portal before submitting.
      </Alert>
    </>
  );
}

function CustomFields({ value, onChange, error }: { value: CustomSpec; onChange: (v: CustomSpec) => void; error: string | null }) {
  const set = (patch: Partial<CustomSpec>) => onChange({ ...value, ...patch });
  const field = (id: keyof CustomSpec, label: string, placeholder: string) => (
    <div>
      <FieldLabel htmlFor={`req-${id}`}>{label}</FieldLabel>
      <input
        id={`req-${id}`}
        inputMode="decimal"
        placeholder={placeholder}
        value={value[id]}
        onChange={(e) => set({ [id]: e.target.value })}
        aria-invalid={Boolean(error)}
        className={`${inputClass} mt-1.5`}
      />
    </div>
  );
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Copy the numbers from your official notification. Leave any field empty if it isn&apos;t specified.</p>
      <div className="grid grid-cols-2 gap-3">
        {field("width", "Width (px)", "Optional")}
        {field("height", "Height (px)", "Optional")}
        {field("minKB", "Min size (KB)", "Optional")}
        {field("maxKB", "Max size (KB)", "Optional")}
      </div>
      {error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
