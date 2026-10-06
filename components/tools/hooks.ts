"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { canEncode, isAbortError, newSourceId, processImage } from "@/lib/image-processing/client";
import { ImageToolError, toImageToolError } from "@/lib/image-processing/errors";
import { FORMATS, type ImageMime } from "@/lib/image-processing/formats";
import type { Job, ResultFor } from "@/lib/image-processing/types";
import { validateImageFile } from "@/lib/image-processing/validate";
import { sizeBucket } from "@/lib/utils/format";
import type { ToolId } from "@/lib/tools/registry";

export interface SourceImage {
  id: string;
  file: File;
  name: string;
  mime: ImageMime;
  size: number;
  /** Displayed dimensions (after applying EXIF orientation). */
  width: number;
  height: number;
  hasTransparency: boolean;
  /** Local object URL for previewing; never leaves the browser. */
  url: string;
}

interface UseSourceImageOptions {
  tool: ToolId;
  accept: ImageMime[];
  wrongFormatMessage?: (detected: ImageMime) => string;
}

/** Validates, decodes and holds the image the user selected. */
export function useSourceImage({ tool, accept, wrongFormatMessage }: UseSourceImageOptions) {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ImageToolError | null>(null);
  const request = useRef(0);
  const urlRef = useRef<string | null>(null);
  const acceptKey = accept.join(",");

  const replaceUrl = useCallback((next: string | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
  }, []);

  useEffect(() => () => replaceUrl(null), [replaceUrl]);

  const select = useCallback(
    async (file: File): Promise<SourceImage | null> => {
      const id = ++request.current;
      setError(null);
      setLoading(true);
      try {
        const { mime } = await validateImageFile(file, {
          accept: acceptKey.split(",") as ImageMime[],
          wrongFormatMessage,
        });
        const sourceId = newSourceId();
        const probe = await processImage({
          kind: "probe",
          sourceId,
          file,
          checkTransparency: FORMATS[mime].supportsTransparency,
        });
        if (id !== request.current) return null;
        const url = URL.createObjectURL(file);
        replaceUrl(url);
        const loaded: SourceImage = {
          id: sourceId,
          file,
          name: file.name || `image.${FORMATS[mime].extension}`,
          mime,
          size: file.size,
          width: probe.width,
          height: probe.height,
          hasTransparency: probe.hasTransparency,
          url,
        };
        setSource(loaded);
        track("image_uploaded", { tool, input_format: FORMATS[mime].label, size_bucket: sizeBucket(file.size) });
        return loaded;
      } catch (caught) {
        if (id !== request.current) return null;
        const normalized = toImageToolError(caught);
        setError(normalized);
        track("processing_failed", { tool, error_code: normalized.code });
        return null;
      } finally {
        if (id === request.current) setLoading(false);
      }
    },
    [tool, acceptKey, wrongFormatMessage, replaceUrl],
  );

  const clear = useCallback(() => {
    request.current++;
    replaceUrl(null);
    setSource(null);
    setError(null);
    setLoading(false);
  }, [replaceUrl]);

  return { source, loading, error, select, clear, setError };
}

/** Runs processing jobs, ignoring results from runs that were superseded or cancelled. */
export function useJobRunner() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(async <J extends Job>(job: J): Promise<ResultFor<J> | null> => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setProgress(null);
    try {
      return await processImage(job, {
        signal: current.signal,
        onProgress: (value) => {
          if (controller.current === current) setProgress(value);
        },
      });
    } catch (error) {
      if (isAbortError(error)) return null;
      throw toImageToolError(error);
    } finally {
      if (controller.current === current) {
        setBusy(false);
        setProgress(null);
      }
    }
  }, []);

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setProgress(null);
  }, []);

  return { run, cancel, busy, progress };
}

/** Object URL for a Blob, revoked automatically when the Blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

/** Whether the browser can create files of this format. `null` while checking. */
export function useEncodeSupport(mime: ImageMime): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    canEncode(mime).then((value) => {
      if (active) setSupported(value);
    });
    return () => {
      active = false;
    };
  }, [mime]);
  return supported;
}

/** Fires the tool_open analytics event once per page view. */
export function useToolOpen(tool: ToolId) {
  useEffect(() => {
    track("tool_open", { tool });
  }, [tool]);
}
