"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { QuarterTurn } from "@/lib/image-processing/types";
import {
  clamp,
  cropToPixels,
  moveRect,
  normalizedAspect,
  resizeRect,
  type CropRect,
  type Handle,
} from "./crop-geometry";

interface ImageCropperProps {
  /** Displayable preview of the unrotated image (any resolution). */
  src: string;
  /** Full-resolution size of the image after rotation; used for pixel read-outs and the aspect ratio. */
  imageWidth: number;
  imageHeight: number;
  rotation: QuarterTurn;
  flipH: boolean;
  /** Output ratio (width / height) in pixels, or null for a free crop. */
  aspect: number | null;
  crop: CropRect;
  onChange: (crop: CropRect) => void;
  /** Overlay guide: rule-of-thirds grid, or a centred head outline for portrait photos. */
  guide?: "thirds" | "portrait";
  /** Accessible name, e.g. "Crop area for your photo". */
  label?: string;
}

const MAX_ZOOM = 8;
const CORNERS: Handle[] = ["nw", "ne", "sw", "se"];
const EDGES: Handle[] = ["n", "s", "e", "w"];
/** Smallest crop, in image pixels. */
const MIN_CROP_PX = 8;

type Gesture =
  | { kind: "move" | "resize"; handle?: Handle; startX: number; startY: number; startCrop: CropRect }
  | { kind: "pan"; startX: number; startY: number; startPan: { x: number; y: number } }
  | { kind: "pinch"; startDistance: number; startZoom: number };

/**
 * Interactive crop selection. Works with mouse, touch and pen through Pointer
 * Events: drag the box to move it, drag a handle to resize, drag outside the
 * box to pan when zoomed in, and pinch (or Ctrl + scroll) to zoom. Keyboard:
 * arrow keys move the box, Shift + arrow keys resize it.
 */
