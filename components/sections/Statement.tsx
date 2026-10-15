"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GLANCE, STATEMENT } from "@/lib/copy";
import { AREAS, appsOf } from "@/lib/areas";
import { toneVars } from "@/lib/tone";
import { CountUp } from "../ui/CountUp";
import { LogoMark } from "../ui/Logo";
import { LiquidShapes } from "../ui/LiquidShapes";
import decide from "@/assets/photos/decide.jpg";

gsap.registerPlugin(ScrollTrigger);


const FLOW = [
  { id: "erp", name: "ERP", tone: "cobalt", y: 30 },
  { id: "crm", name: "CRM", tone: "violet", y: 100 },
  { id: "mes", name: "MES", tone: "emerald", y: 170 },
  { id: "wms", name: "WMS", tone: "saffron", y: 240 },
];

/** The sentence, drawn: four systems feed Decignal, and one decision goes to the person who approves.
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
          Approve
        </text>
        <text className="flow-sub" x="424" y="148">
          Planner · 09:42
        </text>
      </g>
    </svg>
  );
}

/** Read-only: four system plates under a lens; nothing is written back (the write arrow is crossed). */
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

/** 4 to 8 weeks: eight week marks; the release lands between week four and week eight. */
function WeeksArt() {
  return (
    <svg className="bento-art" viewBox="0 0 220 90" aria-hidden>
      <path className="ba-axis" d="M10 60 H 210" />
      {Array.from({ length: 8 }, (_, w) => (
        <g key={w}>
          <rect
            className={`ba-week${w >= 3 ? " on" : ""}`}
            x={12 + w * 25}
            y="40"
            width="21"
            height="20"
            rx="5"
            style={{ ["--i" as string]: w } as CSSProperties}
          />
          <text className="ba-k" x={22 + w * 25} y="78">
            {w + 1}
          </text>
        </g>
      ))}
      <path className="ba-span" d="M87 30 H 208" />
      <circle className="ba-dot" cx="87" cy="30" r="4" />
      <circle className="ba-dot" cx="208" cy="30" r="4" />
    </svg>
  );
}

/** One named approver: the transfer waiting on one person; the approve press lands on a loop. */
function ApproveArt() {
  return (
    <svg className="bento-art ba-approve" viewBox="0 0 260 96" aria-hidden>
      <rect className="ba-card" x="1" y="1" width="258" height="94" rx="14" />
      <text className="ba-t" x="16" y="28">
        Transfer 240 units
      </text>
      <text className="ba-s" x="16" y="46">
        Plant 02 to Plant 01 · INR 38k
      </text>
      <circle className="ba-face" cx="28" cy="72" r="10" />
      <text className="ba-s" x="46" y="76">
        Planner
      </text>
      <g className="ba-btn">
        <rect x="150" y="58" width="94" height="28" rx="14" />
        <text x="197" y="77">
          Approve
        </text>
      </g>
      <g className="ba-done">
        <rect x="150" y="58" width="94" height="28" rx="14" />
        <path d="M172 72 l5 5 9-10" />
        <text x="208" y="77">
          Done
        </text>
      </g>
    </svg>
  );
}

/** Five areas: how the eight applications spread across them, a bar per area in its colour. */
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

