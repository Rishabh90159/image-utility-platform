"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/controls/alert";
import { Segmented } from "@/components/controls/fields";
import { DownloadButton } from "@/components/download-button/download-button";
import { setJpegDpi } from "@/lib/image-processing/jpeg-dpi";
import { buildPdf } from "@/lib/pdf/pdf-writer";
import { layoutSheet, mmToPoints, SHEET_PAPERS, type SheetLayout, type SheetPaper } from "@/lib/presets/print-sheet";
import type { ToolId } from "@/lib/tools/registry";
import { useObjectUrl } from "./hooks";

/** Sheets are drawn at photo-lab resolution, whatever DPI the single photo uses. */
const SHEET_DPI = 300;

async function renderSheet(photo: Blob, photoMm: { width: number; height: number }, layout: SheetLayout): Promise<{ jpg: Blob; pdf: Blob }> {
  const px = (mm: number) => Math.round((mm / 25.4) * SHEET_DPI);
  const canvas = document.createElement("canvas");
  canvas.width = px(layout.width);
  canvas.height = px(layout.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No canvas");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const bitmap = await createImageBitmap(photo);
  const w = px(photoMm.width);
  const h = px(photoMm.height);
  // A light guide just outside each photo shows where to cut without touching the photo itself.
  context.strokeStyle = "#c4c4c4";
  context.lineWidth = 1;
  for (const position of layout.positions) {
    const x = px(position.x);
    const y = px(position.y);
    context.drawImage(bitmap, x, y, w, h);
    context.strokeRect(x - 2.5, y - 2.5, w + 5, h + 5);
  }
  bitmap.close();
  const encoded = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
  canvas.width = 0;
  canvas.height = 0;
  if (!encoded) throw new Error("Encoding failed");
  const jpg = await setJpegDpi(encoded, SHEET_DPI);
  const pageWidth = mmToPoints(layout.width);
  const pageHeight = mmToPoints(layout.height);
  const pdf = buildPdf([
    {
      image: { jpeg: jpg, width: px(layout.width), height: px(layout.height), colorSpace: "DeviceRGB" },
      placement: { pageWidth, pageHeight, x: 0, y: 0, width: pageWidth, height: pageHeight, clip: null },
    },
  ]);
  return { jpg, pdf };
}

/**
 * Several copies of a finished passport photo on 4 × 6 in or A4 paper, as a
 * JPG for photo shops and a PDF for printing at home at actual size.
 */
export function PrintSheet({ tool, photo, widthPx, heightPx, dpi, baseName }: { tool: ToolId; photo: Blob; widthPx: number; heightPx: number; dpi: number; baseName: string }) {
  const [paper, setPaper] = useState<SheetPaper>("4x6");
  const photoMm = { width: (widthPx / dpi) * 25.4, height: (heightPx / dpi) * 25.4 };
  const layout = layoutSheet(photoMm.width, photoMm.height, paper);
  const key = `${paper}-${widthPx}x${heightPx}@${dpi}`;
  const [sheet, setSheet] = useState<{ key: string; photo: Blob; jpg: Blob; pdf: Blob } | null>(null);
  const [failed, setFailed] = useState(false);
  const current = sheet && sheet.key === key && sheet.photo === photo ? sheet : null;
  const jpgUrl = useObjectUrl(current?.jpg ?? null);
  const pdfUrl = useObjectUrl(current?.pdf ?? null);

  useEffect(() => {
    if (layout.count === 0) return;
    let cancelled = false;
    setFailed(false);
    renderSheet(photo, photoMm, layout)
      .then((made) => {
        if (!cancelled) setSheet({ key, photo, ...made });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // layout and photoMm are derived from key and photo.
  }, [key, photo]);

  const sizeLabel = `${photoMm.width.toFixed(0)} × ${photoMm.height.toFixed(0)} mm`;
  const name = `${baseName}-${layout.count}-photos-${paper}`;

  return (
    <section aria-labelledby="print-sheet-heading" className="space-y-4 rounded-lg border border-line bg-canvas p-4 shadow-sm sm:p-5">
      <div>
        <h3 id="print-sheet-heading" className="text-base font-bold text-ink">
          Print several copies on one sheet
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          For applications that want printed photos. Print the JPG at a photo shop, or the PDF at home at actual size (100%, not
          &ldquo;fit to page&rdquo;), then cut along the light grey guides.
        </p>
      </div>
      <Segmented<SheetPaper>
        legend="Paper"
        value={paper}
        onChange={setPaper}
        options={(Object.keys(SHEET_PAPERS) as SheetPaper[]).map((value) => ({ value, label: SHEET_PAPERS[value].label }))}
      />
      {layout.count === 0 ? (
        <Alert tone="warning">A {sizeLabel} photo doesn&apos;t fit on {SHEET_PAPERS[paper].label}.</Alert>
      ) : (
        <>
          <p className="text-sm font-medium text-ink" aria-live="polite">
            {layout.count} photos of {sizeLabel} on {SHEET_PAPERS[paper].label} ({layout.columns} × {layout.rows}
            {layout.landscape ? ", landscape" : ""})
          </p>
          {failed ? (
            <Alert tone="error">The sheet couldn&apos;t be created in this browser. Download the single photo instead.</Alert>
          ) : current && jpgUrl && pdfUrl ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <img
                src={jpgUrl}
                alt={`Preview: ${layout.count} copies of your photo on ${SHEET_PAPERS[paper].label}`}
                className="max-h-72 w-auto max-w-full self-start border border-line-strong bg-white shadow-sm"
              />
              <div className="flex flex-wrap gap-3">
                <DownloadButton href={jpgUrl} fileName={`${name}.jpg`} label="Download sheet (JPG)" tool={tool} outputFormat="JPG sheet" />
                <DownloadButton href={pdfUrl} fileName={`${name}.pdf`} label="Download sheet (PDF)" tool={tool} outputFormat="PDF sheet" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Preparing the sheet…</p>
          )}
        </>
      )}
    </section>
  );
}
