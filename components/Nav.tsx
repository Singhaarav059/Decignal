"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type PointerEvent, type RefObject } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { Logo } from "./ui/Logo";
import { Arrow } from "./ui/Arrow";
import { SectionLink } from "./ui/SectionLink";
import { AuditLink, plainClick } from "./CtaPill";
import { CHAPTERS, store as story, subscribe, weight } from "@/lib/story";
import { setChrome, useChrome, type ChromeSection } from "@/lib/chrome";
import { jumpTo, lockScroll, token } from "@/lib/jump";
import { AREAS } from "@/lib/areas";
import { CTA, FOOTER, NAV, STORY_PEEK } from "@/lib/copy";
import { toneVars } from "@/lib/tone";
import { darkAt } from "@/lib/on-dark";
import { TONE, goToChapter } from "./story/chapters";
import type { PeekId, SectionPeek } from "./NavPeek";

const PEEK_OF: Record<string, SectionPeek> = { applications: "apps", outcomes: "outcomes", how: "how", faq: "faq" };
/** The bar keeps the four links people look for (the audit is the CTA); the other home sections light
 *  the link of the part of the page they belong to. */
const PRIMARY = ["platform", "applications", "how", "faq"];
const LINK_OF: Record<string, string> = { systems: "platform", platform: "platform", applications: "applications", trail: "applications", outcomes: "how", how: "how", faq: "faq" };
/** Each link's colour from the palette: its hover tile takes it. */
const TONE_OF: Record<string, string> = { platform: "violet", applications: "emerald", how: "tangerine", faq: "cobalt" };
const LINKS = NAV.sections
  .filter(([id]) => PRIMARY.includes(id))
  .map(([id, label]) => ({ id, label, peek: PEEK_OF[id] as SectionPeek | undefined, tone: TONE_OF[id] ?? "cobalt" }));
const blurbOf = (id: string, peek?: SectionPeek) => NAV.blurbs[(peek ?? id) as keyof typeof NAV.blurbs] ?? "";

const pad = (n: number) => String(n).padStart(2, "0");
const chapterTone = (i: number) => TONE[i] || "ink";
const fine = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const wide = () => window.matchMedia("(min-width: 1024px)").matches;
const onWide = (fn: () => void) => {
  const m = window.matchMedia("(min-width: 1024px)");
  m.addEventListener("change", fn);
  return () => m.removeEventListener("change", fn);
};
/** The glances open on wide screens only, so narrower ones never build them. False on the server and
 *  through hydration: the page ships without them (about a thousand elements, half the HTML of a short
 *  page) and wide screens mount them right after. */
const useWide = () => useSyncExternalStore(onWide, wide, () => false);

/** The glances re-render only when their own props change: the bar re-renders on every chapter and
 *  section change, and rebuilding five panels of drawings each time cost a phone dropped frames. Their
 *  code is its own chunk, fetched only by a wide screen; they open on hover, never at first paint. */
const Peek = memo(dynamic(() => import("./NavPeek").then((m) => m.NavPeek), { ssr: false }));

/** One value derived from the story position, re-rendering only when it changes. */
function useStoryValue<T>(select: (g: number) => T, fallback: T): T {
  return useSyncExternalStore(subscribe, () => select(story.g), () => fallback);
}

/** Hover intent: a short wait before the first preview opens, none when moving between links, and a
 *  grace period on leaving so the pointer can travel down into the panel. */
