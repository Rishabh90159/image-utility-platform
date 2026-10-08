/**
 * GIF decoder for the GIF resizer.
 *
 * Browsers display animated GIFs but only expose the first frame to canvas, so
 * resizing a GIF while keeping its animation needs a decoder of our own. This
 * one parses the file structure, decompresses each frame (LZW) and composites
 * it onto the logical screen the way browsers do, honouring transparency and
 * the three disposal methods. Frames are produced one at a time so memory use
 * stays at one full-size frame regardless of how long the animation is.
 *
 * Pure functions with no DOM access: runs in a Web Worker or in Node tests.
 */
export interface GifInfo {
  width: number;
  height: number;
  frameCount: number;
  /** Sum of frame delays in milliseconds, using the stored values. */
  durationMs: number;
  /** NETSCAPE loop count: 0 = forever, null = no loop extension (plays once). */
  loopCount: number | null;
}

export interface GifFrame {
  /** Full logical-screen RGBA pixels after compositing this frame. */
  data: Uint8ClampedArray;
  /** Delay in hundredths of a second, exactly as stored in the file. */
  delayCs: number;
  index: number;
}

interface FrameRecord {
  left: number;
  top: number;
  width: number;
  height: number;
  interlaced: boolean;
  /** RGB palette for this frame (local or global). */
  palette: Uint8Array;
  transparentIndex: number;
  disposal: number;
  delayCs: number;
  minCodeSize: number;
  /** Offsets of the image-data sub-blocks in the file. */
  dataStart: number;
  dataEnd: number;
}

export class GifFormatError extends Error {}

function fail(message: string): never {
  throw new GifFormatError(message);
}

/** Skips a run of data sub-blocks and returns the offset after the terminator. */
function skipSubBlocks(bytes: Uint8Array, offset: number): number {
  let p = offset;
  while (true) {
    if (p >= bytes.length) fail("The GIF ends unexpectedly.");
    const size = bytes[p];
    p += 1 + size;
    if (size === 0) return p;
  }
}

interface Parsed {
  width: number;
  height: number;
  loopCount: number | null;
  frames: FrameRecord[];
}

/** Reads the file structure without decompressing any pixels. Fast enough to run on selection. */
function parseStructure(bytes: Uint8Array): Parsed {
  if (bytes.length < 13) fail("This file is too short to be a GIF.");
  const sig = String.fromCharCode(...bytes.subarray(0, 6));
  if (sig !== "GIF87a" && sig !== "GIF89a") fail("This file isn't a GIF.");
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  if (width === 0 || height === 0) fail("This GIF has no size.");
  const packed = bytes[10];
  let p = 13;
  let globalPalette: Uint8Array | null = null;
  if (packed & 0x80) {
    const size = 3 * (1 << ((packed & 7) + 1));
    if (p + size > bytes.length) fail("The GIF ends unexpectedly.");
    globalPalette = bytes.subarray(p, p + size);
    p += size;
  }

  const frames: FrameRecord[] = [];
  let loopCount: number | null = null;
  // Graphic Control Extension values apply to the next image only.
  let gce = { disposal: 0, delayCs: 0, transparentIndex: -1 };

  while (p < bytes.length) {
    const block = bytes[p++];
    if (block === 0x3b) break; // trailer
    if (block === 0x21) {
      const label = bytes[p++];
      if (label === 0xf9 && bytes[p] >= 4) {
        const flags = bytes[p + 1];
        gce = {
          disposal: (flags >> 2) & 7,
          delayCs: bytes[p + 2] | (bytes[p + 3] << 8),
          transparentIndex: flags & 1 ? bytes[p + 4] : -1,
        };
        p = skipSubBlocks(bytes, p);
      } else if (label === 0xff && bytes[p] === 11) {
        const id = String.fromCharCode(...bytes.subarray(p + 1, p + 12));
        let q = p + 12;
        if ((id === "NETSCAPE2.0" || id === "ANIMEXTS1.0") && bytes[q] >= 3 && bytes[q + 1] === 1) {
          loopCount = bytes[q + 2] | (bytes[q + 3] << 8);
        }
        q = skipSubBlocks(bytes, q);
        p = q;
      } else {
        p = skipSubBlocks(bytes, p);
      }
      continue;
    }
    if (block === 0x2c) {
      if (p + 9 > bytes.length) fail("The GIF ends unexpectedly.");
      const left = bytes[p] | (bytes[p + 1] << 8);
      const top = bytes[p + 2] | (bytes[p + 3] << 8);
      const fw = bytes[p + 4] | (bytes[p + 5] << 8);
      const fh = bytes[p + 6] | (bytes[p + 7] << 8);
      const fp = bytes[p + 8];
      p += 9;
      let palette = globalPalette;
      if (fp & 0x80) {
        const size = 3 * (1 << ((fp & 7) + 1));
        palette = bytes.subarray(p, p + size);
        p += size;
      }
      const minCodeSize = bytes[p++];
      if (minCodeSize < 1 || minCodeSize > 11) fail("This GIF uses an invalid compression setting.");
      const dataStart = p;
      p = skipSubBlocks(bytes, p);
      frames.push({
        left,
        top,
        width: fw,
        height: fh,
        interlaced: (fp & 0x40) !== 0,
        // A frame without any colour table is invalid; render it as black like browsers do.
        palette: palette ?? new Uint8Array(3 * 256),
        transparentIndex: gce.transparentIndex,
        disposal: gce.disposal,
        delayCs: gce.delayCs,
        minCodeSize,
        dataStart,
        dataEnd: p,
      });
      gce = { disposal: 0, delayCs: 0, transparentIndex: -1 };
      continue;
    }
    // Unknown byte: many real-world GIFs have junk after the last frame. Stop there.
    break;
  }
  if (frames.length === 0) fail("This GIF doesn't contain any frames.");
  return { width, height, loopCount, frames };
}

