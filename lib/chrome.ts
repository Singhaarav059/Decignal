// One store for the page chrome (nav, CTA pill, phone dock, menu) and one driver that
// works out where the reader is. Consumers read it with useChrome(selector); only the driver listens
// to scroll, so adding a control never adds a scroll listener.

import { useEffect, useSyncExternalStore } from "react";
import { blendAt, store as story, subscribe as onStory } from "./story";
import { pageBox, viewTop } from "./offsets";

export type ChromeSection = {
  id: string;
  label: string;
  /** Short name for tight spots (phone dock, readout). */
  short?: string;
  /** Selector where the section starts reading, when that is above the element with `id`. */
  start?: string;
  /** False keeps it off the phone dock, which holds four sections. */
  dock?: boolean;
};

export type ChromeState = {
  /** The nav steps aside while reading down past the story. */
  navHidden: boolean;
  /** A jumpTo is running: controls ignore scroll direction until it lands. */
  jumping: boolean;
  menuOpen: boolean;
  /** The story still holds the top half of the viewport. False on pages without #story. */
  inStory: boolean;
  /** Story chapter being read (the incoming one once a hand-off is half done). */
  chapter: number;
  /** Section being read past the story, or null. */
  section: string | null;
  /** Its label; sections that start together share one ("FAQ and free audit"). */
  sectionLabel: string;
  /** A pinned stage ([data-pin], or the application journey) fills the viewport. */
  pinned: boolean;
  /** The audit form is on screen: other audit CTAs step back. */
  auditNear: boolean;
  /** The footer is on screen. */
  footerNear: boolean;
  /** The page has scrolled off the very top. */
  scrolled: boolean;
  /** The story scene has drawn its first frame (the 'scene-ready' window event). */
  sceneReady: boolean;
  /** The floating CTA (desktop pill, phone dock) is up: the nav has stepped aside, the reader has
   *  paused, and nothing to read sits under it. */
  dock: boolean;
};

export const HOME_SECTIONS: ChromeSection[] = [
  { id: "systems", label: "Systems", dock: false },
  { id: "platform", label: "Platform", dock: false },
  { id: "applications", label: "Applications", short: "Apps" },
  { id: "trail", label: "Trail", dock: false },
  { id: "outcomes", label: "Outcomes" },
  { id: "how", label: "How it works", short: "How" },
  { id: "faq", label: "FAQ" },
  { id: "audit", label: "Free audit", short: "Audit" },
];

const INITIAL: ChromeState = {
  navHidden: false,
  jumping: false,
  menuOpen: false,
  inStory: true,
  chapter: 0,
  section: null,
  sectionLabel: "",
  pinned: false,
  auditNear: false,
  footerNear: false,
  scrolled: false,
  sceneReady: false,
  dock: false,
};

let state = INITIAL;
const listeners = new Set<() => void>();

export const getChrome = () => state;

