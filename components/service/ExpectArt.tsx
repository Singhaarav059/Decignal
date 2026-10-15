"use client";

import type { CSSProperties, ReactNode } from "react";
import { APP_FACTS, EXAMPLE, inr } from "@/lib/example";
import { toneVars } from "@/lib/tone";
import { Tick, useServiceArt } from "./ArtKit";

/**
 * "Where the manual work remains": one small drawing per problem, in the function's tone (inherited from
 * main.svc), index-aligned with area.expect. Five kinds of picture recur across the functions: records
 * in several places, two references that disagree, a change left in a message, a check done again for
 * every case, and a question found late. Records keep their source's colour; a conflict is signal red.
 */
export function ExpectArt({ slug, index }: { slug: string; index: number }) {
  const ref = useServiceArt(W, H);
  const body = (ART[slug] ?? ART["supply-chain"])[index];
  return (
    <svg ref={ref} className="svc-art xa" viewBox={`0 0 ${W} ${H}`} aria-hidden>
      {body}
    </svg>
  );
}

const W = 240;
const H = 104;
const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as CSSProperties;

/* ---------------------------------------------------------------- the five pictures */

/** Records spread over three places, each a folder with its documents, one still missing. */
function Scattered({ places, missing }: { places: [string, string][]; missing: number }) {
  return (
    <>
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="10" className="k-sheet" />
      {places.map(([label, tone], i) => {
        const x = 14 + i * 76;
        return (
          <g key={label} style={{ ...toneVars(tone), ...d(120 + i * 120) }}>
            <path d={`M${x} 26h18l5 6h37v40H${x}z`} className="k-soft-fill k-rise" />
            {[0, 1].map((k) => (
              <rect
                key={k}
                x={x + 8 + k * 22}
                y="40"
                width="16"
                height="22"
                rx="2"
                className={i === missing && k === 1 ? "k-missing" : "k-fill k-pop"}
                style={d(300 + i * 120 + k * 60)}
              />
            ))}
            <text x={x} y="91">{label}</text>
          </g>
        );
      })}
    </>
  );
}

/** Two references side by side that should match and do not; neither is corrected. */
function Mismatch({ left, right, a, b }: { left: string; right: string; a: string; b: string }) {
  return (
    <>
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="10" className="k-sheet" />
      <text x="16" y="24">{left}</text>
      <text x={W - 16} y="24" textAnchor="end">{right}</text>
      <rect x="16" y="36" width="82" height="34" rx="8" className="k-fill k-pop" style={d(120)} />
      <text x="57" y="58" textAnchor="middle" className="k-on k-val">{a}</text>
      <rect x={W - 98} y="36" width="82" height="34" rx="8" className="k-sheet k-pop" style={d(260)} />
      <text x={W - 57} y="58" textAnchor="middle" className="k-risk-ink k-val">{b}</text>
      <path d={`M100 53H${W - 100}`} className="k-risk-line k-draw" pathLength={1} style={d(420)} />
      <circle cx={W / 2} cy="53" r="8" className="k-risk k-pop" style={d(640)} />
      <text x={W / 2} y="91" textAnchor="middle" className="k-risk-ink">KEPT FOR REVIEW</text>
    </>
  );
}

/** A message that changes a record, with the changed lines picked out. */
function Message({ from, lines, flag }: { from: string; lines: string[]; flag: number }) {
  return (
    <>
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="10" className="k-sheet" />
      <circle cx="22" cy="22" r="8" className="k-fill k-pop" />
      <text x="36" y="26" className="k-strong">{from}</text>
      <path d={`M14 38H${W - 14}`} className="k-hair" />
      {lines.map((l, i) => (
        <g key={l} style={d(200 + i * 140)}>
          {i === flag && <rect x="12" y={45 + i * 18} width={W - 24} height="16" rx="4" className="k-soft-fill k-rise" />}
          <text x="18" y={57 + i * 18} className={i === flag ? "k-strong k-rise" : "k-rise"}>
            {l}
          </text>
        </g>
      ))}
    </>
  );
}

