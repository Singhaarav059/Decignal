"use client";

import { useState } from "react";
import { Check, Minus, Plus, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { tint, tone } from "../ui/systems";

type Mode = "idle" | "adjust" | "reject" | "approved" | "rejected";

const REASONS = ["Plant 02 needs the stock", "Expedite instead", "Demand looks temporary"];

/** Approve, adjust or reject. Each path shows what Decignal does next. */
export function DecisionControls() {
  const [mode, setMode] = useState<Mode>("idle");
  const [qty, setQty] = useState(240);
  const [reason, setReason] = useState<string | null>(null);
  const cover = Math.round((qty / 240) * 34);
  const note =
    qty < 220
      ? { t: "saffron", text: "Plant 01 falls short again before the supplier delivery arrives." }
      : qty > 300
        ? { t: "signal", text: "Plant 02 drops below its own safety stock." }
        : { t: "emerald", text: "Covers the gap until the supplier delivery arrives." };

  return (
    <div className="mt-10 max-w-[480px] rounded-[24px] border border-line bg-white p-6 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.35)]" aria-live="polite">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[20px] font-semibold tracking-[-0.02em]">
          Transfer <span className="tabular">{qty}</span> units
        </p>
        <p className="tabular text-[13px] text-ink-soft">Cover {cover} days</p>
      </div>
      <p className="mt-1 text-[14px] text-ink-soft">Plant 02 to Plant 01 · INR {Math.round((qty / 240) * 38)}k</p>

      {mode === "idle" && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn btn-dark min-h-10! px-5! text-[14px]!" onClick={() => setMode("approved")}>
            <Check size={16} strokeWidth={2.4} /> Approve
          </button>
          <button className="btn btn-ghost min-h-10! px-5! text-[14px]!" onClick={() => setMode("adjust")}>
            <SlidersHorizontal size={15} /> Adjust
          </button>
          <button className="btn btn-ghost min-h-10! px-5! text-[14px]!" onClick={() => setMode("reject")}>
            <X size={16} /> Reject
          </button>
        </div>
      )}

      {mode === "adjust" && (
        <div className="mt-5">
          <div className="flex items-center gap-3">
            <Round label="Decrease quantity" onClick={() => setQty((q) => Math.max(80, q - 20))}>
              <Minus size={16} />
            </Round>
            <input
              type="range"
              min={80}
              max={400}
              step={20}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="flex-1 cursor-pointer accent-[var(--color-cobalt)]"
              aria-label="Units to transfer"
            />
            <Round label="Increase quantity" onClick={() => setQty((q) => Math.min(400, q + 20))}>
              <Plus size={16} />
            </Round>
          </div>
          <p className="mt-3 flex items-start gap-2 text-[14px] text-ink-2">
            <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: tone(note.t) }} />
            {note.text}
          </p>
          <div className="mt-5 flex gap-2">
            <button className="btn btn-dark min-h-10! px-5! text-[14px]!" onClick={() => setMode("approved")}>
              Approve {qty}
            </button>
            <button
              className="btn btn-ghost min-h-10! px-5! text-[14px]!"
              onClick={() => {
                setQty(240);
                setMode("idle");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div className="mt-5">
          <p className="text-[14px] text-ink-2">Why? Decignal uses the reason to improve the next recommendation.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                className="btn btn-ghost min-h-9! px-4! text-[13.5px]!"
                onClick={() => {
                  setReason(r);
                  setMode("rejected");
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {(mode === "approved" || mode === "rejected") && (
        <div className="mt-5 rounded-[16px] p-4" style={{ background: tint(mode === "approved" ? "emerald" : "signal", 10) }}>
          <p className="flex items-start gap-2.5 text-[15px] font-semibold" style={{ color: tone(mode === "approved" ? "emerald" : "signal") }}>
            {mode === "approved" ? <Check size={18} strokeWidth={2.6} /> : <X size={18} strokeWidth={2.6} />}
            {mode === "approved" ? `Approved. Stock transfer order created in SAP for ${qty} units.` : "Rejected. No stock moves."}
          </p>
          <p className="mt-1.5 pl-7 text-[13px] text-ink-2">
            {mode === "approved" ? "STO 4500018842 · Approved by R. Iyer, Supply Planner · 09:42" : `Reason recorded: ${reason}`}
          </p>
          <button onClick={() => setMode("idle")} className="mt-3 ml-7 inline-flex items-center gap-1.5 text-[13px] font-medium text-cobalt">
            <RotateCcw size={13} /> Undo
          </button>
        </div>
      )}
    </div>
  );
}

function Round({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-full border border-line-strong transition-colors hover:border-ink active:scale-95"
    >
      {children}
    </button>
  );
}
