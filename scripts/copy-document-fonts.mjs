// Copies the metric-compatible fonts used by Word to PDF from @fontsource into public/fonts/documents.
// Run after updating the @fontsource packages:  npm run fonts:documents
// Only Latin and Latin Extended, regular and bold, upright and italic, are copied (see lib/documents/word-to-pdf/fonts.ts).
import fs from "node:fs";
import path from "node:path";

const FAMILIES = ["carlito", "caladea", "arimo", "tinos", "cousine"];
const OUT = "public/fonts/documents";
fs.mkdirSync(OUT, { recursive: true });

let count = 0;
for (const family of FAMILIES) {
  const dir = path.join("node_modules", "@fontsource", family);
  for (const subset of ["latin", "latin-ext"]) {
    for (const weight of [400, 700]) {
      for (const style of ["normal", "italic"]) {
        const name = `${family}-${subset}-${weight}-${style}.woff2`;
        fs.copyFileSync(path.join(dir, "files", name), path.join(OUT, name));
        count++;
      }
    }
  }
  fs.copyFileSync(path.join(dir, "LICENSE"), path.join(OUT, `${family}-LICENSE.txt`));
}
console.log(`Copied ${count} font files to ${OUT}`);
