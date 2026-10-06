/**
 * Preview of a local image on a checkerboard so transparent areas are visible.
 * A plain <img> is used because previews are local blob: URLs that next/image can't optimise.
 */
export function ImagePreview({
  src,
  alt,
  width,
  height,
  className = "",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <div className={`checkerboard flex items-center justify-center overflow-hidden rounded-md border border-line ${className}`}>
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