export function readGifInfo(bytes: Uint8Array): GifInfo {
  const parsed = parseStructure(bytes);
  return {
    width: parsed.width,
    height: parsed.height,
    frameCount: parsed.frames.length,
    durationMs: parsed.frames.reduce((sum, f) => sum + f.delayCs * 10, 0),
    loopCount: parsed.loopCount,
  };
}

/** LZW-decompresses one frame's sub-blocks into palette indices (one byte per pixel). */
export function lzwDecode(bytes: Uint8Array, start: number, end: number, minCodeSize: number, pixelCount: number): Uint8Array {
  const out = new Uint8Array(pixelCount);
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  const prefix = new Uint16Array(4096);
  const suffix = new Uint8Array(4096);
  const stack = new Uint8Array(4097);

  let codeSize = minCodeSize + 1;
  let codeMask = (1 << codeSize) - 1;
  let next = clear + 2;
  let old = -1;
  let first = 0;
  let datum = 0;
  let bits = 0;
  let written = 0;

  for (let i = 0; i < clear; i++) suffix[i] = i;

  let p = start;
  let blockEnd = p;
  outer: while (written < pixelCount) {
    // Refill the bit buffer from the sub-block stream.
    while (bits < codeSize) {
      if (p >= blockEnd) {
        if (p >= end) break outer;
        const size = bytes[p++];
        if (size === 0) break outer;
        blockEnd = p + size;
      }
      datum |= bytes[p++] << bits;
      bits += 8;
    }
    const code = datum & codeMask;
    datum >>>= codeSize;
    bits -= codeSize;

    if (code === clear) {
      codeSize = minCodeSize + 1;
      codeMask = (1 << codeSize) - 1;
      next = clear + 2;
      old = -1;
      continue;
    }
    if (code === eoi) break;
    if (old === -1) {
      if (code >= clear) break; // corrupt: first code must be a literal
      out[written++] = code;
      old = code;
      first = code;
      continue;
    }

    let top = 0;
    let current = code;
    if (current >= next) {
      // KwKwK case: the code being defined right now.
      if (current > next) break; // corrupt stream; keep what we have
      stack[top++] = first;
      current = old;
    }
    while (current >= clear) {
      stack[top++] = suffix[current];
      current = prefix[current];
    }
    first = suffix[current];
    stack[top++] = first;

    if (next < 4096) {
      prefix[next] = old;
      suffix[next] = first;
      next++;
      if (next === codeMask + 1 && codeSize < 12) {
        codeSize++;
        codeMask = (1 << codeSize) - 1;
      }
    }
    old = code;
    while (top > 0 && written < pixelCount) out[written++] = stack[--top];
  }
  // Missing pixels (truncated data) stay index 0, as browsers render them.
  return out;
}

/** Maps interlaced row order to display rows. */
function deinterlace(indices: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(indices.length);
  let src = 0;
  for (const [startRow, step] of [[0, 8], [4, 8], [2, 4], [1, 2]]) {
    for (let y = startRow; y < height; y += step) {
      out.set(indices.subarray(src * width, (src + 1) * width), y * width);
      src++;
    }
  }
  return out;
}

export interface DecodedGif extends GifInfo {
  /** Yields each composited frame in order. The same buffer is reused, so copy it if you keep it. */
  frames(): Generator<GifFrame>;
}

export function decodeGif(bytes: Uint8Array): DecodedGif {
  const parsed = parseStructure(bytes);
  const { width, height } = parsed;
  return {
    width,
    height,
    frameCount: parsed.frames.length,
    durationMs: parsed.frames.reduce((sum, f) => sum + f.delayCs * 10, 0),
    loopCount: parsed.loopCount,
    *frames() {
      // Browsers start from a transparent screen and ignore the background colour.
      const screen = new Uint8ClampedArray(width * height * 4);
      let saved: Uint8ClampedArray | null = null;
      for (let index = 0; index < parsed.frames.length; index++) {
        const f = parsed.frames[index];
        if (f.disposal === 3) saved = screen.slice();
        let indices = lzwDecode(bytes, f.dataStart, f.dataEnd, f.minCodeSize, f.width * f.height);
        if (f.interlaced) indices = deinterlace(indices, f.width, f.height);
        const pal = f.palette;
        const paletteSize = pal.length / 3;
        for (let y = 0; y < f.height; y++) {
          const sy = f.top + y;
          if (sy >= height) break;
          for (let x = 0; x < f.width; x++) {
            const sx = f.left + x;
            if (sx >= width) break;
            const ci = indices[y * f.width + x];
            if (ci === f.transparentIndex) continue;
            const o = (sy * width + sx) * 4;
            if (ci < paletteSize) {
              screen[o] = pal[ci * 3];
              screen[o + 1] = pal[ci * 3 + 1];
              screen[o + 2] = pal[ci * 3 + 2];
            } else {
              screen[o] = screen[o + 1] = screen[o + 2] = 0;
            }
            screen[o + 3] = 255;
          }
        }
        yield { data: screen, delayCs: f.delayCs, index };
        if (f.disposal === 2) {
          // Restore to background: clear the frame's rectangle to transparent.
          for (let y = f.top; y < Math.min(height, f.top + f.height); y++) {
            screen.fill(0, (y * width + f.left) * 4, (y * width + Math.min(width, f.left + f.width)) * 4);
          }
        } else if (f.disposal === 3 && saved) {
          screen.set(saved);
        }
      }
    },
  };
}