/** The same checklist, worked through again for each case. */
function Repeat({ items, label }: { items: number; label: string }) {
  return (
    <>
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="10" className="k-sheet" />
      {[0, 1, 2].map((c) => {
        const x = 16 + c * 74;
        return (
          <g key={c} style={d(120 + c * 160)} className="k-rise">
            <rect x={x} y="14" width="62" height="64" rx="6" className={c === 2 ? "k-sheet" : "k-soft-fill"} />
            {Array.from({ length: items }, (_, i) => (
              <g key={i}>
                <path d={`M${x + 18} ${26 + i * 10}H${x + 52}`} className="k-hair" />
                {c < 2 && <Tick x={x + 10} y={26 + i * 10} s={0.55} />}
              </g>
            ))}
          </g>
        );
      })}
      <text x="16" y="94">{label}</text>
      <text x={W - 16} y="94" textAnchor="end" className="k-strong">AGAIN</text>
    </>
  );
}

/** A timeline where the question arrives near the end, after most of the work is done. */
function Late({ start, end, flag }: { start: string; end: string; flag: string }) {
  return (
    <>
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="10" className="k-sheet" />
      <rect x="16" y="44" width={W - 32} height="6" rx="3" className="k-track" />
      <rect x="16" y="44" width={(W - 32) * 0.82} height="6" rx="3" className="k-fill k-grow" style={d(120)} />
      <circle cx="16" cy="47" r="5" className="k-fill" />
      <circle cx={16 + (W - 32) * 0.82} cy="47" r="7" className="k-risk k-pop" style={d(760)} />
      <text x={16 + (W - 32) * 0.82} y="30" textAnchor="middle" className="k-risk-ink">{flag}</text>
      <text x="16" y="78">{start}</text>
      <text x={W - 16} y="78" textAnchor="end">{end}</text>
    </>
  );
}

/* ---------------------------------------------------------------- per function */

const J = APP_FACTS.jobwork;
const U = APP_FACTS.supplier;
const R = APP_FACTS.rfq;
const S = APP_FACTS.service;
const D = APP_FACTS.deduction;

const ART: Record<string, ReactNode[]> = {
  "supply-chain": [
    <Mismatch key="a" left={`CHALLAN ${J.challan}`} right="RETURN RECORD" a={J.sent.toLocaleString("en-IN")} b={`${J.returned}`} />,
    <Message key="b" from="Supplier update" lines={[`Re: ${U.po}, ${U.item.toLowerCase()}`, `${U.first} on ${U.firstDay}, ${U.rest} next ${U.restDay}`, "Please confirm"]} flag={1} />,
    <Scattered key="c" places={[["CHALLANS", "saffron"], ["STATEMENTS", "tangerine"], ["REJECTIONS", "emerald"]]} missing={1} />,
  ],
  operations: [
    <Scattered key="a" places={[["ERP", "cobalt"], ["SUPPLIERS", "tangerine"], ["JOB WORK", "saffron"]]} missing={2} />,
    <Mismatch key="b" left={`LINE ${EXAMPLE.line.n}`} right="CERTIFICATE" a={EXAMPLE.line.heat} b={EXAMPLE.cert.heat} />,
    <Repeat key="c" items={EXAMPLE.checklist.items.length} label={`CHECKLIST ${EXAMPLE.checklist.rev.toUpperCase()}`} />,
  ],
  commercial: [
    <Mismatch key="a" left="ENQUIRY" right="SUPPLIER OFFER" a={R.required} b={R.offered} />,
    <Scattered key="b" places={[["ENQUIRY", "violet"], ["REVISIONS", "cobalt"], ["DATASHEETS", "tangerine"]]} missing={1} />,
    <Late key="c" start="ENQUIRY IN" end="QUOTE OUT" flag="MATERIAL QUESTION" />,
  ],
  customer: [
    <Message key="a" from={`Service report ${S.report}`} lines={[`${S.equipment}, routine visit`, `Recommend ${S.part.toLowerCase()} at ${S.when.toLowerCase()}`, `Serial ${S.serial}`]} flag={1} />,
    <Scattered key="b" places={[["REPORTS", "pink"], ["EQUIPMENT", "cobalt"], ["CONTRACTS", "violet"]]} missing={0} />,
    <Mismatch key="c" left="NEW FOLLOW-UP" right="OPEN QUOTE" a="SEAL" b="QT-0731" />,
  ],
  "finance-and-risk": [
    <Message key="a" from={`Debit note ${D.debit}`} lines={[`Against ${D.invoice}`, `${inr(D.amount)} · reason code SH-02`, "Shortage reported on receipt"]} flag={1} />,
    <Scattered key="b" places={[["DISPATCH", "emerald"], ["SALES", "tangerine"], ["FINANCE", "violet"]]} missing={0} />,
    <Late key="c" start="DEDUCTION IN" end="RESPONSE DUE" flag="EVIDENCE MISSING" />,
  ],
};
