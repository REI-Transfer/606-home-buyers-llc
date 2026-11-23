// Server only. DealMachine property lookup for the equity-checked seller form
// (William's build guide, 2026-11-16). Called from app/api/submit/route.ts on
// the early (contact details) and complete posts.
//
// Key: DEALMACHINE_API_KEY (Vercel env, sensitive, server only). Never prefix it
// NEXT_PUBLIC_. No key, an error, or more than 5 s = "fallback": the form asks
// the old questions and uses the old rules. lookupProperty never throws.
//
// Credits: 1 per matched house (contact_audience "none", no people lookups).
// The address clean-up retry costs 1 more when the address is real.

import { ruleFor, excellentRule, propertyTypeId, listedId, ownershipId } from "./form-rules"

const ENRICH_URL = "https://api.v2.dealmachine.com/v1/enrichment/address"
const VALIDATE_URL = "https://api.v2.dealmachine.com/v1/addresses/validate"
const TOTAL_BUDGET_MS = 5000

// Section 6 of the guide, plus the two free background fields.
const FIELDS = [
  "estimated_value", "total_estimated_loan_balance", "estimated_equity_amount",
  "num_mortgages", "mortgage_1_loan_type", "mortgage_1_loan_interest_rate", "mortgage_1_loan_balance",
  "total_estimated_loan_payment_monthly", "has_adjustable_loans", "is_free_and_clear",
  "is_tax_delinquent", "tax_delinquent_year", "has_hoa_lien", "last_sale_date", "last_sale_price",
  "estimated_repair_cost", "is_preforeclosure", "foreclosure_status", "foreclosure_auction_date",
  "is_pre_probate", "is_vacant_home", "is_zombie_property", "has_tired_landlords",
  "market_status", "is_mls_active", "is_mls_pending", "is_mls_contingent", "is_mls_listing_expired",
  "mls_max_listing_price", "owner_1_full_name", "owner_2_full_name", "ownership_entity_type",
  "is_owner_occupied", "has_out_of_state_owners", "property_type", "additional_property_types",
  "num_units", "year_built", "living_area_sqft", "num_bedrooms", "num_bathrooms", "lot_size_acres",
  "flood_zone", "has_hoa", "hoa_1_fee_amount", "has_solar",
  "has_senior_owners", "is_empty_nester",
  // Recorded liens: any active lien lets an "Excellent" seller through.
  "has_active_lien", "num_total_active_liens", "lien_doc_type", "total_open_lien_amount",
]

export type EquityBand = "30plus" | "20to29" | "under20" | "unknown"
export type Verdict = "lead" | "low_equity" | "low_intent" | "dq" | "fallback"
export type DqReason = "low_equity" | "listed" | "propertyType" | "rentedLot" | "excellentCondition" | null
/** Why a lead that reaches the client is low intent (client rules), for the summary. */
export type LowIntentWhy = "listed" | "propertyType" | "landNotSure" | "excellentCondition"
export type PropertyKind = "single-family" | "multi-family" | "condo" | "townhouse" | "mobile-home" | "land" | "unknown"

export interface LookupInput {
  street: string
  city: string
  state: string
  zip: string
  lastName: string
}

export interface LookupResult {
  matched: boolean
  equity_pct: number | null
  equity_band: EquityBand
  value: number | null
  owed: number | null
  listed_now: boolean
  expired_listing: boolean
  property_type: PropertyKind
  is_mobile: boolean
  owner_match: boolean | null
  owner_names: string[]
  auction_date_future: string | null
  /** Distress or motivation on record (see distressSignals). Empty = none found or no record. */
  distress: string[]
  /** Seller picked "Excellent" but the record shows distress or motivation, so they were let through. */
  excellent_bypass?: boolean
  /** Client rules that made this a low intent lead (lib/form-rules.ts). */
  low_intent_why: LowIntentWhy[]
  verdict: Verdict
  dq_reason: DqReason
  summary: string
  credits_used: number
  simulated?: string
  /** What happened, step by step (showroom panel only): e.g. "enrich: HTTP 401 Unauthorized". */
  trace?: string
  raw: Record<string, unknown> | null
}

const FALLBACK: LookupResult = {
  matched: false, equity_pct: null, equity_band: "unknown", value: null, owed: null,
  listed_now: false, expired_listing: false, property_type: "unknown", is_mobile: false,
  owner_match: null, owner_names: [], auction_date_future: null, distress: [],
  verdict: "fallback", dq_reason: null, low_intent_why: [], summary: "", credits_used: 0, raw: null,
}

