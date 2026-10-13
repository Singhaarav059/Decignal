import { GLANCE } from "@/lib/copy";

/**
 * Decignal in five facts, as one band under the trail: a figure in ink and what it counts.
 * The sentence behind each figure opens on hover or focus where there is a pointer, and reads inline
 * on touch screens. Neutral chrome (D6): the figures carry no system meaning, so no tone dots.
 */
export function GlanceList() {
  return (
    <dl className="glance-band">
      {GLANCE.map((g, i) => (
        <div key={g.label} className="glance-cell" tabIndex={0} aria-describedby={`glance-d-${i}`}>
          <dt>
            <span className="glance-num t-num-md">{g.n}</span>
            <span className="glance-label">{g.label}</span>
          </dt>
          <dd id={`glance-d-${i}`} className="glance-text">{g.text}</dd>
        </div>
      ))}
    </dl>
  );
}
