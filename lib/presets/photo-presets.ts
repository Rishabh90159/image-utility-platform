/**
 * Official photo requirement presets for the passport photo resizer.
 *
 * Rules for adding a preset:
 * - Use the issuing authority's own website as the source, never a blog or
 *   photo-service site.
 * - Copy only numbers the source states; leave a field empty rather than guess.
 * - Record the URL and the date it was checked. Re-check before changing it.
 *
 * Each preset describes one document/application, because requirements differ
 * between countries, between printed and digital photos, and between
 * applications in the same country.
 */
export interface PhotoPreset {
  id: string;
  country: string;
  /** Document and photo type, e.g. "Passport – printed photo". */
  document: string;
  kind: "print" | "digital";
  /** Output size in pixels produced by the tool. */
  widthPx: number;
  heightPx: number;
  /** Physical print size, when the source specifies one. */
  widthMm?: number;
  heightMm?: number;
  /** Print resolution recorded in the JPG (print presets only; chosen by us, not by the authority). */
  dpi?: number;
  minKB?: number;
  maxKB?: number;
  /** Requirements quoted from the source, shown as a checklist. */
  requirements: string[];
  /** How the tool chose its output size when the source gives a range or minimum. */
  sizeNote?: string;
  source: { name: string; url: string };
  /** ISO date the source was last checked. */
  lastVerified: string;
}

/** Resolution used to turn a physical print size into pixels. 300 DPI is the usual standard for photo printing. */
export const PRINT_DPI = 300;

export function mmToPx(mm: number, dpi: number = PRINT_DPI): number {
  return Math.round((mm / 25.4) * dpi);
}

export const PHOTO_PRESETS: PhotoPreset[] = [
  {
    id: "uk-passport-digital",
    country: "United Kingdom",
    document: "Passport – digital photo (online application)",
    kind: "digital",
    widthPx: 600,
    heightPx: 750,
    minKB: 50,
    maxKB: 10 * 1024,
    requirements: [
      "At least 600 pixels wide and 750 pixels tall",
      "At least 50KB and no more than 10MB",
      "In colour and unaltered by computer software (this tool only crops and resizes; it doesn't retouch)",
    ],
    sizeNote: "GOV.UK gives a minimum size. The tool produces exactly 600 × 750 px, the minimum it accepts.",
    source: { name: "GOV.UK – Photos for passports", url: "https://www.gov.uk/photos-for-passports" },
    lastVerified: "2026-10-06",
  },
  {
    id: "uk-passport-print",
    country: "United Kingdom",
    document: "Passport – printed photo",
    kind: "print",
    widthMm: 35,
    heightMm: 45,
    widthPx: mmToPx(35),
    heightPx: mmToPx(45),
    dpi: PRINT_DPI,
    requirements: [
      "45mm high by 35mm wide",
      "Taken against a plain cream or light grey background",
      "In clear contrast to the background",
    ],
    sizeNote: `Pixel size is 35 × 45 mm at ${PRINT_DPI} DPI. Print at 100% scale (no "fit to page").`,
    source: { name: "GOV.UK – Photo requirements", url: "https://www.gov.uk/photos-for-passports/photo-requirements" },
    lastVerified: "2026-10-06",
  },
  {
    id: "canada-passport-digital",
    country: "Canada",
    document: "Passport – digital photo (online application)",
    kind: "digital",
    widthPx: 1200,
    heightPx: 1800,
    minKB: 200,
    maxKB: 5 * 1024,
    requirements: [
      "JPG (.jpeg or .jpg) format",
      "3:2 aspect ratio, portrait orientation",
      "At least 1,800 pixels high by 1,200 pixels wide; no larger than 4,500 × 3,000",
      "Between 200 KB and 5 MB",
      "Chin-to-crown height between 45% and 50% of the photo's height",
    ],
    sizeNote: "The tool produces 1,200 × 1,800 px, the smallest size accepted.",
    source: {
      name: "Government of Canada – Passport photos",
      url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/photos.html",
    },
    lastVerified: "2026-10-06",
  },
  {
    id: "canada-passport-print",
    country: "Canada",
    document: "Passport – printed photo",
    kind: "print",
    widthMm: 50,
    heightMm: 70,
    widthPx: mmToPx(50),
    heightPx: mmToPx(70),
    dpi: PRINT_DPI,
    requirements: [
      "50 mm wide by 70 mm high (2 inches wide by 2¾ inches high)",
      "Face height from chin to crown between 31 mm and 36 mm",
    ],
    sizeNote: `Pixel size is 50 × 70 mm at ${PRINT_DPI} DPI. Print at 100% scale (no "fit to page").`,
    source: {
      name: "Government of Canada – Passport photos",
      url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/photos.html",
    },
    lastVerified: "2026-10-06",
  },
];

export function getPreset(id: string): PhotoPreset | undefined {
  return PHOTO_PRESETS.find((preset) => preset.id === id);
}
