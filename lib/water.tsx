/** The brand's water fill (app/styles/chrome.css .water) for the share images and icons, drawn as one SVG
 *  for Satori: light cobalt from the bottom up to `level` (0 to 1 of the height), a wave on its surface. */
export const WATER = "#ABBDFF";

export function WaterFill({ w, h, level = 0.5, period = 28, amp = 3, color = WATER }: { w: number; h: number; level?: number; period?: number; amp?: number; color?: string }) {
  const y = h * (1 - level);
  let d = `M0 ${y}`;
  for (let x = 0; x < w + period; x += period) d += `Q${x + period / 4} ${y - amp} ${x + period / 2} ${y}T${x + period} ${y}`;
  d += `V${h}H0z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", left: 0, top: 0 }}>
      <path d={d} fill={color} />
    </svg>
  );
}
