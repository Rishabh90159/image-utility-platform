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
  | "webp-to-jpg"
  | "heic-to-jpg"
  | "svg-to-png"
  | "png-to-svg"
  | "image-cropper"
  | "passport-photo-resizer"
  | "signature-resizer"
  | "bulk-image-resizer"
  | "20kb-photo"
  | "50kb-photo"
  | "100kb-photo"
  | "200kb-photo"
  | "ssc-photo"
  | "upsc-photo"
  | "ibps-photo"
  | "sbi-photo"
  | "neet-photo"
  | "passport-photo";

export type ToolCategory = "resize" | "compress" | "convert" | "edit" | "size" | "application";

/** Navigation groups: general image tools, file-size pages, and exam/passport photo pages. */
export type NavGroup = "image" | "size" | "application";

export function navGroupOf(tool: ToolDefinition): NavGroup {
  return tool.category === "size" ? "size" : tool.category === "application" ? "application" : "image";
}

/** Hub page for the exam, recruitment and passport photo pages. */
export const APPLICATION_HUB = { name: "Exam & passport photos", path: "/tools/application-photos" } as const;

/**
 * Breadcrumb trail for a tool page. Size pages sit under the general "resize
 * image to KB" tool, which owns the broad file-size intent; application pages
 * sit under their comparison hub. Other tools sit directly under /tools.
 */
