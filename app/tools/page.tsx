import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs/breadcrumbs";
import { ToolCard } from "@/components/tool-card/tool-card";
import { pageMetadata } from "@/lib/seo/metadata";
import { allTools, type ToolCategory } from "@/lib/tools/registry";

export const metadata: Metadata = pageMetadata({
  title: "All Image Tools – Resize, Crop, Compress and Convert Images",
  description:
    "Every free image tool in one place: resize and crop images, hit 20KB–200KB limits, prepare exam and passport photos, and convert HEIC, SVG, PNG and JPG.",
  path: "/tools",
});

const groups: { category: ToolCategory; heading: string; text: string }[] = [
  {
    category: "resize",
    heading: "Resize images",
    text: "Change dimensions in pixels for one image or a whole batch, or reduce an image to a file size limit such as 50 KB.",
  },
  {
    category: "edit",
    heading: "Crop and prepare images",
    text: "Crop to any ratio, and prepare passport photos and signatures for application forms.",
  },
  {
    category: "compress",
    heading: "Compress images",
    text: "Make files smaller while keeping their dimensions.",
  },
  {
    category: "convert",
    heading: "Convert image formats",
    text: "Convert iPhone HEIC photos, render SVG to PNG, trace PNG into vector SVG, and switch between JPG and PNG.",
  },
  {
    category: "size",
    heading: "Photo size tools",
    text: "Get a photo under a common file-size limit in one step: 20 KB, 50 KB, 100 KB or 200 KB.",
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
          { name: "Image tools", path: "/tools" },
        ]}
      />
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">All image tools</h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-soft">
        Free tools that run in your browser. Pick the one that matches what you need to do; your images are never uploaded.
      </p>

      {groups.map((group) => (
        <section key={group.category} aria-labelledby={`group-${group.category}`} className="mt-12">
          <h2 id={`group-${group.category}`} className="text-xl font-semibold text-ink">
            {group.heading}
          </h2>
          <p className="mt-1 text-muted">{group.text}</p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allTools
              .filter((tool) => tool.category === group.category)
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
