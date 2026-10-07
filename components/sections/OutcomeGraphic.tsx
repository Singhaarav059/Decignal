/** The picture behind each outcome, drawn in white for a coloured card. Used by Outcomes and by
 *  the nav's glance of it. */
export const OUTCOME_FILL = ["var(--color-cobalt)", "var(--color-tangerine)", "var(--color-emerald)"];

export function OutcomeGraphic({ index }: { index: number }) {
  return <svg className="outcome-diagram" viewBox="0 0 300 100" role="img" aria-label={["Transfer arrives on day 2, before the day 6 safety breach", "380 units retained equals the source plant’s reserved plan", "Fourteen service cases linked to one escalation"][index]}>
    {index === 0 ? <>
      <path d="M12 58H288" stroke="currentColor" strokeOpacity=".3" />
      {[0,1,2,3,4,5,6].map(i=><g key={i}><path d={`M${12+i*46} 52v12`} stroke="currentColor" strokeOpacity=".5"/><text x={12+i*46} y="88" textAnchor="middle">{i===0?"NOW":`D${i}`}</text></g>)}
      <path className="outcome-stroke" pathLength="1" d="M12 58H104" stroke="white" strokeWidth="4"/><circle cx="104" cy="58" r="6" fill="white"/><text x="104" y="30" textAnchor="middle">ARRIVES</text><text x="274" y="30" textAnchor="end">RISK</text>
    </> : index === 1 ? <>
      <text x="0" y="19">RETAINED</text><text x="300" y="19" textAnchor="end">380</text><rect x="0" y="29" width="300" height="11" rx="3" fill="white" fillOpacity=".2"/><rect className="outcome-bar" x="0" y="29" width="184" height="11" rx="3" fill="white"/>
      <text x="0" y="70">RESERVED PLAN</text><text x="300" y="70" textAnchor="end">380</text><rect x="0" y="80" width="184" height="5" rx="2" fill="white" fillOpacity=".6"/><path d="M184 24V92" stroke="white" strokeDasharray="3 3"/>
    </> : <>
      {Array.from({length:14},(_,i)=><g key={i}><path d={`M${8+i%7*22} ${24+Math.floor(i/7)*40}L232 44`} stroke="white" strokeOpacity=".18"/><rect x={i%7*22} y={12+Math.floor(i/7)*40} width="14" height="22" rx="2" fill="white" fillOpacity=".7"/></g>)}<circle cx="249" cy="44" r="24" fill="none" stroke="white" strokeWidth="2"/><path d="M238 44l8 8 14-16" stroke="white" strokeWidth="2" fill="none"/><text x="249" y="92" textAnchor="middle">ONE OWNER</text>
    </>}
  </svg>;
}