function usePeek() {
  const [peek, setPeek] = useState<PeekId | null>(null);
  const timer = useRef(0);
  const current = useRef<PeekId | null>(null);
  const set = useCallback((id: PeekId | null) => {
    current.current = id;
    setPeek(id);
  }, []);
  const open = useCallback((id: PeekId) => {
    window.clearTimeout(timer.current);
    if (current.current) set(id);
    else timer.current = window.setTimeout(() => set(id), 90);
  }, [set]);
  const close = useCallback((now = false) => {
    window.clearTimeout(timer.current);
    if (now) set(null);
    else timer.current = window.setTimeout(() => set(null), 220);
  }, [set]);
  const hold = useCallback(() => window.clearTimeout(timer.current), []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { peek, open, close, hold };
}

/** The caret under the chapter list points at the readout's progress ring. */
const ringX = (el: HTMLElement) => {
  const r = (el.querySelector(".nav-ring") ?? el).getBoundingClientRect();
  return r.left + r.width / 2;
};

/** Focus the first control in an open glance. */
const focusPeek = (id: PeekId) =>
  window.setTimeout(() => document.querySelector<HTMLElement>(`#peek-${id} :is(a[href], button)`)?.focus(), 140);

/** The four primary links as plain text in one glass pill. A tile glides to the hovered link and rests on
 *  the part of the page being read; the label under the pointer leans toward it (magnetic). Hovering (or
 *  ArrowDown) opens a glance of that section below the bar. */
function NavLinks({
  hrefFor,
  active,
  peek,
  onPeek,
  onLeave,
  onBox,
  onDone,
}: {
  hrefFor: (id: string) => string;
  active: string | null;
  peek: PeekId | null;
  onPeek: (id: PeekId) => void;
  onLeave: () => void;
  onBox: (x: number) => void;
  onDone: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const [hover, setHover] = useState(-1);
  const [box, setBox] = useState({ x: 0, w: 0, ready: false });
  const current = LINKS.findIndex((l) => l.id === (active ? LINK_OF[active] : null));
  const open = peek ? LINKS.findIndex((l) => l.peek === peek) : -1;
  const lit = hover >= 0 ? hover : open >= 0 ? open : current;

  useLayoutEffect(() => {
    const b = root.current?.querySelectorAll<HTMLElement>("a")[lit];
    if (!b) return;
    setBox((p) => ({ x: b.offsetLeft, w: b.offsetWidth, ready: p.ready || p.w > 0 }));
    const nav = root.current!.getBoundingClientRect();
    onBox(nav.left + b.offsetLeft + b.offsetWidth / 2);
  }, [lit, onBox]);

  return (
    <nav
      ref={root}
      className="nav-links hidden lg:flex"
      data-lens
      aria-label="Primary"
      onPointerLeave={() => {
        setHover(-1);
        onLeave();
      }}
    >
      <span
        className="nav-links-hl"
        data-show={lit >= 0 || undefined}
        data-glide={box.ready || undefined}
        style={{ transform: `translateX(${box.x}px)`, width: box.w, ...toneVars(LINKS[lit]?.tone) }}
        aria-hidden
      />
      {LINKS.map(({ id, label, peek: pid, tone }, i) => (
        <SectionLink
          key={id}
          href={hrefFor(id)}
          data-peek-link={pid}
          style={{ ["--i" as string]: i, ...toneVars(tone) }}
          onDone={onDone}
          onPointerEnter={(e: PointerEvent) => {
            if (e.pointerType !== "mouse" || !fine()) return;
            setHover(i);
            // Sections without a glance close any glance that is open.
            if (pid) onPeek(pid);
            else onLeave();
          }}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(-1)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowDown" || !pid) return;
            e.preventDefault();
            onPeek(pid);
            focusPeek(pid);
          }}
          onPointerMove={(e: PointerEvent<HTMLAnchorElement>) => {
            if (e.pointerType !== "mouse") return;
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width - 0.5) * 6).toFixed(2)}px`);
            e.currentTarget.style.setProperty("--my", `${(((e.clientY - r.top) / r.height - 0.5) * 4).toFixed(2)}px`);
          }}
          onPointerLeave={(e: PointerEvent<HTMLAnchorElement>) => {
            e.currentTarget.style.removeProperty("--mx");
            e.currentTarget.style.removeProperty("--my");
          }}
          aria-current={i === current ? "location" : undefined}
          aria-keyshortcuts={pid ? "ArrowDown" : undefined}
        >
          <span className="nav-dock-label">{label}</span>
        </SectionLink>
      ))}
    </nav>
  );
}

/** Where the reader is, beside the logo. In the story a ring fills with progress and the readout opens
 *  the chapter list (the glance at 1024px and up, the menu below). Past the story it names the section
 *  where the links are hidden (640 to 1023px). The number and name roll when they change. */
function Readout({
  show,
  mode,
  chapter,
  sectionLabel,
  expanded,
  onPeek,
  onLeave,
  onOpen,
}: {
  show: boolean;
  mode: "story" | "section";
  chapter: number;
  sectionLabel: string;
  expanded: boolean;
  onPeek: (e: PointerEvent) => void;
  onLeave: () => void;
  onOpen: (e: MouseEvent) => void;
}) {
  const ring = useRef<SVGCircleElement>(null);
  const isStory = mode === "story";
  useEffect(() => {
    if (!isStory) return;
    return subscribe((g) => {
      ring.current?.style.setProperty("stroke-dashoffset", String(1 - Math.min(Math.max(g / (CHAPTERS.length - 1), 0), 1)));
    });
  }, [isStory]);

  if (!isStory) {
    return (
      <span className="nav-readout t-label" data-mode="section" data-show={(show && !!sectionLabel) || undefined}>
        <span className="nav-readout-rule" aria-hidden />
        <span key={sectionLabel} className="nav-roll">
          {sectionLabel}
        </span>
      </span>
    );
  }
  const n = pad(chapter + 1);
  return (
    <button
      type="button"
      className="nav-readout t-label"
      data-mode="story"
      data-show={show || undefined}
      style={toneVars(chapterTone(chapter))}
      onPointerEnter={onPeek}
      onPointerLeave={onLeave}
      onClick={onOpen}
      aria-expanded={expanded}
      aria-label={`Chapter ${n}, ${CHAPTERS[chapter].label}. Show all chapters`}
      tabIndex={show ? 0 : -1}
    >
      <span className="nav-readout-rule" aria-hidden />
      <svg className="nav-ring" viewBox="0 0 20 20" aria-hidden>
        <circle cx="10" cy="10" r="7.5" className="nav-ring-track" />
        <circle ref={ring} cx="10" cy="10" r="7.5" pathLength={1} className="nav-ring-fill" />
      </svg>
      <span key={`n${chapter}`} className="nav-roll nav-readout-n tabular">
        {n}
      </span>
      <span key={`l${chapter}`} className="nav-roll nav-readout-label">
        {CHAPTERS[chapter].label}
      </span>
      <svg className="nav-readout-caret" viewBox="0 0 12 12" aria-hidden>
        <path d="M3 4.5 6 7.5 9 4.5" />
      </svg>
    </button>
  );
}

/**
 * The site header. variant "home" carries the story readout and its chapter glance; "page" (service
 * pages) is the same bar whose links reach home sections through /#id. Reads where the reader is from
 * the shared chrome store (lib/chrome.ts); it adds no scroll listener of its own.
 */
export function Nav({ variant = "home", sections }: { variant?: "home" | "page"; sections?: ChromeSection[] }) {
  const home = variant === "home";
  const path = usePathname();
  const navHidden = useChrome((s) => s.navHidden);
  const inStory = useChrome((s) => s.inStory);
  const chapter = useChrome((s) => s.chapter);
  const section = useChrome((s) => s.section);
  const sectionLabel = useChrome((s) => s.sectionLabel);
  const compact = useChrome((s) => s.scrolled);
  const [open, setOpen] = useState(false);
  const [caret, setCaret] = useState(0);
  const { peek, open: openPeek, close: closePeek, hold } = usePeek();
  const shell = useRef<HTMLElement>(null);

  // Liquid glass over dark sections: the bar darkens and its type turns white (and back). Checked a few
  // times a second while scrolling, at the bar's middle and at the floating CTA's.
  useEffect(() => {
    const el = shell.current;
    if (!el) return;
    let t = 0;
    let last = 0;
    const check = () => {
      t = 0;
      last = performance.now();
      const bar = el.querySelector(".nav-pill")?.getBoundingClientRect();
      if (bar) el.toggleAttribute("data-dark", darkAt(window.innerWidth / 2, bar.top + bar.height / 2, [el]));
      // The floating CTA is not drawn below 1024px (the dock carries it): no hit test for it there.
      const pill = document.querySelector<HTMLElement>(".cta-pill");
      if (pill?.offsetWidth) {
        const r = pill.getBoundingClientRect();
        pill.toggleAttribute("data-dark", darkAt(r.left + r.width / 2, r.top + r.height / 2, [pill, el]));
      }
    };
    const kick = () => {
      if (t) return;
      t = window.setTimeout(check, Math.max(0, 90 - (performance.now() - last)));
    };
    check();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
    };
  }, []);
  const burger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const storyMode = home && inStory;
  // One solid CTA on screen: the nav's goes quiet in the hero (its card holds one) and while the audit
  // form or the footer, each with its own, is in view.
  const heroQuiet = useStoryValue((g) => weight(0, g) > 0.6, true) && storyMode;
  const endQuiet = useChrome((s) => !s.inStory && (s.auditNear || s.footerNear));
  const hidden = navHidden && !open;

  const hrefFor = useCallback(
    (id: string) => (home || sections?.some((s) => s.id === id) ? `#${id}` : `/#${id}`),
    [home, sections],
  );

  // Pages without the loader are ready at once (the bar fades in on html.ready).
  useEffect(() => {
    if (!home) document.documentElement.classList.add("ready");
  }, [home]);

  // A glance closes on Escape (focus back on its link), on a press outside the nav, or once the page
  // has moved on under it.
  useEffect(() => {
    if (!peek) return;
    const y0 = window.scrollY;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closePeek(true);
      document.querySelector<HTMLElement>(peek === "story" ? ".nav-readout[data-mode=story]" : `[data-peek-link="${peek}"]`)?.focus();
    };
    const onDown = (e: globalThis.PointerEvent) => !(e.target as Element).closest(".nav-shell") && closePeek(true);
    const onScroll = () => Math.abs(window.scrollY - y0) > 60 && closePeek(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [peek, closePeek]);

  useEffect(() => {
    if (hidden) closePeek(true);
  }, [hidden, closePeek]);

  // The menu is a modal dialog: the page behind is inert and still, Tab stays between the menu and the
  // close button, Escape or a desktop-width resize closes it, and focus returns to the burger.
  useEffect(() => {
    setChrome({ menuOpen: open });
    if (!open) return;
    lockScroll(true);
    const box = menu.current;
    const back = burger.current;
    const keep = [shell.current, box];
    const made: Element[] = [];
    for (const el of Array.from(document.body.children)) {
      if (el.hasAttribute("inert") || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) || keep.some((k) => k && el.contains(k))) continue;
      el.setAttribute("inert", "");
      made.push(el);
    }
    const first = box?.querySelector<HTMLElement>("a[href], button");
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setOpen(false);
      if (e.key !== "Tab") return;
      const list = [back, ...Array.from(box?.querySelectorAll<HTMLElement>("a[href], button") ?? [])].filter(
        (el): el is HTMLElement => !!el && el.offsetParent !== null,
      );
      const at = list.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      list[(at + (e.shiftKey ? -1 : 1) + list.length) % list.length]?.focus();
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onWide = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
      made.forEach((el) => el.removeAttribute("inert"));
      lockScroll(false);
      if (box?.contains(document.activeElement) || document.activeElement === document.body) back?.focus({ preventScroll: true });
    };
  }, [open]);
  useEffect(() => () => setChrome({ menuOpen: false }), []);

  // The live story percentage in the menu.
  const pct = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open || !home) return;
    return subscribe((g) => {
      if (pct.current) pct.current.textContent = `${Math.round(Math.min(Math.max(g / (CHAPTERS.length - 1), 0), 1) * 100)}%`;
    });
  }, [open, home]);

  const closeAll = useCallback(() => {
    setOpen(false);
    closePeek(true);
  }, [closePeek]);
  const closeSoon = useCallback(() => closePeek(), [closePeek]);
  const closeNow = useCallback(() => closePeek(true), [closePeek]);
  // Let the menu start closing before the story moves.
  const toChapter = useCallback(
    (i: number) => {
      closeAll();
      window.setTimeout(() => goToChapter(i), open ? token("--dur-3", 320) : 0);
    },
    [closeAll, open],
  );
  const onMenuLink = useCallback(() => setOpen(false), []);
  const wideScreen = useWide();

  const onBox = useCallback((x: number) => setCaret(x), []);

  return (
    <>
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          if (!plainClick(e)) return;
          e.preventDefault();
          // Home: past the story to the first editorial heading. Other pages: the main landmark.
          const editorial = home ? document.querySelector<HTMLElement>(".editorial") : null;
          const heading = editorial?.querySelector<HTMLElement>("h2");
          void jumpTo(editorial ?? "#main", { focus: heading ?? true });
        }}
      >
        Skip to content
      </a>
      <header
        ref={shell}
        className="nav-shell"
        data-hidden={hidden || undefined}
        onFocusCapture={() => navHidden && setChrome({ navHidden: false })}
      >
        <div
          data-compact={compact && !open ? "" : undefined}
          data-solid={!storyMode || open || compact ? "" : undefined}
          data-peek={peek ? "" : undefined}
          data-mini={compact && storyMode && !open ? "" : undefined}
          className="nav-pill relative flex items-center justify-between gap-3 rounded-full"
        >
          <span className="nav-surface" aria-hidden data-lens />

          <div className="nav-brand relative flex min-w-0 items-center gap-1" data-lens>
            <button
              ref={burger}
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="nav-burger flex size-11 flex-none items-center justify-center rounded-full lg:hidden"
              aria-expanded={open}
              aria-controls="menu"
              aria-label={open ? NAV.menuClose : NAV.menuOpen}
            >
              <span className="relative block h-2.5 w-5" aria-hidden>
                <span className="nav-burger-bar" style={{ transform: open ? "translateY(4.5px) rotate(45deg)" : "none" }} />
                <span className="nav-burger-bar nav-burger-bar-2" style={{ transform: open ? "translateY(-4.5px) rotate(-45deg)" : "none" }} />
              </span>
            </button>
            <Link
              href="/"
              aria-label={NAV.logoAria}
              className="nav-logo flex items-center rounded-full"
              onClick={(e) => {
                setOpen(false);
                if (!home || !plainClick(e)) return;
                e.preventDefault();
                void jumpTo(0, { focus: false });
              }}
            >
              <Logo size={22} />
            </Link>
            {home ? (
              <Readout
                show={compact && !open}
                mode={inStory ? "story" : "section"}
                chapter={chapter}
                sectionLabel={sectionLabel}
                expanded={peek === "story"}
                onPeek={(e) => {
                  if (e.pointerType !== "mouse" || !fine() || !wide()) return;
                  setCaret(ringX(e.currentTarget as HTMLElement));
                  openPeek("story");
                }}
                onLeave={() => closePeek()}
                onOpen={(e) => {
                  // Below 1024px the chapter list lives in the menu.
                  if (!wide()) return setOpen(true);
                  if (peek === "story") return closePeek(true);
                  setCaret(ringX(e.currentTarget as HTMLElement));
                  openPeek("story");
                  if (e.detail === 0) focusPeek("story");
                }}
              />
            ) : (
              <span className="nav-readout t-label" data-mode="section" data-show={(compact && !open && !!sectionLabel) || undefined}>
                <span className="nav-readout-rule" aria-hidden />
                <span key={sectionLabel} className="nav-roll">
                  {sectionLabel}
                </span>
              </span>
            )}
          </div>

          <NavLinks
            hrefFor={hrefFor}
            active={section}
            peek={peek}
            onPeek={openPeek}
            onLeave={() => closePeek()}
            onBox={onBox}
            onDone={() => closePeek(true)}
          />

          {/* Named by its visible text (the short form on phones), so speech input can say what it sees. */}
          <AuditLink className="nav-cta relative" onDone={closeAll} data-quiet={heroQuiet || endQuiet || undefined}>
            <span className="hidden sm:inline">{CTA.primary}</span>
            <span className="sm:hidden">{CTA.compact}</span>
            <span className="nav-cta-icon" aria-hidden>
              <ArrowUpRight size={15} strokeWidth={2.4} />
            </span>
          </AuditLink>
        </div>

        {wideScreen && <Peek variant={variant} hrefFor={hrefFor} peek={peek} caret={caret} onEnter={hold} onLeave={closeSoon} onDone={closeNow} />}
      </header>

      {/* Phone and tablet menu: a dialog on the page grid. */}
      <NavMenu
        menuRef={menu}
        pctRef={pct}
        open={open}
        home={home}
        path={path}
        here={storyMode ? chapter : -1}
        link={!inStory && section ? LINK_OF[section] : undefined}
        hrefFor={hrefFor}
        toChapter={toChapter}
        closeAll={closeAll}
        onLink={onMenuLink}
      />
    </>
  );
}

