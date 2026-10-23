import Link from "next/link";
import { TINTS, type Tint } from "@/components/controls/tints";
import { siteConfig } from "@/lib/site";
import { APPLICATION_HUB, getTool, PDF_HUB, type ToolId } from "@/lib/tools/registry";
import { Logo } from "./logo";

/** About and legal pages, listed once in the bottom bar. */
const siteLinks = [
  { href: "/about", label: "About" },
  { href: "/methodology", label: "How the tools work" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
  { href: "/contact", label: "Contact" },
];

/**
 * Footer link groups: the most-used tools of each group and a link to the full list. Every tool is still
 * linked on every page from the header menus, so the footer stays short instead of repeating them all.
 */
const columns: {
  label: string;
  tint: Tint;
  icon: React.ReactNode;
  tools: ToolId[];
  extra?: { href: string; label: string };
  more: { href: string; label: string };
}[] = [
  {
    label: "Image tools",
    tint: "blue",
    icon: <path d="M3 4.5h14v11H3z M3 13l4-3.5 3 2.5 2.5-2 4.5 3.5 M13 8h.01" />,
    tools: ["image-resizer", "image-compressor", "resize-image-to-kb", "image-cropper", "merge-images"],
    more: { href: "/tools", label: "All image tools" },
  },
  {
    label: "Convert",
    tint: "green",
    icon: <path d="M4 7h11l-3-3 M16 13H5l3 3" />,
    tools: ["image-to-jpg", "jpg-to-png", "png-to-jpg", "heic-to-jpg", "webp-to-jpg"],
    more: { href: "/tools#group-convert", label: "All converters" },
  },
  {
    label: "Photo size",
    tint: "orange",
    icon: <path d="M3 6.5h3l1.5-2h5L14 6.5h3v9H3z M10 13.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />,
    tools: ["20kb-photo", "50kb-photo", "100kb-photo", "200kb-photo", "mb-to-kb-converter"],
    more: { href: "/tools#group-size", label: "All photo size tools" },
  },
  {
    label: "Exam & passport",
    tint: "rose",
    icon: <path d="M5 2.5h7l3.5 3.5v11.5H5z M10 11a2 2 0 100-4 2 2 0 000 4z M7.5 14.5c.5-1.5 4.5-1.5 5 0" />,
    tools: ["passport-photo", "rrb-photo", "ssc-photo", "ibps-photo", "upsssc-photo"],
    extra: { href: APPLICATION_HUB.path, label: "Compare exam requirements" },
    more: { href: "/tools#group-application", label: "All exam tools" },
  },
  {
    label: "PDF tools",
    tint: "sky",
    icon: <path d="M5 2.5h7l3.5 3.5v11.5H5z M12 2.5V6h3.5 M7.5 10.5h5 M7.5 13.5h5" />,
    tools: ["compress-pdf", "jpg-to-pdf", "pdf-to-jpg", "merge-pdf", "pdf-to-word"],
    more: { href: PDF_HUB.path, label: "All PDF tools" },
  },
];

const promises = ["Free, with no limits or watermarks", "Nothing is uploaded", "Works on phone and computer"];

function Icon({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

// Each link is a 24px-tall touch target (WCAG 2.5.8). Slate-300 on the navy background is about 11:1.
const linkClass = "inline-flex min-h-6 items-center text-sm text-slate-300 transition-colors hover:text-white hover:underline";

/** Dark brand footer: brand and promises, the main tools of each group, then the site links. */
export function SiteFooter() {
  return (
    <footer className="render-later mt-24 bg-gradient-to-b from-[#0f1e46] to-[#0a1433] text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:py-14">
        <div>
          <Logo tone="light" />
          <p className="mt-4 text-sm leading-relaxed text-slate-300">{siteConfig.tagline}</p>
          <ul className="mt-4 space-y-1.5" aria-label={`Why ${siteConfig.name}`}>
            {promises.map((text) => (
              <li key={text} className="flex items-center gap-2 text-sm text-slate-200">
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0 text-emerald-400">
                  <path d="M3.5 8.4l2.7 2.7 6.3-6.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {text}
              </li>
            ))}
          </ul>
          <ul className="mt-5 flex gap-2.5" aria-label="Social media">
            <li>
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram (opens in a new tab)"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </li>
            <li>
              <a
                href={siteConfig.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn (opens in a new tab)"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.1c0-1.22-.02-2.8-1.7-2.8-1.71 0-1.97 1.33-1.97 2.7V21h-4z" />
                </svg>
              </a>
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-5">
          {columns.map((column) => (
            <nav key={column.label} aria-label={column.label}>
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${TINTS[column.tint]}`}>
                  <Icon size={16}>{column.icon}</Icon>
                </span>
                {column.label}
              </h2>
              <ul className="mt-3.5 space-y-1.5">
                {column.tools.map((id) => {
                  const tool = getTool(id);
                  return (
                    <li key={id}>
                      <Link href={tool.path} className={linkClass}>
                        {tool.navLabel}
                      </Link>
                    </li>
                  );
                })}
                {column.extra ? (
                  <li>
                    <Link href={column.extra.href} className={linkClass}>
                      {column.extra.label}
                    </Link>
                  </li>
                ) : null}
              </ul>
              <Link href={column.more.href} className="mt-2 inline-flex min-h-6 items-center gap-1 text-sm font-semibold text-sky-300 hover:text-white hover:underline">
                {column.more.label} <span aria-hidden="true">→</span>
              </Link>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-slate-400">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1" aria-label={`About ${siteConfig.name}`}>
            {siteLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
