"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { CHAPTERS, blendAt, subscribe } from "@/lib/story";
import { HOME_SECTIONS, getChrome, useChrome } from "@/lib/chrome";
import { jumpTo, showApplication } from "@/lib/jump";
import { pageBox } from "@/lib/offsets";
import { APPLICATIONS, CATEGORY_TONE } from "@/lib/content";
import { NAV, STORY_PEEK } from "@/lib/copy";
import { toneVars } from "@/lib/tone";
import { TONE, goToChapter } from "./story/chapters";
import { plainClick, useHtmlReady } from "./CtaPill";

const pad = (n: number) => String(n).padStart(2, "0");
const chapterTone = (i: number) => TONE[i] || "ink";
const toneColor = (t: string) => (t === "ink" ? "var(--color-ink)" : `var(--color-${t})`);

/** What the rail says about each home section on hover (D6: sections carry no tone). */
const LABEL: Record<string, string> = Object.fromEntries(NAV.sections);
const SECTION_INFO: Record<string, { label: string; blurb: string }> = {
  applications: { label: LABEL.applications, blurb: NAV.blurbs.apps },
  outcomes: { label: LABEL.outcomes, blurb: NAV.blurbs.outcomes },
  how: { label: LABEL.how, blurb: NAV.blurbs.how },
  faq: { label: LABEL.faq, blurb: NAV.blurbs.faq },
  audit: { label: LABEL.audit, blurb: NAV.faqSide.blurb },
};

type Group = { id: string; label: string; blurb: string };

/** Sections whose tops sit within 8px of each other (FAQ and the audit side by side) share one dot. */
function groupSections(): Group[] {
  const out: (Group & { top: number })[] = [];
  for (const s of HOME_SECTIONS) {
    const el = (s.start && document.querySelector(s.start)) || document.getElementById(s.id);
    const info = SECTION_INFO[s.id];
    const top = el ? pageBox(el).top : NaN;
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.top - top) <= 8) {
      prev.label = `${prev.label} and ${info.label.charAt(0).toLowerCase()}${info.label.slice(1)}`;
      continue;
    }
    out.push({ id: s.id, label: info.label, blurb: info.blurb, top });
  }
  return out.map(({ id, label, blurb }) => ({ id, label, blurb }));
}
const DEFAULT_GROUPS: Group[] = HOME_SECTIONS.map((s) => ({ id: s.id, ...SECTION_INFO[s.id] }));

/** The explorer's current application (its data-app). */
function readApp() {
  const v = document.querySelector<HTMLElement>(".application-journey")?.dataset.app;
  return v ? Number(v) : -1;
}

/** Rail pitch: 24px dots (WCAG target size); the application sub-dots tighten to 20px on short screens
 *  so the opened rail still fits. Mirrors the --rail-* values in chrome.css. */
const onResize = (fn: () => void) => {
  window.addEventListener("resize", fn);
  return () => window.removeEventListener("resize", fn);
};
function useGeometry() {
  const short = useSyncExternalStore(onResize, () => window.innerHeight < 680, () => false);
  return { p: 24, s: short ? 20 : 24, g: 12 };
}

/**
 * Left rail at 1024px and up: the nine story chapters, then the page sections. One solid pill marks
 * where the reader is; in the story it glides with the 3D hand-off itself (written every frame from
 * the story timeline), past it it slides between sections. While the application explorer is pinned,
 * Applications opens into its eight applications. Hover or focus names each dot.
 */
