import { JsonLd } from "@/components/seo/json-ld";
import { faqSchema, type FaqItem } from "@/lib/seo/schema";

/**
 * FAQ accordion built on native <details>/<summary>: questions are listed and
 * each answer opens with a click or the keyboard, without any JavaScript. The
 * answers stay in the HTML, so search engines read them, and FAQPage
 * structured data is generated from exactly the same items.
 */
export function Faq({ items, heading = "Frequently asked questions" }: { items: FaqItem[]; heading?: string }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-14">
      <h2 id="faq-heading" className="text-[1.375rem] font-[650] tracking-tight text-ink">
        {heading}
      </h2>
      <div className="mt-4 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <details key={item.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left hover:text-accent [&::-webkit-details-marker]:hidden">
              <h3 className="text-base font-semibold text-ink group-hover:text-accent">{item.question}</h3>
              <span
                aria-hidden="true"
                className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-soft transition-transform duration-200 group-open:rotate-45 group-open:border-accent group-open:text-accent"
              >
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
            </summary>
            <p className="pb-5 pr-11 leading-relaxed text-ink-soft">{item.answer}</p>
          </details>
        ))}
      </div>
      <JsonLd data={faqSchema(items)} />
    </section>
  );
}