/** Merges a patch and notifies only when a value actually changed. */
export function setChrome(patch: Partial<ChromeState>) {
  let changed = false;
  for (const k in patch) {
    const key = k as keyof ChromeState;
    if (patch[key] !== state[key]) changed = true;
  }
  if (!changed) return;
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeChrome(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Reads one value from the chrome store. The selector must return a primitive (or a stable value). */
export function useChrome<T>(select: (s: ChromeState) => T): T {
  return useSyncExternalStore(
    subscribeChrome,
    () => select(state),
    () => select(INITIAL),
  );
}

/* ---------------- Scene readiness ---------------- */

export const SCENE_READY = "scene-ready";

/** The story scene calls this after its first rendered frame (or dispatches 'scene-ready' itself). */
export const markSceneReady = () => window.dispatchEvent(new Event(SCENE_READY));

if (typeof window !== "undefined") window.addEventListener(SCENE_READY, () => setChrome({ sceneReady: true }));

/** Resolves once the scene has drawn, or at once if it already has. */
export function whenSceneReady() {
  return new Promise<void>((resolve) => {
    if (state.sceneReady) return resolve();
    window.addEventListener(SCENE_READY, () => resolve(), { once: true });
  });
}

/* ---------------- Section detector ---------------- */

/** Page top of a section's reading start. */
function sectionTop(s: ChromeSection) {
  const el = (s.start && document.querySelector(s.start)) || document.getElementById(s.id);
  return el ? pageBox(el).top : null;
}

/** The section being read: the last one whose top has passed 45% of the viewport. Sections whose
 *  tops sit within 8px of each other (FAQ and audit side by side) count as one, named for both. */
export function detectSection(sections: ChromeSection[] = HOME_SECTIONS): { id: string | null; label: string } {
  const line = window.scrollY + window.innerHeight * 0.45;
  let found: { id: string | null; label: string } = { id: null, label: "" };
  let foundTop = -Infinity;
  for (const s of sections) {
    const top = sectionTop(s);
    if (top === null) continue;
    if (Math.abs(top - foundTop) <= 8 && found.id) {
      found = { id: found.id, label: `${found.label} and ${s.label.charAt(0).toLowerCase()}${s.label.slice(1)}` };
      continue;
    }
    if (top <= line) {
      found = { id: s.id, label: s.label };
      foundTop = top;
    }
  }
  return found;
}

/** A pinned element's spacer holds its place in the flow; measure that, not the element itself. */
const flowBox = (el: Element) => (el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el);

function isPinned() {
  const vh = window.innerHeight;
  for (const el of document.querySelectorAll("[data-pin], .application-journey")) {
    const box = flowBox(el);
    const top = viewTop(box);
    if (top <= 0 && top + pageBox(box).height >= vh) return true;
  }
  return false;
}

/** A sticky stack ([data-stick], the area panels) holds the screen like a pin while its first panel
 *  rests on its sticky line. Kept apart from `pinned`. */
function isStuck() {
  const first = document.querySelector<HTMLElement>("[data-stick] > :first-child");
  if (!first) return false;
  const cs = getComputedStyle(first);
  return cs.position === "sticky" && Math.abs(first.getBoundingClientRect().top - parseFloat(cs.top)) < 1.5;
}

/* ---------------- Floating CTA clearance ---------------- */
// The pill and the dock float over the bottom of the page, so they rise only where nothing to read
// sits under them. An IntersectionObserver keeps the reading elements near that strip, so a check
// measures a handful of boxes instead of the whole page.

/** A motion token (--dur-N) in ms, read from :root so CSS and script timing stay one number. The
 *  built CSS may write it in seconds (".6s"). */
export function token(name: string, fallback: number) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(v);
  if (Number.isNaN(n)) return fallback;
  return v.endsWith("ms") ? n : v.endsWith("s") ? n * 1000 : n;
}

/** Reading: every element holding text, plus these. */
const GRAPHIC = "svg, canvas, img, video";
// The redesign's surfaces count as reading too: the pill never floats over a card, a sheet or a row.
const SOLID = `a, button, input, select, textarea, .card, [data-obstacle], figure, .bento-card, .outcome-figure, .how-sheet, .faq-item, .wall-tile, .orbit-tile, .area-row, .dial, ${GRAPHIC}`;
/** Clear space kept around the pill or dock. */
const AIR = 16;

type Band = { top: number; left: number; right: number };

let io: IntersectionObserver | null = null;
let ioKey = "";
let mo: MutationObserver | null = null;
/** Reading elements near the strip, and new ones whose first observation has not come in yet. */
const near = new Set<Element>();
const fresh = new Set<Element>();
const watched = new Set<Element>();
let dirty = true;
let collectedAt = -Infinity;
/** The observer stands down while the dock is down and the page moves (nothing asks it then): it
 *  watches every reading block, and the browser re-measured all of them on each scroll frame. */
let parked = false;
/** The driver's frame request: something coming into the strip at rest (a list turning over, an
 *  answer opening) gets a fresh check. */
let kick = () => {};

/** The strip the shown pill or dock takes, with its air. Null when neither shows at this width. */
function dockBand(): Band | null {
  for (const el of document.querySelectorAll<HTMLElement>("[data-dock]")) {
    if (!el.getClientRects().length) continue;
    // Its translate only moves it down while hidden, so its shown top comes from `bottom` and height.
    const r = el.getBoundingClientRect();
    const top = window.innerHeight - (parseFloat(getComputedStyle(el).bottom) || 0) - r.height;
    return { top: top - AIR, left: r.left - AIR, right: r.right + AIR };
  }
  return null;
}

/** (Re)builds the observer on the strip, reaching half a viewport below the fold for reading down. */
function observeBand(b: Band) {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const key = [b.top, b.left, b.right, vw, vh].map(Math.round).join();
  if (io && key === ioKey) return;
  io?.disconnect();
  near.clear();
  fresh.clear();
  watched.clear();
  ioKey = key;
  const margin = [-b.top, -(vw - b.right), vh / 2, -b.left].map((n) => `${Math.round(n)}px`).join(" ");
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        fresh.delete(e.target);
        if (e.isIntersecting) near.add(e.target);
        else near.delete(e.target);
      }
      if (entries.some((e) => e.isIntersecting)) kick();
    },
    { rootMargin: margin },
  );
  dirty = true;
  collectedAt = -Infinity;
  if (!mo) {
    mo = new MutationObserver(() => (dirty = true));
    const main = document.getElementById("main");
    if (main) mo.observe(main, { childList: true, subtree: true });
  }
}

