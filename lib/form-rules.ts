// Per-client screening rules for the property-record form (Mirko 2026-11-18: every
// client is migrated, and every client keeps the rules its current form has).
// Read the same way by the form (browser) and the submit / lookup routes (server),
// so every setting is a NEXT_PUBLIC_* build-time value.
//
//   NEXT_PUBLIC_ANSWER_IDS               "themes" (default) or "v1": which answer values the
//                                        form shows and sends. A client keeps the values its
//                                        CRM / Zap already maps (v1 forms used
//                                        "condo-townhouse", "listed-realtor", "less-than-3"...).
//   NEXT_PUBLIC_ALLOWED_PROPERTY_TYPES   property types bought as normal leads, in the
//                                        client's own ids. Default single + multi-family.
//                                        Set by the onboarding form for new clients.
//   NEXT_PUBLIC_DQ_ANSWERS               answers that screen a seller out, "field:id" pairs,
//                                        comma separated. Replaces the default list
//                                        completely (DEFAULT_DQ below). "none" = no answer
//                                        screens out.
//   NEXT_PUBLIC_LOW_INTENT_ANSWERS       answers that still go to the client but as a low
//                                        intent lead (LeadLowIntent), same format. A property
//                                        type listed here is let through as low intent.
//   NEXT_PUBLIC_EXCELLENT_CONDITION_PASS "true" = Excellent condition goes through as a normal
//                                        lead (kept for the onboarding form: removes
//                                        "condition:excellent" from the screen-outs).
//   MIN_EQUITY_PCT (server only)         lib/dealmachine.ts.
//
// Fields: listedOnMarket, ownershipLength, condition, reason, landOwned.
// The years-owned rule applies only when the seller answers it with no usable property
// record: with a record, years owned never screens out (William 2026-11-17).

export type AnswerField = "propertyType" | "isLegalOwner" | "listedOnMarket" | "ownershipLength" | "condition" | "reason" | "landOwned"
export type Option = { id: string; label: string; desc?: string }
export type Rule = "dq" | "low_intent" | null
export type Profile = "themes" | "v1"

export const answerProfile = (): Profile =>
  (process.env.NEXT_PUBLIC_ANSWER_IDS || "").trim().toLowerCase() === "v1" ? "v1" : "themes"

// ── Answer options per profile ───────────────────────────────────────────
const THEMES_OPTIONS: Record<"propertyType" | "isLegalOwner" | "listedOnMarket" | "ownershipLength", Option[]> = {
  propertyType: [
    { id: "single-family", label: "Single Family Home" },
    { id: "multi-family", label: "Multi-Family (Duplex, Triplex, etc.)" },
    { id: "condo", label: "Condo" },
    { id: "townhouse", label: "Townhouse" },
    { id: "mobile-home", label: "Mobile / Manufactured Home" },
    { id: "land", label: "Vacant Land / Lot" },
    { id: "other", label: "Other" },
  ],
  isLegalOwner: [
    { id: "yes-owner", label: "Yes, I am the legal homeowner" },
    { id: "yes-family", label: "Yes, I am a family member with the legal right to sell" },
    { id: "no", label: "No, I am not" },
  ],
  listedOnMarket: [
    { id: "not-listed", label: "No, never" },
    { id: "listed-active", label: "Yes, active now" },
    { id: "listed-expired", label: "Yes, but expired or cancelled" },
    { id: "not-sure", label: "Not sure" },
  ],
  ownershipLength: [
    { id: "1-3-years", label: "Within the last 3 years" },
    { id: "3-5-years", label: "3 to 5 years ago" },
    { id: "5-10-years", label: "5 to 10 years ago" },
    { id: "10-plus-years", label: "More than 10 years ago" },
    { id: "inherited", label: "I recently inherited it" },
  ],
}