// ─── Parsing helpers ────────────────────────────────────────────────────
type Rec = Record<string, unknown>
const yes = (v: unknown) => v === true || (typeof v === "string" && v.trim().toLowerCase() === "yes")
const num = (v: unknown): number | null => {
  if (typeof v === "number" && isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,%\s]/g, ""))
    return v.trim() !== "" && isFinite(n) ? n : null
  }
  return null
}
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : v == null ? "" : String(v))
const money = (n: number | null) => (n == null ? "unknown" : `$${Math.round(n).toLocaleString("en-US")}`)

// DealMachine's property_type text → the form's property types. Anything we
// can't place is "unknown" and never screens anyone out.
export function classifyPropertyType(t: string): PropertyKind {
  const s = t.toLowerCase()
  if (!s) return "unknown"
  if (/mobile|manufactured/.test(s)) return "mobile-home"
  if (/condo/.test(s)) return "condo"
  if (/vacant land|^land|\blot\b|acreage/.test(s)) return "land"
  if (/town ?house|townhome|row ?house/.test(s)) return "townhouse"
  if (/duplex|triplex|quadplex|fourplex|multi|2-4|units?\b/.test(s)) return "multi-family"
  if (/single|sfr|residential/.test(s)) return "single-family"
  return "unknown"
}

const lettersOnly = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")

// Distress or motivation on record: the evidence that lets an "Excellent" seller
// through (William, 2026-11-17: any lien or any sign of motivation counts).
// Any active lien counts, whatever its type, community-fee liens included.
// Senior owner / empty nester are NOT used here (age-based routing; they stay
// background only in the summary). Free and clear is equity, not motivation.
export function distressSignals(r: Rec, auction_date_future: string | null): string[] {
  const out: string[] = []
  // Distress
  const fc = str(r.foreclosure_status)
  if (yes(r.is_preforeclosure) || (fc && !/^(none|no|n\/a)$/i.test(fc))) out.push(fc ? `Foreclosure: ${fc}` : "Pre-foreclosure")
  if (auction_date_future) out.push(`Auction date ${auction_date_future}`)
  if (yes(r.is_tax_delinquent)) out.push(`Taxes behind${num(r.tax_delinquent_year) != null ? ` since ${num(r.tax_delinquent_year)}` : ""}`)
  if (yes(r.has_hoa_lien)) out.push("HOA lien")
  if (yes(r.is_pre_probate)) out.push("Probate")
  const lienTypes = (Array.isArray(r.lien_doc_type) ? r.lien_doc_type.map(str) : str(r.lien_doc_type).split(/[,;|]/))
    .map((t) => t.trim()).filter(Boolean)
  const lienCount = num(r.num_total_active_liens)
  if (yes(r.has_active_lien) || (lienCount ?? 0) > 0) {
    const amt = num(r.total_open_lien_amount)
    const types = lienTypes.length ? `: ${[...new Set(lienTypes)].join(", ")}` : ""
    out.push(`Active lien${(lienCount ?? 0) > 1 ? `s (${lienCount})` : ""}${types}${amt ? ` (${money(amt)} open)` : ""}`)
  }
  // Motivation
  if (yes(r.is_vacant_home)) out.push("Vacant home")
  if (yes(r.is_zombie_property)) out.push("Abandoned (zombie) property")
  if (yes(r.has_tired_landlords)) out.push("Tired landlord")
  if (yes(r.is_mls_listing_expired)) out.push("Listing expired without selling")
  if (yes(r.has_out_of_state_owners)) out.push("Owner lives out of state")
  return out
}

// "Excellent" condition rule, decided AFTER the record is pulled (William,
// 2026-11-17): any distress or motivation on record = let them through, tagged
// for the rep; none, or no record = this client's Excellent rule (lib/form-rules.ts):
// screened out (default), sent as a low intent lead, or passed.
export function applyConditionRule(x: LookupResult, condition: string): LookupResult {
  const rule = excellentRule()
  if (condition !== "excellent" || rule === "pass") return x
  if (x.distress.length > 0) {
    const note = `Seller said EXCELLENT condition. Came through because the record shows: ${x.distress.join("; ")}`
    return { ...x, excellent_bypass: true, summary: x.summary ? `${x.summary}\n${note}` : note }
  }
  if (x.verdict === "dq") return x
  if (rule === "low_intent") {
    // No record: the form's own rule decides (fallback stays fallback).
    if (x.verdict === "fallback") return x
    const note = `Low intent for this buyer: ${LOW_INTENT_TEXT.excellentCondition}`
    return { ...x, verdict: "low_intent", low_intent_why: [...x.low_intent_why, "excellentCondition"], summary: x.summary ? `${x.summary}\n${note}` : note }
  }
  return { ...x, verdict: "dq", dq_reason: "excellentCondition" }
}

