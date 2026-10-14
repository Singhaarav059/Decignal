// Moving the reader around the page. jumpTo is the one way to scroll on someone's behalf: a short
// distance glides, a long one cuts through a solid veil so the 3D never strobes through chapters in
// between. Deep links between the nav previews and the sections ride on window events below; each
// section listens for its own and does the scrolling, since only it knows where its pinned parts land.

import type Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { progressToG } from "./story";
import { getChrome, setChrome, token } from "./chrome";

/* ---------------- Section events ---------------- */

const send = (name: string, detail: number) => window.dispatchEvent(new CustomEvent(name, { detail }));
const listen = (name: string, fn: (i: number) => void) => {
  const on = (e: Event) => fn((e as CustomEvent<number>).detail);
  window.addEventListener(name, on);
  return () => window.removeEventListener(name, on);
};

/** Open one outcome case in the Outcomes board. */
export const showOutcome = (i: number) => send("outcome-jump", i);
export const onOutcome = (fn: (i: number) => void) => listen("outcome-jump", fn);

/** Walk the How it works roadmap to one step. */
export const showStep = (i: number) => send("step-jump", i);
export const onStep = (fn: (i: number) => void) => listen("step-jump", fn);

/** Open one question in the FAQ. */
export const showQuestion = (i: number) => send("faq-jump", i);
export const onQuestion = (fn: (i: number) => void) => listen("faq-jump", fn);


/** Cut the application explorer to one application (by APPLICATIONS index). */
export const showApplication = (i: number) => send("application-jump", i);
export const onApplication = (fn: (i: number) => void) => listen("application-jump", fn);

/* ---------------- Smooth scroll instance ---------------- */

let lenis: Lenis | null = null;
let locks = 0;
/** SmoothScroll registers its Lenis here (null when it unmounts or under reduced motion). It arrives
 *  after the loader may have locked the page, so it starts stopped while a lock holds. */
export const setLenis = (l: Lenis | null) => {
  lenis = l;
  if (l && locks) l.stop();
};

/** Holds the page still (the loader, the open menu): Lenis stops where it runs, and on touch screens,
 *  which scroll natively, html.scroll-lock hides the overflow. Counted, so two holders can overlap. */
export function lockScroll(on: boolean) {
  locks = Math.max(locks + (on ? 1 : -1), 0);
  if (lenis) {
    if (locks) lenis.stop();
    else lenis.start();
  }
  document.documentElement.classList.toggle("scroll-lock", locks > 0);
}

/* ---------------- jumpTo ---------------- */

