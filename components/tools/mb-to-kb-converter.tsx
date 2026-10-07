"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { FieldLabel, inputClass } from "@/components/controls/fields";
import { track } from "@/lib/analytics";
import { convertSize, formatAmount, parseAmount, UNIT_NAMES, type SizeUnit } from "@/lib/units/file-size";
import { formatBytes, sizeBucket } from "@/lib/utils/format";
import { useToolOpen } from "./hooks";

const TOOL = "mb-to-kb-converter" as const;
const FROM_UNITS: SizeUnit[] = ["MB", "KB", "GB", "B", "MiB", "KiB", "GiB"];

/** Links to the tool that matches a size in KB, for people converting a form's limit. */
const KB_PAGES: { kb: number; path: string }[] = [
  { kb: 20, path: "/tools/20kb-photo" },
  { kb: 50, path: "/tools/50kb-photo" },
  { kb: 100, path: "/tools/100kb-photo" },
  { kb: 200, path: "/tools/200kb-photo" },
];

export function MbToKbConverter() {
  useToolOpen(TOOL);
  const amountId = useId();
  const unitId = useId();
  const fileId = useId();
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<SizeUnit>("MB");
  const [file, setFile] = useState<{ size: number } | null>(null);
  const tracked = useRef(false);

  const value = parseAmount(amount);
  const valid = Number.isFinite(value) && value >= 0 && value < 1e15;

  // Count one conversion per page view, after the user has typed something.
  useEffect(() => {
    if (!tracked.current && valid && (amount !== "1" || unit !== "MB")) {
      tracked.current = true;
      track("unit_converted", { tool: TOOL, mode: unit });
    }
  }, [amount, unit, valid]);

  const kbDecimal = valid ? convertSize(value, unit, "KB") : NaN;
  const kbBinary = valid ? convertSize(value, unit, "KiB") : NaN;
  const nearest = valid ? KB_PAGES.find((page) => Math.abs(kbBinary - page.kb) < 0.5 || Math.abs(kbDecimal - page.kb) < 0.5) : undefined;

  const rows: { label: string; unit: SizeUnit }[] = [
    { label: "Kilobytes (decimal)", unit: "KB" },
    { label: "Kibibytes (binary)", unit: "KiB" },
    { label: "Megabytes (decimal)", unit: "MB" },
    { label: "Mebibytes (binary)", unit: "MiB" },
    { label: "Bytes", unit: "B" },
  ];

  return (
    <div className="space-y-6">
      <section aria-label="Converter" className="rounded-lg border border-line bg-canvas p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <FieldLabel htmlFor={amountId}>Amount</FieldLabel>
            <input
              id={amountId}
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={!valid}
              aria-describedby={`${amountId}-error`}
              className={`${inputClass} mt-1.5 text-lg`}
            />
            {!valid ? (
              <p id={`${amountId}-error`} className="mt-1 text-sm font-medium text-danger">
                Enter a number, for example 2.5
              </p>
            ) : null}
          </div>
          <div>
            <FieldLabel htmlFor={unitId}>Unit</FieldLabel>
            <select id={unitId} value={unit} onChange={(event) => setUnit(event.target.value as SizeUnit)} className={`${inputClass} mt-1.5 text-lg`}>
              {FROM_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u} – {UNIT_NAMES[u]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 rounded-md bg-accent-soft px-4 py-3" aria-live="polite">
          {valid ? (
            <>
              <p className="text-2xl font-semibold tabular-nums text-accent-ink">
                {formatAmount(value)} {unit} = {formatAmount(kbDecimal)} KB
              </p>
              <p className="mt-1 text-sm tabular-nums text-ink-soft">
                or {formatAmount(kbBinary)} KiB if your system counts 1 KB as 1024 bytes
              </p>
            </>
          ) : (
            <p className="text-ink-soft">Enter an amount to convert.</p>
          )}
        </div>

        <div className="relative mt-5 overflow-x-auto">
          <table className="w-full min-w-[18rem] text-sm">
            <caption className="sr-only">
              {valid ? `${formatAmount(value)} ${unit}` : "The amount"} in every unit
            </caption>
            <tbody>
              {rows.map((row) => (
                <tr key={row.unit} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-ink">
                    {row.label}
                  </th>
                  <td className="py-2 text-right tabular-nums text-ink">
                    {valid ? formatAmount(convertSize(value, unit, row.unit)) : "—"} {row.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {nearest ? (
          <p className="mt-4 text-sm text-ink-soft">
            Need a photo under that limit?{" "}
            <Link href={nearest.path} className="font-medium text-accent underline">
              Resize a photo to {nearest.kb}KB
            </Link>
            .
          </p>
        ) : null}
      </section>

      <section aria-labelledby={`${fileId}-heading`} className="rounded-lg border border-line bg-canvas p-4 shadow-sm sm:p-5">
        <h2 id={`${fileId}-heading`} className="text-base font-semibold text-ink">
          How big is my file?
        </h2>
        <p className="mt-1 text-sm text-muted">Pick any file to see its exact size in bytes, KB and MB. Only the size is read; the file isn&apos;t opened or uploaded.</p>
        <label htmlFor={fileId} className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-md border border-line-strong px-4 text-sm font-medium text-ink hover:bg-surface has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
          Choose a file
          <input
            id={fileId}
            type="file"
            className="sr-only"
            onChange={(event) => {
              const picked = event.target.files?.[0];
              if (picked) {
                setFile({ size: picked.size });
                track("unit_converted", { tool: TOOL, mode: "file", size_bucket: sizeBucket(picked.size) });
              }
              event.target.value = "";
            }}
          />
        </label>
        {file ? (
          <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]" aria-live="polite">
            <dt className="font-medium text-ink">Exact size</dt>
            <dd className="tabular-nums text-ink-soft">{file.size.toLocaleString("en-US")} bytes</dd>
            <dt className="font-medium text-ink">Decimal</dt>
            <dd className="tabular-nums text-ink-soft">
              {formatAmount(file.size / 1000)} KB · {formatAmount(file.size / 1e6)} MB
            </dd>
            <dt className="font-medium text-ink">Binary</dt>
            <dd className="tabular-nums text-ink-soft">
              {formatAmount(file.size / 1024)} KiB · {formatAmount(file.size / 1048576)} MiB
            </dd>
            <dt className="font-medium text-ink">As our image tools show it</dt>
            <dd className="tabular-nums text-ink-soft">{formatBytes(file.size)} (1 KB = 1024 bytes, rounded up)</dd>
          </dl>
        ) : null}
      </section>
    </div>
  );
}
