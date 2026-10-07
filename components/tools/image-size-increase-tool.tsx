"use client";

import { useState } from "react";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { Alert } from "@/components/controls/alert";
import { Checkbox, FieldLabel, inputClass, Segmented } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import { toImageToolError } from "@/lib/image-processing/errors";
import { ALL_INPUT_FORMATS, FORMATS, LIMITS, outputMimeFor } from "@/lib/image-processing/formats";
import { formatBytes, formatDimensions, KB, outputFileName, sizeBucket } from "@/lib/utils/format";
import { useJobRunner, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const TOOL = "image-size-increase" as const;
const PERCENTS = [125, 150, 200, 300];
const KB_PRESETS = [20, 50, 100, 200, 500];

type Goal = "pixels" | "kb";
type Method = "pad" | "quality";

function whole(value: string): number {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN;
}

export function ImageSizeIncreaseTool() {
  useToolOpen(TOOL);
  const { source, loading, error, select, clear, setError } = useSourceImage({ tool: TOOL, accept: ALL_INPUT_FORMATS });
  const runner = useJobRunner();
  const [goal, setGoal] = useState<Goal>("pixels");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [lock, setLock] = useState(true);
  const [sharpen, setSharpen] = useState(true);
  const [targetKb, setTargetKb] = useState("50");
  const [method, setMethod] = useState<Method>("pad");
  const [result, setResult] = useState<{ key: string; image: ResultImage; note: React.ReactNode; rows: { label: string; before: string; after: string }[] } | null>(null);

  const onFile = async (file: File) => {
    runner.cancel();
    const loaded = await select(file);
    if (!loaded) return;
    setResult(null);
    setWidth(String(Math.round(loaded.width * 1.5)));
    setHeight(String(Math.round(loaded.height * 1.5)));
    // Suggest a KB target comfortably above the current size.
    const current = loaded.size / KB;
    setTargetKb(String(KB_PRESETS.find((kb) => kb > current * 1.2) ?? Math.ceil((current * 1.5) / 10) * 10));
  };

  const reset = () => {
    runner.cancel();
    clear();
    setResult(null);
    setGoal("pixels");
    setLock(true);
    setMethod("pad");
  };

  const setW = (value: string) => {
    setWidth(value);
    const w = whole(value);
    if (lock && source && Number.isFinite(w)) setHeight(String(Math.round((w * source.height) / source.width)));
  };
  const setH = (value: string) => {
    setHeight(value);
    const h = whole(value);
    if (lock && source && Number.isFinite(h)) setWidth(String(Math.round((h * source.width) / source.height)));
  };
  const setPercent = (percent: number) => {
    if (!source) return;
    setWidth(String(Math.round((source.width * percent) / 100)));
    setHeight(String(Math.round((source.height * percent) / 100)));
  };

  const w = whole(width);
  const h = whole(height);
  const kb = Number(targetKb);
  const pixelError = !source
    ? null
    : !Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1
      ? "Enter the new width and height in whole pixels."
      : w < source.width || h < source.height || (w === source.width && h === source.height)
        ? "Enter a size larger than the original. To make an image smaller, use the image resizer."
        : w * h > LIMITS.maxUpscalePixels || w > LIMITS.maxOutputSide || h > LIMITS.maxOutputSide
          ? `That's more than this tool can create in a browser (${LIMITS.maxUpscalePixels / 1_000_000} megapixels).`
          : null;
  const kbError = !source
    ? null
    : !Number.isFinite(kb) || kb < 1 || kb > 50 * 1024
      ? "Enter a target between 1 KB and 51,200 KB (50 MB)."
      : null;
  const alreadyBigger = source && !kbError && source.size >= kb * KB;
  const stretched = source && lock === false && Number.isFinite(w) && Number.isFinite(h) && Math.abs(w / h - source.width / source.height) > 0.01;

  const keyFor = (image: SourceImage) =>
    JSON.stringify(goal === "pixels" ? [image.id, goal, w, h, sharpen] : [image.id, goal, kb, method]);
  const current = source && result?.key === keyFor(source) ? result : null;

  const run = async (image: SourceImage) => {
    setError(null);
    track("processing_started", { tool: TOOL, mode: goal === "pixels" ? "pixels" : method });
    try {
      if (goal === "pixels") {
        const mime = outputMimeFor(image.mime);
        const done = await runner.run({
          kind: "upscale",
          sourceId: image.id,
          file: image.file,
          width: w,
          height: h,
          sharpen: sharpen ? 0.35 : 0,
          mime,
          quality: FORMATS[mime].lossy ? 0.92 : undefined,
          background: null,
        });
        if (!done) return;
        setResult({
          key: keyFor(image),
          image: { blob: done.blob, width: done.width, height: done.height, mime },
          rows: [],
          note: (
            <Alert tone="success" title={`Enlarged to ${formatDimensions(done.width, done.height)}`}>
              The image has more pixels but no extra detail; that&apos;s the limit of any enlargement. The file is bigger mainly
              because it has more pixels.
            </Alert>
          ),
        });
      } else {
        const done = await runner.run({ kind: "inflate", sourceId: image.id, file: image.file, sourceMime: image.mime, targetBytes: kb * KB, method });
        if (!done) return;
        const mime = done.alreadyLarger ? image.mime : "image/jpeg";
        setResult({
          key: keyFor(image),
          image: { blob: done.blob, width: done.width, height: done.height, mime },
          rows: [{ label: "Target", before: "—", after: `at least ${kb.toLocaleString("en-US")} KB` }],
          note: done.alreadyLarger ? (
            <Alert tone="info" title="Already big enough">
              Your file is already {formatBytes(image.size)}, which meets the {kb} KB minimum. It&apos;s returned unchanged.
            </Alert>
          ) : !done.reached ? (
            <Alert tone="warning" title={`Couldn't reach ${kb} KB`}>
              The largest version this method could make is {formatBytes(done.blob.size)}. Try “Keep the picture, add padding”,
              which can reach any size.
            </Alert>
          ) : done.paddedBytes > 0 ? (
            <Alert tone="success" title={`Now ${formatBytes(done.blob.size)}`}>
              {done.quality === null
                ? "Your original JPG pixels are unchanged; "
                : "The image was saved as a 92% JPG, then "}
              {formatBytes(done.paddedBytes)} of padding was added in a comment block that image viewers ignore. The picture
              looks exactly the same.
            </Alert>
          ) : (
            <Alert tone="success" title={`Now ${formatBytes(done.blob.size)}`}>
              Saved as JPG at {Math.round((done.quality ?? 0) * 100)}% quality
              {done.width !== image.width ? ` and enlarged to ${formatDimensions(done.width, done.height)}` : ""}. A bigger file
              doesn&apos;t mean a better-looking picture.
            </Alert>
          ),
        });
      }
      track("size_increase_completed", { tool: TOOL, mode: goal === "pixels" ? "pixels" : method, size_bucket: sizeBucket(image.size) });
    } catch (caught) {
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    }
  };

  const controls = source ? (
    <>
      <Segmented<Goal>
        legend="What do you want to increase?"
        value={goal}
        onChange={setGoal}
        options={[
          { value: "pixels", label: "Dimensions (pixels)" },
          { value: "kb", label: "File size (KB)" },
        ]}
        hint={
          goal === "pixels"
            ? "Makes the picture larger: more pixels wide and tall."
            : "Makes the file bigger, for forms with a minimum size such as “at least 20 KB”. The picture itself doesn't need to change."
        }
      />

      {goal === "pixels" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="increase-width">Width (px)</FieldLabel>
              <input id="increase-width" inputMode="numeric" autoComplete="off" value={width} onChange={(e) => setW(e.target.value)} aria-invalid={Boolean(pixelError)} aria-describedby="increase-pixels-status" className={`${inputClass} mt-1.5`} />
            </div>
            <div>
              <FieldLabel htmlFor="increase-height">Height (px)</FieldLabel>
              <input id="increase-height" inputMode="numeric" autoComplete="off" value={height} onChange={(e) => setH(e.target.value)} aria-invalid={Boolean(pixelError)} aria-describedby="increase-pixels-status" className={`${inputClass} mt-1.5`} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Enlarge by percentage">
            {PERCENTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPercent(p)}
                aria-pressed={w === Math.round((source.width * p) / 100) && h === Math.round((source.height * p) / 100)}
                className="min-h-10 rounded-md border border-line-strong px-3 text-sm text-ink-soft hover:bg-surface aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent-ink"
              >
                {p}%
              </button>
            ))}
          </div>
          <Checkbox checked={lock} onChange={setLock}>
            Lock aspect ratio
          </Checkbox>
          <Checkbox checked={sharpen} onChange={setSharpen} description="Counteracts the slight softness that enlarging causes.">
            Sharpen lightly
          </Checkbox>
          <p id="increase-pixels-status" className={`text-sm ${pixelError ? "font-medium text-danger" : "text-muted"}`}>
            {pixelError ?? (
              <>
                New size: <span className="font-medium text-ink">{formatDimensions(w, h)}</span> (was {formatDimensions(source.width, source.height)})
              </>
            )}
          </p>
          {stretched && !pixelError ? (
            <Alert tone="warning" title="The image will be stretched">
              These dimensions don&apos;t match the original proportions. Turn on “Lock aspect ratio” to avoid distortion.
            </Alert>
          ) : null}
        </>
      ) : (
        <>
          <div>
            <FieldLabel htmlFor="increase-kb">Minimum file size (KB)</FieldLabel>
            <input id="increase-kb" inputMode="numeric" autoComplete="off" value={targetKb} onChange={(e) => setTargetKb(e.target.value)} aria-invalid={Boolean(kbError)} aria-describedby="increase-kb-status" className={`${inputClass} mt-1.5 max-w-[12rem]`} />
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Common minimum sizes">
              {KB_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTargetKb(String(preset))}
                  aria-pressed={kb === preset}
                  className="min-h-10 rounded-md border border-line-strong px-3 text-sm text-ink-soft hover:bg-surface aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent-ink"
                >
                  {preset} KB
                </button>
              ))}
            </div>
            <p id="increase-kb-status" className={`mt-2 text-sm ${kbError ? "font-medium text-danger" : "text-muted"}`}>
              {kbError ?? <>Your file is {formatBytes(source.size)} now. 1 KB = 1024 bytes, as most upload forms count it.</>}
            </p>
          </div>
          <Segmented<Method>
            legend="How"
            value={method}
            onChange={setMethod}
            hint={
              method === "pad"
                ? "Adds an invisible comment block to the JPG. The picture stays pixel-for-pixel the same and the size is exact."
                : "Saves at a higher JPG quality and, if that's not enough, with more pixels. The picture changes slightly."
            }
            options={[
              { value: "pad", label: "Keep the picture, add padding" },
              { value: "quality", label: "Higher quality / more pixels" },
            ]}
          />
          {source.mime !== "image/jpeg" ? (
            <p className="text-sm text-muted">The result is a JPG, the format most forms with KB limits expect.</p>
          ) : null}
          {alreadyBigger ? (
            <Alert tone="info" title="Already above this size">
              Your file is {formatBytes(source.size)}, so it already meets a {kb} KB minimum.
            </Alert>
          ) : null}
        </>
      )}

      <ActionButton
        onClick={() => run(source)}
        busy={runner.busy}
        busyLabel="Working…"
        progress={runner.progress}
        disabled={goal === "pixels" ? Boolean(pixelError) : Boolean(kbError)}
      >
        {goal === "pixels" ? "Increase dimensions" : "Increase file size"}
      </ActionButton>
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
      prompt="Drop an image to make it bigger"
      controls={controls}
      result={
        source && current ? (
          <ResultPanel
            tool={TOOL}
            heading={goal === "pixels" ? "Your enlarged image" : "Your bigger file"}
            original={source}
            output={current.image}
            growthExpected
            extraRows={current.rows}
            status={current.note}
            fileName={outputFileName(source.name, goal === "pixels" ? `${current.image.width}x${current.image.height}` : `${kb}kb`, FORMATS[current.image.mime].extension)}
            downloadLabel={`Download ${FORMATS[current.image.mime].label}`}
          />
        ) : null
      }
    />
  );
}
