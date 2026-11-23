// Form funnel tracking (fleet-wide, no personal data). Sends one small ping the first
// time a visitor reaches each screen of the seller form, so the internal dashboard can
// show where sellers drop off. Same step numbers on every client, one-step and
// two-step alike. Never throws into the form. Off on a site with
// NEXT_PUBLIC_FUNNEL_TRACKING="false".
const ENABLED = process.env.NEXT_PUBLIC_FUNNEL_TRACKING !== "false"
const SID_KEY = "reit_ff_sid"
const FIRED_KEY = "reit_ff_fired"

// Standard step numbers (keep in sync with the dashboard). Steps only go forward, so
// the highest step a visit reached is where it stopped. Questions are 11-18 in the
// order the form can ask them; a client's own extra question is 19; 90+ are endings.
export const FUNNEL_STEPS = {
  page_view: 1, address: 2, condition: 3, contact: 4, record_check: 5,
  listedOnMarket: 11, propertyType: 12, landOwned: 13, ownershipLength: 14,
  reason: 15, priority: 16, askingPrice: 17, final_check: 20,
  submitted: 90, screened_out: 95,
} as const
export type FunnelStep = keyof typeof FUNNEL_STEPS | (string & {})

const uuid = (): string => {
  try { if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID() } catch {}
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
  })
}
const sessionId = (): string => {
  try {
    let sid = window.sessionStorage.getItem(SID_KEY)
    if (!sid) { sid = uuid(); window.sessionStorage.setItem(SID_KEY, sid) }
    return sid
  } catch { return uuid() }
}
const param = (name: string): string | undefined => {
  try { return new URLSearchParams(window.location.search).get(name)?.slice(0, 200) || undefined } catch { return undefined }
}

/** Ping for a screen, at most once per screen per visit. `detail`: the screen-out reason. */
export function trackFunnel(step: FunnelStep, mode: string, detail = ""): void {
  if (!ENABLED || typeof window === "undefined") return
  try {
    let fired: string[] = []
    try { fired = JSON.parse(window.sessionStorage.getItem(FIRED_KEY) || "[]") } catch {}
    if (!Array.isArray(fired)) fired = []
    if (fired.includes(step)) return
    const body = JSON.stringify({
      session_id: sessionId(), step: (FUNNEL_STEPS as Record<string, number>)[step] ?? 19, step_name: step.slice(0, 40), detail: detail.slice(0, 60),
      mode, path: window.location.pathname.slice(0, 100),
      utm_source: param("utm_source"), utm_medium: param("utm_medium"), utm_campaign: param("utm_campaign"),
      utm_term: param("utm_term"), utm_content: param("utm_content"), fbclid: param("fbclid"),
    })
    let sent = false
    try { sent = typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/funnel", new Blob([body], { type: "application/json" })) } catch {}
    if (!sent) { try { fetch("/api/funnel", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {}) } catch {} }
    try { window.sessionStorage.setItem(FIRED_KEY, JSON.stringify([...fired, step])) } catch {}
  } catch { /* never throw into the form */ }
}

// The form's version on this site, same switch as lib/config.ts (twoStepForm).
export const FORM_MODE = ["0", "false", "off"].includes((process.env.NEXT_PUBLIC_TWO_STEP_FORM ?? "").trim().toLowerCase()) ? "one-step" : "two-step"
