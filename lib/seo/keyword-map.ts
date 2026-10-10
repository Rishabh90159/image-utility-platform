/**
 * Search-intent map: which page owns which query. Every keyword belongs to
 * exactly one page, so pages don't compete with each other (cannibalization).
 * The unit tests enforce that, and the SEO e2e test checks that each primary
 * keyword appears in the page's title or H1.
 *
 * This is a planning document, not a list of words to insert into pages.
 * Copy is written for the intent; keywords only guide which page answers it.
 * Volume/difficulty figures come from competitor keyword research (approximate,
 * global) and are recorded in docs/seo-architecture.md, not here.
 */
export type SearchIntent = "tool" | "file-size" | "application" | "hub";

export interface KeywordTarget {
  path: string;
  primary: string;
  secondary: string[];
  intent: SearchIntent;
  /** Pages that support this one with contextual links. */
  supportedBy: string[];
}

export const KEYWORD_MAP: KeywordTarget[] = [
  {
    path: "/tools/image-resizer",
    primary: "image resizer",
    secondary: ["resize image", "photo resizer", "resize image online", "image resizer online", "resize photo", "photo resize", "image resize", "online image resizer", "resize image by pixels", "resize image by percentage"],
    intent: "tool",
    supportedBy: ["/", "/tools/bulk-image-resizer", "/tools/image-cropper", "/tools/heic-to-jpg", "/tools/image-compressor", "/tools/resize-jpg", "/tools/resize-png", "/tools/resize-webp", "/tools/resize-gif"],
  },
  {
    path: "/tools/resize-jpg",
    primary: "resize jpg",
    secondary: ["jpg resize", "resize jpeg", "jpg resizer", "jpeg resizer", "resize jpg online", "jpg dpi"],
    intent: "tool",
    supportedBy: ["/tools/image-resizer", "/tools/jpg-to-png", "/tools/bulk-image-resizer", "/tools/resize-webp"],
  },
  {
    path: "/tools/resize-png",
    primary: "resize png",
    secondary: ["png resizer", "png resize", "resize png online", "resize transparent png", "resize png without losing transparency"],
    intent: "tool",
    supportedBy: ["/tools/image-resizer", "/tools/png-to-jpg", "/tools/resize-jpg", "/tools/resize-gif"],
  },
  {
    path: "/tools/resize-webp",
    primary: "resize webp",
    secondary: ["webp resizer", "webp resize", "resize webp online", "resize webp image"],
    intent: "tool",
    supportedBy: ["/tools/image-resizer", "/tools/webp-to-jpg", "/tools/resize-jpg"],
  },
  {
    path: "/tools/resize-gif",
    primary: "resize gif",
    secondary: ["gif resizer", "resize animated gif", "gif resize", "resize gif online", "make gif smaller"],
    intent: "tool",
    supportedBy: ["/tools/image-resizer", "/tools/resize-png", "/tools/bulk-image-resizer"],
  },
  {
    path: "/tools/instagram-image-resizer",
    primary: "instagram image resizer",
    secondary: [
      "image resizer for instagram",
      "resize image for instagram",
      "instagram photo resizer",
      "instagram post resizer",
      "instagram picture resizer",
      "instagram image size",
      "instagram post size",
      "instagram image dimensions",
      "resize instagram post to 1080x1080",
      "instagram portrait post size",
      "instagram story size",
      "instagram reel size",
      "instagram square image resizer",
      "instagram 4:5 image resizer",
      "instagram 3:4 image size",
      "instagram image cropper",
      "resize photo for instagram without cropping",
      "instagram image resizer online free",
    ],
    intent: "tool",
    supportedBy: ["/", "/tools/image-resizer", "/tools/image-cropper"],
  },
  {
    path: "/tools/image-compressor",
    primary: "image compressor",
    secondary: ["compress image", "photo compressor", "compress photo", "compress jpeg", "jpeg compressor", "jpg compress", "compress jpg", "reduce image size", "reduce jpg size", "decrease image size", "compress png", "jpg compressor", "compress image online"],
    intent: "tool",
    supportedBy: ["/tools/image-resizer", "/tools/png-to-jpg", "/tools/100kb-photo", "/tools/webp-to-jpg"],
  },
  {
    path: "/tools/resize-image-to-kb",
    primary: "resize image in kb",
    secondary: ["image size reducer", "photo size reducer", "jpg size reducer", "kb reducer", "reduce image size in kb", "resize image to specific kb"],
    intent: "file-size",
    supportedBy: ["/tools/20kb-photo", "/tools/50kb-photo", "/tools/100kb-photo", "/tools/200kb-photo", "/tools/image-compressor"],
  },
  {
    path: "/tools/20kb-photo",
    primary: "resize image to 20kb",
    secondary: ["compress image to 20kb", "image compressor to 20kb", "20kb photo", "photo resize to 20kb"],
    intent: "file-size",
    supportedBy: ["/tools/resize-image-to-kb", "/tools/50kb-photo", "/tools/ssc-photo", "/tools/signature-resizer"],
  },
  {
    path: "/tools/50kb-photo",
    primary: "resize image to 50kb",
    secondary: ["compress image to 50kb", "image compressor to 50kb", "50kb photo", "photo under 50kb"],
    intent: "file-size",
    supportedBy: ["/tools/resize-image-to-kb", "/tools/20kb-photo", "/tools/100kb-photo", "/tools/ibps-photo", "/tools/image-compressor"],
  },
  {
    path: "/tools/100kb-photo",
    primary: "resize image to 100kb",
    secondary: ["compress image to 100kb", "image compressor to 100kb", "100kb photo", "reduce photo to 100kb"],
    intent: "file-size",
    supportedBy: ["/tools/resize-image-to-kb", "/tools/50kb-photo", "/tools/200kb-photo", "/tools/image-compressor"],
  },
  {
    path: "/tools/200kb-photo",
    primary: "resize image to 200kb",
    secondary: ["compress image to 200kb", "image compressor to 200kb", "200kb photo"],
    intent: "file-size",
    supportedBy: ["/tools/100kb-photo", "/tools/neet-photo", "/tools/image-compressor"],
  },
  {
    path: "/tools/jpg-to-png",
    primary: "jpg to png",
    secondary: ["jpg to png converter", "jpeg to png", "convert jpg to png"],
    intent: "tool",
    supportedBy: ["/tools/png-to-jpg", "/tools/heic-to-jpg"],
  },
  {
    path: "/tools/png-to-jpg",
    primary: "png to jpg",
    secondary: ["png to jpg converter", "convert png to jpg", "png to jpeg"],
    intent: "tool",
    supportedBy: ["/tools/jpg-to-png", "/tools/image-compressor", "/tools/webp-to-jpg"],
  },
  {
    path: "/tools/webp-to-jpg",
    primary: "webp to jpg",
    secondary: ["webp to jpg converter", "convert webp to jpg", "webp to jpeg"],
    intent: "tool",
    supportedBy: ["/tools/png-to-jpg"],
  },
  {
    path: "/tools/heic-to-jpg",
    primary: "heic to jpg",
    secondary: ["heic to jpg converter", "convert heic to jpg", "how to convert heic to jpg", "iphone photo to jpg"],
    intent: "tool",
    supportedBy: ["/tools/jpg-to-png", "/tools/image-resizer"],
  },
  {
    path: "/tools/svg-to-png",
    primary: "svg to png",
    secondary: ["svg to png converter", "convert svg to png"],
    intent: "tool",
    supportedBy: ["/tools/png-to-svg"],
  },
  {
    path: "/tools/png-to-svg",
    primary: "png to svg",
    secondary: ["png to svg converter", "convert png to vector", "image to svg"],
    intent: "tool",
    supportedBy: ["/tools/svg-to-png"],
  },
  {
    path: "/tools/image-cropper",
    primary: "crop image",
    secondary: ["image cropper", "crop image online", "photo cropper", "online image cropper", "crop photo", "image crop"],
    intent: "tool",
    supportedBy: ["/tools/image-resizer", "/tools/50kb-photo", "/tools/ssc-photo", "/tools/passport-photo"],
  },
  {
    path: "/tools/bulk-image-resizer",
    primary: "bulk image resizer",
    secondary: ["resize multiple images", "bulk resize images", "resize multiple photos", "batch image resize"],
    intent: "tool",
    supportedBy: ["/tools/image-resizer", "/tools/heic-to-jpg", "/tools/200kb-photo"],
  },
  {
    path: "/tools/signature-resizer",
    primary: "signature resize",
    secondary: ["signature resizer", "resize signature", "signature image resize", "signature resize online"],
    intent: "tool",
    supportedBy: ["/tools/20kb-photo", "/tools/ssc-photo", "/tools/neet-photo", "/tools/image-cropper"],
  },
  {
    path: "/tools/passport-photo",
    primary: "passport size photo",
    secondary: ["passport size photo maker", "passport photo maker", "passport photo size", "passport photo", "passport size photo in pixels"],
    intent: "application",
    supportedBy: ["/tools/passport-photo-resizer", "/tools/100kb-photo", "/tools/application-photos"],
  },
  {
    path: "/tools/passport-photo-resizer",
    primary: "passport photo resizer",
    secondary: ["resize passport photo", "visa photo resizer", "photo resize in mm", "custom photo size in pixels and kb"],
    intent: "tool",
    supportedBy: ["/tools/passport-photo", "/tools/image-cropper", "/tools/application-photos"],
  },
  {
    path: "/tools/application-photos",
    primary: "exam photo size",
    secondary: ["photo size for government exams", "exam photo and signature size", "photo size for online application"],
    intent: "hub",
    supportedBy: ["/tools", "/tools/ibps-photo", "/tools/sbi-photo", "/tools/ssc-photo", "/tools/neet-photo", "/tools/upsc-photo"],
  },
  {
    path: "/tools/ssc-photo",
    primary: "ssc photo",
    secondary: ["ssc photo size", "ssc signature size", "ssc signature resize", "ssc live photo"],
    intent: "application",
    supportedBy: ["/tools/20kb-photo", "/tools/application-photos"],
  },
  {
    path: "/tools/upsc-photo",
    primary: "upsc photo",
    secondary: ["upsc photo size", "upsc signature size", "upsc photo resizer"],
    intent: "application",
    supportedBy: ["/tools/application-photos"],
  },
  {
    path: "/tools/ibps-photo",
    primary: "ibps photo",
    secondary: ["ibps photo size", "ibps signature size", "ibps photo resizer"],
    intent: "application",
    supportedBy: ["/tools/50kb-photo", "/tools/20kb-photo", "/tools/sbi-photo", "/tools/application-photos"],
  },
  {
    path: "/tools/sbi-photo",
    primary: "sbi photo",
    secondary: ["sbi photo size", "sbi signature size", "sbi po photo size"],
    intent: "application",
    supportedBy: ["/tools/ibps-photo", "/tools/50kb-photo", "/tools/application-photos"],
  },
  {
    path: "/tools/neet-photo",
    primary: "neet photo",
    secondary: ["neet photo size", "neet signature size", "neet photo resizer"],
    intent: "application",
    supportedBy: ["/tools/200kb-photo", "/tools/100kb-photo", "/tools/application-photos"],
  },
  {
    path: "/tools/image-upscaler",
    primary: "image upscaler",
    secondary: ["upscale image", "image upscaler free", "enlarge image", "upscale image 2x", "upscale image 4x", "increase image resolution"],
    intent: "tool",
    supportedBy: ["/tools/image-resizer", "/tools/image-size-increase", "/tools/image-quality-enhancer"],
  },
  {
    path: "/tools/image-size-increase",
    primary: "increase image size",
    secondary: ["photo size increase", "image size increase", "image size increaser", "increase image size in kb", "increase photo size in kb", "increase image dimensions", "increase file size of image"],
    intent: "tool",
    supportedBy: ["/tools/image-upscaler", "/tools/resize-image-to-kb", "/tools/image-resizer"],
  },
  {
    path: "/tools/image-quality-enhancer",
    primary: "image quality enhancer",
    secondary: ["enhance image quality", "improve image quality", "improve photo quality", "photo enhancer"],
    intent: "tool",
    supportedBy: ["/tools/image-upscaler", "/tools/image-size-increase", "/tools/background-remover"],
  },
  {
    path: "/tools/background-remover",
    primary: "background remover",
    secondary: ["image background remover", "remove background from image", "background remover free", "background remover online", "online background remover", "photo background remove", "photo background", "transparent background", "remove background online", "free background remover"],
    intent: "tool",
    supportedBy: ["/tools/image-quality-enhancer", "/tools/png-to-jpg"],
  },
  {
    path: "/tools/photo-to-pdf",
    primary: "photo to pdf",
    secondary: ["image to pdf", "convert image to pdf", "images to pdf", "combine photos into pdf", "photo to pdf converter"],
    intent: "tool",
    supportedBy: ["/tools/jpg-to-pdf", "/tools/merge-images"],
  },
  {
    path: "/tools/jpg-to-pdf",
    primary: "jpg to pdf",
    secondary: ["jpg to pdf converter", "jpeg to pdf", "convert jpg to pdf"],
    intent: "tool",
    supportedBy: ["/tools/photo-to-pdf", "/tools/jpeg-to-jpg", "/tools/jpg-to-png"],
  },
  {
    path: "/tools/merge-images",
    primary: "merge images",
    secondary: ["combine images", "merge photos", "combine photos into one image", "combine photos online", "photo joiner"],
    intent: "tool",
    supportedBy: ["/tools/photo-to-pdf"],
  },
  {
    path: "/tools/jpeg-to-jpg",
    primary: "jpeg to jpg",
    secondary: ["jpeg to jpg converter", "convert jpeg to jpg", "jpeg file to jpg", "jfif to jpg"],
    intent: "tool",
    supportedBy: ["/tools/jpg-to-png", "/tools/jpg-to-pdf"],
  },
  {
    path: "/tools/mb-to-kb-converter",
    primary: "mb to kb converter",
    secondary: ["mb to kb", "kb converter", "convert mb to kb", "kb to mb", "file size converter"],
    intent: "tool",
    supportedBy: ["/tools/resize-image-to-kb"],
  },
];

/**
 * High-demand searches no current page should target, because the site has no
 * tool that does the job. Building a page for these without the feature would
 * be a thin page. Prioritised in docs/seo-architecture.md.
 */
export const UNSERVED_INTENTS = ["image to jpg converter", "photo to jpg", "photo editor online"] as const;
