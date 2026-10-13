"use client";

import { useCallback, useEffect, useRef, type MouseEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDownRight } from "lucide-react";
import { AREAS, appsOf, areaHref } from "@/lib/areas";
import { APPLICATION_DEMOS } from "@/lib/application-demos";
import { CTA } from "@/lib/copy";
import { jumpTo, onArea, showApplication } from "@/lib/jump";
import { toneVars } from "@/lib/tone";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";
import { AreaArt } from "./AreaArt";

gsap.registerPlugin(ScrollTrigger);

/** A plain left click stays on the page; modifier and middle clicks keep the link's own behaviour. */
export const plainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/** Pinned stack timing (wide screens), in units of one panel: each later panel slides in over the first
 *  MOVE of its unit and rests for the rest, so most of the scroll is a whole panel at rest. A unit is
 *  UNIT svh of scroll. The first panel rests before the pin, under the section head. */
const MOVE = 0.5;
const UNIT = 80;
const SPAN = AREAS.length - 1;

/**
 * The five business areas as a folder stack (wide screens): the stack pins one screen, and each later
 * panel slides up over the one before to rest one tab lower, so covered panels stay readable as
 * labelled strips. The slide is scrubbed and short; most of the scroll is a panel at rest. The whole
 * stack leaves together. Phones, and wide screens without script, read the panels as a list. Each
 * area links on to its service page; its applications open in the explorer below.
 */
export function AreaStack() {
  const stack = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  /** Page y where panel i rests at the front: the middle of its rest in the pinned stack (the first
   *  panel: the section head's landing, where both share the screen), or just under the nav. */
  const restY = useCallback((i: number) => {
    const el = stack.current;
    const panel = stage.current?.children[i] as HTMLElement | undefined;
    if (!el || !panel) return null;
    const pageY = (n: HTMLElement) => n.getBoundingClientRect().top + window.scrollY;
    if (getComputedStyle(panel).position !== "absolute") return pageY(panel) - 96;
    const section = el.closest("section");
    if (!i) return section ? pageY(section) - (parseFloat(getComputedStyle(section).scrollMarginTop) || 0) : pageY(el);
    return pageY(el) + ((el.offsetHeight - window.innerHeight) * (i - (1 - MOVE) / 2)) / SPAN;
  }, []);
  // A strip (or showArea) brings its panel to the front; keyboard focus inside a panel does too.
  const bringForward = useCallback((i: number, focus = true) => {
    const y = restY(i);
    if (y === null) return;
    if (!focus && Math.abs(y - window.scrollY) < 2) return;
    void jumpTo(y, { focus: focus ? (stage.current?.children[i] as HTMLElement) : false });
  }, [restY]);
  useEffect(() => onArea(bringForward), [bringForward]);

  // Each later panel starts just below the screen and slides to its resting line over its MOVE window.
  useEffect(() => {
    const el = stack.current;
    const st = stage.current;
    if (!el || !st) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      const panels = [...st.children] as HTMLElement[];
      if (getComputedStyle(panels[0]).position !== "absolute") return;
      const tl = gsap.timeline({
        defaults: { ease: "power2.out", duration: MOVE },
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true },
      });
      panels.forEach((p, i) => {
        if (i) tl.fromTo(p, { y: () => window.innerHeight - p.offsetTop }, { y: 0 }, i - 1);
      });
      tl.set({}, {}, SPAN);
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={stack} className="area-stack page-wrap" data-stick style={{ ["--last" as string]: AREAS.length - 1, ["--pin" as string]: SPAN * UNIT }}>
      <div ref={stage} className="area-stage">
      {AREAS.map((area, i) => {
        const apps = appsOf(area);
        const title = `area-${area.slug}-title`;
        return (
          <article
            key={area.slug}
            id={`area-${area.slug}`}
            tabIndex={-1}
            aria-labelledby={title}
            className="area-panel"
            style={{ ...toneVars(area.tone), ["--i" as string]: i }}
            onFocus={(e) => {
              if (e.target !== e.currentTarget && e.target.matches(":focus-visible")) bringForward(i, false);
            }}
          >
            {/* The strip that stays visible when later panels cover this one. */}
            <a
              href={`#area-${area.slug}`}
              className="area-tab"
              onClick={(e) => {
                if (!plainClick(e)) return;
                e.preventDefault();
                bringForward(i);
              }}
            >
              <span className="area-index tabular">{String(i + 1).padStart(2, "0")} / {String(AREAS.length).padStart(2, "0")}</span>
              <span className="area-tab-name">{area.name}</span>
              <span className="area-tab-count tabular">{apps.length} {apps.length === 1 ? "application" : "applications"}</span>
            </a>
            <div className="area-copy">
              <AreaArt area={area.category} />
              <h3 id={title} className="t-title-card">{area.name}</h3>
              <p className="t-lede area-lead">{area.lead}</p>
              <SectionLink href={areaHref(area.category)} className="ed-link area-explore">
                {CTA.explore(area.name)}
                <Arrow />
              </SectionLink>
            </div>
            <div className="area-ui">
              <p className="area-ui-signal">
                <span className="area-ui-dot" aria-hidden />
                <span><span className="area-ui-label">Signal</span>{area.signal}</span>
              </p>
              <ul className="area-ui-apps" aria-label={`${area.name} applications`}>
                {apps.map((a) => (
                  <li key={a.name}>
                    <a
                      href={`#application-${APPLICATION_DEMOS[a.i].kind}`}
                      className="area-ui-app"
                      onClick={(e) => {
                        if (!plainClick(e)) return;
                        e.preventDefault();
                        showApplication(a.i);
                      }}
                    >
                      <span>
                        <span className="area-ui-label">{a.name}</span>
                        {a.example}
                      </span>
                      <ArrowDownRight size={16} strokeWidth={2} aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        );
      })}
      </div>
    </div>
  );
}
