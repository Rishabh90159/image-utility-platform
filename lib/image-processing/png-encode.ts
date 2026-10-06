import { crc32 } from "@/lib/utils/crc32";

/**
 * Minimal indexed-colour PNG encoder (colour type 3) using the browser's
 * built-in CompressionStream for zlib/deflate, so no compression library is
 * shipped to the client.
 */
export function canEncodeIndexedPng(): boolean {
  return typeof CompressionStream !== "undefined";
}

export async function encodeIndexedPng(
  width: number,
  height: number,
  indices: Uint8Array,
  palette: Uint8Array,
  colorCount: number,
): Promise<Blob> {
  // Order palette entries so that translucent ones come first: the tRNS chunk
  // then only needs to list those entries.
  const order = Array.from({ length: colorCount }, (_, i) => i).sort(
    (a, b) => palette[a * 4 + 3] - palette[b * 4 + 3],
  );
  const remap = new Uint8Array(colorCount);
  order.forEach((oldIndex, newIndex) => {
    remap[oldIndex] = newIndex;
  });

  const plte = new Uint8Array(colorCount * 3);
  let translucent = 0;
  order.forEach((oldIndex, newIndex) => {
    plte[newIndex * 3] = palette[oldIndex * 4];
    plte[newIndex * 3 + 1] = palette[oldIndex * 4 + 1];
    plte[newIndex * 3 + 2] = palette[oldIndex * 4 + 2];
    if (palette[oldIndex * 4 + 3] < 255) translucent = newIndex + 1;
  });
  const trns = new Uint8Array(translucent);
  for (let i = 0; i < translucent; i++) trns[i] = palette[order[i] * 4 + 3];

  const bitDepth = colorCount <= 2 ? 1 : colorCount <= 4 ? 2 : colorCount <= 16 ? 4 : 8;
  const rowBytes = Math.ceil((width * bitDepth) / 8);
  const raw = new Uint8Array((rowBytes + 1) * height);
  const perByte = 8 / bitDepth;
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0; // Filter type "None" works best for palette images.
    const src = y * width;
    if (bitDepth === 8) {
      for (let x = 0; x < width; x++) raw[rowStart + 1 + x] = remap[indices[src + x]];
    } else {
      for (let x = 0; x < width; x++) {
        const byteIndex = rowStart + 1 + Math.floor(x / perByte);
        const shift = 8 - bitDepth * ((x % perByte) + 1);
        raw[byteIndex] |= remap[indices[src + x]] << shift;
      }
    }
  }

  const compressed = await deflate(raw);

  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = bitDepth;
  ihdr[9] = 3; // Indexed colour
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Adaptive filtering
  ihdr[12] = 0; // No interlace

  const parts: BlobPart[] = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("PLTE", plte),
  ];
  if (trns.length > 0) parts.push(chunk("tRNS", trns));
  parts.push(chunk("IDAT", compressed), chunk("IEND", new Uint8Array(0)));
  return new Blob(parts, { type: "image/png" });
}

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  // "deflate" in CompressionStream produces zlib-wrapped data, exactly what PNG IDAT expects.
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function chunk(type: string, payload: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(12 + payload.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, payload.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(payload, 8);
  view.setUint32(8 + payload.length, crc32(out, 4, 8 + payload.length));
  return out;
}

