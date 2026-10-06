import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs/breadcrumbs";
import { Faq } from "@/components/faq/faq";
import { RelatedTools } from "@/components/related-tools/related-tools";
import { JsonLd } from "@/components/seo/json-ld";
import { webApplicationSchema, type FaqItem } from "@/lib/seo/schema";
import type { ToolDefinition } from "@/lib/tools/registry";

interface ToolPageShellProps {
  tool: ToolDefinition;
  h1: string;
  intro: React.ReactNode;
  /** Description used in WebApplication structured data. */
  schemaDescription: string;
  /** The interactive tool. */
  children: React.ReactNode;
  /** Explanatory content rendered below the tool. */
  content: React.ReactNode;
  faqs: FaqItem[];
}

/**
 * Shared layout for every tool page: breadcrumb, H1, a short intro, then the
 * tool itself as the primary content, followed by guidance, FAQ and related tools.
 */
export function ToolPageShell({ tool, h1, intro, schemaDescription, children, content, faqs }: ToolPageShellProps) {
  return (
    <>
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Image tools", path: "/tools" },
              { name: tool.name, path: tool.path },
            ]}
          />
          <h1 className="mt-4 text-[1.75rem] font-bold leading-tight tracking-tight text-ink sm:text-4xl">{h1}</h1>
          <div className="mt-3 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-soft">{intro}</div>
          <div className="mt-6">{children}</div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="prose-content">{content}</div>
        <Faq items={faqs} />
        <RelatedTools ids={tool.related} />
      </div>

      <JsonLd data={webApplicationSchema(tool, schemaDescription)} />
    </>
  );
}

/** Short reusable callout explaining local processing, worded per tool by the caller. */
export function PrivacyNote({ children }: { children: React.ReactNode }) {
  return (
    <section aria-labelledby="privacy-heading">
      <h2 id="privacy-heading">Privacy: your image stays on your device</h2>
      {children}
      <p>
        Read the <Link href="/privacy">privacy policy</Link> or see <Link href="/methodology">how the tools work</Link>{" "}
        for details.
      </p>
    </section>
  );
}
