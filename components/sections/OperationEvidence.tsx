"use client";

import type { DemoKind } from "@/lib/application-demos";

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
  return <g transform={`translate(${x} ${y})`}><circle r="8" fill={ok ? "var(--color-emerald)" : "var(--color-signal)"} fillOpacity=".12"/><path d={ok ? "M-3 0l2 2 4-5" : "M-3 0h6"} stroke={ok ? "var(--color-emerald)" : "var(--color-signal)"} fill="none" strokeWidth="1.5"/></g>;
}

/** Each instrument explains a different operational constraint, and shows what changes. */
export function OperationEvidence({ kind, step }: { kind: DemoKind; step: number }) {
  const done = step === 2;
  return <div className="operation-evidence" data-kind={kind} data-step={step}>
    <div className="evidence-heading"><span className="spec-label">{({inventory:"Projected stock · Plant 01",demand:"Regional demand / replenishment",production:"Work allocation · 14:00 shift",maintenance:"Asset condition / service window",risk:"Supply dependencies / route decision",sales:"Dealer orders / allocation",customer:"Case relationships / common part",finance:"Purchase control / three-way match"})[kind]}</span><span className="evidence-state"><i/>{["Signal detected", "Evidence connected", "Action prepared"][step]}</span></div>
    <svg key={`${kind}-${step}`} viewBox="0 0 520 112" role="img" aria-label={STATUS[kind][step]}>
      {kind === "inventory" && <>
        {[28,58,88].map(y=><path key={y} d={`M34 ${y}H482`} className="chart-grid"/>)}
        <path d="M34 40L106 48L178 56L250 64L322 72L394 80L466 88" className="chart-risk"/>
        <path d="M34 82H482" className="chart-risk" strokeDasharray="3 4" opacity=".5"/>
        {done && <path d="M34 40L106 48L178 56L178 13L250 21L322 29L394 37L466 45" className="chart-action evidence-draw"/>}
        <circle cx={done?178:466} cy={done?13:88} r="4" fill={done?"var(--color-emerald)":"var(--color-signal)"}/>
        <text x="482" y="78" textAnchor="end">SAFETY 175</text><text x="34" y="108">TODAY · 410</text><text x="178" y="108" textAnchor="middle">D2{done?" · +240":""}</text><text x="466" y="108" textAnchor="end">D6 · {done?380:140}</text>
      </>}
      {kind === "demand" && <>
        {["NORTH","CENTRAL","WEST"].map((label,i)=><g key={label}><text x="0" y={25+i*32}>{label}</text><rect x="88" y={12+i*32} width={[208,260,done?320:200][i]} height="8" rx="2" fill="var(--tone)" opacity=".22"/><rect x="88" y={22+i*32} width={[192,248,320][i]} height="8" rx="2" fill={i===2&&!done?"var(--color-signal)":"var(--tone)"}/><text x="500" y={25+i*32} textAnchor="end">{i===2?(done?"+1,800 ORDERED":"PLAN GAP"):"IN RANGE"}</text></g>)}
        <text x="88" y="110">LIGHT · PLAN</text><text x="210" y="110">SOLID · DEMAND</text>
      </>}
      {kind === "production" && <>
        {["LINE 03","LINE 02"].map((label,row)=><g key={label}><text x="0" y={32+row*44}>{label}</text><path d={`M100 ${45+row*44}H464`} className="chart-grid"/>{Array.from({length:6},(_,i)=>{const visible=row===0?(done?i<3:true):(done?i<3:false);return <rect key={i} x={110+i*52} y={15+row*44} width="36" height="24" rx="3" fill={visible?(row===0&&!done?"var(--color-signal)":"var(--color-emerald)"):"none"} fillOpacity=".16" stroke={visible?(row===0&&!done?"var(--color-signal)":"var(--color-emerald)"):"var(--color-line-strong)"} strokeDasharray={visible?undefined:"3 3"}/>})}<text x="510" y={32+row*44} textAnchor="end">{row===0?(done?"3 LOTS":"6 LOTS"):(done?"3 LOTS":"READY")}</text></g>)}
        {step===1&&<path d="M255 36v28" className="chart-action evidence-draw" strokeDasharray="4 3"/>}<text x="100" y="110">{done?"REVISED SEQUENCE · BALANCED CAPACITY":"PO-2207 · NEXT THREE LOTS ARE COMPATIBLE"}</text>
      </>}
      {kind === "maintenance" && <>
        <path d="M0 46H295" className="chart-grid" strokeDasharray="3 4"/><path d="M0 45L15 43L29 49L42 36L54 44L69 30L82 47L97 26L112 40L128 19L145 38L163 14L181 34L200 9L221 31L244 4L267 24L292 7" className="chart-risk evidence-draw"/>
        <text x="0" y="75">V-04 · RELATIVE TO BASELINE</text><path d="M326 8v84" className="chart-grid"/>
        <text x="347" y="20">SERVICE WINDOW</text>{["THU","FRI","SAT"].map((d,i)=><g key={d}><rect x={348+i*53} y="35" width="43" height="35" rx="4" fill={i===1?"var(--color-emerald)":"none"} fillOpacity={done?.18:.06} stroke={i===1?"var(--color-emerald)":"var(--color-line)"}/><text x={369+i*53} y="57" textAnchor="middle">{d}</text></g>)}<text x="348" y="93">{done?"CM-041 · RESERVED":"SHIFT PLAN CROSS-CHECKED"}</text>
      </>}
      {kind === "risk" && <>
        <path d="M72 36L238 25L444 57" className="chart-risk" strokeDasharray="4 4" opacity=".4"/><path d="M72 36L238 85L444 57" className={step>0?"chart-action evidence-draw":"chart-grid"}/>
        {[[72,36,"SUPPLIER"],[238,25,"PORT · DELAYED"],[238,88,"SUPPLIER 02"],[444,57,"PLANT 01"]].map(([x,y,label],i)=><g key={String(label)}><circle cx={Number(x)} cy={Number(y)} r="6" fill={i===1?"var(--color-signal)":i===2&&step>0?"var(--color-emerald)":"var(--tone)"}/><text x={Number(x)} y={Number(y)+(i===1?-14:20)} textAnchor="middle">{label}</text></g>)}<text x="330" y="92">{done?"2 PARTS REROUTED":step===1?"CAPACITY VERIFIED":"DEPENDENCY FOUND"}</text>
      </>}
      {kind === "sales" && <>
        {["EAST","CENTRAL","WEST"].map((label,i)=><g key={label}><text x="0" y={26+i*32}>{label}</text><rect x="90" y={12+i*32} width={[done?210:270,220,done?280:220][i]} height="14" rx="2" fill={i===2?"var(--tone)":"var(--color-line-strong)"}/><path d={`M${90+[230,210,280][i]} ${8+i*32}v23`} stroke="var(--color-ink-soft)" strokeDasharray="2 2"/><text x="505" y={26+i*32} textAnchor="end">{i===2?(done?"+12% ALLOCATED":"ORDERS > STOCK"):i===0?(done?"RESERVE KEPT":"STOCK AVAILABLE"):"BALANCED"}</text></g>)}<text x="90" y="110">BAR · ALLOCATION / MARK · ORDER REQUIREMENT</text>
      </>}
      {kind === "customer" && <>
        {Array.from({length:14},(_,i)=><g key={i}>{step>0&&<path d={`M${18+i%7*27} ${22+Math.floor(i/7)*45}L300 49`} stroke="var(--tone)" strokeOpacity=".2"/>}<rect x={8+i%7*27} y={10+Math.floor(i/7)*45} width="19" height="27" rx="2" fill="var(--tone)" fillOpacity=".14" stroke="var(--tone)" strokeOpacity=".5"/><path d={`M${12+i%7*27} ${19+Math.floor(i/7)*45}h11m-11 5h8`} stroke="var(--tone)" strokeOpacity=".5"/></g>)}
        <circle cx="305" cy="48" r="27" fill="none" stroke={step>0?"var(--tone)":"var(--color-line-strong)"}/><circle cx="305" cy="48" r="13" fill="none" stroke="var(--tone)"/><text x="305" y="98" textAnchor="middle">BEARING X90</text>{done&&<><path d="M334 48H429" className="chart-action evidence-draw"/><Tick x={448} y={48} ok/><text x="448" y="78" textAnchor="middle">ONE OWNER</text></>}
      </>}
      {kind === "finance" && <>
        {["PURCHASE ORDER","GOODS RECEIPT","INVOICE"].map((label,col)=><text key={label} x={185+col*132} y="13" textAnchor="middle">{label}</text>)}
        {[1,2,3].map((n,row)=><g key={n}><text x="0" y={39+row*27}>INV-00{n}</text><path d={`M110 ${48+row*27}H510`} className="chart-grid"/>{[0,1,2].map(col=><Tick key={col} x={185+col*132} y={34+row*27} ok={col!==1}/>)}</g>)}
        <text x="510" y="111" textAnchor="end" fill="var(--color-signal)">{done?"PAYMENT CONTROL · HOLD ALL THREE":"RECEIPT REQUIRED BEFORE PAYMENT"}</text>
      </>}
    </svg>
    <p className="evidence-conclusion" key={step}><span>{step===2?"→":"↳"}</span>{STATUS[kind][step]}</p>
  </div>;
}