export function breadcrumbTrail(tool: ToolDefinition): { name: string; path: string }[] {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Tools", path: "/tools" },
  ];
  if (tool.category === "size") trail.push({ name: tools["resize-image-to-kb"].name, path: tools["resize-image-to-kb"].path });
  if (tool.category === "application") trail.push({ ...APPLICATION_HUB });
  return [...trail, { name: tool.name, path: tool.path }];
}

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
    related: ["image-compressor", "resize-image-to-kb", "image-cropper", "bulk-image-resizer"],
    updated: "2026-10-07",
  },
  "image-compressor": {
    id: "image-compressor",
    path: "/tools/image-compressor",
    name: "Image Compressor",
    navLabel: "Compress",
    summary: "Reduce the file size of JPG, PNG and WebP images while keeping their dimensions.",
    linkText: "Compress an image",
    category: "compress",
    related: ["resize-image-to-kb", "100kb-photo", "50kb-photo", "image-resizer"],
    updated: "2026-10-07",
  },
  "resize-image-to-kb": {
    id: "resize-image-to-kb",
    path: "/tools/resize-image-to-kb",
    name: "Resize Image to Exact KB",
    navLabel: "Resize to KB",
    summary: "Hit a file size limit such as 20 KB, 50 KB, 100 KB or 200 KB for forms and uploads.",
    linkText: "Resize an image to 50KB, 100KB or any size",
    category: "resize",
    related: ["100kb-photo", "image-compressor", "image-resizer", "passport-photo-resizer"],
    updated: "2026-10-07",
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
    related: ["jpg-to-png", "webp-to-jpg", "image-compressor", "resize-image-to-kb"],
    updated: "2026-10-07",
  },
  "webp-to-jpg": {
    id: "webp-to-jpg",
    path: "/tools/webp-to-jpg",
    name: "WebP to JPG Converter",
    navLabel: "WebP to JPG",
    summary: "Convert WebP images saved from websites into JPG files that every app and upload form accepts.",
    linkText: "Convert WebP to JPG",
    category: "convert",
    related: ["png-to-jpg", "image-compressor", "resize-image-to-kb", "image-resizer"],
    updated: "2026-10-07",
  },
  "heic-to-jpg": {
    id: "heic-to-jpg",
    path: "/tools/heic-to-jpg",
    name: "HEIC to JPG Converter",
    navLabel: "HEIC to JPG",
    summary: "Convert iPhone HEIC and HEIF photos to JPG that opens everywhere, right in your browser.",
    linkText: "Convert HEIC photos to JPG",
    category: "convert",
    related: ["image-resizer", "image-compressor", "jpg-to-png"],
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
    updated: "2026-10-07",
  },
  "passport-photo-resizer": {
    id: "passport-photo-resizer",
    path: "/tools/passport-photo-resizer",
    name: "Passport Photo Resizer",
    navLabel: "Passport photo",
    summary: "Crop and resize a photo to a passport or application size in pixels, millimetres and KB.",
    linkText: "Resize a photo for a passport or visa application",
    category: "edit",
    related: ["passport-photo", "image-cropper", "resize-image-to-kb", "image-compressor"],
    updated: "2026-10-07",
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
  "20kb-photo": {
    id: "20kb-photo",
    path: "/tools/20kb-photo",
    name: "20KB Photo Resizer",
    navLabel: "20KB photo",
    summary: "Reduce a photo or signature to 20 KB or less, the tightest limit on many application forms.",
    linkText: "Resize a photo to 20KB",
    category: "size",
    related: ["50kb-photo", "signature-resizer", "resize-image-to-kb", "image-compressor"],
    updated: "2026-10-07",
  },
  "50kb-photo": {
    id: "50kb-photo",
    path: "/tools/50kb-photo",
    name: "50KB Photo Resizer",
    navLabel: "50KB photo",
    summary: "Get a photo under 50 KB while keeping a face clear and sharp, for recruitment and exam forms.",
    linkText: "Resize a photo to 50KB",
    category: "size",
    related: ["20kb-photo", "100kb-photo", "ibps-photo", "resize-image-to-kb"],
    updated: "2026-10-07",
  },
  "100kb-photo": {
    id: "100kb-photo",
    path: "/tools/100kb-photo",
    name: "100KB Photo Resizer",
    navLabel: "100KB photo",
    summary: "Bring a phone photo down to 100 KB with good quality, for portals, profiles and email.",
    linkText: "Resize a photo to 100KB",
    category: "size",
    related: ["50kb-photo", "200kb-photo", "image-compressor", "resize-image-to-kb"],
    updated: "2026-10-07",
  },
  "200kb-photo": {
    id: "200kb-photo",
    path: "/tools/200kb-photo",
    name: "200KB Photo Resizer",
    navLabel: "200KB photo",
    summary: "Shrink a large photo to 200 KB while keeping plenty of detail and resolution.",
    linkText: "Resize a photo to 200KB",
    category: "size",
    related: ["100kb-photo", "neet-photo", "image-resizer", "resize-image-to-kb"],
    updated: "2026-10-07",
  },
  "ssc-photo": {
    id: "ssc-photo",
    path: "/tools/ssc-photo",
    name: "SSC Photo & Signature",
    navLabel: "SSC photo",
    summary: "What SSC currently asks for: live photo capture rules and a signature resized to 10–20 KB.",
    linkText: "Prepare your SSC signature and photo",
    category: "application",
    related: ["signature-resizer", "20kb-photo", "image-cropper", "image-compressor"],
    updated: "2026-10-07",
  },
  "upsc-photo": {
    id: "upsc-photo",
    path: "/tools/upsc-photo",
    name: "UPSC Photo Resizer",
    navLabel: "UPSC photo",
    summary: "Crop and size a photo or signature for a UPSC application using the numbers in your notice.",
    linkText: "Prepare a photo for a UPSC application",
    category: "application",
    related: ["image-cropper", "resize-image-to-kb", "passport-photo-resizer", "image-compressor"],
    updated: "2026-10-07",
  },
  "ibps-photo": {
    id: "ibps-photo",
    path: "/tools/ibps-photo",
    name: "IBPS Photo Resizer",
    navLabel: "IBPS photo",
    summary: "Make a 200 × 230 px, 20–50 KB photo and a 140 × 60 px signature for IBPS CRP applications.",
    linkText: "Resize a photo for IBPS",
    category: "application",
    related: ["sbi-photo", "50kb-photo", "20kb-photo", "image-cropper"],
    updated: "2026-10-07",
  },
  "sbi-photo": {
    id: "sbi-photo",
    path: "/tools/sbi-photo",
    name: "SBI Photo Resizer",
    navLabel: "SBI photo",
    summary: "Prepare the photo and signature sizes stated in current SBI recruitment advertisements.",
    linkText: "Resize a photo for SBI recruitment",
    category: "application",
    related: ["ibps-photo", "50kb-photo", "20kb-photo", "image-cropper"],
    updated: "2026-10-07",
  },
  "neet-photo": {
    id: "neet-photo",
    path: "/tools/neet-photo",
    name: "NEET Photo Resizer",
    navLabel: "NEET photo",
    summary: "Prepare a NEET (UG) photograph within 10–200 KB and a signature within 10–100 KB.",
    linkText: "Resize a photo for NEET",
    category: "application",
    related: ["200kb-photo", "image-cropper", "signature-resizer", "image-compressor"],
    updated: "2026-10-07",
  },
  "passport-photo": {
    id: "passport-photo",
    path: "/tools/passport-photo",
    name: "Passport Size Photo",
    navLabel: "Passport size photo",
    summary: "Officially sourced passport photo sizes by country, with a tool to make a photo that matches.",
    linkText: "Check passport photo size by country",
    category: "application",
    related: ["passport-photo-resizer", "image-cropper", "image-compressor", "resize-image-to-kb"],
    updated: "2026-10-07",
  },
};

/** Display order used across the site. */
export const toolOrder: ToolId[] = [
  "image-resizer",
  "image-compressor",
  "resize-image-to-kb",
  "jpg-to-png",
  "png-to-jpg",
  "webp-to-jpg",
  "bulk-image-resizer",
  "image-cropper",
  "passport-photo-resizer",
  "signature-resizer",
  "heic-to-jpg",
  "svg-to-png",
  "png-to-svg",
  "20kb-photo",
  "50kb-photo",
  "100kb-photo",
  "200kb-photo",
  "ssc-photo",
  "upsc-photo",
  "ibps-photo",
  "sbi-photo",
  "neet-photo",
  "passport-photo",
];

export const allTools: ToolDefinition[] = toolOrder.map((id) => tools[id]);

export function getTool(id: ToolId): ToolDefinition {
  return tools[id];
}

export const NAV_GROUPS: { id: NavGroup; label: string }[] = [
  { id: "image", label: "Image tools" },
  { id: "size", label: "Photo size" },
  { id: "application", label: "Exam & passport" },
];

export function toolsIn(group: NavGroup): ToolDefinition[] {
  return allTools.filter((tool) => navGroupOf(tool) === group);
}
