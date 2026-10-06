import Link from "next/link";
import { allTools, headerTools } from "@/lib/tools/registry";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";

/** Server-rendered header. The mobile menu is a <details> element that also works without JavaScript. */
export function SiteHeader() {
  return (
    <header className="border-b border-line bg-canvas">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" className="rounded-md" aria-label="Pixfit home">
          <Logo />
        </Link>

        <nav aria-label="Image tools" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {headerTools.map((tool) => (
              <li key={tool.id}>
                <Link
                  href={tool.path}
                  className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface hover:text-ink"
                >
                  {tool.navLabel}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/tools"
                className="rounded-md px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-surface"
              >
                All tools
              </Link>
            </li>
          </ul>
        </nav>

        <MobileMenu className="group relative md:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            Tools
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="transition-transform group-open:rotate-180">
              <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </summary>
          <nav
            aria-label="Image tools"
            className="absolute right-0 z-30 mt-2 max-h-[75vh] w-64 overflow-y-auto rounded-lg border border-line bg-canvas p-2 shadow-lg"
          >
            <ul>
              {allTools.map((tool) => (
                <li key={tool.id}>
                  <Link href={tool.path} className="block rounded-md px-3 py-2.5 text-[0.9375rem] text-ink hover:bg-surface">
                    {tool.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/tools" className="block rounded-md px-3 py-2.5 text-[0.9375rem] font-medium text-accent hover:bg-surface">
                  All image tools
                </Link>
              </li>
            </ul>
          </nav>
        </MobileMenu>
      </div>
    </header>
  );
}
