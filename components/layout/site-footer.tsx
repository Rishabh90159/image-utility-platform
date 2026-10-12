import Link from "next/link";
import { buttonClass } from "@/components/controls/button";
import { PhotoCard } from "@/components/controls/photo-card";
import { TINTS, type Tint } from "@/components/controls/tints";
import { siteConfig } from "@/lib/site";
import { APPLICATION_HUB, PDF_HUB, toolsIn, type NavGroup } from "@/lib/tools/registry";
import { Logo } from "./logo";

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/methodology", label: "How the tools work" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
  { href: "/contact", label: "Contact" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
  { href: "/contact", label: "Contact" },
];

/** Footer link columns: every tool in its nav group, plus a "view all" link and any extra links. */
const columns: {
  group: NavGroup;
  label: string;
  tint: Tint;
  icon: React.ReactNode;
  extra?: { href: string; label: string }[];
  more: { href: string; label: string };
}[] = [
  {
    group: "image",
    label: "Image tools",
    tint: "blue",
    icon: <path d="M3 4.5h14v11H3z M3 13l4-3.5 3 2.5 2.5-2 4.5 3.5 M13 8h.01" />,
    more: { href: "/tools", label: "All image tools" },
  },
  {
    group: "convert",
    label: "Convert tools",
    tint: "green",
    icon: <path d="M4 7h11l-3-3 M16 13H5l3 3" />,
    more: { href: "/tools#group-convert", label: "All converters" },
  },
  {
    group: "size",
    label: "Photo size tools",
    tint: "orange",
    icon: <path d="M3 6.5h3l1.5-2h5L14 6.5h3v9H3z M10 13.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />,
    more: { href: "/tools#group-size", label: "All photo size tools" },
  },
  {
    group: "application",
    label: "Exam & passport",
    tint: "rose",
    icon: <path d="M5 2.5h7l3.5 3.5v11.5H5z M10 11a2 2 0 100-4 2 2 0 000 4z M7.5 14.5c.5-1.5 4.5-1.5 5 0" />,
    extra: [{ href: APPLICATION_HUB.path, label: "Compare requirements" }],
    more: { href: "/tools#group-application", label: "All exam tools" },
  },
  {
    group: "pdf",
    label: "PDF tools",
    tint: "sky",
    icon: <path d="M5 2.5h7l3.5 3.5v11.5H5z M12 2.5V6h3.5 M7.5 10.5h5 M7.5 13.5h5" />,
    more: { href: PDF_HUB.path, label: "All PDF tools" },
  },
];

const promises: { title: string; text: string; tint: Tint; icon: React.ReactNode }[] = [
  { title: "100% free", text: "No hidden charges", tint: "green", icon: <path d="M10 2.5l6 2.2v4.6c0 3.9-2.6 6.9-6 8.2-3.4-1.3-6-4.3-6-8.2V4.7z M7.3 10l1.9 1.9 3.6-3.8" /> },
  { title: "Works on all devices", text: "Desktop, tablet and mobile", tint: "violet", icon: <path d="M11 2.5L4.5 11h5l-1 6.5 6.5-8.5h-5z" /> },
  { title: "Your files stay private", text: "Processed in your browser", tint: "orange", icon: <path d="M4.5 9.5h11v8h-11z M7 9.5V7a3 3 0 016 0v2.5" /> },
];