export function ImageCropper({
  src,
  imageWidth,
  imageHeight,
  rotation,
  flipH,
  aspect,
  crop,
  onChange,
  guide = "thirds",
  label = "Crop area",
}: ImageCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0.5, y: 0.5 });
  // During a drag the crop lives here and is committed to the parent on release.
  const [draft, setDraft] = useState<CropRect | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const zoomId = useId();
  const helpId = useId();

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () => setBox({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Reset the view when the image or its orientation changes.
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0.5, y: 0.5 });
  }, [src, rotation]);

  const current = draft ?? crop;
  const fit = box.width && box.height ? Math.min(box.width / imageWidth, box.height / imageHeight) : 0;
  const dispW = imageWidth * fit * zoom;
  const dispH = imageHeight * fit * zoom;

  const clampPan = useCallback(
    (p: { x: number; y: number }, w = dispW, h = dispH) => ({
      x: w <= box.width ? 0.5 : clamp(p.x, box.width / (2 * w), 1 - box.width / (2 * w)),
      y: h <= box.height ? 0.5 : clamp(p.y, box.height / (2 * h), 1 - box.height / (2 * h)),
    }),
    [box.width, box.height, dispW, dispH],
  );

  const viewPan = clampPan(pan);
  const left = box.width / 2 - viewPan.x * dispW;
  const top = box.height / 2 - viewPan.y * dispH;
  const aspectN = aspect ? normalizedAspect(aspect, imageWidth, imageHeight) : null;
  const minSize = { width: MIN_CROP_PX / imageWidth, height: MIN_CROP_PX / imageHeight };

  const applyZoom = (next: number, focus?: { x: number; y: number }) => {
    const z = clamp(next, 1, MAX_ZOOM);
    // Keep the crop (or the pinch point) in view while zooming.
    const target = focus ?? { x: current.x + current.width / 2, y: current.y + current.height / 2 };
    setZoom(z);
    setPan(clampPan(target, imageWidth * fit * z, imageHeight * fit * z));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    containerRef.current?.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: "pinch", startDistance: Math.hypot(a.x - b.x, a.y - b.y), startZoom: zoom };
      return;
    }
    const role = (event.target as HTMLElement).dataset.cropRole;
    if (role === "move") {
      gesture.current = { kind: "move", startX: event.clientX, startY: event.clientY, startCrop: current };
    } else if (role && role.startsWith("handle-")) {
      gesture.current = {
        kind: "resize",
        handle: role.slice(7) as Handle,
        startX: event.clientX,
        startY: event.clientY,
        startCrop: current,
      };
    } else {
      gesture.current = { kind: "pan", startX: event.clientX, startY: event.clientY, startPan: viewPan };
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;
    if (!g || !dispW || !dispH) return;
    if (g.kind === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b || g.startDistance === 0) return;
      applyZoom(g.startZoom * (Math.hypot(a.x - b.x, a.y - b.y) / g.startDistance));
      return;
    }
    const dx = (event.clientX - g.startX) / dispW;
    const dy = (event.clientY - g.startY) / dispH;
    if (g.kind === "move") setDraft(moveRect(g.startCrop, dx, dy));
    else if (g.kind === "resize" && g.handle) setDraft(resizeRect(g.startCrop, g.handle, dx, dy, aspectN, minSize));
    else if (g.kind === "pan") setPan(clampPan({ x: g.startPan.x - dx, y: g.startPan.y - dy }));
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size > 0) {
      // Lifting one finger after a pinch: continue as a pan with the remaining finger.
      const [rest] = [...pointers.current.values()];
      gesture.current = { kind: "pan", startX: rest.x, startY: rest.y, startPan: viewPan };
      return;
    }
    gesture.current = null;
    if (draft) {
      onChange(draft);
      setDraft(null);
    }
  };

  // Ctrl/⌘ + scroll (and trackpad pinch, which browsers report the same way) zooms.
  // Plain scrolling is left alone so the page still scrolls over the cropper.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((z) => clamp(z * Math.exp(-event.deltaY * 0.01), 1, MAX_ZOOM));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const dir = keys[event.key];
    if (!dir) return;
    event.preventDefault();
    const step = event.altKey ? 0.002 : 0.01;
    const [dx, dy] = [dir[0] * step, dir[1] * step];
    if (event.shiftKey) onChange(resizeRect(current, "se", dx, aspectN ? dx / aspectN : dy, aspectN, minSize));
    else onChange(moveRect(current, dx, dy));
  };

  const px = cropToPixels(current, imageWidth, imageHeight);
  const boxStyle = {
    left: left + current.x * dispW,
    top: top + current.y * dispH,
    width: current.width * dispW,
    height: current.height * dispH,
  };
  // The <img> is laid out unrotated and turned with CSS, so it covers exactly the rotated area.
  const turned = rotation === 90 || rotation === 270;
  const imgW = turned ? dispH : dispW;
  const imgH = turned ? dispW : dispH;
  const handles = aspect ? CORNERS : [...CORNERS, ...EDGES];

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        className="checkerboard relative h-[min(60vh,30rem)] min-h-[17rem] touch-none select-none overflow-hidden rounded-md border border-line"
        style={{ cursor: zoom > 1 ? "grab" : "default" }}
      >
        {fit > 0 ? (
          <>
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{
                width: imgW,
                height: imgH,
                left: left + dispW / 2,
                top: top + dispH / 2,
                transform: `translate(-50%, -50%) ${flipH ? "scaleX(-1)" : ""} rotate(${rotation}deg)`,
              }}
            />
            <div
              role="group"
              tabIndex={0}
              aria-label={`${label}: ${px.width} × ${px.height} pixels, starting ${px.x} pixels from the left and ${px.y} from the top`}
              aria-describedby={helpId}
              data-crop-role="move"
              onKeyDown={onKeyDown}
              className="absolute cursor-move outline-none ring-white focus-visible:ring-2"
              style={{ ...boxStyle, boxShadow: "0 0 0 9999px rgba(12, 14, 18, 0.55)", border: "1px solid rgba(255,255,255,0.95)" }}
            >
              <CropGuide guide={guide} />
              {handles.map((handle) => (
                <span
                  key={handle}
                  data-crop-role={`handle-${handle}`}
                  aria-hidden="true"
                  className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                  style={{ ...handlePosition(handle), cursor: `${handle}-resize` }}
                >
                  <span
                    className={`pointer-events-none block border border-ink/70 bg-white shadow ${
                      handle.length === 2 ? "h-3.5 w-3.5 rounded-[3px]" : handle === "n" || handle === "s" ? "h-2 w-5 rounded-full" : "h-5 w-2 rounded-full"
                    }`}
                  />
                </span>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <p id={helpId} className="sr-only">
        Use the arrow keys to move the crop area. Hold Shift and use the arrow keys to resize it. Hold Alt for finer steps.
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-[14rem] flex-1 items-center gap-2">
          <label htmlFor={zoomId} className="text-sm font-medium text-ink">
            Zoom
          </label>
          <button
            type="button"
            onClick={() => applyZoom(zoom / 1.25)}
            disabled={zoom <= 1}
            aria-label="Zoom out"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-line-strong text-ink hover:bg-surface disabled:opacity-40"
          >
            −
          </button>
          <input
            id={zoomId}
            type="range"
            min={100}
            max={MAX_ZOOM * 100}
            step={5}
            value={Math.round(zoom * 100)}
            onChange={(event) => applyZoom(Number(event.target.value) / 100)}
            aria-valuetext={`${Math.round(zoom * 100)} percent`}
            className="h-2 min-w-0 flex-1 cursor-pointer accent-[var(--color-accent)]"
          />
          <button
            type="button"
            onClick={() => applyZoom(zoom * 1.25)}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-line-strong text-ink hover:bg-surface disabled:opacity-40"
          >
            +
          </button>
        </div>
        <p className="text-sm tabular-nums text-muted" aria-live="polite">
          Selection: <span className="font-medium text-ink">{px.width} × {px.height} px</span>
        </p>
      </div>
      <p className="text-xs text-muted">
        Drag the box to move it and the corners to resize. Pinch or use the zoom slider to zoom; drag outside the box to look
        around when zoomed in.
      </p>
    </div>
  );
}

function handlePosition(handle: Handle): React.CSSProperties {
  const x = handle.includes("w") ? "0%" : handle.includes("e") ? "100%" : "50%";
  const y = handle.includes("n") ? "0%" : handle.includes("s") ? "100%" : "50%";
  return { left: x, top: y };
}

function CropGuide({ guide }: { guide: "thirds" | "portrait" }) {
  if (guide === "portrait") {
    // A neutral head-and-shoulders outline to help centre the face. It is not an official template.
    return (
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="50" cy="42" rx="21" ry="27" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.6" strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute inset-y-0 left-1/3 border-l border-white/40" />
      <div className="absolute inset-y-0 left-2/3 border-l border-white/40" />
      <div className="absolute inset-x-0 top-1/3 border-t border-white/40" />
      <div className="absolute inset-x-0 top-2/3 border-t border-white/40" />
    </div>
  );
}
