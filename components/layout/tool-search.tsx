"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

interface SearchItem {
  name: string;
  path: string;
  /** Extra words to match, e.g. the tool's summary. */
  keywords: string;
}

/** Best match for a query: exact name first, then every word found in the name or keywords. */
function findTool(items: SearchItem[], query: string): SearchItem | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const exact = items.find((item) => item.name.toLowerCase() === q);
  if (exact) return exact;
  const words = q.split(/\s+/);
  const matches = items.filter((item) => {
    const haystack = `${item.name} ${item.keywords}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  // Prefer matches in the name over matches only in the description.
  return matches.find((item) => words.every((word) => item.name.toLowerCase().includes(word))) ?? matches[0];
}

/**
 * Header search over the tool list. Suggestions come from a native <datalist>,
 * so it needs no extra libraries; Enter opens the best match, or the tools page.
 */
export function ToolSearch({ items }: { items: SearchItem[] }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const match = findTool(items, query);
        router.push(match ? match.path : "/tools");
        setQuery("");
      }}
      className="relative"
    >
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search tools
      </label>
      <input
        id={`${listId}-input`}
        type="search"
        list={listId}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search tools…"
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-line bg-surface pl-3 pr-10 text-sm text-ink placeholder:text-muted focus:border-accent focus:bg-canvas focus:outline-2 focus:outline-offset-0 focus:outline-accent"
      />
      <datalist id={listId}>
        {items.map((item) => (
          <option key={item.path} value={item.name} />
        ))}
      </datalist>
      <button
        type="submit"
        aria-label="Search"
        className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-md text-ink-soft hover:bg-accent-soft hover:text-accent"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}
