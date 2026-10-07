"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/controls/alert";
import { buttonClass } from "@/components/controls/button";
import { Segmented } from "@/components/controls/fields";
import { ImageDropzone } from "@/components/image-uploader/image-dropzone";
import { track } from "@/lib/analytics";
import { createProcessingPool, isAbortError, newSourceId, type ProcessingPool } from "@/lib/image-processing/client";
import { toImageToolError } from "@/lib/image-processing/errors";
import type { ImageMime } from "@/lib/image-processing/formats";
import { validateImageFile } from "@/lib/image-processing/validate";
import { countBucket, formatBytes } from "@/lib/utils/format";
import { useToolOpen } from "./hooks";

const TOOL = "jpeg-to-jpg" as const;
const ACCEPT: ImageMime[] = ["image/jpeg"];
const MAX_FILES = 200;
const ACCEPT_ATTRIBUTE = "image/jpeg,image/pjpeg,.jpg,.jpeg,.jpe,.jfif,.pjpeg,.pjp";

type Mode = "rename" | "resave";

interface Item {
  id: string;
  file: File;
  status: "working" | "done" | "invalid";
  error?: string;
  output?: { blob: Blob; name: string; url: string; mode: Mode };
}

/** "photo.JPEG" → "photo.jpg"; names without a JPEG extension just get ".jpg" added. */
export function jpgName(name: string): string {
  const base = name.replace(/\.(jpe?g|jpe|jfif|pjpeg|pjp)$/i, "").replace(/[\\/:*?"<>|]+/g, "-").trim() || "image";
  return `${base}.jpg`;
}

export function JpegToJpgTool() {
  useToolOpen(TOOL);
  const [mode, setMode] = useState<Mode>("rename");
  const [items, setItems] = useState<Item[]>([]);
  const [zipping, setZipping] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const pool = useRef<ProcessingPool | null>(null);

  useEffect(
    () => () => {
      pool.current?.dispose();
      for (const item of itemsRef.current) if (item.output) URL.revokeObjectURL(item.output.url);
    },
    [],
  );

  const convert = (file: File, id: string, how: Mode) => {
    (async () => {
      try {
        await validateImageFile(file, {
          accept: ACCEPT,
          wrongFormatMessage: (detected) => `This file is actually a ${detected.replace("image/", "").toUpperCase()}, not a JPEG, so changing its extension to .jpg would make it invalid.`,
        });
        let blob: Blob;
        if (how === "rename") {
          // Same bytes, new name: nothing about the picture changes.
          blob = file.slice(0, file.size, "image/jpeg");
        } else {
          pool.current ??= createProcessingPool();
          const probe = await pool.current.run({ kind: "probe", sourceId: id, file, checkTransparency: false });
          const encoded = await pool.current.run({
            kind: "encode",
            sourceId: id,
            file,
            width: probe.width,
            height: probe.height,
            mime: "image/jpeg",
            quality: 0.92,
            background: "#ffffff",
            noCache: true,
          });
          blob = encoded.blob;
        }
        if (!itemsRef.current.some((item) => item.id === id)) return;
        const output = { blob, name: jpgName(file.name), url: URL.createObjectURL(blob), mode: how };
        setItems((list) => list.map((item) => (item.id === id ? { ...item, status: "done", output } : item)));
      } catch (caught) {
        if (isAbortError(caught)) return;
        const message = toImageToolError(caught).message;
        setItems((list) => list.map((item) => (item.id === id ? { ...item, status: "invalid", error: message } : item)));
      }
    })();
  };

  const add = (files: File[]) => {
    const room = MAX_FILES - itemsRef.current.length;
    const accepted = files.slice(0, Math.max(0, room));
    const added: Item[] = accepted.map((file) => ({ id: newSourceId(), file, status: "working" }));
    setItems((list) => [...list, ...added]);
    track("image_uploaded", { tool: TOOL, count_bucket: countBucket(added.length) });
    track("processing_started", { tool: TOOL, mode, count_bucket: countBucket(added.length) });
    for (const item of added) convert(item.file, item.id, mode);
    // Completion is reported once the batch settles (see effect below).
  };

  const done = items.filter((item) => item.status === "done");
  const working = items.some((item) => item.status === "working");
  const reported = useRef(0);
  useEffect(() => {
    if (!working && done.length > reported.current) {
      track("jpeg_converted", { tool: TOOL, mode, count_bucket: countBucket(done.length - reported.current) });
      reported.current = done.length;
    }
  }, [working, done.length, mode]);

  const changeMode = (next: Mode) => {
    setMode(next);
    // Redo existing files in the new mode so the downloads always match the setting shown.
    setItems((list) =>
      list.map((item) => {
        if (item.output) URL.revokeObjectURL(item.output.url);
        return item.status === "invalid" ? item : { ...item, status: "working", output: undefined };
      }),
    );
    reported.current = 0;
    for (const item of itemsRef.current) if (item.status !== "invalid") convert(item.file, item.id, next);
  };

  const clear = () => {
    pool.current?.dispose();
    pool.current = null;
    for (const item of itemsRef.current) if (item.output) URL.revokeObjectURL(item.output.url);
    setItems([]);
    reported.current = 0;
  };

  const downloadZip = async () => {
    setZipError(null);
    setZipping(true);
    try {
      const { createZip, safeZipName, uniqueNames } = await import("@/lib/zip/zip");
      const names = uniqueNames(done.map((item) => safeZipName(item.output!.name)));
      const zip = await createZip(done.map((item, index) => ({ name: names[index], blob: item.output!.blob })));
      const url = URL.createObjectURL(zip);
      const link = document.createElement("a");
      link.href = url;
      link.download = "jpg-files.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      track("download_clicked", { tool: TOOL, output_format: "ZIP", count_bucket: countBucket(done.length) });
    } catch (caught) {
      setZipError(caught instanceof Error && caught.name === "ZipError" ? caught.message : "The ZIP file couldn't be created. Download the files one by one instead.");
    } finally {
      setZipping(false);
    }
  };

  const modeControl = (
    <Segmented<Mode>
      legend="Conversion"
      value={mode}
      onChange={changeMode}
      hint={
        mode === "rename"
          ? "Keeps the file exactly as it is (same picture, same quality, same size) and only changes the extension to .jpg."
          : "Saves a fresh JPG at 92% quality: applies the phone's rotation, removes metadata such as location, and may change the size."
      }
      options={[
        { value: "rename", label: "Change extension only" },
        { value: "resave", label: "Re-save as new JPG" },
      ]}
    />
  );

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-line bg-canvas p-4 shadow-sm sm:p-5">{modeControl}</div>
        <ImageDropzone accept={ACCEPT} onFiles={add} prompt="Drop .jpeg, .jfif or .jpe files" acceptOverride={{ attribute: ACCEPT_ATTRIBUTE, label: "JPEG, JPG, JFIF, JPE" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-canvas p-4 shadow-sm sm:p-5">{modeControl}</div>
      <section aria-labelledby="result-heading" className="rounded-lg border border-line bg-canvas shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2 id="result-heading" className="text-base font-semibold text-ink">
            {done.length} of {items.length} ready{working ? " · converting…" : ""}
          </h2>
          <div className="flex flex-wrap gap-2">
            {done.length > 1 ? (
              <button type="button" onClick={downloadZip} disabled={zipping || working} className={buttonClass("primary", "min-h-10 px-4 text-sm")}>
                {zipping ? "Creating ZIP…" : `Download all (${done.length}) as ZIP`}
              </button>
            ) : null}
            <label className={buttonClass("secondary", "min-h-10 cursor-pointer px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent")}>
              Add files
              <input
                type="file"
                multiple
                accept={ACCEPT_ATTRIBUTE}
                className="sr-only"
                onChange={(event) => {
                  const files = [...(event.target.files ?? [])];
                  if (files.length) add(files);
                  event.target.value = "";
                }}
              />
            </label>
            <button type="button" onClick={clear} className={buttonClass("ghost", "min-h-10 px-3 text-sm")}>
              Clear all
            </button>
          </div>
        </div>
        {zipError ? (
          <div className="px-4 pt-3 sm:px-5">
            <Alert tone="error" title="ZIP download failed">
              {zipError}
            </Alert>
          </div>
        ) : null}
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink" title={item.file.name}>
                  {item.file.name}
                  {item.output ? (
                    <>
                      <span className="text-muted" aria-hidden="true">
                        {" "}
                        →{" "}
                      </span>
                      <span className="sr-only"> becomes </span>
                      {item.output.name}
                    </>
                  ) : null}
                </p>
                <p className={`text-xs ${item.status === "invalid" ? "font-medium text-danger" : "text-muted"}`}>
                  {item.status === "working"
                    ? "Converting…"
                    : item.status === "invalid"
                      ? item.error
                      : item.output!.mode === "rename"
                        ? /\.jpg$/i.test(item.file.name)
                          ? `${formatBytes(item.output!.blob.size)} · already a .jpg file, nothing to change`
                          : `${formatBytes(item.output!.blob.size)} · identical picture, new extension`
                        : `${formatBytes(item.file.size)} → ${formatBytes(item.output!.blob.size)} · re-saved at 92%`}
                </p>
              </div>
              {item.output ? (
                <a
                  href={item.output.url}
                  download={item.output.name}
                  onClick={() => track("download_clicked", { tool: TOOL, output_format: "JPG" })}
                  className={buttonClass("secondary", "min-h-10 px-3 text-sm")}
                  aria-label={`Download ${item.output.name}`}
                >
                  Download
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
