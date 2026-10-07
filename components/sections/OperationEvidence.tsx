"use client";

import { APPLICATION_DEMOS, type DemoKind } from "@/lib/application-demos";
import { CountUp } from "../ui/CountUp";

const STATUS: Record<DemoKind, [string, string, string]> = {
  inventory: ["Day 6 falls below the 175-unit reserve", "240 units available after source reserves", "Day 2 arrival restores the projected balance"],
  demand: ["West demand exceeds the current plan", "POS and orders confirm the same shortfall", "West replenishment raised by 1,800 units"],
  production: ["Six lots queued at Line 03", "Line 02 can accept the next three lots", "Three lots assigned to each line"],
  maintenance: ["Vibration is rising above the baseline", "Drive-end bearing isolated for inspection", "CM-041 scheduled in Friday's service window"],
  risk: ["Primary port lane is delayed", "Alternative capacity and lead time verified", "Two critical parts assigned to the second supplier"],
  sales: ["West orders exceed allocated stock", "East availability permits a controlled shift", "12% of allocation moved to West dealers"],
  customer: ["Fourteen records appear unrelated", "Part history links every case to Bearing X90", "One escalation carries all fourteen records"],
  finance: ["Three invoices await a receipt", "PO matches; goods receipt is absent", "Three payments held for receiving review"],
};

function Tick({ x, y, ok }: { x: number; y: number; ok: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="7" fill={ok ? "var(--color-emerald)" : "var(--color-signal)"} fillOpacity=".14" />
      <path
        d={ok ? "M-3 0l2 2 4-5" : "M-3 0h6"}
        stroke={ok ? "var(--color-emerald)" : "var(--color-signal)"}
        fill="none"
        strokeWidth="1.6"
      />
    </g>
  );
}

