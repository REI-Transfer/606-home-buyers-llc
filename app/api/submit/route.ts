import { NextResponse } from "next/server"
import config from "@/lib/config"
import { calculateLeadScore, leadQuality } from "@/lib/lead-score"
import { lookupProperty, simulatedLookup, withPriority, applyConditionRule, legacyAnswers, recordUsable, questionsToAsk, parseUsAddress, SCENARIOS, type LookupInput, type LookupResult } from "@/lib/dealmachine"
import { sellerAnswerRule } from "@/lib/form-rules"

const FORM_SLUG =
  (config.companyName || "landing").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-survey"
const FORM_TITLE = `${config.companyName} Survey`

// Simple in-memory rate limiter (resets on deploy/restart)
const submissionLog = new Map<string, { count: number; firstSubmit: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const window = 60 * 60 * 1000 // 1 hour
  // 6 per IP per hour: the two-step form sends 2 calls per person (early +
  // complete), so 6 keeps the old 3-people headroom.
  // Showroom: room for a reviewer to walk every prototype path in one sitting.
  const maxSubmissions = config.showroom ? 40 : 6

  const entry = submissionLog.get(ip)
  if (!entry) {
    submissionLog.set(ip, { count: 1, firstSubmit: now })
    return false
  }

  // Reset window if expired
  if (now - entry.firstSubmit > window) {
    submissionLog.set(ip, { count: 1, firstSubmit: now })
    return false
  }

  entry.count++
  return entry.count > maxSubmissions
}

// "123 Main St, Austin, TX 78701, USA" → "123 Main St"
const streetOf = (address: string) => (address || "").split(",")[0].trim()

// Low equity (20-29%) fires LeadLowIntent, an event GoFunnel already handles (William
// 2026-11-17: no separate LeadLowEquity). The "low equity" label stays in record_verdict,
// record_equity_band and property_summary for the CRM and tracker.
const META_EVENT_FOR: Record<string, string> = { lead: "Lead", low_equity: "LeadLowIntent", low_intent: "LeadLowIntent" }

