"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/controls/alert";
import { Segmented } from "@/components/controls/fields";
import { DownloadButton } from "@/components/download-button/download-button";
import { ImageDropzone } from "@/components/image-uploader/image-dropzone";
import { track } from "@/lib/analytics";
import { createProcessingPool, isAbortError } from "@/lib/image-processing/client";
import { ImageToolError, toImageToolError } from "@/lib/image-processing/errors";
import type { ImageMime } from "@/lib/image-processing/formats";
import { searchTargetSize } from "@/lib/image-processing/target-size";
import { buildPdf, displaySize, MARGINS, PAGE_SIZES, placeImage, type Fit, type Orientation, type PageOptions, type PageSize, type PdfImage } from "@/lib/pdf/pdf-writer";
import type { ToolId } from "@/lib/tools/registry";
import { countBucket, formatBytes, KB } from "@/lib/utils/format";
import { useObjectUrl, useToolOpen } from "./hooks";
import { ImageListView, useImageList, type ListImage } from "./image-list";
import { ActionButton } from "./tool-workspace";

/**
 * Images → PDF, one image per page. Used by "Photo to PDF" (any supported
 * format) and "JPG to PDF" (JPEG only). JPEGs that need no rotation are
 * embedded byte-for-byte; other images are encoded as high-quality JPEG.
 */
export interface PdfToolConfig {
  tool: ToolId;
  accept: ImageMime[];
  prompt: string;
  /** Most images one PDF can hold (keeps memory use reasonable on phones). */
  maxFiles: number;
}

type Margin = keyof typeof MARGINS;
type Quality = "best" | "smaller";
type Limit = "none" | "100" | "200" | "300" | "500" | "1024";

const LIMITS_KB: Exclude<Limit, "none">[] = ["100", "200", "300", "500", "1024"];
/** Fitting a size limit re-encodes every image on each attempt, so it allows fewer images. */
const LIMIT_MAX_IMAGES = 40;
/** Smallest long side an image may be reduced to while fitting a limit; below this, text in photos of documents becomes hard to read. */
const LIMIT_MIN_SIDE = 500;

function limitLabel(limit: Exclude<Limit, "none">): string {
  return limit === "1024" ? "1 MB" : `${limit} KB`;
}

const QUALITY: Record<Quality, { quality: number; maxSide?: number }> = {
  best: { quality: 0.92 },
  smaller: { quality: 0.75, maxSide: 2000 },
};

function PagePreview({ item, options, index }: { item: ListImage; options: PageOptions; index: number }) {
  const p = placeImage(item.width!, item.height!, options);
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  return (
    <figure className="w-24 shrink-0 sm:w-28">
      <div className="relative overflow-hidden border border-line-strong bg-white shadow-sm" style={{ aspectRatio: `${p.pageWidth} / ${p.pageHeight}` }}>
        <div
          className="absolute overflow-hidden"
          style={
            p.clip
              ? { left: pct(p.clip.x, p.pageWidth), bottom: pct(p.clip.y, p.pageHeight), width: pct(p.clip.width, p.pageWidth), height: pct(p.clip.height, p.pageHeight) }
              : { inset: 0 }
          }
        >
          {item.thumbUrl ? (
            <img
              src={item.thumbUrl}
              alt=""
              className="absolute max-w-none"
              style={
                p.clip
                  ? {
                      left: pct(p.x - p.clip.x, p.clip.width),
                      bottom: pct(p.y - p.clip.y, p.clip.height),
                      width: pct(p.width, p.clip.width),
                      height: pct(p.height, p.clip.height),
                    }
                  : { left: pct(p.x, p.pageWidth), bottom: pct(p.y, p.pageHeight), width: pct(p.width, p.pageWidth), height: pct(p.height, p.pageHeight) }
              }
            />
          ) : null}
        </div>
      </div>
      <figcaption className="mt-1 text-center text-xs text-muted">Page {index + 1}</figcaption>
    </figure>
  );
}