type JumpTarget = string | number | Element;
export type JumpOptions = {
  /** What gets focus on landing: true (default for elements and selectors) focuses the target itself,
   *  a selector or element focuses that, false leaves focus where it is. */
  focus?: boolean | string | HTMLElement;
  /** Measure the distance in story chapters, not viewports. Detected when both ends sit in #story. */
  story?: boolean;
  /** Land at once with no glide and no veil. */
  immediate?: boolean;
};

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const frames = (n: number) => new Promise<void>((r) => {
  const step = () => (--n <= 0 ? r() : requestAnimationFrame(step));
  requestAnimationFrame(step);
});
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** Waits for two quick frames in a row, so a heavy first draw at the new spot has landed (at most 12 frames). */
const settle = () => new Promise<void>((done) => {
  let last = performance.now();
  let calm = 0;
  let n = 0;
  const step = (t: number) => {
    calm = t - last < 40 ? calm + 1 : 0;
    last = t;
    if (calm >= 2 || ++n >= 12) done();
    else requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
});
/** --ease is cubic-bezier(0.22, 1, 0.36, 1), the ease-out quint curve. */
const ease = (t: number) => 1 - Math.pow(1 - t, 5);

/** Motion tokens live with the chrome store; existing callers import them from here. */
export { token };

/** Page y for a target, honouring the element's scroll-margin-top. */
function resolve(target: JumpTarget): { y: number; el: HTMLElement | null } | null {
  if (typeof target === "number") return { y: target, el: null };
  let el: Element | null = null;
  if (typeof target === "string") {
    try {
      el = target.startsWith("#") ? document.getElementById(decodeURIComponent(target.slice(1))) : document.querySelector(target);
    } catch {
      el = null;
    }
  } else el = target;
  if (!el) return null;
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  return { y: el.getBoundingClientRect().top + window.scrollY - margin, el: el as HTMLElement };
}

/** Where y sits in the story, as g, or null outside it. */
function storyG(y: number) {
  const el = document.getElementById("story");
  if (!el) return null;
  const start = el.getBoundingClientRect().top + window.scrollY;
  const range = el.offsetHeight - window.innerHeight;
  if (range <= 0 || y < start - 1 || y > start + range + 1) return null;
  return progressToG((y - start) / range);
}

/** Focus without scrolling. Elements that cannot take focus get a temporary tabindex. */
function focusOn(f: JumpOptions["focus"], target: HTMLElement | null) {
  const el = f === true ? target : typeof f === "string" ? document.querySelector<HTMLElement>(f) : f || null;
  if (!el) return;
  if (!el.matches("a[href],button,input,select,textarea,summary,[tabindex]")) {
    el.setAttribute("tabindex", "-1");
    el.setAttribute("data-jump-target", "");
    el.addEventListener("blur", () => {
      el.removeAttribute("tabindex");
      el.removeAttribute("data-jump-target");
    }, { once: true });
  }
  el.focus({ preventScroll: true });
}

let veil: HTMLDivElement | null = null;
function ensureVeil() {
  if (veil?.isConnected) return veil;
  veil = document.createElement("div");
  veil.className = "jump-veil";
  veil.setAttribute("aria-hidden", "true");
  document.body.appendChild(veil);
  // Commit its closed state now, so the first jump fades it in instead of snapping it shut.
  void getComputedStyle(veil).opacity;
  return veil;
}

/** html[data-jump]: run (gliding), out (veil closing), in (veil opening), hold (veil shut, set by the
 *  loader), rest (landed; chrome stays put until the reader scrolls again). */
const phase = (p: "run" | "out" | "in" | "hold" | "rest" | null) => {
  const html = document.documentElement;
  if (p) html.dataset.jump = p;
  else delete html.dataset.jump;
};
const held = () => document.documentElement.dataset.jump === "hold";

/** Opens the veil over --dur-3 on the --ease curve. The fade advances only by the time frames actually
 *  show (at most 25ms per frame), so a heavy first draw at the new spot pauses the fade
 *  instead of skipping most of it. Hands back to the CSS states when another jump takes over. */
function openVeil() {
  const s = ensureVeil().style;
  phase("in");
  const total = token("--dur-3", 320);
  s.transition = "none";
  s.visibility = "visible";
  s.opacity = "1";
  return new Promise<void>((done) => {
    let shown = 0;
    let last = 0;
    const step = (t: number) => {
      if (last) shown += Math.min(t - last, 25);
      last = t;
      const p = Math.min(shown / total, 1);
      if (p < 1 && document.documentElement.dataset.jump === "in") {
        s.opacity = String(1 - ease(p));
        requestAnimationFrame(step);
        return;
      }
      s.removeProperty("transition");
      s.removeProperty("visibility");
      s.removeProperty("opacity");
      done();
    };
    requestAnimationFrame(step);
  });
}

let current = 0;
let offRest: (() => void) | null = null;

/** After landing, the chrome holds still until the reader moves the page themselves (12px either way).
 *  A click or a Tab that does not scroll keeps it still. */
function rest() {
  phase("rest");
  offRest?.();
  const y0 = window.scrollY;
  const clear = () => {
    if (Math.abs(window.scrollY - y0) < 12) return;
    offRest?.();
    if (document.documentElement.dataset.jump === "rest") phase(null);
  };
  window.addEventListener("scroll", clear, { passive: true });
  offRest = () => {
    window.removeEventListener("scroll", clear);
    offRest = null;
  };
}

/** Sets the scroll position at once and lets ScrollTrigger and the scene catch up. */
function place(y: number) {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo({ top: y, behavior: "instant" });
  ScrollTrigger.update();
  send(JUMP_CUT, y);
}

/** Fired right after the page moves at once (a veil cut, a hash landing, an immediate jump), with the
 *  new y. Anything that eases toward the scroll position (the story camera) should snap to it here,
 *  so the veil opens on the settled frame instead of a camera still flying in. */
const JUMP_CUT = "jump-cut";
export const onJumpCut = (fn: (y: number) => void) => listen(JUMP_CUT, fn);

/** The glide without Lenis (touch screens scroll natively): the same ease, frame by frame. A touch on
 *  the screen hands the page back to the reader at once. */
function glideNative(y: number, seconds: number) {
  return new Promise<void>((done) => {
    const owner = current;
    const from = window.scrollY;
    const t0 = performance.now();
    let raf = 0;
    const stop = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("resize", stop);
      done();
    };
    const step = (t: number) => {
      if (owner !== current) return stop();
      const k = Math.min((t - t0) / (seconds * 1000), 1);
      window.scrollTo({ top: from + (y - from) * ease(k), behavior: "instant" });
      if (k < 1) raf = requestAnimationFrame(step);
      else stop();
    };
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("resize", stop, { passive: true });
    raf = requestAnimationFrame(step);
  });
}

