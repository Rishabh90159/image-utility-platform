import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/layout/content-page";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: `Terms of Use | ${siteConfig.name}`,
  description: `The terms for using ${siteConfig.name}'s free browser-based image tools to resize, compress and convert images.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <ContentPage
      title="Terms of use"
      path="/terms"
      updated="2026-10-06"
      intro={<p>By using {siteConfig.name}, you agree to these terms. They&apos;re written to be short and readable.</p>}
    >
      <h2>The service</h2>
      <p>
        {siteConfig.name} provides free online tools to resize, compress and convert images. The tools run in your web
        browser; your images are processed on your device and are not uploaded to us. No account is needed.
      </p>

      <h2>Your images</h2>
      <ul>
        <li>You keep all rights to your images. We don&apos;t receive them, so we claim no rights over them.</li>
        <li>
          You are responsible for having the right to use and modify the images you process, and for how you use the results.
        </li>
        <li>Keep your original files. Processing creates new files and doesn&apos;t alter your originals, but you should not rely on these tools as a backup.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t use the site to break the law, to process content you have no right to use, or to interfere with the site
        or its availability for others (for example through automated abuse or attempts to break its security).
      </p>

      <h2>No guarantee of results</h2>
      <p>
        We work hard to make the tools accurate, and we show exact output sizes so you can check results. However, the tools
        are provided &ldquo;as is&rdquo;, without warranties of any kind. We can&apos;t guarantee that a processed image will be
        accepted by any particular website, form or organisation, or that every image can reach every requested size. Please
        check results before relying on them, especially for official applications.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent permitted by law, {siteConfig.name} is not liable for any indirect or consequential loss, or for loss of
        data, arising from use of the site. Nothing in these terms limits liability that can&apos;t be limited by law.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms or change, add or remove tools. When the terms change, we&apos;ll update the date above.
        Continuing to use the site after a change means you accept the updated terms.
      </p>

      <h2>Privacy</h2>
      <p>
        See the <Link href="/privacy">privacy policy</Link> for how data is handled. Questions about these terms?{" "}
        <Link href="/contact">Contact us</Link>.
      </p>
    </ContentPage>
  );
}
