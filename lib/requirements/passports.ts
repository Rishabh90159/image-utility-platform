import { PHOTO_PRESETS, type PhotoPreset } from "@/lib/presets/photo-presets";
import type { RequirementSet } from "./types";

/**
 * Passport photo requirements for the passport hub, built from the same preset
 * data the Passport Photo Resizer uses, so each requirement is defined once.
 */
export function presetToRequirement(preset: PhotoPreset): RequirementSet {
  return {
    id: preset.id,
    group: preset.country,
    name: preset.document,
    photo: {
      kind: "photo",
      format: preset.format,
      widthPx: preset.widthPx,
      heightPx: preset.heightPx,
      pixelBasis: preset.kind === "print" ? "derived" : "minimum",
      physical: preset.widthMm && preset.heightMm ? `${preset.widthMm} mm × ${preset.heightMm} mm (width × height)` : undefined,
      aspect: preset.widthPx / preset.heightPx,
      dpi: preset.dpi,
      minKB: preset.minKB,
      maxKB: preset.maxKB,
      rules: preset.requirements,
    },
    notes: [preset.notNeededWhen, preset.sizeNote].filter((note): note is string => Boolean(note)),
    source: {
      title: preset.source.name,
      url: preset.source.url,
      publisher: `Government of ${preset.country === "United Kingdom" ? "the United Kingdom" : preset.country}`,
      lastVerified: preset.lastVerified,
    },
  };
}

export const PASSPORT_REQUIREMENTS: RequirementSet[] = PHOTO_PRESETS.map(presetToRequirement);

/**
 * Countries people often ask about whose official pages we could not verify.
 * They get a link to the official source instead of numbers.
 */
export const PASSPORT_NOT_VERIFIED: { country: string; reason: string; url: string; label: string; checkedOn: string }[] = [
  {
    country: "United States",
    reason: "The U.S. Department of State website didn't allow our automated check, so we haven't added its numbers.",
    url: "https://travel.state.gov/content/travel/en/passports/how-apply/photos.html",
    label: "travel.state.gov – Passport photos",
    checkedOn: "2026-10-07",
  },
  {
    country: "Australia",
    reason: "The Australian Passport Office website couldn't be reached during our check, so we haven't added its numbers.",
    url: "https://www.passports.gov.au/getting-passport-how-it-works/photo-guidelines",
    label: "passports.gov.au – Photo guidelines",
    checkedOn: "2026-10-07",
  },
];
