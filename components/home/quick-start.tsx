"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/controls/button";
import { ImageDropzone } from "@/components/image-uploader/image-dropzone";
import { handOffFiles } from "@/lib/handoff";
import { acceptAttribute, type ImageMime } from "@/lib/image-processing/formats";
import { formatBytes } from "@/lib/utils/format";

const ACCEPT: ImageMime[] = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"];

type Kind = "jpg" | "png" | "webp" | "heic" | "gif" | "other";

interface Action {
  href: string;
  label: string;
  primary?: boolean;
}

/** A quick guess from the name and browser type; the tool itself validates the file properly. */
function kindOf(file: File): Kind {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (type === "image/gif" || name.endsWith(".gif")) return "gif";
  if (type.includes("heic") || type.includes("heif") || /\.(heic|heif)$/.test(name)) return "heic";
  if (type === "image/png" || name.endsWith(".png")) return "png";
  if (type === "image/webp" || name.endsWith(".webp")) return "webp";
  if (type === "image/jpeg" || /\.(jpe?g|jfif|jpe)$/.test(name)) return "jpg";
  return "other";
}

function actionsFor(kind: Kind): Action[] {
  if (kind === "gif") return [{ href: "/tools/resize-gif", label: "Resize GIF", primary: true }];
  if (kind === "heic") {
    return [
      { href: "/tools/heic-to-jpg", label: "Convert to JPG", primary: true },
      { href: "/tools/image-resizer", label: "Resize" },
      { href: "/tools/image-cropper", label: "Crop" },
      { href: "/tools/background-remover", label: "Remove background" },
    ];
  }
  const convert: Action =
    kind === "png"
      ? { href: "/tools/png-to-jpg", label: "Convert to JPG" }
      : kind === "webp"
        ? { href: "/tools/webp-to-jpg", label: "Convert to JPG" }
        : { href: "/tools/jpg-to-png", label: "Convert to PNG" };
  return [
    { href: "/tools/image-resizer", label: "Resize", primary: true },
    { href: "/tools/image-compressor", label: "Compress" },
    { href: "/tools/resize-image-to-kb", label: "Resize to KB" },
    convert,
    { href: "/tools/image-cropper", label: "Crop" },
    { href: "/tools/background-remover", label: "Remove background" },
  ];
}

/** Thumbnail of the chosen file; formats the browser can't show (HEIC) fall back to an icon. */
function FileThumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    setFailed(false);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return (
    <span className="checkerboard flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line">
      {url && !failed ? (
        <img src={url} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <svg width="24" height="24" viewBox="0 0 40 40" aria-hidden="true" className="text-accent">
          <rect x="5" y="8" width="30" height="24" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <circle cx="14" cy="16" r="2.5" fill="currentColor" />
          <path d="M5 27l9-8 7 6 5-4 9 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

/**
 * Homepage workbench. The chosen file stays in memory and is handed to the
 * tool the user picks, which opens it immediately. Nothing is uploaded.
 */
export function QuickStart() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-canvas shadow-lg">
      {!file ? (
        <div className="p-3 sm:p-4">
          <ImageDropzone
            accept={ACCEPT}
            onFile={setFile}
            acceptHandOff={false}
            prompt="Drop your image here"
            acceptOverride={{ attribute: acceptAttribute(ACCEPT), label: "JPG, PNG, WebP, HEIC, GIF" }}
          />
        </div>
      ) : (
        <div className="px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex items-center gap-4">
            <FileThumb file={file} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink" title={file.name}>
                {file.name}
              </p>
              <p className="text-sm text-muted">{formatBytes(file.size)} · ready, still on your device</p>
            </div>
          </div>
          <p className="mt-6 font-display text-lg font-bold text-ink" id="quick-start-actions">
            What do you want to do?
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-labelledby="quick-start-actions">
            {actionsFor(kindOf(file)).map((action) => (
              <li key={action.href}>
                <Link
                  href={action.href}
                  onClick={() => handOffFiles([file])}
                  className={buttonClass(action.primary ? "primary" : "secondary", "w-full")}
                >
                  {action.label}
                </Link>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setFile(null)} className="mt-5 text-sm font-medium text-accent hover:underline">
            Choose a different image
          </button>
        </div>
      )}
    </div>
  );
}