// Equity rule (section 4). Uses value and loan balance, never DealMachine's own
// estimated_equity_percentage (it disagreed with its own dollar figures).
// Equity screen-out (William 2026-11-17): under 20% is screened out unless the client
// wants those leads (onboarding question). Per client: MIN_EQUITY_PCT (server env,
// default 20; 0 = never screen out on equity). Between it and 30% = low equity lead.
export function minEquityPct(): number {
  const n = Number(process.env.MIN_EQUITY_PCT)
  return process.env.MIN_EQUITY_PCT != null && process.env.MIN_EQUITY_PCT !== "" && Number.isFinite(n) ? Math.max(0, Math.min(30, n)) : 20
}

export function evaluate(r: Rec, input: LookupInput, landOwned = ""): LookupResult {
  const value = num(r.estimated_value)
  const owedRaw = num(r.total_estimated_loan_balance)
  const owed = owedRaw ?? (yes(r.is_free_and_clear) ? 0 : null)
  const equity_pct = value && value > 0 && owed != null ? Math.round(((value - owed) / value) * 100) : null
  const equity_band: EquityBand =
    equity_pct == null ? "unknown" : equity_pct >= 30 ? "30plus" : equity_pct >= 20 ? "20to29" : "under20"

  const market = str(r.market_status).toLowerCase()
  const listed_now = ["active", "pending", "contingent"].some((k) => market.includes(k))
    || yes(r.is_mls_active) || yes(r.is_mls_pending) || yes(r.is_mls_contingent)
  const expired_listing = yes(r.is_mls_listing_expired)

  const property_type = classifyPropertyType(str(r.property_type))
  const is_mobile = property_type === "mobile-home"

  const owner_names = [str(r.owner_1_full_name), str(r.owner_2_full_name)].filter(Boolean)
  const last = lettersOnly(input.lastName)
  const owner_match = owner_names.length === 0 || !last
    ? null
    : owner_names.some((n) => lettersOnly(n).includes(last))

  const auction = str(r.foreclosure_auction_date)
  const auctionDay = auction ? new Date(auction) : null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const auction_date_future = auctionDay && !isNaN(+auctionDay) && auctionDay >= today ? auction : null
  const distress = distressSignals(r, auction_date_future)

  // Client rules (lib/form-rules.ts), applied to the answer the client's old form would
  // have sent for this house. Property type: screened out unless the client buys it;
  // unknown on record = the seller is asked instead. Listed now: screened out by default.
  const typeRule = property_type === "unknown" ? null : ruleFor("propertyType", propertyTypeId(property_type))
  const listedRule = listed_now ? ruleFor("listedOnMarket", listedId(true)) : null
  const landRule = is_mobile ? ruleFor("landOwned", landOwned) : null
  const low_intent_why: LowIntentWhy[] = [
    ...(listedRule === "low_intent" ? ["listed" as const] : []),
    ...(typeRule === "low_intent" ? ["propertyType" as const] : []),
    ...(is_mobile && (landOwned === "not-sure" || landRule === "low_intent") ? ["landNotSure" as const] : []),
  ]

  // Routing table (section 4). Record with no usable value = can't check equity:
  // treat it like no record and fall back to the old questions.
  let verdict: Verdict
  let dq_reason: DqReason = null
  if (equity_pct == null) verdict = "fallback"
  else if (listedRule === "dq") { verdict = "dq"; dq_reason = "listed" }
  else if (typeRule === "dq") { verdict = "dq"; dq_reason = "propertyType" }
  else if (landRule === "dq") { verdict = "dq"; dq_reason = "rentedLot" }
  else if (equity_pct < minEquityPct()) { verdict = "dq"; dq_reason = "low_equity" }
  else if (low_intent_why.length) verdict = "low_intent"
  else if (equity_pct < 30) verdict = "low_equity"
  else verdict = "lead"

  const res: LookupResult = {
    matched: true, equity_pct, equity_band, value, owed, listed_now, expired_listing,
    property_type, is_mobile, owner_match, owner_names, auction_date_future, distress,
    verdict, dq_reason, low_intent_why, summary: "", credits_used: 0, raw: r,
  }
  res.summary = buildSummary(res, r)
  if (low_intent_why.length) res.summary += `\nLow intent for this buyer: ${low_intent_why.map((w) => LOW_INTENT_TEXT[w]).join("; ")}`
  return res
}

