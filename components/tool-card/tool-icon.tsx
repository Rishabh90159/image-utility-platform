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
  if (category === "size") {
    return (
      <svg {...common}>
        <path d="M5 2.5h7l3.5 3.5v11.5H5z" />
        <path d="M12 2.5V6h3.5" />
        <path d="M7.5 13.5l2.5-3 2.5 3M10 10.5v5" />
      </svg>
    );
  }
  if (id === "passport-photo") {
    return (
      <svg {...common}>
        <rect x="3.5" y="2" width="13" height="16" rx="1.5" />
        <circle cx="10" cy="9" r="3.5" />
        <path d="M6.5 9h7M10 5.5c1.2 1 1.2 6 0 7M10 5.5c-1.2 1-1.2 6 0 7" />
      </svg>
    );
  }
  if (category === "application") {
    return (
      <svg {...common}>
        <path d="M5 2.5h10a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1v-13a1 1 0 011-1z" />
        <rect x="6.5" y="5" width="4" height="5" rx="0.5" />
        <path d="M12.5 6h1.5M12.5 8.5h1.5M6.5 13h7M6.5 15.5h5" />
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
  if (id === "background-remover") {
    return (
      <svg {...common}>
        <rect x="2.5" y="2.5" width="15" height="15" rx="1.5" strokeDasharray="2 2" />
        <circle cx="10" cy="8" r="2.5" />
        <path d="M5.5 15.5c.8-2.4 2.4-3.8 4.5-3.8s3.7 1.4 4.5 3.8" />
      </svg>
    );
  }
  if (id === "merge-images") {
    return (
      <svg {...common}>
        <rect x="2.5" y="3.5" width="6.5" height="13" rx="1" />
        <rect x="11" y="3.5" width="6.5" height="13" rx="1" />
      </svg>
    );
  }
  if (id === "photo-to-pdf" || id === "jpg-to-pdf") {
    return (
      <svg {...common}>
        <path d="M5 2.5h7l3.5 3.5v11.5H5z" />
        <path d="M12 2.5V6h3.5" />
        <path d="M7.5 14.5l2-2.5 1.5 1.5 1.5-2 1 3z" />
      </svg>
    );
  }
  if (id === "image-quality-enhancer") {
    return (
      <svg {...common}>
        <path d="M10 2.5l1.6 4.3 4.4 1.2-4.4 1.2L10 13.5l-1.6-4.3L4 8l4.4-1.2z" />
        <path d="M15.5 13v4M13.5 15h4" />
      </svg>
    );
  }
  if (category === "units") {
    return (
      <svg {...common}>
        <path d="M3 6h14M3 14h14" />
        <path d="M6 3.5v5M14 11.5v5" />
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
