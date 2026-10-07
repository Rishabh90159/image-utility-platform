/**
 * Small JPEG parsing and editing helpers that work on the raw bytes, so a JPG
 * can be passed through (to a PDF, or renamed) without being re-encoded.
 */

export interface JpegInfo {
  width: number;
  height: number;
  /** 1 = greyscale, 3 = YCbCr/RGB, 4 = CMYK/YCCK. */
  components: number;
  progressive: boolean;
  /** EXIF orientation 1–8 (1 when absent). */
  orientation: number;
  /** True when an Adobe APP14 segment is present (affects how CMYK is stored). */
  adobe: boolean;
}

function u16(b: Uint8Array, i: number): number {
  return (b[i] << 8) | b[i + 1];
}

export function isJpeg(b: Uint8Array): boolean {
  return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

/** Reads the frame header and EXIF orientation. Returns null if the file isn't a well-formed JPEG header. */
export function readJpegInfo(b: Uint8Array): JpegInfo | null {
  if (!isJpeg(b)) return null;
  let i = 2;
  let orientation = 1;
  let adobe = false;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i++; // fill byte
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }
    const length = u16(b, i + 2);
    if (length < 2) return null;
    const body = i + 4;
    if (marker === 0xe1 && body + 6 <= b.length && String.fromCharCode(...b.subarray(body, body + 4)) === "Exif") {
      orientation = readExifOrientation(b, body + 6, Math.min(b.length, i + 2 + length)) ?? orientation;
    }
    if (marker === 0xee && body + 5 <= b.length && String.fromCharCode(...b.subarray(body, body + 5)) === "Adobe") adobe = true;
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (body + 6 > b.length) return null;
      return {
        height: u16(b, body + 1),
        width: u16(b, body + 3),
        components: b[body + 5],
        progressive: marker === 0xc2 || marker === 0xc6 || marker === 0xca || marker === 0xce,
        orientation,
        adobe,
      };
    }
    if (marker === 0xda) return null; // scan data before any frame header
    i += 2 + length;
  }
  return null;
}

function readExifOrientation(b: Uint8Array, tiff: number, end: number): number | null {
  if (tiff + 8 > end) return null;
  const little = b[tiff] === 0x49 && b[tiff + 1] === 0x49;
  const r16 = (o: number) => (little ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
  const r32 = (o: number) => (little ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16)) + b[o + 3] * 0x1000000 : b[o] * 0x1000000 + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]));
  const ifd = tiff + r32(tiff + 4);
  if (ifd + 2 > end) return null;
  const count = r16(ifd);
  for (let k = 0; k < count; k++) {
    const entry = ifd + 2 + k * 12;
    if (entry + 12 > end) return null;
    if (r16(entry) === 0x0112) {
      const value = r16(entry + 8);
      return value >= 1 && value <= 8 ? value : null;
    }
  }
  return null;
}

/** Largest payload of one COM segment (segment length field is 16-bit and includes itself). */
const MAX_COM_PAYLOAD = 65533;
const COM_OVERHEAD = 4;

/** Where padding can go: after the APPn segments, before the tables and frame header. */
function paddingOffset(b: Uint8Array): number {
  let i = 2;
  while (i + 4 <= b.length && b[i] === 0xff && b[i + 1] >= 0xe0 && b[i + 1] <= 0xef) i += 2 + u16(b, i + 2);
  return Math.min(i, b.length);
}

/**
 * Pads a JPEG to `targetBytes` with comment (COM) segments filled with spaces.
 * Decoders ignore comments, so the picture is pixel-for-pixel identical; only
 * the file gets bigger. The result is exactly `targetBytes` long, except that a
 * shortfall of 1–3 bytes can only be met by overshooting by up to 3 bytes.
 */
export function padJpeg(b: Uint8Array, targetBytes: number): Uint8Array {
  if (!isJpeg(b)) throw new Error("Not a JPEG");
  let extra = targetBytes - b.length;
  if (extra <= 0) return b;
  if (extra < COM_OVERHEAD) extra = COM_OVERHEAD;
  const payloads: number[] = [];
  const full = MAX_COM_PAYLOAD + COM_OVERHEAD;
  while (extra > 0) {
    if (extra >= full + COM_OVERHEAD || extra === full) {
      payloads.push(MAX_COM_PAYLOAD);
      extra -= full;
    } else if (extra > full) {
      // Too much for one segment, too little for a full one plus a minimal one: split evenly.
      const first = Math.floor(extra / 2);
      payloads.push(first - COM_OVERHEAD, extra - first - COM_OVERHEAD);
      extra = 0;
    } else {
      payloads.push(extra - COM_OVERHEAD);
      extra = 0;
    }
  }
  const total = payloads.reduce((sum, p) => sum + p + COM_OVERHEAD, 0);
  const at = paddingOffset(b);
  const out = new Uint8Array(b.length + total);
  out.set(b.subarray(0, at), 0);
  let o = at;
  for (const p of payloads) {
    out[o] = 0xff;
    out[o + 1] = 0xfe;
    out[o + 2] = (p + 2) >> 8;
    out[o + 3] = (p + 2) & 0xff;
    out.fill(0x20, o + 4, o + 4 + p);
    o += p + COM_OVERHEAD;
  }
  out.set(b.subarray(at), o);
  return out;
}