function glide(l: Lenis, y: number, seconds: number) {
  return new Promise<void>((done) => {
    const fallback = setTimeout(done, seconds * 1000 + 400);
    l.scrollTo(y, {
      duration: seconds,
      easing: ease,
      lock: true,
      force: true,
      onComplete: () => {
        clearTimeout(fallback);
        done();
      },
    });
  });
}

/**
 * Takes the reader to a target. Within 2.5 viewports (or 2 story chapters) the page glides,
 * 0.6-1.2s by distance (0.5s per chapter in the story, up to 1.4s). Further than that, a solid
 * background veil closes, the page moves at once, the scene draws the new spot, and the veil
 * opens. Reduced motion lands at once; touch screens (no Lenis) glide natively. The nav, pill and dock hold
 * still meanwhile (chrome.jumping, html[data-jump]); focus moves to the target on landing.
 */
export async function jumpTo(target: JumpTarget, opts: JumpOptions = {}) {
  const r = resolve(target);
  if (!r) return;
  const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  const y = Math.round(Math.min(Math.max(r.y, 0), max));
  const from = lenis ? lenis.animatedScroll : window.scrollY;
  const focus = opts.focus ?? (r.el ? true : false);

  // Already there. Only when no jump is in flight: superseding one here would leave its veil shut.
  // Checks the window too: a native scroll in this same frame has not reached Lenis yet.
  if (Math.abs(y - from) < 2 && Math.abs(y - window.scrollY) < 2 && !getChrome().jumping) {
    focusOn(focus, r.el);
    return;
  }
  const id = ++current;
  offRest?.();

  setChrome({ jumping: true });
  try {
    if (opts.immediate || reduced()) {
      if (!held()) phase("run");
      place(y);
      await frames(1);
    } else {
      const gFrom = storyG(from);
      const gTo = storyG(y);
      const inStory = opts.story ?? (gFrom !== null && gTo !== null);
      const chapters = inStory && gFrom !== null && gTo !== null ? Math.abs(gTo - gFrom) : Infinity;
      const d = Math.abs(y - from) / window.innerHeight;
      if (inStory ? chapters <= 2 : d <= 2.5) {
        phase("run");
        const seconds = inStory ? Math.min(Math.max(chapters * 0.5, 0.6), 1.4) : Math.min(Math.max(0.6 + d * 0.25, 0.6), 1.2);
        await (lenis ? glide(lenis, y, seconds) : glideNative(y, seconds));
      } else {
        ensureVeil();
        phase("out");
        await wait(token("--dur-2", 200));
        if (id !== current) return;
        place(y);
        // Open only once the story and the scene have drawn the new spot.
        await settle();
        if (id !== current) return;
        await openVeil();
      }
    }
  } finally {
    if (id === current) {
      setChrome({ jumping: false, navHidden: false });
      if (!held()) rest();
    }
  }
  if (id === current) focusOn(focus, r.el);
}

/* ---------------- Hash landing ---------------- */

/** The element the URL hash names, if this page has it. */
function hashTarget() {
  const hash = window.location.hash;
  if (hash.length < 2) return null;
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}

/** How far the page is from the hash target's landing spot, in px (0 without a target). A full load
 *  is usually there already (the browser's own anchor scroll); a client navigation is not. */
export function hashOffset() {
  const el = hashTarget();
  const r = el && resolve(el);
  return r ? Math.abs(r.y - window.scrollY) : 0;
}

/** Shuts the veil at once (no fade), so a landing after the page has painted is never seen. */
export function holdVeil() {
  ensureVeil();
  phase("hold");
}

/** Opens a held veil. */
async function releaseVeil() {
  if (!held()) return;
  await openVeil();
  if (document.documentElement.dataset.jump === "in") rest();
}

/** Lands on the URL hash once pinned stages have measured themselves. The loader calls it before its
 *  curtain lifts, or with `veil` when there is no curtain. Returns false when there is nothing to land on. */
export async function landOnHash({ veil = false } = {}) {
  if (!hashTarget()) return false;
  if (veil && !reduced() && hashOffset() > 2) holdVeil();
  // Pinned stages add their spacers in their own effects: let them, then measure.
  await frames(2);
  ScrollTrigger.refresh();
  const el = hashTarget();
  if (el) await jumpTo(el, { immediate: true });
  await releaseVeil();
  return true;
}