const LOW_INTENT_TEXT: Record<LowIntentWhy, string> = {
  listed: "listed for sale now",
  propertyType: "property type",
  landNotSure: "mobile home, seller not sure who owns the land",
  excellentCondition: "seller said Excellent condition",
}

const PRIORITY_TEXT: Record<string, string> = {
  "fast-as-is": "Fast, as-is sale",
  "highest-price": "Highest price, even if slower",
  "not-sure": "Not sure yet",
}

function buildSummary(x: LookupResult, r: Rec): string {
  const yn = (v: unknown) => (v == null || v === "" ? "unknown" : yes(v) ? "Yes" : "No")
  const equityAmt = x.value != null && x.owed != null ? money(x.value - x.owed) : "unknown"
  const rate = num(r.mortgage_1_loan_interest_rate)
  const pay = num(r.total_estimated_loan_payment_monthly)
  const loanBits = [
    [str(r.mortgage_1_loan_type), rate != null ? `at ${rate.toFixed(1)}%` : ""].filter(Boolean).join(" "),
    pay != null ? `about ${money(pay)}/mo` : "",
  ].filter(Boolean).join(", ")
  const sale = str(r.last_sale_date).slice(0, 4)
  const repairs = num(r.estimated_repair_cost)
  const owner = x.owner_names.join(" & ") || "unknown"
  const entity = str(r.ownership_entity_type)
  const nameMatch = x.owner_match == null ? "unknown" : x.owner_match ? "Yes" : `No (may not be the owner. Owner on record: ${owner})`
  const listing = x.listed_now ? `LISTED NOW (${str(r.market_status) || "MLS"})` : x.expired_listing ? "Expired listing" : (str(r.market_status) || "Off Market")
  const fc = str(r.foreclosure_status) || (yes(r.is_preforeclosure) ? "Pre-foreclosure" : "none")
  const beds = [num(r.num_bedrooms) != null ? `${num(r.num_bedrooms)} bd` : "", num(r.num_bathrooms) != null ? `${num(r.num_bathrooms)} ba` : ""].filter(Boolean).join(" / ")
  const sqft = num(r.living_area_sqft)
  const built = num(r.year_built)
  const acres = num(r.lot_size_acres)
  const house = [str(r.property_type), beds, sqft != null ? `${sqft.toLocaleString("en-US")} sq ft` : "", built != null ? `built ${built}` : "", acres != null ? `${acres} acres` : ""].filter(Boolean).join(", ")
  const lines = [
    // Never name the data vendor in anything a client or seller can see (William 2026-11-17).
    "PROPERTY RECORD (public records, estimates)",
    `Value: ${money(x.value)} | Owed: ${money(x.owed)} | Equity: ${x.equity_pct ?? "unknown"}%${x.equity_pct != null ? ` (${equityAmt})` : ""}`,
    `Loan: ${loanBits || "unknown"} | Free and clear: ${yn(r.is_free_and_clear)}`,
    `Last sale: ${sale || "unknown"} | Repairs (est.): ${money(repairs)}`,
    `Owner on record: ${owner}${entity ? ` (${entity})` : ""} | Lives there: ${yn(r.is_owner_occupied)} | Name matches form: ${nameMatch}`,
    `Listing: ${listing} | Foreclosure: ${fc}${x.auction_date_future ? ` (auction ${x.auction_date_future})` : ""} | Probate: ${yn(r.is_pre_probate)} | Vacant: ${yn(r.is_vacant_home)} | Taxes behind: ${yn(r.is_tax_delinquent)}`,
    `House: ${house || "unknown"} | Flood: ${str(r.flood_zone) || "unknown"}`,
  ]
  const lienCount = num(r.num_total_active_liens)
  if (yes(r.has_active_lien) || (lienCount ?? 0) > 0) {
    const types = Array.isArray(r.lien_doc_type) ? r.lien_doc_type.map(str).join(", ") : str(r.lien_doc_type)
    const amt = num(r.total_open_lien_amount)
    lines.push(`Liens on record: ${lienCount ?? "yes"}${types ? ` (${types})` : ""}${amt ? `, ${money(amt)} open` : ""}`)
  }
  const bg = [yes(r.has_senior_owners) ? "Senior owner (65+)" : "", yes(r.is_empty_nester) ? "Empty nester" : ""].filter(Boolean)
  if (bg.length) lines.push(`Background only: ${bg.join(", ")}`)
  return lines.join("\n")
}