const V1_OPTIONS: typeof THEMES_OPTIONS = {
  propertyType: [
    { id: "single-family", label: "Single Family Home" },
    { id: "multi-family", label: "Multi-Family (Duplex, Triplex, etc.)" },
    { id: "condo-townhouse", label: "Condo / Townhouse" },
    { id: "mobile-home", label: "Mobile / Manufactured Home" },
    { id: "land", label: "Vacant Land / Lot" },
    { id: "other", label: "Other" },
  ],
  isLegalOwner: THEMES_OPTIONS.isLegalOwner,
  listedOnMarket: [
    { id: "not-listed", label: "No, it is not listed" },
    { id: "listed-realtor", label: "Yes, listed with a realtor" },
    { id: "listed-fsbo", label: "Yes, listed for sale by owner" },
  ],
  ownershipLength: [
    { id: "less-than-3", label: "Less than 3 years" },
    { id: "3-to-5", label: "3 to 5 years" },
    { id: "5-to-10", label: "5 to 10 years" },
    { id: "10-plus", label: "More than 10 years" },
    { id: "inherited", label: "I inherited it" },
  ],
}

// Options some older forms had. Shown only when this client's rules mention them.
const EXTRA_OPTIONS: Partial<Record<AnswerField, Option[]>> = {
  isLegalOwner: [{ id: "wholesaler", label: "No, I'm a wholesaler or investor with it under contract" }],
  reason: [
    { id: "no-reason", label: "No reason, just curious what it's worth" },
    { id: "none-of-above", label: "None of the above" },
  ],
}

// ── Rules ────────────────────────────────────────────────────────────────
const DEFAULT_DQ: Record<Profile, string[]> = {
  themes: [
    "listedOnMarket:listed-active", "listedOnMarket:listed-expired", "listedOnMarket:not-sure",
    "ownershipLength:1-3-years", "ownershipLength:3-5-years",
    "condition:excellent",
    "landOwned:no",
  ],
  v1: [
    "listedOnMarket:listed-realtor", "listedOnMarket:listed-fsbo",
    "condition:excellent",
    "landOwned:no",
  ],
}

// The legal owner question is gone (William 2026-11-22): an owner answer never screens
// out, even if this client's settings still list one.
const parsePairs = (raw: string): string[] =>
  raw.split(",").map((s) => s.trim().toLowerCase()).filter((s) => /^[a-z]+:[a-z0-9-]+$/i.test(s))
    .map((s) => { const [f, v] = s.split(":"); return `${FIELD_KEY[f] ?? f}:${v}` })
    .filter((p) => !p.startsWith("isLegalOwner:"))
// env keys are lower-cased; map back to the payload field names
const FIELD_KEY: Record<string, AnswerField> = {
  propertytype: "propertyType", islegalowner: "isLegalOwner", listedonmarket: "listedOnMarket",
  ownershiplength: "ownershipLength", condition: "condition", reason: "reason", landowned: "landOwned",
}

export function dqAnswers(): string[] {
  const raw = (process.env.NEXT_PUBLIC_DQ_ANSWERS || "").trim()
  let list = raw.toLowerCase() === "none" ? [] : raw ? parsePairs(raw) : [...DEFAULT_DQ[answerProfile()]]
  if (process.env.NEXT_PUBLIC_EXCELLENT_CONDITION_PASS === "true") list = list.filter((p) => p !== "condition:excellent")
  return list
}
export const lowIntentAnswers = (): string[] => parsePairs(process.env.NEXT_PUBLIC_LOW_INTENT_ANSWERS || "")