/** Where a run of text is read: its paragraph, item or heading holds every inline piece inside it. */
const BLOCK = "p, li, h1, h2, h3, h4, h5, h6, dt, dd, figcaption, blockquote, label, legend, summary, td, th, pre";

/** Finds the reading elements in <main> (past the story and its fixed layers) and observes new ones. */
function collect() {
  dirty = false;
  parked = false;
  collectedAt = performance.now();
  const main = document.getElementById("main");
  if (!main || !io) return;
  const found = new Set<Element>();
  for (const root of main.children) {
    if (root.id === "story" || getComputedStyle(root).position === "fixed") continue;
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const at = n.parentElement;
      if (!n.nodeValue?.trim() || !at) continue;
      // One target per block, not one per span inside it (a third as many to measure).
      const block = at.closest(BLOCK);
      found.add(block && root.contains(block) ? block : at);
    }
    root.querySelectorAll(SOLID).forEach((el) => found.add(el));
  }
  for (const el of watched) {
    if (found.has(el)) continue;
    io.unobserve(el);
    watched.delete(el);
    near.delete(el);
    fresh.delete(el);
  }
  for (const el of found) {
    if (watched.has(el)) continue;
    io.observe(el);
    watched.add(el);
    fresh.add(el);
  }
}

/** True when something to read is under the strip, or within `ahead` px below the fold. */
function dockBlocked(ahead: number) {
  const b = dockBand();
  if (!b) return false;
  observeBand(b);
  if (parked || (dirty && performance.now() - collectedAt > 500)) collect();
  const vw = document.documentElement.clientWidth;
  const bottom = window.innerHeight + ahead;
  for (const set of [near, fresh]) {
    for (const el of set) {
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1 || r.bottom <= b.top || r.top >= bottom || r.right <= b.left || r.left >= b.right) continue;
      // A full-bleed graphic is a backdrop, not something to read.
      if (r.width >= vw * 0.9 && el.matches(GRAPHIC)) continue;
      if (el.checkVisibility?.({ visibilityProperty: true }) === false) continue;
      return true;
    }
  }
  return false;
}

/** Stops watching until the next check, which observes again (and measures the new ones directly). */
function parkBand() {
  if (!io || parked) return;
  io.disconnect();
  near.clear();
  fresh.clear();
  watched.clear();
  parked = true;
}

function releaseBand() {
  parked = false;
  io?.disconnect();
  mo?.disconnect();
  io = mo = null;
  ioKey = "";
  near.clear();
  fresh.clear();
  watched.clear();
  dirty = true;
}

/* ---------------- Driver ---------------- */

let sections = HOME_SECTIONS;
let running = false;

/** Service pages hand in their own section list. */
export const setChromeSections = (list: ChromeSection[]) => {
  sections = list;
};

/** The single driver: one rAF-throttled scroll listener plus the story subscription. SmoothScroll
 *  starts it once per page. Returns its cleanup. */