/** The phone and tablet menu. Memoised: it re-renders when what it shows changes (open, the current
 *  chapter or section), not on every change the bar itself follows. */
const NavMenu = memo(function NavMenu({
  menuRef,
  pctRef,
  open,
  home,
  path,
  here,
  link,
  hrefFor,
  toChapter,
  closeAll,
  onLink,
}: {
  menuRef: RefObject<HTMLDivElement | null>;
  pctRef: RefObject<HTMLSpanElement | null>;
  open: boolean;
  home: boolean;
  path: string;
  here: number;
  link: string | undefined;
  hrefFor: (id: string) => string;
  toChapter: (i: number) => void;
  closeAll: () => void;
  onLink: () => void;
}) {
  return (
    <div
      id="menu"
      ref={menuRef}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="nav-menu lg:hidden"
      data-open={open || undefined}
      data-lenis-prevent
      inert={!open}
    >
      <div className="nav-menu-body">
        {home && (
          <section className="nav-menu-group" aria-labelledby="menu-story" style={{ ["--i" as string]: 0 }}>
            <p className="nav-menu-head t-label">
              <span id="menu-story">{STORY_PEEK.title}</span>
              <span ref={pctRef} className="tabular">
                0%
              </span>
            </p>
            <ol className="nav-menu-chapters">
              {CHAPTERS.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toChapter(i)}
                    aria-current={i === here ? "step" : undefined}
                    aria-label={`Chapter ${i + 1}: ${c.label}. ${STORY_PEEK.chapters[i]}`}
                    style={toneVars(chapterTone(i))}
                  >
                    <span className="nav-menu-n tabular">{pad(i + 1)}</span>
                    {c.label}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}
        <section className="nav-menu-group" aria-labelledby="menu-sections" style={{ ["--i" as string]: 1 }}>
          <p id="menu-sections" className="nav-menu-head t-label">
            {FOOTER.navTitle}
          </p>
          <ul className="nav-menu-links">
            {LINKS.map(({ id, label, peek: pid }, i) => (
              <li key={id}>
                <SectionLink href={hrefFor(id)} className="nav-menu-link" onDone={closeAll} aria-current={link === id ? "location" : undefined}>
                  <span>
                    <span className="t-title-card block">{label}</span>
                    <span className="t-small mt-1 block text-ink-soft">{blurbOf(id, pid)}</span>
                  </span>
                  <span className="nav-menu-n tabular">{pad(i + 1)}</span>
                </SectionLink>
              </li>
            ))}
          </ul>
        </section>
        <section className="nav-menu-group" aria-labelledby="menu-areas" style={{ ["--i" as string]: 2 }}>
          <p id="menu-areas" className="nav-menu-head t-label">
            {FOOTER.areasTitle}
          </p>
          <ul className="nav-menu-areas">
            {AREAS.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/solutions/${a.slug}`}
                  className="nav-menu-area"
                  style={toneVars(a.tone)}
                  aria-current={path === `/solutions/${a.slug}` ? "page" : undefined}
                  onClick={onLink}
                >
                  <i aria-hidden />
                  <span>{a.name}</span>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="nav-menu-cta">
        <AuditLink className="btn btn-primary" onDone={closeAll}>
          {CTA.primary}
          <Arrow />
        </AuditLink>
      </div>
    </div>
  );
});
