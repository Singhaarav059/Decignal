"use client";

import { useEffect, useState } from "react";
import { store } from "@/lib/story";
import { DECISION_CARD } from "@/lib/scene";
import { CONTROL, STORY_UI } from "@/lib/copy";
import { STORY } from "@/lib/example";

type Mode = "idle" | "adjust" | "decline" | "confirmed" | "declined";

/** The reader's choice, for the 3D follow-up card (store.decision, lib/story.ts). */
const publish = (mode: Mode, qty: number) => {
  store.decision = { mode: mode === "confirmed" ? "confirmed" : mode === "declined" ? "declined" : "idle", qty };
};

/** The supplier's revised Friday quantity; the slider runs from it up to the full order. */
const QTY: number = STORY.first.qty;
const STEP = 10;

/** A copy string with its number rolled: `around(CONTROL.title(qty), qty)` gives the words around it. */
const around = (text: string, n: number) => {
  const i = text.indexOf(String(n));
  return i < 0 ? [text, ""] : [text.slice(0, i), text.slice(i + String(n).length)];
};

/**
 * Illustrative: the buyer confirms the supplier's revised schedule, asks for more on Friday, or declines
 * it. Each path shows what happens next, and the 3D follow-up card follows. Nothing is posted anywhere.
 */
export function DecisionControls() {
  const [mode, setMode] = useState<Mode>("idle");
  const [qty, setQty] = useState(QTY);
  const [reason, setReason] = useState<string | null>(null);
  const rest = STORY.qty - qty;

  useEffect(() => publish(mode, qty), [mode, qty]);

  const [tPre, tPost] = around(CONTROL.title(qty), qty);
  const [sPre, sPost] = around(CONTROL.restLeft(rest), rest);
  const [cPre, cPost] = around(CONTROL.planChip(qty), qty);

  return (
    <div
      className="decision-panel"
      // While someone is deciding, the follow-up card in the stack comes forward to be read.
      onPointerEnter={() => (store.focusHint = DECISION_CARD)}
      onPointerLeave={() => (store.focusHint = -1)}
      // Keyboard focus only: a clicked button keeps focus, and that would hold the card forward and
      // turn off hover reading for the whole fan until the reader clicked elsewhere.
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) store.focusHint = DECISION_CARD;
      }}
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
          <RollNum value={rest} />
          {sPost}
        </p>
      </div>

      <div className="stock-balance" aria-label={CONTROL.balanceAria(qty, rest)}>
        <div>
          <span>{STORY.first.day}</span>
          <strong>
            <RollNum value={qty} />
            <small> {CONTROL.first}</small>
          </strong>
          <span className="stock-balance-track">
            <span style={{ width: `${(qty / STORY.qty) * 100}%`, background: "var(--color-cobalt)" }} />
            {/* What the orders due by Monday need on Friday (SO-3310 and SO-3318). */}
            <i style={{ left: `${(CONTROL.needed / STORY.qty) * 100}%` }} />
          </span>
        </div>
        <span className="stock-balance-arrow" aria-hidden>
          →
        </span>
        <div>
          <span>{STORY.rest.day}</span>
          <strong>
            <RollNum value={rest} />
            <small> {CONTROL.rest}</small>
          </strong>
          <span className="stock-balance-track">
            <span style={{ width: `${(rest / STORY.qty) * 100}%`, background: "var(--color-saffron)" }} />
          </span>
        </div>
      </div>

      {/* What each choice leads to is read out; the rolling figures above are not (the slider says its value). */}
      <div aria-live="polite">
        {mode === "idle" && (
          <div className="decision-actions">
            <Btn primary onClick={() => setMode("confirmed")}>
              {CONTROL.confirm}
            </Btn>
            <Btn onClick={() => setMode("adjust")}>{CONTROL.adjust}</Btn>
            <Btn onClick={() => setMode("decline")}>{CONTROL.decline}</Btn>
          </div>
        )}

        {mode === "adjust" && (
          <div className="decision-step">
            <div className="flex items-center gap-2">
              <Btn aria-label={STORY_UI.qtyDown} onClick={() => setQty((q) => Math.max(QTY, q - STEP))}>
                −
              </Btn>
              <input
                type="range"
                min={QTY}
                max={STORY.qty}
                step={STEP}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="decision-range"
                aria-label={STORY_UI.qtyAria}
              />
              <Btn aria-label={STORY_UI.qtyUp} onClick={() => setQty((q) => Math.min(STORY.qty, q + STEP))}>
                +
              </Btn>
            </div>
            <p className="t-small decision-note">{CONTROL.note(qty)}</p>
            <div className="decision-actions">
              <Btn primary onClick={() => setMode("confirmed")}>
                {CONTROL.confirmQty(qty)}
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

        {mode === "decline" && (
          <div className="decision-step">
            <p className="t-small decision-note">{CONTROL.declinePrompt}</p>
            <div className="decision-actions flex-wrap">
              {CONTROL.reasons.map((r) => (
                <Btn
                  key={r}
                  onClick={() => {
                    setReason(r);
                    setMode("declined");
                  }}
                >
                  {r}
                </Btn>
              ))}
            </div>
          </div>
        )}

        {mode === "confirmed" && (
          <div className="decision-commit decision-step">
            {/* The confirmed schedule travels into the example tracker, the track fills, then the check lands. */}
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
              <Result tone="ok" title={CONTROL.confirmedTitle(qty)} meta={CONTROL.confirmedMeta(qty)} onUndo={() => setMode("idle")} />
            </div>
          </div>
        )}

        {mode === "declined" && (
          <Result tone="signal" title={CONTROL.declinedTitle} meta={CONTROL.declinedMeta(reason ?? "")} onUndo={() => setMode("idle")} />
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
