"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Mobile "Tools" menu. A native <details> element, so it still opens without
 * JavaScript; this wrapper closes it after navigating (the header stays
 * mounted between pages), on a click or tap outside, and on Escape.
 */
export function MobileMenu({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

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
    <details ref={ref} className={className}>
      {children}
    </details>
  );
}
