# SEO architecture

How Pixfit's pages map to search intent, and the rules for adding pages. The machine-readable
version of the keyword map is [`lib/seo/keyword-map.ts`](../lib/seo/keyword-map.ts). Tests fail if
two pages claim the same keyword, or if a page's primary keyword is missing from its title or H1.

No amount of SEO work guarantees a ranking position. The aim is for each page to be the most useful
answer to one clearly defined intent.

## Principles

1. **One intent, one page.** Synonyms ("image resizer", "resize image", "photo resizer") are one
   intent and belong to one page. New pages are only created for an intent with a different job to do.
2. **No page without a working tool behind it.** High-volume searches for features we don't have are
   listed under [Future opportunities](#future-opportunities), not given placeholder pages.
3. **The tool comes first.** On every tool page the tool sits directly under the H1 and a short intro.
   Guidance, FAQs and related tools follow it.
4. **Copy is written for the intent, not for keywords.** A keyword appears where a person would
   naturally use it (title, H1, the sentence that answers the question), not repeated in bulk.
5. **Requirement pages state only verified facts.** See [`lib/requirements/README.md`](../lib/requirements/README.md).

## Site structure

```
/                                 Home
/tools                            All tools, grouped
├── Image tools                   /tools/image-resizer, image-compressor, image-cropper, bulk-image-resizer,
│                                 jpg-to-png, png-to-jpg, webp-to-jpg, heic-to-jpg, svg-to-png, png-to-svg,
│                                 passport-photo-resizer, signature-resizer
├── /tools/resize-image-to-kb     Exact file size (general)
│   └── 20kb-photo, 50kb-photo, 100kb-photo, 200kb-photo
└── /tools/application-photos     Exam & passport hub (comparison table)
    └── ssc-photo, upsc-photo, ibps-photo, sbi-photo, neet-photo, passport-photo
```

URLs stay flat (`/tools/<slug>`) so nothing had to move. The hierarchy is expressed through breadcrumbs
(visible and `BreadcrumbList`), so size pages appear under "Resize Image to Exact KB" and application
pages under "Exam & passport photos".

Category pages such as `/tools/resize` or `/tools/convert` were considered and **not** built: `/tools`
already groups every tool, and those pages would have been lists with no content of their own. The
application hub was built because it does something no other page does: it compares every exam's
requirements, with sources, in one table.

## Keyword map

Volumes and difficulty (KD) are approximate global figures from competitor keyword research.

| Page | Primary | Main secondary keywords | Intent |
|---|---|---|---|
| /tools/image-resizer | image resizer (1.5M, KD 85) | resize image (1M), photo resizer (834K), resize image online (44K), jpg resize (112K) | Tool |
| /tools/image-compressor | image compressor (383K, KD 80) | compress image (462K), reduce image size (465K), photo compressor (203K), compress jpeg (194K), jpg compress (181K), jpeg compressor (89K), reduce jpg size (38K) | Tool |
| /tools/resize-image-to-kb | resize image in kb (74K, KD 39) | image size reducer (226K), photo size reducer (231K), jpg size reducer (120K) | File size |
| /tools/20kb-photo | resize image to 20kb (65K, KD 4) | compress image to 20kb (30K) | File size |
| /tools/50kb-photo | resize image to 50kb (59K, KD 4) | compress image to 50kb (50K) | File size |
| /tools/100kb-photo | resize image to 100kb (48K, KD 4) | compress image to 100kb (41K) | File size |
| /tools/200kb-photo | resize image to 200kb | compress image to 200kb | File size |
| /tools/png-to-jpg | png to jpg (265K, KD 46) | png to jpg converter (52K) | Tool |
| /tools/jpg-to-png | jpg to png | jpg to png converter (41K), jpeg to png | Tool |
| /tools/webp-to-jpg | webp to jpg (231K, KD 40) | webp to jpg converter, convert webp to jpg | Tool |
| /tools/heic-to-jpg | heic to jpg (129K, KD 41) | heic to jpg converter (66K) | Tool |
| /tools/image-cropper | crop image (50K, KD 55) | image cropper, crop image online, photo cropper | Tool |
| /tools/bulk-image-resizer | bulk image resizer | resize multiple images, batch image resize | Tool |
| /tools/signature-resizer | signature resize (55K, KD 30) | signature resizer, resize signature | Tool |
| /tools/passport-photo | passport size photo (351K, KD 10) | passport size photo maker (189K), passport photo maker (66K), passport photo size | Application |
| /tools/passport-photo-resizer | passport photo resizer | resize passport photo, custom size in mm/px/KB | Tool |
| /tools/application-photos | exam photo size | photo size for government exams | Hub |
| /tools/ssc-photo, upsc-photo, ibps-photo, sbi-photo, neet-photo | "<exam> photo" | "<exam> photo size", "<exam> signature size" | Application |

### Cannibalization decisions

| Conflict | Decision |
|---|---|
| Image resizer / resize image / photo resizer | One page: `/tools/image-resizer`. The title says "Images & Photos" so both nouns are covered without a second page. |
| Image compressor / compress image / photo compressor / compress jpeg | One page: `/tools/image-compressor`. A separate JPG compressor page would be the same tool with the same output, so it waits until it has JPEG-specific features (see roadmap). |
| Resize image to KB vs 20/50/100/200KB | `/tools/resize-image-to-kb` owns the general and "any size" intent and is the breadcrumb parent. Each size page owns its exact number and has its own preset, measured examples, FAQs and links. No other sizes get pages (see below). |
| Image size reducer / photo size reducer | Assigned to `/tools/resize-image-to-kb`: in the research these searches mostly come from people with a KB limit to meet. The compressor owns "reduce image size" (no target). |
| Passport size photo vs passport photo resizer | `/tools/passport-photo` owns "passport size photo" and "maker": official sizes by country plus a tool preset for each. `/tools/passport-photo-resizer` owns "resizer" and custom sizes (any mm, px or KB). Each page links to the other and explains the difference in an FAQ. |
| SSC "photo resizer" | The SSC 2026 notices capture the photo live in the form, so the page is titled for requirements plus the signature tool. Calling it an SSC photo resizer would mislead. |
| "kb converter", "mb to kb converter" | Not targeted. Most of these searches want a unit converter (MB → KB arithmetic), which no page provides. Roadmap item. |

## Internal-link graph

Related-tool lists live in the registry ([`lib/tools/registry.ts`](../lib/tools/registry.ts)) and every
page also links contextually from its body text. Main paths:

- Image resizer → image compressor, resize to KB, image cropper, bulk resizer
- Image compressor → resize to KB, 20/50/100/200KB, image resizer
- 100KB → 50KB, 200KB, image compressor, resize to KB (other sizes link similarly)
- Passport size photo → passport photo resizer, image cropper, image compressor, resize to KB
- SSC → signature resizer, 20KB, image cropper, image compressor
- HEIC → image resizer, image compressor, JPG to PNG
- PNG to JPG ↔ WebP to JPG ↔ JPG to PNG
- Every exam page → hub (breadcrumb); hub → every exam page and the general tools

## Programmatic pages

Only 20, 50, 100 and 200 KB have their own pages, because each has strong independent search demand
(30K–65K a month) and a distinct use (signatures, exam photos, portals, high-resolution uploads).
Do not create pages for other numbers (21KB, 30KB, 150KB…). `/tools/resize-image-to-kb` handles every
other value, and the homepage can link to it with `?target=`; that URL canonicalises to the clean path.

A new size page needs, at minimum: search data showing its own demand, a measured example table from
the real engine, FAQs that don't apply to the other size pages, and a duplicate-content score under 15%
in `tests/e2e/seo.mjs`.

## Technical rules (enforced by tests/e2e/seo.mjs)

- One H1; unique title (≤ 70 chars), description (70–170 chars) and H1 on every page.
- Self-referencing absolute canonical on the production domain; query strings canonicalise to the clean
  URL; trailing slashes 308-redirect; mixed-case paths return 404.
- Sitemap: only canonical 200 pages, no parameters; `lastmod` is the registry's `updated` date, which is
  only changed when the page's content or tool changes.
- Structured data: WebSite, WebApplication, BreadcrumbList, FAQPage (only for FAQs visible on the page).
  Never ratings, reviews, user counts or government organisation markup.
- Heavy libraries (HEIC decoder, tracer, SVG sanitizer) load only on the pages that use them.

### Hosting (outside the codebase)

- Redirect `http://` → `https://` and the non-canonical host (www or apex) to the one in
  `NEXT_PUBLIC_SITE_URL` with a 301 at the host (Vercel: Domains settings).
- Preview deployments are `noindex` and disallowed in robots.txt automatically.
- Verify the domain in Google Search Console and Bing Webmaster Tools and submit `/sitemap.xml`.

## Future opportunities

Searches with real demand that the site can't serve yet. Ordered by (volume × winnability) and how
much existing code each one reuses. None of these should get a page until the feature works.

| Priority | Feature | Keywords (approx. volume, KD) | Why this priority | Reuses |
|---|---|---|---|---|
| P0 | **Passport photo print sheet** (several 35×45 mm photos on a 4×6 in / A4 page) | passport size photo (351K, KD 10), passport size photo maker (189K, KD 58) | Largest low-difficulty term; competitors' "makers" all offer a printable sheet. Strengthens an existing page instead of adding one. | Passport presets, DPI writer, canvas |
| P0 | **Increase image size in KB** (pad a file up to a minimum) | photo size increase (103K), increase image size in kb (30K, KD 10) | Exam forms have minimums (10 KB, 20 KB); the engine already enlarges to reach a minimum. | `growToMinimum`, target-size engine |
| P0 | **Convert any image to JPG** (one page for PNG/WebP/HEIC/GIF/BMP/AVIF → JPG) and **JPEG → JPG** | image to jpg converter (48K, KD 14), photo to jpg (46K, KD 14), jpeg to jpg (180K, KD 13) | Low difficulty and the converter already exists; JPEG→JPG needs an honest explanation (same format) plus re-saving with a .jpg name for portals that check the extension. | Format converter |
| P0 | **MB to KB converter** (calculator + link to the reducer) | mb to kb converter (80K, KD 11), kb converter (68K, KD 11) | Very low difficulty; small page with a calculator and the 1000 vs 1024 explanation. | — |
| P1 | **Photo / JPG to PDF** | photo to pdf, jpg to pdf | Common for document uploads. Needs a small PDF writer (no new dependency required for JPEG-in-PDF). | Image decode, ZIP-style binary writer |
| P1 | **Merge images** (side by side / vertical) | merge images (75K, KD 29) | Moderate difficulty, simple canvas feature. | Canvas, worker |
| P1 | **Image upscaler / enlarger** | image upscaler (374K, KD 81), upscale image (273K, KD 73), increase image size (143K, KD 71) | Huge demand but high difficulty, and users expect AI upscaling. A plain resampling enlarger can rank only for "increase image size"; AI upscaling needs an in-browser model (large download) to stay private. | Resizer |
| P1 | **JPG compressor / PNG compressor** pages | compress jpeg, jpeg compressor, png compressor | Only worthwhile once they do something the general compressor doesn't (e.g. JPEG progressive/chroma options, PNG palette quantization controls). | Compressor, PNG quantizer |
| P1 | **JPG → WebP** | jpg to webp | Encoder exists; needs its own guidance (browser support, transparency). | Format converter |
| P2 | **Background remover** | photo background (305K), image background remover (172K), remove background from image (152K) | Very high difficulty (KD 75–90) and needs an in-browser segmentation model. A plain "whiten background" for passport photos is a smaller, privacy-friendly step. | Signature clean-up |
| P2 | **Image quality enhancer** | enhance image quality (82K, KD 80) | High difficulty; same model problem as upscaling. | — |
| P2 | Social-media size presets, more exam/document presets | various | Only with verified, sourced specs. | Resizer, requirement data |
