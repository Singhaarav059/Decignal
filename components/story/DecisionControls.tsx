"use client";

import { useEffect, useState } from "react";
import { store } from "@/lib/story";
import { DECISION_CARD } from "@/lib/scene";
import { CONTROL, STORY_UI } from "@/lib/copy";
import { EXAMPLE } from "@/lib/example";

type Mode = "idle" | "adjust" | "reject" | "approved" | "rejected";

/** The reader's choice, for the 3D decision card (S69-05, 2A/2B store contract). */
type Decision = { mode: "idle" | "approved" | "rejected"; qty: number };
const publish = (d: Decision) => {
  (store as typeof store & { decision?: Decision }).decision = d;
};

const P2 = EXAMPLE.plant02;
const QTY: number = EXAMPLE.transfer.units;

/** A copy string with its number rolled: `split(CONTROL.title(qty), qty)` gives the words around it. */
const around = (text: string, n: number) => {
  const i = text.indexOf(String(n));
  return i < 0 ? [text, ""] : [text.slice(0, i), text.slice(i + String(n).length)];
};

/** Approve, adjust or reject. Each path shows what happens next, and the 3D decision card follows. */
export function DecisionControls() {
  const [mode, setMode] = useState<Mode>("idle");
  const [qty, setQty] = useState(QTY);
  const [reason, setReason] = useState<string | null>(null);
  const sourceLeft = P2.stock - qty;

  useEffect(() => {
    publish({ mode: mode === "approved" ? "approved" : mode === "rejected" ? "rejected" : "idle", qty });
  }, [mode, qty]);

  const [tPre, tPost] = around(CONTROL.title(qty), qty);
  const [sPre, sPost] = around(CONTROL.sourceLeft(sourceLeft), sourceLeft);
  const [cPre, cPost] = around(CONTROL.planChip(qty), qty);

  return (
    <div
      className="decision-panel"
      // While someone is deciding, the decision card in the stack comes forward to be read.
      onPointerEnter={() => (store.focusHint = DECISION_CARD)}
      onPointerLeave={() => (store.focusHint = -1)}
      onFocus={() => (store.focusHint = DECISION_CARD)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) store.focusHint = -1;
      }}
    >
      <div className="decision-head">
        <p className="decision-title t-subtitle">
          <span className="t-label">{CONTROL.eyebrow}</span>
          {tPre}
          <RollNum value={qty} />
          {tPost}
        </p>
        <p className="t-label tabular whitespace-nowrap">
          {sPre}
          <RollNum value={sourceLeft} />
          {sPost}
        </p>
      </div>

      <div className="stock-balance" aria-label={CONTROL.balanceAria(sourceLeft, qty)}>
        <div>
          <span>{P2.name}</span>
          <strong>
            <RollNum value={sourceLeft} />
            <small> {CONTROL.retained}</small>
          </strong>
          <span className="stock-balance-track">
            <span style={{ width: `${(sourceLeft / P2.stock) * 100}%`, background: "var(--color-saffron)" }} />
            <i style={{ left: `${(P2.ownPlan / P2.stock) * 100}%` }} />
          </span>
        </div>
        <span className="stock-balance-arrow" aria-hidden>
          →
        </span>
        <div>
          <span>{EXAMPLE.plant01.name}</span>
          <strong>
            +<RollNum value={qty} />
            <small> {CONTROL.incoming}</small>
          </strong>
          <span className="stock-balance-track">
            <span style={{ width: `${(qty / 400) * 100}%`, background: "var(--color-cobalt)" }} />
          </span>
        </div>
      </div>

      {/* What each choice leads to is read out; the rolling figures above are not (the slider says its value). */}
      <div aria-live="polite">
        {mode === "idle" && (
          <div className="decision-actions">
            <Btn primary onClick={() => setMode("approved")}>
              {CONTROL.approve}
            </Btn>
            <Btn onClick={() => setMode("adjust")}>{CONTROL.adjust}</Btn>
            <Btn onClick={() => setMode("reject")}>{CONTROL.reject}</Btn>
          </div>
        )}

        {mode === "adjust" && (
          <div className="decision-step">
            <div className="flex items-center gap-2">
              <Btn aria-label={STORY_UI.qtyDown} onClick={() => setQty((q) => Math.max(80, q - 20))}>
                −
              </Btn>
              <input
                type="range"
                min={80}
                max={400}
                step={20}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="decision-range"
                aria-label={STORY_UI.qtyAria}
              />
              <Btn aria-label={STORY_UI.qtyUp} onClick={() => setQty((q) => Math.min(400, q + 20))}>
                +
              </Btn>
            </div>
            <p className="t-small decision-note">{CONTROL.note(qty)}</p>
            <div className="decision-actions">
              <Btn primary onClick={() => setMode("approved")}>
                {CONTROL.approveQty(qty)}
              </Btn>
              <Btn
                onClick={() => {
                  setQty(QTY);
                  setMode("idle");
                }}
              >
                {CONTROL.cancel}
              </Btn>
            </div>
          </div>
        )}

        {mode === "reject" && (
          <div className="decision-step">
            <p className="t-small decision-note">{CONTROL.rejectPrompt}</p>
            <div className="decision-actions flex-wrap">
              {CONTROL.reasons.map((r) => (
                <Btn
                  key={r}
                  onClick={() => {
                    setReason(r);
                    setMode("rejected");
                  }}
                >
                  {r}
                </Btn>
              ))}
            </div>
          </div>
        )}

        {mode === "approved" && (
          <div className="decision-commit decision-step">
            {/* The approved decision travels into the example plan, the plan fills, then the check lands. */}
            <div className="decision-plan" aria-hidden>
              <span className="decision-plan-label">{CONTROL.planLabel}</span>
              <span className="decision-plan-slot">
                <span className="decision-plan-chip">
                  {cPre}
                  <RollNum value={qty} />
                  {cPost}
                </span>
              </span>
              <span className="decision-plan-track">
                <span />
              </span>
              <span className="decision-plan-check">✓</span>
            </div>
            <div className="decision-commit-result">
              <Result tone="ok" title={CONTROL.approvedTitle(qty)} meta={CONTROL.approvedMeta} onUndo={() => setMode("idle")} />
            </div>
          </div>
        )}

        {mode === "rejected" && (
          <Result tone="signal" title={CONTROL.rejectedTitle} meta={CONTROL.rejectedMeta(reason ?? "")} onUndo={() => setMode("idle")} />
        )}
      </div>
    </div>
  );
}

function Result({ tone, title, meta, onUndo }: { tone: "ok" | "signal"; title: string; meta: string; onUndo: () => void }) {
  return (
    <div className="decision-result">
      <p className="t-body flex items-start gap-2.5 leading-snug">
        <span className="decision-result-dot" data-tone={tone} aria-hidden />
        {title}
      </p>
      <p className="t-small decision-meta">{meta}</p>
      <button type="button" onClick={onUndo} className="decision-undo t-small">
        {CONTROL.undo}
      </button>
    </div>
  );
}

function Btn({ primary, className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return <button type="button" {...p} className={`decision-btn${className ? ` ${className}` : ""}`} data-primary={primary || undefined} />;
}

/** Rolling digits: each digit column slides to its new value so a quantity change reads as a count. */
function RollNum({ value }: { value: number }) {
  const digits = String(value).split("");
  return (
    <span className="roll-num tabular">
      <span className="sr-only">{value}</span>
      {digits.map((d, i) => (
        <span key={digits.length - i} className="roll-digit" aria-hidden>
          <span className="roll-ghost">{d}</span>
          <span className="roll-col" style={{ transform: `translateY(${-Number(d) * 10}%)` }}>
            {"0123456789".split("").map((n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
