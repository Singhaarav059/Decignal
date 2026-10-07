import { useId } from "react";

/** Line art for each business area, drawn in white on the area's colour, with a little motion. */
export function AreaArt({ area }: { area: string }) {
  return (
    <svg className="area-art" viewBox="0 0 360 150" aria-hidden>
      {area === "Supply Chain" && <SupplyChain />}
      {area === "Operations" && <Operations />}
      {area === "Commercial" && <Commercial />}
      {area === "Customer" && <Customer />}
      {area === "Finance & Risk" && <Finance />}
    </svg>
  );
}

function Plant({ x, label }: { x: number; label: string }) {
  return (
    <g transform={`translate(${x} 34)`}>
      <path d="M0 62V26l18 10V26l18 10V18h26v44z" className="fill-soft" />
      <path d="M44 18V2h8v16" className="line" />
      <circle cx="48" cy="-6" r="4" className="puff" />
      <rect x="8" y="46" width="10" height="16" className="fill" />
      <text x="31" y="80" textAnchor="middle">{label}</text>
    </g>
  );
}

/** A path id unique to this drawing: the same art also appears in the nav's glance. */
const useSvgId = (name: string) => `${name}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

function SupplyChain() {
  const road = useSvgId("road");
  return (
    <>
      <Plant x={6} label="PLANT 02" />
      <Plant x={290} label="PLANT 01" />
      <path id={road} d="M74 96 C 140 96, 150 60, 210 60 S 260 96, 290 96" className="line dash" />
      <g className="truck">
        <rect x="-16" y="-9" width="20" height="12" rx="2" className="fill" />
        <path d="M4 -6h7l4 5v4H4z" className="fill" />
        <circle cx="-10" cy="5" r="2.6" className="wheel" />
        <circle cx="10" cy="5" r="2.6" className="wheel" />
        <animateMotion dur="5s" repeatCount="indefinite" rotate="auto">
          <mpath href={`#${road}`} />
        </animateMotion>
      </g>
      <g transform="translate(188 108)">
        <rect width="44" height="22" rx="6" className="tag" />
        <text x="22" y="15" textAnchor="middle" className="tag-text">240 u</text>
      </g>
    </>
  );
}

function Operations() {
  return (
    <>
      <rect x="10" y="98" width="250" height="10" rx="5" className="fill-soft" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={22 + i * 45} cy="103" r="3" className="wheel" />
      ))}
      <g className="belt">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 60} y="78" width="22" height="20" rx="3" className="fill" />
        ))}
      </g>
      <g transform="translate(300 62)">
        <g className="gear">
          <path d="M0-26l5 6 8-2 1 8 7 4-4 7 4 7-7 4-1 8-8-2-5 6-5-6-8 2-1-8-7-4 4-7-4-7 7-4 1-8 8 2z" className="fill-soft" />
          <circle r="8" className="hole" />
        </g>
      </g>
      <path d="M14 52 L54 46 L84 50 L118 30 L150 38 L186 18" className="line spark" pathLength={1} />
      <circle cx="186" cy="18" r="4" className="dot-alert" />
    </>
  );
}

function Commercial() {
  const bars = [34, 48, 40, 62, 56, 80, 92];
  return (
    <>
      <path d="M10 120H230" className="line faint" />
      {bars.map((h, i) => (
        <rect key={i} x={16 + i * 30} y={120 - h} width="18" height={h} rx="4" className="fill bar" style={{ ["--i" as string]: i }} />
      ))}
      <path d="M25 92 L55 78 L85 84 L115 62 L145 66 L175 44 L205 30" className="line" />
      <g transform="translate(262 34) rotate(-8)">
        <path d="M0 0h52l18 22-18 22H0z" className="fill-soft" />
        <circle cx="56" cy="22" r="4" className="hole" />
        <text x="24" y="27" textAnchor="middle" className="tag-text dark">+12%</text>
      </g>
      <circle cx="300" cy="118" r="14" className="ring" />
      <circle cx="300" cy="118" r="5" className="fill" />
    </>
  );
}

function Customer() {
  const bubbles = Array.from({ length: 14 }, (_, i) => ({ x: 16 + (i % 7) * 30, y: 22 + Math.floor(i / 7) * 56 + (i % 2) * 10 }));
  return (
    <>
      {bubbles.map((b, i) => (
        <g key={i}>
          <path d={`M${b.x + 22} ${b.y + 10} C ${b.x + 120} ${b.y + 10}, 230 75, 284 75`} className="line faint" />
          <g className="bubble" style={{ ["--i" as string]: i }}>
            <rect x={b.x} y={b.y} width="22" height="16" rx="5" className="fill" />
            <path d={`M${b.x + 5} ${b.y + 16}l-2 5 7-5`} className="fill" />
          </g>
        </g>
      ))}
      <circle cx="306" cy="75" r="30" className="ring pulse-ring" />
      <circle cx="306" cy="75" r="22" className="fill" />
      <path d="M296 75l7 7 13-14" className="check" />
    </>
  );
}

function Finance() {
  const rows = [true, true, false, true];
  return (
    <>
      <rect x="10" y="12" width="210" height="122" rx="12" className="fill-soft" />
      {rows.map((ok, i) => (
        <g key={i} transform={`translate(24 ${30 + i * 26})`} className="ledger" style={{ ["--i" as string]: i }}>
          <rect width="90" height="8" rx="4" className="fill" />
          <rect x="102" width="50" height="8" rx="4" className="fill faint-fill" />
          {ok ? <path d="M170 4l4 4 8-8" className="check small" /> : <circle cx="176" cy="4" r="5" className="dot-alert" />}
        </g>
      ))}
      <g transform="translate(290 74)">
        <path d="M0-44l34 12v26c0 24-16 40-34 48-18-8-34-24-34-48v-26z" className="fill-soft shield" />
        <path d="M-12 0l9 9 17-19" className="check" />
      </g>
    </>
  );
}
