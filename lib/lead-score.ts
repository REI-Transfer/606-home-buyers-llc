// Lead scoring, shared by the browser forms (via components/v2/survey-card-shared.tsx)
// and the submit route. The route re-scores the two-step form after it fills answers
// from the property record, so lead_score / lead_quality / the Lead value match what
// the old form would have sent for the same house.

export interface ScoreInput {
  timeline?: string
  ownershipLength?: string
  reason?: string
  condition?: string
}

export const SCORE_TIMELINE: Record<string, number> = {
  'asap': 3, '2-weeks': 2, '30-days': 1, '60-days': 0, 'flexible': 0,
}
// This client's scoring (kept as is).
export const TIMELINE_NEUTRAL = 1
export const SCORE_OWNERSHIP: Record<string, number> = {
  '10-plus-years': 3, '5-10-years': 1, '3-5-years': 0, '1-3-years': 0,
  // inherited: exempt from the ownership hard-DQ; scored 3 (matches Elevate v2.51).
  'inherited': 3,
}
export const SCORE_REASON: Record<string, number> = {
  'foreclosure': 3, 'behind-payments': 3,
  'inherited': 2, 'repairs': 2,
  'other': 1,
  'relocation': 0, 'divorce': 0, 'downsizing': 0,
}
export const SCORE_CONDITION: Record<string, number> = {
  'poor': 1, 'distressed': 1,
  'fair': 0, 'good': 0, 'excellent': 0,
}
export function calculateLeadScore(d: ScoreInput): number {
  const t = d.timeline ? (SCORE_TIMELINE[d.timeline] ?? 0) : TIMELINE_NEUTRAL
  const o = SCORE_OWNERSHIP[d.ownershipLength ?? ""] ?? 0
  const r = SCORE_REASON[d.reason ?? ""] ?? 0
  const c = SCORE_CONDITION[d.condition ?? ""] ?? 0
  return Math.min(10, t + o + r + c)
}
export function leadQuality(score: number): 'premium' | 'standard' | 'low' {
  if (score >= 6) return 'premium'
  if (score >= 2) return 'standard'
  return 'low'
}
