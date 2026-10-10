# SEO architecture

How Imgifyr's pages map to search intent, and the rules for adding pages. The machine-readable
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
├── Image tools                   /tools/image-resizer, image-compressor, image-upscaler, image-size-increase,
│   │                             (format resizers under Image Resizer: resize-jpg, resize-png, resize-webp, resize-gif)
│                                 image-quality-enhancer, background-remover, merge-images, image-cropper,
│                                 bulk-image-resizer, passport-photo-resizer, signature-resizer
├── Convert                       /tools/jpg-to-png, png-to-jpg, webp-to-jpg, heic-to-jpg, jpeg-to-jpg,
│                                 svg-to-png, png-to-svg, photo-to-pdf, jpg-to-pdf
├── /tools/mb-to-kb-converter     File-size units (in the "Photo size" menu)
├── /tools/resize-image-to-kb     Exact file size (general)
│   └── 20kb-photo, 50kb-photo, 100kb-photo, 200kb-photo
└── /tools/application-photos     Exam & passport hub (comparison table)
    └── ssc-photo, upsc-photo, ibps-photo, sbi-photo, neet-photo, passport-photo
```

URLs stay flat (`/tools/<slug>`) so nothing had to move. The hierarchy is expressed through breadcrumbs
(visible and `BreadcrumbList`), so size pages appear under "Resize Image to Exact KB", application pages
under "Exam & passport photos", and the format resizers under "Image Resizer" (via the registry's `parent`).

Category pages such as `/tools/resize` or `/tools/convert` were considered and **not** built: `/tools`
already groups every tool, and those pages would have been lists with no content of their own. The
application hub was built because it does something no other page does: it compares every exam's
requirements, with sources, in one table.

## Keyword map

Volumes and difficulty (KD) are approximate global figures from competitor keyword research.

| Page | Primary | Main secondary keywords | Intent |
|---|---|---|---|
| /tools/image-resizer | image resizer (1.5M, KD 85) | resize image (1M), photo resizer (834K), resize image online (44K), image resizer online, resize image by pixels / by percentage | Tool |
| /tools/resize-jpg | resize jpg | jpg resize (112K), resize jpeg, jpg resizer, jpg dpi | Tool |
| /tools/resize-png | resize png | png resizer, resize transparent png | Tool |
| /tools/resize-webp | resize webp | webp resizer, resize webp online | Tool |
| /tools/resize-gif | resize gif | gif resizer, resize animated gif, make gif smaller | Tool |
| /tools/instagram-image-resizer | instagram image resizer | resize image for instagram, instagram photo/post resizer, instagram image size, instagram post/story/reel size, instagram 4:5 / 3:4, resize photo for instagram without cropping | Tool |
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
| /tools/image-upscaler | image upscaler (374K, KD 81) | upscale image (273K), image upscaler free (38K), enlarge image | Tool |
| /tools/image-size-increase | increase image size (143K, KD 71) | photo size increase (103K), increase image size in kb (30K, KD 10) | Tool |
| /tools/image-quality-enhancer | image quality enhancer | enhance image quality (82K, KD 80), improve photo quality | Tool |
| /tools/background-remover | background remover | photo background (305K), image background remover (172K), remove background from image (152K), background remover free (105K), background remover online (79K) | Tool |
| /tools/photo-to-pdf | photo to pdf | image to pdf, convert image to pdf | Tool |
| /tools/jpg-to-pdf | jpg to pdf | jpg to pdf converter, jpeg to pdf | Tool |
| /tools/merge-images | merge images (75K, KD 29) | combine images, merge photos | Tool |
| /tools/jpeg-to-jpg | jpeg to jpg (180K, KD 13) | jpeg to jpg converter, jfif to jpg | Tool |
| /tools/mb-to-kb-converter | mb to kb converter (80K, KD 11) | kb converter (68K, KD 11), mb to kb, kb to mb | Tool |
| /tools/ssc-photo, upsc-photo, ibps-photo, sbi-photo, neet-photo | "<exam> photo" | "<exam> photo size", "<exam> signature size" | Application |

### Cannibalization decisions

| Conflict | Decision |
|---|---|
| Image resizer / resize image / photo resizer | One page: `/tools/image-resizer`. The H1 says "Images & Photos" so both nouns are covered without a second page. |
| Image resizer vs resize JPG / PNG / WebP / GIF | Built 2026-10-08 because each format page does something the general resizer doesn't: JPG adds a print DPI with the resulting print size; PNG adds palette colour reduction (keeps transparency); WebP adds animated-file detection and WebP/JPG/PNG output with a Safari fallback; GIF resizes every frame with its own decoder/encoder (`lib/gif`). "jpg resize"/"resize jpg" moved from the general resizer to `/tools/resize-jpg`. Each page accepts only its format and points other formats to the general resizer. |
| Instagram image resizer vs image resizer / cropper | Built 2026-10-10 at `/tools/instagram-image-resizer` (not the requested `/instagram-image-resizer/`: every tool lives under `/tools/` without a trailing slash, and trailing slashes 308-redirect). It owns every Instagram-specific query; the general resizer keeps generic size queries and the cropper keeps "crop image". Its function is distinct: Instagram presets (posts, Story, Reel cover) from `lib/presets/instagram.ts`, crop-to-fill with the interactive cropper, or fit-the-whole-photo with colour/blurred background, position and border (`EncodeJob.fit`), plus Story safe-area and profile-grid guides. One page for all Instagram formats; no separate pages per format. |
| Image compressor / compress image / photo compressor / compress jpeg | One page: `/tools/image-compressor`. A separate JPG compressor page would be the same tool with the same output, so it waits until it has JPEG-specific features (see roadmap). |
| Resize image to KB vs 20/50/100/200KB | `/tools/resize-image-to-kb` owns the general and "any size" intent and is the breadcrumb parent. Each size page owns its exact number and has its own preset, measured examples, FAQs and links. No other sizes get pages (see below). |
| Image size reducer / photo size reducer | Assigned to `/tools/resize-image-to-kb`: in the research these searches mostly come from people with a KB limit to meet. The compressor owns "reduce image size" (no target). |
| Passport size photo vs passport photo resizer | `/tools/passport-photo` owns "passport size photo" and "maker": official sizes by country plus a tool preset for each. `/tools/passport-photo-resizer` owns "resizer" and custom sizes (any mm, px or KB). Each page links to the other and explains the difference in an FAQ. |
| SSC "photo resizer" | The SSC 2026 notices capture the photo live in the form, so the page is titled for requirements plus the signature tool. Calling it an SSC photo resizer would mislead. |
| "kb converter", "mb to kb converter" | `/tools/mb-to-kb-converter` (built in Phase 4): a unit converter, not an image tool. It links to the KB tools for people whose real goal is shrinking a photo. |
| Image resizer / upscaler / size increase / enhancer | Resizer = any new dimensions (mostly smaller). Upscaler = "image upscaler", "upscale image": 2×/4× enlargement with sharpening. Size increase = "increase image size", "photo size increase", "… in KB": bigger in pixels **or** bigger in KB, with the KB case as its distinct job. Enhancer = "enhance/improve quality": same size, better look. Each page explains the others in one sentence and links to them. |
| Photo to PDF vs JPG to PDF | Photo to PDF owns the broad "image/photo to PDF" intent and every format. JPG to PDF owns "jpg to pdf": its copy is about byte-for-byte JPEG embedding, EXIF rotation, CMYK and .jfif. Both use the same tool; the duplicate-content check keeps their text apart. |
| JPEG to JPG vs JPG to PNG / PNG to JPG | JPEG to JPG is about the extension only (same format) and says so; the conversions between formats stay on their own pages. |

## Internal-link graph

Related-tool lists live in the registry ([`lib/tools/registry.ts`](../lib/tools/registry.ts)) and every
page also links contextually from its body text. Main paths:

- Image resizer → image compressor, 50KB, 100KB, bulk resizer, image cropper, JPG to PNG (registry); resize to KB and the four format resizers (body)
- Resize JPG / PNG / WebP / GIF → Image Resizer (breadcrumb), each other, compressor, the matching converter
- Passport photo resizer → signature resizer, 20KB, 50KB, passport size photo, cropper, resize to KB
- Exam pages → signature resizer and the KB tools their limits need (20/50/100/200KB, resize to KB)
- Homepage → every tool, grouped by navigation group, plus a contextual paragraph per group
- Image compressor → image resizer, resize to KB, 20/50/100/200KB, PNG to JPG
- 100KB → 50KB, 200KB, image compressor, resize to KB (other sizes link similarly)
- Passport size photo → passport photo resizer, image cropper, image compressor, resize to KB
- SSC → signature resizer, 20KB, image cropper, image compressor
- HEIC → image resizer, image compressor, JPG to PNG
- PNG to JPG ↔ WebP to JPG ↔ JPG to PNG
- Every exam page → hub (breadcrumb); hub → every exam page and the general tools
- Image upscaler → image resizer, image size increase, image quality enhancer, image compressor
- Image size increase → image upscaler, image resizer, image quality enhancer, resize to KB (and resize to KB → size increase for minimums)
- Image quality enhancer → image upscaler, image compressor, image resizer, background remover
- Background remover → image compressor, image resizer, PNG to JPG, image cropper
- Photo to PDF → JPG to PDF, merge images, JPG to PNG, PNG to JPG; JPG to PDF → Photo to PDF, JPEG to JPG
- Merge images → photo to PDF, image resizer, image compressor, image cropper
- JPEG to JPG → JPG to PNG, PNG to JPG, image compressor, image resizer, JPG to PDF
- MB to KB converter → resize to KB, 20/50/100/200KB, image compressor

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
- Structured data: WebSite, Organization (layout), WebApplication, BreadcrumbList, FAQPage (only for FAQs visible on the page; the homepage FAQ is visible too).
- Social images come from `opengraph-image` files: every `/tools/*` page has its own, other pages use the site image. `pageMetadata` only sets `images` for non-tool pages, because an explicit value overrides the per-tool files (this was a bug until 2026-10-08: every tool page showed the generic image).
  Never ratings, reviews, user counts or government organisation markup.
- Heavy libraries (HEIC decoder, tracer, SVG sanitizer, GIF codec) load only on the pages that use them. The GIF codec runs in its own worker, created per job.

### Hosting (outside the codebase)

- Redirect `http://` → `https://` and the non-canonical host (www or apex) to the one in
  `NEXT_PUBLIC_SITE_URL` with a 301 at the host (Vercel: Domains settings).
- Preview deployments are `noindex` and disallowed in robots.txt automatically.
- Verify the domain in Google Search Console and Bing Webmaster Tools and submit `/sitemap.xml`.

## Future opportunities

Phase 4 (2026-10-07) built the high-demand tools that could run reliably in the browser: image upscaler,
background remover, photo to PDF, JPG to PDF, merge images, JPEG to JPG, image size increase, image
quality enhancer and MB to KB converter. What remains, ordered by (volume × winnability) and reuse:

| Priority | Feature | Keywords (approx. volume, KD) | Why | Reuses |
|---|---|---|---|---|
| P0 | **Passport photo print sheet** (several 35×45 mm photos on a 4×6 in / A4 page) | passport size photo (351K, KD 10), passport size photo maker (189K, KD 58) | Largest low-difficulty term; competitors' "makers" all offer a printable sheet. Strengthens an existing page instead of adding one. | Passport presets, DPI writer, PDF writer |
| P0 | **Convert any image to JPG** (PNG/WebP/HEIC/GIF/BMP/AVIF → JPG on one page) | image to jpg converter (48K, KD 14), photo to jpg (46K, KD 14) | Low difficulty; the converter exists, GIF/BMP/AVIF decoding needs checking per browser. | Format converter |
| P1 | **JPG → WebP** | jpg to webp | Encoder exists; needs its own guidance (support, transparency). | Format converter |
| P1 | **JPG / PNG compressor pages** | compress jpeg, png compressor | Only once they offer format-specific controls the general compressor doesn't. | Compressor, PNG quantizer |
| P2 | **AI upscaling / AI enhancement** | image upscaler, enhance image quality | Would need a super-resolution model running on the device (WebGPU), tested on phones; current tools are honest about being non-AI. | Upscaler UI, ONNX Runtime |
| P2 | **Higher-accuracy background removal** | background remover | A larger model (e.g. ISNet, ~40–170 MB) would improve hair and edges at a big download cost; could be an opt-in "high quality" mode. | Background remover |
| P2 | Social-media size presets, more exam/document presets | various | Only with verified, sourced specs. | Resizer, requirement data |
