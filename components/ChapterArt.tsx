"use client";

import { useId, useLayoutEffect, useRef } from "react";
import { INDUSTRIES } from "@/lib/story";

/** A small drawing of what happens in each story chapter: the chapter glance in the nav, and the story's
 *  picture when WebGL is unavailable. The objects are the ones the 3D world shows, standing on one
 *  ground line (no discs or turntables). Drawn in the chapter's colour (currentColor), with the system
 *  colours where the chapter is about them; signal red only on the risk. CSS motion runs only while the
 *  tile is pointed at or is the chapter being read (see .ca-* in chrome.css). Text keeps 11px on screen
 *  at any size: --k is the drawing's scale. `live` keeps the motion running (the WebGL fallback). */
export function ChapterArt({ i, live = false }: { i: number; live?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const svg = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    const el = svg.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const k = Math.min(r.width / 280, r.height / 80);
      if (k > 0) el.style.setProperty("--k", k.toFixed(3));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <svg ref={svg} className="chapter-art" viewBox="0 0 280 80" data-live={live || undefined} aria-hidden>
      {i === 0 && <Fragmented />}
      {i === 1 && <Signal />}
      {i === 2 && <Problem />}
      {i === 3 && <Context />}
      {i === 4 && <Decision id={`ca-road-${uid}`} />}
      {i === 5 && <Control />}
      {i === 6 && <Scale />}
      {i === 7 && <Industries clip={`ca-clip-${uid}`} />}
      {i === 8 && <Decide />}
    </svg>
  );
}

const SYS = ["cobalt", "violet", "emerald", "saffron", "tangerine", "pink"].map((c) => `var(--color-${c})`);
const GROUND = 66;

/** A side face: the same colour as the front, darkened by a flat ink overlay. */
function Side({ d, fill }: { d: string; fill: string }) {
  return (
    <>
      <path d={d} fill={fill} />
      <path d={d} className="ca-shade" />
    </>
  );
}

/* The six system objects of the 3D world, each drawn about its bottom centre. */
function Rack({ c }: { c: string }) {
  return (
    <>
      <path d="M-10 -34L-4 -38H12L6 -34Z" fill={c} fillOpacity=".55" />
      <rect x="-10" y="-34" width="16" height="34" fill={c} />
      <Side d="M6 -34L12 -38V-4L6 0Z" fill={c} />
      {[-28, -21, -14, -7].map((y) => (
        <rect key={y} x="-7.5" y={y} width="11" height="2.2" rx="1" fill="#fff" fillOpacity=".8" />
      ))}
    </>
  );
}
function Store({ c }: { c: string }) {
  return (
    <>
      <path d="M-14 -20L-8 -24H16L10 -20Z" fill="var(--color-ink-muted)" fillOpacity=".35" />
      <rect x="-14" y="-20" width="24" height="20" fill="#fff" className="ca-edge-ink" />
      <Side d="M10 -20L16 -24V-4L10 0Z" fill="var(--color-sunken)" />
      <path d="M-15 -14H11L9 -9H-13Z" fill={c} />
      <rect x="-11" y="-7" width="9" height="7" fill={c} fillOpacity=".3" />
      <rect x="1" y="-8" width="6" height="8" fill="var(--color-ink)" fillOpacity=".7" />
    </>
  );
}
function Factory({ c }: { c: string }) {
  return (
    <>
      <rect x="7" y="-32" width="4" height="18" fill="var(--color-ink-muted)" />
      <path d="M-16 0V-14L-9 -21V-14L-2 -21V-14L5 -21V-14L12 -14V0Z" fill={c} />
      <Side d="M12 -14L17 -17V-3L12 0Z" fill={c} />
      <rect x="-12" y="-8" width="20" height="4" rx="1" fill="#fff" fillOpacity=".75" />
    </>
  );
}
function Warehouse({ c }: { c: string }) {
  return (
    <>
      <path d="M-16 -15L-3 -23L10 -15Z" fill={c} />
      <rect x="-16" y="-15" width="26" height="15" fill="#fff" className="ca-edge-ink" />
      <Side d="M10 -15L-3 -23L3 -26L16 -18V-4L10 0Z" fill={c} />
      <rect x="-13" y="-10" width="8" height="10" fill="var(--color-ink)" fillOpacity=".7" />
      <rect x="-3" y="-10" width="8" height="10" fill="var(--color-ink)" fillOpacity=".7" />
    </>
  );
}
function Truck({ c }: { c: string }) {
  return (
    <>
      <rect x="-17" y="-15" width="23" height="11" rx="1" fill="#fff" className="ca-edge-ink" />
      <rect x="-12" y="-21" width="7" height="6" fill={c} />
      <rect x="-4" y="-21" width="7" height="6" fill={c} />
      <rect x="7" y="-13" width="9" height="9" rx="1.5" fill={c} />
      <rect x="12" y="-11" width="3" height="3.5" fill="#fff" fillOpacity=".8" />
      {[-12, -4, 12].map((x) => (
        <circle key={x} cx={x} cy="-2.5" r="2.5" fill="var(--color-ink)" />
      ))}
    </>
  );
}
function Globe({ c }: { c: string }) {
  return (
    <>
      <rect x="-7" y="-2.5" width="14" height="2.5" rx="1" fill="var(--color-ink)" fillOpacity=".7" />
      <path d="M0 -3V-8" stroke="var(--color-ink)" strokeOpacity=".7" strokeWidth="1.6" />
      <circle cx="0" cy="-19" r="11" fill="#fff" stroke={c} strokeWidth="1.6" />
      <path d="M-6 -25C-2 -27 3 -24 1 -20S-6 -16 -8 -18Z M3 -15C6 -16 8 -13 6 -11Z" fill={c} />
      <ellipse cx="0" cy="-19" rx="4.5" ry="11" fill="none" stroke={c} strokeOpacity=".45" strokeWidth="1" />
    </>
  );
}