export function withPriority(summary: string, priority: string, reasonDetails = ""): string {
  if (!summary) return summary
  let out = priority && PRIORITY_TEXT[priority] ? `${summary}\nSeller wants: ${PRIORITY_TEXT[priority]}` : summary
  const words = reasonDetails.trim().replace(/\s+/g, " ").slice(0, 500)
  if (words) out += `\nSeller's own words: "${words}"`
  return out
}

// Same fields, same format (Mirko + William 2026-11-17): clients' Zaps and CRMs map the
// old answer fields, so the new form keeps sending them. When the record answers a
// question the seller is no longer asked, fill it with the exact value the old form
// would have sent. Anything the record can't tell us stays blank, never guessed.
export interface LegacyAnswers { propertyType: string; listedOnMarket: string; ownershipLength: string; isLegalOwner: string }

// A record is usable when it gives us a value to check equity. A record without one
// is treated like no record at all: the seller answers every old question.
// Google's formatted address: "1000 W Platt St, Tampa, FL 33606, USA". When the
// address was typed in the page's hero box only this string reaches the form, so
// city / state / ZIP are read from it (DealMachine refuses a lookup without a ZIP).
export function parseUsAddress(full: string): { street: string; city: string; state: string; zip: string } {
  const parts = (full || "").split(",").map((s) => s.trim()).filter(Boolean)
  if (parts.length && /^(usa|us|united states)$/i.test(parts[parts.length - 1])) parts.pop()
  const out = { street: parts[0] || "", city: "", state: "", zip: "" }
  const m = (parts[parts.length - 1] || "").match(/^([A-Za-z]{2})\s*(\d{5})?(?:-\d{4})?$/)
  if (m && parts.length >= 3) {
    out.state = m[1].toUpperCase(); out.zip = m[2] || ""; out.city = parts[parts.length - 2]
  }
  return out
}

export const recordUsable = (x: LookupResult) => x.matched && x.equity_pct != null

// Old questions to ask the seller because the record could not answer them.
// Listing status always comes from the record (no active listing = "not-listed").
// The legal owner question is never asked (William 2026-11-22); isLegalOwner is still
// sent, filled from the record's owner name match, blank otherwise.
export const ASKABLE = ["propertyType", "ownershipLength"] as const
export type AskableField = typeof ASKABLE[number]
export function questionsToAsk(x: LookupResult): AskableField[] {
  if (!recordUsable(x)) return [...ASKABLE]
  const a = legacyAnswers(x)
  return ASKABLE.filter((k) => !a[k])
}
export function legacyAnswers(x: LookupResult, now = new Date()): LegacyAnswers {
  const blank: LegacyAnswers = { propertyType: "", listedOnMarket: "", ownershipLength: "", isLegalOwner: "" }
  if (!x.matched || !x.raw) return blank
  const r = x.raw as Rec
  const sold = new Date(str(r.last_sale_date))
  const years = str(r.last_sale_date) && !isNaN(+sold)
    ? (now.getTime() - sold.getTime()) / (365.25 * 24 * 3600 * 1000) : null
  return {
    // In this client's own answer ids (NEXT_PUBLIC_ANSWER_IDS, lib/form-rules.ts).
    propertyType: propertyTypeId(x.property_type),
    // A lead that reaches a client was not listed now (or the client takes listed
    // houses). An expired listing is not on the market now; the summary still says it expired.
    listedOnMarket: listedId(x.listed_now),
    ownershipLength: ownershipId(years, yes(r.is_pre_probate)),
    isLegalOwner: x.owner_match === true ? "yes-owner" : "",
  }
}

