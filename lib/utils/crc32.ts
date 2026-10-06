/** CRC-32 (IEEE 802.3), as used by PNG chunks and ZIP entries. */
let table: Uint32Array | null = null;

function getTable(): Uint32Array {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  return table;
}

/** Start value for an incremental CRC. */
export const CRC32_INIT = 0xffffffff;

/** Feeds more bytes into a running CRC. Finish with `crc32Final`. */
export function crc32Update(crc: number, bytes: Uint8Array, start = 0, end = bytes.length): number {
  const t = getTable();
  let c = crc;
  for (let i = start; i < end; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return c;
}

export function crc32Final(crc: number): number {
  return (crc ^ 0xffffffff) >>> 0;
}

export function crc32(bytes: Uint8Array, start = 0, end = bytes.length): number {
  return crc32Final(crc32Update(CRC32_INIT, bytes, start, end));
}
