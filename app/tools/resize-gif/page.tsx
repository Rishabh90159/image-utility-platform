import type { Metadata } from "next";
import Link from "next/link";
import { GifResizerTool } from "@/components/tools/gif-resizer-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("resize-gif");

const description =
  "Resize animated GIFs online and keep every frame, the timing and the loop. Scale by pixels or percentage, smooth or pixel-sharp, then download. No upload.";

export const metadata: Metadata = pageMetadata({
  title: "Resize GIF Online – Resize Animated GIFs, Keep Animation",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "Will my GIF still be animated after resizing?",
    answer:
      "Yes. Every frame is decoded, resized and written into a new animated GIF with the original frame delays and loop setting. Frames that turn out identical are merged into one longer frame, which plays the same and saves space.",
  },
  {
    question: "Why do other image tools turn my GIF into a still picture?",
    answer:
      "Browsers only give web pages the first frame of an animated GIF when it is drawn to a canvas, which is how most online image tools work. This tool reads the GIF file itself, frame by frame, and writes a new GIF with its own encoder, so the animation is kept.",
  },
  {
    question: "Should I choose Smooth or Sharp pixels?",
    answer:
      "Smooth blends neighbouring pixels and suits GIFs made from videos or photos. Sharp pixels copies the nearest original pixel, keeping hard edges and the exact colours of pixel art, emoji and simple graphics. Sharp pixels looks best at whole steps such as 50% or 200%.",
  },
  {
    question: "How do I make a GIF file smaller?",
    answer:
      "Reducing the dimensions has the biggest effect: half the width and height leaves a quarter of the pixels in every frame. A GIF of 480 pixels or less is a common choice for chat apps and forums. Animations with few changes between frames also compress better, because only the changed areas are stored.",
  },
  {
    question: "Does the resized GIF keep transparency?",
    answer:
      "Yes. GIF transparency is on or off per pixel, so soft edges become either fully transparent or fully visible. Transparent areas stay transparent in every frame.",
  },
  {
    question: "Are there any limits?",
    answer:
      "GIFs up to 50 MB and 1,000 frames, with output up to 4,096 pixels per side. Very long or very large animations take more memory, so a desktop browser handles them more comfortably than a phone.",
  },
];

export default function ResizeGifPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Resize Animated GIFs Online"
      intro={
        <p>
          Make a GIF smaller or larger without losing the animation. Every frame is resized and the timing and looping stay
          exactly as they were. The work is done on your device, so the GIF is never uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to resize a GIF</h2>
          <ol>
            <li>Choose, drop or paste a .gif file. The tool shows how many frames it has and how long it plays.</li>
            <li>
              Enter a new width or height, choose a common GIF width, or switch to <strong>Percentage</strong>.
            </li>
            <li>
              Pick <strong>Smooth</strong> for video clips and photos, or <strong>Sharp pixels</strong> for pixel art and
              icons.
            </li>
            <li>
              Select <strong>Resize GIF</strong>. The preview plays the new animation; download it when you&apos;re happy.
            </li>
          </ol>

          <h2>How the GIF resizer keeps the animation</h2>
          <p>
            A GIF is a stack of frames, each of which may only cover part of the picture and depend on the frames before it.
            The resizer rebuilds every full frame exactly as a browser would display it, scales it, chooses the best 256
            colours for that frame, and writes it into a new GIF with the original delay. Unchanged areas between frames are
            stored as transparent so the new file stays compact, and frames that become identical are joined.
          </p>
          <ul>
            <li>Keeps frame count, frame timing and the loop setting (forever, a set number of times, or once).</li>
            <li>Keeps transparent backgrounds in every frame.</li>
            <li>Two scaling modes: smooth resampling, or nearest-neighbour for crisp pixel art.</li>
            <li>Shows original and new dimensions, file size, size change and frame count side by side.</li>
            <li>Works with still, single-frame GIFs too.</li>
          </ul>

          <h2>Smooth or sharp pixels</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Mode</th>
                <th scope="col">What it does</th>
                <th scope="col">Use it for</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Smooth</td>
                <td>Lanczos resampling blends pixels for a natural look, then each frame gets a new palette.</td>
                <td>Screen recordings, clips from videos, photographic GIFs</td>
              </tr>
              <tr>
                <td>Sharp pixels</td>
                <td>Nearest-neighbour scaling keeps hard edges and the exact original colours.</td>
                <td>Pixel art, emoji, game sprites, simple animated icons</td>
              </tr>
            </tbody>
          </table>

          <h2>Making a GIF smaller in KB</h2>
          <p>
            GIF compression is lossless within its 256-colour limit, so dimensions are what really drive the file size.
            Reducing a 1000-pixel-wide GIF to 500 pixels typically cuts it to around a quarter. If a site limits GIF uploads,
            try 480 or 320 pixels wide. For a still image, a PNG or JPG is usually far smaller than a GIF: resize it with the{" "}
            <Link href="/tools/resize-png">PNG resizer</Link> or the <Link href="/tools/image-resizer">image resizer</Link>{" "}
            instead.
          </p>

          <h2>Supported files and limits</h2>
          <p>
            Animated and still GIF87a and GIF89a files, interlaced or not, up to 50 MB and 1,000 frames. Each side of the
            resized GIF can be up to 4,096 pixels. Animated WebP and APNG files aren&apos;t supported yet. To combine several
            pictures into one image, use <Link href="/tools/merge-images">merge images</Link>.
          </p>

          <h2>What people resize GIFs for</h2>
          <ul>
            <li>
              <strong>Chat apps and forums</strong> that reject GIFs over a size or width limit.
            </li>
            <li>
              <strong>Email signatures and newsletters</strong>, where small animations load reliably.
            </li>
            <li>
              <strong>Websites and documentation</strong>, to scale a screen recording to the content width.
            </li>
            <li>
              <strong>Pixel art and emoji</strong>, scaled up 2× or 4× with sharp edges for display.
            </li>
          </ul>

          <PrivacyNote>
            <p>
              The GIF is decoded and re-encoded by code running in your browser, in a background worker so the page stays
              responsive. No frame is uploaded, and the new GIF is created on your device.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <GifResizerTool />
    </ToolPageShell>
  );
}
