"use client";

import { useState } from "react";
import { store } from "@/lib/story";
import { DECISION_CARD } from "@/lib/scene";

type Mode = "idle" | "adjust" | "reject" | "approved" | "rejected";

const REASONS = ["Plant 02 needs the stock", "Expedite instead", "Demand looks temporary"];

/** Approve, adjust or reject. Each path shows what Decignal does next. */
export function DecisionControls() {
  const [mode, setMode] = useState<Mode>("idle");
  const [qty, setQty] = useState(240);
  const [reason, setReason] = useState<string | null>(null);
  const sourceLeft = 620 - qty;

  return (
    <div
      className="decision-panel mt-8 w-[28rem] max-w-full rounded-[22px] border border-white/80 bg-white/65 p-5 max-md:mt-0 max-md:w-full max-md:p-4 shadow-[0_18px_50px_-24px_rgba(20,19,15,0.35)] backdrop-blur-md transition-shadow duration-500 hover:shadow-[0_24px_60px_-24px_rgba(20,19,15,0.42)]"
      aria-live="polite"
      // While someone is deciding, the decision card in the stack comes forward to be read.
      onPointerEnter={() => (store.focusHint = DECISION_CARD)}
      onPointerLeave={() => (store.focusHint = -1)}
      onFocus={() => (store.focusHint = DECISION_CARD)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) store.focusHint = -1;
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-serif text-2xl leading-tight whitespace-nowrap">
          <span className="mb-2 block font-mono text-[11px] tracking-wider text-ink-soft uppercase">Interactive example</span>Transfer <RollNum value={qty} /> units
        </p>
        <p className="eyebrow tabular whitespace-nowrap">Plant 02 · <RollNum value={sourceLeft} /> left</p>
      </div>

      <div className="stock-balance" aria-label={`Plant 02 retains ${sourceLeft} units; Plant 01 receives ${qty} units`}>
        <div><span>Plant 02</span><strong><RollNum value={sourceLeft} /><small> retained</small></strong><span className="stock-balance-track"><span style={{width: `${sourceLeft / 620 * 100}%`, background: "var(--color-saffron)"}} /><i style={{left: `${380 / 620 * 100}%`}} /></span></div>
        <span className="stock-balance-arrow" aria-hidden>→</span>
        <div><span>Plant 01</span><strong>+<RollNum value={qty} /><small> incoming</small></strong><span className="stock-balance-track"><span style={{width: `${qty / 400 * 100}%`, background: "var(--color-cobalt)"}} /></span></div>
      </div>

      {mode === "idle" && (
        <div className="mt-4 flex gap-2">
          <Btn primary onClick={() => setMode("approved")}>
            Approve
          </Btn>
          <Btn onClick={() => setMode("adjust")}>Adjust</Btn>
          <Btn onClick={() => setMode("reject")}>Reject</Btn>
        </div>
      )}

      {mode === "adjust" && (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <Btn aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(80, q - 20))}>
              −
            </Btn>
            <input
              type="range"
              min={80}
              max={400}
              step={20}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="h-px flex-1 cursor-pointer appearance-none bg-line-strong accent-ink"
              aria-label="Units to transfer"
            />
            <Btn aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(400, q + 20))}>
              +
            </Btn>
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            {qty < 220
              ? "Below the recommended quantity; review the forecast before approving."
              : qty > 240
                ? "Plant 02 would retain less than its 380-unit plan."
                : "Fits the transfer recommendation and Plant 02’s stock plan."}
          </p>
          <div className="mt-4 flex gap-2">
            <Btn primary onClick={() => setMode("approved")}>
              Approve {qty}
            </Btn>
            <Btn
              onClick={() => {
                setQty(240);
                setMode("idle");
              }}
            >
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div className="mt-4">
          <p className="text-sm text-ink-soft">Why? Decignal uses the reason to improve the next recommendation.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {REASONS.map((r) => (
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
        <div className="decision-commit mt-4">
          {/* The approved decision travels into the example plan, the plan fills, then the check lands. */}
          <div className="decision-plan" aria-hidden>
            <span className="decision-plan-label">Example plan</span>
            <span className="decision-plan-slot">
              <span className="decision-plan-chip">
                <RollNum value={qty} /> u · Plant 02 → Plant 01
              </span>
            </span>
            <span className="decision-plan-track"><span /></span>
            <span className="decision-plan-check">✓</span>
          </div>
          <div className="decision-commit-result">
            <Result
              tone="ok"
              title={`Approved in this example. In a live setup, this becomes a ${qty}-unit ERP transfer order for your team to release.`}
              meta="Example audit trail · Planner approval → ERP transfer order"
              onUndo={() => setMode("idle")}
            />
          </div>
        </div>
      )}

      {mode === "rejected" && (
        <Result
          tone="signal"
          title="Rejected. No stock moves."
          meta={`Reason recorded: ${reason}`}
          onUndo={() => setMode("idle")}
        />
      )}
    </div>
  );
}

function Result({
  tone,
  title,
  meta,
  onUndo,
}: {
  tone: "ok" | "signal";
  title: string;
  meta: string;
  onUndo: () => void;
}) {
  return (
    <div className="decision-result mt-4">
      <p className="flex items-start gap-2.5 text-[15px] leading-snug">
        <span
          className={`mt-[7px] size-1.5 shrink-0 rounded-full ${tone === "ok" ? "bg-ok" : "bg-signal"}`}
          aria-hidden
        />
        {title}
      </p>
      <p className="eyebrow mt-2 normal-case tracking-normal">{meta}</p>
      <button onClick={onUndo} className="mt-3 text-sm underline decoration-line-strong underline-offset-4">
        Undo
      </button>
    </div>
  );
}

function Btn({
  primary,
  className = "",
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      {...p}
      className={`min-h-10 rounded-full px-4 text-sm font-medium transition-[transform,background-color] duration-300 ease-out active:scale-[0.97] ${
        primary ? "bg-ink text-white hover:bg-emerald" : "border border-line-strong bg-white/60 hover:bg-ink/5"
      } ${className}`}
    />
  );
}

/** Rolling digits: each digit column slides to its new value so a quantity change reads as a count. */
function RollNum({ value }: { value: number }) {
  const digits = String(value).split("");
  return (
    <span className="roll-num tabular" aria-label={String(value)} role="text">
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