/** 01: six systems, each its own object on the same ground, every link between them broken. */
function Fragmented() {
  const at = [26, 72, 118, 164, 212, 256];
  const top = [38, 24, 32, 26, 21, 30];
  const parts = [Rack, Store, Factory, Warehouse, Truck, Globe];
  return (
    <>
      <path d={`M8 ${GROUND}H272`} className="ca-ground" />
      {at.slice(0, -1).map((x, k) => {
        const x2 = at[k + 1];
        const y1 = GROUND - top[k] - 6;
        const y2 = GROUND - top[k + 1] - 6;
        const mx = (x + x2) / 2;
        const my = Math.min(y1, y2) - 10;
        return (
          <g key={k} className="ca-faint">
            <path d={`M${x} ${y1}Q${x + (mx - x) * 0.5} ${my} ${mx - 5} ${my + 1}`} strokeDasharray="2 3.5" />
            <path d={`M${mx + 5} ${my + 1}Q${x2 - (x2 - mx) * 0.5} ${my} ${x2} ${y2}`} strokeDasharray="2 3.5" />
          </g>
        );
      })}
      {parts.map((Part, k) => (
        <g key={k} transform={`translate(${at[k]} ${GROUND})`}>
          <g className="ca-bob" style={{ ["--i" as string]: k }}>
            <Part c={SYS[k]} />
          </g>
        </g>
      ))}
    </>
  );
}

/** 02: the one crate that matters, on the ground, and the six days until stock breaks safety. */
function Signal() {
  const days = [0, 1, 2, 3, 4, 5].map((k) => 64 + k * 30);
  return (
    <>
      <path d="M20 50H260" className="ca-ground" />
      <g className="ca-bob" style={{ ["--i" as string]: 0 }}>
        <path d="M118 22L130 16H170L158 22Z" className="ca-fill" />
        <path d="M118 22L130 16H170L158 22Z" fill="var(--color-ink)" fillOpacity=".55" />
        {[0, 1, 2, 3].map((k) => (
          <ellipse key={k} cx={131 + k * 8 + (k % 2) * 2} cy={19 + (k % 2) * 1.5} rx="3" ry="1.4" fill="#fff" fillOpacity=".85" />
        ))}
        <rect x="118" y="22" width="40" height="28" rx="1.5" className="ca-fill" />
        <Side d="M158 22L170 16V44L158 50Z" fill="currentColor" />
        {[0, 1, 2].map((k) => (
          <rect key={k} x={124 + k * 10} y="31" width="7" height="10" rx="1" fill="#fff" fillOpacity=".85" />
        ))}
      </g>
      {days.map((x, k) => (
        <g key={k}>
          <rect x={x - 12} y="56" width="24" height="3" rx="1.5" className={k === 5 ? "ca-risk-fill" : "ca-track"} />
          <text x={x} y="74" textAnchor="middle" className={k === 5 ? "ca-risk-text" : undefined}>
            D{k + 1}
          </text>
        </g>
      ))}
      <circle cx="176" cy="12" r="5" className="ca-risk-fill ca-blink" stroke="#fff" strokeWidth="2" />
    </>
  );
}

