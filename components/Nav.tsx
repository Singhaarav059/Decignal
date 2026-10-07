"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getLenis, scrollToTarget } from "./SmoothScroll";
import { Logo } from "./ui/Logo";
import { Arrow } from "./ui/Arrow";
import { ArrowUpRight } from "lucide-react";
import { CHAPTERS, blendAt, store, subscribe } from "@/lib/story";
import { toneVar } from "./story/chapters";
import { NavPeek, PEEKS, type PeekId } from "./NavPeek";

const SECTIONS = [
  ["applications", "Applications"],
  ["outcomes", "Outcomes"],
  ["how", "How it works"],
  ["faq", "Questions"],
  ["audit", "Free audit"],
] as const;

const LINKS = [
  ["Applications", "#applications", "apps"],
  ["Outcomes", "#outcomes", "outcomes"],
  ["How it works", "#how", "how"],
  ["Questions", "#faq", "faq"],
] as const;

/** Each link keeps its section's colour. */
const LINK_TONES = ["cobalt", "emerald", "violet", "tangerine"];

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

const fine = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/** Primary links sit straight on the bar. A lit pill glides to the hovered link and rests on the
 *  section being read; hovering opens a glance of that section below the bar. */
function NavLinks({
  go,
  peek,
  onPeek,
  onLeave,
  onBox,
}: {
  go: (href: string) => void;
  peek: PeekId | null;
  onPeek: (id: PeekId) => void;
  onLeave: () => void;
  onBox: (x: number) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(-1);
  const [hover, setHover] = useState(-1);
  const [box, setBox] = useState({ x: 0, w: 0, ready: false });
  useEffect(() => {
    const on = () => {
      const vh = window.innerHeight;
      let found = -1;
      LINKS.forEach(([, href], i) => {
        const el = document.querySelector(href);
        if (el && el.getBoundingClientRect().top < vh * 0.45) found = i;
      });
      const audit = document.getElementById("audit");
      if (audit && audit.getBoundingClientRect().top < vh * 0.45) found = -1;
      setActive(found);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const open = peek ? LINKS.findIndex((l) => l[2] === peek) : -1;
  const lit = hover >= 0 ? hover : open >= 0 ? open : active;
  useLayoutEffect(() => {
    const b = root.current?.querySelectorAll<HTMLElement>("button")[lit];
    if (b) {
      setBox((p) => ({ x: b.offsetLeft, w: b.offsetWidth, ready: p.ready || p.w > 0 }));
      const nav = root.current!.getBoundingClientRect();
      onBox(nav.left + b.offsetLeft + b.offsetWidth / 2);
    }
  }, [lit, onBox]);

  return (
    <nav
      ref={root}
      className="nav-links hidden lg:flex"
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
        style={{ transform: `translateX(${box.x}px)`, width: box.w, ["--tone" as string]: lit >= 0 ? `var(--color-${LINK_TONES[lit]})` : undefined }}
        aria-hidden
      />
      {LINKS.map(([label, href, id], i) => (
        <button
          key={href}
          style={{ ["--tone" as string]: `var(--color-${LINK_TONES[i]})`, ["--i" as string]: i }}
          onClick={() => go(href)}
          onPointerEnter={(e) => {
            if (e.pointerType !== "mouse" || !fine()) return;
            setHover(i);
            onPeek(id);
          }}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(-1)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowDown") return;
            e.preventDefault();
            onPeek(id);
            window.setTimeout(() => document.querySelector<HTMLElement>(`#peek-${id} button`)?.focus(), 140);
          }}
          aria-current={i === active ? "true" : undefined}
          aria-expanded={peek === id}
          aria-controls={`peek-${id}`}
        >
          <i aria-hidden />
          {label}
        </button>
      ))}
    </nav>
  );
}

export function Nav() {
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [compact, setCompact] = useState(false);
  const [inStory, setInStory] = useState(true);
  const [open, setOpen] = useState(false);
  const [caret, setCaret] = useState(0);
  const { peek, open: openPeek, close: closePeek, hold } = usePeek();
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const story = document.getElementById("story");
    let lastY = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      const past = !!story && y > story.offsetHeight - window.innerHeight * 0.5;
      const application = document.querySelector(".application-journey")?.getBoundingClientRect();
      const readingApplication = !!application && application.top < 80 && application.bottom >= window.innerHeight;
      setSolid(past);
      setInStory(!past);
      setCompact(y > 48);
      // Past the story the nav steps aside while reading down, and returns on the way up.
      if (Math.abs(y - lastY) > 6) {
        setHidden(past && y > lastY && !readingApplication);
        lastY = y;
      }
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // A glance closes on Escape, on a press outside the nav, or once the page has moved on under it.
  useEffect(() => {
    if (!peek) return;
    const y0 = window.scrollY;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closePeek(true);
      document.querySelector<HTMLElement>(`[aria-controls="peek-${peek}"]`)?.focus();
    };
    const onDown = (e: PointerEvent) => !(e.target as Element).closest(".nav-shell") && closePeek(true);
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

  useEffect(() => {
    const l = getLenis();
    if (open) l?.stop();
    else l?.start();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (href: string | number) => {
    setOpen(false);
    closePeek(true);
    // Let the menu start closing before the page moves.
    setTimeout(() => scrollToTarget(href), open ? 260 : 0);
  };

  const onBox = useCallback((x: number) => setCaret(x), []);

  return (
    <>
      <header
        className="nav-shell fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-[var(--ease-out-expo)]"
        style={{ transform: hidden && !open ? "translateY(-110%)" : "none" }}
      >
        <div
          ref={bar}
          data-compact={compact && !open ? "" : undefined}
          data-solid={solid || open || compact ? "" : undefined}
          data-peek={peek ? "" : undefined}
          className="nav-pill relative mx-3 mt-3 flex h-14 items-center justify-between gap-3 rounded-full pr-2 pl-3 md:mx-5 md:pl-5"
        >
          {/* Light layer: the bar's glass, and a sweep of the section's colour each time the reader moves on. */}
          <span className="nav-glass" aria-hidden />
          <Sweep />

          <div className="relative flex min-w-0 items-center gap-1">
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex size-10 items-center justify-center rounded-full lg:hidden"
              aria-expanded={open}
              aria-controls="menu"
            >
              <span className="relative block h-2.5 w-5" aria-hidden>
                <span
                  className="absolute inset-x-0 top-0 h-[1.5px] bg-ink transition-transform duration-500 ease-[var(--ease-out-expo)]"
                  style={{ transform: open ? "translateY(4.5px) rotate(45deg)" : "none" }}
                />
                <span
                  className="absolute inset-x-0 bottom-0 h-[1.5px] bg-ink transition-transform duration-500 ease-[var(--ease-out-expo)]"
                  style={{ transform: open ? "translateY(-4.5px) rotate(-45deg)" : "none" }}
                />
              </span>
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            </button>
            <button onClick={() => go(0)} aria-label="Decignal, back to top" className="nav-logo flex items-center">
              <Logo size={22} />
            </button>
            <Readout
              show={compact && !open}
              inStory={inStory}
              expanded={peek === "story"}
              onPeek={(e) => {
                if (e.pointerType !== "mouse" || !fine()) return;
                setCaret(ringX(e.currentTarget as HTMLElement));
                openPeek("story");
              }}
              onLeave={() => closePeek()}
              onClick={(e) => {
                if (peek === "story") return closePeek(true);
                setCaret(ringX(e.currentTarget as HTMLElement));
                openPeek("story");
              }}
            />
          </div>

          <NavLinks go={go} peek={peek} onPeek={openPeek} onLeave={() => closePeek()} onBox={onBox} />

          <button onClick={() => go("#audit")} className="nav-cta relative">
            <span className="hidden sm:inline">Book a free AI audit</span>
            <span className="sm:hidden">Audit</span>
            <span className="nav-cta-icon" aria-hidden><ArrowUpRight size={15} strokeWidth={2.4} /></span>
          </button>
        </div>

        <NavPeek
          peek={peek}
          caret={caret}
          onEnter={hold}
          onLeave={() => closePeek()}
          onDone={() => closePeek(true)}
        />
      </header>

      {/* Mobile and tablet menu */}
      <div
        id="menu"
        className="fixed inset-0 z-40 flex flex-col justify-end bg-bg px-6 pb-10 lg:hidden"
        style={{
          clipPath: open ? "inset(0 0 0 0)" : "inset(0 0 100% 0)",
          transition: "clip-path 700ms var(--ease-in-out-quart), visibility 700ms",
          visibility: open ? "visible" : "hidden",
        }}
        aria-hidden={!open}
      >
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: "var(--spectrum)" }} aria-hidden />
        <ul>
          {LINKS.map(([label, href, id], i) => (
            <li key={href} className="line-mask border-b border-line">
              <button
                onClick={() => go(href)}
                className="menu-link flex w-full items-center justify-between gap-4 py-4 text-left"
                style={{
                  transform: open ? "none" : "translateY(110%)",
                  transition: `transform 900ms var(--ease-out-expo) ${open ? 200 + i * 70 : 0}ms`,
                  ["--tone" as string]: `var(--color-${LINK_TONES[i]})`,
                }}
                tabIndex={open ? 0 : -1}
              >
                <span>
                  <span className="display block text-[clamp(40px,10vw,84px)]">{label}</span>
                  <span className="mt-1 block text-[14px] text-ink-soft">{PEEKS[id].blurb}</span>
                </span>
                <span className="menu-link-n eyebrow tabular">0{i + 1}</span>
              </button>
            </li>
          ))}
        </ul>
        <button onClick={() => go("#audit")} className="btn btn-primary mt-10 self-start" tabIndex={open ? 0 : -1}>
          Book a free AI audit
          <Arrow />
        </button>
      </div>
    </>
  );
}

/** A band of the current section's colour runs once across the bar when the reader enters a new
 *  chapter or section. */
function Sweep() {
  const [s, setS] = useState({ key: 0, tone: "" });
  useEffect(() => {
    let last = "";
    const update = () => {
      const w = where();
      const k = w.n + w.label;
      if (!w.label || k === last) return;
      const first = last === "";
      last = k;
      if (!first) setS((p) => ({ key: p.key + 1, tone: w.tone }));
    };
    const off = subscribe(update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      off();
      window.removeEventListener("scroll", update);
    };
  }, []);
  return (
    <span className="nav-fx" aria-hidden>
      {s.key > 0 && <span key={s.key} className="nav-sweep" style={{ ["--tone" as string]: s.tone }} />}
    </span>
  );
}

/** Where the reader is: chapter number and name in the story, then the section name below it. */
function where(): { n: string; label: string; tone: string; i: number } {
  const story = document.getElementById("story");
  const vh = window.innerHeight;
  if (story && story.getBoundingClientRect().bottom > vh * 0.5) {
    const { i, j, e } = blendAt(store.g);
    const idx = e < 0.5 ? i : j;
    return { n: String(idx + 1).padStart(2, "0"), label: CHAPTERS[idx].label, tone: toneVar(idx), i: idx };
  }
  let found: (typeof SECTIONS)[number] | null = null;
  const tones: Record<string, string> = { applications: "cobalt", outcomes: "emerald", how: "violet", faq: "tangerine", audit: "cobalt" };
  for (const s of SECTIONS) {
    const el = document.getElementById(s[0]);
    if (el && el.getBoundingClientRect().top < vh * 0.4) found = s;
  }
  return { n: "", label: found ? found[1] : "", tone: found ? `var(--color-${tones[found[0]]})` : "var(--color-ink)", i: CHAPTERS.length };
}

/** Chapter readout beside the logo. In the story a ring fills with the reader's progress and the
 *  readout opens the chapter list; past it, it names the section. The number rolls when it changes. */
function Readout({
  show,
  inStory,
  expanded,
  onPeek,
  onLeave,
  onClick,
}: {
  show: boolean;
  inStory: boolean;
  expanded: boolean;
  onPeek: (e: React.PointerEvent) => void;
  onLeave: () => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  const [state, setState] = useState({ n: "01", label: CHAPTERS[0].label, tone: "var(--color-ink)", key: 0 });
  const ring = useRef<SVGCircleElement>(null);
  useEffect(() => {
    let lastKey = "";
    const update = () => {
      const w = where();
      const key = w.n + w.label;
      if (key !== lastKey) {
        lastKey = key;
        setState((s) => ({ n: w.n, label: w.label, tone: w.tone, key: s.key + 1 }));
      }
    };
    const off = subscribe((g) => {
      update();
      ring.current?.style.setProperty("stroke-dashoffset", String(1 - Math.min(Math.max(g / (CHAPTERS.length - 1), 0), 1)));
    });
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      off();
      window.removeEventListener("scroll", update);
    };
  }, []);
  const story = inStory && !!state.n;
  const inner = (
    <>
      <span className="h-3 w-px bg-line-strong" aria-hidden />
      {story && (
        <svg className="nav-ring" viewBox="0 0 20 20" aria-hidden style={{ color: state.tone }}>
          <circle cx="10" cy="10" r="7.5" className="nav-ring-track" />
          <circle ref={ring} cx="10" cy="10" r="7.5" pathLength={1} className="nav-ring-fill" />
        </svg>
      )}
      {state.n && (
        <span key={`n${state.key}`} className="nav-roll" style={{ color: state.tone }}>
          {state.n}
        </span>
      )}
      <span key={`l${state.key}`} className="nav-roll text-ink-2">
        {state.label}
      </span>
      {story && (
        <svg className="nav-readout-caret" viewBox="0 0 12 12" aria-hidden>
          <path d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      )}
    </>
  );
  return story ? (
    <button
      className="nav-readout eyebrow tabular hidden items-center gap-2 overflow-hidden whitespace-nowrap sm:inline-flex"
      data-show={show && state.label ? "" : undefined}
      onPointerEnter={onPeek}
      onPointerLeave={onLeave}
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls="peek-story"
      aria-label={`Chapter ${state.n}, ${state.label}. Show all chapters`}
      tabIndex={show ? 0 : -1}
    >
      {inner}
    </button>
  ) : (
    <span
      className="nav-readout eyebrow tabular hidden items-center gap-2 overflow-hidden whitespace-nowrap sm:inline-flex"
      data-show={show && state.label ? "" : undefined}
      aria-live="polite"
    >
      {inner}
    </span>
  );
}

