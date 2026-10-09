"use client";

// Small motion helpers shared by the page: a pill that glides to the active tab, and reveals for
// the part of the page that reads like a document (the night section).
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Glides one indicator (the container's ::before) to the active item. The container gets
 * data-slide; the pill is placed with --ix/--iy/--iw/--ih and only animates once it has been placed,
 * so it never sweeps in from the corner on first paint.
 */
export function useSlide<T extends HTMLElement>(active: number, items = ":scope > button") {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const place = () => {
      const b = el.querySelectorAll<HTMLElement>(items)[active];
      if (!b) {
        el.style.setProperty("--io", "0");
        return;
      }
      el.style.setProperty("--ix", `${b.offsetLeft}px`);
      el.style.setProperty("--iy", `${b.offsetTop}px`);
      el.style.setProperty("--iw", `${b.offsetWidth}px`);
      el.style.setProperty("--ih", `${b.offsetHeight}px`);
      el.style.setProperty("--io", "1");
    };
    place();
    const raf = requestAnimationFrame(() => (el.dataset.slide = "1"));
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active, items]);
  return ref;
}

/** Marks every [data-reveal] inside `root` as shown once it scrolls into view (once only). */
export function useReveal(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.shown = "true";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );
    el.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
}
