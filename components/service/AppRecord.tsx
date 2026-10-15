import { ChevronDown } from "lucide-react";
import type { Application } from "@/lib/content";
import { APPLICATIONS_COPY, SERVICE } from "@/lib/copy";

/** One application record as a card: title, summary and who it is for; the full record opens in place.
 *  The card's id is the record id, the anchor every link to this application uses. */
export function AppRecord({ app, label, heading = "h3" }: { app: Application; label: string; heading?: "h2" | "h3" }) {
  const L = APPLICATIONS_COPY.labels;
  const H = heading;
  const fields: [string, string][] = [
    [L.example, app.example],
    [L.data, app.data],
    [L.output, app.output],
    [L.owner, app.reviewer],
    [L.measure, app.measure],
  ];
  return (
    <>
      <p className="t-label">
        <span className="svc-dot" aria-hidden /> {label}
      </p>
      <H className="t-title-card">{app.name}</H>
      <p className="t-body svc-app-line">{app.text}</p>
      <p className="t-small svc-app-fit">
        <span className="t-label">{L.fit}</span> {app.fit}
      </p>
      <details className="svc-app-more">
        <summary className="t-small">
          <span className="svc-app-more-open">{SERVICE.more}</span>
          <span className="svc-app-more-shut">{SERVICE.less}</span>
          <ChevronDown size={14} strokeWidth={2.2} aria-hidden />
        </summary>
        <dl className="svc-app-fields">
          {fields.map(([k, v]) => (
            <div key={k}>
              <dt className="t-label">{k}</dt>
              <dd className="t-small">{v}</dd>
            </div>
          ))}
        </dl>
      </details>
    </>
  );
}
