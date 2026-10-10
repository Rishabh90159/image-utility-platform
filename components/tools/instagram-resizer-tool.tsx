"use client";

import { useId, useState } from "react";
import { ResultPanel, type ResultImage } from "@/components/before-after/result-panel";
import { defaultCrop } from "@/components/cropper/crop-geometry";
import { ImageCropper } from "@/components/cropper/image-cropper";
import { OrientationControls } from "@/components/cropper/orientation-controls";
import { useCropState } from "@/components/cropper/use-crop";
import { Alert } from "@/components/controls/alert";
import { buttonClass } from "@/components/controls/button";
import { Checkbox, FieldLabel, inputClass, QualitySlider, Segmented } from "@/components/controls/fields";
import { ImagePreview } from "@/components/image-preview/image-preview";
import { track } from "@/lib/analytics";
import { toImageToolError } from "@/lib/image-processing/errors";
import { fitPlacement, shapesDiffer, type FitLayout } from "@/lib/image-processing/fit";
import { FORMATS, RASTER_INPUT_FORMATS, type OutputMime } from "@/lib/image-processing/formats";
import { getInstagramPreset, INSTAGRAM_PRESETS, STORY_SAFE_AREA, type InstagramPreset, type InstagramPresetId } from "@/lib/presets/instagram";
import { formatDimensions, outputFileName, sizeBucket } from "@/lib/utils/format";
import { useEncodeSupport, useJobRunner, useObjectUrl, useSourceImage, useToolOpen, type SourceImage } from "./hooks";
import { ActionButton, ToolWorkspace } from "./tool-workspace";

const TOOL = "instagram-image-resizer" as const;
/** Instagram never needs more; keeps memory use predictable on phones. */
const MAX_SIDE = 4096;

type PresetChoice = InstagramPresetId | "custom";
type Mode = "crop" | "fit";
type Fill = "white" | "black" | "custom" | "blur";

const FILL_COLORS: Record<Exclude<Fill, "custom" | "blur">, string> = { white: "#ffffff", black: "#000000" };

