"use client";

import { useId, useState } from "react";

/**
 * Before/after comparison with a draggable divider. The divider is a native
 * range input, so it works with touch, mouse and the keyboard (arrow keys).
 * Both images are shown at the same displayed size.
 */
export function CompareSlider({
  before,
  after,
  beforeAlt,
  afterAlt,
  width,
  height,
  checkerboard = false,
  className = "",
}: {
  before: string;
  after: string;
  beforeAlt: string;
  afterAlt: string;
  /** Intrinsic size of the result, used for the aspect ratio. */
  width: number;
  height: number;
  /** Show a checkerboard behind transparent areas. */
  checkerboard?: boolean;
  className?: string;
}) {
  const [position, setPosition] = useState(50);
  const id = useId();
  return (
    <div className={className}>
      <div
        className={`relative mx-auto max-h-[28rem] w-full overflow-hidden rounded-md border border-line has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${checkerboard ? "checkerboard" : "bg-surface"}`}
        style={{ aspectRatio: `${width} / ${height}`, maxWidth: `calc(28rem * ${width} / ${height})` }}
      >
        <img src={after} alt={afterAlt} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          {/* The "before" layer always has a plain backdrop so it reads as the original photo. */}
          <img src={before} alt={beforeAlt} className="h-full w-full bg-canvas object-contain" draggable={false} />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" style={{ left: `calc(${position}% - 1px)` }}>
          <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-canvas text-ink shadow">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M6 4L2 8l4 4M10 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-ink/75 px-1.5 py-0.5 text-xs font-medium text-white">Before</span>
        <span className="pointer-events-none absolute right-2 top-2 rounded bg-ink/75 px-1.5 py-0.5 text-xs font-medium text-white">After</span>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          aria-label="Comparison divider: left shows the original, right shows the result"
          aria-valuetext={`${position}% original`}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <p className="mt-2 text-center text-xs text-muted">Drag the divider (or use the arrow keys) to compare before and after.</p>
    </div>
  );
}