// Property record fields for n8n. Booleans/numbers as-is, empty = "". Neutral names:
// a client webhook that receives the whole payload must not learn the data vendor.
function dmFields(dm: LookupResult, priority: string, reasonDetails: string) {
  return {
    record_found: dm.matched,
    record_equity_pct: dm.equity_pct ?? "",
    record_equity_band: dm.equity_band,
    record_value: dm.value ?? "",
    record_owed: dm.owed ?? "",
    record_verdict: dm.verdict,
    record_dq_reason: dm.dq_reason ?? "",
    record_listed_now: dm.listed_now,
    record_owner_match: dm.owner_match ?? "",
    record_distress: dm.distress.join("; "),
    record_excellent_bypass: dm.excellent_bypass === true,
    property_summary: withPriority(dm.summary, priority, reasonDetails),
    lookup_credits: dm.credits_used,
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown"

    // Rate limit: max 6 submissions per IP per hour
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many submissions. Please try again later." },
        { status: 429 }
      )
    }

    const data = await request.json()

    // Two-step form (NEXT_PUBLIC_TWO_STEP_FORM=1) sends lead_stage:
    //   'early'        stage 1 contact details (partial lead)
    //   'complete'     finished survey
    //   'disqualified' stage-2 hard DQ after the early lead was sent
    // Missing or unknown = 'complete', so the one-step form (which never sends
    // lead_stage) keeps today's behaviour.
    const stage: "early" | "complete" | "disqualified" =
      data.lead_stage === "early" ? "early" : data.lead_stage === "disqualified" ? "disqualified" : "complete"

    // Server-side validation (every stage: stage 1 already collects name,
    // email, phone and address)
    const phone = (data.phone || "").replace(/\D/g, "").replace(/^1/, "")
    if (phone.length !== 10) {
      return NextResponse.json({ success: false, error: "Invalid phone" }, { status: 400 })
    }

    const email = (data.email || "").trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Invalid email" }, { status: 400 })
    }

    // Support both firstName/lastName (new) and name (legacy)
    if (!(data.firstName || data.name || "").trim()) {
      return NextResponse.json({ success: false, error: "Name required" }, { status: 400 })
    }

    if (!(data.address || "").trim()) {
      return NextResponse.json({ success: false, error: "Address required" }, { status: 400 })
    }

    // Add server IP to payload. lead_stage is normalized only when the caller
    // sent one, so one-step payloads reach the webhook exactly as before.
    const payload: Record<string, unknown> = data.lead_stage === undefined
      ? { ...data, server_ip: ip }
      : { ...data, server_ip: ip, lead_stage: stage }
    // Property-record form (components/v2/record-survey-card.tsx) only: record_check marks
    // its posts; record_mode "one-step" = the one-step version (one post, at the end).
    // Every other form posts exactly as before and is never looked up.
    const recordCheck = data.record_check === true
    const oneStep = recordCheck && data.record_mode === "one-step"
    delete payload.record_check
    delete payload.record_mode

    // ── Property record check (property-record form only) ─────────────────
    // Two-step: early (contact details) and complete posts. One-step: the single
    // post at the end (its first check ran on /api/lookup; same house = no new credit).
    // Never for a disqualified post. An "Excellent" seller is checked too: the record
    // decides whether they come through (applyConditionRule).
    let dm: LookupResult | null = null
    let excellentOut = false
    if (recordCheck && stage !== "disqualified") {
      // City / state / ZIP come from the address picker; when the address was typed in
      // the hero box they are blank, so read them from the address text instead.
      const parsed = parseUsAddress(typeof data.address === "string" ? data.address : "")
      const input: LookupInput = {
        street: streetOf(data.address), city: data.city || parsed.city, state: data.state || parsed.state,
        zip: data.zip || parsed.zip, lastName: data.lastName || "",
      }
      // Fill the same blanks in what n8n / the CRM receives (only where empty).
      for (const k of ["city", "state", "zip"] as const) {
        if (!(typeof data[k] === "string" && data[k].trim()) && parsed[k]) payload[k] = parsed[k]
      }
      const landOwned = typeof data.landOwned === "string" ? data.landOwned : ""
      // Prototype scenarios: showroom only, ignored on every client site.
      const scenario = config.showroom && typeof data.dm_scenario === "string" && data.dm_scenario in SCENARIOS
        ? data.dm_scenario : ""
      dm = scenario ? await simulatedLookup(scenario, input, landOwned) : await lookupProperty(input, { landOwned })
      dm = applyConditionRule(dm, typeof data.condition === "string" ? data.condition : "")
      // The seller's own answers, by this client's rules (lib/form-rules.ts): an answer the
      // client takes only as low intent turns a record Lead into a low intent lead.
      if (stage === "complete" && (dm.verdict === "lead" || dm.verdict === "low_equity")) {
        const own = sellerAnswerRule(data, recordUsable(dm))
        if (own.rule === "low_intent") dm = { ...dm, verdict: "low_intent" }
        else if (own.rule === "dq") dm = { ...dm, verdict: "dq", dq_reason: null }
      }
      excellentOut = dm.dq_reason === "excellentCondition"
      Object.assign(payload, dmFields(dm, typeof data.priority === "string" ? data.priority : "",
        typeof data.reasonDetails === "string" ? data.reasonDetails : ""))
      // Same fields, same format: fill the old answer fields the seller wasn't asked,
      // from the record, so every client's Zap / CRM mapping keeps working untouched.
      if (dm.matched) {
        for (const [k, v] of Object.entries(legacyAnswers(dm))) {
          const answered = typeof data[k] === "string" && data[k].trim() !== ""
          if (v && !answered) payload[k] = v
        }
      }
      delete payload.dm_scenario

      if (stage === "early" && excellentOut) {
        // "Excellent" with no distress or motivation on record: screened out right after the
        // contact screen. Tracker only, never the client CRM, no Meta event.
        Object.assign(payload, {
          lead_stage: "disqualified", qualified: false, disqualify_reason: "excellent_condition",
          meta_event_name: "", meta_value: 0, stage1_event_id: data.meta_event_id,
        })
      } else if (stage === "early" && dm.verdict === "dq") {
        // Screened out by the record already (listed, property type, equity): the seller
        // still answers the rest and sees the normal thank-you page (William 2026-11-17),
        // but the early post goes as disqualified, so n8n never forwards it to the client
        // as a partial lead. Tracker only, no Meta event, no GoFunnel.
        Object.assign(payload, {
          lead_stage: "disqualified", qualified: false, disqualify_reason: dm.dq_reason,
          meta_event_name: "", meta_value: 0, stage1_event_id: data.meta_event_id,
        })
      } else if (stage === "complete" && dm.verdict === "dq") {
        // Screened out by the record: tracker only, never the client CRM, no Meta event.
        Object.assign(payload, {
          lead_stage: "disqualified", qualified: false, disqualify_reason: dm.dq_reason,
          meta_event_name: "", meta_value: 0,
        })
      } else if (stage === "complete" && META_EVENT_FOR[dm.verdict]) {
        Object.assign(payload, {
          qualified: dm.verdict === "lead",
          meta_event_name: META_EVENT_FOR[dm.verdict],
          meta_value: dm.verdict === "lead" ? payload.meta_value : 0,
        })
      }
    }
    // Re-score after the record filled the answers the seller was not asked, so
    // lead_score / lead_quality / the Lead value match the old form for the same house.
    if (dm) {
      const s = (k: string) => (typeof payload[k] === "string" ? (payload[k] as string) : "")
      const score = calculateLeadScore({ timeline: s("timeline"), ownershipLength: s("ownershipLength"), reason: s("reason"), condition: s("condition") })
      payload.lead_score = score
      payload.lead_quality = leadQuality(score)
      // Lead value: record says Lead → score x 25. No usable record (old rules) → keep
      // the browser's Lead / no-Lead decision, re-valued with the same score.
      if (stage === "complete") {
        if (dm.verdict === "lead") payload.meta_value = score * 25
        else if (dm.verdict === "fallback" && Number(payload.meta_value) > 0) payload.meta_value = score * 25
        else payload.meta_value = 0
      }
    }
    const dmDq = dm?.verdict === "dq"
    // One-step form: a seller screened out at the very end is not sent anywhere, the
    // same as today's one-step form (its screen-outs happen before the contact step,
    // so nothing was ever sent). One-step handlers have no "disqualified" route.
    const skipWebhook = oneStep && (dmDq || payload.lead_stage === "disqualified")
    const dmResponse = !dm ? {} : stage === "early"
      // matched = record usable (has a value). ask = old questions the record
      // could not answer, so every lead reaches the client with every old field filled.
      ? { matched: recordUsable(dm), is_mobile: dm.is_mobile, ask: questionsToAsk(dm), screened_out: excellentOut, excellent_bypass: dm.excellent_bypass === true }
      : { verdict: dm.verdict, dq_reason: dm.dq_reason, lead_score: payload.lead_score }

    // Showroom (SHOWROOM=1): demo site only. Accept the submission so the visitor
    // sees the real flow, but send it NOWHERE (no n8n, no GoFunnel, no CRM).
    // The prototype panel gets what the record said and which Meta event would fire.
    if (config.showroom) {
      return NextResponse.json({
        success: true, showroom: true, ...dmResponse,
        demo: dm ? {
          simulated: dm.simulated || "", matched: dm.matched, equity_pct: dm.equity_pct,
          equity_band: dm.equity_band, verdict: dm.verdict, dq_reason: dm.dq_reason,
          credits_used: dm.credits_used, summary: payload.property_summary || "", trace: dm.trace || "",
          lead_score: payload.lead_score, lead_quality: payload.lead_quality, meta_value: payload.meta_value,
          meta_event: stage === "complete" ? (payload.meta_event_name || "none") : excellentOut ? "none (Excellent, no distress or motivation on record)" : "none (early post)",
          lead_stage: payload.lead_stage,
          // What the client's CRM / Zap receives in the fields it already maps.
          crm_fields: Object.fromEntries(["propertyType", "isLegalOwner", "listedOnMarket", "ownershipLength", "condition", "reason", "reasonDetails", "priority", "landOwned"]
            .map((k) => [k, typeof payload[k] === "string" ? payload[k] : ""])),
        } : null,
      })
    }

    // Same WEBHOOK_URL for every stage by default (n8n branches on lead_stage).
    // Optional overrides: WEBHOOK_URL_EARLY for 'early', WEBHOOK_URL_COMPLETE
    // for 'complete' and 'disqualified'.
    const webhookUrl = payload.lead_stage === "early"
      ? (process.env.WEBHOOK_URL_EARLY || process.env.WEBHOOK_URL)
      : (process.env.WEBHOOK_URL_COMPLETE || process.env.WEBHOOK_URL)
    // Guarded: a bad/unreachable n8n URL must never abort the request before the
    // GoFunnel forward below runs (Express Homebuyers FL lost every lead Oct 17-28 2026 this way).
    if (webhookUrl && !skipWebhook) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } catch (e) {
        console.error("[submit] n8n webhook failed", (e as Error)?.message)
      }
    }

    // --- GoFunnel external webhook: forward the lead for gf_sid attribution ---
    // Runs for the COMPLETE stage only.
    try {
      const GF_CREDENTIAL_ID = process.env.GOFUNNEL_WEBHOOK_CREDENTIAL_ID || ""
      const GF_BEARER = process.env.GOFUNNEL_WEBHOOK_SECRET || ""
      // Phase 1 and the finished survey both go to GoFunnel; a stage-2
      // disqualified seller does not. The phase-1 post carries
      // meta_event_name 'LeadEarly', which routes it away from the scored
      // Lead event — it is captured, and fires nothing to Meta.
      // Screened out by the property record (early or complete): no GoFunnel.
      if (stage !== "disqualified" && !dmDq && GF_CREDENTIAL_ID && GF_BEARER) {
        const gfCookie = request.headers.get("cookie") || ""
        const gfMatch = gfCookie.match(/(?:^|; )gf_sid=([^;]*)/)
        const gfSid = (data.gf_sid || (gfMatch ? decodeURIComponent(gfMatch[1]) : "") || "").toString().trim()
        const gfStr = (v: unknown) => (typeof v === "string" && v ? v : undefined)
        const gfName = ((data.name || "") as string).trim().split(/\s+/).filter(Boolean)
        const gfPayload = {
          type: "survey_submitted",
          email: email || undefined,
          phone: phone || undefined,
          firstName: gfStr(data.firstName) || gfName[0] || undefined,
          lastName: gfStr(data.lastName) || (gfName.length > 1 ? gfName.slice(1).join(" ") : undefined),
          sid: gfSid || undefined,
          formId: "rei-survey-template",
          formTitle: `${process.env.COMPANY_NAME || "REI"} Survey`,
          idempotencyKey: gfStr(data.meta_event_id),
          leadQuestions: {
            is_legal_owner: gfStr(data.isLegalOwner),
            listed_on_market: gfStr(data.listedOnMarket),
            property_type: gfStr(data.propertyType),
            timeline: gfStr(data.timeline),
            asking_price: gfStr(data.askingPrice),
            condition: gfStr(data.condition),
            reason: gfStr(data.reason),
            land_owned: gfStr(data.landOwned),
            priority: gfStr(data.priority),
          },
          data: {
            qualified: payload.qualified === true,
            lead_score: payload.lead_score,
            lead_quality: payload.lead_quality,
            meta_event_id: data.meta_event_id,
            meta_event_name: payload.meta_event_name,
            meta_value: payload.meta_value,
            address: data.address,
            state: data.state,
            city: data.city,
            county: data.county,
            utm_source: data.utm_source,
            utm_medium: data.utm_medium,
            utm_campaign: data.utm_campaign,
            utm_content: data.utm_content,
            utm_term: data.utm_term,
            fbclid: data.fbclid,
            gclid: data.gclid,
            msclkid: data.msclkid,
            ttclid: data.ttclid,
            referrer: data.referrer,
            landing_page: data.landing_page,
          },
        }
        await fetch(`https://app.gofunnel.ai/api/v2/webhooks/external?credential_id=${GF_CREDENTIAL_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${GF_BEARER}` },
          body: JSON.stringify(gfPayload),
        }).catch(() => {})
      }
    } catch {}

    return NextResponse.json({ success: true, ...dmResponse })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}