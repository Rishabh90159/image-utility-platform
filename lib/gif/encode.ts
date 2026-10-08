/**
 * Animated GIF encoder. Browsers can't create GIF files, so the GIF resizer
 * writes them itself: a GIF89a header, a NETSCAPE loop extension, then the
 * frames, each with its own colour table (so every frame keeps its best 256
 * colours), its position on screen, its disposal method and its delay.
 *
 * Pure functions with no DOM access.
 */

/** Growable byte buffer. */
class ByteWriter {
  private buffer = new Uint8Array(64 * 1024);
  length = 0;

  private ensure(extra: number) {
    if (this.length + extra <= this.buffer.length) return;
    let size = this.buffer.length * 2;
    while (size < this.length + extra) size *= 2;
    const next = new Uint8Array(size);
    next.set(this.buffer.subarray(0, this.length));
    this.buffer = next;
  }

  byte(value: number) {
    this.ensure(1);
    this.buffer[this.length++] = value;
  }

  u16(value: number) {
    this.byte(value & 0xff);
    this.byte((value >> 8) & 0xff);
  }

  bytes(values: ArrayLike<number>) {
    this.ensure(values.length);
    this.buffer.set(values, this.length);
    this.length += values.length;
  }

  ascii(text: string) {
    for (let i = 0; i < text.length; i++) this.byte(text.charCodeAt(i));
  }

  result(): Uint8Array {
    return this.buffer.slice(0, this.length);
  }
}

const HASH_SIZE = 5003; // prime, larger than the 4096-entry code table
const MAX_CODE = 4096;

/**
 * LZW-compresses palette indices as GIF image data: minimum code size byte,
 * then the code stream split into sub-blocks of up to 255 bytes, then a terminator.
 */
export function lzwEncode(indices: Uint8Array, colorDepth: number, out: ByteWriter | null = null): Uint8Array {
  const writer = out ?? new ByteWriter();
  // GIF requires a minimum code size of at least 2.
  const minCodeSize = Math.max(2, colorDepth);
  writer.byte(minCodeSize);

  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let codeSize = minCodeSize + 1;
  let next = clear + 2;

  const hashKeys = new Int32Array(HASH_SIZE).fill(-1);
  const hashCodes = new Int16Array(HASH_SIZE);

  // Bit packing into 255-byte sub-blocks.
  const block = new Uint8Array(255);
  let blockLength = 0;
  let acc = 0;
  let accBits = 0;
  const flushByte = (value: number) => {
    block[blockLength++] = value;
    if (blockLength === 255) {
      writer.byte(255);
      writer.bytes(block);
      blockLength = 0;
    }
  };
  const emit = (code: number) => {
    acc |= code << accBits;
    accBits += codeSize;
    while (accBits >= 8) {
      flushByte(acc & 0xff);
      acc >>>= 8;
      accBits -= 8;
    }
  };

  emit(clear);
  if (indices.length > 0) {
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i];
      const key = (prefix << 8) | k;
      let h = ((k << 4) ^ prefix) % HASH_SIZE;
      const step = h === 0 ? 1 : HASH_SIZE - h;
      let found = -1;
      while (hashKeys[h] !== -1) {
        if (hashKeys[h] === key) {
          found = hashCodes[h];
          break;
        }
        h -= step;
        if (h < 0) h += HASH_SIZE;
      }
      if (found >= 0) {
        prefix = found;
        continue;
      }
      emit(prefix);
      if (next < MAX_CODE) {
        hashKeys[h] = key;
        hashCodes[h] = next;
        // The decoder widens its codes once it has defined code 2^codeSize; it
        // runs one entry behind the encoder, so widen when `next` passes that.
        if (next === 1 << codeSize && codeSize < 12) codeSize++;
        next++;
      } else {
        // Table full: start again with a fresh dictionary.
        emit(clear);
        hashKeys.fill(-1);
        codeSize = minCodeSize + 1;
        next = clear + 2;
      }
      prefix = k;
    }
    emit(prefix);
  }
  emit(eoi);
  if (accBits > 0) flushByte(acc & 0xff);
  if (blockLength > 0) {
    writer.byte(blockLength);
    writer.bytes(block.subarray(0, blockLength));
  }
  writer.byte(0); // block terminator
  return out ? new Uint8Array(0) : writer.result();
}

export interface GifEncoderOptions {
  width: number;
  height: number;
  /** NETSCAPE loop count: 0 = forever, null = play once (no extension). */
  loopCount: number | null;
}

export interface GifFrameInput {
  /** Position and size of the frame on the logical screen. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** One palette index per pixel of the frame rectangle. */
  indices: Uint8Array;
  /** RGB palette, 3 bytes per entry, at most 256 entries. */
  palette: Uint8Array;
  /** Palette index rendered as transparent, or -1. */
  transparentIndex: number;
  /** Delay in hundredths of a second. */
  delayCs: number;
  /** 1 = leave in place for the next frame, 2 = clear the rectangle to transparent afterwards. */
  disposal: 1 | 2;
}

/** Streams frames into a GIF file. */
export class GifWriter {
  private readonly writer = new ByteWriter();
  private finished = false;

  constructor({ width, height, loopCount }: GifEncoderOptions) {
    const w = this.writer;
    w.ascii("GIF89a");
    w.u16(width);
    w.u16(height);
    w.byte(0); // no global colour table; each frame carries its own
    w.byte(0); // background colour index
    w.byte(0); // pixel aspect ratio
    if (loopCount !== null) {
      w.byte(0x21);
      w.byte(0xff);
      w.byte(11);
      w.ascii("NETSCAPE2.0");
      w.byte(3);
      w.byte(1);
      w.u16(Math.max(0, Math.min(0xffff, loopCount)));
      w.byte(0);
    }
  }

  addFrame({ left, top, width, height, indices, palette, transparentIndex, delayCs, disposal }: GifFrameInput) {
    if (this.finished) throw new Error("GIF already finished");
    const colors = Math.max(1, Math.min(256, Math.floor(palette.length / 3)));
    let depth = 1;
    while (1 << depth < colors) depth++;
    const w = this.writer;

    // Graphic Control Extension: disposal method, delay and transparency.
    w.byte(0x21);
    w.byte(0xf9);
    w.byte(4);
    w.byte((disposal << 2) | (transparentIndex >= 0 ? 1 : 0));
    w.u16(Math.max(0, Math.min(0xffff, Math.round(delayCs))));
    w.byte(transparentIndex >= 0 ? transparentIndex : 0);
    w.byte(0);

    // Image descriptor with a local colour table.
    w.byte(0x2c);
    w.u16(left);
    w.u16(top);
    w.u16(width);
    w.u16(height);
    w.byte(0x80 | (depth - 1));
    const table = new Uint8Array(3 * (1 << depth));
    table.set(palette.subarray(0, Math.min(palette.length, table.length)));
    w.bytes(table);

    lzwEncode(indices, depth, w);
  }

  finish(): Uint8Array {
    if (!this.finished) {
      this.writer.byte(0x3b);
      this.finished = true;
    }
    return this.writer.result();
  }
}