export function startChrome(list?: ChromeSection[]) {
  sections = list ?? HOME_SECTIONS;
  if (running) return () => {};
  running = true;
  let raf = 0;
  let anchorY = window.scrollY;
  let lastY = window.scrollY;
  let was = { jumping: state.jumping, menuOpen: state.menuOpen };
  // The pill and dock wait for the reader to pause this long before rising.
  const restMs = token("--dur-4", 600);
  let movedAt = -Infinity;
  let restTimer = 0;
  // The section it last rose in: once text has sent it down, it waits for the next section.
  let roseIn: string | null | undefined;

  const frame = () => {
    raf = 0;
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    const vh = window.innerHeight;
    const storyEl = document.getElementById("story");
    const inStory = !!storyEl && viewTop(storyEl) + pageBox(storyEl).height > vh * 0.5;
    // Pages without the story open on a hero with its own CTA; it holds the screen the same way.
    const hero = storyEl ? null : document.getElementById("main")?.firstElementChild;
    const inHero = !!hero && viewTop(hero) + pageBox(hero).height > vh * 0.5;
    let chapter = state.chapter;
    if (storyEl) {
      const { i, j, e } = blendAt(story.g);
      chapter = e >= 0.5 ? j : i;
    }
    const sec = inStory ? { id: null, label: "" } : detectSection(sections);
    // The pinned stages all sit below the story, so while it holds the screen none can be pinned: skip
    // the query on the story's every frame.
    const pinned = !inStory && isPinned();
    const audit = document.getElementById("audit");
    const auditTop = audit ? viewTop(audit) : Infinity;
    const auditNear = !!audit && auditTop < vh * 0.9 && auditTop + pageBox(audit).height > 0;
    const footer = document.querySelector("footer");
    const footerNear = !!footer && viewTop(footer) < vh;

    // Hide after 24px of reading down, show after 12px back up; never in the story, a pinned stage or
    // stuck stack (the floating CTA would sit on it), an open menu or a jump, and never at the very top.
    let navHidden = state.navHidden;
    if (state.jumping || state.menuOpen || inStory || pinned || isStuck() || y < 24) {
      navHidden = false;
      anchorY = y;
    } else if (navHidden) {
      if (y > anchorY) anchorY = y;
      else if (y < anchorY - 12) {
        navHidden = false;
        anchorY = y;
      }
    } else {
      if (y < anchorY) anchorY = y;
      else if (y > anchorY + 24) {
        navHidden = true;
        anchorY = y;
      }
    }

    // The floating CTA takes over from the nav, but never over something to read: it rises when the
    // reader pauses on a clear strip, once per section, and steps down as soon as text comes up under
    // it (looking further ahead the faster the page moves).
    let dock = false;
    const resting = performance.now() - movedAt >= restMs;
    if (navHidden && !inHero && !auditNear && !footerNear && !state.jumping && !state.menuOpen) {
      const held = state.dock && !!document.activeElement?.closest("[data-dock]");
      if (held) dock = true;
      else if (state.dock) dock = !dockBlocked(dy > 0 ? Math.min(Math.max(dy * 12, 24), vh / 2) : 0);
      else if (resting && sec.id !== roseIn) dock = !dockBlocked(0);
    }
    if (dock && !state.dock) roseIn = sec.id;
    // The dock stays down while the page moves: nothing reads the strip until the reader rests.
    if (!dock && !resting) parkBand();

    setChrome({
      inStory,
      chapter,
      section: sec.id,
      sectionLabel: sec.label,
      pinned,
      auditNear,
      footerNear,
      navHidden,
      scrolled: y > 48,
      dock,
    });
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  kick = schedule;
  const onScroll = () => {
    movedAt = performance.now();
    clearTimeout(restTimer);
    restTimer = window.setTimeout(schedule, restMs + 20);
    schedule();
  };
  // Content that grows or shrinks at rest (an answer opening) is checked again.
  const ro = new ResizeObserver(schedule);
  ro.observe(document.body);

  frame();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", schedule);
  const offStory = onStory(schedule);
  // A jump or the menu starting or ending re-evaluates at once.
  const offSelf = subscribeChrome(() => {
    if (state.jumping === was.jumping && state.menuOpen === was.menuOpen) return;
    was = { jumping: state.jumping, menuOpen: state.menuOpen };
    schedule();
  });

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    clearTimeout(restTimer);
    ro.disconnect();
    releaseBand();
    kick = () => {};
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", schedule);
    offStory();
    offSelf();
    setChrome({ ...INITIAL, sceneReady: state.sceneReady });
  };
}

/** For a component that wants to own the driver instead (one per page). */
export function useChromeDriver(list?: ChromeSection[]) {
  useEffect(() => startChrome(list), [list]);
}
