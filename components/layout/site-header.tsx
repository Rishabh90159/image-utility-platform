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
    <header className="sticky top-0 z-40 border-b border-line bg-canvas">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" className="shrink-0 rounded-md" aria-label={`${siteConfig.name} home`}>
          <Logo />
        </Link>

        <nav aria-label="Image tools" className="hidden md:block xl:mr-auto">
          <ul className="flex items-center gap-1">
            {NAV_GROUPS.map((group) => {
              const items = toolsIn(group.id);
              return (
                <li key={group.id}>
                  <DisclosureMenu className="group relative">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface hover:text-ink [&::-webkit-details-marker]:hidden">
                      {group.label}
                      <Chevron />
                    </summary>
                    <div
                      className={`absolute left-0 z-30 mt-2 rounded-lg border border-line bg-canvas p-2 shadow-lg ${
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
              <Link href="/tools" className="ml-2 inline-flex min-h-9 items-center rounded-md bg-accent-soft px-3.5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent hover:text-white">
                All tools
              </Link>
            </li>
          </ul>
        </nav>

        <div className="hidden w-60 shrink-0 xl:block">
          <ToolSearch items={searchItems} />
        </div>

        <DisclosureMenu className="group relative md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            Tools
            <Chevron />
          </summary>
          <nav
            aria-label="Image tools"
            className="absolute right-0 z-30 mt-2 max-h-[75vh] w-72 overflow-y-auto rounded-lg border border-line bg-canvas p-2 shadow-lg"
          >
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
