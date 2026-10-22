import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/layout/content-page";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site";
import { allTools } from "@/lib/tools/registry";

export const metadata: Metadata = pageMetadata({
  title: `About ${siteConfig.name} – Private Image Tools That Run in Your Browser`,
  description: `${siteConfig.name} builds free, focused image tools that resize, compress and convert images on your own device, so your files are never uploaded.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <ContentPage
      title={`About ${siteConfig.name}`}
      path="/about"
      intro={<p>{siteConfig.tagline}</p>}
    >
      <h2>Why this exists</h2>
      <p>
        Most image tasks people search for are small and specific: a photo must be under 50 KB for a form, a screenshot
        must be a JPG, a picture must be 1080 pixels wide. Yet most online tools handle them by uploading your image to a
        server you know nothing about, often surrounded by distracting ads and sign-up prompts.
      </p>
      <p>
        {siteConfig.name} takes a different approach. Each tool does one job well, shows you exactly what it did, and runs
        entirely in your browser, so your image never leaves your device.
      </p>

      <h2>Principles</h2>
      <ul>
        <li>
          <strong>Free, with no limits.</strong> No account, no daily cap, no file-count limit and no watermark on any
          download, including passport photos and PDFs.
        </li>
        <li>
          <strong>Privacy by design.</strong> Images are processed in your browser and are not uploaded. There is no account
          to create and nothing to delete afterwards.
        </li>
        <li>
          <strong>Accurate results.</strong> File sizes shown are measured from the actual file you download. When a target
          can&apos;t be reached, the tool says so and explains why.
        </li>
        <li>
          <strong>Quality first.</strong> When an image has to get smaller, the tools choose the approach that looks best,
          such as reducing dimensions before crushing quality.
        </li>
        <li>
          <strong>No exaggerated claims.</strong> Lossy compression is described as lossy, and conversion is never presented
          as a way to restore quality.
        </li>
      </ul>

      <h2>Why it&apos;s free, and will stay free</h2>
      <p>
        Online tools usually limit free use because every file you upload costs them server time and storage, so &ldquo;free&rdquo;
        becomes a trial: a few files a day, a low-resolution preview, or a watermark until you pay. {siteConfig.name} works the
        other way round. The processing runs on your own device, so one conversion or a thousand costs the same to us:
        nothing beyond serving the page.
      </p>
      <p>
        That&apos;s why the tools have no daily cap, no watermark and no paid tier. If the site ever carries a sponsor message
        to cover hosting, it will never limit, watermark or slow down a tool, and your files will still never be uploaded.
        The only limits are practical ones, stated on each tool: for example, images up to 50 MB, since very large files are
        hard for a phone to process.
      </p>

      <h2>The tools</h2>
      <ul>
        {allTools.map((tool) => (
          <li key={tool.id}>
            <Link href={tool.path}>{tool.name}</Link>: {tool.summary}
          </li>
        ))}
      </ul>

      <h2>How the tools work</h2>
      <p>
        The <Link href="/methodology">methodology page</Link> explains in plain language how images are resized,
        compressed and converted, and how the target-size search works. The <Link href="/privacy">privacy policy</Link>{" "}
        covers what data, if any, is collected.
      </p>

      <h2>Feedback</h2>
      <p>
        Found a bug, or a format or size requirement the tools don&apos;t handle well? <Link href="/contact">Get in touch</Link>
        . Reports about specific upload requirements are especially useful.
      </p>
    </ContentPage>
  );
}