// ─── HTTP ───────────────────────────────────────────────────────────────
// steps: what each call did, for the showroom panel and the server log. Never
// holds the key or the request; at most DealMachine's own short error text.
async function post(url: string, key: string, body: unknown, deadline: number, steps: string[], label: string): Promise<Rec | null> {
  const left = deadline - Date.now()
  if (left < 300) { steps.push(`${label}: skipped, out of time`); return null }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), left)
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: "no-store",
    })
    if (!res.ok) {
      const text = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 120)
      steps.push(`${label}: HTTP ${res.status}${text ? ` ${text}` : ""}`)
      console.error("[dealmachine]", label, "HTTP", res.status)
      return null
    }
    const j = (await res.json()) as Rec
    const first = Array.isArray(j?.data) ? (j.data as Rec[])[0] : null
    // DealMachine says why an address did not match (not_found, ambiguous_match,
    // invalid_input + a short reason). Shown in the showroom panel.
    const fail = first && typeof first.match_failure === "object" && first.match_failure
      ? (first.match_failure as Rec) : null
    const why = fail ? ` (${str(fail.code)}${fail.reason ? `: ${str(fail.reason).slice(0, 90)}` : ""})` : ""
    steps.push(`${label}: ok${first && "matched" in first ? `, matched=${String(first.matched)}${why}` : ""}${first && "status" in first ? `, status=${String(first.status)}` : ""}, credits=${creditsOf(j)}`)
    return j
  } catch (e) {
    const name = (e as Error)?.name === "AbortError" ? "timeout" : (e as Error)?.name || "error"
    steps.push(`${label}: ${name}`)
    console.error("[dealmachine]", label, "request failed", name)
    return null
  } finally {
    clearTimeout(timer)
  }
}

const firstRecord = (j: Rec | null): Rec | null => {
  const d = j?.data
  return Array.isArray(d) && d[0] && typeof d[0] === "object" ? (d[0] as Rec) : null
}
const creditsOf = (j: Rec | null): number => num((j?.credits as Rec | undefined)?.used) ?? 0

// Same house within ~30 min on the same server instance: reuse, never pay twice
// between the early and complete posts. (The 30-day cache table is a later step.)
const cache = new Map<string, { at: number; rec: Rec | null }>()
const CACHE_MS = 30 * 60 * 1000
const cacheKey = (a: LookupInput) => [a.street, a.city, a.state, a.zip].map((s) => s.toLowerCase().replace(/\s+/g, " ").trim()).join("|")

export async function lookupProperty(input: LookupInput, opts: { landOwned?: string } = {}): Promise<LookupResult> {
  try {
    const key = process.env.DEALMACHINE_API_KEY || ""
    if (!key) return { ...FALLBACK, trace: "no DEALMACHINE_API_KEY on this deployment" }
    if (!input.street || !input.state) return { ...FALLBACK, trace: "address missing street or state" }

    const ck = cacheKey(input)
    const hit = cache.get(ck)
    if (hit && Date.now() - hit.at < CACHE_MS) {
      return hit.rec ? { ...evaluate(hit.rec, input, opts.landOwned), trace: "reused the earlier check (no new credit)" } : { ...FALLBACK, trace: "reused the earlier check: no record" }
    }

    const deadline = Date.now() + TOTAL_BUDGET_MS
    const addr = { street: input.street, city: input.city, state: input.state, zip: input.zip }
    let credits = 0
    const steps: string[] = []
    let j = await post(ENRICH_URL, key, { data: [addr], fields: FIELDS, contact_audience: "none" }, deadline, steps, "enrich")
    credits += creditsOf(j)
    let rec = firstRecord(j)

    // No match: clean the address up and retry once, inside the same 5 s. Skipped when
    // DealMachine read the address fine but has no property there ("no_match" /
    // "not_found"): validating costs 1 credit and, on real leads, never turned those
    // into a match (Google's address is already clean).
    const failCode = rec && typeof rec.match_failure === "object" && rec.match_failure
      ? str((rec.match_failure as Rec).code) : ""
    if (j && rec && rec.matched === false && failCode !== "no_match" && failCode !== "not_found") {
      const v = await post(VALIDATE_URL, key, { data: [addr] }, deadline, steps, "validate")
      credits += creditsOf(v)
      const vr = firstRecord(v) || (v as Rec | null)
      const status = str(vr?.status).toLowerCase()
      if (vr && (status === "valid" || status === "corrected")) {
        const fixed = {
          street: str(vr.street) || addr.street, city: str(vr.city) || addr.city,
          state: str(vr.state) || addr.state, zip: str(vr.zip) || addr.zip,
        }
        j = await post(ENRICH_URL, key, { data: [fixed], fields: FIELDS, contact_audience: "none" }, deadline, steps, "retry")
        credits += creditsOf(j)
        rec = firstRecord(j)
      }
    }

    const trace = steps.join(" | ")
    if (!j) return { ...FALLBACK, credits_used: credits, trace } // error or timeout: don't cache
    const matched = !!rec && rec.matched !== false
    cache.set(ck, { at: Date.now(), rec: matched ? rec : null })
    if (!matched) return { ...FALLBACK, credits_used: credits, trace }
    return { ...evaluate(rec as Rec, input, opts.landOwned), credits_used: credits, trace }
  } catch (e) {
    console.error("[dealmachine] lookup error", (e as Error)?.name)
    return { ...FALLBACK, trace: `lookup error: ${(e as Error)?.name || "unknown"}` }
  }
}