/** 03: stock falls day by day under the safety line while demand climbs. */
function Problem() {
  const h = [48, 42, 36, 30, 24, 18, 12];
  return (
    <>
      <path d="M18 72H262" className="ca-ground" />
      {h.map((v, k) => (
        <rect
          key={k}
          x={30 + k * 33}
          y={72 - v}
          width="20"
          height={v}
          rx="2.5"
          className={`ca-bar ${k === h.length - 1 ? "ca-risk-fill" : "ca-fill ca-soft"}`}
          style={{ ["--i" as string]: k }}
        />
      ))}
      <path d="M18 50H262" className="ca-risk" strokeDasharray="3 3" />
      <path d="M40 54L73 50L106 45L139 39L172 33L205 26L250 13" className="ca-line ca-draw" pathLength={1} />
      <circle cx="250" cy="13" r="3.5" className="ca-fill" stroke="#fff" strokeWidth="1.5" />
    </>
  );
}

/** 04: every system's fact runs into one checked picture. */
function Context() {
  const at: [number, number][] = [[46, 16], [46, 64], [96, 8], [184, 8], [234, 16], [234, 64]];
  return (
    <>
      {at.map(([x, y], k) => (
        <path key={k} d={`M${x} ${y}L140 40`} className="ca-line ca-flow" strokeWidth="1.2" strokeOpacity=".5" style={{ ["--i" as string]: k }} />
      ))}
      {at.map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r="7" fill="#fff" stroke={SYS[k]} strokeWidth="2" />
      ))}
      <rect x="128" y="28" width="24" height="24" rx="7" className="ca-fill" />
      <path d="M134 40.5l4 4 8-9" className="ca-tick" />
    </>
  );
}

