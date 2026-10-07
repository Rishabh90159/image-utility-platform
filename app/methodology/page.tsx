import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/layout/content-page";
import { LIMITS } from "@/lib/image-processing/formats";
import { QUALITY } from "@/lib/image-processing/target-size";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site";
import { formatBytes } from "@/lib/utils/format";

export const metadata: Metadata = pageMetadata({
  title: `How the Image Tools Work – Methodology | ${siteConfig.name}`,
  description:
    "A plain-language explanation of how images are resized, cropped, compressed, converted, traced and reduced to a target KB size in your browser, with limits.",
  path: "/methodology",
});

const pct = (value: number) => `${Math.round(value * 100)}%`;

export default function MethodologyPage() {
  return (
    <ContentPage
      title="How the tools work"
      path="/methodology"
      updated="2026-10-07"
      intro={
        <p>
          This page explains what happens to your image at each step, in plain language, so you can judge the results for
          yourself.
        </p>
      }
    >
      <h2>Everything runs in your browser</h2>
      <p>
        When you select an image, your browser reads the file from your device. The processing code (image decoding,
        resizing and encoding) is part of the web page and runs on your computer or phone, using the image features built
        into every modern browser. Heavy work runs in a background thread (a Web Worker) so the page stays responsive.
      </p>
      <p>
        The finished image is created in your browser&apos;s memory and saved by the download button. At no point is the
        image sent over the network. As an extra safeguard, the site&apos;s Content Security Policy instructs your browser to
        block any request to other servers, apart from privacy-friendly analytics if it is enabled, which never includes
        image data.
      </p>

      <h2>Opening and checking files</h2>
      <ul>
        <li>
          The file type is identified from the file&apos;s contents, not just its name, so a renamed or damaged file is caught
          with a clear message.
        </li>
        <li>
          The image&apos;s dimensions are read from its header before decoding. Images over{" "}
          {Math.round(LIMITS.maxInputPixels / 1_000_000)} megapixels, or files over {formatBytes(LIMITS.maxFileBytes)}, are
          declined politely rather than risking a frozen or crashed tab.
        </li>
        <li>
          Photos from phones often store their rotation separately. That rotation is applied first, so results appear the
          right way up.
        </li>
      </ul>

      <h2>Resizing</h2>
      <p>
        The image is redrawn at the new size with high-quality smoothing. For large reductions (for example, a 6000-pixel
        photo down to 800 pixels), the image is halved in several steps rather than shrunk in one go. A single large jump
        samples too few of the original pixels in some browsers, which causes jagged edges and shimmering patterns; stepping
        down avoids this.
      </p>
      <p>
        Output images can be up to {LIMITS.maxOutputSide.toLocaleString("en-US")} pixels per side and{" "}
        {Math.round(LIMITS.maxOutputPixels / 1_000_000)} megapixels in total. Mobile browsers may have lower memory limits;
        if an image is too large for your device, you&apos;ll see a message suggesting smaller dimensions.
      </p>

      <h2>Compression</h2>
      <h3>JPG and WebP</h3>
      <p>
        These formats are lossy. The quality setting (0–100%) controls how aggressively fine detail is simplified. The
        compressor&apos;s automatic mode uses 75%, which keeps typical photos visually close to the original. The encoders
        are the ones built into your browser, so results can differ slightly between Chrome, Firefox and Safari.
      </p>
      <h3>PNG</h3>
      <p>
        PNG is lossless, so re-saving it at &ldquo;lower quality&rdquo; isn&apos;t possible. To make a PNG smaller, the compressor:
      </p>
      <ol>
        <li>Checks whether the image already uses 256 colours or fewer. If so, all colours are kept exactly (no loss).</li>
        <li>
          Otherwise, builds a palette of the most representative colours using the <em>median cut</em> method, which
          repeatedly splits the image&apos;s colours into groups and averages each group.
        </li>
        <li>
          Maps every pixel to its closest palette colour, with light Floyd–Steinberg dithering so smooth gradients
          don&apos;t turn into visible bands. Transparency is preserved, including semi-transparent edges.
        </li>
        <li>Saves the result as an indexed-colour PNG, compressed with your browser&apos;s built-in deflate compression.</li>
      </ol>
      <p>
        This is lossy, but often hard to notice for screenshots, graphics and illustrations. A lossless option is available;
        it keeps every pixel but typically saves little. If a result isn&apos;t smaller than your original, the tool says
        so rather than presenting a bigger file as a success.
      </p>

      <h2>Reaching a target file size (KB)</h2>
      <p>
        The size of a compressed image depends on its content, so it can&apos;t be set directly. The{" "}
        <Link href="/tools/resize-image-to-kb">Resize Image to KB tool</Link> searches for the best result in stages, and
        every candidate is actually encoded and measured:
      </p>
      <ol>
        <li>Full size at {pct(QUALITY.max)} quality. If this fits, it&apos;s used: higher settings add size with no visible gain.</li>
        <li>
          Full size at lower quality, down to {pct(QUALITY.fullSizeFloor)}. A binary search finds the highest quality that
          stays at or below the target.
        </li>
        <li>
          If that isn&apos;t enough, the dimensions are reduced at {pct(QUALITY.good)} quality. File size grows roughly with
          the number of pixels, so the search starts from that estimate and narrows down to the largest dimensions that fit.
          Quality is then raised again to use any remaining room.
        </li>
        <li>
          Only as a last resort, at very small dimensions (a long side of 32 pixels), quality may go down to{" "}
          {pct(QUALITY.min)}.
        </li>
      </ol>
      <p>
        The aim is always <strong>at or below</strong> the target, not an exact byte count: encoders produce sizes in steps,
        and upload forms check a maximum. If the target can&apos;t be reached, for example because dimension changes are
        turned off, the tool shows the closest achievable size and the reason. If your image is already under the target in
        the requested format, the original file is returned unchanged rather than re-compressed.
      </p>
      <p>
        Sizes use 1 KB = 1,024 bytes. Displayed sizes are rounded <em>up</em>, so a file is never shown as smaller than it
        is, and the exact byte count is shown alongside each result.
      </p>

      <h2>Format conversion</h2>
      <ul>
        <li>
          <strong>JPG to PNG:</strong> the decoded JPG is saved losslessly as PNG. This prevents further loss but can&apos;t
          restore detail removed by JPG compression, and the PNG is usually larger.
        </li>
        <li>
          <strong>PNG to JPG:</strong> JPG has no transparency, so transparent pixels are placed over the background colour
          you choose (white by default). Semi-transparent pixels are blended so edges stay smooth.
        </li>
        <li>
          <strong>HEIC to JPG:</strong> Safari can read HEIC itself. Other browsers can&apos;t, so the first time you open a
          HEIC photo, the page downloads a HEIC decoder (libheif compiled to WebAssembly, about 2 MB) from this site. It runs
          in the background thread like everything else; your photo is not sent anywhere. Files with several images (bursts,
          Live Photos) use the main photo. The decoder treats colours as standard sRGB, so wide-gamut iPhone colours can
          look very slightly less saturated than in the Photos app.
        </li>
        <li>
          <strong>SVG to PNG:</strong> SVG files can contain scripts and links, so they are never inserted into the page.
          The file is parsed without running anything, then cleaned with DOMPurify&apos;s SVG rules plus stricter ones of our
          own: scripts, event handlers, embedded HTML, animations, links to other files and XML entity tricks are removed or
          rejected. The cleaned SVG is drawn through an image element, where browsers disable scripting and external
          loading, at the pixel size you choose.
        </li>
        <li>
          <strong>PNG to SVG:</strong> a PNG has no shapes, so they must be reconstructed. The image is reduced to a small
          palette (using the same median-cut method as the PNG compressor) or to black and white, then each colour
          region&apos;s outline is traced into lines and curves with ImageTracer.js. The SVG contains only vector paths, never
          an embedded copy of the PNG. Photos and gradients produce many shapes and don&apos;t trace well.
        </li>
      </ul>

      <h2>Cropping, rotation and photo preparation</h2>
      <p>
        The cropper works on a preview, but the crop is applied to the full-resolution image: rotation (in 90° steps) and
        mirroring are applied first, then the selected rectangle is cut out and scaled to the output size with the same
        high-quality resampling as the resizer. The passport photo and signature tools use the same cropper with an exact
        output size in pixels. When a size is given in millimetres or inches, pixels are calculated from the DPI, and the DPI
        is written into the JPG header so the photo prints at the intended physical size.
      </p>
      <p>
        Passport presets are added only when their numbers are copied from the issuing government&apos;s own website. Each
        preset shows its source and the date it was last checked. When a maximum file size is set, the target-size search
        described above runs with resizing turned off, so the required dimensions are never changed.
      </p>
      <p>
        The signature clean-up measures each pixel&apos;s brightness. Pixels lighter than the chosen threshold become white or
        transparent, darker ink is kept, and a narrow band in between is blended so pen edges stay smooth.
      </p>

      <h2>Exam, recruitment and passport requirements</h2>
      <p>
        Pages such as the IBPS, SBI, SSC, NEET and passport photo tools apply requirements published by the organisation
        concerned. How that data is kept:
      </p>
      <ul>
        <li>
          <strong>Official sources only.</strong> Values are copied from the organisation&apos;s own notification, advertisement,
          information bulletin or government website, never from coaching sites, blogs or photo services.
        </li>
        <li>
          <strong>Nothing inferred.</strong> If a source doesn&apos;t state a pixel size, no pixel size is shown or applied. When a
          source calls a size &ldquo;preferred&rdquo; or a minimum, the page says so.
        </li>
        <li>
          <strong>Source and date on every requirement.</strong> Each one links to its document and shows when it was last read.
          That date changes only when the document has actually been re-checked.
        </li>
        <li>
          <strong>Unverifiable means not shown.</strong> When a current requirement couldn&apos;t be confirmed, for example
          because official documents disagree or the instructions are behind a login, the page says so and lets you enter
          the values from your own notification.
        </li>
        <li>
          <strong>Data, not prose.</strong> Requirements are stored separately from page text, so a new notification can be
          added or updated without rewriting the page, and the requirement table and the tool always use the same values.
        </li>
      </ul>
      <p>
        These tools check pixel size, file size and format. They can&apos;t judge pose, lighting, expression or how recent a
        photo is, and they don&apos;t retouch faces or replace backgrounds. They are independent and not affiliated with any
        examination body or government.
      </p>

      <h2>Photo size pages (20KB, 50KB, 100KB, 200KB)</h2>
      <p>
        These pages use the same target-size search as the Resize Image to KB tool, with the target preset. Optional settings
        let you cap the width (the image is scaled down first, then the search runs) or cap the quality (the search never goes
        above it, so the file may end up well under the target). The size shown is always the size of the file you download.
      </p>

      <h2>Enlarging: upscaler and image size increase</h2>
      <p>
        Enlarging uses Lanczos-3 resampling: each new pixel is a weighted average of the original pixels in a 6 × 6
        neighbourhood, with weights from a windowed sinc function. It keeps edges crisper than the bilinear or bicubic
        scaling browsers use, and is applied with premultiplied alpha so transparent edges don&apos;t get dark fringes. An
        optional unsharp mask then sharpens brightness only. This is interpolation, not AI super-resolution: no detail is
        invented. Results are limited to 32 megapixels because the enlarged image is held in memory several times over.
      </p>
      <p>
        Increasing a file&apos;s size in KB without changing the picture works by adding JPEG comment (COM) segments filled
        with spaces. The JPEG standard defines these segments and decoders skip them, so the pixels are identical; the file
        reaches the requested size exactly (or at most 3 bytes over, a limit of the segment format). The alternative method
        re-encodes at higher JPG quality and, if needed, larger dimensions.
      </p>

      <h2>Background removal</h2>
      <p>
        The background remover runs U²-Netp, a small salient-object segmentation network (Qin et al., 2020, Apache 2.0
        licence), with ONNX Runtime&apos;s WebAssembly engine on a single thread. The model receives a 320 × 320 copy of the
        photo and returns a mask of the most prominent subject. That mask is refined with a guided filter (He et al., 2010),
        which fits it to the edges of the photo itself at up to 1024 pixels, and the refined coefficients are applied at the
        photo&apos;s full resolution to set each pixel&apos;s transparency. The model file and the runtime are served by this
        site and downloaded only when the tool is first used. Because the model is small enough for phones, it is less
        precise than large server-side models, especially with hair, glass, low contrast and several subjects.
      </p>

      <h2>Photo to PDF and JPG to PDF</h2>
      <p>
        PDFs are written by a small built-in PDF 1.4 writer: one page per image, each image embedded as JPEG data. A JPG that
        needs no resizing and uses RGB or greyscale colour is copied into the PDF byte-for-byte; if the photo has an EXIF
        rotation, the page&apos;s transformation matrix turns it upright instead of re-encoding it. PNG, WebP, HEIC and CMYK
        JPEG images are drawn on white and saved as 92% JPEG. Page sizes are A4 (595.28 × 841.89 points) and US Letter (612 ×
        792 points); &ldquo;fit&rdquo; scales the image to fit inside the margins and &ldquo;fill&rdquo; covers that area and
        clips the overflow.
      </p>

      <h2>Merging and enhancing</h2>
      <p>
        Merging scales images in proportion so they share a width (vertical), a height (horizontal) or a cell size (grid),
        then draws them on one canvas; large reductions go through the stepped downscaler. If the result would exceed
        browser canvas limits, the whole layout is scaled down uniformly and the tool says so. The image quality enhancer
        applies a tone curve (auto levels from the 0.5th and 99.5th brightness percentiles, brightness and contrast), a
        saturation and warmth adjustment, and two unsharp masks on brightness: a wide one for clarity and a narrow one for
        sharpening. The live preview is computed on a copy up to 1000 pixels; the download is processed at full size.
      </p>

      <h2>JPEG to JPG and file-size units</h2>
      <p>
        &ldquo;Change extension only&rdquo; copies the file&apos;s bytes unchanged under a .jpg name, after checking its
        content really is JPEG. &ldquo;Re-save&rdquo; decodes and encodes it at 92% quality. The MB to KB converter shows
        decimal units (1 KB = 1000 bytes) and binary units (1 KiB = 1024 bytes). The image tools themselves display sizes in
        binary units labelled KB and MB, as most upload forms count them.
      </p>

      <h2>Batch processing</h2>
      <p>
        The bulk resizer processes images through a small pool of background workers, usually two or three depending on
        the device&apos;s processor and memory. Each image is decoded, resized, encoded and then released from memory before
        the worker takes the next one, so large batches don&apos;t exhaust memory and one damaged file doesn&apos;t stop the
        rest. The ZIP download is assembled in your browser: images are stored without recompression, and file names are
        cleaned so they can&apos;t contain folders or characters that are invalid on Windows, macOS or Linux.
      </p>

      <h2>Metadata</h2>
      <p>
        Processed images are new files containing only pixel data. EXIF metadata such as camera model, date taken and GPS
        location is not copied. The one exception: if the target-size tool returns your original file unchanged (because it
        was already small enough), that file is exactly as you provided it.
      </p>

      <h2>Known limitations</h2>
      <ul>
        <li>
          The resizer, compressor, target-size and JPG/PNG converters handle one image at a time; use the bulk resizer for
          batches.
        </li>
        <li>GIF, TIFF and AVIF can&apos;t be opened yet. HEIC is supported by the HEIC converter, cropper, photo tools and bulk resizer.</li>
        <li>Rotation is in 90° steps; free-angle straightening isn&apos;t available yet.</li>
        <li>Passport and signature tools don&apos;t change backgrounds or check pose, lighting or expression.</li>
        <li>Some versions of Safari can&apos;t create WebP files; the WebP option is disabled when that&apos;s the case.</li>
        <li>Colour profiles other than standard sRGB may be converted to sRGB by the browser.</li>
        <li>Animated images are not supported; only the first frame would be used.</li>
        <li>The upscaler and enhancer use classic image processing, not AI models, so they can&apos;t recreate missing detail.</li>
        <li>The background remover finds one main subject and can struggle with fine hair, glass and busy scenes.</li>
      </ul>
    </ContentPage>
  );
}
