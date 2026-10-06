import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/layout/content-page";
import { pageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: `Contact ${siteConfig.name} – Feedback, Bug Reports and Questions`,
  description: `Contact ${siteConfig.name} to report a problem, suggest an image tool or ask a question about privacy.`,
  path: "/contact",
});

export default function ContactPage() {
  const email = siteConfig.contactEmail;
  return (
    <ContentPage
      title="Contact"
      path="/contact"
      intro={<p>Questions, bug reports and suggestions are all welcome.</p>}
    >
      <h2>Get in touch</h2>
      {email ? (
        <p>
          Email <a href={`mailto:${email}`}>{email}</a>. We read every message and aim to reply within a few working days.
        </p>
      ) : (
        <p>A contact email address will be published here shortly.</p>
      )}

      <h2>Reporting a problem</h2>
      <p>To help us fix an issue quickly, please include:</p>
      <ul>
        <li>Which tool you used and what you were trying to do (for example, &ldquo;resize a PNG to 50 KB&rdquo;).</li>
        <li>The message you saw, if any.</li>
        <li>Your browser and device (for example, Chrome on Android or Safari on iPhone).</li>
        <li>The image&apos;s format, approximate file size and dimensions.</li>
      </ul>
      <p>
        Please don&apos;t send us personal images such as ID photos. Because the tools run in your browser, we never see your
        images, and we don&apos;t need them to investigate most problems.
      </p>

      <h2>Suggesting a tool</h2>
      <p>
        If a website or form asks for an image in a format, size or dimension the current tools don&apos;t handle well, let us
        know the exact requirement. It directly shapes what we build next.
      </p>

      <h2>Privacy questions</h2>
      <p>
        Read the <Link href="/privacy">privacy policy</Link> and <Link href="/methodology">how the tools work</Link>, or
        contact us with any question.
      </p>
    </ContentPage>
  );
}
