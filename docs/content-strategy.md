# Content strategy: future guides

Planned articles that answer "how do I…" searches and send readers to the tool that does the job. **None of these
exist yet.** Build them one at a time, only when each can include something a tool page doesn't: measured examples
from our own engine, screenshots of real results, or a decision guide.

## Rules for every guide

- **URL:** `/guides/<slug>` (new section). Add a `guides` breadcrumb level and an index page at `/guides` only once
  there are at least three guides, so the index isn't a thin list.
- **One intent per guide**, and never the same primary keyword as a tool page (check `lib/seo/keyword-map.ts`; add a
  guide section to it when the first guide ships). Guides target the *question* ("how to…"), tools target the *task*.
- **Lead with the answer** in the first two sentences, then the steps, then the detail.
- **Use the tool, show the result:** every guide embeds a link (not an iframe) to the matching tool near the top and
  shows real before/after numbers measured with that tool.
- **Structured data:** `Article` with a real author and `dateModified`, plus `BreadcrumbList`. `HowTo` is no longer shown
  as a rich result by Google, so don't add it for that reason. `FAQPage` only for FAQs that are visible.
- **No duplicated tool copy:** keep under 15% six-word overlap with any tool page (extend `tests/e2e/seo.mjs`).
- **Performance:** server-rendered text, no client JavaScript, images as small optimised WebP with width/height set.

## Backlog (in suggested order)

| # | Title | Primary search intent | Main tool links | What makes it worth publishing |
|---|---|---|---|---|
| 1 | How to Resize an Image to 50KB | how to resize image to 50kb | 50KB photo, resize to KB, image compressor | Table of real photos (phone, DSLR, scan) and the dimensions/quality the engine picked to reach 50 KB; why some photos can't get there without shrinking |
| 2 | How to Resize an Image to 100KB | how to reduce photo size to 100kb | 100KB photo, resize to KB, MB to KB converter | Same measured approach at 100 KB; how to check a file's size on Windows, Mac, Android and iPhone |
| 3 | How to Resize Images for Online Forms | photo size for online application | exam pages, signature resizer, 20KB/50KB, passport photo resizer | Checklist for reading a notification's photo rules (px, KB, format, DPI, background); common rejection reasons |
| 4 | How to Resize Passport Photos | how to resize passport photo | passport size photo, passport photo resizer, image cropper | mm ↔ px at 300 DPI explained with a worked example; printed vs digital; head-size framing |
| 5 | How to Reduce Image Size Without Losing Quality | reduce image size without losing quality | image compressor, image resizer, PNG to JPG | Side-by-side crops at 95/85/75/60% JPG quality with file sizes; when PNG palette reduction beats JPG |
| 6 | How to Resize an Image Without Losing Quality | resize image without losing quality | image resizer, image upscaler | What "losing quality" means when shrinking vs enlarging; multi-step downscaling vs single step, shown on a test image |
| 7 | JPG vs PNG: Which Should You Use? | jpg vs png | JPG to PNG, PNG to JPG, resize PNG | Decision table by content type (photo, screenshot, logo, transparency); real file-size comparison of the same images |
| 8 | How to Compress Images for Websites | compress images for website | image compressor, resize WebP, bulk image resizer | Target widths per layout slot, srcset example, WebP vs JPG sizes measured, a simple Core Web Vitals checklist |
| 9 | Best Image Sizes for Websites | best image size for website | image resizer (popular dimensions), bulk image resizer | Reference table: hero, content, thumbnail, logo, favicon, Open Graph (1200 × 630), with reasoning rather than platform claims |
| 10 | How to Resize Images for Email | resize photo for email | image resizer, bulk image resizer, image compressor | Attachment limits of common providers, verified and dated; recommended 1600 px / ~300 KB per photo with measurements |

### Later candidates

- How to make a GIF smaller (supports Resize GIF; measured examples of width vs file size).
- How to resize a signature for online forms (supports Signature resizer).
- What DPI means and when it matters (supports Resize JPG and the passport tools).
- HEIC vs JPG on iPhone (supports HEIC to JPG).

## Measuring success

Track each guide in Search Console for impressions on its intent and for clicks through to the linked tool
(`tool_open` events with the guide as referrer in analytics). Retire or merge a guide that gets no impressions after
six months rather than keeping thin pages.