export const DEFAULT_ALLOWED_PROPERTY_TYPES = ["single-family", "multi-family"]
export function allowedPropertyTypes(): string[] {
  const list = (process.env.NEXT_PUBLIC_ALLOWED_PROPERTY_TYPES || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  return list.length ? list : DEFAULT_ALLOWED_PROPERTY_TYPES
}
const lowIntentTypes = () => lowIntentAnswers().filter((p) => p.startsWith("propertyType:")).map((p) => p.slice(13))

// A property type the client takes at all (as a normal or a low intent lead).
// "other" counts only when the client listed it as low intent.
export const propertyTypeAllowed = (type: string): boolean =>
  (type !== "other" && allowedPropertyTypes().includes(type)) || lowIntentTypes().includes(type)
export const mobileHomesAllowed = (): boolean => propertyTypeAllowed("mobile-home")

// What one answer means for this client: screened out, low intent, or nothing.
export function ruleFor(field: AnswerField, value: string): Rule {
  if (!value) return null
  if (field === "propertyType") {
    if (allowedPropertyTypes().includes(value) && value !== "other") return null
    return lowIntentTypes().includes(value) ? "low_intent" : "dq"
  }
  const key = `${field}:${value.toLowerCase()}`
  if (dqAnswers().includes(key)) return "dq"
  if (lowIntentAnswers().includes(key)) return "low_intent"
  return null
}

// How Excellent condition is handled: "dq" (screened out unless the record shows a
// lien or motivation), "low_intent" (sent as a low intent lead) or "pass".
export const excellentRule = (): "dq" | "low_intent" | "pass" => ruleFor("condition", "excellent") ?? "pass"

// Answer options this client shows, in its own ids.
export function optionsFor(field: "propertyType" | "isLegalOwner" | "listedOnMarket" | "ownershipLength" | "reason", base: Option[] = []): Option[] {
  const own = field === "reason" ? base : (answerProfile() === "v1" ? V1_OPTIONS : THEMES_OPTIONS)[field]
  const mentioned = new Set([...dqAnswers(), ...lowIntentAnswers()].filter((p) => p.startsWith(`${field}:`)).map((p) => p.split(":")[1]))
  const extra = (EXTRA_OPTIONS[field] || []).filter((o) => mentioned.has(o.id) && !own.some((x) => x.id === o.id))
  // "Other" stays last.
  const i = own.findIndex((o) => o.id === "other")
  return i === -1 ? [...own, ...extra] : [...own.slice(0, i), ...extra, ...own.slice(i)]
}

// ── Record → the client's own answer ids ────────────────────────────────
// The record speaks one language (lib/dealmachine.ts PropertyKind, years since the
// last sale); the client's CRM gets the value its old form would have sent.
export function propertyTypeId(kind: string): string {
  if (answerProfile() === "v1" && (kind === "condo" || kind === "townhouse")) return "condo-townhouse"
  return ["single-family", "multi-family", "condo", "townhouse", "mobile-home", "land"].includes(kind) ? kind : ""
}
export const listedId = (listedNow: boolean): string =>
  listedNow ? (answerProfile() === "v1" ? "listed-realtor" : "listed-active") : "not-listed"
export function ownershipId(years: number | null, inherited: boolean): string {
  const v1 = answerProfile() === "v1"
  if (inherited) return "inherited"
  if (years == null) return ""
  if (years < 3) return v1 ? "less-than-3" : "1-3-years"
  if (years < 5) return v1 ? "3-to-5" : "3-5-years"
  if (years < 10) return v1 ? "5-to-10" : "5-10-years"
  return v1 ? "10-plus" : "10-plus-years"
}

// ── The seller's own answers, checked together ───────────────────────────
// First screen-out wins; otherwise any low intent answer makes the lead low intent.
// Labels are the disqualify_reason values the old forms sent.
const RULE_LABEL: Record<AnswerField, string> = {
  propertyType: "property_type", isLegalOwner: "not_owner", listedOnMarket: "listed",
  ownershipLength: "short_ownership", condition: "excellent_condition", reason: "no_reason",
  landOwned: "land_not_confirmed",
}
const CHECKED: AnswerField[] = ["listedOnMarket", "propertyType", "landOwned", "ownershipLength", "reason"]
export function sellerAnswerRule(d: Record<string, unknown>, recordUsable: boolean): { rule: Rule; label: string } {
  let low = ""
  for (const f of CHECKED) {
    const v = typeof d[f] === "string" ? (d[f] as string).trim() : ""
    if (!v) continue
    // Years owned screens out only with no usable record (William 2026-11-17).
    if (f === "ownershipLength" && recordUsable) continue
    if (f === "landOwned") {
      if (d.propertyType !== "mobile-home") continue
      if (v === "not-sure") { low = low || RULE_LABEL[f]; continue }
    }
    const r = ruleFor(f, v)
    if (r === "dq") return { rule: "dq", label: RULE_LABEL[f] }
    if (r === "low_intent") low = low || RULE_LABEL[f]
  }
  return low ? { rule: "low_intent", label: low } : { rule: null, label: "" }
}
