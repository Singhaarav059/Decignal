"use client";

// Working screens that sit beside the story: the live feed of what Decignal reads, the foundation's
// five principles each shown on the screen it governs, and the sheet that walks one application's
// decision end to end.
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { APPLICATIONS, CATEGORY_TONE, READS, STORIES } from "@/lib/content";
import { reel } from "@/lib/reel";
import { getLenis, scrollToTarget } from "../SmoothScroll";

/* ------------------------------------------------------------------ */
/* Live reads: one line, the latest read from the stack                 */
/* ------------------------------------------------------------------ */

export function LiveReads({ on }: { on: boolean }) {
  const [k, setK] = useState(0);
  useEffect(() => {
    if (!on || reel.calm) return;
    const id = window.setInterval(() => setK((v) => v + 1), 2600);
    return () => window.clearInterval(id);
  }, [on]);
  const r = READS[k % READS.length];
  return (
    <p className="r-reads" aria-live="off">
      <span className="r-reads-live">
        <i />
        Reading live
      </span>
      <span className="r-reads-count">{(1284 + k).toLocaleString("en-IN")} reads today</span>
      <span key={k} className="r-reads-line">
        <b>
          {r.sys} · {r.role}
        </b>
        {r.text}
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* The foundation's five screens                                        */
/* ------------------------------------------------------------------ */

function Head({ title, status, tone = "emerald" }: { title: string; status: string; tone?: string }) {
  return (
    <div className="r-demo-head">
      <span>{title}</span>
      <em style={{ "--tone": `var(--color-${tone})` } as React.CSSProperties}>
        <i />
        {status}
      </em>
    </div>
  );
}

export function PrincipleDemo({ i }: { i: number }) {
  if (i === 0)
    return (
      <>
        <Head title="Today · Operations" status="Live" />
        <ul className="r-chat">
          <li>
            Plant 01 falls below safety stock in 6 days.
            <time>09:39</time>
          </li>
          <li data-me>
            Show me the safest action.
            <time>09:40</time>
          </li>
          <li data-rec>
            <small>✦ Decignal recommends</small>
            <b>Move 240 units from Plant 02</b>
            <span>Arrives two days early · no expedite cost</span>
            <span className="r-chat-btn" aria-hidden>
              Approve
            </span>
          </li>
        </ul>
      </>
    );
  if (i === 1)
    return (
      <>
        <Head title="Workflow run · #2841" status="Healthy" />
        <dl className="r-demo-stats">
          <div>
            <dt>Successful runs</dt>
            <dd>1,284</dd>
          </div>
          <div>
            <dt>Needs review</dt>
            <dd>03</dd>
          </div>
          <div>
            <dt>Median response</dt>
            <dd>1m 42s</dd>
          </div>
        </dl>
        <ol className="r-demo-steps">
          {["Signal received", "Data validated", "Policy checked", "Approval routed"].map((x) => (
            <li key={x} data-done>
              <Check size={12} strokeWidth={3} aria-hidden />
              {x}
            </li>
          ))}
          <li>
            <span aria-hidden />
            ERP updated
          </li>
        </ol>
        <p className="r-demo-note">
          <b>↳ Graceful fallback</b> Queue safely and notify operations if the ERP is unavailable.
          <em>Armed</em>
        </p>
      </>
    );
  if (i === 2)
    return (
      <>
        <Head title="Access policy · Inventory agent" status="Enforced" tone="cobalt" />
        <p className="r-demo-req">
          <b>Recommendation requested</b>
          Plant 01 · stock transfer
        </p>
        <ul className="r-demo-rows">
          {(
            [
              ["ok", "ERP inventory", "Plants 01–02", "Allowed"],
              ["ok", "WMS movements", "Regional scope", "Allowed"],
              ["review", "Execute transfer", "Human approval required", "Review"],
              ["no", "Customer PII", "Outside purpose", "Blocked"],
            ] as const
          ).map(([k, a, b, c]) => (
            <li key={a} data-k={k}>
              <i aria-hidden>{k === "ok" ? "✓" : k === "review" ? "!" : "—"}</i>
              <span>
                <b>{a}</b>
                {b}
              </span>
              <em>{c}</em>
            </li>
          ))}
        </ul>
      </>
    );
  if (i === 3)
    return (
      <>
        <Head title="Decision record · TRF-0240" status="Complete" />
        <p className="r-demo-req">
          <b>Transfer 240 units to Plant 01</b>
          SKU 4471 · stock-risk response
        </p>
        <ol className="r-demo-time">
          {[
            ["09:38", "Signal detected", "Safety threshold crossed"],
            ["09:40", "Recommendation created", "6 sources and policy linked"],
            ["09:42", "Approved by Priya S.", "Inventory control lead"],
            ["09:43", "ERP transfer created", "TR-10482 · successful"],
          ].map(([t, a, b]) => (
            <li key={t}>
              <time>{t}</time>
              <span>
                <b>{a}</b>
                {b}
              </span>
            </li>
          ))}
        </ol>
      </>
    );
  return (
    <>
      <Head title="Deployment control · v1.4" status="12 live sites" tone="violet" />
      <dl className="r-demo-stats r-demo-stats-2">
        <div>
          <dt>Workflows today</dt>
          <dd>1,284</dd>
        </div>
        <div>
          <dt>Shared policies</dt>
          <dd>08</dd>
        </div>
      </dl>
      <ul className="r-demo-sites">
        {[
          ["Pune", "Live"],
          ["Chennai", "Live"],
          ["Nairobi", "Deploying"],
          ["Lagos", "Ready"],
        ].map(([c, st], n) => (
          <li key={c} data-st={st.toLowerCase()}>
            <span>0{n + 1}</span>
            {c}
            <em>{st}</em>
          </li>
        ))}
      </ul>
      <div className="r-demo-bar">
        <p>
          Deploying shared workflow to Nairobi <b>72%</b>
        </p>
        <span>
          <i style={{ width: "72%" }} />
        </span>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* One application, end to end                                          */
/* ------------------------------------------------------------------ */

export function StorySheet({ i, onClose, onPick }: { i: number; onClose: () => void; onPick: (i: number) => void }) {
  const app = APPLICATIONS[i];
  const st = STORIES[i];
  const close = useRef<HTMLButtonElement>(null);
  // The page re-renders as it scrolls behind the sheet: keep the latest close without re-running the effect.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    const lenis = getLenis();
    lenis?.stop();
    close.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lenis?.start();
      back?.focus({ preventScroll: true });
    };
  }, []);
  const next = (i + 1) % APPLICATIONS.length;
  return (
    <div className="r-sheet-wrap" style={{ "--tone": `var(--color-${CATEGORY_TONE[app.category]})` } as React.CSSProperties}>
      <div className="r-sheet-scrim" onClick={onClose} aria-hidden />
      <aside className="r-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" data-lenis-prevent>
        <div className="r-sheet-top">
          <p className="r-eyebrow">
            {app.category} · {st.asset}
          </p>
          <button ref={close} className="r-sheet-x" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <h2 id="sheet-title" className="r-sheet-app">
          {app.name}
        </h2>
        <p className="r-display r-sheet-head">
          {st.headline.split("\n").map((l) => (
            <span key={l}>{l}</span>
          ))}
        </p>
        <ol className="r-sheet-beats" aria-label="How it decides">
          {st.beats.map((b, n) => (
            <li key={b}>
              <span>0{n + 1}</span>
              {b}
            </li>
          ))}
        </ol>
        <dl className="r-sheet-flow">
          {(
            [
              ["Signal", st.signal],
              ["Evidence", st.evidence],
              ["Action", st.action],
              ["Result", st.result],
            ] as const
          ).map(([k, v]) => (
            <div key={k} data-k={k.toLowerCase()}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <dl className="r-sheet-readings">
          {st.readings.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="r-sheet-meta">
          <span>
            <b>Outcome</b> {st.metric}
          </span>
          <span>
            <b>Live in</b> {app.weeks} weeks
          </span>
          <span>
            <b>Reads</b> {st.sources}
          </span>
          <span>
            <b>Connects to</b> {app.connects.join(", ")}
          </span>
        </p>
        <div className="r-sheet-actions">
          <button
            className="r-btn r-btn-dark"
            onClick={() => {
              onClose();
              window.setTimeout(() => scrollToTarget("#audit"), 60);
            }}
          >
            Discuss this application <ArrowRight size={16} strokeWidth={2} />
          </button>
          <button className="r-link" onClick={() => onPick(next)}>
            Next: {APPLICATIONS[next].name} <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
        <p className="r-note">Illustrative scenario.</p>
      </aside>
    </div>
  );
}
