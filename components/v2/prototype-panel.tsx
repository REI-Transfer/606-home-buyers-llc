"use client"

// Showroom only (SHOWROOM=1): shows a reviewer what the property record said and
// which Meta event the real site would fire. Never rendered on a client site.

export interface DemoInfo {
  simulated: string
  matched: boolean
  equity_pct: number | null
  equity_band: string
  verdict: string
  dq_reason: string | null
  credits_used: number
  summary: string
  meta_event: string
  lead_stage?: string
  trace?: string
  crm_fields?: Record<string, string>
  lead_score?: number
  lead_quality?: string
  meta_value?: number
}

export const DEMO_SCENARIOS = [
  { id: "", label: "Real lookup (1 credit)" },
  { id: "equity-30plus", label: "Simulate: 62% equity (Lead)" },
  { id: "equity-20to29", label: "Simulate: 25% equity (low equity, LeadLowIntent)" },
  { id: "equity-under20", label: "Simulate: 8% equity (screened out)" },
  { id: "listed", label: "Simulate: listed for sale now (screened out)" },
  { id: "condo", label: "Simulate: condo on record (screened out)" },
  { id: "townhouse", label: "Simulate: townhouse on record (screened out)" },
  { id: "mobile-home", label: "Simulate: mobile home (screened out unless the client buys them)" },
  { id: "no-record", label: "Simulate: no record found (old questions)" },
  { id: "no-value", label: "Simulate: record found but no value (old questions)" },
  { id: "missing-fields", label: "Simulate: record with gaps (asks owner, type, years owned)" },
  { id: "distress", label: "Simulate: pre-foreclosure + judgment lien (Excellent gets through)" },
  { id: "routine-lien", label: "Simulate: community-fee lien only (Excellent gets through)" },
  { id: "motivation", label: "Simulate: vacant, owner out of state (Excellent gets through)" },
]

export function PrototypePanel({ demo }: { demo: DemoInfo | null }) {
  if (!demo) return null
  return (
    <div className="mt-4 w-full max-w-2xl rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-left text-sm text-[#0F1D2F]">
      <p className="font-semibold">Prototype info (only on the demo site, sellers never see this)</p>
      <ul className="mt-2 space-y-0.5">
        <li>Property lookup: {demo.simulated ? `simulated (${demo.simulated})` : "real lookup"}, {demo.matched ? "record found" : "no record"}</li>
        <li>Equity: {demo.equity_pct == null ? "unknown" : `${demo.equity_pct}% (${demo.equity_band})`}</li>
        <li>Verdict: {demo.verdict}{demo.dq_reason ? ` (${demo.dq_reason})` : ""}</li>
        <li>Meta event the live site would fire: {demo.meta_event || "none"}</li>
        {demo.lead_score != null && <li>Lead score sent: {demo.lead_score} ({demo.lead_quality}), Lead value: {demo.meta_value ?? 0}</li>}
        <li>Credits used by this check: {demo.credits_used}</li>
        {demo.trace && <li>Lookup calls: {demo.trace}</li>}
      </ul>
      {demo.crm_fields && (
        <div className="mt-3">
          <p className="font-semibold">Fields the client&apos;s CRM / Zap receives (same names and values as the old form)</p>
          <ul className="mt-1 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {Object.entries(demo.crm_fields).map(([k, v]) => <li key={k}><span className="font-mono text-xs">{k}</span>: {v || "(blank)"}</li>)}
          </ul>
        </div>
      )}
      {demo.summary && (
        <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-xs leading-relaxed">{demo.summary}</pre>
      )}
    </div>
  )
}
