import { ImageToolError } from "@/lib/image-processing/errors";
import { hasUnsafeEntities, intrinsicSvgSize, type SvgSize } from "./dimensions";

/**
 * SVG sanitization. SVG is XML that can contain scripts, event handlers,
 * embedded HTML and links to other servers, so uploaded SVG is never inserted
 * into the page. Instead it is:
 *
 * 1. parsed with DOMParser (which never runs scripts or loads anything),
 * 2. cleaned with DOMPurify's SVG profile, plus stricter rules below,
 * 3. only ever displayed or drawn through an <img> element, where browsers
 *    disable scripting and block all external requests regardless.
 */
export const MAX_SVG_BYTES = 10 * 1024 * 1024;

const SVG_NS = "http://www.w3.org/2000/svg";

/** Elements that are never kept: scripting, embedded documents, and animation (the PNG is a still image). */
const FORBIDDEN_TAGS = [
  "script",
  "foreignObject",
  "iframe",
  "embed",
  "object",
  "audio",
  "video",
  "canvas",
  "animate",
  "animateMotion",
  "animateTransform",
  "animateColor",
  "set",
  "discard",
  "handler",
  "listener",
];

/** Embedded raster images inside an SVG are fine as long as they are inline data, not links. */
const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp);base64,/i;

export interface SanitizedSvg {
  /** Cleaned, standalone SVG markup. Use only via an <img> or as an image Blob. */
  markup: string;
  size: SvgSize;
  /** Number of unsafe items removed (scripts, event handlers, external links…). */
  removedCount: number;
  /** Plain-language categories of what was removed, for the notice shown to users. */
  removedKinds: string[];
}

export async function sanitizeSvgFile(file: File): Promise<SanitizedSvg> {
  if (file.size === 0) throw new ImageToolError("EMPTY_FILE", "This file is empty. Please choose another SVG.");
  if (file.size > MAX_SVG_BYTES) {
    throw new ImageToolError("FILE_TOO_LARGE", "This SVG is larger than 10 MB. Very large SVG files can freeze the browser, so they aren't accepted.");
  }
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new ImageToolError("DECODE_FAILED", "We couldn't read this file. It may have been moved or deleted.");
  }
  return sanitizeSvgMarkup(text);
}

export async function sanitizeSvgMarkup(text: string): Promise<SanitizedSvg> {
  if (!/<svg[\s>]/i.test(text)) {
    throw new ImageToolError("INVALID_SVG", "This file isn't an SVG image. Please choose a file ending in .svg.");
  }
  if (hasUnsafeEntities(text)) {
    throw new ImageToolError(
      "INVALID_SVG",
      "This SVG uses XML entity declarations that can be abused to freeze a browser, so it can't be opened safely. Re-export it from your design tool without a DOCTYPE.",
    );
  }

  const parsed = new DOMParser().parseFromString(text, "image/svg+xml");
  const root = parsed.documentElement;
  if (parsed.getElementsByTagName("parsererror").length > 0 || root.localName !== "svg" || root.namespaceURI !== SVG_NS) {
    throw new ImageToolError(
      "INVALID_SVG",
      "This SVG couldn't be read. The file may be damaged or not valid SVG/XML. Try opening it in a browser or re-exporting it from your design tool.",
    );
  }

  const { default: DOMPurify } = await import("dompurify");
  const purifier = DOMPurify(window);
  const cleaned = purifier.sanitize(root, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: FORBIDDEN_TAGS,
    RETURN_DOM: true,
  }) as unknown as HTMLElement;
  // Only security-relevant removals are reported; editor metadata (Inkscape,
  // Illustrator attributes and similar) is dropped silently because it never
  // affects how the drawing looks.
  let removedCount = 0;
  const kinds = new Set<string>();
  for (const item of purifier.removed) {
    const entry = item as { element?: Element; attribute?: Attr | null };
    const attrName = entry.attribute?.name?.toLowerCase() ?? "";
    const tag = entry.element && !entry.attribute ? entry.element.localName : "";
    let kind: string | null = null;
    if (attrName.startsWith("on")) kind = "event handlers";
    else if (/href$/.test(attrName)) kind = "unsafe links";
    else if (tag === "script") kind = "scripts";
    else if (tag === "foreignObject" || tag === "iframe" || tag === "embed" || tag === "object") kind = "embedded HTML or documents";
    else if (/^(animate|set|discard)/i.test(tag)) kind = "animations";
    if (kind) {
      kinds.add(kind);
      removedCount++;
    }
  }

  const svg = cleaned.querySelector("svg");
  if (!svg || svg.namespaceURI !== SVG_NS) {
    throw new ImageToolError("INVALID_SVG", "Nothing drawable was left after removing unsafe content from this SVG.");
  }

  // Stricter than DOMPurify's defaults: no references to anything outside the file.
  const external = stripExternalReferences(svg);
  if (external > 0) {
    removedCount += external;
    kinds.add("links to external files");
  }

  if (!svg.getAttribute("xmlns")) svg.setAttribute("xmlns", SVG_NS);
  const size = intrinsicSvgSize(svg.getAttribute("width"), svg.getAttribute("height"), svg.getAttribute("viewBox"));
  const markup = new XMLSerializer().serializeToString(svg);
  return { markup, size, removedCount, removedKinds: [...kinds] };
}

/** Removes links and url() references that point outside the SVG. Returns how many were removed. */
function stripExternalReferences(svg: Element): number {
  let removed = 0;
  const elements = [svg, ...svg.querySelectorAll("*")];
  for (const element of elements) {
    for (const attr of [...element.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name === "href" || name === "xlink:href" || name.endsWith(":href")) {
        if (!value.startsWith("#") && !SAFE_DATA_IMAGE.test(value)) {
          element.removeAttributeNode(attr);
          removed++;
        }
      } else if (/url\s*\(/i.test(value)) {
        const safe = replaceExternalUrls(value);
        if (safe !== value) {
          element.setAttribute(attr.name, safe);
          removed++;
        }
      }
    }
    if (element.localName === "style") {
      const css = element.textContent ?? "";
      const safe = replaceExternalUrls(css.replace(/@import[^;]*;?/gi, ""));
      if (safe !== css) {
        element.textContent = safe;
        removed++;
      }
    }
  }
  return removed;
}

/** Keeps url(#id) and inline data images; replaces anything else with `none`. */
export function replaceExternalUrls(value: string): string {
  return value.replace(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi, (match, _quote: string, target: string) =>
    target.startsWith("#") || SAFE_DATA_IMAGE.test(target) ? match : "none",
  );
}
