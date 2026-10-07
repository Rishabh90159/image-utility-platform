import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/layout/content-page";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: `Privacy Policy | ${siteConfig.name}`,
  description: `How ${siteConfig.name} handles your images and data: images are processed in your browser and never uploaded, with no accounts and no advertising cookies.`,
  path: "/privacy",
});

const analyticsEnabled = Boolean(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN);

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy policy"
      path="/privacy"
      updated="2026-10-07"
      intro={
        <p>
          The short version: your images are processed in your browser and are never uploaded to us or anyone else. There
          are no accounts, and we don&apos;t sell or share personal data.
        </p>
      }
    >
      <h2>Your images</h2>
      <ul>
        <li>
          All image tools on {siteConfig.name} run inside your web browser. When you select an image, it is read from your
          device and processed in your browser&apos;s memory.
        </li>
        <li>Your images, their contents and their file names are never sent to our servers or to any third party.</li>
        <li>
          We don&apos;t store your images. They exist only in your browser tab and are discarded when you reset the tool, choose
          another image or close the page.
        </li>
        <li>
          Processed images don&apos;t include metadata such as GPS location from the original, which helps if you share them
          afterwards.
        </li>
        <li>
          Some tools load extra processing code only when you use them, for example the HEIC decoder (about 2 MB), the
          SVG tracing engine, or the background remover&apos;s neural-network model (about 4.6 MB) and the ONNX Runtime
          engine that runs it (about 14 MB). These files are downloaded from this website to your browser; nothing is sent
          in the other direction, and your image is never part of the request.
        </li>
        <li>
          Batch downloads (ZIP files) are assembled in your browser. Passport photos and signatures, which are especially
          personal, are handled exactly like every other image: locally, and never stored by us.
        </li>
      </ul>
      <p>
        This is enforced technically as well as by policy: the site&apos;s Content Security Policy tells your browser to block
        network requests to any other server{analyticsEnabled ? ", except the analytics service described below" : ""}.
        The <Link href="/methodology">methodology page</Link> explains how the processing works.
      </p>

      <h2>Analytics</h2>
      {analyticsEnabled ? (
        <>
          <p>
            We use Plausible Analytics, a privacy-friendly service that doesn&apos;t use cookies and doesn&apos;t collect
            personal data, to understand which tools are useful. It records page views and a small set of events, such as
            &ldquo;a tool was opened&rdquo;, &ldquo;an image was compressed&rdquo; or &ldquo;a download was clicked&rdquo;.
          </p>
          <p>
            Events may include general details such as the tool used, the input and output format (for example, PNG to JPG),
            and a broad size range (for example, &ldquo;1–5 MB&rdquo;). They never include your images, file names, exact file
            sizes or any personal information. Plausible doesn&apos;t track you across websites.
          </p>
        </>
      ) : (
        <p>
          We don&apos;t currently use any analytics service. If we add one in the future, it will be a privacy-friendly,
          cookieless service that never receives images, file names or personal information, and this policy will be updated
          before it goes live.
        </p>
      )}

      <h2>Cookies and local storage</h2>
      <p>
        {siteConfig.name} doesn&apos;t set cookies for tracking or advertising. The site doesn&apos;t require cookies to work.
      </p>

      <h2>Server logs</h2>
      <p>
        Like any website, the servers that deliver these pages may briefly keep standard technical logs (such as IP address,
        browser type and the page requested) to keep the service secure and working. These logs never contain your images,
        because images are never sent to the server.
      </p>

      <h2>Advertising</h2>
      <p>
        There is no advertising on {siteConfig.name} today. If advertising is added in the future, this policy will be
        updated beforehand to describe what the advertising provider collects, and we&apos;ll ask for your consent where the
        law requires it. Your images would still never be shared, because they never leave your device.
      </p>

      <h2>Data retention</h2>
      <p>
        We hold no images and no accounts, so there is nothing of yours to retain.
        {analyticsEnabled ? " Aggregated, anonymous analytics statistics are kept to understand usage trends over time." : ""}{" "}
        Technical server logs, where kept by our hosting provider, are retained only for a limited period for security and
        reliability.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, delete or object to the processing of personal
        data about you. Because we don&apos;t collect personal data through the tools, there is usually nothing to access or
        delete, but you&apos;re welcome to <Link href="/contact">contact us</Link> with any question or request and
        we&apos;ll respond.
      </p>

      <h2>Children</h2>
      <p>The tools are suitable for general audiences and don&apos;t collect personal information from anyone, including children.</p>

      <h2>Changes to this policy</h2>
      <p>
        If how we handle data changes, we&apos;ll update this page and the &ldquo;Last updated&rdquo; date above before the change
        takes effect.
      </p>
    </ContentPage>
  );
}
