"use client";

import { useEffect, useRef, useState } from "react";
import { getLenis, scrollToTarget } from "./SmoothScroll";
import { Logo } from "./ui/Logo";
import { Arrow } from "./ui/Arrow";
import { ArrowUpRight } from "lucide-react";
import { CHAPTERS, blendAt, store, subscribe } from "@/lib/story";
import { goToChapter, toneVar } from "./story/chapters";

const SECTIONS = [
  ["applications", "Applications"],
  ["outcomes", "Outcomes"],
  ["how", "How it works"],
  ["faq", "Questions"],
  ["audit", "Free audit"],
] as const;

const LINKS = [
  ["Applications", "#applications"],
  ["Outcomes", "#outcomes"],
  ["How it works", "#how"],
  ["Questions", "#faq"],
] as const;

/** Each link keeps its section's colour. */
const LINK_TONES = ["cobalt", "emerald", "violet", "tangerine"];

/** Primary links in an inner pill; a white highlight slides to the section being read. */
function NavLinks({ go }: { go: (href: string) => void }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(-1);
  const [box, setBox] = useState({ x: 0, w: 0 });
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
  useEffect(() => {
    const b = root.current?.querySelectorAll<HTMLElement>("button")[active];
    if (b) setBox({ x: b.offsetLeft, w: b.offsetWidth });
  }, [active]);
  return (
    <nav ref={root} className="nav-links hidden lg:flex" aria-label="Primary">
      <span className="nav-links-hl" data-show={active >= 0 || undefined} style={{ transform: `translateX(${box.x}px)`, width: box.w }} aria-hidden />
      {LINKS.map(([label, href], i) => (
        <button key={href} onClick={() => go(href)} aria-current={i === active ? "true" : undefined} style={{ ["--tone" as string]: `var(--color-${LINK_TONES[i]})` }}>
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const story = document.getElementById("story");
    let lastY = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      const past = !!story && y > story.offsetHeight - window.innerHeight * 0.5;
      const application = document.querySelector('.application-journey')?.getBoundingClientRect();
      const readingApplication = !!application && application.top < 80 && application.bottom >= window.innerHeight;
      setSolid(past);
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
    // Let the menu start closing before the page moves.
    setTimeout(() => scrollToTarget(href), open ? 260 : 0);
  };

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-[var(--ease-out-expo)]"
        style={{ transform: hidden && !open ? "translateY(-110%)" : "none" }}
      >
        <div
          data-compact={compact && !open ? "" : undefined}
          className={`nav-pill relative mx-3 mt-3 flex h-14 items-center justify-between gap-3 rounded-full pr-2 pl-3 md:mx-5 md:pl-5 ${
            solid || open || compact
              ? "border border-white/70 bg-white/72 shadow-[0_8px_30px_-12px_rgba(20,19,15,0.18)] backdrop-blur-xl backdrop-saturate-150"
              : "border border-white/60 bg-bg/80 backdrop-blur-xl"
          }`}
        >
          <div className="flex min-w-0 items-center gap-1">
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
            <button onClick={() => go(0)} aria-label="Decignal, back to top" className="flex items-center">
              <Logo size={22} />
            </button>
            <Readout show={compact && !open} />
          </div>

          <NavLinks go={go} />

          <button onClick={() => go("#audit")} className="nav-cta">
            <span className="hidden sm:inline">Book a free AI audit</span>
            <span className="sm:hidden">Audit</span>
            <span className="nav-cta-icon" aria-hidden><ArrowUpRight size={15} strokeWidth={2.4} /></span>
          </button>
          <Rail show={compact && !open} />
        </div>
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
          {LINKS.map(([label, href], i) => (
            <li key={href} className="line-mask border-b border-line">
              <button
                onClick={() => go(href)}
                className="flex w-full items-baseline justify-between py-4 text-left"
                style={{
                  transform: open ? "none" : "translateY(110%)",
                  transition: `transform 900ms var(--ease-out-expo) ${open ? 200 + i * 70 : 0}ms`,
                }}
                tabIndex={open ? 0 : -1}
              >
                <span className="display text-[clamp(44px,11vw,88px)]">{label}</span>
                <span className="eyebrow tabular">0{i + 1}</span>
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
  for (const s of SECTIONS) {
    const el = document.getElementById(s[0]);
    if (el && el.getBoundingClientRect().top < vh * 0.4) found = s;
  }
  return { n: "", label: found ? found[1] : "", tone: "var(--color-ink)", i: CHAPTERS.length };
}

/** Chapter readout beside the logo. The number rolls when it changes, the way a counter would. */
function Readout({ show }: { show: boolean }) {
  const [state, setState] = useState({ n: "01", label: CHAPTERS[0].label, tone: "var(--color-ink)", key: 0 });
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
    const off = subscribe(update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      off();
      window.removeEventListener("scroll", update);
    };
  }, []);
  return (
    <span
      className="nav-readout eyebrow tabular hidden items-center gap-2 overflow-hidden whitespace-nowrap sm:inline-flex"
      data-show={show && state.label ? "" : undefined}
      aria-live="polite"
    >
      <span className="h-3 w-px bg-line-strong" aria-hidden />
      {state.n && (
        <span key={`n${state.key}`} className="nav-roll" style={{ color: state.tone }}>
          {state.n}
        </span>
      )}
      <span key={`l${state.key}`} className="nav-roll text-ink-2">
        {state.label}
      </span>
    </span>
  );
}

/** Story progress along the pill's lower edge: one segment per chapter, each in its own colour. */
function Rail({ show }: { show: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fills = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-fill]") ?? []);
    return subscribe((g) => {
      fills.forEach((f, i) => (f.style.transform = `scaleX(${Math.min(Math.max(g - i, 0), 1)})`));
    });
  }, []);
  return (
    <div ref={root} className="nav-rail" data-show={show ? "" : undefined} aria-label="Story chapters" role="navigation">
      {CHAPTERS.map((c, i) => (
        <button key={c.id} onClick={() => goToChapter(i)} aria-label={`Go to chapter ${i + 1}: ${c.label}`} title={c.label} tabIndex={show ? 0 : -1}>
          <span className="nav-rail-track">
            <span data-fill className="nav-rail-fill" style={{ background: toneVar(i) }} />
          </span>
        </button>
      ))}
    </div>
  );
}
