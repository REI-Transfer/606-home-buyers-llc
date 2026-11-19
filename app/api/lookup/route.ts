import { NextResponse } from "next/server"
import config from "@/lib/config"
import { lookupProperty, simulatedLookup, applyConditionRule, recordUsable, questionsToAsk, parseUsAddress, SCENARIOS, type LookupInput } from "@/lib/dealmachine"

// One-step property-record form (components/v2/record-survey-card.tsx, one-step mode):
// checks the house right after the address and condition, before any question, so
// the form asks only what the record could not answer and screens out before the
// contact step, like today's one-step form. Sends nothing anywhere (no n8n, no
// GoFunnel, no CRM). The final submit checks the same house again: no new credit.

const log = new Map<string, { count: number; first: number }>()
function limited(ip: string): boolean {
  const now = Date.now()
  const e = log.get(ip)
  if (!e || now - e.first > 60 * 60 * 1000) { log.set(ip, { count: 1, first: now }); return false }
  e.count++
  return e.count > (config.showroom ? 60 : 8)
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
    if (limited(ip)) return NextResponse.json({ success: false }, { status: 429 })
    const data = await request.json()
    const address = typeof data.address === "string" ? data.address : ""
    if (!address.trim()) return NextResponse.json({ success: false }, { status: 400 })
    const parsed = parseUsAddress(address)
    const input: LookupInput = {
      street: address.split(",")[0].trim(),
      city: data.city || parsed.city, state: data.state || parsed.state, zip: data.zip || parsed.zip,
      lastName: "", // not known yet on the one-step form: the owner question is asked
    }
    const scenario = config.showroom && typeof data.dm_scenario === "string" && data.dm_scenario in SCENARIOS ? data.dm_scenario : ""
    let dm = scenario ? await simulatedLookup(scenario, input, "") : await lookupProperty(input, {})
    dm = applyConditionRule(dm, typeof data.condition === "string" ? data.condition : "")
    return NextResponse.json({
      success: true,
      matched: recordUsable(dm),
      is_mobile: dm.is_mobile,
      ask: questionsToAsk(dm),
      verdict: dm.verdict,
      dq_reason: dm.dq_reason,
      excellent_bypass: dm.excellent_bypass === true,
      ...(config.showroom ? { demo: {
        simulated: dm.simulated || "", matched: dm.matched, equity_pct: dm.equity_pct, equity_band: dm.equity_band,
        verdict: dm.verdict, dq_reason: dm.dq_reason, credits_used: dm.credits_used, summary: dm.summary, trace: dm.trace || "",
        meta_event: "none (record check before the questions)",
      } } : {}),
    })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
