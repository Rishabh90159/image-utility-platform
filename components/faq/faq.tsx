import { JsonLd } from "@/components/seo/json-ld";
import { faqSchema, type FaqItem } from "@/lib/seo/schema";

/**
 * Fully visible FAQ list. FAQPage structured data is generated from exactly
 * the same items, so the markup always matches what users can read.
 */
export function Faq({ items, heading = "Frequently asked questions" }: { items: FaqItem[]; heading?: string }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-14">
      <h2 id="faq-heading" className="text-[1.375rem] font-[650] tracking-tight text-ink">
        {heading}
      </h2>
      <div className="mt-4 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <div key={item.question} className="py-5">
            <h3 className="text-base font-semibold text-ink">{item.question}</h3>
            <p className="mt-2 leading-relaxed text-ink-soft">{item.answer}</p>
          </div>
        ))}
      </div>
      <JsonLd data={faqSchema(items)} />
    </section>
  );
}
