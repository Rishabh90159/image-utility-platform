"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Alert } from "@/components/controls/alert";
import { buttonClass } from "@/components/controls/button";
import { track } from "@/lib/analytics";
import { createProcessingPool, isAbortError, newSourceId, type ProcessingPool } from "@/lib/image-processing/client";
import { toImageToolError } from "@/lib/image-processing/errors";
import { acceptAttribute, FORMATS, type ImageMime } from "@/lib/image-processing/formats";
import { validateImageFile } from "@/lib/image-processing/validate";
import type { ToolId } from "@/lib/tools/registry";
import { countBucket, formatBytes, formatDimensions } from "@/lib/utils/format";

/**
 * An ordered list of images for tools that combine several files (PDF,
 * merge). Each file is validated by its content, measured and given a small
 * thumbnail in a worker; the list can be reordered and trimmed.
 */
export interface ListImage {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "checking" | "ready" | "invalid";
  mime?: ImageMime;
  width?: number;
  height?: number;
  thumbUrl?: string;
  error?: string;
}

const THUMB = 160;

export function useImageList({ tool, accept, max }: { tool: ToolId; accept: ImageMime[]; max: number }) {
  const [items, setItems] = useState<ListImage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const pool = useRef<ProcessingPool | null>(null);

  useEffect(
    () => () => {
      pool.current?.dispose();
      for (const item of itemsRef.current) if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
    },
    [],
  );

  const add = useCallback(
    (files: File[]) => {
      setNotice(null);
      const room = max - itemsRef.current.length;
      if (room <= 0) {
        setNotice(`You can add up to ${max} images.`);
        return;
      }
      const accepted = files.slice(0, room);
      if (files.length > room) setNotice(`Only the first ${room} were added: the limit is ${max} images.`);
      const added: ListImage[] = accepted.map((file) => ({ id: newSourceId(), file, name: file.name || "image", size: file.size, status: "checking" }));
      setItems((list) => [...list, ...added]);
      track("image_uploaded", { tool, count_bucket: countBucket(added.length) });
      pool.current ??= createProcessingPool();
      for (const item of added) {
        (async () => {
          try {
            const { mime } = await validateImageFile(item.file, { accept });
            const probe = await pool.current!.run({ kind: "probe", sourceId: item.id, file: item.file, checkTransparency: false, thumbnail: THUMB, noCache: true });
            if (!itemsRef.current.some((entry) => entry.id === item.id)) return;
            const thumbUrl = probe.thumbnail ? URL.createObjectURL(probe.thumbnail) : undefined;
            setItems((list) => list.map((entry) => (entry.id === item.id ? { ...entry, status: "ready", mime, width: probe.width, height: probe.height, thumbUrl } : entry)));
          } catch (caught) {
            if (isAbortError(caught)) return;
            const message = toImageToolError(caught).message;
            setItems((list) => list.map((entry) => (entry.id === item.id ? { ...entry, status: "invalid", error: message } : entry)));
          }
        })();
      }
    },
    [accept, max, tool],
  );

  const remove = useCallback((id: string) => {
    setItems((list) => {
      const item = list.find((entry) => entry.id === id);
      if (item?.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
      return list.filter((entry) => entry.id !== id);
    });
  }, []);

  const move = useCallback((id: string, delta: number) => {
    setItems((list) => {
      const index = list.findIndex((entry) => entry.id === id);
      const to = index + delta;
      if (index < 0 || to < 0 || to >= list.length) return list;
      const next = [...list];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    for (const item of itemsRef.current) if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
    setItems([]);
    setNotice(null);
  }, []);

  const ready = items.filter((item) => item.status === "ready");
  const checking = items.some((item) => item.status === "checking");
  return { items, ready, checking, notice, add, remove, move, clear };
}

/** The list itself, with move and remove buttons that work by keyboard and screen reader. */
export function ImageListView({
  list,
  accept,
  itemLabel,
}: {
  list: ReturnType<typeof useImageList>;
  accept: ImageMime[];
  /** e.g. "Page" or "Image" */
  itemLabel: string;
}) {
  const inputId = useId();
  const { items, notice, remove, move, add, clear } = list;
  const [announcement, setAnnouncement] = useState("");

  const moveAndAnnounce = (id: string, index: number, delta: number) => {
    move(id, delta);
    setAnnouncement(`${items[index].name} moved to position ${index + delta + 1} of ${items.length}.`);
  };

  return (
    <section aria-label="Selected images" className="rounded-lg border border-line bg-canvas shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-ink">
          {items.length} {items.length === 1 ? "image" : "images"}
          <span className="font-normal text-muted"> · in this order</span>
        </p>
        <div className="flex gap-2">
          <input
            id={inputId}
            type="file"
            multiple
            accept={acceptAttribute(accept)}
            className="peer sr-only"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              if (files.length) add(files);
              event.target.value = "";
            }}
          />
          <label
            htmlFor={inputId}
            className={buttonClass("secondary", "min-h-10 cursor-pointer px-3 text-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent")}
          >
            Add images
          </label>
          <button type="button" onClick={clear} className={buttonClass("ghost", "min-h-10 px-3 text-sm")}>
            Clear all
          </button>
        </div>
      </div>
      {notice ? (
        <div className="px-4 pt-3 sm:px-5">
          <Alert tone="warning">{notice}</Alert>
        </div>
      ) : null}
      <ol className="divide-y divide-line">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
            <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted" aria-hidden="true">
              {index + 1}
            </span>
            <div className="checkerboard flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-line">
              {item.thumbUrl ? <img src={item.thumbUrl} alt="" className="max-h-full max-w-full object-contain" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink" title={item.name}>
                <span className="sr-only">
                  {itemLabel} {index + 1}:{" "}
                </span>
                {item.name}
              </p>
              <p className={`text-xs ${item.status === "invalid" ? "font-medium text-danger" : "text-muted"}`}>
                {item.status === "checking"
                  ? "Checking…"
                  : item.status === "invalid"
                    ? `Skipped: ${item.error}`
                    : `${FORMATS[item.mime!].label} · ${formatDimensions(item.width!, item.height!)} · ${formatBytes(item.size)}`}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => moveAndAnnounce(item.id, index, -1)}
                disabled={index === 0}
                aria-label={`Move ${item.name} up`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line-strong text-ink-soft hover:bg-surface disabled:opacity-40"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3 9l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveAndAnnounce(item.id, index, 1)}
                disabled={index === items.length - 1}
                aria-label={`Move ${item.name} down`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line-strong text-ink-soft hover:bg-surface disabled:opacity-40"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  remove(item.id);
                  setAnnouncement(`${item.name} removed.`);
                }}
                aria-label={`Remove ${item.name}`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line-strong text-ink-soft hover:bg-surface"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
