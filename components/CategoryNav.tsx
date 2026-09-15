"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

interface NavCategory {
  slug: string;
  name: string;
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Sticky category chips. Each chip is a plain #anchor, so it works before JS loads;
 * once hydrated, the chip for the section under the bar is highlighted as you scroll.
 */
export function CategoryNav({ categories }: { categories: NavCategory[] }) {
  const [active, setActive] = useState<string | undefined>(categories[0]?.slug);
  const navRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  // After a tap, hold the tapped chip while the page smooth-scrolls past other sections.
  const holding = useRef(false);
  const holdTimer = useRef<number>(undefined);

  useEffect(() => () => clearTimeout(holdTimer.current), []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (holding.current) return;
      const navBottom = navRef.current?.getBoundingClientRect().bottom ?? 0;
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = categories[0]?.slug;
      for (const { slug } of categories) {
        const top = document.getElementById(slug)?.getBoundingClientRect().top;
        if (top !== undefined && top <= navBottom + 16) current = slug;
      }
      setActive(atBottom ? categories.at(-1)?.slug : current);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [categories]);

  // Keep the highlighted chip in view within the horizontal strip.
  useEffect(() => {
    const strip = stripRef.current;
    const chip = strip?.querySelector<HTMLElement>(`[data-slug="${active}"]`);
    if (!strip || !chip) return;
    strip.scrollTo({
      left: chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [active]);

  // Scroll without pushing a #hash history entry, so Back still leaves the page.
  const jumpTo = (event: MouseEvent, slug: string) => {
    const section = document.getElementById(slug);
    if (!section) return;
    event.preventDefault();
    holding.current = true;
    clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      holding.current = false;
    }, 1000);
    setActive(slug);
    section.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <nav
      ref={navRef}
      aria-label="Menu categories"
      className="sticky top-0 z-20 border-b border-line bg-page"
    >
      <div
        ref={stripRef}
        className="no-scrollbar relative mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 py-2.5"
      >
        {categories.map(({ slug, name }) => {
          const isActive = slug === active;
          return (
            <a
              key={slug}
              href={`#${slug}`}
              data-slug={slug}
              aria-current={isActive ? "true" : undefined}
              onClick={(event) => jumpTo(event, slug)}
              className={`inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-bold whitespace-nowrap transition-colors ${
                isActive ? "border-ink bg-ink text-page" : "border-line bg-page text-ink"
              }`}
            >
              {name}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
