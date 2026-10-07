/**
 * Data model for official photo and signature requirements.
 *
 * Rules for editing requirement data (see also lib/requirements/README.md):
 * - Copy numbers only from the issuing body's own notification, bulletin or
 *   website. Never from blogs, coaching sites or photo-service sites.
 * - Leave a field undefined when the source doesn't state it. Never infer
 *   pixel sizes from centimetres, or file sizes from other exams.
 * - `rules` are quoted or closely paraphrased from the source.
 * - Update `source.lastVerified` only after actually re-reading the source,
 *   and update the tool's `updated` date in the registry at the same time.
 */
export interface RequirementSource {
  /** Title of the official document or page. */
  title: string;
  url: string;
  /** Issuing body, e.g. "Institute of Banking Personnel Selection (IBPS)". */
  publisher: string;
  /** Where in the document the requirement appears, e.g. "Annexure III". */
  section?: string;
  /** ISO date the source was last read and checked against this data. */
  lastVerified: string;
}

export type ImageKind = "photo" | "signature";

export interface ImageSpec {
  kind: ImageKind;
  /** File formats the source accepts, as written there (e.g. "JPG/JPEG"). Omitted when the source doesn't say. */
  format?: string;
  /** Pixel dimensions, only when the source states them. */
  widthPx?: number;
  heightPx?: number;
  /**
   * How the pixel size relates to the source: stated exactly, stated as "preferred",
   * stated as a minimum (the tool produces that minimum), or derived by the tool
   * from a physical print size at `dpi`.
   */
  pixelBasis?: "stated" | "preferred" | "minimum" | "derived";
  /** Physical size as written in the source, for display only (e.g. "4.5 cm × 3.5 cm"). */
  physical?: string;
  /** Crop shape (width / height). Derived from the stated pixel or physical size; omitted when the source gives neither. */
  aspect?: number;
  /** Print resolution for physical-size presets (chosen by the tool, not the source). */
  dpi?: number;
  minKB?: number;
  maxKB?: number;
  /** Requirements as stated in the source. */
  rules: string[];
}

export interface RequirementSet {
  /** Stable id, used in analytics and the preset picker. */
  id: string;
  /** Grouping shown in the first picker, e.g. a country for passports. Optional. */
  group?: string;
  /** Exam, notification or document this applies to. */
  name: string;
  photo?: ImageSpec;
  signature?: ImageSpec;
  /** When the application captures the photo live instead of accepting an upload. */
  livePhotoCapture?: { rules: string[] };
  /** Other facts from the source worth knowing (plain sentences). */
  notes?: string[];
  source: RequirementSource;
}

export interface ApplicationRequirements {
  /** Short name, e.g. "IBPS". */
  name: string;
  /** Full name of the organisation or exam. */
  fullName: string;
  /** Verified requirement sets; may be empty when nothing could be verified. */
  sets: RequirementSet[];
  /** Shown when there is no verified set, explaining why and where to check. */
  unverified?: { reason: string; whereToCheck: { label: string; url: string }[]; checkedOn: string };
}

/** Most recent verification date across all sets (for page freshness and sitemap). */
export function latestVerification(sets: RequirementSet[]): string | null {
  return sets.reduce<string | null>((latest, set) => (!latest || set.source.lastVerified > latest ? set.source.lastVerified : latest), null);
}

export function formatKbRange(spec: Pick<ImageSpec, "minKB" | "maxKB">): string | null {
  const fmt = (kb: number) => (kb >= 1024 ? `${+(kb / 1024).toFixed(2)} MB` : `${kb} KB`);
  if (spec.minKB && spec.maxKB) return `${fmt(spec.minKB)} – ${fmt(spec.maxKB)}`;
  if (spec.maxKB) return `up to ${fmt(spec.maxKB)}`;
  if (spec.minKB) return `at least ${fmt(spec.minKB)}`;
  return null;
}

export function formatVerifiedDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