function Plant({ x, label }: { x: number; label: string }) {
  return (
    <g transform={`translate(${x} 28)`}>
      <path d="M0 30V12l9 5V12l9 5V6h14v24z" className="ca-fill ca-soft" />
      <rect x="4" y="21" width="5" height="9" className="ca-fill" />
      <text x="16" y="46" textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

/** 05: the transfer, Plant 02 to Plant 01. */
function Decision({ id }: { id: string }) {
  return (
    <>
      <Plant x={12} label="02" />
      <Plant x={236} label="01" />
      <path id={id} d="M50 58C96 58 108 42 140 42S186 58 230 58" className="ca-line" strokeDasharray="2 5" strokeOpacity=".6" />
      <g className="ca-truck">
        <rect x="-11" y="-6" width="14" height="8" rx="1.5" className="ca-fill" />
        <path d="M3 -4h5l3 3.5v3.5H3z" className="ca-fill" />
        <path d="M3 -4h5l3 3.5v3.5H3z" className="ca-shade" />
        <circle cx="-7" cy="3.5" r="2" fill="var(--color-ink)" />
        <circle cx="7" cy="3.5" r="2" fill="var(--color-ink)" />
        <animateMotion dur="4.5s" repeatCount="indefinite" rotate="auto">
          <mpath href={`#${id}`} />
        </animateMotion>
      </g>
      <rect x="120" y="10" width="40" height="18" rx="9" fill="var(--color-ink)" />
      <text x="140" y="23" textAnchor="middle" className="ca-on">
        240
      </text>
    </>
  );
}

/** 06: the action waits on a named person's approval. */
function Control() {
  return (
    <>
      <rect x="44" y="8" width="156" height="64" rx="9" fill="#fff" className="ca-edge" />
      <rect x="56" y="18" width="70" height="6" rx="3" fill="var(--color-ink)" fillOpacity=".75" />
      <rect x="56" y="29" width="100" height="4" rx="2" className="ca-fill ca-soft" />
      <rect x="56" y="44" width="62" height="18" rx="9" fill="var(--color-ink)" className="ca-press" />
      <text x="87" y="57" textAnchor="middle" className="ca-on">
        Approve
      </text>
      <rect x="124" y="44" width="54" height="18" rx="9" fill="#fff" className="ca-edge" />
      <text x="151" y="57" textAnchor="middle">
        Adjust
      </text>
      <circle cx="232" cy="38" r="17" className="ca-fill ca-soft" />
      <circle cx="232" cy="33" r="5.5" className="ca-fill" />
      <path d="M222 47c2-6 18-6 20 0" className="ca-fill" />
      <circle cx="245" cy="51" r="7" className="ca-fill" stroke="#fff" strokeWidth="2" />
      <path d="M241.5 51l2.5 2.5 4.5-5" className="ca-tick" strokeWidth="1.8" />
    </>
  );
}

/** 07: one layer dealt out as five function cards. */
function Scale() {
  const tones = ["cobalt", "emerald", "tangerine", "pink", "violet"];
  return (
    <>
      {tones.map((t, k) => (
        <g key={t} className="ca-deal" style={{ ["--i" as string]: k }}>
          <g transform={`rotate(${(k - 2) * 5} ${62 + k * 39} 74)`}>
            <rect x={44 + k * 39} y="16" width="36" height="50" rx="5" fill="#fff" className="ca-edge" />
            <circle cx={52 + k * 39} cy="24" r="3" fill={`var(--color-${t})`} />
            <rect x={50 + k * 39} y="32" width="22" height="4" rx="2" fill="var(--color-ink)" fillOpacity=".55" />
            <rect x={50 + k * 39} y="41" width="16" height="3" rx="1.5" fill={`var(--color-${t})`} fillOpacity=".5" />
            <rect x={50 + k * 39} y="49" width="20" height="3" rx="1.5" fill={`var(--color-${t})`} fillOpacity=".5" />
          </g>
        </g>
      ))}
    </>
  );
}

/** 08: the decision card standing on the ground, the industries passing behind it. */
function Industries({ clip }: { clip: string }) {
  const names = INDUSTRIES.map((x) => x.name);
  // Two runs of the names, so the row loops seamlessly (ca-pass moves it by one run).
  const run = names.map((n) => n.length * 6.6 + 18);
  const width = run.reduce((s, w) => s + w + 6, 0);
  let x = 0;
  const chips = [...names, ...names].map((n, k) => {
    const w = run[k % names.length];
    const chip = { n, x, w };
    x += w + 6;
    return chip;
  });
  return (
    <>
      <clipPath id={clip}>
        <rect x="0" y="0" width="280" height="80" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <g className="ca-pass" style={{ ["--run" as string]: `${-width}px` }}>
          {chips.map((c) => (
            <g key={`${c.n}-${c.x}`} transform={`translate(${c.x - 40} 24)`}>
              <rect width={c.w} height="18" rx="9" fill="#fff" className="ca-edge-ink" />
              <text x={c.w / 2} y="13" textAnchor="middle">
                {c.n}
              </text>
            </g>
          ))}
        </g>
      </g>
      <path d="M20 70H260" className="ca-ground" />
      <rect x="128" y="64" width="24" height="6" rx="1.5" fill="var(--color-ink)" fillOpacity=".55" />
      <rect x="104" y="8" width="72" height="56" rx="5" fill="#fff" className="ca-edge" />
      <rect x="112" y="16" width="26" height="7" rx="3.5" className="ca-fill" />
      <rect x="112" y="30" width="54" height="5" rx="2.5" fill="var(--color-ink)" fillOpacity=".75" />
      <rect x="112" y="39" width="40" height="5" rx="2.5" fill="var(--color-ink)" fillOpacity=".75" />
      <rect x="112" y="52" width="30" height="4" rx="2" className="ca-fill ca-soft" />
    </>
  );
}

/** 09: the same six systems, now connected into one approved decision. */
function Decide() {
  const at = [24, 52, 80, 200, 228, 256];
  return (
    <>
      <path d={`M8 ${GROUND}H272`} className="ca-ground" />
      {at.map((x, k) => {
        const y = GROUND - 10;
        return (
          <g key={k}>
            <path
              d={`M${x} ${y}C${x} ${y - 30} ${k < 3 ? 120 : 160} 30 140 30`}
              fill="none"
              stroke={SYS[k]}
              strokeWidth="1.5"
              className="ca-draw"
              pathLength={1}
              style={{ ["--i" as string]: k }}
            />
            <rect x={x - 6} y={y} width="12" height="10" rx="1.5" fill={SYS[k]} />
          </g>
        );
      })}
      <rect x="116" y="14" width="48" height="44" rx="5" fill="#fff" className="ca-edge" />
      <rect x="128" y="58" width="24" height="8" rx="1.5" fill="var(--color-ink)" fillOpacity=".55" />
      <rect x="124" y="22" width="24" height="4" rx="2" fill="var(--color-ink)" fillOpacity=".75" />
      <rect x="124" y="30" width="32" height="3" rx="1.5" fill="var(--color-ink)" fillOpacity=".35" />
      <circle cx="158" cy="48" r="10" fill="var(--color-emerald)" className="ca-pop" />
      <path d="M153.5 48.5l3.2 3.2 6-6.7" className="ca-tick" strokeWidth="2.2" />
    </>
  );
}
