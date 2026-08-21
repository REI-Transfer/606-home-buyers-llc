/**
 * Lead scoring — Origin template (standard weights, locked).
 *
 * Universal top-of-funnel weights. Hard DQs are handled in the form's
 * checkDq(); anything not DQ'd just scores lower. Max 125 points.
 * Buckets: HOT 85+, WARM 60-84, STANDARD 35-59, LOW <35.
 * Meta CAPI value: HOT 150 / WARM 100 / STANDARD 50 / LOW 10.
 */

export type ScoreInput = {
  propertyType: string
  whoAreYou: string
  listedOnMarket: string
  timeline: string
  yearsOwned: string
  reason: string
  condition: string
}

export type ScoreResult = {
  lead_score: number
  lead_quality: "HOT" | "WARM" | "STANDARD" | "LOW"
  meta_value: number
  breakdown: Record<string, number>
}

const PROPERTY_WEIGHTS: Record<string, number> = {
  "single-family": 30,
  "multi-family":  18,
  "condo":         12,
  "mobile-home":    2,
  "land":           2,
  "other":          5,
}

const WHO_WEIGHTS: Record<string, number> = {
  "owner":      20,
  "part-owner": 12,
  "family":      8,
}

const LISTED_WEIGHTS: Record<string, number> = {
  "no":  10,
  "yes":  3,
}

const TIMELINE_WEIGHTS: Record<string, number> = {
  "asap":     20,
  "3-months": 15,
  "6-months": 10,
  "6-plus":    5,
}

const YEARS_WEIGHTS: Record<string, number> = {
  "20+":   15,
  "11-20": 12,
  "6-10":   8,
}

const REASON_WEIGHTS: Record<string, number> = {
  "foreclosure": 15,
  "inheritance": 13,
  "divorce":     12,
  "landlord":    11,
  "repairs":     10,
  "downsize":     8,
  "relocation":   4,
  "other":        5,
  // v2 list IDs (MOTIVATION_V2). "no-reason" DQs pre-submit so its weight is moot.
  "behind-payments":  15,
  "urgent-financial": 15,
  "inherited":        13,
  "vacant":            9,
  "personal":          5,
  "no-reason":         0,
}

const CONDITION_WEIGHTS: Record<string, number> = {
  "poor": 15,
  "fair": 12,
  "good":  6,
}

export function scoreLead(input: ScoreInput): ScoreResult {
  const breakdown = {
    property:   PROPERTY_WEIGHTS[input.propertyType]    ?? 0,
    who:        WHO_WEIGHTS[input.whoAreYou]            ?? 0,
    listed:     LISTED_WEIGHTS[input.listedOnMarket]    ?? 0,
    timeline:   TIMELINE_WEIGHTS[input.timeline]        ?? 0,
    years:      YEARS_WEIGHTS[input.yearsOwned]         ?? 0,
    reason:     REASON_WEIGHTS[input.reason]            ?? 0,
    condition:  CONDITION_WEIGHTS[input.condition]      ?? 0,
  }

  const lead_score = Object.values(breakdown).reduce((s, n) => s + n, 0)

  let lead_quality: ScoreResult["lead_quality"] = "LOW"
  let meta_value = 10
  if (lead_score >= 85)      { lead_quality = "HOT";      meta_value = 150 }
  else if (lead_score >= 60) { lead_quality = "WARM";     meta_value = 100 }
  else if (lead_score >= 35) { lead_quality = "STANDARD"; meta_value = 50 }

  return { lead_score, lead_quality, meta_value, breakdown }
}
