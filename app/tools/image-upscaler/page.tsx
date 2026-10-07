import type { Metadata } from "next";
import Link from "next/link";
import { ImageUpscalerTool } from "@/components/tools/image-upscaler-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("image-upscaler");

const description =
  "Free image upscaler: enlarge a photo 2× or 4× to increase its resolution, using Lanczos resampling and adjustable sharpening. Compare, then download. No upload.";

export const metadata: Metadata = pageMetadata({
  title: "Free Image Upscaler – Increase Image Resolution Online",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "Is this an AI image upscaler?",
    answer:
      "No. It uses Lanczos-3 resampling, a high-quality mathematical interpolation method, followed by optional sharpening. That gives cleaner, crisper edges than a simple stretch, but unlike an AI upscaler it doesn't invent new texture or detail. AI upscaling models are too slow to run on a phone's processor in a browser, and sending your photo to a server would break this site's no-upload approach.",
  },
  {
    question: "Does upscaling improve image quality?",
    answer:
      "It makes the image bigger and keeps it as smooth and sharp as the original detail allows. It won't make a blurry, noisy or heavily compressed photo look like it was taken with a better camera. For dull or slightly soft photos, the image quality enhancer can help, before or after upscaling.",
  },
  {
    question: "Should I choose 2× or 4×?",
    answer:
      "Use 2× when the image is a little too small, for example a 600-pixel product photo you need at 1200 pixels. Use 4× for small icons, logos or old thumbnails. The bigger the enlargement, the softer the result looks when viewed at 100%, so pick the smallest factor that reaches the size you need, or enter an exact width.",
  },
  {
    question: "What is the largest image I can create?",
    answer:
      "Up to 32 megapixels and 16,384 pixels on the longest side, for example 6,500 × 4,900. Enlarging holds the whole result in memory several times over, and larger sizes often crash phone browsers. If 4× is too big, the tool tells you and you can choose a custom width instead.",
  },
  {
    question: "How big should an image be for printing?",
    answer:
      "For a sharp print, aim for about 300 pixels per inch: a 6 × 4 inch print needs about 1800 × 1200 pixels, and an A4 page about 2480 × 3508. Upscaling can get you to those numbers, but the print will only be as detailed as the original.",
  },
  {
    question: "Why is the upscaled PNG so large?",
    answer:
      "PNG is lossless and a 4× enlargement has 16 times as many pixels, so the file grows a lot. Choose JPG for photos if you need a smaller file; at 92% quality the difference is hard to see.",
  },
  {
    question: "Are my images uploaded?",
    answer: "No. The image is decoded, enlarged and saved by your own browser. It isn't sent to a server.",
  },
];

export default function ImageUpscalerPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Image Upscaler – Upscale Images Online"
      intro={
        <p>
          Make a small image bigger: 2×, 4× or to an exact width. The upscaler uses Lanczos-3 resampling with optional
          sharpening, which keeps edges crisper than a plain stretch. It runs in your browser and works with JPG, PNG, WebP and
          HEIC.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>Upscale Image Online</h2>
          <ol>
            <li>Choose, drop or paste an image.</li>
            <li>Pick 2×, 4× or a custom width. The height follows automatically, so nothing is stretched.</li>
            <li>Choose how much sharpening to apply and whether to save a PNG or a JPG.</li>
            <li>Select <strong>Upscale image</strong>, then drag the divider to compare the original and the result.</li>
            <li>Download the enlarged image.</li>
          </ol>

          <h2>How Image Upscaling Works</h2>
          <p>
            Every new pixel is calculated from the original pixels around it. Lanczos-3 looks at a wider neighbourhood than the
            bilinear or bicubic scaling most apps use, so edges and fine lines stay defined instead of turning mushy. After
            enlarging, an optional unsharp mask increases contrast along edges. It works on brightness only, so colours
            don&apos;t shift or fringe, and it ignores tiny differences so flat areas and noise aren&apos;t exaggerated.
          </p>
          <p>
            This is not AI super-resolution. AI upscalers predict plausible detail, such as skin texture or fabric, from
            millions of training photos. Running one on a phone&apos;s processor takes minutes per image, and doing it on a
            server would mean uploading your photo. This tool gives you a fast, predictable enlargement instead, and is honest
            about what it can&apos;t add.
          </p>

          <h2>Increase Image Size and Resolution</h2>
          <p>
            Resolution here means the number of pixels: a 600 × 400 image upscaled 4× becomes 2400 × 1600, sixteen times as
            many pixels, which is what print shops, marketplaces and slide templates check. The extra pixels are calculated
            from the existing ones, so the picture gets bigger and stays smooth, but it doesn&apos;t gain new detail.
          </p>
          <p>
            The <Link href="/tools/image-resizer">image resizer</Link> changes dimensions in either direction and is the right
            tool for making images smaller. This page is built for the opposite job: it only enlarges, uses a higher-quality
            filter for it, and adds sharpening to counter the softness that enlarging causes. If you need a bigger file in KB
            rather than more pixels, for example to meet a form&apos;s minimum size, use{" "}
            <Link href="/tools/image-size-increase">image size increase</Link>.
          </p>

          <h2>Good uses</h2>
          <ul>
            <li>Small logos and icons that need to fill a larger space.</li>
            <li>Product or listing photos below a marketplace&apos;s minimum width.</li>
            <li>Old thumbnails or screenshots that you only have in a small size.</li>
            <li>Reaching the pixel size needed for a print, banner or slide.</li>
          </ul>

          <h2>Limits worth knowing</h2>
          <ul>
            <li>Blur, noise and compression blocks are enlarged along with everything else. Start from the best copy you have.</li>
            <li>Text that is unreadable in the original won&apos;t become readable.</li>
            <li>
              Results can be up to 32 megapixels. After enlarging, use the{" "}
              <Link href="/tools/image-compressor">image compressor</Link> if the file is too big to share.
            </li>
            <li>
              Dull or flat-looking photos benefit from the <Link href="/tools/image-quality-enhancer">image quality enhancer</Link>{" "}
              as well.
            </li>
          </ul>

          <h2>Supported formats</h2>
          <p>
            Input: JPG, PNG, WebP and HEIC (iPhone photos). Output: PNG, which is lossless and keeps transparency, or JPG for
            smaller photo files.
          </p>

          <PrivacyNote>
            <p>Upscaling runs on your device. Your image isn&apos;t uploaded, and the enlarged copy is created locally.</p>
          </PrivacyNote>
        </>
      }
    >
      <ImageUpscalerTool />
    </ToolPageShell>
  );
}
