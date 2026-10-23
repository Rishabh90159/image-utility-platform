import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs/breadcrumbs";
import { ToolCard } from "@/components/tool-card/tool-card";
import { pageMetadata } from "@/lib/seo/metadata";
import Link from "next/link";
import { allTools, APPLICATION_HUB, PDF_HUB, type ToolCategory } from "@/lib/tools/registry";

export const metadata: Metadata = pageMetadata({
  title: "All Image Tools – Resize, Crop, Compress and Convert Images",
  description:
    "Every free image tool in one place: resize, upscale, crop and enhance images, remove backgrounds, convert and merge PDFs, hit 20KB–200KB limits and convert formats.",
  path: "/tools",
});

const groups: { category: ToolCategory; heading: string; text: string }[] = [
  {
    category: "resize",
    heading: "Resize images",
    text: "Change dimensions in pixels for one image or a whole batch, enlarge small images, or meet a file size limit such as 50 KB.",
  },
  {
    category: "edit",
    heading: "Edit and prepare images",
    text: "Crop, remove backgrounds, enhance photos, merge several images into one, and prepare passport photos and signatures.",
  },
  {
    category: "compress",
    heading: "Compress images",
    text: "Make files smaller while keeping their dimensions.",
  },
  {
    category: "convert",
    heading: "Convert image formats",
    text: "Convert iPhone HEIC photos and WebP images to JPG, photos to PDF, SVG to PNG and back, and switch between JPG and PNG.",
  },
  {
    category: "pdf",
    heading: "PDF tools",
    text: "Convert Word documents to PDF and PDFs to editable Word, and merge several PDFs into one.",
  },
  {
    category: "size",
    heading: "Photo size tools",
    text: "Get a photo under a common file-size limit in one step: 20 KB, 50 KB, 100 KB or 200 KB, and convert between MB and KB.",
  },
  {
    category: "application",
    heading: "Exam and passport photos",
    text: "Photo and signature requirements copied from official notifications, with a tool that applies them. Each page shows its source and when it was last checked.",
  },
];

export default function ToolsIndexPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Tools", path: "/tools" },
        ]}
      />
      <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.02em] text-ink sm:text-4xl">All image tools</h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-soft">
        Free tools that run in your browser. Pick the one that matches what you need to do; your images are never uploaded.
      </p>

      {/* Jump links to each group; on phones they scroll sideways in one row instead of wrapping. */}
      <nav aria-label="Tool groups" className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2 sm:flex-wrap">
          {groups.map((group) => (
            <li key={group.category} className="shrink-0">
              <a
                href={`#group-${group.category}`}
                className="inline-flex min-h-10 items-center rounded-full border border-line bg-canvas px-4 text-sm font-medium text-ink-soft transition-colors hover:border-accent/50 hover:text-accent"
              >
                {group.heading}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {groups.map((group) => (
        <section key={group.category} aria-labelledby={`group-${group.category}`} className="mt-10 sm:mt-12">
          <h2 id={`group-${group.category}`} className="text-xl font-bold tracking-tight text-ink">
            {group.heading}
          </h2>
          <p className="mt-1 text-muted">
            {group.text}
            {group.category === "pdf" ? (
              <>
                {" "}
                <Link href={PDF_HUB.path} className="text-accent underline underline-offset-2">
                  See all PDF tools
                </Link>
                .
              </>
            ) : null}
            {group.category === "application" ? (
              <>
                {" "}
                <Link href={APPLICATION_HUB.path} className="text-accent underline underline-offset-2">
                  Compare every exam&apos;s photo and signature requirements
                </Link>
                .
              </>
            ) : null}
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {allTools
              .filter((tool) => tool.category === group.category || (group.category === "size" && tool.category === "units"))
              .map((tool) => (
                <li key={tool.id}>
                  <ToolCard tool={tool} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