function Icon({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ColumnHeading({ tint, icon, children }: { tint: Tint; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 whitespace-nowrap text-sm font-bold text-ink">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TINTS[tint]}`}>
        <Icon>{icon}</Icon>
      </span>
      {children}
    </h2>
  );
}

const linkClass = "text-sm text-muted transition-colors hover:text-accent hover:underline";

type Column = (typeof columns)[number];

/** One tool group: heading, every tool in the group, extra links, then a "view all" link. */
function LinkColumn({ column, className = "", split = false }: { column: Column; className?: string; split?: boolean }) {
  return (
    <nav aria-label={column.label} className={className}>
      <ColumnHeading tint={column.tint} icon={column.icon}>
        {column.label}
      </ColumnHeading>
      <ul className={`mt-4 ${split ? "columns-2 gap-x-8" : ""}`}>
        {toolsIn(column.group).map((tool) => (
          <li key={tool.id} className="mb-3 break-inside-avoid">
            <Link href={tool.path} className={linkClass}>
              {tool.name}
            </Link>
          </li>
        ))}
        {column.extra?.map((link) => (
          <li key={link.href} className="mb-3 break-inside-avoid">
            <Link href={link.href} className={linkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <Link href={column.more.href} className="mt-1 inline-block whitespace-nowrap text-sm font-semibold text-accent hover:underline">
        {column.more.label} <span aria-hidden="true">→</span>
      </Link>
    </nav>
  );
}

/**
 * Site footer: a call-to-action banner, then the brand column and the tool groups.
 * The long image-tools list splits into two sub-columns so the columns stay balanced.
 */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="relative grid items-center gap-6 overflow-hidden rounded-xl border border-accent/10 bg-accent-soft p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-canvas text-accent shadow-sm sm:flex">
              <Icon size={28}>
                <path d="M3 4.5h14v11H3z M3 13l4-3.5 3 2.5 2.5-2 4.5 3.5 M13 8h.01" />
              </Icon>
            </span>
            <div className="min-w-0 flex-1">
              {/* Styled text rather than a heading: the footer repeats on every page. */}
              <p className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">Start editing your images now</p>
              <p className="mt-1 text-ink-soft">Free, easy image tools that run in your browser. No sign-up required.</p>
            </div>
            <Link href="/tools" className={buttonClass("primary", "shrink-0 px-6")}>
              Explore all tools <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="flex items-center gap-8">
            <div aria-hidden="true" className="relative hidden h-28 w-36 shrink-0 xl:block">
              <PhotoCard className="absolute right-0 top-0 w-28 rotate-6 rounded-lg shadow" />
              <PhotoCard className="absolute bottom-0 left-0 w-28 -rotate-6 rounded-lg shadow-lg" />
            </div>
            <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {promises.map((item) => (
                <li key={item.title} className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TINTS[item.tint]}`}>
                    <Icon>{item.icon}</Icon>
                  </span>
                  <span className="leading-tight">
                    <span className="block text-sm font-semibold text-ink">{item.title}</span>
                    <span className="block text-xs text-muted">{item.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-x-16 gap-y-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">{siteConfig.tagline}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Images are processed in your browser and are not uploaded to our servers.
          </p>
          <ul className="mt-5 flex gap-2.5" aria-label="Social media">
            <li>
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram (opens in a new tab)"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-canvas text-[#e1306c] transition-colors hover:border-[#e1306c]"
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-canvas text-[#0a66c2] transition-colors hover:border-[#0a66c2]"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.1c0-1.22-.02-2.8-1.7-2.8-1.71 0-1.97 1.33-1.97 2.7V21h-4z" />
                </svg>
              </a>
            </li>
          </ul>
        </div>

        {/* Image tools is the longest list, so it gets two sub-columns; photo size and About share a column. */}
        <div className="grid grid-cols-2 gap-x-10 gap-y-10 md:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <LinkColumn column={columns[0]} className="col-span-2 md:col-span-1" split />
          <div className="contents md:block md:space-y-10">
            <LinkColumn column={columns[1]} />
            <LinkColumn column={columns[4]} />
          </div>
          <LinkColumn column={columns[3]} />
          <div className="contents md:block md:space-y-10">
            <LinkColumn column={columns[2]} />
            <nav aria-label={`About ${siteConfig.name}`}>
              <ColumnHeading tint="violet" icon={<path d="M10 17.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15z M10 9v4.5 M10 6.5h.01" />}>
                About {siteConfig.name}
              </ColumnHeading>
              <ul className="mt-4 space-y-3">
                {companyLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {legalLinks.map((link, index) => (
              <li key={link.href} className="flex items-center gap-4">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-line-strong">
                    |
                  </span>
                ) : null}
                <Link href={link.href} className="hover:text-accent hover:underline">
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
