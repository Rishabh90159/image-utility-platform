/**
 * Privacy-conscious analytics.
 *
 * Only a fixed set of event names and property keys can be sent, and every
 * value is a short, coarse string or number. File names, exact file sizes,
 * image contents and personal data are never collected: the type system and
 * the runtime allowlist below both enforce it.
 *
 * No provider is loaded unless NEXT_PUBLIC_PLAUSIBLE_DOMAIN is configured.
 */
export type AnalyticsEvent =
  | "tool_open"
  | "image_uploaded"
  | "resize_completed"
  | "compression_completed"
  | "conversion_completed"
  | "download_clicked"
  | "processing_failed"
  | "heic_conversion_completed"
  | "svg_conversion_completed"
  | "png_svg_conversion_completed"
  | "crop_completed"
  | "passport_photo_completed"
  | "signature_resize_completed"
  | "bulk_resize_completed"
  | "bulk_download_completed";

export interface AnalyticsProps {
  tool?: string;
  input_format?: string;
  output_format?: string;
  /** Coarse bucket such as "100KB-1MB", never an exact size. */
  size_bucket?: string;
  /** Preset target in KB (target-size tool only). */
  target_kb?: number;
  outcome?: string;
  mode?: string;
  error_code?: string;
  /** Coarse bucket for batch sizes such as "2-10", never an exact list of files. */
  count_bucket?: string;
  /** Preset identifier (e.g. an aspect ratio or a photo requirement id). */
  preset?: string;
}

const ALLOWED_KEYS: ReadonlyArray<keyof AnalyticsProps> = [
  "tool",
  "input_format",
  "output_format",
  "size_bucket",
  "target_kb",
  "outcome",
  "mode",
  "error_code",
  "count_bucket",
  "preset",
];

type PlausibleFn = (event: string, options?: { props?: Record<string, string | number> }) => void;

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

export function track(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
  if (typeof window === "undefined") return;
  const safe: Record<string, string | number> = {};
  for (const key of ALLOWED_KEYS) {
    const value = props[key];
    if (typeof value === "number" && Number.isFinite(value)) safe[key] = value;
    else if (typeof value === "string" && value.length > 0) safe[key] = value.slice(0, 40);
  }
  try {
    window.plausible?.(event, { props: safe });
  } catch {
    // Analytics must never break a tool.
  }
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event, safe);
  }
}
