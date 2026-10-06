import { CRC32_INIT, crc32Final, crc32Update } from "@/lib/utils/crc32";

/**
 * Minimal ZIP writer that runs in the browser.
 *
 * Images are already compressed, so entries are stored without further
 * compression ("store" method). That keeps it fast and lets the final Blob
 * reference each image Blob directly instead of copying it into a new buffer,
 * which matters when a batch holds hundreds of megabytes.
 */
export interface ZipEntry {
  /** File name inside the archive. Sanitize with `safeZipName` first. */
  name: string;
  blob: Blob;
  lastModified?: Date;
}

const MAX_ZIP_BYTES = 0xffffffff - 1;
const MAX_ENTRIES = 0xffff;
const READ_CHUNK = 4 * 1024 * 1024;
const encoder = new TextEncoder();

export class ZipError extends Error {
  override name = "ZipError";
}

export async function createZip(entries: ZipEntry[], onProgress?: (fraction: number) => void): Promise<Blob> {
  if (entries.length === 0) throw new ZipError("There are no files to add to the ZIP.");
  if (entries.length > MAX_ENTRIES) throw new ZipError("Too many files for one ZIP archive.");
  const total = entries.reduce((sum, entry) => sum + entry.blob.size, 0);
  if (total > MAX_ZIP_BYTES) throw new ZipError("These files are too large to combine into one ZIP. Download them individually instead.");

  const parts: BlobPart[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  let processed = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = await blobCrc32(entry.blob, (bytes) => {
      onProgress?.(Math.min(0.99, (processed + bytes) / Math.max(1, total)));
    });
    processed += entry.blob.size;
    const { time, date } = dosDateTime(entry.lastModified ?? new Date());
    const size = entry.blob.size;

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // Version needed: 2.0
    lv.setUint16(6, 0x0800, true); // Flags: file name is UTF-8
    lv.setUint16(8, 0, true); // Method: store
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);

    const header = new Uint8Array(46 + name.length);
    const cv = new DataView(header.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); // Made by: MS-DOS, 2.0
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    header.set(name, 46);

    parts.push(local, entry.blob);
    central.push(header);
    offset += local.length + size;
  }

  const centralSize = central.reduce((sum, header) => sum + header.length, 0);
  if (offset + centralSize + 22 > MAX_ZIP_BYTES) {
    throw new ZipError("These files are too large to combine into one ZIP. Download them individually instead.");
  }
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  onProgress?.(1);
  return new Blob([...parts, ...(central as BlobPart[]), end], { type: "application/zip" });
}

async function blobCrc32(blob: Blob, onBytes: (bytes: number) => void): Promise<number> {
  let crc = CRC32_INIT;
  for (let start = 0; start < blob.size; start += READ_CHUNK) {
    const chunk = new Uint8Array(await blob.slice(start, start + READ_CHUNK).arrayBuffer());
    crc = crc32Update(crc, chunk);
    onBytes(Math.min(blob.size, start + READ_CHUNK));
  }
  return crc32Final(crc);
}

/** MS-DOS date/time fields (local time, 2-second precision, years 1980–2107). */
export function dosDateTime(when: Date): { time: number; date: number } {
  const year = Math.min(2107, Math.max(1980, when.getFullYear()));
  return {
    time: (when.getHours() << 11) | (when.getMinutes() << 5) | Math.floor(when.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate(),
  };
}

const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

/**
 * Makes a file name safe to place in a ZIP: no folders, no "..", no characters
 * that are invalid on Windows, macOS or Linux, and a sensible length. Files can
 * therefore never be extracted outside the folder the user chooses.
 */
export function safeZipName(name: string, fallback = "image"): string {
  const lastDot = name.lastIndexOf(".");
  const rawBase = lastDot > 0 ? name.slice(0, lastDot) : name;
  const rawExt = lastDot > 0 ? name.slice(lastDot + 1) : "";
  const clean = (value: string) =>
    value
      // Path separators, control characters and characters Windows forbids.
      .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g, "-")
      .replace(/\.{2,}/g, ".")
      .replace(/^[.\s-]+|[.\s-]+$/g, "")
      .trim();
  let base = clean(rawBase).slice(0, 100) || fallback;
  if (RESERVED_WINDOWS_NAMES.test(base)) base = `${base}-file`;
  const ext = clean(rawExt).replace(/[^a-z0-9]/gi, "").slice(0, 10).toLowerCase();
  return ext ? `${base}.${ext}` : base;
}

/** Gives duplicate names a " (2)", " (3)"… suffix. Comparison ignores case, as Windows and macOS do. */
export function uniqueNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    let candidate = name;
    for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${base} (${n})${ext}`;
    used.add(candidate.toLowerCase());
    return candidate;
  });
}
