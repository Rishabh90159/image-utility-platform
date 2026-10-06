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
  | "png-to-jpg"
  | "heic-to-jpg"
  | "svg-to-png"
  | "png-to-svg"
  | "image-cropper"
  | "passport-photo-resizer"
  | "signature-resizer"
  | "bulk-image-resizer";

export type ToolCategory = "resize" | "compress" | "convert" | "edit";

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
  /** Shown in the desktop header navigation (the mobile menu and footer list every tool). */
  inHeader?: boolean;
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
    related: ["bulk-image-resizer", "resize-image-to-kb", "image-cropper", "image-compressor"],
    inHeader: true,
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
    inHeader: true,
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
    related: ["image-compressor", "image-resizer", "passport-photo-resizer", "signature-resizer"],
    inHeader: true,
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
    related: ["png-to-jpg", "heic-to-jpg", "image-resizer", "image-compressor"],
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
  "heic-to-jpg": {
    id: "heic-to-jpg",
    path: "/tools/heic-to-jpg",
    name: "HEIC to JPG Converter",
    navLabel: "HEIC to JPG",
    summary: "Convert iPhone HEIC and HEIF photos to JPG that opens everywhere, right in your browser.",
    linkText: "Convert HEIC photos to JPG",
    category: "convert",
    related: ["image-compressor", "image-resizer", "jpg-to-png"],
    inHeader: true,
    updated: "2026-10-06",
  },
  "svg-to-png": {
    id: "svg-to-png",
    path: "/tools/svg-to-png",
    name: "SVG to PNG Converter",
    navLabel: "SVG to PNG",
    summary: "Turn SVG graphics into PNG images at any pixel size, with a transparent or solid background.",
    linkText: "Convert SVG to PNG at any size",
    category: "convert",
    related: ["png-to-svg", "image-resizer", "image-compressor"],
    updated: "2026-10-06",
  },
  "png-to-svg": {
    id: "png-to-svg",
    path: "/tools/png-to-svg",
    name: "PNG to SVG Converter",
    navLabel: "PNG to SVG",
    summary: "Trace logos, icons and simple graphics into real vector SVG paths.",
    linkText: "Vectorize a PNG into SVG",
    category: "convert",
    related: ["svg-to-png", "image-cropper", "image-compressor"],
    updated: "2026-10-06",
  },
  "image-cropper": {
    id: "image-cropper",
    path: "/tools/image-cropper",
    name: "Image Cropper",
    navLabel: "Crop",
    summary: "Crop photos freely or to 1:1, 4:3, 16:9, 3:2 or a custom ratio, with zoom and rotation.",
    linkText: "Crop an image to any aspect ratio",
    category: "edit",
    related: ["image-resizer", "image-compressor", "passport-photo-resizer", "signature-resizer"],
    inHeader: true,
    updated: "2026-10-06",
  },
  "passport-photo-resizer": {
    id: "passport-photo-resizer",
    path: "/tools/passport-photo-resizer",
    name: "Passport Photo Resizer",
    navLabel: "Passport photo",
    summary: "Crop and resize a photo to a passport or application size in pixels, millimetres and KB.",
    linkText: "Resize a photo for a passport or visa application",
    category: "edit",
    related: ["image-cropper", "resize-image-to-kb", "image-compressor"],
    updated: "2026-10-06",
  },
  "signature-resizer": {
    id: "signature-resizer",
    path: "/tools/signature-resizer",
    name: "Signature Resizer",
    navLabel: "Signature",
    summary: "Crop, clean up and resize a signature image to the pixel and KB limits of online forms.",
    linkText: "Resize a signature for an online form",
    category: "edit",
    related: ["image-cropper", "resize-image-to-kb", "image-compressor"],
    updated: "2026-10-06",
  },
  "bulk-image-resizer": {
    id: "bulk-image-resizer",
    path: "/tools/bulk-image-resizer",
    name: "Bulk Image Resizer",
    navLabel: "Bulk resize",
    summary: "Resize many images at once and download them individually or together as a ZIP.",
    linkText: "Resize multiple images at once",
    category: "resize",
    related: ["image-resizer", "image-compressor", "resize-image-to-kb"],
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
  "bulk-image-resizer",
  "image-cropper",
  "passport-photo-resizer",
  "signature-resizer",
  "heic-to-jpg",
  "svg-to-png",
  "png-to-svg",
];

export const headerTools: ToolDefinition[] = toolOrder.map((id) => tools[id]).filter((tool) => tool.inHeader);

export const allTools: ToolDefinition[] = toolOrder.map((id) => tools[id]);

export function getTool(id: ToolId): ToolDefinition {
  return tools[id];
}
