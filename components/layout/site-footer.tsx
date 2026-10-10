import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { APPLICATION_HUB, NAV_GROUPS, toolsIn } from "@/lib/tools/registry";
import { Logo } from "./logo";

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/methodology", label: "How the tools work" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
  { href: "/contact", label: "Contact" },
];

/**
 * Site footer. On phones the link groups flow into two balanced columns
 * (CSS columns, so a long group doesn't leave a gap beside a short one); from
 * the `sm` breakpoint up they become the regular grid columns.
 */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_0.8fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-muted">{siteConfig.tagline}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Images are processed in your browser and are not uploaded to our servers.
          </p>
        </div>
        <div className="columns-2 gap-x-6 sm:contents">
          {NAV_GROUPS.map((group) => (
            <nav key={group.id} aria-label={group.label} className="mb-8 break-inside-avoid sm:mb-0">
              <h2 className="text-sm font-semibold text-ink">{group.label}</h2>
              <ul className="mt-3 space-y-2">
                {toolsIn(group.id).map((tool) => (
                  <li key={tool.id}>
                    <Link href={tool.path} className="text-sm text-muted hover:text-ink hover:underline">
                      {tool.name}
                    </Link>
                  </li>
                ))}
                {group.id === "image" ? (
                  <li>
                    <Link href="/tools" className="text-sm text-muted hover:text-ink hover:underline">
                      All image tools
                    </Link>
                  </li>
                ) : null}
                {group.id === "application" ? (
                  <li>
                    <Link href={APPLICATION_HUB.path} className="text-sm text-muted hover:text-ink hover:underline">
                      Compare requirements
                    </Link>
                  </li>
                ) : null}
              </ul>
            </nav>
          ))}
          <nav aria-label={`About ${siteConfig.name}`} className="break-inside-avoid">
            <h2 className="text-sm font-semibold text-ink">{siteConfig.name}</h2>
            <ul className="mt-3 space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted hover:text-ink hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} {siteConfig.name}. Free to use, no account required.
        </p>
      </div>
    </footer>
  );
}