function parseSide(value: string): number | null {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

/**
 * Output frame used for previews: the largest box with the output's exact
 * shape that fits a fixed-height area, so nothing is stretched and the page
 * doesn't shift when the preset changes. Sized with container query units.
 */
function Frame({ width, height, children, label }: { width: number; height: number; children: React.ReactNode; label?: string }) {
  return (
    <div
      className="flex h-64 items-center justify-center rounded-md border border-line bg-surface p-3 sm:h-80 md:h-[26rem]"
      style={{ containerType: "size" }}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      <div
        className="relative overflow-hidden shadow-sm"
        style={{ aspectRatio: `${width} / ${height}`, width: `min(100cqw, calc(100cqh * ${width / height}))` }}
      >
        {children}
      </div>
    </div>
  );
}

/** Semi-transparent overlay marking the parts of the frame most at risk of being covered or cropped. */
function Guide({ preset, width, height }: { preset: InstagramPreset | null; width: number; height: number }) {
  if (!preset?.guide) return null;
  let top = 0;
  let bottom = 0;
  let text = "";
  if (preset.guide === "story-safe") {
    top = STORY_SAFE_AREA.top;
    bottom = STORY_SAFE_AREA.bottom;
    text = "Often covered by Instagram's interface";
  } else {
    // Centre 3:4 area of the frame, as shown in the profile grid.
    const visible = Math.min(1, (width * 4) / 3 / height);
    top = bottom = (1 - visible) / 2;
    text = "Hidden in the profile grid";
  }
  const band = "pointer-events-none absolute inset-x-0 flex items-center justify-center bg-ink/45 px-2 text-center text-[0.6875rem] font-medium leading-tight text-white";
  return (
    <>
      <div className={`${band} top-0 border-b border-dashed border-white/80`} style={{ height: `${top * 100}%` }}>
        {text}
      </div>
      <div className={`${band} bottom-0 border-t border-dashed border-white/80`} style={{ height: `${bottom * 100}%` }}>
        {text}
      </div>
    </>
  );
}

export function InstagramResizerTool() {
  useToolOpen(TOOL);
  const { source, loading, error, select, clear, setError } = useSourceImage({ tool: TOOL, accept: RASTER_INPUT_FORMATS });
  const runner = useJobRunner();
  const webpSupported = useEncodeSupport("image/webp");
  const colorId = useId();
  const positionId = useId();

  const [preset, setPreset] = useState<PresetChoice>("portrait");
  const [customW, setCustomW] = useState("1080");
  const [customH, setCustomH] = useState("1350");
  const [lockRatio, setLockRatio] = useState(true);
  const [mode, setMode] = useState<Mode>("crop");
  const [fill, setFill] = useState<Fill>("white");
  const [customColor, setCustomColor] = useState("#f2f2f2");
  const [align, setAlign] = useState(0.5);
  const [border, setBorder] = useState(0);
  const [output, setOutput] = useState<OutputMime>("image/jpeg");
  const [quality, setQuality] = useState(0.92);
  const [showGuide, setShowGuide] = useState(true);
  const [result, setResult] = useState<{ key: string; image: ResultImage } | null>(null);

  const activePreset = preset === "custom" ? null : getInstagramPreset(preset);
  const target = (() => {
    if (activePreset) return { width: activePreset.width, height: activePreset.height };
    const w = parseSide(customW);
    const h = parseSide(customH);
    return w && h ? { width: w, height: h } : null;
  })();
  const sizeError = !target
    ? "Enter a width and height in whole pixels."
    : target.width < 1 || target.height < 1
      ? "Width and height must be at least 1 pixel."
      : target.width > MAX_SIDE || target.height > MAX_SIDE
        ? `Each side can be at most ${MAX_SIDE.toLocaleString("en-US")} pixels. Instagram never needs more than 1080 px wide.`
        : null;
  const frame = target && !sizeError ? target : { width: 1080, height: 1350 };
  const aspect = frame.width / frame.height;

  const cropState = useCropState(source, aspect);
  const lastResultUrl = useObjectUrl(result?.image.blob ?? null);

  const onFile = async (file: File) => {
    runner.cancel();
    const loaded = await select(file);
    if (loaded) {
      setResult(null);
      setAlign(0.5);
    }
  };

  const reset = () => {
    runner.cancel();
    clear();
    setResult(null);
    setMode("crop");
    setAlign(0.5);
    setBorder(0);
  };

  const choosePreset = (next: PresetChoice) => {
    if (next === "custom" && activePreset) {
      // Start the custom size from the preset that was selected.
      setCustomW(String(activePreset.width));
      setCustomH(String(activePreset.height));
    }
    setPreset(next);
  };

  const onCustomW = (value: string) => {
    const w = parseSide(value);
    const prevW = parseSide(customW);
    const prevH = parseSide(customH);
    setCustomW(value);
    if (lockRatio && w && prevW && prevH) setCustomH(String(Math.max(1, Math.round((w * prevH) / prevW))));
  };
  const onCustomH = (value: string) => {
    const h = parseSide(value);
    const prevW = parseSide(customW);
    const prevH = parseSide(customH);
    setCustomH(value);
    if (lockRatio && h && prevW && prevH) setCustomW(String(Math.max(1, Math.round((h * prevW) / prevH))));
  };

  const presetPicker = (wide: boolean) => (
    <fieldset>
      <legend className="text-sm font-medium text-ink">Instagram size</legend>
      {(["feed", "vertical"] as const).map((group) => (
        <div key={group} className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{group === "feed" ? "Feed posts" : "Stories and Reels"}</p>
          <div className={`mt-2 grid grid-cols-2 gap-2 ${wide ? "lg:grid-cols-4" : ""}`}>
            {INSTAGRAM_PRESETS.filter((p) => p.group === group).map((p) => (
              <label
                key={p.id}
                className={`relative flex cursor-pointer flex-col rounded-md border px-3 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                  preset === p.id ? "border-accent bg-accent-soft" : "border-line-strong bg-canvas hover:bg-surface"
                }`}
              >
                <input type="radio" name="instagram-preset" value={p.id} checked={preset === p.id} onChange={() => choosePreset(p.id)} className="sr-only" />
                <span className={`text-sm font-medium ${preset === p.id ? "text-accent-ink" : "text-ink"}`}>{p.label}</span>
                <span className="text-xs tabular-nums text-muted">
                  {p.width} × {p.height} · {p.ratio}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="mt-3">
        <label
          className={`relative inline-flex min-h-10 cursor-pointer items-center rounded-md border px-3.5 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
            preset === "custom" ? "border-accent bg-accent-soft text-accent-ink" : "border-line-strong bg-canvas text-ink-soft hover:bg-surface"
          }`}
        >
          <input type="radio" name="instagram-preset" value="custom" checked={preset === "custom"} onChange={() => choosePreset("custom")} className="sr-only" />
          Custom size
        </label>
      </div>
    </fieldset>
  );

  if (!source) {
    return (
      <div className="space-y-6">
        <ToolWorkspace
          accept={RASTER_INPUT_FORMATS}
          source={null}
          loading={loading}
          error={error}
          onFile={onFile}
          onReset={reset}
          prompt="Drop your photo here"
          controls={null}
        />
        <div className="rounded-lg border border-line bg-canvas p-4 sm:p-5">
          {presetPicker(true)}
          <p className="mt-3 text-sm text-muted">
            You can choose the size now or after adding your photo, and change it at any time.
          </p>
        </div>
      </div>
    );
  }

  const rotated = cropState.dims;
  const differs = shapesDiffer(rotated.width, rotated.height, frame.width, frame.height);
  const fitLayout: FitLayout = {
    width: frame.width,
    height: frame.height,
    alignX: align,
    alignY: align,
    border,
  };
  const placement = fitPlacement(rotated.width, rotated.height, fitLayout);
  // Which axis has room to move the image along in fit mode.
  const spareAxis: "x" | "y" = rotated.width / rotated.height < frame.width / frame.height ? "x" : "y";
  const effectiveMode: Mode = differs || border > 0 ? mode : "crop";
  const fillColor = fill === "custom" ? customColor : fill === "blur" ? "#ffffff" : FILL_COLORS[fill];
  const lossy = FORMATS[output].lossy;
  const transparentNeedsFill = source.hasTransparency && !FORMATS[output].supportsTransparency;

  const transform =
    effectiveMode === "crop" ? cropState.transform : { rotate: cropState.rotation, flipH: cropState.flipH };
  const enlarges =
    effectiveMode === "crop"
      ? cropState.pixels.width < frame.width * 0.98
      : placement.width > rotated.width * 1.02;

  const settingsKey = JSON.stringify([
    source.id,
    frame,
    effectiveMode,
    effectiveMode === "crop" ? cropState.transform : [transform, placement, fill, fill === "custom" ? customColor : null],
    output,
    lossy ? quality : null,
  ]);
  const currentResult = result?.key === settingsKey ? result.image : null;

  const run = async (image: SourceImage) => {
    if (sizeError || !target) return;
    setError(null);
    try {
      const encoded = await runner.run({
        kind: "encode",
        sourceId: image.id,
        file: image.file,
        width: target.width,
        height: target.height,
        mime: output,
        quality: lossy ? quality : undefined,
        background: effectiveMode === "fit" ? fillColor : transparentNeedsFill ? "#ffffff" : null,
        transform,
        fit: effectiveMode === "fit" ? { placement, fill: fill === "blur" ? "blur" : "color" } : undefined,
      });
      if (!encoded) return;
      setResult({ key: settingsKey, image: { blob: encoded.blob, width: encoded.width, height: encoded.height, mime: output } });
      track("resize_completed", {
        tool: TOOL,
        input_format: FORMATS[image.mime].label,
        output_format: FORMATS[output].label,
        size_bucket: sizeBucket(image.size),
        preset,
        mode: effectiveMode,
      });
    } catch (caught) {
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool: TOOL, error_code: normalized.code });
    }
  };

  const fitPreview = (
    <Frame width={frame.width} height={frame.height} label={`Preview: your photo fitted inside ${frame.width} × ${frame.height}`}>
      {fill === "blur" ? (
        <img
          src={source.url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
          style={{ transform: cropState.flipH ? "scaleX(-1)" : undefined }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: fillColor }} />
      )}
      <img
        src={source.url}
        alt=""
        aria-hidden="true"
        className="absolute"
        style={{
          left: `${(placement.x / frame.width) * 100}%`,
          top: `${(placement.y / frame.height) * 100}%`,
          width: `${(placement.width / frame.width) * 100}%`,
          height: `${(placement.height / frame.height) * 100}%`,
          transform: cropState.flipH ? "scaleX(-1)" : undefined,
        }}
      />
      {showGuide ? <Guide preset={activePreset} width={frame.width} height={frame.height} /> : null}
    </Frame>
  );

  // On large screens the preview stays in view while the (longer) settings column scrolls.
  const preview = (
    <div className="lg:sticky lg:top-6 lg:self-start">
      {effectiveMode === "fit" ? (
        fitPreview
      ) : (
        <ImageCropper
          src={source.url}
          imageWidth={rotated.width}
          imageHeight={rotated.height}
          rotation={cropState.rotation}
          flipH={cropState.flipH}
          aspect={aspect}
          crop={cropState.crop}
          onChange={cropState.setCrop}
          label={`Crop area for ${activePreset ? activePreset.label.toLowerCase() : "your custom size"}`}
        />
      )}
    </div>
  );

  const controls = (
    <>
      {presetPicker(false)}

      {activePreset?.note ? <p className="text-sm leading-relaxed text-muted">{activePreset.note}</p> : null}

      {preset === "custom" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="ig-width">Width (px)</FieldLabel>
              <input id="ig-width" inputMode="numeric" autoComplete="off" value={customW} onChange={(e) => onCustomW(e.target.value)} aria-invalid={Boolean(sizeError)} aria-describedby={sizeError ? "ig-size-error" : undefined} className={`${inputClass} mt-1.5`} />
            </div>
            <div>
              <FieldLabel htmlFor="ig-height">Height (px)</FieldLabel>
              <input id="ig-height" inputMode="numeric" autoComplete="off" value={customH} onChange={(e) => onCustomH(e.target.value)} aria-invalid={Boolean(sizeError)} aria-describedby={sizeError ? "ig-size-error" : undefined} className={`${inputClass} mt-1.5`} />
            </div>
          </div>
          <Checkbox checked={lockRatio} onChange={setLockRatio} description="Changing one side updates the other to keep the current shape.">
            Lock aspect ratio
          </Checkbox>
        </div>
      ) : null}

      {sizeError ? (
        <p id="ig-size-error" className="text-sm font-medium text-danger">
          {sizeError}
        </p>
      ) : (
        <p className="text-sm text-muted">
          Output: <span className="font-medium text-ink">{formatDimensions(frame.width, frame.height)}</span>
          <span> (was {formatDimensions(source.width, source.height)})</span>
        </p>
      )}

      {differs || border > 0 ? (
        <Segmented<Mode>
          legend="When the shapes don't match"
          value={mode}
          onChange={setMode}
          options={[
            { value: "crop", label: "Crop to fill" },
            { value: "fit", label: "Fit whole photo" },
          ]}
          hint={mode === "crop" ? "Fills the frame; drag the box to choose what to keep." : "Keeps the entire photo and fills the space around it."}
        />
      ) : (
        <p className="text-sm text-muted">Your photo already has this shape, so nothing will be cropped.</p>
      )}

      {effectiveMode === "crop" ? (
        <div className="flex flex-wrap items-center gap-2">
          <OrientationControls onRotate={cropState.rotate} onFlip={cropState.flip} flipped={cropState.flipH} />
          <button
            type="button"
            onClick={() => cropState.setCrop(defaultCrop(aspect, rotated.width, rotated.height))}
            className={buttonClass("secondary", "min-h-10 px-3 text-sm")}
          >
            Centre crop
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <Segmented<Fill>
            legend="Background"
            value={fill}
            onChange={setFill}
            options={[
              { value: "white", label: "White" },
              { value: "black", label: "Black" },
              { value: "blur", label: "Blurred photo" },
              { value: "custom", label: "Colour" },
            ]}
          />
          {fill === "custom" ? (
            <div className="flex items-center gap-3">
              <input id={colorId} type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="h-11 w-14 cursor-pointer rounded-md border border-line-strong bg-canvas p-1" />
              <label htmlFor={colorId} className="text-sm text-ink">
                Background colour <span className="font-mono text-muted">{customColor.toUpperCase()}</span>
              </label>
            </div>
          ) : null}
          <div>
            <div className="flex items-baseline justify-between gap-4">
              <FieldLabel htmlFor={positionId}>{spareAxis === "x" ? "Horizontal position" : "Vertical position"}</FieldLabel>
              <span className="text-sm text-muted">{align === 0 ? (spareAxis === "x" ? "Left" : "Top") : align === 1 ? (spareAxis === "x" ? "Right" : "Bottom") : align === 0.5 ? "Centre" : `${Math.round(align * 100)}%`}</span>
            </div>
            <input
              id={positionId}
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(align * 100)}
              onChange={(e) => setAlign(Number(e.target.value) / 100)}
              className="mt-2 h-2 w-full cursor-pointer accent-[var(--color-accent)]"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-4">
              <FieldLabel htmlFor="ig-border">Border</FieldLabel>
              <span className="text-sm tabular-nums text-muted">{border === 0 ? "None" : `${Math.round(border * 100)}%`}</span>
            </div>
            <input id="ig-border" type="range" min={0} max={20} step={1} value={Math.round(border * 100)} onChange={(e) => setBorder(Number(e.target.value) / 100)} aria-valuetext={border === 0 ? "No border" : `${Math.round(border * 100)} percent`} className="mt-2 h-2 w-full cursor-pointer accent-[var(--color-accent)]" />
          </div>
        </div>
      )}

      {activePreset?.guide ? (
        <Checkbox checked={showGuide} onChange={setShowGuide} description="Shown on the previews only; it isn't added to your image.">
          {activePreset.guide === "story-safe" ? "Show Story safe-area guide" : "Show profile grid crop guide"}
        </Checkbox>
      ) : null}

      <Segmented<OutputMime>
        legend="Output format"
        value={output}
        onChange={setOutput}
        options={[
          { value: "image/jpeg", label: "JPG" },
          { value: "image/png", label: "PNG" },
          { value: "image/webp", label: "WebP", disabled: webpSupported === false },
        ]}
        hint={
          webpSupported === false
            ? "Your browser can't create WebP files."
            : output === "image/jpeg"
              ? "JPG is accepted everywhere, and Instagram re-compresses every upload anyway."
              : output === "image/png"
                ? "PNG is lossless, so files are larger. Instagram converts it when you post."
                : "WebP is small, but check that the app you post from accepts it."
        }
      />
      {lossy ? <QualitySlider value={quality} onChange={setQuality} min={0.5} hint="92% keeps detail for Instagram's own compression." /> : null}

      {enlarges && !sizeError ? (
        <Alert tone="info" title="Your photo will be enlarged">
          {effectiveMode === "crop"
            ? `The selected area is ${formatDimensions(cropState.pixels.width, cropState.pixels.height)}, smaller than the output, so it will look softer. Use a larger crop or a higher-resolution photo if you can.`
            : "Your photo is smaller than the frame, so it will be scaled up and may look softer."}
        </Alert>
      ) : null}
      {target && target.width > 1080 && !sizeError ? (
        <p className="text-sm text-muted">Instagram displays images up to 1080 px wide, so wider images are scaled down when posted.</p>
      ) : null}
      {transparentNeedsFill && effectiveMode === "crop" ? (
        <Alert tone="info" title="Transparent areas will become white">
          JPG has no transparency.
        </Alert>
      ) : null}

      <ActionButton onClick={() => run(source)} busy={runner.busy} busyLabel="Creating…" disabled={Boolean(sizeError)}>
        {currentResult ? "Create again" : "Create Instagram image"}
      </ActionButton>
    </>
  );

  const slug = activePreset ? `instagram-${activePreset.id}` : "instagram";
  return (
    <ToolWorkspace
      accept={RASTER_INPUT_FORMATS}
      source={source}
      loading={loading}
      error={error}
      onFile={onFile}
      onReset={reset}
      prompt="Drop your photo here"
      preview={preview}
      widePreview
      controls={controls}
      result={
        currentResult ? (
          <ResultPanel
            tool={TOOL}
            heading="Your Instagram image"
            original={source}
            output={currentResult}
            fileName={outputFileName(source.name, `${slug}-${currentResult.width}x${currentResult.height}`, FORMATS[currentResult.mime].extension)}
            downloadLabel={`Download ${FORMATS[currentResult.mime].label}`}
            comparison={
              <div className="grid gap-4 sm:grid-cols-2">
                <figure>
                  <ImagePreview src={source.url} alt={`Original photo, ${formatDimensions(source.width, source.height)}`} width={source.width} height={source.height} className="h-64 sm:h-80 md:h-[26rem]" />
                  <figcaption className="mt-2 text-sm text-muted">Original</figcaption>
                </figure>
                <figure>
                  <Frame width={currentResult.width} height={currentResult.height}>
                    {lastResultUrl ? (
                      <img src={lastResultUrl} alt={`Resized photo, ${formatDimensions(currentResult.width, currentResult.height)}`} className="absolute inset-0 h-full w-full" />
                    ) : null}
                    {showGuide ? <Guide preset={activePreset} width={currentResult.width} height={currentResult.height} /> : null}
                  </Frame>
                  <figcaption className="mt-2 text-sm text-muted">
                    Result{activePreset ? ` · ${activePreset.label}` : ""}
                  </figcaption>
                </figure>
              </div>
            }
            status={
              <Alert tone="success" title={`Created ${formatDimensions(currentResult.width, currentResult.height)}`}>
                {effectiveMode === "fit"
                  ? "Your whole photo is inside the frame. Check the preview, then download."
                  : "Cropped to fill the frame. Check the preview, then download."}{" "}
                Location and camera details are not copied to the new file.
              </Alert>
            }
          />
        ) : null
      }
    />
  );
}