// ─── Prototype scenarios (showroom only) ───────────────────────────────
// Fake DealMachine records so a reviewer can walk every path without spending
// credits. Only honoured when SHOWROOM=1 (see the submit route).
const BASE: Rec = {
  matched: true, estimated_value: 243000, total_estimated_loan_balance: 90235,
  num_mortgages: 1, mortgage_1_loan_type: "New Conventional", mortgage_1_loan_interest_rate: 3.0,
  total_estimated_loan_payment_monthly: 425, is_free_and_clear: "No", is_tax_delinquent: "No",
  last_sale_date: "2021-06-14", estimated_repair_cost: 33600, is_preforeclosure: "No",
  is_pre_probate: "No", is_vacant_home: "No", market_status: "Off Market",
  is_mls_active: "No", is_mls_pending: "No", is_mls_contingent: "No", is_mls_listing_expired: "No",
  ownership_entity_type: "Individual", is_owner_occupied: "Yes", property_type: "Single Family Residential",
  num_bedrooms: 3, num_bathrooms: 1, living_area_sqft: 960, year_built: 1973, lot_size_acres: 0.2,
  flood_zone: "Low Risk",
}
export const SCENARIOS: Record<string, Rec | null> = {
  "equity-30plus": BASE,
  "equity-20to29": { ...BASE, estimated_value: 250000, total_estimated_loan_balance: 187500 },
  "equity-under20": { ...BASE, estimated_value: 250000, total_estimated_loan_balance: 231000 },
  "listed": { ...BASE, market_status: "Active", is_mls_active: "Yes" },
  "mobile-home": { ...BASE, property_type: "Mobile/Manufactured Home", estimated_value: 120000, total_estimated_loan_balance: 30000 },
  "condo": { ...BASE, property_type: "Condominium" },
  "townhouse": { ...BASE, property_type: "Townhouse" },
  "no-record": null,
  // For the "Excellent" rule: distress, any lien, or motivation on record each let them through.
  "distress": { ...BASE, is_preforeclosure: "Yes", foreclosure_status: "Notice of Default",
    is_tax_delinquent: "Yes", tax_delinquent_year: 2024,
    has_active_lien: "Yes", num_total_active_liens: 1, lien_doc_type: "Judgment", total_open_lien_amount: 8400 },
  // Record found but no value: treated like no record (all old questions).
  "no-value": { ...BASE, estimated_value: null, total_estimated_loan_balance: null },
  // Record with value but gaps: no property type, no sale date, owner name that does
  // not match the seller. The seller is asked exactly those three old questions.
  "missing-fields": { ...BASE, property_type: "", last_sale_date: "", owner_1_full_name: "Riverside Holdings LLC" },
  "routine-lien": { ...BASE, has_active_lien: "Yes", num_total_active_liens: 1, lien_doc_type: "Improvement District Lien", total_open_lien_amount: 1900 },
  "motivation": { ...BASE, is_vacant_home: "Yes", is_owner_occupied: "No", has_out_of_state_owners: "Yes" },
}

export async function simulatedLookup(scenario: string, input: LookupInput, landOwned = ""): Promise<LookupResult> {
  await new Promise((r) => setTimeout(r, 1800)) // about as slow as the real call
  const rec = SCENARIOS[scenario]
  if (!rec) return { ...FALLBACK, simulated: scenario }
  // Use the seller's own last name as the owner, so the name check passes,
  // unless the scenario sets its own owner (to test a name that does not match).
  const owner = rec.owner_1_full_name ? {} : { owner_1_full_name: `Jordan ${input.lastName || "Smith"}` }
  return { ...evaluate({ ...rec, ...owner }, input, landOwned), simulated: scenario }
}
