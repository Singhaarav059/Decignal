/**
 * What each measure counts, drawn above its column in #outcomes (Editorial.tsx Measure): the parts of
 * the task the time covers, the three kinds of miss the accuracy tallies, and the loop rework is.
 * Method, not results: no figures, since customer results are published only once verified.
 * Strokes draw and parts rise as the column scrolls in (CSS view timeline, decor-art.css .ma-*).
 */
const TIME = ["Retrieve", "Prepare", "Correct", "Review"];
const TIME_W = [78, 86, 58, 64];
/** Each segment's left edge, 4 apart. */
const TIME_X = TIME_W.map((_, i) => TIME_W.slice(0, i).reduce((a, w) => a + w + 4, 0));
const ACCURACY = ["Missed", "Mismatch", "Unneeded flag"];
const REWORK = ["Corrected", "Requested again"];

export function MeasureArt({ k }: { k: number }) {
  if (k === 0) {
    return (
      <svg className="measure-art" viewBox="0 0 300 96" aria-hidden>
        <path className="ma-line ma-draw" pathLength={1} d="M1 14V24H299V14" />
        <text className="ma-soft" x="150" y="10" textAnchor="middle">Whole task</text>
        {TIME.map((t, i) => {
          const w = TIME_W[i];
          const at = TIME_X[i];
          return (
            <g key={t} className="ma-rise" style={{ ["--i" as string]: i }}>
              <rect x={at} y="36" width={w} height="26" rx="6" className="ma-fill" style={{ opacity: 1 - i * 0.18 }} />
              <text className="ma-ink" x={at + 8} y="84">{t}</text>
            </g>
          );
        })}
      </svg>
    );
  }
  if (k === 1) {
    return (
      <svg className="measure-art" viewBox="0 0 300 96" aria-hidden>
        <path className="ma-line ma-draw" pathLength={1} d="M0 49H300" />
        {ACCURACY.map((t, i) => {
          const cx = 34 + i * 116;
          return (
            <g key={t} className="ma-rise" style={{ ["--i" as string]: i }}>
              <circle cx={cx} cy="49" r="20" className={i === 0 ? "ma-ring" : "ma-disc"} />
              {i === 0 && <path className="ma-mark-ink" d={`M${cx - 6} 43l12 12m0-12-12 12`} />}
              {i === 1 && <path className="ma-mark" d={`M${cx - 8} 45h16m-16 8h16m-3-14-10 20`} />}
              {i === 2 && <path className="ma-mark" d={`M${cx - 5} 59V39m0 1h11l-3 5 3 5H${cx - 5}`} />}
              <text className="ma-ink" x={cx} y="90" textAnchor="middle">{t}</text>
            </g>
          );
        })}
      </svg>
    );
  }
  return (
    <svg className="measure-art" viewBox="0 0 300 96" aria-hidden>
      {REWORK.map((t, i) => {
        const x = i === 0 ? 20 : 196;
        return (
          <g key={t} className="ma-rise" style={{ ["--i" as string]: i * 2 }}>
            <path className="ma-doc" d={`M${x} 18h${i ? 40 : 46}l12 12v34H${x}Z`} />
            <path className="ma-mark-ink" d={`M${x + 10} 38h28m-28 8h20m-20 8h24`} />
            <text className="ma-ink" x={x + 29} y="90" textAnchor="middle">{t}</text>
          </g>
        );
      })}
      <path className="ma-loop ma-draw" pathLength={1} d="M90 30C130 6 158 6 190 26" />
      <path className="ma-loop ma-draw" pathLength={1} d="M190 58C158 80 130 80 92 60" style={{ ["--i" as string]: 1 }} />
      <path className="ma-head ma-rise" d="M184 19l7 7-9 3" style={{ ["--i" as string]: 3 }} />
      <path className="ma-head ma-rise" d="M98 67l-7-7 9-3" style={{ ["--i" as string]: 3 }} />
    </svg>
  );
}
