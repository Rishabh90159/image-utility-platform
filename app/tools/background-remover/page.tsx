import type { Metadata } from "next";
import Link from "next/link";
import { BackgroundRemoverTool } from "@/components/tools/background-remover-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("background-remover");

const description =
  "Free background remover that runs in your browser. Remove the background from an image automatically, then download a transparent PNG or a white background.";

export const metadata: Metadata = pageMetadata({
  title: "Free Background Remover – Remove Image Background Online",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How does the background remover work?",
    answer:
      "A neural network called U²-Netp looks at a reduced copy of your photo and estimates which pixels belong to the main subject. The tool then refines that mask against the edges of your full-size photo and makes everything else transparent. All of this happens in your browser.",
  },
  {
    question: "Is my photo uploaded to remove the background?",
    answer:
      "No. The model and the software that runs it are downloaded from this site the first time you use the tool, and then your browser does the work. The photo itself never leaves your device.",
  },
  {
    question: "Why does the first image take longer?",
    answer:
      "Your browser first downloads the model and its runtime (up to about 19 MB) and prepares them. After that they're cached, so later images only take a few seconds, depending on your device.",
  },
  {
    question: "What kind of photos work best?",
    answer:
      "Photos with one clear subject, such as a person, pet, product or object, that stands out from the background. Results are weaker when the subject and background have similar colours, with very fine hair, transparent objects like glass, or busy scenes with several subjects.",
  },
  {
    question: "Can I use it for a passport or visa photo?",
    answer:
      "Check the rules first. Many passport authorities ask for a photo taken against a plain background and some, such as the UK, require digital photos to be unaltered by software. Replacing the background may make a photo unacceptable for those applications.",
  },
  {
    question: "How do I get a white background instead of a transparent one?",
    answer:
      "Choose White (or Colour for any other shade) under New background. You can then save as JPG, which many upload forms prefer, or as PNG.",
  },
  {
    question: "Why are some edges rough or cut off?",
    answer:
      "The model is small so that it can run on phones, which makes it less precise than large server-based tools. Try the other edge setting, use a photo where the subject contrasts with the background, or crop closer to the subject first.",
  },
];

export default function BackgroundRemoverPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Remove Background from Image Online"
      intro={
        <p>
          Cut out a person, pet or product and download it as a transparent PNG, or put it on a white or coloured background. A
          small neural network does the work inside your browser, so your photo is never uploaded.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to Remove Background from an Image</h2>
          <ol>
            <li>Choose, drop or paste a photo. The background is removed straight away.</li>
            <li>Drag the divider to compare the original and the cut-out.</li>
            <li>Keep it transparent, or choose white or another colour as the new background.</li>
            <li>Switch the edges between soft and crisp if the outline needs it, then download.</li>
          </ol>

          <h2>Remove Image Background Automatically</h2>
          <p>
            The tool uses U²-Netp, a compact version of the U²-Net salient-object model published by Xuebin Qin and colleagues
            in 2020 (<a href="/models/u2netp-LICENSE.txt">Apache 2.0 licence</a>). It runs with ONNX Runtime&apos;s WebAssembly
            engine. The model looks at a 320 × 320
            copy of your photo and produces a rough mask of the main subject. A guided filter then fits that mask to the edges
            in your full-resolution photo, so the outline follows hair and contours more closely than the rough mask alone.
            The result keeps your photo&apos;s original resolution.
          </p>

          <h2>Getting a clean cut-out</h2>
          <ul>
            <li>Use photos where the subject is in focus and contrasts with what&apos;s behind it.</li>
            <li>
              Crop away other people and clutter first with the <Link href="/tools/image-cropper">image cropper</Link>; the
              model looks for the most prominent subject.
            </li>
            <li>&ldquo;Soft&rdquo; edges suit hair, fur and portraits; &ldquo;Crisp&rdquo; suits products with hard outlines.</li>
            <li>Very fine strands of hair, glass, smoke and shadows are hard for any automatic tool, and especially a small one.</li>
          </ul>

          <h2>Free Online Background Remover</h2>
          <p>
            There&apos;s no account, no credit system and no watermark, and the result keeps your photo&apos;s full
            resolution. Because the work happens on your own device, speed depends on it: a few seconds on a recent phone or
            laptop, longer on older devices. What people use it for:
          </p>
          <ul>
            <li>Product photos on a clean white background for online shops and listings.</li>
            <li>Profile pictures and avatars on a plain or brand-coloured background.</li>
            <li>Cut-outs for slides, posters, collages and stickers.</li>
          </ul>

          <h2>Formats and file size</h2>
          <p>
            Input: JPG, PNG, WebP and HEIC. Transparent results are saved as PNG. With a coloured background you can choose PNG
            or JPG. Transparent PNGs of large photos can be big; resize them with the{" "}
            <Link href="/tools/image-resizer">image resizer</Link> or shrink them with the{" "}
            <Link href="/tools/image-compressor">image compressor</Link>. Need a JPG for a form that doesn&apos;t accept PNG?
            Choose a background colour here, or use <Link href="/tools/png-to-jpg">PNG to JPG</Link>.
          </p>

          <PrivacyNote>
            <p>
              Background removal runs on your device. The model and runtime are downloaded from this site, not from a third
              party, and your photo is never sent anywhere.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <BackgroundRemoverTool />
    </ToolPageShell>
  );
}
