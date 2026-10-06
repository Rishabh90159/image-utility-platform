import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { allTools } from "@/lib/tools/registry";
import { Logo } from "./logo";

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/methodology", label: "How the tools work" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-muted">{siteConfig.tagline}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Images are processed in your browser and are not uploaded to our servers.
          </p>
        </div>
        <nav aria-label="Tools">
          <h2 className="text-sm font-semibold text-ink">Tools</h2>
          <ul className="mt-3 space-y-2">
            {allTools.map((tool) => (
              <li key={tool.id}>
                <Link href={tool.path} className="text-sm text-muted hover:text-ink hover:underline">
                  {tool.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/tools" className="text-sm text-muted hover:text-ink hover:underline">
                All image tools
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="About Pixfit">
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
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} {siteConfig.name}. Free to use, no account required.
        </p>
      </div>
    </footer>
  );
}
