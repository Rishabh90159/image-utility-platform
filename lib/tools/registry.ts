/**
 * Registry of every tool on the site. Navigation, homepage cards, related-tool
 * links and the sitemap are all generated from this list, so adding a tool in a
 * later phase means adding one entry here plus its page.
 */
export type ToolId =
  | "image-resizer"
  | "image-compressor"
  | "resize-image-to-kb"
  | "jpg-to-png"
  | "png-to-jpg";

export type ToolCategory = "resize" | "compress" | "convert";

export interface ToolDefinition {
  id: ToolId;
  path: `/tools/${string}`;
  /** Product name, used in navigation, cards and breadcrumbs. */
  name: string;
  /** Short label for compact navigation. */
  navLabel: string;
  /** One-sentence card description. */
  summary: string;
  /** Descriptive anchor text used when other pages link to this tool. */
  linkText: string;
  category: ToolCategory;
  related: ToolId[];
  /** ISO date of the last meaningful content or feature change. */
  updated: string;
}

export const tools: Record<ToolId, ToolDefinition> = {
  "image-resizer": {
    id: "image-resizer",
    path: "/tools/image-resizer",
    name: "Image Resizer",
    navLabel: "Resize",
    summary: "Change width and height in pixels or by percentage, with aspect ratio locked by default.",
    linkText: "Resize an image to new dimensions",
    category: "resize",
    related: ["resize-image-to-kb", "image-compressor", "png-to-jpg"],
    updated: "2026-10-06",
  },
  "image-compressor": {
    id: "image-compressor",
    path: "/tools/image-compressor",
    name: "Image Compressor",
    navLabel: "Compress",
    summary: "Reduce the file size of JPG, PNG and WebP images while keeping their dimensions.",
    linkText: "Compress an image",
    category: "compress",
    related: ["resize-image-to-kb", "image-resizer", "png-to-jpg"],
    updated: "2026-10-06",
  },
  "resize-image-to-kb": {
    id: "resize-image-to-kb",
    path: "/tools/resize-image-to-kb",
    name: "Resize Image to Exact KB",
    navLabel: "Resize to KB",
    summary: "Hit a file size limit such as 20 KB, 50 KB, 100 KB or 200 KB for forms and uploads.",
    linkText: "Resize an image to 50KB, 100KB or any size",
    category: "resize",
    related: ["image-compressor", "image-resizer", "png-to-jpg"],
    updated: "2026-10-06",
  },
  "jpg-to-png": {
    id: "jpg-to-png",
    path: "/tools/jpg-to-png",
    name: "JPG to PNG Converter",
    navLabel: "JPG to PNG",
    summary: "Convert JPG and JPEG photos to PNG without adding further compression loss.",
    linkText: "Convert JPG to PNG",
    category: "convert",
    related: ["png-to-jpg", "image-resizer", "image-compressor"],
    updated: "2026-10-06",
  },
  "png-to-jpg": {
    id: "png-to-jpg",
    path: "/tools/png-to-jpg",
    name: "PNG to JPG Converter",
    navLabel: "PNG to JPG",
    summary: "Turn PNG images into smaller JPG files, with a background of your choice for transparency.",
    linkText: "Convert PNG to JPG",
    category: "convert",
    related: ["jpg-to-png", "image-compressor", "resize-image-to-kb"],
    updated: "2026-10-06",
  },
};

/** Display order used across the site. */
export const toolOrder: ToolId[] = [
  "image-resizer",
  "image-compressor",
  "resize-image-to-kb",
  "jpg-to-png",
  "png-to-jpg",
];

export const allTools: ToolDefinition[] = toolOrder.map((id) => tools[id]);

export function getTool(id: ToolId): ToolDefinition {
  return tools[id];
}
