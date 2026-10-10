/**
 * Instagram output sizes. Used by the Instagram Image Resizer tool and by the
 * size table on its page, so the two never disagree.
 *
 * These are widely used recommended sizes, not a promise of how Instagram will
 * process a file: Instagram re-compresses uploads and its rules vary by
 * format and publishing method. Notes say so where it matters.
 */
export type InstagramPresetId = "square" | "portrait" | "tall" | "landscape" | "story" | "reel-cover";

export interface InstagramPreset {
  id: InstagramPresetId;
  group: "feed" | "vertical";
  label: string;
  width: number;
  height: number;
  ratio: string;
  /** Short line shown under the preset button. */
  use: string;
  /** Caveat shown when the preset is selected. */
  note?: string;
  /** Overlay drawn on the preview to show which area is most at risk of being covered or cropped. */
  guide?: "story-safe" | "grid-3x4";
}

export const INSTAGRAM_PRESETS: InstagramPreset[] = [
  {
    id: "square",
    group: "feed",
    label: "Square post",
    width: 1080,
    height: 1080,
    ratio: "1:1",
    use: "Classic feed post; looks the same everywhere.",
  },
  {
    id: "portrait",
    group: "feed",
    label: "Portrait post",
    width: 1080,
    height: 1350,
    ratio: "4:5",
    use: "Takes up the most screen space in the feed.",
  },
  {
    id: "tall",
    group: "feed",
    label: "Tall portrait post",
    width: 1080,
    height: 1440,
    ratio: "3:4",
    use: "Matches the taller profile grid preview.",
    note: "3:4 posts are newer than the 4:5 maximum Instagram long used. Whether a 3:4 image is kept as-is or trimmed to 4:5 can depend on the app version and how you publish (app, desktop or a scheduling tool). Use Portrait (4:5) if you need the safest choice.",
  },
  {
    id: "landscape",
    group: "feed",
    label: "Landscape post",
    width: 1080,
    height: 566,
    ratio: "1.91:1",
    use: "Widest shape the feed shows without cropping.",
  },
  {
    id: "story",
    group: "vertical",
    label: "Story",
    width: 1080,
    height: 1920,
    ratio: "9:16",
    use: "Full-screen Stories.",
    note: "The profile name at the top and the reply bar at the bottom cover part of a Story. Keep text and faces away from the top and bottom edges; the guide shows a commonly used safe area.",
    guide: "story-safe",
  },
  {
    id: "reel-cover",
    group: "vertical",
    label: "Reel cover",
    width: 1080,
    height: 1920,
    ratio: "9:16",
    use: "Cover image or vertical image for Reels.",
    note: "The Reel itself plays at 9:16, but your profile grid shows a cropped part of the cover. The guide marks the centre 3:4 area the grid currently shows; Instagram has changed this crop before.",
    guide: "grid-3x4",
  },
];

export function getInstagramPreset(id: InstagramPresetId): InstagramPreset {
  return INSTAGRAM_PRESETS.find((preset) => preset.id === id)!;
}

/**
 * Story safe area: the commonly recommended margin of about 250 px at the top
 * and bottom of a 1080 × 1920 frame, which keeps content clear of Instagram's
 * interface. Guidance, not an official specification.
 */
export const STORY_SAFE_AREA = { top: 250 / 1920, bottom: 250 / 1920 } as const;
