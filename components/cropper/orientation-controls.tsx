"use client";

/** Rotate left/right and mirror buttons for the cropper. */
export function OrientationControls({
  onRotate,
  onFlip,
  flipped,
}: {
  onRotate: (direction: 1 | -1) => void;
  onFlip: () => void;
  flipped: boolean;
}) {
  const button =
    "inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line-strong px-3 text-sm font-medium text-ink-soft hover:bg-surface aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent-ink";
  const icon = {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  return (
    <div role="group" aria-label="Orientation" className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onRotate(-1)} className={button}>
        <svg {...icon}>
          <path d="M3 6.5A5.5 5.5 0 113.5 10.5M3 2.5v4h4" />
        </svg>
        Rotate left
      </button>
      <button type="button" onClick={() => onRotate(1)} className={button}>
        <svg {...icon}>
          <path d="M13 6.5A5.5 5.5 0 1012.5 10.5M13 2.5v4H9" />
        </svg>
        Rotate right
      </button>
      <button type="button" onClick={onFlip} aria-pressed={flipped} className={button}>
        <svg {...icon}>
          <path d="M8 1.5v13M5.5 4L2 12h3.5zM10.5 4L14 12h-3.5z" />
        </svg>
        Mirror
      </button>
    </div>
  );
}
