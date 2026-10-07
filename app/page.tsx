import type { Metadata } from "next";
import Link from "next/link";
import { ToolCard } from "@/components/tool-card/tool-card";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site";
import { allTools } from "@/lib/tools/registry";

export const metadata: Metadata = pageMetadata({
  title: `Free Online Image Tools – Resize, Compress & Convert | ${siteConfig.name}`,
  description:
    "Free online image tools to resize, compress, crop and convert photos, hit exact KB sizes, remove backgrounds and prepare exam photos. Runs in your browser.",
  path: "/",
});

const commonTasks = [
  { href: "/tools/20kb-photo", label: "Resize a photo to 20KB" },
  { href: "/tools/50kb-photo", label: "Resize a photo to 50KB" },
  { href: "/tools/100kb-photo", label: "Reduce a photo to 100KB" },
  { href: "/tools/200kb-photo", label: "Reduce an image to 200KB" },
  { href: "/tools/ibps-photo", label: "Make an IBPS photo and signature" },
  { href: "/tools/neet-photo", label: "Prepare a NEET photo" },
  { href: "/tools/passport-photo", label: "Make a passport size photo" },
  { href: "/tools/application-photos", label: "Compare exam photo requirements" },
  { href: "/tools/ssc-photo", label: "SSC photo and signature rules" },
  { href: "/tools/image-compressor", label: "Compress a PNG or JPG" },
  { href: "/tools/image-resizer", label: "Resize an image to 1920 px wide" },
  { href: "/tools/background-remover", label: "Remove the background from a photo" },
  { href: "/tools/photo-to-pdf", label: "Turn photos into one PDF" },
  { href: "/tools/image-upscaler", label: "Upscale a small image 2×" },
  { href: "/tools/image-size-increase", label: "Increase a photo's size in KB" },
  { href: "/tools/merge-images", label: "Combine two photos side by side" },
  { href: "/tools/png-to-jpg", label: "Convert PNG to JPG with a white background" },
  { href: "/tools/jpg-to-png", label: "Convert JPEG to PNG" },
  { href: "/tools/heic-to-jpg", label: "Convert an iPhone HEIC photo to JPG" },
  { href: "/tools/webp-to-jpg", label: "Convert a WebP image to JPG" },
  { href: "/tools/image-cropper", label: "Crop a photo to a square (1:1)" },
  { href: "/tools/passport-photo-resizer", label: "Resize a photo for a passport form" },
  { href: "/tools/signature-resizer", label: "Resize a signature for an online form" },
  { href: "/tools/bulk-image-resizer", label: "Resize many photos at once" },
  { href: "/tools/svg-to-png", label: "Convert an SVG logo to PNG" },
  { href: "/tools/png-to-svg", label: "Turn a PNG logo into an SVG" },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16">
          <p className="text-sm font-semibold text-accent">Free · No sign-up · No upload</p>
          <h1 className="mt-3 max-w-3xl text-[2.125rem] font-bold leading-[1.15] tracking-tight text-ink sm:text-5xl">
            Free Online Image Tools
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Resize, crop, compress and convert images quickly with privacy-first tools that work directly in your browser.
            Make your image fit the exact requirement: dimensions, file size in KB or format, for a website, an email or an
            application form.
          </p>

          <h2 className="sr-only">Image tools</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allTools.map((tool) => (
              <li key={tool.id}>
                <ToolCard tool={tool} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="privacy-heading" className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h2 id="privacy-heading" className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Your images stay on your device
            </h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              Most online image tools upload your photo to a server, process it there, and send it back. These tools work
              differently: the processing code runs inside your web browser, so the image is read, resized, compressed or
              converted on your own computer or phone.
            </p>
            <p className="mt-3 leading-relaxed text-ink-soft">
              Your image is never sent over the internet, so there is nothing for us to store, view or delete. That matters
              when the image is an ID photo, a signature, a document scan or anything personal.
            </p>
            <p className="mt-3 leading-relaxed text-ink-soft">
              It&apos;s also faster: there is no upload or download wait, even on a slow connection.{" "}
              <Link href="/methodology" className="font-medium text-accent underline underline-offset-2">
                See how the tools work
              </Link>
              .
            </p>
          </div>
          <ol className="space-y-5 self-start rounded-lg border border-line p-6">
            {[
              ["Select an image", "Choose a file, drag it in or paste it. It's opened by your browser, not uploaded."],
              ["Set what you need", "Dimensions, a crop, a file size such as 100 KB, a quality level or an output format."],
              ["Check and download", "Compare before and after, including exact file size, then save the result."],
            ].map(([title, text], index) => (
              <li key={title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{title}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="tasks-heading" className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h2 id="tasks-heading" className="text-2xl font-bold tracking-tight text-ink">
          Common tasks
        </h2>
        <ul className="mt-5 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
          {commonTasks.map((task) => (
            <li key={task.href}>
              <Link href={task.href} className="block border-b border-line py-3 text-accent hover:underline">
                {task.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="overview-heading" className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h2 id="overview-heading" className="text-2xl font-bold tracking-tight text-ink">
          What you can do here
        </h2>
        <div className="mt-6 grid gap-x-12 gap-y-6 text-[0.9375rem] leading-relaxed text-ink-soft md:grid-cols-2">
          <p>
            <strong className="text-ink">Resize and compress.</strong> The{" "}
            <Link href="/tools/image-resizer" className="text-accent underline underline-offset-2">image resizer</Link>{" "}
            changes dimensions in pixels or percent, and the{" "}
            <Link href="/tools/image-compressor" className="text-accent underline underline-offset-2">image compressor</Link>{" "}
            makes JPG, PNG and WebP files smaller without changing them. Together they cover most &ldquo;photo too
            big&rdquo; problems, one image or a{" "}
            <Link href="/tools/bulk-image-resizer" className="text-accent underline underline-offset-2">whole batch</Link>.
          </p>
          <p>
            <strong className="text-ink">Hit an exact file size.</strong> Forms often say &ldquo;under 50 KB&rdquo;.{" "}
            <Link href="/tools/resize-image-to-kb" className="text-accent underline underline-offset-2">Resize image to KB</Link>{" "}
            reaches any limit, with one-step pages for{" "}
            <Link href="/tools/20kb-photo" className="text-accent underline underline-offset-2">20KB</Link>,{" "}
            <Link href="/tools/50kb-photo" className="text-accent underline underline-offset-2">50KB</Link>,{" "}
            <Link href="/tools/100kb-photo" className="text-accent underline underline-offset-2">100KB</Link> and{" "}
            <Link href="/tools/200kb-photo" className="text-accent underline underline-offset-2">200KB</Link>.
          </p>
          <p>
            <strong className="text-ink">Convert formats.</strong> Change{" "}
            <Link href="/tools/png-to-jpg" className="text-accent underline underline-offset-2">PNG to JPG</Link>,{" "}
            <Link href="/tools/jpg-to-png" className="text-accent underline underline-offset-2">JPG to PNG</Link>, iPhone{" "}
            <Link href="/tools/heic-to-jpg" className="text-accent underline underline-offset-2">HEIC to JPG</Link> and{" "}
            <Link href="/tools/webp-to-jpg" className="text-accent underline underline-offset-2">WebP to JPG</Link>, or turn
            several pictures into a document with{" "}
            <Link href="/tools/photo-to-pdf" className="text-accent underline underline-offset-2">photo to PDF</Link>.
          </p>
          <p>
            <strong className="text-ink">Edit and improve.</strong>{" "}
            <Link href="/tools/image-cropper" className="text-accent underline underline-offset-2">Crop images</Link>,{" "}
            <Link href="/tools/background-remover" className="text-accent underline underline-offset-2">remove image backgrounds</Link>,{" "}
            <Link href="/tools/image-upscaler" className="text-accent underline underline-offset-2">upscale small images</Link>{" "}
            and brighten dull photos with the{" "}
            <Link href="/tools/image-quality-enhancer" className="text-accent underline underline-offset-2">quality enhancer</Link>.
          </p>
          <p className="md:col-span-2">
            <strong className="text-ink">Passport and exam photos.</strong> Make a{" "}
            <Link href="/tools/passport-photo" className="text-accent underline underline-offset-2">passport size photo</Link>{" "}
            from official sizes by country, resize a{" "}
            <Link href="/tools/signature-resizer" className="text-accent underline underline-offset-2">signature</Link>, or
            prepare photos for SSC, UPSC, IBPS, SBI and NEET applications using requirements taken from their notifications,
            compared on the{" "}
            <Link href="/tools/application-photos" className="text-accent underline underline-offset-2">exam photo requirements</Link>{" "}
            page.
          </p>
        </div>
      </section>

      <section aria-labelledby="principles-heading" className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <h2 id="principles-heading" className="text-2xl font-bold tracking-tight text-ink">
          What you can expect
        </h2>
        <dl className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Exact numbers", "Every result shows its real file size, down to the byte, measured from the file you download."],
            ["Honest results", "If a target can't be reached, or compression doesn't help, the tool tells you instead of pretending."],
            ["No account, no watermark", "Use any tool as often as you like. Nothing is added to your images."],
            ["Metadata removed", "Processed images don't carry camera details or GPS location from the original photo."],
          ].map(([title, text]) => (
            <div key={title}>
              <dt className="font-semibold text-ink">{title}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted">{text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
