/**
 * Records a print resolution (pixels per inch) in a JPEG's JFIF header, so a
 * 600 × 600 px photo saved at 300 DPI prints at 2 × 2 inches. Only header
 * bytes change; the image data is untouched.
 */
export async function setJpegDpi(blob: Blob, dpi: number): Promise<Blob> {
  const density = Math.round(Math.min(65535, Math.max(1, dpi)));
  const head = new Uint8Array(await blob.slice(0, 20).arrayBuffer());
  if (head.length < 4 || head[0] !== 0xff || head[1] !== 0xd8) return blob;

  const hasJfif =
    head.length >= 18 &&
    head[2] === 0xff &&
    head[3] === 0xe0 &&
    head[6] === 0x4a && // J
    head[7] === 0x46 && // F
    head[8] === 0x49 && // I
    head[9] === 0x46 && // F
    head[10] === 0x00;

  if (hasJfif) {
    const patched = head.slice(0, 18);
    patched[13] = 1; // Units: dots per inch
    patched[14] = density >> 8;
    patched[15] = density & 0xff;
    patched[16] = density >> 8;
    patched[17] = density & 0xff;
    return new Blob([patched, blob.slice(18)], { type: blob.type });
  }

  // No JFIF segment: insert one straight after the start-of-image marker.
  const app0 = Uint8Array.of(
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01,
    density >> 8, density & 0xff, density >> 8, density & 0xff, 0x00, 0x00,
  );
  return new Blob([head.slice(0, 2), app0, blob.slice(2)], { type: blob.type });
}

/** Reads the JFIF density, if present and expressed in DPI. Used by tests and the result view. */
export function readJpegDpi(bytes: Uint8Array): number | null {
  if (bytes.length < 18 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff || bytes[3] !== 0xe0) return null;
  if (bytes[13] !== 1) return null;
  return (bytes[14] << 8) | bytes[15];
}
