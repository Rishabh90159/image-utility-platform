import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/faq/faq";
import { QuickStart } from "@/components/home/quick-start";
import { ToolCard } from "@/components/tool-card/tool-card";
import { ToolIcon } from "@/components/tool-card/tool-icon";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { siteConfig } from "@/lib/site";
import { APPLICATION_HUB, getTool, toolsIn, type NavGroup, type ToolId } from "@/lib/tools/registry";

export const metadata: Metadata = pageMetadata({
  title: `Free Online Image Tools – Resize, Compress & Convert Images | ${siteConfig.name}`,
  description:
    "Free online image tools to resize, compress, convert and crop JPG, PNG, WebP and HEIC images, or hit an exact KB size. Works in your browser: no upload, no sign-up.",
  path: "/",
});

const popular: ToolId[] = [
  "image-resizer",
  "image-compressor",
  "resize-image-to-kb",
  "image-cropper",
  "background-remover",
  "jpg-to-png",
  "heic-to-jpg",
  "passport-photo",
];

const groups: { id: NavGroup; heading: string; intro: React.ReactNode }[] = [
  {
    id: "image",
    heading: "Image tools",
    intro: (
      <>
        Resize an image online by pixels or percentage, compress JPG, PNG and WebP files, crop, upscale, enhance or remove a
        background. Format-specific resizers handle <Link href="/tools/resize-jpg">JPG</Link>,{" "}
        <Link href="/tools/resize-png">PNG</Link>, <Link href="/tools/resize-webp">WebP</Link> and animated{" "}
        <Link href="/tools/resize-gif">GIF</Link> files, and the{" "}
        <Link href="/tools/instagram-image-resizer">Instagram resizer</Link> sizes photos for posts, Stories and Reels.
      </>
    ),
  },
  {
    id: "convert",
    heading: "Image converters",
    intro: (
      <>
        Convert an image online from one format to another: iPhone HEIC and WebP to JPG, JPG to PNG and back, SVG to PNG, PNG
        to vector SVG, and photos to a single PDF.
      </>
    ),
  },
  {
    id: "size",
    heading: "Photo size tools",
    intro: (
      <>
        When a form says &ldquo;under 50 KB&rdquo;, these get your photo there in one step while keeping it as sharp as
        possible. For any other limit, use <Link href="/tools/resize-image-to-kb">resize image to KB</Link>.
      </>
    ),
  },
  {
    id: "application",
    heading: "Exam and passport photos",
    intro: (
      <>
        Photo and signature sizes taken from official notifications, each with its source and check date, and a tool that
        applies them. <Link href={APPLICATION_HUB.path}>Compare every exam&apos;s requirements</Link> on one page.
      </>
    ),
  },
];

const faqs: FaqItem[] = [
  {
    question: "Are these image tools really free?",
    answer:
      "Yes. Every tool is free to use as often as you like, with no account, no daily limit and no watermark added to your images.",
  },
  {
    question: "Are my images uploaded to a server?",
    answer:
      "No. The tools run inside your web browser, so your image is opened, processed and saved on your own device. It is never sent over the internet, which also makes the tools fast on slow connections.",
  },
  {
    question: "Which image formats are supported?",
    answer:
      "JPG and JPEG, PNG and WebP work in every tool. iPhone HEIC photos open in the image resizer, cropper, bulk resizer and HEIC to JPG converter, GIFs in the GIF resizer, and SVG in the SVG to PNG converter. Results can be saved as JPG, PNG or WebP, and as PDF or SVG where that makes sense.",
  },
  {
    question: "What is the difference between resizing and compressing an image?",
    answer:
      "Resizing changes the dimensions in pixels, such as 4000 × 3000 to 1600 × 1200, which also makes the file smaller. Compressing keeps the dimensions and makes the file smaller by storing it more efficiently. To reach a set limit such as 100 KB, the resize to KB tool combines both.",
  },
  {
    question: "Is there a file size limit?",
    answer:
      "Images can be up to 50 MB and 100 megapixels. Because the work happens on your device, very large images are handled more comfortably by a computer than by an older phone.",
  },
  {
    question: "Do the tools work on phones?",
    answer:
      "Yes. The tools work in current mobile browsers on Android and iPhone. You can pick a photo from your gallery or files and download the result straight back to your phone.",
  },
];

const steps = [
  ["Choose an image", "Drop it in, pick it from your files or paste it. Your browser opens it; nothing is uploaded."],
  ["Set what you need", "Dimensions, a file size such as 100 KB, a crop, a quality level or an output format."],
  ["Check and download", "Compare before and after, including the exact file size, then save the result."],
];

