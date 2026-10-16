"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { APPROACH_COPY, STATEMENT } from "@/lib/copy";
import { APPROACH } from "@/lib/content";
import { APP_FACTS } from "@/lib/example";
import SectionTitle from "../ui/SectionTitle";
import { Compass } from "lucide-react";
import { AREAS, appsOf } from "@/lib/areas";
import { toneVars } from "@/lib/tone";
import { LiquidShapes } from "../ui/LiquidShapes";
import decide from "@/assets/photos/decide.jpg";

gsap.registerPlugin(ScrollTrigger);


const FLOW = [
  { id: "erp", name: "ERP", tone: "cobalt", y: 30 },
  { id: "crm", name: "Email", tone: "pink", y: 100 },
  { id: "mes", name: "Reports", tone: "emerald", y: 170 },
  { id: "sup", name: "Sheets", tone: "tangerine", y: 240 },
];

/** The sentence, drawn: records from four places come together, and the next step goes to the person who acts.
 *  The threads draw in turn as the section arrives (data-on), then a pulse keeps travelling them: a
 *  round-capped dash of no length (a dot) run along the thread by a CSS animation, which holds still
 *  off screen. SMIL motion re-laid out the drawing on every frame of the page and could not be paused. */
function FlowArt() {
  return (
    <svg className="flow-art" viewBox="0 0 520 270" aria-hidden>
      {FLOW.map((f, i) => (
        <g
          key={f.id}
          style={{ ...toneVars(f.tone), ["--i" as string]: i } as CSSProperties}
        >
          <path
            className="flow-thread"
            pathLength={1}
            d={`M120 ${f.y} C 200 ${f.y}, 200 135, 262 135`}
          />
          <path
            className="flow-pulse"
            pathLength={1}
            d={`M120 ${f.y} C 200 ${f.y}, 200 135, 262 135`}
          />
          <rect
            className="flow-chip"
            x="8"
            y={f.y - 20}
            width="112"
            height="40"
            rx="20"
          />
          <circle className="flow-dot" cx="32" cy={f.y} r="6" />
          <text className="flow-chip-t" x="48" y={f.y + 5}>
            {f.name}
          </text>
        </g>
      ))}
      <g className="flow-hub">
        <rect x="262" y="103" width="64" height="64" rx="18" />
        <g transform="translate(278 116) scale(1)">
          <path d="M16 21.5 4 15.6l12-5.9 12 5.9z" fill="var(--color-cobalt)" />
          <path d="M16 16.8 4 10.9 16 5l12 5.9z" fill="var(--color-saffron)" />
          <path d="M16 12.1 4 6.2 16 .3l12 5.9z" fill="var(--color-signal)" />
        </g>
      </g>
      <path
        className="flow-thread flow-out"
        pathLength={1}
        d="M326 135 H 372"
      />
      <g className="flow-approve">
        <rect x="372" y="107" width="140" height="56" rx="28" />
        <circle cx="400" cy="135" r="14" />
        <path d="M393 135 l5 5 9-10" />
        <text x="424" y="132">
          Next step
        </text>
        <text className="flow-sub" x="424" y="148">
          With its owner
        </text>
      </g>
    </svg>
  );
}

/** Bring the records together: four record plates read under one bar, each with its source. */
function ReadArt() {
  return (
    <svg className="bento-art" viewBox="0 0 220 90" aria-hidden>
      {["cobalt", "violet", "emerald", "saffron"].map((t, i) => (
        <g key={t} style={toneVars(t)}>
          <rect
            className="ba-plate"
            x={8 + i * 52}
            y="48"
            width="42"
            height="30"
            rx="8"
          />
          <circle className="ba-fill" cx={29 + i * 52} cy="63" r="5" />
          <path
            className="ba-read"
            pathLength={1}
            d={`M${29 + i * 52} 44 V 22`}
            style={{ ["--i" as string]: i } as CSSProperties}
          />
        </g>
      ))}
      <rect className="ba-bar" x="20" y="8" width="180" height="12" rx="6" />
    </svg>
  );
}

