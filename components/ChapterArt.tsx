import { useId } from "react";

/** A small drawing of what happens in each story chapter, for the chapter glance in the nav. Drawn
 *  in the chapter's colour (currentColor), with the system colours where the chapter is about them.
 *  CSS motion runs only while the tile is pointed at or is the chapter being read (see .ca-*
 *  styles); the truck and turntable follow SVG motion paths. */
export function ChapterArt({ i }: { i: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg className="chapter-art" viewBox="0 0 280 80" aria-hidden>
      {i === 0 && <Fragmented />}
      {i === 1 && <Signal />}
      {i === 2 && <Problem />}
      {i === 3 && <Context />}
      {i === 4 && <Decision id={`ca-road-${uid}`} />}
      {i === 5 && <Control />}
      {i === 6 && <Scale />}
      {i === 7 && <Industries id={`ca-rim-${uid}`} />}
      {i === 8 && <Decide />}
    </svg>
  );
}

const SYS = ["cobalt", "violet", "emerald", "saffron", "tangerine", "pink"].map((c) => `var(--color-${c})`);

/** 01: six systems as pucks, each link broken halfway. */
function Fragmented() {
  const at: [number, number][] = [[42, 26], [112, 18], [180, 28], [242, 20], [74, 60], [206, 60]];
  const links: [number, number][] = [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [2, 5]];
  return (
    <>
      {links.map(([a, b]) => {
        const [x1, y1] = at[a], [x2, y2] = at[b];
        const m = (t: number) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
        const [ax, ay] = m(0.36), [bx, by] = m(0.64);
        return (
          <g key={`${a}${b}`} className="ca-faint">
            <path d={`M${x1} ${y1}L${ax} ${ay}M${bx} ${by}L${x2} ${y2}`} strokeDasharray="2 4" />
          </g>
        );
      })}
      {at.map(([x, y], k) => (
        <g key={k} className="ca-bob" style={{ ["--i" as string]: k }}>
          <ellipse cx={x} cy={y + 3.5} rx="17" ry="6.5" fill={SYS[k]} />
          <ellipse cx={x} cy={y} rx="17" ry="6.5" fill="#fff" stroke={SYS[k]} strokeWidth="1.4" />
        </g>
      ))}
    </>
  );
}

/** 02: the one crate that matters, pulsing. */
function Signal() {
  return (
    <>
      {[0, 1, 2].map((k) => (
        <ellipse key={k} className="ca-ring" style={{ ["--i" as string]: k }} cx="140" cy="60" rx={34 + k * 26} ry={8 + k * 5} />
      ))}
      <rect x="116" y="26" width="48" height="32" rx="4" className="ca-fill" />
      <rect x="112" y="21" width="56" height="8" rx="2.5" className="ca-fill ca-dark" />
      {[0, 1, 2].map((k) => (
        <rect key={k} x={124 + k * 12} y="40" width="8" height="10" rx="1.5" fill="#fff" fillOpacity=".85" />
      ))}
      <circle cx="170" cy="18" r="5.5" className="ca-fill ca-blink" stroke="#fff" strokeWidth="2" />
    </>
  );
}

/** 03: stock falls day by day under the safety line while demand climbs. */
function Problem() {
  const h = [48, 42, 36, 30, 24, 18, 12];
  return (
    <>
      <path d="M18 72H262" className="ca-faint" />
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
    <g transform={`translate(${x} 30)`}>
      <path d="M0 30V12l9 5V12l9 5V6h14v24z" className="ca-fill ca-soft" />
      <rect x="4" y="21" width="5" height="9" className="ca-fill" />
      <text x="16" y="44" textAnchor="middle">{label}</text>
    </g>
  );
}

