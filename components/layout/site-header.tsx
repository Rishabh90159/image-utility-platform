import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { allTools, NAV_GROUPS, toolsIn } from "@/lib/tools/registry";
import { DisclosureMenu } from "./disclosure-menu";
import { Logo } from "./logo";
import { ToolSearch } from "./tool-search";

// Built once on the server and passed to the client search box.
const searchItems = allTools.map((tool) => ({ name: tool.name, path: tool.path, keywords: `${tool.linkText} ${tool.summary}` }));

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="transition-transform group-open:rotate-180">
      <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/**
 * Server-rendered header. Tools are grouped into three menus instead of one
 * long row. Menus are <details> elements, so they also work without JavaScript.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-[#0f1e46] via-[#13285e] to-[#0f1e46] text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        {/* No prefetch: the logo is on screen on every page, so prefetching would download and parse the
            homepage's data during every page load (a long main-thread task on phones). */}
        <Link href="/" prefetch={false} className="shrink-0 rounded-md" aria-label={`${siteConfig.name} home`}>
          <Logo tone="light" />
        </Link>

        <nav aria-label="Image tools" className="hidden md:block xl:mr-auto">
          <ul className="flex items-center gap-1">
            {NAV_GROUPS.map((group, index) => {
              const items = toolsIn(group.id);
              // The last menu opens towards the left so it stays on screen on tablets.
              const align = index === NAV_GROUPS.length - 1 ? "right-0" : "left-0";
              return (
                <li key={group.id}>
                  <DisclosureMenu className="group relative">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white group-open:bg-white/10 group-open:text-white [&::-webkit-details-marker]:hidden">
                      {group.label}
                      <Chevron />
                    </summary>
                    <div
                      className={`absolute ${align} z-30 mt-2 rounded-lg border border-line bg-canvas p-2 shadow-lg ${
                        items.length > 6 ? "grid w-[34rem] grid-cols-2 gap-x-2" : "w-72"
                      }`}
                    >
                      {items.map((tool) => (
                        <Link key={tool.id} href={tool.path} className="block rounded-md px-3 py-2 text-sm text-ink hover:bg-accent-soft hover:text-accent-ink">
                          {tool.name}
                        </Link>
                      ))}
                    </div>
                  </DisclosureMenu>
                </li>
              );
            })}
            <li>
              <Link href="/tools" className="ml-2 inline-flex min-h-9 items-center rounded-md bg-white px-3.5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-soft">
                All tools
              </Link>
            </li>
          </ul>
        </nav>

        <div className="hidden w-60 shrink-0 xl:block">
          <ToolSearch items={searchItems} />
        </div>

        <DisclosureMenu className="group relative md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-white/25 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 [&::-webkit-details-marker]:hidden">
            <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M13.2 13.2L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Tools
            <Chevron />
          </summary>
          <nav
            aria-label="Image tools"
            className="absolute right-0 z-30 mt-2 max-h-[75vh] w-72 overflow-y-auto rounded-lg border border-line bg-canvas p-2 text-ink shadow-lg"
          >
            {/* Search first: most visitors on a phone know which size or format they need. */}
            <div className="px-1 pb-2 pt-1">
              <ToolSearch items={searchItems} />
            </div>
            {NAV_GROUPS.map((group) => (
              <div key={group.id} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</p>
                <ul>
                  {toolsIn(group.id).map((tool) => (
                    <li key={tool.id}>
                      <Link href={tool.path} className="block rounded-md px-3 py-2.5 text-[0.9375rem] text-ink hover:bg-accent-soft hover:text-accent-ink">
                        {tool.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <Link href="/tools" className="block rounded-md px-3 py-2.5 text-[0.9375rem] font-medium text-accent hover:bg-surface">
              All image tools
            </Link>
          </nav>
        </DisclosureMenu>
      </div>
    </header>
  );
}
