"use client";

import { useState } from "react";

type Mode = "idle" | "adjust" | "reject" | "approved" | "rejected";

const REASONS = ["Plant 02 needs the stock", "Expedite instead", "Demand looks temporary"];

/** Approve, adjust or reject. Each path shows what Decignal does next. */
export function DecisionControls() {
  const [mode, setMode] = useState<Mode>("idle");
  const [qty, setQty] = useState(240);
  const [reason, setReason] = useState<string | null>(null);
  const cover = Math.round((qty / 240) * 34);

  return (
    <div
      className="mt-8 rounded-[22px] border border-white/80 bg-white/65 p-5 shadow-[0_18px_50px_-24px_rgba(20,19,15,0.35)] backdrop-blur-md"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-serif text-2xl leading-tight whitespace-nowrap">
          Transfer <span className="tabular">{qty}</span> units
        </p>
        <p className="eyebrow tabular whitespace-nowrap">Cover {cover} days</p>
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
              ? "Plant 01 falls short again before the supplier delivery arrives."
              : qty > 300
                ? "Plant 02 drops below its own safety stock."
                : "Covers the gap until the supplier delivery arrives."}
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
        <Result
          tone="ok"
          title={`Approved. Stock transfer order created in SAP for ${qty} units.`}
          meta="STO 4500018842 · Approved by R. Iyer, Supply Planner · 09:42"
          onUndo={() => setMode("idle")}
        />
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
    <div className="mt-4">
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