export function PdfTool({ config }: { config: PdfToolConfig }) {
  const { tool, accept, prompt, maxFiles } = config;
  useToolOpen(tool);
  const list = useImageList({ tool, accept, max: maxFiles });
  const [size, setSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<Orientation>("auto");
  const [fit, setFit] = useState<Fit>("fit");
  const [margin, setMargin] = useState<Margin>("small");
  const [quality, setQuality] = useState<Quality>("best");
  const [limit, setLimit] = useState<Limit>("none");
  const limitBytes = limit === "none" ? null : Number(limit) * KB;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<ImageToolError | null>(null);
  const [result, setResult] = useState<{ key: string; blob: Blob; pages: number; passthrough: number; limitBytes: number | null; overLimit: boolean } | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelRef.current?.(), []);

  const options: PageOptions = { size, orientation, fit, margin: MARGINS[margin] };
  const key = JSON.stringify([list.ready.map((item) => item.id), options, limitBytes ? null : quality, limitBytes]);
  const current = result?.key === key ? result : null;
  const url = useObjectUrl(current?.blob ?? null);

  const create = async () => {
    const images = list.ready;
    if (images.length === 0) return;
    cancelRef.current?.();
    const pool = createProcessingPool(1);
    let cancelled = false;
    cancelRef.current = () => {
      cancelled = true;
      pool.dispose();
    };
    setBusy(true);
    setError(null);
    setProgress(0);
    track("processing_started", { tool, count_bucket: countBucket(images.length) });
    try {
      if (limitBytes) {
        if (images.length > LIMIT_MAX_IMAGES) {
          throw new ImageToolError("PDF_FAILED", `A size limit works with up to ${LIMIT_MAX_IMAGES} images. Make the PDF without a limit, then reduce it with Compress PDF.`);
        }
        const longest = Math.max(...images.map((item) => Math.max(item.width ?? 0, item.height ?? 0)), 1);
        const search = await searchTargetSize(
          async (scale, q) => {
            const pages: { image: PdfImage; placement: ReturnType<typeof placeImage> }[] = [];
            for (const item of images) {
              const long = Math.max(item.width ?? 1, item.height ?? 1);
              const prepared = await pool.run({ kind: "pdf-image", sourceId: item.id, file: item.file, noCache: true, quality: q, maxSide: Math.max(16, Math.round(long * scale)), forceEncode: true });
              const shown = displaySize(prepared.width, prepared.height, prepared.orientation);
              pages.push({
                image: { jpeg: prepared.jpeg, width: prepared.width, height: prepared.height, colorSpace: prepared.colorSpace, orientation: prepared.orientation },
                placement: placeImage(shown.width, shown.height, options),
              });
            }
            return { blob: buildPdf(pages), width: 0, height: 0 };
          },
          { targetBytes: limitBytes, allowResize: true, minScale: Math.min(1, LIMIT_MIN_SIDE / longest), onProgress: setProgress },
        );
        if (cancelled) return;
        setResult({ key, blob: search.attempt.blob, pages: images.length, passthrough: 0, limitBytes, overLimit: search.outcome !== "met" });
        track("pdf_created", { tool, count_bucket: countBucket(images.length), mode: `${size}-${fit}-limit`, target_kb: Number(limit) });
        return;
      }
      const pages: { image: PdfImage; placement: ReturnType<typeof placeImage> }[] = [];
      let passthrough = 0;
      for (const [index, item] of images.entries()) {
        const prepared = await pool.run({ kind: "pdf-image", sourceId: item.id, file: item.file, noCache: true, ...QUALITY[quality] });
        if (prepared.passthrough) passthrough++;
        const shown = displaySize(prepared.width, prepared.height, prepared.orientation);
        pages.push({
          image: { jpeg: prepared.jpeg, width: prepared.width, height: prepared.height, colorSpace: prepared.colorSpace, orientation: prepared.orientation },
          placement: placeImage(shown.width, shown.height, options),
        });
        setProgress((index + 1) / images.length);
      }
      let blob: Blob;
      try {
        blob = buildPdf(pages);
      } catch {
        throw new ImageToolError("PDF_FAILED", "The PDF couldn't be created. Try fewer or smaller images.");
      }
      if (cancelled) return;
      setResult({ key, blob, pages: pages.length, passthrough, limitBytes: null, overLimit: false });
      track("pdf_created", { tool, count_bucket: countBucket(pages.length), mode: `${size}-${fit}` });
    } catch (caught) {
      if (cancelled || isAbortError(caught)) return;
      const normalized = toImageToolError(caught);
      setError(normalized);
      track("processing_failed", { tool, error_code: normalized.code });
    } finally {
      pool.dispose();
      if (!cancelled) {
        cancelRef.current = null;
        setBusy(false);
        setProgress(null);
      }
    }
  };

  const reset = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    list.clear();
    setResult(null);
    setError(null);
    setBusy(false);
  };

  if (list.items.length === 0) {
    return <ImageDropzone accept={accept} onFiles={list.add} prompt={prompt} />;
  }

  const invalid = list.items.filter((item) => item.status === "invalid").length;

  return (
    <div className="space-y-6">
      <ImageListView list={list} accept={accept} itemLabel="Page" />

      <section aria-label="PDF settings" className="space-y-5 rounded-lg border border-line bg-canvas p-4 shadow-sm sm:p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Segmented<PageSize>
            legend="Page size"
            value={size}
            onChange={setSize}
            options={[
              { value: "a4", label: "A4" },
              { value: "letter", label: "US Letter" },
            ]}
          />
          <Segmented<Orientation>
            legend="Orientation"
            value={orientation}
            onChange={setOrientation}
            hint="Auto turns each page to match its image."
            options={[
              { value: "auto", label: "Auto" },
              { value: "portrait", label: "Portrait" },
              { value: "landscape", label: "Landscape" },
            ]}
          />
          <Segmented<Fit>
            legend="Image on the page"
            value={fit}
            onChange={setFit}
            hint={fit === "fit" ? "The whole image is visible." : "Fills the page; edges may be cropped."}
            options={[
              { value: "fit", label: "Fit" },
              { value: "fill", label: "Fill" },
            ]}
          />
          <Segmented<Margin>
            legend="Margin"
            value={margin}
            onChange={setMargin}
            options={[
              { value: "none", label: "None" },
              { value: "small", label: "Small (1 cm)" },
              { value: "large", label: "Large (2 cm)" },
            ]}
          />
          <Segmented<Limit>
            legend="Maximum PDF size"
            value={limit}
            onChange={setLimit}
            hint={
              limitBytes
                ? `The PDF will be ${formatBytes(limitBytes)} or less: image quality, then size, are lowered only as far as needed.`
                : "For upload forms with a limit, such as 200 KB."
            }
            options={[{ value: "none", label: "No limit" }, ...LIMITS_KB.map((value) => ({ value, label: limitLabel(value) }))]}
          />
          {limitBytes ? null : (
          <Segmented<Quality>
            legend="File size"
            value={quality}
            onChange={setQuality}
            hint={
              quality === "best"
                ? "JPG photos are embedded unchanged; other formats are saved as high-quality JPG."
                : "Reduces large images to 2000 px and re-compresses them, for email and upload limits."
            }
            options={[
              { value: "best", label: "Best quality" },
              { value: "smaller", label: "Smaller file" },
            ]}
          />
          )}
        </div>

        {list.ready.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-ink">Layout preview</p>
            <div className="mt-2 flex gap-3 overflow-x-auto pb-2" aria-label="Page layout preview" role="group">
              {list.ready.slice(0, 12).map((item, index) => (
                <PagePreview key={item.id} item={item} options={options} index={index} />
              ))}
              {list.ready.length > 12 ? <p className="self-center text-sm text-muted">+ {list.ready.length - 12} more</p> : null}
            </div>
          </div>
        ) : null}

        {invalid > 0 ? (
          <Alert tone="warning" title={`${invalid} ${invalid === 1 ? "file was" : "files were"} skipped`}>
            Only the images marked as ready are added to the PDF. Remove skipped files or replace them with supported images.
          </Alert>
        ) : null}
        {error ? (
          <Alert tone="error" title="The PDF couldn't be created">
            {error.message}
          </Alert>
        ) : null}

        <ActionButton onClick={create} busy={busy} busyLabel="Creating PDF…" progress={progress} disabled={list.ready.length === 0 || list.checking}>
          {current ? "Create PDF again" : `Create PDF (${list.ready.length} ${list.ready.length === 1 ? "page" : "pages"})`}
        </ActionButton>
        <button type="button" onClick={reset} className="text-sm font-medium text-accent underline">
          Start over
        </button>
      </section>

      {current && url ? (
        <section aria-labelledby="result-heading" className="rounded-lg border border-line bg-canvas shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
            <div>
              <h2 id="result-heading" tabIndex={-1} className="text-lg font-bold text-ink outline-none">
                Your PDF is ready
              </h2>
              <p className="mt-0.5 text-sm text-muted" aria-live="polite">
                {current.pages} {current.pages === 1 ? "page" : "pages"} · {PAGE_SIZES[size].label} · {formatBytes(current.blob.size)}
                {current.passthrough > 0 ? ` · ${current.passthrough} JPG ${current.passthrough === 1 ? "image" : "images"} embedded without recompression` : ""}
                {current.limitBytes && !current.overLimit ? ` · within ${formatBytes(current.limitBytes)}` : ""}
              </p>
              {current.limitBytes && current.overLimit ? (
                <Alert tone="warning" title={`Couldn't get under ${formatBytes(current.limitBytes)}`}>
                  This is the smallest readable PDF for {current.pages} {current.pages === 1 ? "image" : "images"}. Use fewer images,
                  crop them closer to the page, or choose a larger limit.
                </Alert>
              ) : null}
            </div>
            <DownloadButton href={url} fileName={`${tool === "jpg-to-pdf" ? "jpg" : "photos"}-${current.pages}-pages.pdf`} label="Download PDF" tool={tool} outputFormat="PDF" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
