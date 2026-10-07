/**
 * File-size units. Decimal (SI) units step by 1000; binary (IEC) units step
 * by 1024. In everyday use "KB" and "MB" are used for both, which is why the
 * same file can show as 1.05 MB on one device and 1.00 MB on another.
 */
export type SizeUnit = "B" | "KB" | "MB" | "GB" | "KiB" | "MiB" | "GiB";

export const UNIT_BYTES: Record<SizeUnit, number> = {
  B: 1,
  KB: 1000,
  MB: 1000 ** 2,
  GB: 1000 ** 3,
  KiB: 1024,
  MiB: 1024 ** 2,
  GiB: 1024 ** 3,
};

export const UNIT_NAMES: Record<SizeUnit, string> = {
  B: "bytes",
  KB: "kilobytes (KB, 1000 bytes)",
  MB: "megabytes (MB, 1000 KB)",
  GB: "gigabytes (GB, 1000 MB)",
  KiB: "kibibytes (KiB, 1024 bytes)",
  MiB: "mebibytes (MiB, 1024 KiB)",
  GiB: "gibibytes (GiB, 1024 MiB)",
};

export function convertSize(value: number, from: SizeUnit, to: SizeUnit): number {
  return (value * UNIT_BYTES[from]) / UNIT_BYTES[to];
}

/** Parses user input such as "2.5", "2,5" or "1,048,576". Returns NaN for anything else. */
export function parseAmount(input: string): number {
  const text = input.trim().replace(/\s+/g, "");
  if (!text) return NaN;
  // A single comma followed by 1–2 digits is a decimal comma ("2,5"); otherwise commas group thousands.
  const normalised = /^\d+,\d{1,2}$/.test(text) ? text.replace(",", ".") : text.replace(/,(?=\d{3}(\D|$))/g, "");
  return /^\d*\.?\d+(e[+-]?\d+)?$/i.test(normalised) ? Number(normalised) : NaN;
}

/** Readable number: up to 6 significant digits, grouped thousands, no float noise. */
export function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  const digits = abs >= 1 ? Math.max(0, 6 - Math.floor(Math.log10(abs)) - 1) : 6 - Math.floor(Math.log10(abs)) - 1;
  const rounded = Number(value.toFixed(Math.min(12, Math.max(0, digits))));
  return rounded.toLocaleString("en-US", { maximumFractionDigits: Math.min(12, Math.max(0, digits)) });
}
