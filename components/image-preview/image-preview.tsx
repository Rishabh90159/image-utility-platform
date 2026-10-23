/**
 * Preview of a local image. Images with transparency sit on a checkerboard so the transparent areas are
 * visible; opaque images get a plain background, so they don't look transparent when letterboxed.
 * A plain <img> is used because previews are local blob: URLs that next/image can't optimise.
 */
export function ImagePreview({
  src,
  alt,
  width,
  height,
  className = "",
  transparent = true,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** Whether the image has transparent pixels (shows the checkerboard). */
  transparent?: boolean;
}) {
  return (
    <div className={`${transparent ? "checkerboard" : "bg-surface"} flex items-center justify-center overflow-hidden rounded-md border border-line ${className}`}>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        decoding="async"
        className="h-auto max-h-full w-auto max-w-full object-contain"
        style={{ imageRendering: width < 64 && height < 64 ? "pixelated" : "auto" }}
      />
    </div>
  );
}
