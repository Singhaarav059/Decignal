import { ArrowUpRight } from "lucide-react";
import { appsOf, type Area } from "@/lib/areas";
import { CTA, SCALE } from "@/lib/copy";
import { toneVars } from "@/lib/tone";
import { AreaArt } from "../sections/AreaArt";
import { SectionLink } from "../ui/SectionLink";

/**
 * The business functions as real links to their pages: tone dot, name, proposed-workflow line and lead.
 * With `art` (the /solutions hub) each card leads with the function's drawing, and the first takes a
 * wide card with its drawing beside the copy.
 */
export function AreaLinks({ areas, cta = "area-link", art = false }: { areas: Area[]; cta?: string; art?: boolean }) {
  return (
    <ul className="svc-areas" data-count={areas.length} data-art={art ? "" : undefined}>
      {areas.map((a, i) => (
        <li key={a.slug} data-reveal style={{ ["--i" as string]: i }}>
          <SectionLink href={`/solutions/${a.slug}`} className="svc-area card" data-interactive="" data-cta={cta} style={toneVars(a.tone)}>
            {art && (
              <span className="svc-area-art">
                <AreaArt area={a.name} />
              </span>
            )}
            <span className="svc-area-body">
              <span className="svc-area-top">
                <span className="svc-dot" aria-hidden />
                <span className="t-label">{SCALE.apps(appsOf(a).length)}</span>
              </span>
              <strong className="t-subtitle">{a.name}</strong>
              <span className="t-small svc-area-lead">{a.lead}</span>
              {art && i === 0 && (
                <span className="svc-area-apps">
                  {appsOf(a).map((x) => (
                    <span key={x.name} className="t-small">
                      <span className="svc-dot" aria-hidden />
                      {x.name}
                    </span>
                  ))}
                </span>
              )}
              <span className="svc-area-go t-small">
                {CTA.explore(a.name)}
                <ArrowUpRight size={15} strokeWidth={2.2} aria-hidden />
              </span>
            </span>
          </SectionLink>
        </li>
      ))}
    </ul>
  );
}
