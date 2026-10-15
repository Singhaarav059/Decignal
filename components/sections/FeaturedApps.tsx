import { CATEGORY_TONE, FEATURED } from "@/lib/content";
import { appHref } from "@/lib/areas";
import { APPLICATIONS_COPY } from "@/lib/copy";
import { toneVars } from "@/lib/tone";
import { Arrow } from "../ui/Arrow";

/**
 * The six featured applications as equal cards (handoff §5 applications): function, title, summary and
 * a link to the record on its function page. The same records drive the 3D explorer below.
 */
export function FeaturedApps() {
  return (
    <ul className="feature-cards" aria-label={APPLICATIONS_COPY.listAria}>
      {FEATURED.map((a, i) => (
        <li key={a.id} data-reveal className="feature-card" style={{ ...toneVars(CATEGORY_TONE[a.category]), ["--i" as string]: i }}>
          <p className="feature-card-k t-label">
            <i aria-hidden />
            {a.category}
          </p>
          <h3 className="t-subtitle feature-card-title">
            <a href={appHref(a)} className="feature-card-link">
              {a.name}
            </a>
          </h3>
          <p className="t-small feature-card-text">{a.text}</p>
          <span className="feature-card-go t-small" aria-hidden>
            {APPLICATIONS_COPY.open}
            <Arrow />
          </span>
        </li>
      ))}
    </ul>
  );
}