export function ChapterRail() {
  const ready = useHtmlReady();
  const footerNear = useChrome((s) => s.footerNear);
  const inStory = useChrome((s) => s.inStory);
  const chapter = useChrome((s) => s.chapter);
  const section = useChrome((s) => s.section);
  const expanded = useChrome((s) => s.pinned && s.section === "applications");
  const [groups, setGroups] = useState<Group[]>(DEFAULT_GROUPS);
  const [app, setApp] = useState(-1);
  const [hint, setHint] = useState<{ key: string; y: number; on: boolean } | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const items = useRef(new Map<string, HTMLElement>());
  const { p, s, g } = useGeometry();
  const show = ready && !footerNear;

  // Regroup when the layout changes (FAQ and the audit sit side by side from 1100px).
  useEffect(() => {
    let raf = 0;
    const regroup = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = groupSections();
        setGroups((cur) => (cur.length === next.length && cur.every((x, k) => x.id === next[k].id && x.label === next[k].label) ? cur : next));
      });
    };
    regroup();
    const ro = new ResizeObserver(regroup);
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // Which application the explorer shows, while it is pinned.
  useEffect(() => {
    if (!expanded) return;
    const j = document.querySelector(".application-journey");
    const read = () => setApp(readApp());
    const raf = requestAnimationFrame(read);
    if (!j) return () => cancelAnimationFrame(raf);
    const mo = new MutationObserver(read);
    mo.observe(j, { attributes: true, attributeFilter: ["data-app"] });
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
    };
  }, [expanded]);

  const appsAt = groups.findIndex((x) => x.id === "applications");
  const k = section ? groups.findIndex((x) => x.id === section) : -1;
  const subOn = expanded && app >= 0;

  // Slot centres in px from the top of the list.
  const storyY = (i: number) => (i + 0.5) * p;
  const sectionY = (gi: number) => CHAPTERS.length * p + g + (gi + 0.5) * p + (expanded && gi > appsAt ? APPLICATIONS.length * s : 0);
  const subY = (m: number) => CHAPTERS.length * p + g + (appsAt + 1) * p + (m + 0.5) * s;

  // In the story the pill rides the timeline every frame (no CSS transition); past it, it slides.
  useLayoutEffect(() => {
    const el = pill.current;
    if (!el) return;
    let last = "";
    const write = (y: number, tone: string, sub: boolean, glide: boolean) => {
      const key = `${Math.round(y * 4)}|${tone}|${sub}|${glide}`;
      if (key === last) return;
      last = key;
      el.style.setProperty("--y", `${Math.round(y * 4) / 4}px`);
      el.style.setProperty("--tone", toneColor(tone));
      el.toggleAttribute("data-sub", sub);
      el.toggleAttribute("data-glide", glide);
    };
    const at = (i: number) => (i + 0.5) * p;
    if (inStory) {
      return subscribe((gv) => {
        if (!getChrome().inStory) return;
        const { i, j, e } = blendAt(gv);
        write(at(i) + (at(j) - at(i)) * e, chapterTone(e < 0.5 ? i : j), false, false);
      });
    }
    const base = CHAPTERS.length * p + g;
    if (subOn) write(base + (appsAt + 1) * p + (app + 0.5) * s, CATEGORY_TONE[APPLICATIONS[app].category], true, true);
    else if (k >= 0) write(base + (k + 0.5) * p + (expanded && k > appsAt ? APPLICATIONS.length * s : 0), "ink", false, true);
    else write(at(CHAPTERS.length - 1), chapterTone(CHAPTERS.length - 1), false, true);
  }, [inStory, k, expanded, app, subOn, appsAt, p, s, g]);

  // Keyboard: one tab stop (the current dot); Up and Down walk the rail.
  const order = [
    ...CHAPTERS.map((_, i) => `c${i}`),
    ...groups.flatMap((x) => (x.id === "applications" && expanded ? [`s-${x.id}`, ...APPLICATIONS.map((_, m) => `a${m}`)] : [`s-${x.id}`])),
  ];
  const current = inStory ? `c${chapter}` : subOn ? `a${app}` : k >= 0 ? `s-${groups[k].id}` : `c${CHAPTERS.length - 1}`;
  const tabbable = focusKey && order.includes(focusKey) ? focusKey : current;
  const onKeyDown = (e: KeyboardEvent) => {
    const at = order.indexOf(focusKey ?? current);
    let to = -1;
    if (e.key === "ArrowDown") to = Math.min(at + 1, order.length - 1);
    else if (e.key === "ArrowUp") to = Math.max(at - 1, 0);
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = order.length - 1;
    if (to < 0) return;
    e.preventDefault();
    items.current.get(order[to])?.focus();
  };

  const bind = (key: string, y: number) => ({
    ref: (el: HTMLElement | null) => {
      if (el) items.current.set(key, el);
      else items.current.delete(key);
    },
    tabIndex: key === tabbable ? 0 : -1,
    onFocus: () => {
      setFocusKey(key);
      setHint({ key, y, on: true });
    },
    // The label fades out where it was, still showing what it named.
    onBlur: () => setHint((h) => (h?.key === key ? { ...h, on: false } : h)),
    onPointerEnter: () => setHint({ key, y, on: true }),
    onPointerLeave: () => setHint((h) => (h?.key === key ? { ...h, on: false } : h)),
  });

  const toSection = (id: string) => (e: MouseEvent) => {
    if (!plainClick(e)) return;
    e.preventDefault();
    void jumpTo(`#${id}`);
  };

  // The label for the hovered or focused dot.
  let label: { n: string; name: string; blurb: string; tone: string } | null = null;
  const key = hint?.key ?? "";
  if (key.startsWith("c")) {
    const i = Number(key.slice(1));
    label = { n: pad(i + 1), name: CHAPTERS[i].label, blurb: STORY_PEEK.chapters[i], tone: chapterTone(i) };
  } else if (key.startsWith("s-")) {
    const x = groups.find((y) => `s-${y.id}` === key);
    if (x) label = { n: "", name: x.label, blurb: x.blurb, tone: "ink" };
  } else if (key.startsWith("a")) {
    const m = Number(key.slice(1));
    label = { n: pad(m + 1), name: APPLICATIONS[m].name, blurb: APPLICATIONS[m].category, tone: CATEGORY_TONE[APPLICATIONS[m].category] };
  }

  return (
    <nav
      className="chapter-rail"
      aria-label="Chapters and sections"
      data-show={show || undefined}
      data-open={expanded || undefined}
      inert={!show}
      style={{ "--n": groups.length } as CSSProperties}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusKey(null);
      }}
    >
      <span ref={pill} className="chapter-rail-pill" aria-hidden />
      <ol className="chapter-rail-list">
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              className="chapter-rail-item"
              aria-label={`Chapter ${i + 1} of ${CHAPTERS.length}: ${c.label}. ${STORY_PEEK.chapters[i]}`}
              aria-current={inStory && i === chapter ? "step" : undefined}
              data-passed={!inStory || i < chapter || undefined}
              onClick={() => goToChapter(i)}
              {...bind(`c${i}`, storyY(i))}
            >
              <i aria-hidden />
            </button>
          </li>
        ))}
        <li className="chapter-rail-gap" aria-hidden />
        {groups.map((x, gi) => (
          <li key={x.id}>
            <a
              href={`#${x.id}`}
              className="chapter-rail-item"
              aria-label={`${x.label}. ${x.blurb}`}
              aria-current={!inStory && gi === k ? "location" : undefined}
              data-passed={(!inStory && gi < k) || undefined}
              data-parent={(x.id === "applications" && subOn) || undefined}
              onClick={toSection(x.id)}
              {...bind(`s-${x.id}`, sectionY(gi))}
            >
              <i aria-hidden />
            </a>
            {x.id === "applications" && (
              <ol className="chapter-rail-sub" aria-label="Applications" inert={!expanded}>
                {APPLICATIONS.map((a, m) => (
                  <li key={a.name}>
                    <button
                      type="button"
                      className="chapter-rail-item"
                      aria-label={`Application ${m + 1} of ${APPLICATIONS.length}: ${a.name}`}
                      aria-current={subOn && m === app ? "step" : undefined}
                      data-passed={(subOn && m < app) || undefined}
                      style={toneVars(CATEGORY_TONE[a.category])}
                      onClick={() => showApplication(m)}
                      {...bind(`a${m}`, subY(m))}
                    >
                      <i aria-hidden />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
      <p className="chapter-rail-label" data-show={(label && hint?.on) || undefined} style={{ "--y": `${hint?.y ?? 0}px`, ...toneVars(label?.tone ?? "ink") } as CSSProperties} aria-hidden>
        {label && (
          <>
            {label.n && <span className="chapter-rail-n">{label.n}</span>}
            <b>{label.name}</b>
            <span className="chapter-rail-blurb">{label.blurb}</span>
          </>
        )}
      </p>
    </nav>
  );
}
