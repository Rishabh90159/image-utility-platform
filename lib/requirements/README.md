# Requirement data

Photo and signature requirements for exam, recruitment and passport pages live here, separate from page text.

- `types.ts` – data model and formatting helpers.
- `applications.ts` – SSC, UPSC, IBPS, SBI, NEET.
- `passports.ts` – adapter over `lib/presets/photo-presets.ts` (shared with the Passport Photo Resizer), plus countries not yet verified.

## Adding or updating a requirement

1. Read the **official** document: the organisation's notification, advertisement, information bulletin or government page. Never use blogs, coaching sites or photo-service sites.
2. Copy only values the source states. Leave fields undefined otherwise; don't convert centimetres to pixels or borrow numbers from another exam.
3. Record `source.url`, `source.title`, `source.publisher`, `source.section` and `source.lastVerified` (the date you read it).
4. Set the tool's `updated` date in `lib/tools/registry.ts` to the same day, so the sitemap `lastmod` changes.
5. Run `npm test` (data integrity checks) and `node tests/e2e/phase3.mjs`.

Don't bump `lastVerified` without re-reading the source. If a current requirement can't be confirmed, use `unverified` instead of guessing.

## Verification log

| Data | Source | Last verified |
| --- | --- | --- |
| IBPS CRP PO/MT-XVI, CSA-XVI, SPL-XVI | ibps.in notification PDFs | 2026-10-07 |
| SBI PO 2026 (CRPD/PO/2026-27/09), Resolvers (CRPD/RS/2026-27/06) | sbi.bank.in advertisement PDFs | 2026-10-07 |
| SSC CGL 2026, CHSL 2026 (live photo; signature 10–20 KB) | ssc.gov.in notices, paras 9.4–9.6 | 2026-10-07 |
| NEET (UG) 2026 | NTA Information Bulletin | 2026-10-07 |
| UPSC | Not verified: public documents disagree; current instructions are inside the portal | checked 2026-10-07 |
| India passport (printed, DPC/SPC/CSC) | Passport Seva instruction booklet V3.0 | 2026-10-07 |
| UK digital / Canada digital and printed | gov.uk, canada.ca | 2026-10-07 |
| UK printed | gov.uk photo requirements | 2026-10-06 |
| United States, Australia | Not verified: sites unreachable by our check | checked 2026-10-07 |
