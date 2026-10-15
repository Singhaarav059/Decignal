"use client";

import { useEffect, useState } from "react";
import { store } from "@/lib/story";
import { DECISION_CARD } from "@/lib/scene";
import { CONTROL } from "@/lib/copy";
import { EXAMPLE } from "@/lib/example";

type Mode = "idle" | "note" | "dismiss" | "requested" | "dismissed";

/** The reader's choice, for the 3D decision card. "approved" is the store's word for "a request drafted":
 *  the card shows the request, never an approval of the shipment. */
type Decision = { mode: "idle" | "approved" | "rejected"; qty: number };
const publish = (d: Decision) => {
  (store as typeof store & { decision?: Decision }).decision = d;
};

const ITEMS = EXAMPLE.checklist.items.length;
const OK = EXAMPLE.checklist.items.filter((i) => i.status === "supported").length;

/** Request, add a question, or record why it is not an issue. Each path shows what happens next, and
 *  the 3D decision card follows. Nothing here approves the shipment. */
export function DecisionControls() {
  const [mode, setMode] = useState<Mode>("idle");
  const [what, setWhat] = useState<string>(CONTROL.requestChip);
  const [reason, setReason] = useState<string | null>(null);
  const open = mode === "requested" ? ITEMS - OK - 1 : mode === "dismissed" ? 0 : ITEMS - OK;

  useEffect(() => {
    publish({ mode: mode === "requested" ? "approved" : mode === "dismissed" ? "rejected" : "idle", qty: OK });
  }, [mode]);

  return (
    <div
      className="decision-panel"
      // While someone is reviewing, the decision card in the stack comes forward to be read.
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
          {CONTROL.title}
        </p>
        <p className="t-label tabular whitespace-nowrap">{CONTROL.side}</p>
      </div>

      <div className="stock-balance" aria-label={CONTROL.balanceAria(OK, open)}>
        <div>
          <span>{CONTROL.supported}</span>
          <strong>
            <RollNum value={OK} />
            <small> {CONTROL.ofItems}</small>
          </strong>
          <span className="stock-balance-track">
            <span style={{ width: `${(OK / ITEMS) * 100}%`, background: "var(--color-emerald)" }} />
          </span>
        </div>
        <span className="stock-balance-arrow" aria-hidden>
          ·
        </span>
        <div>
          <span>{CONTROL.open}</span>
          <strong>
            <RollNum value={open} />
            <small> {CONTROL.ofItems}</small>
          </strong>
          <span className="stock-balance-track">
            <span style={{ width: `${(open / ITEMS) * 100}%`, background: "var(--color-signal)" }} />
          </span>
        </div>
      </div>

      {/* What each choice leads to is read out; the rolling figures above are not. */}
      <div aria-live="polite">
        {mode === "idle" && (
          <div className="decision-actions">
            <Btn
              primary
              onClick={() => {
                setWhat(CONTROL.requestChip);
                setMode("requested");
              }}
            >
              {CONTROL.request}
            </Btn>
            <Btn onClick={() => setMode("note")}>{CONTROL.note}</Btn>
            <Btn onClick={() => setMode("dismiss")}>{CONTROL.dismiss}</Btn>
          </div>
        )}

        {mode === "note" && (
          <div className="decision-step">
            <p className="t-small decision-note">{CONTROL.notePrompt}</p>
            <div className="decision-actions flex-wrap">
              {CONTROL.notes.map((n) => (
                <Btn
                  key={n}
                  onClick={() => {
                    setWhat(n);
                    setMode("requested");
                  }}
                >
                  {n}
                </Btn>
              ))}
              <Btn onClick={() => setMode("idle")}>{CONTROL.cancel}</Btn>
            </div>
          </div>
        )}

        {mode === "dismiss" && (
          <div className="decision-step">
            <p className="t-small decision-note">{CONTROL.dismissPrompt}</p>
            <div className="decision-actions flex-wrap">
              {CONTROL.reasons.map((r) => (
                <Btn
                  key={r}
                  onClick={() => {
                    setReason(r);
                    setMode("dismissed");
                  }}
                >
                  {r}
                </Btn>
              ))}
            </div>
          </div>
        )}

        {mode === "requested" && (
          <div className="decision-commit decision-step">
            {/* The question travels into the review pack, the pack fills, then the mark lands. */}
            <div className="decision-plan" aria-hidden>
              <span className="decision-plan-label">{CONTROL.planLabel}</span>
              <span className="decision-plan-slot">
                <span className="decision-plan-chip">{CONTROL.planChip(what)}</span>
              </span>
              <span className="decision-plan-track">
                <span />
              </span>
              <span className="decision-plan-check">✓</span>
            </div>
            <div className="decision-commit-result">
              <Result
                tone="ok"
                title={what === CONTROL.requestChip ? CONTROL.requestedTitle : CONTROL.notedTitle(what)}
                meta={CONTROL.requestedMeta}
                onUndo={() => setMode("idle")}
              />
            </div>
          </div>
        )}

        {mode === "dismissed" && (
          <Result tone="signal" title={CONTROL.dismissedTitle} meta={CONTROL.dismissedMeta(reason ?? "")} onUndo={() => setMode("idle")} />
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