/** Define how your business works: aliases, units and limits become the rules, which reach the owner. */
function ScopeArt() {
  const ins = ["Aliases", "Units", "Limits"];
  return (
    <svg className="bento-art" viewBox="0 0 220 90" aria-hidden>
      {ins.map((k, i) => (
        <g key={k} style={{ ["--i" as string]: i } as CSSProperties}>
          <rect className={`ba-week on`} x="4" y={8 + i * 26} width="58" height="20" rx="6" style={{ ["--i" as string]: i } as CSSProperties} />
          <text className="ba-k" x="33" y={22 + i * 26}>
            {k}
          </text>
          <path className="ba-read" pathLength={1} d={`M62 ${18 + i * 26} C 84 ${18 + i * 26}, 84 44, 104 44`} style={{ ["--i" as string]: i } as CSSProperties} />
        </g>
      ))}
      <rect className="ba-bar" x="104" y="30" width="58" height="28" rx="9" />
      <text className="ba-k" x="133" y="48">
        Rules
      </text>
      <path className="ba-span" d="M162 44 H 184" />
      <circle className="ba-dot" cx="200" cy="44" r="12" />
    </svg>
  );
}

/** Put the result into the workflow: a draft waiting on the person who approves it; the press lands on a loop. */
function ApproveArt() {
  return (
    <svg className="bento-art ba-approve" viewBox="0 0 260 96" aria-hidden>
      <rect className="ba-card" x="1" y="1" width="258" height="94" rx="14" />
      <text className="ba-t" x="16" y="28">
        Draft order {APP_FACTS.order.po} · {APP_FACTS.order.lines} lines
      </text>
      <text className="ba-s" x="16" y="46">
        Sources attached · {APP_FACTS.order.item + APP_FACTS.order.unit} lines to confirm
      </text>
      <circle className="ba-face" cx="28" cy="72" r="10" />
      <text className="ba-s" x="46" y="76">
        Order desk
      </text>
      <g className="ba-btn">
        <rect x="150" y="58" width="94" height="28" rx="14" />
        <text x="197" y="77">
          Approve
        </text>
      </g>
      <g className="ba-done">
        <rect x="150" y="58" width="94" height="28" rx="14" />
        <path d="M168 72 l5 5 9-10" />
        <text x="208" y="77">
          Approved
        </text>
      </g>
    </svg>
  );
}

