# PDF tools: Word to PDF, PDF to Word, Merge PDF

Added 2026-10-12. All three tools run **entirely in the visitor's browser**, like the image tools. There is
no API route, no server-side processing, no third-party conversion service, no new environment variable
and no running cost. The Content Security Policy (`connect-src 'self'`) still blocks uploads to any other
origin, and the e2e suite checks that no request leaves the site and no request is a POST.

| Route | Component | Engine |
|---|---|---|
| `/tools/pdf-tools` | hub page | — |
| `/tools/word-to-pdf` | `components/documents/word-to-pdf-tool.tsx` | `lib/documents/word-to-pdf/` (main thread) |
| `/tools/pdf-to-word` | `components/documents/pdf-to-word-tool.tsx` | `lib/documents/pdf-to-word/` (Web Worker) |
| `/tools/merge-pdf` | `components/documents/merge-pdf-tool.tsx` | `lib/documents/merge.ts` (Web Worker) |

## Why client-side

Server-side conversion was evaluated first. High-fidelity DOCX → PDF needs LibreOffice (or Word), which
doesn't fit Vercel Functions (250 MB bundle limit, no system packages, cold starts of 10 s+ for the
community Lambda builds), and a hosted API (CloudConvert, ConvertAPI, a self-hosted Gotenberg) would add a
paid dependency, a secret, and an upload — contradicting the site's promise that files never leave the
device. Browser-side engines handle the required features with documented limits, cost nothing to run and
keep that promise true, so they were chosen.

## Libraries (all loaded on demand, only on these pages)

| Package | Licence | Used for |
|---|---|---|
| `@cantoo/pdf-lib` | MIT | Merging pages; writing the Word-to-PDF output. Maintained fork of pdf-lib (the original's last release was 2021); adds decryption of owner-password PDFs. |
| `pdfjs-dist` (legacy build) | Apache-2.0 | Reading positioned text from PDFs (Mozilla pdf.js). Runs inside our worker as a "fake worker"; no extra script URL. |
| `docx` | MIT | Writing the .docx for PDF to Word. |
| `docx-preview` | Apache-2.0 | Laying out .docx files as HTML pages for Word to PDF. |
| `html2canvas-pro` | MIT | Drawing each laid-out page to a canvas (maintained fork of html2canvas). |
| `jszip` | MIT | Checking .docx structure (already a dependency of docx and docx-preview). |

None of these load on image-tool pages (checked in the built chunks), and the new pages' initial JS is in
line with the other tool pages.

## How each tool works

**Merge PDF.** Each file is checked in a worker as it is added (content sniffing, then opened with
pdf-lib to count pages). Merging copies page objects with `copyPages` into a new document, so content,
fonts, size and `/Rotate` are kept and bytes are never concatenated. PDFs that need a password are
rejected; PDFs with only an owner password (common for statements) are decrypted and merged, and the UI
says the restrictions aren't carried over. Limits: 30 files, 100 MB each, 200 MB total, 2000 pages.

**PDF to Word.** pdf.js extracts text items with positions, sizes and bold/italic flags (`lib/documents/pdf-to-word/extract.ts`).
`layout.ts` rebuilds structure from geometry: lines → two-column reading order → tables (aligned
columns) → paragraphs (rejoined wrapped lines), headings (larger type, Word heading styles), bulleted lists
(bullet glyphs → real Word lists; numbered items keep their numbers). `build-docx.ts` writes one Word
section per PDF page with the same size and orientation. Pages with images but no text are counted as
scans: an all-scan PDF is refused with an explanation, a mixed PDF gets a note in place of each scanned
page. Limits: 50 MB, 200 pages.

**Word to PDF.** The .docx is validated (zip structure, Word main part, total uncompressed size ≤ 300 MB
against zip bombs; .doc, RTF, encrypted and other Office files get specific messages). docx-preview renders
it into a **sandboxed, off-screen iframe** (`sandbox="allow-same-origin"`, no scripts) so the site's CSS
can't distort the document. Any image that isn't an embedded data/blob URL is stripped so nothing is
fetched. `paginate.ts` splits pages that overflow (docx-preview only breaks at explicit breaks), moving
whole blocks and continuing long tables row by row. Each page is drawn at up to 2× (capped at 4.2 MP),
saved as JPEG and placed on a PDF page of the same size, with an **invisible text layer** (PDF text render
mode 3, Helvetica, stretched to each word's box) so the PDF is searchable and selectable. Limits: 25 MB,
100 pages.

## Known limitations (also stated on the pages)

- **Word to PDF:** pages are images plus a text layer, not vector text; the PDF is larger than one saved
  by Word. Fonts: embedded fonts are used (the CSP allows `font-src data:` for this), then installed
  fonts. A missing font gets a same-style fallback chain (`lib/documents/word-to-pdf/fonts.ts`), e.g.
  Aptos or Calibri → Arial → sans-serif, so documents no longer turn serif; but character widths differ, so
  line breaks can differ from Word on devices without the document's fonts (phones, Macs without Office).
  Bundling metric-compatible fonts (Carlito, Caladea, Arimo, Tinos, Cousine; ~1.6 MB) would fix that and
  was tried, but left out to keep the repo small.
  Text in non-Latin scripts renders correctly but isn't searchable (the UI says so). Floating text
  boxes, charts, SmartArt, equations, comments and tracked changes may differ. No .doc/.rtf/.odt.
- **PDF to Word:** no OCR, so scanned PDFs aren't converted. Images and drawings aren't carried over.
  Bullets drawn as shapes (e.g. PDFs printed from browsers) become indented paragraphs, not Word lists.
  Font names and sizes are carried over (pdf.js `fontExtraProperties`); text colour isn't.
  Complex layouts, footnotes, equations, form fields and decorative fonts may need tidying.
- **Merge PDF:** bookmarks, form fields, signatures and attachments may not carry over.
- Everything runs on the visitor's device, so very large files are slow on low-end phones; the limits
  above keep memory use reasonable. Worker jobs (merge, PDF to Word) time out after 5 minutes; every
  conversion can be cancelled.

If OCR or vector-text Word to PDF is needed later, it would require either a server/third-party service
(cost, secret, upload — and a privacy-policy change) or large WASM engines (e.g. Tesseract, several MB per
language), and should be a separate, clearly labelled processing path.

## Security notes

- File type is decided by content (`lib/documents/validate.ts`), never by name or browser MIME type.
- Uploaded documents are never executed: docx-preview builds DOM from XML in a script-less sandboxed
  frame; macros in .docm files are ignored. pdf.js runs without font loading or XFA.
- Errors shown to users come from a fixed list of codes (`lib/documents/errors.ts`); library messages
  and paths are never displayed, and nothing about file contents is logged or sent to analytics.
- Object URLs are revoked on reset/unmount; workers are terminated after each job; the render iframe is
  removed after each conversion, including on failure.

## Tests

- `tests/unit/documents.test.ts` (Vitest, Node): validation, merge order/size/rotation, encrypted and
  damaged PDFs, PDF to Word structure (headings, paragraphs, lists, tables, orientation), scans, layout.
- `tests/e2e/pdf-tools.mjs` (Playwright, real browser): SEO tags, sitemap, navigation, all three tools
  end to end with downloads verified, error states, reset/repeat, mobile layout, keyboard, no uploads.
