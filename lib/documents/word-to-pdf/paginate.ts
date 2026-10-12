/**
 * docx-preview starts a new page only at explicit page and section breaks, so
 * a long section renders as one tall page. This splits such pages the way a
 * word processor would: whole blocks move to the next page, and long tables
 * continue on the next page row by row. Runs on a rendered DOM.
 */
const MAX_SPLITS = 1000;

/** Splits every overflowing page; returns all pages in order. */
export function paginate(container: HTMLElement, pageHeightOf: (section: HTMLElement) => number): HTMLElement[] {
  let splits = 0;
  for (const original of [...sectionsIn(container)]) {
    let section: HTMLElement | null = original;
    const height = pageHeightOf(original);
    while (section && section.scrollHeight > height + 2 && splits < MAX_SPLITS) {
      section = splitSection(section, height);
      splits++;
    }
  }
  return sectionsIn(container);
}

function sectionsIn(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(":scope > section")];
}

interface Slot {
  article: HTMLElement;
  child: Element;
}

function splitSection(section: HTMLElement, pageHeight: number): HTMLElement | null {
  const style = section.ownerDocument.defaultView!.getComputedStyle(section);
  const top = section.getBoundingClientRect().top;
  const limit = top + pageHeight - parseFloat(style.paddingBottom || "0");
  const articles = [...section.querySelectorAll<HTMLElement>(":scope > article")];
  const slots: Slot[] = articles.flatMap((article) => [...article.children].map((child) => ({ article, child })));
  const index = slots.findIndex((slot) => slot.child.getBoundingClientRect().bottom > limit + 0.5);
  if (index < 0) return null;

  const slot = slots[index];
  let firstMoved = index;
  let carryTable: HTMLTableElement | null = null;
  if (slot.child instanceof slot.child.ownerDocument.defaultView!.HTMLTableElement) {
    carryTable = splitTable(slot.child, limit);
    if (carryTable) firstMoved = index + 1;
  }
  if (!carryTable && index === 0) {
    // One block taller than the page (a large image, say): keep it here, clipped, and move the rest.
    firstMoved = 1;
  }
  if (firstMoved >= slots.length && !carryTable) return null;

  const next = section.cloneNode(false) as HTMLElement;
  const header = section.querySelector(":scope > header");
  const footer = section.querySelector(":scope > footer");
  if (header) next.appendChild(header.cloneNode(true));
  const newArticles = new Map<HTMLElement, HTMLElement>();
  const articleFor = (article: HTMLElement) => {
    let copy = newArticles.get(article);
    if (!copy) {
      copy = article.cloneNode(false) as HTMLElement;
      newArticles.set(article, copy);
      next.appendChild(copy);
    }
    return copy;
  };
  if (carryTable) articleFor(slot.article).appendChild(carryTable);
  for (const moved of slots.slice(firstMoved)) articleFor(moved.article).appendChild(moved.child);
  // Articles left empty on this page (all their content moved) are removed.
  for (const article of articles) if (article.children.length === 0) article.remove();
  if (footer) next.appendChild(footer.cloneNode(true));
  section.after(next);
  return next;
}

/**
 * Moves the rows that don't fit to a new table (same attributes and column
 * widths) and returns it, or null if not even the first row fits.
 */
function splitTable(table: HTMLTableElement, limit: number): HTMLTableElement | null {
  const rows = [...table.rows];
  const breakAt = rows.findIndex((row) => row.getBoundingClientRect().bottom > limit + 0.5);
  if (breakAt <= 0) return null;
  const copy = table.cloneNode(false) as HTMLTableElement;
  for (const colgroup of table.querySelectorAll(":scope > colgroup")) copy.appendChild(colgroup.cloneNode(true));
  const body = table.ownerDocument.createElement("tbody");
  copy.appendChild(body);
  for (const row of rows.slice(breakAt)) body.appendChild(row);
  return copy;
}
