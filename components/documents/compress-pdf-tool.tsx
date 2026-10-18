"use client";

import { useState } from "react";
import { FieldLabel, inputClass, Segmented } from "@/components/controls/fields";
import { runDocumentRequest } from "@/lib/documents/client";
import { DocumentToolError } from "@/lib/documents/errors";
import { assertPdfHeader, documentFileName, DOC_LIMITS } from "@/lib/documents/validate";
import { formatBytes, formatExactBytes, KB, MB } from "@/lib/utils/format";
import { SingleFileConverter } from "./single-file-converter";

const PRESETS_KB = [100, 200, 300, 500, 1024];
const MIN_TARGET = 10 * KB;
const MAX_TARGET = 50 * MB;

type Unit = "KB" | "MB";

function presetLabel(kb: number): string {
  return kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB`;
}

function parseTarget(preset: string, custom: string, unit: Unit): { bytes: number | null; error: string | null } {
  if (preset !== "custom") return { bytes: Number(preset) * KB, error: null };
  const value = Number(custom.trim());
  if (!custom.trim()) return { bytes: null, error: "Enter a target size." };
  if (!Number.isFinite(value) || value <= 0) return { bytes: null, error: "Enter a positive number, such as 250." };
  const bytes = Math.floor(value * (unit === "MB" ? MB : KB));
  if (bytes < MIN_TARGET) return { bytes: null, error: "The smallest target is 10 KB." };
  if (bytes > MAX_TARGET) return { bytes: null, error: "The largest target is 50 MB." };
  return { bytes, error: null };
}

export function CompressPdfTool() {
  const [preset, setPreset] = useState("200");
  const [custom, setCustom] = useState("");
  const [unit, setUnit] = useState<Unit>("KB");
  const target = parseTarget(preset, custom, unit);

  return (
    <SingleFileConverter
      tool="compress-pdf"
      accept=".pdf,application/pdf"
      hint={`PDF up to ${formatBytes(DOC_LIMITS.compressMaxBytes)} and ${DOC_LIMITS.compressMaxPages} pages`}
      prompt="Drop a PDF to compress"
      buttonLabel="Choose PDF file"
      inputLabel="PDF"
      outputLabel="compressed PDF"
      actionLabel={target.bytes ? `Compress to ${formatBytes(target.bytes)}` : "Compress PDF"}
      busyLabel="Compressing…"
      downloadLabel="Download PDF"
      settingsKey={String(target.bytes)}
      check={async (file) => {
        assertPdfHeader(new Uint8Array(await file.slice(0, 1024).arrayBuffer()), file.size, DOC_LIMITS.compressMaxBytes);
      }}
      convert={async (file, { signal, onProgress }) => {
        if (!target.bytes) throw new DocumentToolError("CONVERSION_FAILED", target.error ?? "Choose a target size.");
        const targetBytes = target.bytes;
        const result = await runDocumentRequest({ type: "compress-pdf", data: await file.arrayBuffer(), targetBytes }, { signal, onProgress, timeoutMs: 10 * 60_000 });
        if (result.type !== "compress-pdf") throw new DocumentToolError("CONVERSION_FAILED", "The compression didn't complete. Please try again.");
        const notes: string[] = [];
        if (result.method === "original" && result.outcome === "met") {
          notes.push(`This PDF is already ${formatBytes(result.originalBytes)}, within ${formatBytes(targetBytes)}, so it's returned unchanged.`);
        } else if (result.method === "images") {
          notes.push(
            `To reach this size, each page was saved as an image at about ${result.dpi} DPI. The pages look the same, but their text can no longer be selected or searched, links stop working, and fillable fields become part of the page image. Check the pages are readable before you upload it.`,
          );
        } else if (result.method === "resaved") {
          notes.push("Made smaller without changing any content: text, links and quality are exactly as they were.");
        }
        if (result.outcome === "too-small") {
          notes.push(
            `${formatBytes(targetBytes)} couldn't be reached, even at the lowest resolution and quality this tool uses. This is the smallest version it could make. Try a larger target, or remove pages you don't need.`,
          );
        }
        return {
          blob: new Blob([result.bytes as BlobPart], { type: "application/pdf" }),
          fileName: documentFileName(file.name, "pdf", result.method === "original" ? "" : "compressed"),
          details: [
            `${result.pages} ${result.pages === 1 ? "page" : "pages"}`,
            result.method === "original" ? "unchanged" : `was ${formatBytes(result.originalBytes)}`,
          ],
          notes,
        };
      }}
      beforeConvert={
        <div className="space-y-3">
          <Segmented<string>
            legend="Target file size"
            value={preset}
            onChange={setPreset}
            options={[...PRESETS_KB.map((kb) => ({ value: String(kb), label: presetLabel(kb) })), { value: "custom", label: "Custom" }]}
          />
          {preset === "custom" ? (
            <div className="flex max-w-xs items-end gap-2">
              <div className="flex-1">
                <FieldLabel htmlFor="pdf-target-custom">Custom size</FieldLabel>
                <input
                  id="pdf-target-custom"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="e.g. 250"
                  value={custom}
                  onChange={(event) => setCustom(event.target.value)}
                  aria-invalid={Boolean(target.error)}
                  aria-describedby="pdf-target-help"
                  className={`${inputClass} mt-1.5`}
                />
              </div>
              <div>
                <label htmlFor="pdf-target-unit" className="sr-only">
                  Unit
                </label>
                <select id="pdf-target-unit" value={unit} onChange={(event) => setUnit(event.target.value as Unit)} className={`${inputClass} w-24`}>
                  <option value="KB">KB</option>
                  <option value="MB">MB</option>
                </select>
              </div>
            </div>
          ) : null}
          <p id="pdf-target-help" className={`text-sm ${target.error ? "font-medium text-danger-ink" : "text-muted"}`}>
            {target.error ?? `The PDF will be ${formatBytes(target.bytes ?? 0)} or less (${formatExactBytes(target.bytes ?? 0)}). Sizes use 1 KB = 1,024 bytes.`}
          </p>
        </div>
      }
    />
  );
}
