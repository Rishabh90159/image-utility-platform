/**
 * Target file size search.
 *
 * Finds the best-looking encode whose size is at or below `targetBytes`.
 * Priorities, in order:
 *   1. Stay at or below the target.
 *   2. Keep full dimensions if a reasonable quality can reach the target.
 *   3. Otherwise reduce dimensions while keeping quality good, rather than
 *      crushing quality at full size (small sharp images look better than
 *      large blocky ones).
 *   4. If nothing fits, return the smallest result and say so honestly.
 *
 * The encoder is injected so this logic is pure and unit-testable.
 */
export interface EncodedImage {
  blob: Blob;
  width: number;
  height: number;
}

export interface EncodeAttempt extends EncodedImage {
  scale: number;
  quality: number;
}

export type ScaledEncoder = (scale: number, quality: number) => Promise<EncodedImage>;

export type TargetOutcome =
  /** At or below target. */
  | "met"
  /** Couldn't reach the target without reducing dimensions, and resizing was not allowed. */
  | "needs-resize"
  /** Even the smallest allowed dimensions at the lowest quality are larger than the target. */
  | "too-small";

export interface TargetSearchResult {
  attempt: EncodeAttempt;
  outcome: TargetOutcome;
  attempts: number;
}

export interface TargetSearchOptions {
  targetBytes: number;
  allowResize: boolean;
  /** Smallest scale the search may use (e.g. long side >= 32 px). */
  minScale: number;
  /** Largest scale allowed (below 1 only when the browser can't hold full size). */
  maxScale?: number;
  /** Highest quality the search may use (0–1). Lower it to trade detail for an even smaller file. */
  maxQuality?: number;
  onProgress?: (fraction: number) => void;
}

export const QUALITY = {
  /** Above this, file size grows quickly for almost no visible gain. */
  max: 0.92,
  /** Quality used while searching for dimensions. */
  good: 0.78,
  /** Lowest quality tried at full size before reducing dimensions instead. */
  fullSizeFloor: 0.55,
  /** Absolute lowest quality ever used. */
  min: 0.1,
} as const;

const EXPECTED_ATTEMPTS = 22;

export async function searchTargetSize(encode: ScaledEncoder, options: TargetSearchOptions): Promise<TargetSearchResult> {
  const { targetBytes, allowResize, onProgress } = options;
  const maxScale = options.maxScale ?? 1;
  const qMax = Math.min(QUALITY.max, Math.max(QUALITY.min, options.maxQuality ?? QUALITY.max));
  const qGood = Math.min(QUALITY.good, qMax);
  const minScale = Math.min(options.minScale, maxScale);

  let attempts = 0;
  let smallest: EncodeAttempt | null = null;

  const tryEncode = async (scale: number, quality: number): Promise<EncodeAttempt> => {
    const encoded = await encode(scale, quality);
    attempts++;
    onProgress?.(Math.min(0.97, attempts / EXPECTED_ATTEMPTS));
    const attempt: EncodeAttempt = { ...encoded, scale, quality };
    if (!smallest || attempt.blob.size < smallest.blob.size) smallest = attempt;
    return attempt;
  };
  const fits = (attempt: EncodeAttempt) => attempt.blob.size <= targetBytes;
  const finish = (attempt: EncodeAttempt, outcome: TargetOutcome): TargetSearchResult => {
    onProgress?.(1);
    return { attempt, outcome, attempts };
  };

  /** Highest quality in (fitting.quality, hi] that still fits, at a fixed scale. */
  const maximizeQuality = async (fitting: EncodeAttempt, hi: number, iterations: number) => {
    let best = fitting;
    let lo = fitting.quality;
    for (let i = 0; i < iterations && hi - lo > 0.01; i++) {
      const mid = (lo + hi) / 2;
      const attempt = await tryEncode(fitting.scale, mid);
      if (fits(attempt)) {
        best = attempt;
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return best;
  };

  // 1. Full size at high quality.
  const top = await tryEncode(maxScale, qMax);
  if (fits(top)) return finish(top, "met");

  // 2. Full size, lower quality.
  const floor = Math.min(allowResize ? QUALITY.fullSizeFloor : QUALITY.min, qMax);
  const atFloor = await tryEncode(maxScale, floor);
  if (fits(atFloor)) return finish(await maximizeQuality(atFloor, qMax, 6), "met");
  if (!allowResize) return finish(smallest!, "needs-resize");
  if (maxScale <= minScale) return finish(smallest!, "too-small");

  // 3. Reduce dimensions at good quality. File size scales roughly with pixel
  //    count, so start from that estimate and refine by geometric bisection.
  let lo = minScale;
  let hi = maxScale;
  let bestFit: EncodeAttempt | null = null;
  const estimate = maxScale * Math.sqrt(targetBytes / atFloor.blob.size) * 0.9;
  for (let i = 0; i < 9 && hi / lo > 1.015; i++) {
    const mid = i === 0 ? clamp(estimate, lo * 1.001, hi * 0.999) : Math.sqrt(lo * hi);
    const attempt = await tryEncode(mid, qGood);
    if (fits(attempt)) {
      bestFit = attempt;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  if (!bestFit) {
    const atMin = await tryEncode(minScale, qGood);
    if (fits(atMin)) bestFit = atMin;
  }
  if (bestFit) return finish(await maximizeQuality(bestFit, qMax, 4), "met");

  // 4. Smallest allowed dimensions: lower the quality as a last resort.
  const lowest = await tryEncode(minScale, QUALITY.min);
  if (fits(lowest)) return finish(await maximizeQuality(lowest, qGood, 6), "met");
  return finish(smallest!, "too-small");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
