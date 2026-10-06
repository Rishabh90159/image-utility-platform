import type { ToolCategory, ToolId } from "@/lib/tools/registry";

/** Small line icons, drawn inline so no icon library is shipped. */
export function ToolIcon({ id, category }: { id: ToolId; category: ToolCategory }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
  if (id === "resize-image-to-kb") {
    return (
      <svg {...common}>
        <path d="M5 2.5h7l3.5 3.5v11.5H5z" />
        <path d="M12 2.5V6h3.5" />
        <path d="M8 11.5h5M8 14.5h3" />
      </svg>
    );
  }
  if (id === "bulk-image-resizer") {
    return (
      <svg {...common}>
        <rect x="2.5" y="6.5" width="9" height="9" rx="1" />
        <path d="M5.5 3.5h9v9" />
        <path d="M14 8.5h3.5v9h-9V15" />
      </svg>
    );
  }
  if (id === "image-cropper") {
    return (
      <svg {...common}>
        <path d="M5.5 1.5v13h13M1.5 5.5h13v13" />
      </svg>
    );
  }
  if (id === "passport-photo-resizer") {
    return (
      <svg {...common}>
        <rect x="3.5" y="2" width="13" height="16" rx="1.5" />
        <circle cx="10" cy="8" r="2.5" />
        <path d="M6 15c.6-2.2 2.1-3.5 4-3.5s3.4 1.3 4 3.5" />
      </svg>
    );
  }
  if (id === "signature-resizer") {
    return (
      <svg {...common}>
        <path d="M2.5 13.5c2-4 3.5-9 5.5-9 1.5 0-.5 8 1 8s2-3.5 3-3.5.5 3 2 3 2-1 3-1.5" />
        <path d="M2.5 17h15" />
      </svg>
    );
  }
  if (id === "png-to-svg" || id === "svg-to-png") {
    return (
      <svg {...common}>
        <path d="M3 16.5L8.5 4l3 7 2-3.5 3.5 9" />
        <circle cx="8.5" cy="4" r="1.3" />
        <circle cx="3" cy="16.5" r="1.3" />
        <circle cx="17" cy="16.5" r="1.3" />
      </svg>
    );
  }
  if (category === "resize") {
    return (
      <svg {...common}>
        <rect x="2.5" y="8.5" width="9" height="9" rx="1" />
        <path d="M10 2.5h7.5V10M17.5 2.5L12 8" />
      </svg>
    );
  }
  if (category === "compress") {
    return (
      <svg {...common}>
        <path d="M10 2v5.5M7.5 5L10 7.5 12.5 5M10 18v-5.5M7.5 15l2.5-2.5 2.5 2.5M3 10h14" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3 7h12.5M12.5 4l3 3-3 3M17 13H4.5M7.5 10l-3 3 3 3" />
    </svg>
  );
}
