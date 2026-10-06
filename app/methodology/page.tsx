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
    "A plain-language explanation of how images are resized, compressed, converted and reduced to a target KB size in your browser, including limits and trade-offs.",
  path: "/methodology",
});

const pct = (value: number) => `${Math.round(value * 100)}%`;

export default function MethodologyPage() {
  return (
    <ContentPage
      title="How the tools work"
      path="/methodology"
      updated="2026-10-06"
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
      </ul>

      <h2>Metadata</h2>
      <p>
        Processed images are new files containing only pixel data. EXIF metadata such as camera model, date taken and GPS
        location is not copied. The one exception: if the target-size tool returns your original file unchanged (because it
        was already small enough), that file is exactly as you provided it.
      </p>

      <h2>Known limitations</h2>
      <ul>
        <li>One image at a time. Batch processing is planned.</li>
        <li>HEIC (iPhone) photos, GIF, SVG and AVIF can&apos;t be opened yet.</li>
        <li>Some versions of Safari can&apos;t create WebP files; the WebP option is disabled when that&apos;s the case.</li>
        <li>Colour profiles other than standard sRGB may be converted to sRGB by the browser.</li>
        <li>Animated images are not supported; only the first frame would be used.</li>
      </ul>
    </ContentPage>
  );
}
