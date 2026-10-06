import type { LibHeif } from "libheif-js/libheif-wasm/libheif-bundle.mjs";
import { ImageToolError } from "./errors";
import { LIMITS } from "./formats";

/**
 * HEIC/HEIF decoding with libheif compiled to WebAssembly.
 *
 * The decoder (about 2 MB) is downloaded from this site only the first time a
 * HEIC file is opened, and runs locally like every other step: the photo is
 * never sent anywhere. Browsers that can decode HEIC natively (recent Safari)
 * don't need it at all; see decodeImage().
 */
let libheif: Promise<LibHeif> | null = null;

function loadLibheif(): Promise<LibHeif> {
  libheif ??= import("libheif-js/libheif-wasm/libheif-bundle.mjs")
    .then((module) => module.default())
    .catch(() => {
      libheif = null;
      throw new ImageToolError(
        "DECODER_UNAVAILABLE",
        "The HEIC decoder couldn't be loaded. Check your connection and try again — the decoder is downloaded once, your photo is not uploaded.",
      );
    });
  return libheif;
}

export async function decodeHeic(file: Blob): Promise<ImageBitmap> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const lib = await loadLibheif();

  let images: ReturnType<InstanceType<LibHeif["HeifDecoder"]>["decode"]> = [];
  try {
    images = new lib.HeifDecoder().decode(bytes);
  } catch {
    images = [];
  }
  if (!images || images.length === 0) {
    throw new ImageToolError(
      "DECODE_FAILED",
      "We couldn't read this HEIC file. It may be damaged, or use a HEIF variant this decoder doesn't support.",
    );
  }

  try {
    // HEIC files can hold several images (bursts, depth maps, thumbnails); use the main photo.
    const primary = images.find((image) => image.is_primary()) ?? images[0];
    const width = primary.get_width();
    const height = primary.get_height();
    if (!width || !height) {
      throw new ImageToolError("DECODE_FAILED", "We couldn't read this HEIC file. It may be damaged or incomplete.");
    }
    if (width * height > LIMITS.maxInputPixels) {
      throw new ImageToolError("DIMENSIONS_TOO_LARGE", "This image has too many pixels to process safely in a browser.");
    }
    const pixels = new ImageData(width, height);
    const decoded = await new Promise<ImageData | null>((resolve) => primary.display(pixels, resolve));
    if (!decoded) {
      throw new ImageToolError("DECODE_FAILED", "We couldn't decode this HEIC photo. The file may be damaged.");
    }
    return await createImageBitmap(decoded);
  } finally {
    for (const image of images) image.free();
  }
}