/** Five functions: the application examples in each, a bar per function in its colour. */
function AreasArt() {
  const counts = AREAS.map((a) => appsOf(a).length);
  return (
    <svg className="bento-art ba-areas" viewBox="0 0 220 96" aria-hidden>
      <path className="ba-axis" d="M6 78 H 214" />
      {AREAS.map((a, k) => {
        const h = counts[k] * 18;
        return (
          <g key={a.slug} style={{ ...toneVars(a.tone), ["--i" as string]: k } as CSSProperties}>
            <rect className="ba-bar-area" x={14 + k * 42} y={78 - h} width="26" height={h} rx="6" />
            <text className="ba-k" x={27 + k * 42} y={92}>{counts[k]}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Rules and people: an approved match is ready, anything uncertain goes to your team. */
function ThresholdArt() {
  return (
    <svg className="bento-art ba-ladder" viewBox="0 0 300 92" aria-hidden>
      {[
        { y: 4, k: "Approved reference", who: "Ready", on: true },
        { y: 50, k: "Uncertain or missing", who: "Your team", on: false },
      ].map((r, i) => (
        <g key={r.k} className="ba-rung" data-on={r.on || undefined} style={{ ["--i" as string]: i } as CSSProperties}>
          <rect x="1" y={r.y} width="298" height="38" rx="12" />
          <text className="ba-rung-k" x="16" y={r.y + 24}>{r.k}</text>
          <path className="ba-rung-arrow" d={`M150 ${r.y + 19} h 26 m -6 -5 l 6 5 -6 5`} />
          <circle className="ba-rung-face" cx="200" cy={r.y + 19} r="9" />
          <text className="ba-rung-who" x="216" y={r.y + 24}>{r.who}</text>
        </g>
      ))}
    </svg>
  );
}

/** Keep it useful after launch: the four things someone owns, lit one after another. */
const OWNS = ["Measure", "Errors", "Changes", "Support"];
function AppsArt() {
  return (
    <svg className="bento-art" viewBox="0 0 220 90" aria-hidden>
      {OWNS.map((k, i) => (
        <g key={k}>
          <rect className="ba-app" x={4 + i * 54} y="22" width="48" height="36" rx="9" style={{ ["--i" as string]: i } as CSSProperties} />
          <text className="ba-k" x={28 + i * 54} y="76">
            {k}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * The problem, then how we build (handoff §5 problem and approach). The problem's sentences come up word
 * by word as they scroll through the screen; the approach sits in a bento of glass cards (two wear the
 * references' slate and amber fields), one per item: records, rules, the application (with the
 * photograph as a duotone) and ownership, and the five functions last.
 */
export function Statement() {
  const root = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    // The sentence or the bento, whichever arrives first (a jump can land on the bento directly).
    el.querySelectorAll(".stmt-head, .bento-wrap").forEach((n) => io.observe(n));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return () => io.disconnect();
    const ctx = gsap.context(() => {
      // Opacity only (the words are inline, so a transform would not apply): no blur on text.
      gsap.fromTo(
        ".stmt-word",
        { opacity: 0.14 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.12,
          scrollTrigger: {
            trigger: ".stmt-text",
            start: "top 85%",
            end: "bottom 50%",
            scrub: 0.6,
          },
        },
      );
    }, el);
    return () => {
      io.disconnect();
      ctx.revert();
    };
  }, []);

  const [look, define, test, agree] = APPROACH.map((a, i) => ({ ...a, k: APPROACH_COPY.steps[i], tone: APPROACH_COPY.tones[i] }));
  const words = STATEMENT.text.split(" ");

  return (
    <div ref={root} className="stmt-pair" data-on={seen || undefined}>
      <section id="problem" className="stmt" data-on={seen || undefined} aria-labelledby="stmt-title">
        <div className="page-wrap">
          {/* The label is the section's heading; the sentences under it are a statement, not a headline. */}
          <h2 id="stmt-title" className="t-label section-title-label stmt-label">
            {STATEMENT.eyebrow}
          </h2>
          <div className="stmt-head">
            <div>
              <p className="t-subtitle stmt-lead">{STATEMENT.headline}</p>
              <p className="stmt-text">
                {words.map((w, i) => (
                  <span key={i} className="stmt-word">
                    {w}
                    {i < words.length - 1 ? " " : ""}
                  </span>
                ))}
              </p>
              <p className="t-body stmt-closing">{STATEMENT.closing}</p>
            </div>
            <FlowArt />
          </div>
        </div>
      </section>

      <section id="platform" className="stmt stmt-approach" data-on={seen || undefined} aria-labelledby="approach-title">
        <div className="page-wrap">
          <SectionTitle
            icon={<Compass size={13} strokeWidth={2.2} />}
            id="approach-title"
            label={APPROACH_COPY.eyebrow}
            lines={[APPROACH_COPY.headline[0], APPROACH_COPY.headline[1]]}
            lede={APPROACH_COPY.intro}
            tone="ink"
            reveal="lines"
            className="ed-title"
          />
          <div className="bento-wrap">
            <LiquidShapes preset="bento" />
            <ul className="bento">
              {[look, define].map((g, i) => (
                <li key={g.k} className="bento-card" data-field={i === 0 ? "slate" : undefined} style={toneVars(g.tone)}>
                  <p className="bento-k t-label">{g.title}</p>
                  <p className="bento-text t-small">{g.text}</p>
                  {i === 0 ? <ReadArt /> : <ScopeArt />}
                  <p className="bento-n">{g.k}</p>
                </li>
              ))}
              <li className="bento-card bento-photo" style={toneVars(test.tone)}>
                <figure className="bento-figure" data-tone={test.tone}>
                  <Image
                    src={decide}
                    alt=""
                    sizes="(min-width: 1024px) 360px, 90vw"
                    className="bento-img"
                  />
                </figure>
                <p className="bento-k t-label">{test.title}</p>
                <p className="bento-text t-small">{test.text}</p>
                <ApproveArt />
                <ThresholdArt />
                <p className="bento-n">{test.k}</p>
              </li>
              <li className="bento-card" data-field="amber" style={toneVars(agree.tone)}>
                <p className="bento-k t-label">{agree.title}</p>
                <p className="bento-text t-small">{agree.text}</p>
                <AppsArt />
                <p className="bento-n">{agree.k}</p>
              </li>
              <li className="bento-card" style={toneVars("violet")}>
                <p className="bento-k t-label">{APPROACH_COPY.functions}</p>
                <ul className="bento-areas" aria-label={APPROACH_COPY.functions}>
                  {AREAS.map((a) => (
                    <li key={a.slug} style={toneVars(a.tone)}>
                      <i aria-hidden />
                      {a.name}
                    </li>
                  ))}
                </ul>
                <p className="bento-text t-small">{APPROACH_COPY.functionsText}</p>
                <AreasArt />
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
