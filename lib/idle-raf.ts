// A page at rest should draw nothing. GSAP's ScrollTrigger keeps an empty requestAnimationFrame loop
// running for the life of the page (its "_rafBugFix", for a Firefox repaint quirk). An empty loop still
// makes the browser run a main-thread frame every vsync, and in each of those frames every CSS loop on
// screen, compositor ones included (the wallpaper's drift), is re-styled and committed: the page never
// idles, which a phone pays for in heat and in a busier main thread when the thumb comes down.
// ScrollTrigger schedules its own updates on scroll, so the loop is let go: its callback (nothing but a
// guard and a request for itself) is dropped when it asks again. Firefox keeps it. Desktop runs Lenis on
// GSAP's ticker anyway, so in practice this is the phones' rest.

const EMPTY_LOOP = /^function\s*[\w$]*\s*\(\)\s*\{\s*return\s+[\w$]+\s*&&\s*requestAnimationFrame\(\s*[\w$]+\s*\)\s*;?\s*\}$/;

let installed = false;

/** Installs the filter once per document; it stays for the page's life (it touches nothing else). */
export function dropEmptyRafLoops() {
  if (installed || typeof window === "undefined" || /firefox/i.test(navigator.userAgent)) return;
  installed = true;
  const raf = window.requestAnimationFrame.bind(window);
  const empty = new WeakMap<FrameRequestCallback, boolean>();
  window.requestAnimationFrame = (cb: FrameRequestCallback) => {
    // Arrow functions (no prototype) are never the loop: no source read for them.
    if ("prototype" in cb) {
      let skip = empty.get(cb);
      if (skip === undefined) {
        skip = EMPTY_LOOP.test(Function.prototype.toString.call(cb));
        empty.set(cb, skip);
      }
      if (skip) return 0;
    }
    return raf(cb);
  };
}
