"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Dropdown menu built on a native <details> element, so it still opens without
 * JavaScript. This wrapper closes it after navigating (the header stays
 * mounted between pages), on a click or tap outside, and on Escape. Opening
 * one menu closes the others.
 */
export function DisclosureMenu({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  // Only one menu open at a time.
  useEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const onToggle = () => {
      if (!menu.open) return;
      document.querySelectorAll<HTMLDetailsElement>("details[data-disclosure-menu][open]").forEach((other) => {
        if (other !== menu) other.open = false;
      });
    };
    menu.addEventListener("toggle", onToggle);
    return () => menu.removeEventListener("toggle", onToggle);
  }, []);

  useEffect(() => {
    const close = (event: Event) => {
      const menu = ref.current;
      if (!menu?.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        menu.open = false;
        menu.querySelector("summary")?.focus();
        return;
      }
      const target = event.target as Node;
      // Clicking a link inside the menu also closes it, including a link to the current page.
      if (!menu.contains(target) || (target instanceof Element && target.closest("a"))) menu.open = false;
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details ref={ref} className={className} data-disclosure-menu="">
      {children}
    </details>
  );
}
