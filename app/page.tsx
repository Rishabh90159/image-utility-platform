import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/faq/faq";
import { QuickStart } from "@/components/home/quick-start";
import { ToolTile } from "@/components/home/tool-tile";
import { PhotoCard } from "@/components/controls/photo-card";
import { TINTS, type Tint } from "@/components/controls/tints";
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
    id: "pdf",
    heading: "PDF tools",
    intro: (
      <>
        Convert Word documents to PDF and PDFs to editable Word, or merge several PDFs into one, without uploading them. See
        all <Link href="/tools/pdf-tools">PDF tools</Link>.
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

const benefits: { title: string; text: string; icon: React.ReactNode }[] = [
  {
    title: "Private by design",
    text: "Images are never uploaded, so they can't be leaked, kept or used for training.",
    icon: <path d="M10 2.5l6 2.2v4.6c0 3.9-2.6 6.9-6 8.2-3.4-1.3-6-4.3-6-8.2V4.7z M7.3 10l1.9 1.9 3.6-3.8" />,
  },
  {
    title: "Exact numbers",
    text: "Every result shows its real file size, measured from the file you download.",
    icon: <path d="M2.5 6.5h15v7h-15z M5.5 6.5v2.5 M8.5 6.5v3.5 M11.5 6.5v2.5 M14.5 6.5v3.5" />,
  },
  {
    title: "Honest results",
    text: "If a target can't be reached, the tool says so instead of pretending.",
    icon: <path d="M10 17.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15z M6.8 10.2l2.2 2.2 4.2-4.4" />,
  },
  {
    title: "Metadata removed",
    text: "Processed images don't carry camera details or GPS location from the original.",
    icon: <path d="M10 17.5s5.5-4.7 5.5-9a5.5 5.5 0 00-11 0c0 4.3 5.5 9 5.5 9z M3 3l14 14" />,
  },
];

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="2.5" y="6" width="9" height="6.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

const steps = [
  ["Choose an image", "Drop it in, pick it from your files or paste it. Your browser opens it; nothing is uploaded."],
  ["Set what you need", "Dimensions, a file size such as 100 KB, a crop, a quality level or an output format."],
  ["Check and download", "Compare before and after, including the exact file size, then save the result."],
];

const popular: { id: ToolId; tint: Tint; blurb: string }[] = [
  { id: "image-resizer", tint: "blue", blurb: "Resize to any width and height." },
  { id: "image-compressor", tint: "green", blurb: "Shrink file size, keep the dimensions." },
  { id: "jpg-to-png", tint: "orange", blurb: "Convert JPG photos to PNG." },
  { id: "png-to-jpg", tint: "violet", blurb: "Turn PNGs into smaller JPGs." },
  { id: "resize-image-to-kb", tint: "rose", blurb: "Hit an exact size such as 50 KB." },
  { id: "webp-to-jpg", tint: "teal", blurb: "Convert WebP images to JPG." },
  { id: "image-cropper", tint: "amber", blurb: "Crop freely or to a set ratio." },
  { id: "bulk-image-resizer", tint: "sky", blurb: "Resize many images at once." },
];

const photoTools: { id: ToolId; tint: Tint; blurb: string }[] = [
  { id: "passport-photo", tint: "blue", blurb: "Official sizes by country." },
  { id: "20kb-photo", tint: "green", blurb: "Get a photo under 20 KB." },
  { id: "50kb-photo", tint: "orange", blurb: "Get a photo under 50 KB." },
  { id: "100kb-photo", tint: "sky", blurb: "Get a photo under 100 KB." },
  { id: "200kb-photo", tint: "rose", blurb: "Get a photo under 200 KB." },
  { id: "ssc-photo", tint: "violet", blurb: "SSC photo and signature sizes." },
];

const converters: { id: ToolId; tint: Tint; blurb: string }[] = [
  { id: "heic-to-jpg", tint: "rose", blurb: "Open iPhone photos anywhere." },
  { id: "jpg-to-png", tint: "orange", blurb: "Convert JPG photos to PNG." },
  { id: "svg-to-png", tint: "violet", blurb: "Render SVG at any pixel size." },
  { id: "png-to-svg", tint: "blue", blurb: "Trace a PNG into a vector." },
  { id: "photo-to-pdf", tint: "green", blurb: "Combine photos into one PDF." },
];

const trust: { title: string; text: string; tint: Tint; icon: React.ReactNode }[] = [
  { title: "100% free", text: "No account, no daily limit", tint: "green", icon: <path d="M10 17.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15z M6.8 10.2l2.2 2.2 4.2-4.4" /> },
  { title: "No sign-up", text: "Start straight away", tint: "blue", icon: <path d="M10 2.5l6 2.2v4.6c0 3.9-2.6 6.9-6 8.2-3.4-1.3-6-4.3-6-8.2V4.7z" /> },
  { title: "No upload", text: "Runs on your device", tint: "violet", icon: <path d="M4 10.5h12v7H4z M6.5 10.5V7.5a3.5 3.5 0 017 0v3" /> },
  { title: "No watermark", text: "Clean, full-quality files", tint: "orange", icon: <path d="M3 5.5h14v10H3z M3 12.5l4-3.5 3 2.5 2.5-2 4.5 3.5 M13 8.5h.01" /> },
];

const benefitTints: Tint[] = ["green", "blue", "violet", "rose"];

function Icon20({ children, size = 20 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function SectionHeader({ id, title, intro, more }: { id: string; title: string; intro: string; more?: { href: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <h2 id={id} className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
          {title}
        </h2>
        <p className="mt-1 text-muted">{intro}</p>
      </div>
      {more ? (
        <Link href={more.href} className="text-sm font-semibold text-accent hover:underline">
          {more.label} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}

/** Decorative hero illustration: a photo before and after processing. Labels only, no example numbers. */
function HeroIllustration() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute right-0 top-1/2 hidden w-48 -translate-y-1/2 xl:block">
      <div className="relative h-72">
        <PhotoCard className="absolute left-0 top-6 w-40 -rotate-6 rounded-lg shadow-lg" />
        <PhotoCard className="absolute bottom-8 left-8 w-36 rotate-3 rounded-lg shadow-lg" />
        <svg viewBox="0 0 60 80" className="absolute -right-2 top-24 w-11 text-accent">
          <path d="M8 6c30 4 44 26 34 60" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" />
          <path d="M34 60l8 8 6-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="absolute -right-3 top-0 rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink shadow">
          Original
        </span>
        <span className="absolute -right-4 bottom-2 flex items-center gap-1.5 rounded-md border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink shadow">
          Compressed
          <span className="rounded bg-success-soft px-1.5 py-0.5 text-[0.6875rem] font-bold text-success-ink">Smaller</span>
        </span>
      </div>
    </div>
  );
}

function ToolLinkList({ ids }: { ids: ToolId[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {ids.map((id) => {
        const tool = getTool(id);
        return (
          <li key={id}>
            <Link
              href={tool.path}
              className="group flex h-full gap-3 rounded-lg border border-line bg-canvas p-3.5 transition-colors hover:border-accent/50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-white">
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
      <section className="border-b border-accent/10 bg-accent-soft">
        <div className="mx-auto grid max-w-6xl items-center gap-x-12 gap-y-8 px-4 pb-12 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:pb-16">
          <div>
            {/* The H1 keeps the page's main keyword; the larger line below is the visual headline. */}
            <h1 className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-canvas px-3 py-1 font-sans text-sm font-semibold text-accent-ink">
              <LockIcon />
              Free Online Image Tools
            </h1>
            <p className="mt-4 font-display text-[2.25rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-ink sm:text-5xl">
              Edit, Convert &amp; Optimize <span className="text-accent lg:block">Images Online</span>
            </p>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
              Resize, compress, convert and edit images directly in your browser.
              <span className="hidden sm:inline">
                {" "}
                Get the exact dimensions, file size or format a website, email or application form asks for.
              </span>
            </p>
            <ul className="mt-7 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2">
              {trust.map((item) => (
                <li key={item.title} className="flex items-center gap-2.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TINTS[item.tint]}`}>
                    <Icon20 size={18}>{item.icon}</Icon20>
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block text-sm font-semibold text-ink">{item.title}</span>
                    <span className="block text-xs text-muted">{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative xl:pr-36">
            <QuickStart />
            <HeroIllustration />
          </div>
        </div>
      </section>

      <section aria-labelledby="popular-heading" className="render-later mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <SectionHeader
          id="popular-heading"
          title="Popular image tools"
          intro="The most used tools to resize, compress, convert and crop images."
          more={{ href: "/tools", label: "View all tools" }}
        />
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map(({ id, tint, blurb }) => (
            <li key={id}>
              <ToolTile tool={getTool(id)} tint={tint} blurb={blurb} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="photo-heading" className="render-later mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <SectionHeader
          id="photo-heading"
          title="Photo and exam tools"
          intro="Prepare photos for application forms, exams and passports."
          more={{ href: APPLICATION_HUB.path, label: "Compare exam requirements" }}
        />
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {photoTools.map(({ id, tint, blurb }) => (
            <li key={id}>
              <ToolTile tool={getTool(id)} tint={tint} blurb={blurb} compact />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="convert-heading" className="render-later mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <SectionHeader
          id="convert-heading"
          title="Convert between formats"
          intro="Change an image to the format a website or app accepts."
          more={{ href: "/tools#group-convert", label: "View all converters" }}
        />
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {converters.map(({ id, tint, blurb }) => (
            <li key={id}>
              <ToolTile tool={getTool(id)} tint={tint} blurb={blurb} compact />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-heading" className="render-later mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="relative overflow-hidden rounded-xl bg-accent-soft px-6 py-8 sm:px-10 sm:py-10">
          <h2 id="how-heading" className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
            How Imgifyr works
          </h2>
          <p className="mt-1 text-muted">Three steps, all inside your browser.</p>
          <ol className="mt-7 grid gap-6 md:grid-cols-3 lg:mr-56">
            {steps.map(([title, text], index) => (
              <li key={title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-display text-base font-bold text-white"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-3 right-8 hidden w-48 lg:block">
            <div className="relative">
              <PhotoCard className="w-44 -rotate-3 rounded-lg shadow-lg" />
              <span className="absolute -right-1 bottom-4 flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-accent shadow-lg">
                <svg width="20" height="20" viewBox="0 0 18 18">
                  <path d="M9 2.5v9M5 8l4 4 4-4M3 15.5h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="why-heading" className="render-later mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h2 id="why-heading" className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">
          Why use Imgifyr?
        </h2>
        <p className="mt-1 text-muted">Simple, private image tools that tell you exactly what they did.</p>
        <dl className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ title, text, icon }, index) => (
            <div key={title} className="flex gap-3.5">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${TINTS[benefitTints[index]]}`}>
                <Icon20>{icon}</Icon20>
              </span>
              <div>
                <dt className="font-semibold text-ink">{title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">{text}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex flex-col gap-5 rounded-xl border border-line bg-surface p-6 sm:flex-row sm:p-8">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-white">
            <Icon20 size={22}>
              <path d="M10 2.5l6 2.2v4.6c0 3.9-2.6 6.9-6 8.2-3.4-1.3-6-4.3-6-8.2V4.7z M7.3 10l1.9 1.9 3.6-3.8" />
            </Icon20>
          </span>
          <div>
            <h3 id="privacy-heading" className="text-xl font-bold tracking-tight text-ink">
              Your images stay on your device
            </h3>
            <p className="mt-2 leading-relaxed text-ink-soft">
              Most online image tools upload your photo to a server, process it there and send it back. Imgifyr works
              differently: the processing code runs inside your web browser, so the image is resized, compressed or converted
              on your own computer or phone.
            </p>
            <p className="mt-2 leading-relaxed text-ink-soft">
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
        </div>
      </section>

      <div className="render-later mt-16 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl divide-y divide-line px-4 sm:px-6">
          {groups.map((group) => (
            <section
              key={group.id}
              aria-labelledby={`group-${group.id}`}
              className="grid gap-x-12 gap-y-4 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)] lg:py-12"
            >
              <div className="lg:sticky lg:top-24 lg:self-start">
                <h2 id={`group-${group.id}`} className="text-2xl font-bold tracking-tight text-ink">
                  {group.heading}
                </h2>
                <p className="mt-2 leading-relaxed text-ink-soft [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2">
                  {group.intro}
                </p>
              </div>
              <ToolLinkList ids={toolsIn(group.id).map((tool) => tool.id)} />
            </section>
          ))}
        </div>
      </div>

      <div className="render-later mx-auto max-w-3xl px-4 pt-16 sm:px-6">
        <Faq items={faqs} variant="boxed" intro="Answers to common questions about Imgifyr." className="" />
      </div>
    </>
  );
}
