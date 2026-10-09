"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "../ui/Logo";
import { scrollToTarget } from "../SmoothScroll";
import { anchorOf, S } from "@/lib/reel";
import { useSlide } from "./motion";
import { NavGlance, SCENES, sceneSky, type GlanceActions, type GlanceId } from "./NavGlance";

const LINKS: { label: string; glance: GlanceId; blurb: string; go: () => void; from: number; to: number }[] = [
  { label: "Home", glance: "story", blurb: "The story, dawn to night", go: () => scrollToTarget(0), from: S.hero, to: S.systems },
  { label: "Platform", glance: "platform", blurb: "Signal, decision, foundation", go: () => scrollToTarget(anchorOf(S.signal, 0.05)), from: S.signal, to: S.foundation },
  { label: "Applications", glance: "apps", blurb: "Eight apps, six industries", go: () => scrollToTarget(anchorOf(S.yours)), from: S.yours, to: S.outcome },
  { label: "How it works", glance: "how", blurb: "Live in four to twelve weeks", go: () => scrollToTarget(anchorOf(S.how)), from: S.how, to: S.how },
  { label: "FAQ", glance: "faq", blurb: "What teams ask first", go: () => scrollToTarget("#ask"), from: S.ask, to: S.ask },
];

/** Glances open on hover only where there is a real pointer and room for them. */
const canPeek = () => window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 901px)").matches;

/** Logo left, links centred with the current one marked, actions right. Hovering a link opens its glance. */
export function ReelNav({ section, actions }: { section: number; actions: GlanceActions }) {
  const [open, setOpen] = useState(false);
  const [peek, setPeek] = useState<GlanceId | null>(null);
  const [caret, setCaret] = useState(0);
  const on = LINKS.findIndex((l) => section >= l.from && section <= l.to);
  const links = useSlide<HTMLUListElement>(on, ":scope > li > button");
  const timer = useRef(0);
  const skies = useMemo(() => (open ? sceneSky() : null), [open]);

  const clear = () => window.clearTimeout(timer.current);
  const show = (id: GlanceId, el: HTMLElement, delay: number) => {
    clear();
    const r = el.getBoundingClientRect();
    const go = () => {
      setCaret(r.left + r.width / 2);
      setPeek(id);
    };
    // A short intent delay on the first open, so sweeping across the nav does not flash a panel.
    if (peek || delay === 0) go();
    else timer.current = window.setTimeout(go, delay);
  };
  const hide = (delay = 180) => {
    clear();
    timer.current = window.setTimeout(() => setPeek(null), delay);
  };
  useEffect(() => () => clear(), []);
  // Escape, or scrolling the page with the wheel, closes the glance.
  useEffect(() => {
    if (!peek) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setPeek(null);
    const wheel = () => setPeek(null);
    window.addEventListener("keydown", key);
    window.addEventListener("wheel", wheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("wheel", wheel);
    };
  }, [peek]);

  return (
    <nav className="r-nav" data-open={open} data-peek={peek ?? undefined} aria-label="Main">
      <a href="#" className="r-nav-logo" onClick={(e) => (e.preventDefault(), scrollToTarget(0))} aria-label="Decignal, back to top">
        <Logo size={22} />
      </a>
      <ul ref={links} data-slide="0" className="r-nav-links" onPointerLeave={() => peek && hide()}>
        {LINKS.map((l) => {
          const here = section >= l.from && section <= l.to;
          return (
            <li key={l.label}>
              <button
                data-on={here}
                data-peeking={peek === l.glance || undefined}
                aria-current={here ? "location" : undefined}
                aria-expanded={peek === l.glance}
                aria-controls="r-peek"
                onPointerEnter={(e) => canPeek() && show(l.glance, e.currentTarget, 90)}
                onFocus={(e) => canPeek() && e.currentTarget.matches(":focus-visible") && show(l.glance, e.currentTarget, 0)}
                onClick={() => {
                  setOpen(false);
                  setPeek(null);
                  l.go();
                }}
              >
                {l.label}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="r-nav-actions">
        <button className="r-btn r-btn-dark r-btn-sm" onClick={() => scrollToTarget("#audit")}>
          Book an audit
        </button>
        <button className="r-nav-menu" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="r-menu" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <NavGlance open={peek} caret={caret} section={section} actions={actions} onEnter={clear} onLeave={() => hide()} onDone={() => setPeek(null)} />

      {/* Phones and tablets: the menu is a sheet with the five parts and the day's ten scenes. */}
      <div id="r-menu" className="r-menu" inert={!open} aria-hidden={!open}>
        <ul className="r-menu-links">
          {LINKS.map((l, i) => (
            <li key={l.label} style={{ ["--d" as string]: i }}>
              <button
                data-on={i === on}
                onClick={() => {
                  setOpen(false);
                  l.go();
                }}
              >
                <b>{l.label}</b>
                <span>{l.blurb}</span>
                <ArrowRight size={16} strokeWidth={2} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <p className="r-menu-kicker">The story, dawn to night</p>
        <ol className="r-menu-scenes">
          {SCENES.map((sc, i) => (
            <li key={sc.name} style={{ ["--d" as string]: i }}>
              <button
                aria-current={section === i ? "step" : undefined}
                onClick={() => {
                  setOpen(false);
                  actions.go(i, i === S.signal ? 0.05 : 0);
                }}
                style={skies ? { ["--top" as string]: skies[i].top, ["--hz" as string]: skies[i].horizon } : undefined}
              >
                <i aria-hidden />
                <small className="tabular">{String(i + 1).padStart(2, "0")}</small>
                <span>{sc.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