/** 05: the transfer, Plant 02 to Plant 01. */
function Decision({ id }: { id: string }) {
  return (
    <>
      <Plant x={12} label="02" />
      <Plant x={236} label="01" />
      <path id={id} d="M50 60C96 60 108 42 140 42S186 60 230 60" className="ca-line" strokeDasharray="2 5" strokeOpacity=".6" />
      <g className="ca-truck">
        <rect x="-11" y="-6" width="14" height="8" rx="1.5" className="ca-fill" />
        <path d="M3 -4h5l3 3.5v3.5H3z" className="ca-fill ca-dark" />
        <circle cx="-7" cy="3.5" r="2" fill="var(--color-ink)" />
        <circle cx="7" cy="3.5" r="2" fill="var(--color-ink)" />
        <animateMotion dur="4.5s" repeatCount="indefinite" rotate="auto">
          <mpath href={`#${id}`} />
        </animateMotion>
      </g>
      <rect x="124" y="12" width="32" height="14" rx="7" fill="var(--color-ink)" />
      <text x="140" y="22" textAnchor="middle" className="ca-on">240</text>
    </>
  );
}

/** 06: the action waits on a named person's approval. */
function Control() {
  return (
    <>
      <rect x="60" y="10" width="140" height="60" rx="9" fill="#fff" className="ca-edge" />
      <rect x="72" y="20" width="70" height="6" rx="3" fill="var(--color-ink)" fillOpacity=".75" />
      <rect x="72" y="31" width="100" height="4" rx="2" className="ca-fill ca-soft" />
      <rect x="72" y="49" width="44" height="13" rx="6.5" fill="var(--color-ink)" className="ca-press" />
      <text x="94" y="58" textAnchor="middle" className="ca-on">Approve</text>
      <rect x="121" y="49" width="34" height="13" rx="6.5" fill="#fff" className="ca-edge" />
      <text x="138" y="58" textAnchor="middle">Adjust</text>
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
          <rect x={44 + k * 39} y="16" width="36" height="6" rx="3" fill={`var(--color-${t})`} />
          <rect x={50 + k * 39} y="30" width="22" height="4" rx="2" fill="var(--color-ink)" fillOpacity=".55" />
          <rect x={50 + k * 39} y="39" width="16" height="3" rx="1.5" fill={`var(--color-${t})`} fillOpacity=".5" />
          <rect x={50 + k * 39} y="47" width="20" height="3" rx="1.5" fill={`var(--color-${t})`} fillOpacity=".5" />
          </g>
        </g>
      ))}
    </>
  );
}

/** 08: one card on a turntable, industries passing round its rim. */
function Industries({ id }: { id: string }) {
  return (
    <>
      <ellipse cx="140" cy="60" rx="92" ry="15" className="ca-fill ca-dark" />
      <ellipse cx="140" cy="56" rx="92" ry="15" className="ca-fill ca-soft2" />
      <path id={id} d="M48 56a92 15 0 1 0 184 0a92 15 0 1 0 -184 0" fill="none" />
      {[0, 1, 2, 3].map((k) => (
        <circle key={k} r="3.5" fill={SYS[k + 1]} stroke="#fff" strokeWidth="1.5">
          <animateMotion dur="8s" begin={`${-k * 2}s`} repeatCount="indefinite">
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      ))}
      <rect x="116" y="10" width="48" height="40" rx="5" fill="#fff" className="ca-edge" />
      <rect x="123" y="17" width="20" height="5" rx="2.5" className="ca-fill" />
      <rect x="123" y="27" width="34" height="4" rx="2" fill="var(--color-ink)" fillOpacity=".55" />
      <rect x="123" y="35" width="26" height="3" rx="1.5" className="ca-fill ca-soft" />
    </>
  );
}

/** 09: every source resolves into one approved decision. */
function Decide() {
  return (
    <>
      {SYS.map((c, k) => {
        const y = 10 + k * 12;
        return (
          <g key={k}>
            <path d={`M34 ${y}C120 ${y} 150 40 222 40`} fill="none" stroke={c} strokeWidth="1.5" className="ca-draw" pathLength={1} style={{ ["--i" as string]: k }} />
            <circle cx="34" cy={y} r="4" fill={c} />
          </g>
        );
      })}
      <circle cx="232" cy="40" r="14" fill="var(--color-emerald)" className="ca-pop" />
      <path d="M225.5 40.5l4.5 4.5 8.5-9.5" className="ca-tick" strokeWidth="2.4" />
    </>
  );
}