function ToolLinkList({ ids }: { ids: ToolId[] }) {
  return (
    <ul className="mt-5 grid border-t border-line sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
      {ids.map((id) => {
        const tool = getTool(id);
        return (
          <li key={id} className="border-b border-line">
            <Link href={tool.path} className="group flex gap-3 py-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                <ToolIcon category={tool.category} id={tool.id} />
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-ink group-hover:text-accent group-hover:underline">{tool.name}</span>
                <span className="mt-0.5 block text-sm leading-snug text-muted">{tool.summary}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-x-14 gap-y-6 px-4 pb-10 pt-8 sm:gap-y-8 sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[auto_auto] lg:pb-16">
          <div className="lg:self-end">
            <h1 className="text-[2.125rem] font-bold leading-[1.12] tracking-tight text-ink sm:text-5xl">Free Online Image Tools</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
              Resize, compress, convert and edit images directly in your browser.
              <span className="hidden sm:inline">
                {" "}
                Get the exact dimensions, file size or format a website, email or application form asks for.
              </span>
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink">
              {["No upload", "No sign-up", "No watermark"].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="text-success">
                    <path d="M3.5 8.2l3 3 6-6.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <QuickStart />
          </div>
          <div className="lg:self-start">
            <p className="text-sm text-muted">
              Popular:{" "}
              <Link href="/tools/image-resizer" className="text-accent hover:underline">Image resizer</Link>
              {" · "}
              <Link href="/tools/image-compressor" className="text-accent hover:underline">Image compressor</Link>
              {" · "}
              <Link href="/tools/50kb-photo" className="text-accent hover:underline">Resize to 50KB</Link>
              {" · "}
              <Link href="/tools/jpg-to-png" className="text-accent hover:underline">JPG to PNG</Link>
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="popular-heading" className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="popular-heading" className="text-2xl font-bold tracking-tight text-ink">
            Popular tools
          </h2>
          <Link href="/tools" className="text-sm font-medium text-accent hover:underline">
            All image tools <span aria-hidden="true">→</span>
          </Link>
        </div>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((id) => (
            <li key={id}>
              <ToolCard tool={getTool(id)} />
            </li>
          ))}
        </ul>
      </section>

      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`group-${group.id}`} className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
          <h2 id={`group-${group.id}`} className="text-2xl font-bold tracking-tight text-ink">
            {group.heading}
          </h2>
          <p className="mt-2 max-w-3xl leading-relaxed text-ink-soft [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2">
            {group.intro}
          </p>
          <ToolLinkList ids={toolsIn(group.id).map((tool) => tool.id)} />
        </section>
      ))}

      <section aria-labelledby="privacy-heading" className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="grid gap-10 rounded-lg bg-surface p-6 sm:p-10 md:grid-cols-2 md:gap-16">
          <div>
            <h2 id="privacy-heading" className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Your images stay on your device
            </h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Most online image tools upload your photo to a server, process it there and send it back. Imgifyr works
              differently: the processing code runs inside your web browser, so the image is resized, compressed or converted
              on your own computer or phone.
            </p>
            <p className="mt-3 leading-relaxed text-ink-soft">
              There is nothing for us to store, view or delete. That matters when the image is an ID photo, a signature or a
              document scan.{" "}
              <Link href="/methodology" className="font-medium text-accent underline underline-offset-2">
                See how the tools work
              </Link>{" "}
              or read the{" "}
              <Link href="/privacy" className="font-medium text-accent underline underline-offset-2">
                privacy policy
              </Link>
              .
            </p>
          </div>
          <dl className="grid gap-6 self-start sm:grid-cols-2">
            {[
              ["Private by design", "Images are never uploaded, so they can't be leaked, kept or used for training."],
              ["Exact numbers", "Every result shows its real file size, measured from the file you download."],
              ["Honest results", "If a target can't be reached, the tool says so instead of pretending."],
              ["Metadata removed", "Processed images don't carry camera details or GPS location from the original."],
            ].map(([title, text]) => (
              <div key={title}>
                <dt className="font-semibold text-ink">{title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h2 id="how-heading" className="text-2xl font-bold tracking-tight text-ink">
          How Imgifyr works
        </h2>
        <ol className="mt-6 grid gap-8 sm:grid-cols-3">
          {steps.map(([title, text], index) => (
            <li key={title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
              >
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Faq items={faqs} />
      </div>
    </>
  );
}
