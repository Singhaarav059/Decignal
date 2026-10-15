"use client";

import { useEffect, useMemo, useState } from "react";
import { AREAS, appHref } from "@/lib/areas";
import { APPLICATIONS, CATEGORY_TONE, INDUSTRY_KEYS, type IndustryKey } from "@/lib/content";
import { CTA, SOLUTIONS_INDEX } from "@/lib/copy";
import { toneVars } from "@/lib/tone";
import { jumpTo } from "@/lib/jump";
import SegmentedControl from "../ui/SegmentedControl";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";
import { AppRecord } from "./AppRecord";

const ALL = "all";
type Fn = (typeof AREAS)[number]["slug"] | typeof ALL;
type Ind = IndustryKey | typeof ALL;

const isFn = (v: string | null): v is Fn => v === ALL || AREAS.some((a) => a.slug === v);
const isInd = (v: string | null): v is Ind => v === ALL || (INDUSTRY_KEYS as readonly string[]).includes(v ?? "");

/**
 * The application directory (handoff §6): every record, filtered by business function and industry.
 * The server renders all fifteen; on load `?industry=` and `?function=` narrow them (an unknown value
 * falls back to all), and each change writes them back to the address without a reload.
 */
export function AppDirectory() {
  const [fn, setFn] = useState<Fn>(ALL);
  const [ind, setInd] = useState<Ind>(ALL);

  useEffect(() => {
    // The address sets the filters: after hydration (the server's render shows everything, so links and
    // crawlers see all), on back and forward, and when a link on this page (the industry cards) changes
    // only the query. A soft navigation would keep this component mounted and leave the filters stale.
    // A value that is missing or unknown falls back to all.
    const read = () => {
      const q = new URLSearchParams(window.location.search);
      const f = q.get("function");
      const i = q.get("industry");
      setFn(isFn(f) ? f : ALL);
      setInd(isInd(i) ? i : ALL);
    };
    read();
    // A client navigation from another page may commit the new address after this effect runs.
    const raf = requestAnimationFrame(read);
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.search || url.hash) return;
      e.preventDefault();
      history.pushState(history.state, "", `${url.pathname}${url.search}`);
      read();
      void jumpTo("#applications", { focus: false });
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", read);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", read);
    };
  }, []);

  const pick = (nextFn: Fn, nextInd: Ind) => {
    setFn(nextFn);
    setInd(nextInd);
    const q = new URLSearchParams();
    if (nextInd !== ALL) q.set("industry", nextInd);
    if (nextFn !== ALL) q.set("function", nextFn);
    const s = q.toString();
    history.replaceState(history.state, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
  };

  const shown = useMemo(
    () =>
      APPLICATIONS.filter(
        (a) => (fn === ALL || AREAS.find((x) => x.slug === fn)?.category === a.category) && (ind === ALL || a.industries.includes(ind)),
      ),
    [fn, ind],
  );

  return (
    <div className="dir">
      <div className="dir-filters">
        <div className="dir-filter">
          <p className="t-label dir-filter-label" id="dir-fn">
            {SOLUTIONS_INDEX.filterLabel}
          </p>
          <SegmentedControl
            label={SOLUTIONS_INDEX.filterLabel}
            items={[
              { value: ALL as Fn, label: SOLUTIONS_INDEX.allFilter },
              ...AREAS.map((a) => ({ value: a.slug as Fn, label: a.name, tone: a.tone })),
            ]}
            value={fn}
            onChange={(v) => pick(v, ind)}
            size="sm"
            className="dir-tabs"
          />
        </div>
        <div className="dir-filter">
          <p className="t-label dir-filter-label">{SOLUTIONS_INDEX.industryLabel}</p>
          <SegmentedControl
            label={SOLUTIONS_INDEX.industryLabel}
            items={[
              { value: ALL as Ind, label: SOLUTIONS_INDEX.allIndustries },
              ...INDUSTRY_KEYS.map((k) => ({ value: k as Ind, label: SOLUTIONS_INDEX.industries[k] })),
            ]}
            value={ind}
            onChange={(v) => pick(fn, v)}
            size="sm"
            className="dir-tabs"
          />
        </div>
        <p className="t-small dir-count" aria-live="polite">
          {SOLUTIONS_INDEX.count(shown.length)}
        </p>
      </div>

      {shown.length ? (
        <ol className="svc-app-list dir-list">
          {shown.map((a) => (
            <li key={a.id} className="card svc-app" style={toneVars(CATEGORY_TONE[a.category])}>
              <AppRecord app={a} label={a.category} />
              <SectionLink href={appHref(a)} className="ed-link svc-app-cta">
                {CTA.explore(a.category)}
                <Arrow />
              </SectionLink>
            </li>
          ))}
        </ol>
      ) : (
        <div className="dir-empty card">
          <p className="t-body">{SOLUTIONS_INDEX.empty}</p>
          <div className="dir-empty-actions">
            <button type="button" className="btn btn-ghost" onClick={() => pick(ALL, ALL)}>
              {SOLUTIONS_INDEX.reset}
            </button>
            <SectionLink href={CTA.href} className="ed-link">
              {CTA.primary}
              <Arrow />
            </SectionLink>
          </div>
        </div>
      )}
    </div>
  );
}
