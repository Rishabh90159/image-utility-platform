"use client";

import type { BackgroundCleanup, EncodeResult, ImageTransform, Job, ResultFor, TargetResult } from "@/lib/image-processing/types";
import { KB } from "@/lib/utils/format";
import type { SourceImage } from "./hooks";

/**
 * Produces a JPG that meets an output specification (exact pixels and/or a
 * file size range) using the shared pipeline. Shared by the passport photo
 * resizer, the passport hub and the exam/application photo pages.
 */
export interface OutputSpec {
  /** Exact output size. When omitted, the cropped area keeps its own size. */
  widthPx?: number;
  heightPx?: number;
  minKB?: number;
  maxKB?: number;
  /** Print resolution written into the JPG. */
  dpi?: number;
}

export interface SpecResult {
  blob: Blob;
  width: number;
  height: number;
  /** A maximum file size was set but couldn't be reached. */
  overMax: boolean;
  /** A minimum file size was set but even maximum quality is below it. */
  underMin: boolean;
}

type Run = <J extends Job>(job: J) => Promise<ResultFor<J> | null>;

const DEFAULT_QUALITY = 0.92;

export async function runSpec(
  run: Run,
  image: SourceImage,
  spec: OutputSpec,
  transform: ImageTransform,
  cleanup?: BackgroundCleanup,
): Promise<SpecResult | null> {
  const exact = spec.widthPx && spec.heightPx ? { width: spec.widthPx, height: spec.heightPx } : null;
  const crop = transform.crop;
  // Without an exact size, the output keeps the crop's own pixel size.
  const natural = exact ?? { width: crop?.width ?? image.width, height: crop?.height ?? image.height };
  const base = { sourceId: image.id, file: image.file, transform, cleanup, dpi: spec.dpi };

  let out: { blob: Blob; width: number; height: number };
  let overMax = false;
  if (spec.maxKB) {
    const found: TargetResult | null = await run({
      ...base,
      kind: "target",
      sourceMime: image.mime,
      targetBytes: Math.floor(spec.maxKB * KB),
      mime: "image/jpeg",
      // Exact pixel sizes must never change; otherwise shrinking is the better way to fit a small limit.
      allowResize: !exact,
      background: "#ffffff",
      width: exact?.width,
      height: exact?.height,
    });
    if (!found) return null;
    out = found;
    overMax = found.outcome !== "met";
  } else {
    const encoded: EncodeResult | null = await run({
      ...base,
      kind: "encode",
      width: natural.width,
      height: natural.height,
      mime: "image/jpeg",
      quality: DEFAULT_QUALITY,
      background: "#ffffff",
    });
    if (!encoded) return null;
    out = encoded;
  }

  // Some forms also set a minimum size. Maximum quality at the same dimensions is the honest way to reach it.
  if (spec.minKB && out.blob.size < spec.minKB * KB) {
    const best = await run({
      ...base,
      kind: "encode",
      width: out.width,
      height: out.height,
      mime: "image/jpeg",
      quality: 1,
      background: "#ffffff",
    });
    if (!best) return null;
    if (best.blob.size > out.blob.size && (!spec.maxKB || best.blob.size <= spec.maxKB * KB)) {
      out = { blob: best.blob, width: best.width, height: best.height };
    }
  }

  return {
    blob: out.blob,
    width: out.width,
    height: out.height,
    overMax,
    underMin: Boolean(spec.minKB && out.blob.size < spec.minKB * KB),
  };
}

/** Enlargement steps tried by `growToMinimum`, smallest first. */
const GROW_STEPS = [1.25, 1.5, 2, 2.5, 3, 4, 5];

/**
 * When a source only *prefers* a pixel size and a file at that size can't reach
 * the minimum KB (very clean images compress too well), try progressively
 * larger sizes with the same shape until the minimum is met. Only used when
 * the user asks for it, because it changes the dimensions.
 */
export async function growToMinimum(
  run: Run,
  image: SourceImage,
  spec: OutputSpec,
  transform: ImageTransform,
  cleanup?: BackgroundCleanup,
): Promise<{ result: SpecResult; spec: OutputSpec } | null> {
  if (!spec.widthPx || !spec.heightPx || !spec.minKB) return null;
  let last: { result: SpecResult; spec: OutputSpec } | null = null;
  for (const step of GROW_STEPS) {
    const grown: OutputSpec = { ...spec, widthPx: Math.round(spec.widthPx * step), heightPx: Math.round(spec.heightPx * step) };
    const result = await runSpec(run, image, grown, transform, cleanup);
    if (!result) return null;
    last = { result, spec: grown };
    if (!result.underMin) break;
  }
  return last;
}
