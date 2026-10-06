"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SourceImage } from "@/components/tools/hooks";
import { rotatedSize } from "@/lib/image-processing/transform";
import type { ImageTransform, QuarterTurn } from "@/lib/image-processing/types";
import { cropToPixels, defaultCrop, refitCrop, type CropRect } from "./crop-geometry";

/**
 * Crop, rotation and mirroring for one source image. Resets when a new image
 * is selected and re-fits the crop when the aspect ratio changes.
 */
export function useCropState(source: SourceImage | null, aspect: number | null) {
  const [rotation, setRotation] = useState<QuarterTurn>(0);
  const [flipH, setFlipH] = useState(false);
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 1, height: 1 });
  const sourceId = source?.id ?? null;
  const dims = source ? rotatedSize(source.width, source.height, rotation) : { width: 1, height: 1 };
  const dimsRef = useRef(dims);
  dimsRef.current = dims;
  const aspectRef = useRef(aspect);
  aspectRef.current = aspect;

  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    const current = sourceRef.current;
    if (!current) return;
    setRotation(0);
    setFlipH(false);
    // Use the new image's unrotated size: rotation is reset along with it.
    setCrop(defaultCrop(aspectRef.current, current.width, current.height));
    // Values are read through refs: this should only run for a new image.
  }, [sourceId]);

  useEffect(() => {
    setCrop((current) => refitCrop(current, aspect, dimsRef.current.width, dimsRef.current.height));
  }, [aspect]);

  const rotate = useCallback(
    (direction: 1 | -1) => {
      if (!source) return;
      const next = ((((rotation + direction * 90) % 360) + 360) % 360) as QuarterTurn;
      const size = rotatedSize(source.width, source.height, next);
      setRotation(next);
      setCrop(defaultCrop(aspectRef.current, size.width, size.height));
    },
    [source, rotation],
  );

  const flip = useCallback(() => {
    setFlipH((f) => !f);
    // Mirror the selection too, so it keeps covering the same part of the picture.
    setCrop((c) => ({ ...c, x: 1 - c.x - c.width }));
  }, []);

  const reset = useCallback(() => {
    setRotation(0);
    setFlipH(false);
    if (source) setCrop(defaultCrop(aspectRef.current, source.width, source.height));
  }, [source]);

  const pixels = cropToPixels(crop, dims.width, dims.height);
  const transform: ImageTransform = { rotate: rotation, flipH, crop: pixels };

  return { rotation, flipH, crop, setCrop, rotate, flip, reset, dims, pixels, transform };
}
