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