/** Roles and thresholds: a transfer up to 300 units goes to the planner, above it to the plant head. */
function ThresholdArt() {
  return (
    <svg className="bento-art ba-ladder" viewBox="0 0 300 92" aria-hidden>
      {[
        { y: 4, k: "Up to 300 units", who: "Planner", on: true },
        { y: 50, k: "Over 300 units", who: "Plant head", on: false },
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

/** Eight applications: eight tiles that light one after another. */
function AppsArt() {
  return (
    <svg className="bento-art" viewBox="0 0 220 90" aria-hidden>
      {Array.from({ length: 8 }, (_, k) => (
        <rect
          key={k}
          className="ba-app"
          x={8 + (k % 4) * 52}
          y={8 + Math.floor(k / 4) * 40}
          width="44"
          height="32"
          rx="9"
          style={{ ["--i" as string]: k } as CSSProperties}
        />
      ))}
    </svg>
  );
}

/**
 * What Decignal does, in one sentence and five facts (Orvan's "About"). The sentence comes up word by
 * word as it scrolls through the screen, tied to the scroll; the facts sit in a bento of glass cards
 * (two wear the references' slate and amber fields), each a label and a figure that counts up, with the
 * approver's photograph as a duotone beside them.
 */
export function Statement() {
  const root = useRef<HTMLElement>(null);
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

  const [readOnly, weeks, apps, areas, approver] = GLANCE;
  const words = STATEMENT.text.split(" ");

  return (
    <section
      ref={root}
      id="platform"
      className="stmt"
      data-on={seen || undefined}
      aria-labelledby="stmt-title"
    >
      <div className="page-wrap">
        {/* The label is the section's heading; the sentence under it is a statement, not a headline. */}
        <h2 id="stmt-title" className="t-label section-title-label stmt-label">
          <span className="section-title-icon" aria-hidden>
            <LogoMark className="stmt-mark" />
          </span>
          {STATEMENT.eyebrow}
        </h2>
        <div className="stmt-head">
          <p className="stmt-text">
            {words.map((w, i) => (
              <span key={i} className="stmt-word">
                {w}
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
          <FlowArt />
        </div>

        <div className="bento-wrap">
          <LiquidShapes preset="bento" />
          <ul className="bento">
            {[readOnly, weeks].map((g, i) => (
              <li key={g.label} className="bento-card" data-field={i === 0 ? "slate" : undefined} style={toneVars(g.tone)}>
                <p className="bento-k t-label">
                  {g.label}
                </p>
                <p className="bento-text t-small">{g.text}</p>
                {i === 0 ? <ReadArt /> : <WeeksArt />}
                <p className="bento-n">{g.n}</p>
              </li>
            ))}
            <li
              className="bento-card bento-photo"
              style={toneVars(approver.tone)}
            >
              <figure className="bento-figure">
                <Image
                  src={decide}
                  alt={STATEMENT.approverAlt}
                  sizes="(min-width: 1024px) 360px, 90vw"
                  className="bento-img"
                />
              </figure>
              <p className="bento-k t-label">
                {approver.label}
              </p>
              <p className="bento-text t-small">{approver.text}</p>
              <ApproveArt />
              <ThresholdArt />
              {/* The trail an approval leaves: who saw it, who approved it, what happened next. */}
              <ol className="bento-log">
                {STATEMENT.log.map((l, i) => (
                  <li key={l.t} style={{ ...toneVars(l.tone), ["--i" as string]: i } as CSSProperties}>
                    <span className="tabular">{l.t}</span>
                    {l.text}
                  </li>
                ))}
              </ol>
              <p className="bento-n">
                <CountUp value={approver.n} play={seen} />
              </p>
            </li>
            <li className="bento-card" data-field="amber" style={toneVars(apps.tone)}>
              <p className="bento-k t-label">
                {apps.label}
              </p>
              <p className="bento-text t-small">{apps.text}</p>
              <AppsArt />
              <p className="bento-n">
                <CountUp value={apps.n} play={seen} />
              </p>
            </li>
            <li className="bento-card" style={toneVars(areas.tone)}>
              <p className="bento-k t-label">
                {areas.label}
              </p>
              <ul className="bento-areas" aria-label={areas.label}>
                {AREAS.map((a) => (
                  <li key={a.slug} style={toneVars(a.tone)}>
                    <i aria-hidden />
                    {a.name}
                  </li>
                ))}
              </ul>
              <AreasArt />
              <p className="bento-n">
                <CountUp value={areas.n} play={seen} />
              </p>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
