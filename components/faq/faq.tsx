import { JsonLd } from "@/components/seo/json-ld";
import { faqSchema, type FaqItem } from "@/lib/seo/schema";

/**
 * FAQ accordion built on native <details>/<summary>: questions are listed and
 * each answer opens with a click or the keyboard, without any JavaScript. The
 * answers stay in the HTML, so search engines read them, and FAQPage
 * structured data is generated from exactly the same items.
 *
 * `boxed` draws each question as its own row (homepage); the default is a ruled list (tool pages).
 */
export function Faq({
  items,
  heading = "Frequently asked questions",
  intro,
  variant = "default",
  className = "mt-14",
}: {
  items: FaqItem[];
  heading?: string;
  intro?: string;
  variant?: "default" | "boxed";
  className?: string;
}) {
  const boxed = variant === "boxed";
  return (
    <section aria-labelledby="faq-heading" className={className}>
      <h2 id="faq-heading" className="text-[1.375rem] font-bold tracking-tight text-ink">
        {heading}
      </h2>
      {intro ? <p className="mt-1 text-muted">{intro}</p> : null}
      <div className={boxed ? "mt-5 space-y-2.5" : "mt-4 divide-y divide-line border-y border-line"}>
        {items.map((item) => (
          <details key={item.question} className={`group ${boxed ? "rounded-lg border border-line bg-canvas open:border-accent/40" : ""}`}>
            <summary
              className={`flex cursor-pointer list-none items-center justify-between gap-4 text-left hover:text-accent [&::-webkit-details-marker]:hidden ${
                boxed ? "px-4 py-3.5" : "py-4"
              }`}
            >
              <h3 className={`font-semibold text-ink group-hover:text-accent ${boxed ? "text-[0.9375rem]" : "text-base"}`}>{item.question}</h3>
              {boxed ? (
                <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-180 group-open:text-accent">
                  <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              ) : (
                <span
                  aria-hidden="true"
                  className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-soft transition-transform duration-200 group-open:rotate-45 group-open:border-accent group-open:text-accent"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
              )}
            </summary>
            <p className={`leading-relaxed text-ink-soft ${boxed ? "px-4 pb-4 text-[0.9375rem]" : "pb-5 pr-11"}`}>{item.answer}</p>
          </details>
        ))}
      </div>
      <JsonLd data={faqSchema(items)} />
    </section>
  );
}