/** High-precision engineering telemetry readouts with calibrated indicators */
export function OperationEvidence({ kind, step }: { kind: DemoKind; step: number }) {
  const done = step === 2;
  const demo = APPLICATION_DEMOS.find((d) => d.kind === kind);

  return (
    <div className="operation-evidence" data-kind={kind} data-step={step}>
      <div className="evidence-heading">
        <span className="spec-label">
          {({
            inventory: "Projected stock & replenishment trajectory · Plant 01",
            demand: "Regional demand variance & POS cross-check",
            production: "Line capacity balance & shift scheduling",
            maintenance: "Drive motor vibration frequency & service window",
            risk: "Logistics lane dependency & alternative routing",
            sales: "Dealer allocation vs validated orders",
            customer: "Part correlation constellation & escalation",
            finance: "Three-way invoice reconciliation ledger",
          })[kind]}
        </span>
        <span className="evidence-state">
          <i />
          {["Signal detected", "Evidence connected", "Action prepared"][step]}
        </span>
      </div>

      <svg key={kind} viewBox="0 0 540 100" role="img" aria-label={STATUS[kind][step]}>
        {kind === "inventory" && (
          <>
            <defs>
              <linearGradient id="inv-safe-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-signal)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--color-signal)" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="inv-rec-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-emerald)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--color-emerald)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[24, 48, 72].map((y) => (
              <line key={y} x1="32" y1={y} x2="508" y2={y} className="chart-grid" />
            ))}
            {[32, 110, 190, 270, 350, 430, 508].map((x) => (
              <line key={x} x1={x} y1={72} x2={x} y2={77} className="chart-grid" />
            ))}
            <line x1="32" y1="68" x2="508" y2="68" stroke="var(--color-signal)" strokeDasharray="3 4" strokeWidth="1.2" opacity="0.65" />
            <text x="508" y="64" textAnchor="end" fill="var(--color-signal)" fontSize="9" fontWeight="600">SAFETY RESERVE · 175</text>
            {!done && <rect x="390" y="68" width="118" height="20" fill="url(#inv-safe-grad)" />}
            <path d="M32 34 L110 42 L190 50 L270 58 L350 66 L430 74 L508 82" stroke="var(--color-signal)" strokeWidth="1.8" fill="none" opacity={done ? 0.25 : 1} />
            {done && (
              <>
                <path d="M190 50 V14 L270 22 L350 30 L430 38 L508 44" className="chart-action evidence-draw interactive-draw is-drawn" strokeWidth="2.2" />
                <path d="M190 50 V14 L270 22 L350 30 L430 38 L508 44 L508 68 L190 68 Z" fill="url(#inv-rec-grad)" />
              </>
            )}
            {step >= 1 && (
              <g transform="translate(190, 14)">
                {/* Vertical transfer trajectory guide */}
                <line x1="0" y1="36" x2="0" y2="0" stroke="var(--color-emerald)" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.85" />
                {/* Injection vertex marker */}
                <circle cx="0" cy="0" r="3.5" fill="var(--color-emerald)" />
                <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />
                {/* Elevated badge card positioned above the trajectory line */}
                <g transform="translate(6, -18)">
                  <rect
                    x="0"
                    y="0"
                    width="84"
                    height="17"
                    rx="4"
                    fill="#FFFFFF"
                    stroke="var(--color-emerald)"
                    strokeWidth="1.2"
                    style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.08))" }}
                  />
                  <text x="7" y="11.5" fill="var(--color-emerald)" fontSize="8.5" fontWeight="700" letterSpacing="0.03em">
                    +240 TRANSFER
                  </text>
                </g>
              </g>
            )}
            <circle cx={508} cy={done ? 44 : 82} r="4" fill={done ? "var(--color-emerald)" : "var(--color-signal)"} style={{ transition: "all 500ms var(--ease-out-quint)" }} />
            <text x="32" y="93" textAnchor="start" fontSize="8.5">TODAY · 410</text>
            <text x="190" y="93" textAnchor="middle" fontSize="8.5">DAY 2 (ARRIVAL)</text>
            <text x="508" y="93" textAnchor="end" fontSize="8.5">{done ? "DAY 6 · 380 (RESTORED)" : "DAY 6 · 140 (SHORTFALL)"}</text>
          </>
        )}

        {kind === "demand" && (
          <>
            {["NORTH", "CENTRAL", "WEST"].map((label, i) => {
              const isWest = i === 2;
              const planW = [190, 240, done ? 300 : 180][i];
              const actualW = [175, 230, 300][i];
              return (
                <g key={label} transform={`translate(0, ${10 + i * 26})`}>
                  <text x="0" y="15" fontWeight="600" fontSize="9">{label}</text>
                  <rect x="95" y="4" width="310" height="16" rx="3" fill="var(--color-line)" fillOpacity="0.35" />
                  <rect x="95" y="5" width={planW} height="6" rx="2" fill="var(--tone)" opacity="0.38" style={{ transition: "width 600ms var(--ease-out-quint)" }} />
                  <rect x="95" y="13" width={actualW} height="6" rx="2" fill={isWest && !done ? "var(--color-signal)" : "var(--tone)"} style={{ transition: "all 600ms var(--ease-out-quint)" }} />
                  {isWest && !done && (
                    <g transform="translate(280, 3)">
                      <rect x="0" y="0" width="60" height="16" rx="3" fill="var(--color-signal)" fillOpacity="0.14" stroke="var(--color-signal)" strokeWidth="1" />
                      <text x="30" y="11" textAnchor="middle" fill="var(--color-signal)" fontSize="7.5" fontWeight="600">GAP: +1,800</text>
                    </g>
                  )}
                  <text x="530" y="15" textAnchor="end" fontWeight="600" fontSize="8.5" fill={isWest && done ? "var(--color-emerald)" : isWest ? "var(--color-signal)" : "var(--color-ink)"}>
                    {isWest ? (done ? "REPLENISHED (+1,800)" : "SHORTFALL") : "BALANCED"}
                  </text>
                </g>
              );
            })}
            <text x="95" y="94" fill="var(--color-ink-soft)" fontSize="8">TOP: ALLOCATED PLAN</text>
            <text x="240" y="94" fill="var(--color-ink-soft)" fontSize="8">BOTTOM: VALIDATED DEMAND</text>
          </>
        )}

        {kind === "production" && (
          <>
            <text x="95" y="10" fill="var(--color-ink-soft)" fontSize="8">14:00 SHIFT</text>
            <text x="210" y="10" fill="var(--color-ink-soft)" fontSize="8">15:30</text>
            <text x="330" y="10" fill="var(--color-ink-soft)" fontSize="8">17:00</text>
            <text x="530" y="10" textAnchor="end" fill="var(--color-ink-soft)" fontSize="8">CAPACITY</text>
            {["LINE 03", "LINE 02"].map((label, row) => {
              const isLine03 = row === 0;
              return (
                <g key={label} transform={`translate(0, ${18 + row * 34})`}>
                  <text x="0" y="16" fontWeight="600" fontSize="9">{label}</text>
                  <text x="0" y="27" fontSize="7.5" fill="var(--color-ink-soft)">{isLine03 ? "PRIMARY" : "PARALLEL"}</text>
                  <line x1="95" y1="24" x2="425" y2="24" className="chart-grid" />
                  {Array.from({ length: 6 }, (_, i) => {
                    const active = isLine03 ? (done ? i < 3 : true) : (done ? i < 3 : false);
                    const isOverload = isLine03 && i >= 3 && !done;
                    return (
                      <g key={i} transform={`translate(${95 + i * 55}, 4)`}>
                        <rect
                          width="48"
                          height="16"
                          rx="3"
                          fill={active ? (isOverload ? "var(--color-signal)" : "var(--color-emerald)") : "transparent"}
                          fillOpacity={active ? (isOverload ? 0.22 : 0.18) : 0.04}
                          stroke={active ? (isOverload ? "var(--color-signal)" : "var(--color-emerald)") : "var(--color-line)"}
                          strokeWidth={active ? 1.4 : 1}
                          strokeDasharray={active ? undefined : "3 3"}
                          style={{ transition: "all 400ms ease" }}
                        />
                        <text x="24" y="11" textAnchor="middle" fontSize="7.5" fontWeight="600" fill={active ? (isOverload ? "var(--color-signal)" : "var(--color-emerald)") : "var(--color-ink-soft)"}>
                          {active ? `LOT ${String(i + 1).padStart(2, "0")}` : "OPEN"}
                        </text>
                      </g>
                    );
                  })}
                  <text x="530" y="15" textAnchor="end" fontWeight="600" fontSize="8.5" fill={isLine03 ? (done ? "var(--color-emerald)" : "var(--color-signal)") : "var(--color-emerald)"}>
                    {isLine03 ? (done ? "50% · BALANCED" : "100% · QUEUED") : (done ? "50% · ACTIVE" : "0% · READY")}
                  </text>
                </g>
              );
            })}
            <path d="M 260 38 C 260 48, 150 48, 150 54" className={`chart-action evidence-draw interactive-draw ${step >= 1 ? "is-drawn" : ""}`} strokeDasharray="3 3" />
            <text x="95" y="94" fill="var(--color-ink-soft)" fontSize="8">
              {done ? "REBALANCED: 3 LOTS ASSIGNED TO LINE 02" : step === 1 ? "PO-2207: TOOLING COMPATIBILITY VERIFIED" : "6 LOTS CONGESTING LINE 03"}
            </text>
          </>
        )}

        {kind === "maintenance" && (
          <>
            <defs>
              <linearGradient id="maint-spec-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-signal)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--color-signal)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <line x1="0" y1="58" x2="260" y2="58" className="chart-grid" strokeDasharray="3 3" />
            <text x="0" y="12" fill="var(--color-ink-soft)" fontSize="8">FFT SPECTRUM · BEARING VIBRATION</text>
            <path d="M 0 58 L 20 56 L 40 60 L 60 54 L 80 58 L 100 50 L 120 62 L 140 44 L 160 54 L 180 30 L 195 16 L 210 28 L 230 48 L 250 56 L 260 58" fill="none" stroke="var(--color-signal)" strokeWidth="1.8" />
            <path d="M 140 44 L 160 54 L 180 30 L 195 16 L 210 28 L 230 48 L 230 58 L 140 58 Z" fill="url(#maint-spec-grad)" />
            <circle cx="195" cy="16" r="3.5" fill="var(--color-signal)" />
            <text x="195" y="9" textAnchor="middle" fill="var(--color-signal)" fontSize="7.5" fontWeight="600">V-04 PEAK · 4.8 mm/s</text>
            <text x="0" y="76" fill="var(--color-ink-soft)" fontSize="8">DRIVE-END BEARING X90</text>
            <line x1="285" y1="6" x2="285" y2="82" className="chart-grid" />
            <text x="305" y="12" fill="var(--color-ink-soft)" fontSize="8">SERVICE WINDOW SELECTION</text>
            {["THU", "FRI", "SAT"].map((d, i) => {
              const isFri = i === 1;
              return (
                <g key={d} transform={`translate(${305 + i * 56}, 20)`}>
                  <rect
                    width="48"
                    height="36"
                    rx="4"
                    fill={isFri ? "var(--color-emerald)" : "none"}
                    fillOpacity={isFri ? (done ? 0.22 : 0.08) : 0.04}
                    stroke={isFri ? "var(--color-emerald)" : "var(--color-line)"}
                    strokeWidth={isFri ? 1.6 : 1}
                    style={{ transition: "all 400ms ease" }}
                  />
                  <text x="24" y="18" textAnchor="middle" fontSize="9.5" fontWeight="600" fill={isFri ? "var(--color-emerald)" : "var(--color-ink)"}>
                    {d}
                  </text>
                  <text x="24" y="29" textAnchor="middle" fontSize="7.5" fill={isFri ? "var(--color-emerald)" : "var(--color-ink-soft)"}>
                    {isFri ? "14:00" : "FULL"}
                  </text>
                </g>
              );
            })}
            <text x="305" y="76" fill={done ? "var(--color-emerald)" : "var(--color-ink-soft)"} fontWeight="600" fontSize="8.5">
              {done ? "✓ CM-041 WORK ORDER SCHEDULED" : "SHIFT PLAN: FRIDAY OPEN"}
            </text>
          </>
        )}

        {kind === "risk" && (
          <>
            <path d="M 50 36 L 190 24 L 430 52" fill="none" stroke="var(--color-signal)" strokeWidth="1.6" strokeDasharray="4 4" opacity={done ? 0.25 : 0.65} />
            <path d="M 50 36 L 190 74 L 430 52" className={`chart-action evidence-draw interactive-draw ${step >= 1 ? "is-drawn" : ""}`} strokeWidth="2.2" />
            {[
              [50, 36, "SUPPLIER 01", "GLOBAL TIER-1", false],
              [190, 24, "PORT PRIMARY LANE", "14-DAY MARITIME DELAY", true],
              [190, 74, "SUPPLIER 02", "DOMESTIC BACKUP · 4-DAY", false],
              [430, 52, "PLANT 01", "DESTINATION", false],
            ].map(([x, y, label, sub, isRisk], i) => (
              <g key={String(label)} transform={`translate(${x}, ${y})`}>
                <circle r="6" fill={isRisk ? "var(--color-signal)" : i === 2 && step >= 1 ? "var(--color-emerald)" : "var(--tone)"} fillOpacity="0.2" />
                <circle r="3.5" fill={isRisk ? "var(--color-signal)" : i === 2 && step >= 1 ? "var(--color-emerald)" : "var(--tone)"} />
                <text x="0" y={i === 1 ? -12 : 16} textAnchor="middle" fontWeight="600" fontSize="8.5" fill="var(--color-ink)">
                  {label}
                </text>
                <text x="0" y={i === 1 ? -21 : 25} textAnchor="middle" fontSize="7" fill={isRisk ? "var(--color-signal)" : i === 2 && step >= 1 ? "var(--color-emerald)" : "var(--color-ink-soft)"}>
                  {sub}
                </text>
              </g>
            ))}
            <text x="430" y="94" textAnchor="end" fill={done ? "var(--color-emerald)" : "var(--color-ink-soft)"} fontWeight="600" fontSize="8.5">
              {done ? "✓ 2 CRITICAL PARTS REROUTED TO SUPPLIER 02" : step === 1 ? "SUPPLIER 02 CAPACITY & LEAD TIME VERIFIED" : "SUPPLY EXCEPTION DETECTED"}
            </text>
          </>
        )}

        {kind === "sales" && (
          <>
            {["EAST", "CENTRAL", "WEST"].map((label, i) => {
              const isWest = i === 2;
              const isEast = i === 0;
              const sub = isEast ? "SURPLUS" : isWest ? "SHORTFALL" : "EQUILIBRIUM";
              const barW = [done ? 190 : 250, 210, done ? 290 : 190][i];
              const quotaX = 100 + [220, 210, 280][i];
              return (
                <g key={label} transform={`translate(0, ${8 + i * 27})`}>
                  <text x="0" y="12" fontWeight="600" fontSize="9">{label}</text>
                  <text x="0" y="21" fontSize="7" fill="var(--color-ink-soft)">{sub}</text>
                  <rect x="100" y="4" width="300" height="15" rx="3" fill="var(--color-line)" fillOpacity="0.35" />
                  <rect
                    x="100"
                    y="4"
                    width={barW}
                    height="15"
                    rx="3"
                    fill={isWest ? (done ? "var(--color-emerald)" : "var(--color-signal)") : isEast && done ? "var(--tone)" : "var(--color-line-strong)"}
                    fillOpacity={isWest ? (done ? 0.35 : 0.45) : 0.6}
                    style={{ transition: "all 600ms var(--ease-out-quint)" }}
                  />
                  <line x1={quotaX} y1="2" x2={quotaX} y2="21" stroke="var(--color-ink)" strokeWidth="1.5" strokeDasharray="2 2" />
                  <text x="530" y="16" textAnchor="end" fontWeight="600" fontSize="8.5" fill={isWest ? (done ? "var(--color-emerald)" : "var(--color-signal)") : "var(--color-ink)"}>
                    {isWest ? (done ? "+12% ALLOCATED" : "DEMAND > STOCK") : isEast ? (done ? "RESERVE SECURE" : "AVAILABLE") : "STABLE"}
                  </text>
                </g>
              );
            })}
            <text x="100" y="94" fill="var(--color-ink-soft)" fontSize="8">BAR: ALLOCATED STOCK</text>
            <text x="240" y="94" fill="var(--color-ink-soft)" fontSize="8">DASHED MARK: VALIDATED DEALER ORDERS</text>
          </>
        )}

        {kind === "customer" && (
          <>
            {Array.from({ length: 14 }, (_, i) => {
              const col = i % 7;
              const row = Math.floor(i / 7);
              const x = 14 + col * 28;
              const y = 14 + row * 34;
              return (
                <g key={i}>
                  {step >= 1 && (
                    <line x1={x + 9} y1={y + 11} x2="290" y2="44" stroke="var(--tone)" strokeOpacity="0.28" strokeDasharray="2 2" />
                  )}
                  <rect x={x} y={y} width="20" height="23" rx="2.5" fill="var(--tone)" fillOpacity="0.14" stroke="var(--tone)" strokeOpacity="0.55" />
                  <line x1={x + 3} y1={y + 6} x2={x + 14} y2={y + 6} stroke="var(--tone)" strokeOpacity="0.6" />
                  <line x1={x + 3} y1={y + 11} x2={x + 10} y2={y + 11} stroke="var(--tone)" strokeOpacity="0.6" />
                </g>
              );
            })}
            <g transform="translate(290, 44)">
              <circle r="26" fill="none" stroke={step >= 1 ? "var(--color-pink)" : "var(--color-line-strong)"} strokeWidth="1.5" strokeDasharray={step >= 1 ? undefined : "3 3"} style={{ transition: "all 400ms ease" }} />
              <circle r="14" fill="var(--color-pink)" fillOpacity="0.15" stroke="var(--color-pink)" strokeWidth="1.5" />
              <text x="0" y="3" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="var(--color-ink)">BEARING X90</text>
              <text x="0" y="36" textAnchor="middle" fontSize="7" fill="var(--color-ink-soft)">COMMON COMPONENT</text>
            </g>
            <path d="M 320 44 H 420" className={`chart-action evidence-draw interactive-draw ${done ? "is-drawn" : ""}`} strokeWidth="2" />
            {done && (
              <g transform="translate(440, 44)">
                <circle r="13" fill="var(--color-emerald)" fillOpacity="0.15" stroke="var(--color-emerald)" strokeWidth="1.5" />
                <path d="M -4 0 L -1 3 L 5 -3" fill="none" stroke="var(--color-emerald)" strokeWidth="1.8" />
                <text x="0" y="24" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="var(--color-emerald)">ONE ESCALATION</text>
              </g>
            )}
            <text x="14" y="94" fill="var(--color-ink-soft)" fontSize="8">14 ISOLATED WARRANTY TICKETS</text>
            <text x="530" y="94" textAnchor="end" fill={done ? "var(--color-emerald)" : "var(--color-ink-soft)"} fontWeight="600" fontSize="8">
              {done ? "✓ 14 CASES CONSOLIDATED TO 1 ENGINEERING ESCALATION" : "CROSS-RECORD PATTERN RECOGNITION"}
            </text>
          </>
        )}

        {kind === "finance" && (
          <>
            <text x="0" y="14" fill="var(--color-ink-soft)" fontSize="8">TRANSACTION</text>
            <text x="140" y="14" textAnchor="middle" fill="var(--color-ink-soft)" fontSize="8">PURCHASE ORDER (PO)</text>
            <text x="260" y="14" textAnchor="middle" fill="var(--color-ink-soft)" fontSize="8">GOODS RECEIPT (GRN)</text>
            <text x="375" y="14" textAnchor="middle" fill="var(--color-ink-soft)" fontSize="8">INVOICE VALUE</text>
            <text x="530" y="14" textAnchor="end" fill="var(--color-ink-soft)" fontSize="8">MATCH STATUS</text>
            <line x1="0" y1="19" x2="530" y2="19" className="chart-grid" />
            {[
              ["INV-001 / ACME", "INR 420,000"],
              ["INV-002 / BHARAT", "INR 680,000"],
              ["INV-003 / KINETIC", "INR 310,000"],
            ].map(([inv, amount], row) => (
              <g key={inv} transform={`translate(0, ${26 + row * 19})`}>
                <text x="0" y="10" fontWeight="600" fontSize="8.5">{inv}</text>
                <Tick x={140} y={6} ok={true} />
                <Tick x={260} y={6} ok={false} />
                <text x="375" y="10" textAnchor="middle" fontWeight="500" fontSize="8.5">{amount}</text>
                <text x="530" y="10" textAnchor="end" fontWeight="600" fontSize="8" fill="var(--color-signal)">
                  {done ? "HOLD APPLIED" : "RECEIPT MISSING"}
                </text>
                <line x1="0" y1="16" x2="530" y2="16" className="chart-grid" strokeDasharray="2 3" />
              </g>
            ))}
            <text x="530" y="94" textAnchor="end" fill={done ? "var(--color-saffron)" : "var(--color-signal)"} fontWeight="600" fontSize="8">
              {done ? "✓ INR 1.41M PAYMENT LOCKED PENDING WAREHOUSE RECEIPT" : "3 INVOICES RECEIVED WITHOUT PROOF OF DELIVERY"}
            </text>
          </>
        )}
      </svg>

      {/* Decision Impact Metric Cards (matching Decision section's 3-column card) */}
      {demo?.readings && (
        <dl className="evidence-metrics mt-2 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-xl border border-line bg-paper/90 text-left shadow-[0_2px_8px_-4px_rgba(20,19,15,0.06)]">
          {demo.readings.map(([k, v], i) => (
            <div key={k} className="evidence-reading min-w-0 px-2.5 py-1.5 md:px-3" data-active={i === step || undefined}>
              <dt className="eyebrow evidence-reading-label text-ink-soft leading-none">{k}</dt>
              <dd className="tabular mt-0.5 font-serif text-[12.5px] font-semibold text-ink whitespace-nowrap leading-tight md:text-[14px]">
                {/^\+?\d/.test(v) && !v.includes(":") ? <CountUp value={v} duration={700} /> : v}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="evidence-conclusion mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-ink-2 leading-tight" key={step}>
        <span className="font-mono text-xs" style={{ color: done ? "var(--color-emerald)" : "var(--tone)" }}>
          {done ? "✓" : "↳"}
        </span>
        {STATUS[kind][step]}
      </p>
    </div>
  );
}
