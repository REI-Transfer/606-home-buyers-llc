"use client"

// Property-record seller form (William's build guide 2026-11-16; every client, Mirko
// 2026-11-18). Rendered when the client's build sets NEXT_PUBLIC_RECORD_FORM=1 (see
// SurveyCard in survey-card.tsx); NEXT_PUBLIC_TWO_STEP_FORM picks the version:
//
// TWO-STEP
//   Stage 1 (no progress bar): address → condition (4 photo cards) → contact details.
//   Contact submit shows the "checking" screen, fires NO pixel event and POSTs
//   lead_stage='early' to /api/submit, which checks the house on public records and
//   answers { matched, is_mobile, ask, screened_out, excellent_bypass }.
//   Stage 2 (progress bar): record found = only what the record could not answer
//   [+ land question for a mobile home] → why selling → priority; no record = every
//   old question → why selling → priority. The last answer posts lead_stage 'complete'.
// ONE-STEP (all questions before contact, one post at the end, like today's one-step)
//   address → condition → record check (/api/lookup, sends nothing) → the questions
//   the record could not answer → why selling → priority → contact details → submit.
//   A record screen-out (listed, property type, equity, Excellent) shows before the
//   contact step, as today's one-step screen-outs do.
//
// Screen-outs and low intent answers follow THIS client's rules (lib/form-rules.ts):
// property types, listed, owner, years owned (no record only), Excellent, extras.
// The answer fields go out in the client's own answer ids, filled from the record when
// the seller was not asked, so no CRM / Zap mapping changes.

import { useState, useRef, useEffect, useId, type ReactNode } from "react"
import { Home, ArrowRight, ArrowLeft, ArrowDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { captureTrackingData, getIPAddress, readGfSid } from "@/lib/tracking"
import { Input } from "@/components/ui/input"
import { AddressAutocomplete, type AddressDetails } from "@/components/survey/address-autocomplete"
import { isWithinServiceArea } from "@/lib/service-area"
import { optionsFor, ruleFor, excellentRule, sellerAnswerRule, mobileHomesAllowed, type AnswerField } from "@/lib/form-rules"
import type { SurveyCardProps } from "@/components/v2/survey-card"
import { PrototypePanel, DEMO_SCENARIOS, type DemoInfo } from "@/components/v2/prototype-panel"
import {
  type SurveyData,
  LAND_OWNED_OPTIONS,
  CONDITION_PHOTO_OPTIONS,
  PRIORITY_OPTIONS,
  REASON_OPTIONS,
  calculateLeadScore,

  leadQuality,
  formatPhoneNumber,
  validatePhone,
  validateEmail,
  validateName,
  DisqualifiedScreen,
  ScreenOutScreen,
  SubmittedScreen,
} from "@/components/v2/survey-card-shared"

const STAGE1_STEPS = 3 // 1=address, 2=condition, 3=contact (two-step only)
type Stage2Field = "isLegalOwner" | "listedOnMarket" | "propertyType" | "landOwned" | "ownershipLength" | "reason" | "priority" | "contact"

// Screen-outs: lib/form-rules.ts (this client's rules). Mobile homes are not a
// screen-out when the client buys them: the land question decides (rented lot = out).

// The early post waits on the DealMachine check (5 s budget server side).
// Past this the seller moves on with the old questions; nothing is blocked.
const EARLY_POST_MAX_WAIT_MS = 6500
// The record check after the contact screen: shown at least 1.5 s.
const EARLY_MIN_MS = 1500
const EARLY_LINES = [
  "Finding your property",
  "Checking the public records",
  "Saving your answers",
]
// Final "checking" screen: at least 2 s, never more than 6 s.
const CHECK_MIN_MS = 2000
const CHECK_MAX_MS = 6000
const CHECK_LINES = [
  "Reviewing your property details",
  "Checking options in your area",
  "Finding the best fit for your situation",
]
// The bar fills to 100% before the next screen appears.
const BAR_FINISH_MS = 350
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Loading screen for both record checks. Never says "offer": none has been
// worked out yet. The bar eases toward 90% over the longest expected wait and
// only reaches 100% when the answer is in, so it never sits full while the
// seller is still waiting.
function CheckingScreen({ cardId, title, lines, tick, done, expectedMs }: {
  cardId: string
  title: string; lines: string[]; tick: number; done: boolean; expectedMs: number
}) {
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 30)
    return () => clearTimeout(t)
  }, [])
  const width = done ? 100 : started ? 90 : 4
  const transition = done ? `width ${BAR_FINISH_MS}ms ease-out` : `width ${expectedMs}ms cubic-bezier(0.15, 0.7, 0.3, 1)`
  return (
    <div data-survey-card={cardId} className="w-full max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-6 md:p-8 shadow-lg" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-[#1B2A4A]/5" />
          <span className={`absolute inset-0 rounded-full border-4 border-[#E2E8F0] ${done ? "border-[#22c55e]" : "animate-spin border-t-[#1B2A4A]"}`} style={{ animationDuration: "1.1s" }} />
          {done ? <Check className="h-9 w-9 text-[#22c55e]" /> : <Home className="h-8 w-8 text-[#1B2A4A]" />}
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">{title}</h2>
          <p className="mt-1 text-sm md:text-base text-[#5A6B7D]">This only takes a few seconds. Please don&apos;t close this page.</p>
        </div>
        <div className="h-3 w-full max-w-sm overflow-hidden rounded-full bg-[#E2E8F0]" aria-hidden="true">
          <div className="h-full rounded-full bg-gradient-to-r from-[#1B2A4A] to-[#2F4A7A]" style={{ width: `${width}%`, transition }} />
        </div>
        <ul className="flex w-full max-w-sm flex-col gap-3 text-left">
          {lines.map((line, i) => {
            const on = done || tick > i
            return (
              <li key={line} className={`flex items-center gap-3 text-base md:text-lg transition-opacity duration-300 ${on ? "opacity-100 text-[#0F1D2F]" : "opacity-40 text-[#5A6B7D]"}`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${on ? "bg-[#22c55e] text-white" : "bg-gray-200"}`}>
                  {on && <Check className="h-4 w-4" />}
                </span>
                {line}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

type FbqFn = (...args: unknown[]) => void
type Verdict = "lead" | "low_equity" | "low_intent" | "dq" | "fallback"

// initialAddress set (hero / header already captured the address): Stage 1
// starts at the condition question.
export function RecordSurveyCard({ initialAddress, brand, mode = "two-step" }: SurveyCardProps & { mode?: "two-step" | "one-step" }) {
  const oneStep = mode === "one-step"
  const [stage, setStage] = useState<1 | 2>(1)
  const [stage1Step, setStage1Step] = useState(initialAddress ? 2 : 1)
  const [stage2Step, setStage2Step] = useState(1)

  const [surveyData, setSurveyData] = useState<SurveyData>({
    address: initialAddress || "",
    city: "",
    state: "",
    zip: "",
    propertyType: "",
    landOwned: "",
    priority: "",
    isLegalOwner: "",
    ownershipLength: "",
    listedOnMarket: "",
    timeline: "",
    condition: "",
    reason: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })
  // Property record from the early post: decides which Stage-2 questions show.
  const [dmMatched, setDmMatched] = useState(false)
  // Old questions the record could not answer (asked in Stage 2 when dmMatched).
  const [dmAsk, setDmAsk] = useState<string[]>([])
  const [dmMobile, setDmMobile] = useState(false)
  const [reasonDraft, setReasonDraft] = useState("")
  const [tcpaConsent, setTcpaConsent] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isDisqualified, setIsDisqualified] = useState(false)
  const [disqualifyReason, setDisqualifyReason] = useState("")
  const [addressVerified, setAddressVerified] = useState(!!initialAddress)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Which record check is on screen: after contact details, or the final one.
  const [checkingMode, setCheckingMode] = useState<"early" | "final" | null>(null)
  const [checkDone, setCheckDone] = useState(false)
  const [checkTick, setCheckTick] = useState(0)
  // "Excellent" seller let through because the record shows distress or motivation.
  const [excellentBypass, setExcellentBypass] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  // Showroom prototype only: simulated DealMachine answer + what the server decided.
  const [demoScenario, setDemoScenario] = useState("")
  const [demoInfo, setDemoInfo] = useState<DemoInfo | null>(null)
  const formStartTime = useRef<number>(Date.now())
  const trackingRef = useRef(captureTrackingData())
  const stage1EventIdRef = useRef<string>("")
  const completeSentRef = useRef(false)
  // Set as soon as a hard-DQ answer is clicked, so a quick second click can't
  // advance (or submit) during the 300ms before the block screen appears.
  const dqPendingRef = useRef(false)
  // This client's Excellent rule: "dq" (screened out unless the record shows a lien or
  // motivation), "low_intent" or "pass".
  const excellent = excellentRule()
  const leadSource = process.env.NEXT_PUBLIC_LEAD_SOURCE || `${brand.companyName} - Survey`
  useEffect(() => {
    getIPAddress().then((ip) => { trackingRef.current.ip = ip })
  }, [])
  const [honeypot, setHoneypot] = useState("")

  // Phones: a tall step (the reason list) can leave the page scrolled past the top of
  // the next, shorter step. After every step change, bring the card back into view
  // when its top is hidden under the header or below the screen. Not on first load.
  // A page can show this form twice (hero + lower section): find THIS card by its id.
  const cardId = useId()
  const firstRenderRef = useRef(true)
  useEffect(() => {
    if (firstRenderRef.current) { firstRenderRef.current = false; return }
    const el = document.querySelector(`[data-survey-card="${CSS.escape(cardId)}"]`)
    if (!el) return
    const top = el.getBoundingClientRect().top
    if (top < 72 || top > window.innerHeight) {
      window.scrollTo({ top: Math.max(0, window.scrollY + top - 88), behavior: "smooth" })
    }
  }, [stage, stage1Step, stage2Step, checkingMode, isDisqualified, cardId])

  // Tick the three "checking" lines off one by one.
  useEffect(() => {
    if (!checkingMode) return
    const steps = checkingMode === "early" ? [700, 1700, 2900] : [600, 1200, 1800]
    const timers = steps.map((ms, i) => setTimeout(() => setCheckTick(i + 1), ms))
    return () => timers.forEach(clearTimeout)
  }, [checkingMode])

  // Show a record-check screen from a clean start (empty bar, no ticks).
  const startCheck = (mode: "early" | "final") => {
    setCheckDone(false)
    setCheckTick(0)
    setCheckingMode(mode)
  }
  // Fill the bar to 100% and give it a moment to show.
  const fillBar = async () => {
    setCheckDone(true)
    await wait(BAR_FINISH_MS + 150)
  }

  const disqualify = (reason: string) => {
    dqPendingRef.current = true
    setTimeout(() => { setDisqualifyReason(reason); setIsDisqualified(true) }, 300)
  }

  const scenarioField = brand.showroom && demoScenario ? { dm_scenario: demoScenario } : {}

  // ============================================================
  // STAGE 1
  // ============================================================

  const handleAddressSelect = (address: string, details: AddressDetails) => {
    const state = details.state?.toUpperCase() || ""
    const city = details.city || ""
    const zip = details.zip || ""
    setSurveyData({ ...surveyData, address, city, state, zip })

    // Same env-driven service-area gate as the one-step form.
    if (isWithinServiceArea(details.lat, details.lng)) {
      setAddressVerified(true)
      setTimeout(() => { setStage1Step(2) }, 300)
      return
    }

    setAddressVerified(false)
    disqualify("outsideArea")
  }

  // This site's address box has no typed-address lookup: the seller taps an address
  // in the list, as on its current form.
  const [addressNotFound, setAddressNotFound] = useState(false)
  const resolvingAddress = false
  const handleAddressContinue = async () => {
    if (surveyData.address.trim().length > 0 && addressVerified) { setStage1Step(2); return }
    setAddressNotFound(true)
  }

  // Condition is answered before contact. "Excellent" is no longer screened out
  // here: the record check after the contact screen decides (distress or
  // motivation on record = through, otherwise screened out). NEXT_PUBLIC_EXCELLENT_CONDITION_PASS=true
  // lets every "Excellent" seller through.
  const handleConditionSelect = (value: string) => {
    setSurveyData({ ...surveyData, condition: value })
    setTimeout(() => {
      if (dqPendingRef.current) return
      if (oneStep) void runOneStepLookup(value)
      else setStage1Step(3)
    }, 300)
  }

  // One-step: check the record right after the condition answer, before any question.
  // No contact details yet, so the owner question is always asked. Sends nothing anywhere.
  const runOneStepLookup = async (condition: string) => {
    setIsSubmitting(true)
    startCheck("early")
    const checkStart = Date.now()
    type LookupAnswer = { matched?: boolean; is_mobile?: boolean; ask?: string[]; verdict?: Verdict; dq_reason?: string | null; excellent_bypass?: boolean; demo?: DemoInfo | null }
    let res: LookupAnswer | null = null
    try {
      const post = fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: surveyData.address, city: surveyData.city, state: surveyData.state, zip: surveyData.zip, condition, ...scenarioField }),
      })
        .then((r) => r.json() as Promise<LookupAnswer>)
        .catch(() => null)
      res = await Promise.race([post, new Promise<null>((resolve) => setTimeout(() => resolve(null), EARLY_POST_MAX_WAIT_MS))])
      if (brand.showroom && res?.demo) setDemoInfo(res.demo)
    } catch {
      // a failed check must not block the seller: old questions
    }
    const left = EARLY_MIN_MS - (Date.now() - checkStart)
    if (left > 0) await wait(left)

    // Screened out by the record (listed, property type, equity, Excellent with no lien
    // or motivation): shown here, before the contact step. No answer + Excellent = out, as before.
    const excellentNoAnswer = condition === "excellent" && excellent === "dq" && !res
    if (res?.verdict === "dq" || excellentNoAnswer) {
      setCheckingMode(null)
      setIsSubmitting(false)
      setDisqualifyReason(res?.dq_reason || "excellentCondition")
      setIsDisqualified(true)
      return
    }
    setExcellentBypass(res?.excellent_bypass === true)
    await fillBar()
    setCheckingMode(null)
    const matched = res?.matched === true
    const isMobile = res?.is_mobile === true
    setDmMatched(matched)
    setDmMobile(isMobile)
    setDmAsk(Array.isArray(res?.ask) ? res.ask : [])
    if (matched && isMobile) setSurveyData((d) => ({ ...d, propertyType: "mobile-home" }))
    setIsSubmitting(false)
    setStage(2)
    setStage2Step(1)
  }

  const handleStage1Back = () => {
    if (stage1Step > 1) setStage1Step(stage1Step - 1)
  }

  // Contact submit: validate → anti-bot → early POST (no pixel event; the server
  // checks the property record) → Stage 2
  const contactValid = (): boolean => {
    const errors: {[key: string]: string} = {}
    const firstNameCheck = validateName(surveyData.firstName)
    if (!firstNameCheck.valid) errors.firstName = firstNameCheck.msg
    const lastNameCheck = validateName(surveyData.lastName)
    if (!lastNameCheck.valid) errors.lastName = lastNameCheck.msg
    const emailCheck = validateEmail(surveyData.email)
    if (!emailCheck.valid) errors.email = emailCheck.msg
    const phoneCheck = validatePhone(surveyData.phone)
    if (!phoneCheck.valid) errors.phone = phoneCheck.msg
    if (!tcpaConsent) errors.tcpaConsent = "Please check the box to continue."

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return false
    }
    setValidationErrors({})
    return true
  }

  // One-step: the contact step is the last one; it sends the whole lead.
  const handleOneStepContactSubmit = () => {
    if (!contactValid()) return
    void submitComplete(surveyData)
  }

  const handleContactSubmit = async () => {
    if (!contactValid()) return

    // Anti-bot: too-fast submit or honeypot tripped → fake success, nothing sent
    if (Date.now() - formStartTime.current < 3000) { setIsSubmitted(true); return }
    if (honeypot) { setIsSubmitted(true); return }

    setIsSubmitting(true)
    startCheck("early")
    const checkStart = Date.now()

    const earlyEventId = `lead-early-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    stage1EventIdRef.current = earlyEventId

    let matched = false
    let isMobile = false
    let ask: string[] = []
    let screenedOut = false
    let bypass = false
    let answered = false
    try {
      const payload = {
        lead_stage: 'early',
        record_check: true,
        firstName: surveyData.firstName.trim(),
        lastName: surveyData.lastName.trim(),
        email: surveyData.email,
        phone: surveyData.phone,
        address: surveyData.address,
        city: surveyData.city,
        state: surveyData.state,
        zip: surveyData.zip,
        condition: surveyData.condition,
        isLegalOwner: "",
        listedOnMarket: "",
        tcpa_consent: tcpaConsent,
        source: `${leadSource} (Stage 1)`,
        submittedAt: new Date().toISOString(),
        meta_event_id: earlyEventId,
        meta_event_name: 'LeadEarly',
        meta_value: 0,
        gf_sid: readGfSid(),
        ...scenarioField,
        ...trackingRef.current,
      }
      const post = fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((r) => r.json() as Promise<{ matched?: boolean; is_mobile?: boolean; ask?: string[]; screened_out?: boolean; excellent_bypass?: boolean; demo?: DemoInfo | null }>)
        .catch(() => null)
      const res = await Promise.race([post, new Promise<null>((resolve) => setTimeout(() => resolve(null), EARLY_POST_MAX_WAIT_MS))])
      answered = !!res
      matched = res?.matched === true
      isMobile = res?.is_mobile === true
      ask = Array.isArray(res?.ask) ? res.ask : []
      screenedOut = res?.screened_out === true
      bypass = res?.excellent_bypass === true
      if (brand.showroom && res?.demo) setDemoInfo(res.demo)
    } catch {
      // a failed early POST must not block the user: old questions
    }

    const left = EARLY_MIN_MS - (Date.now() - checkStart)
    if (left > 0) await wait(left)

    // "Excellent" with no distress or motivation on record is screened out here. No answer at
    // all (timeout) = no evidence = screened out too, as before.
    const excellentNoAnswer = surveyData.condition === "excellent" && excellent === "dq" && !answered
    if (screenedOut || excellentNoAnswer) {
      setCheckingMode(null)
      setIsSubmitting(false)
      setDisqualifyReason("excellentCondition")
      setIsDisqualified(true)
      return
    }

    setExcellentBypass(bypass)
    await fillBar()
    setCheckingMode(null)
    setDmMatched(matched)
    setDmMobile(isMobile)
    setDmAsk(ask)
    // A recorded mobile home is a mobile home: the land question decides.
    if (matched && isMobile) setSurveyData((d) => ({ ...d, propertyType: "mobile-home" }))
    setIsSubmitting(false)
    setStage(2)
    setStage2Step(1)
  }

  // ============================================================
  // STAGE 2
  // ============================================================

  // Which questions Stage 2 asks depends on the property record. No usable record:
  // every old question. Usable record: only the old questions it could not answer
  // (dmAsk), so every lead reaches the client with every old field filled.
  const stage2FieldsFor = (d: SurveyData): Stage2Field[] => {
    // Land question only for clients that buy mobile homes; for the rest a mobile home
    // is screened out (on record: at the final check; answered: right away).
    const mobile = mobileHomesAllowed() && (dmMobile || d.propertyType === "mobile-home")
    // One-step: contact details come last.
    const tail: Stage2Field[] = oneStep ? ["reason", "priority", "contact"] : ["reason", "priority"]
    if (!dmMatched) {
      return ["isLegalOwner", "listedOnMarket", "propertyType", ...(mobile ? ["landOwned" as const] : []), "ownershipLength", ...tail]
    }
    return [
      ...(dmAsk.includes("isLegalOwner") ? ["isLegalOwner" as const] : []),
      ...(dmAsk.includes("propertyType") ? ["propertyType" as const] : []),
      ...(mobile ? ["landOwned" as const] : []),
      ...(dmAsk.includes("ownershipLength") ? ["ownershipLength" as const] : []),
      ...tail,
    ]
  }
  const stage2Fields = stage2FieldsFor(surveyData)
  const totalStage2Steps = stage2Fields.length

  const goToThankYou = (finalData: SurveyData) => {
    // Persist lead data for thank-you page book offer
    try {
      sessionStorage.setItem('leadData', JSON.stringify({
        firstName: finalData.firstName,
        lastName: finalData.lastName,
        email: finalData.email,
        phone: finalData.phone,
        address: finalData.address,
        city: finalData.city,
        state: finalData.state,
        zip: finalData.zip,
      }))
      // Bridge the property condition to the thank-you page so its Lead
      // pixel fire can suppress excellent / move-in-ready leads.
      sessionStorage.setItem('lead_condition', finalData.condition)
    } catch {}
    window.location.href = '/thank-you'
  }

  // Final submit: the server checks the record again (same house: no new credit)
  // and returns the verdict; scoring/payload/redirect are otherwise unchanged.
  const submitComplete = async (finalData: SurveyData) => {
    if (completeSentRef.current || dqPendingRef.current) return

    // Anti-bot (same guards the one-step form runs on its final submit)
    const timeSpent = Date.now() - formStartTime.current
    if (timeSpent < 3000) { setIsSubmitted(true); return }
    if (honeypot) { setIsSubmitted(true); return }

    completeSentRef.current = true
    setIsSubmitting(true)
    startCheck("final")
    const checkStart = Date.now()

    let verdict: Verdict = "fallback"
    let dqReason: string | null = null
    let submitOk = false
    const score = calculateLeadScore(finalData)
    const quality = leadQuality(score)
    let serverScore: number | null = null
    // Today's rule, used when there is no property record (verdict "fallback").
    const isExcellentCondition = finalData.condition === 'excellent'
    // Old rules (no usable record), with this client's rules: any low intent answer, or
    // Excellent when the client doesn't pass it, = LeadLowIntent instead of Lead.
    const own = sellerAnswerRule(finalData as unknown as Record<string, unknown>, dmMatched)
    const excellentOk = !isExcellentCondition || excellent === "pass" || excellentBypass
    const oldQualified = own.rule === null && excellentOk
    const oldDqReason = oldQualified ? null : (own.label || "excellent_condition")
    const eventId = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

    try {
      const payload = {
        ...finalData,
        ...trackingRef.current,
        source: leadSource,
        submittedAt: new Date().toISOString(),
        qualified: oldQualified,
        lead_score: score,
        lead_quality: quality,
        disqualify_reason: oldDqReason,
        meta_event_id: eventId,
        meta_event_name: oldQualified ? 'Lead' : 'LeadLowIntent',
        meta_value: oldQualified ? score * 25 : 0,
        record_check: true,
        // One-step posts once, like today's one-step form (no lead_stage).
        ...(oneStep
          ? { record_mode: 'one-step', tcpa_consent: tcpaConsent }
          : { lead_stage: 'complete', stage1_event_id: stage1EventIdRef.current }),
        ...scenarioField,
      }
      // Submit FIRST; only fire the Meta Pixel on a CONFIRMED successful submit.
      const post = fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          const json = await res.json().catch(() => ({}))
          return { ok: res.ok, json: json as { success?: boolean; verdict?: Verdict; dq_reason?: string | null; lead_score?: number; demo?: DemoInfo | null } }
        })
        .catch(() => null)
      const res = await Promise.race([post, new Promise<null>((resolve) => setTimeout(() => resolve(null), CHECK_MAX_MS))])
      submitOk = !!res && res.ok && res.json.success === true
      if (res?.json.verdict) verdict = res.json.verdict
      dqReason = res?.json.dq_reason ?? null
      // The server re-scores after filling answers from the property record.
      if (typeof res?.json.lead_score === "number") serverScore = res.json.lead_score
      if (brand.showroom && res?.json.demo) {
        setDemoInfo(res.json.demo)
        try { sessionStorage.setItem('dm_demo', JSON.stringify(res.json.demo)) } catch {}
      }
    } catch (e) {
      console.error('Submit error:', e)
    }

    // The checking screen shows at least 2 s.
    const left = CHECK_MIN_MS - (Date.now() - checkStart)
    if (left > 0) await new Promise((r) => setTimeout(r, left))

    // Screened out by the property record at the very end (William 2026-11-17): the
    // seller still sees the normal thank-you page. The lead is sent as disqualified
    // (tracker only, never the client CRM) and no pixel event fires.
    if (submitOk && verdict === "dq") {
      void dqReason
      await fillBar()
      goToThankYou(finalData)
      return
    }

    if (submitOk && typeof window !== 'undefined' && (window as { fbq?: FbqFn }).fbq) {
      const fbq = (window as { fbq: FbqFn }).fbq
      const base = { content_name: `${brand.companyName} Survey`, content_category: 'real_estate' }
      const event: string = verdict === "lead" ? "Lead"
        : verdict === "low_equity" ? "LeadLowIntent"
        : verdict === "low_intent" ? "LeadLowIntent"
        : oldQualified ? "Lead" : "LeadLowIntent"
      if (event === "Lead") {
        const s = serverScore ?? score
        fbq('track', 'Lead', { value: s * 25, currency: 'USD', ...base, lead_score: s, lead_quality: leadQuality(s) }, { eventID: eventId })
      } else {
        fbq('trackCustom', event, { ...base, disqualify_reason: verdict === "fallback" ? oldDqReason : verdict, lead_score: serverScore ?? score }, { eventID: eventId })
      }
    }

    // Fill the bar before the thank-you page loads.
    await fillBar()
    goToThankYou(finalData)
  }

  const DQ_LABEL: Partial<Record<Stage2Field, string>> = {
    isLegalOwner: "notOwner", listedOnMarket: "listed", propertyType: "propertyType",
    landOwned: "rentedLot", ownershipLength: "shortOwnership", reason: "noReason",
  }
  // This client's screen-outs (lib/form-rules.ts). With a usable record, years owned is
  // asked only to fill the field: it never screens out (William 2026-11-17).
  const stage2DisqualifyReason = (field: Stage2Field, value: string): string | null => {
    if (field === "priority" || field === "contact") return null
    if (field === "ownershipLength" && dmMatched) return null
    return ruleFor(field as AnswerField, value) === "dq" ? (DQ_LABEL[field] ?? "answer") : null
  }

  // Stage-2 hard DQ: tell n8n this seller was disqualified, so the partial-lead
  // follow-up does not forward them to the client CRM. No pixel event; the
  // server route skips the GoFunnel forward for this stage.
  const sendDisqualified = (reason: string, answers: SurveyData) => {
    try {
      void fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_stage: 'disqualified',
          firstName: answers.firstName.trim(),
          lastName: answers.lastName.trim(),
          email: answers.email,
          phone: answers.phone,
          address: answers.address,
          city: answers.city,
          state: answers.state,
          zip: answers.zip,
          isLegalOwner: answers.isLegalOwner,
          listedOnMarket: answers.listedOnMarket,
          propertyType: answers.propertyType,
          landOwned: answers.landOwned,
          ownershipLength: answers.ownershipLength,
          timeline: answers.timeline,
          condition: answers.condition,
          reason: answers.reason,
          qualified: false,
          disqualify_reason: reason,
          source: `${leadSource} (Stage 2 disqualified)`,
          submittedAt: new Date().toISOString(),
          stage1_event_id: stage1EventIdRef.current,
          ...trackingRef.current,
        }),
      }).catch(() => undefined)
    } catch {
      // never block the disqualify screen
    }
  }

  const advance = (next: SurveyData, fields: Stage2Field[]) => {
    if (stage2Step < fields.length) setStage2Step(stage2Step + 1)
    else void submitComplete(next)
  }

  const handleStage2OptionSelect = (field: Stage2Field, value: string) => {
    const next = { ...surveyData, [field]: value }
    // Changing the property type away from mobile home clears a stale land answer.
    if (field === "propertyType" && value !== "mobile-home") next.landOwned = ""
    setSurveyData(next)

    const dq = stage2DisqualifyReason(field, value)
    // One-step: nothing was sent yet, so nothing to tell n8n (same as today's one-step).
    if (dq) { if (!oneStep) sendDisqualified(dq, next); disqualify(dq); return }

    // The question list can grow (mobile home → land question), so recompute it.
    const fields = stage2FieldsFor(next)
    setTimeout(() => {
      if (dqPendingRef.current) return
      advance(next, fields)
    }, 300)
  }

  // Why selling: the same multiple choice as before (clients' CRMs map these values),
  // plus an optional "anything else?" box that goes to the rep in the property summary.
  const handleReasonContinue = () => {
    if (!surveyData.reason) return
    const next = { ...surveyData, reasonDetails: reasonDraft.trim() }
    setSurveyData(next)
    advance(next, stage2Fields)
  }

  // Back stops at the first Stage-2 question: the early lead is already sent.
  const handleStage2Back = () => {
    if (stage2Step > 1) setStage2Step(stage2Step - 1)
  }

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const renderOptionButton = (
    option: { id: string; label: string; desc?: string },
    selectedValue: string,
    onClick: () => void
  ) => (
    <button
      key={option.id}
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 md:px-5 md:py-4 text-left text-base md:text-lg font-medium transition-all ${
        selectedValue === option.id
          ? "border-[#1B2A4A] bg-[#1B2A4A]/10 text-[#0F1D2F]"
          : "border-[#E2E8F0] bg-white text-[#0F1D2F] hover:border-[#1B2A4A]/50 hover:bg-[#F5F7FA]"
      }`}
    >
      {option.desc ? (
        <>
          <span className="block">{option.label}</span>
          <span className="mt-0.5 block text-sm font-normal text-[#5A6B7D]">{option.desc}</span>
        </>
      ) : (
        option.label
      )}
    </button>
  )

  const renderQuestion = (title: string, subtitle: string, options: ReactNode, grid = false) => (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">{title}</h2>
        <p className="mt-1 text-base text-[#5A6B7D]">{subtitle}</p>
      </div>
      <div className={grid ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}>
        {options}
      </div>
    </div>
  )

  const backButton = (onClick: () => void, disabled: boolean) => (
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className="text-[#5A6B7D] hover:text-[#0F1D2F] hover:bg-[#F5F7FA] text-base disabled:opacity-0"
    >
      <ArrowLeft className="mr-2 h-5 w-5" />
      Back
    </Button>
  )

  const inputClass = (field: string) =>
    `h-14 text-lg rounded-xl border-[#E2E8F0] bg-white text-[#0F1D2F] placeholder:text-[#94A3B8] focus:border-[#1B2A4A] focus:ring-[#1B2A4A]/20 ${validationErrors[field] ? "border-red-500" : ""}`

  if (isDisqualified) {
    // Out of area keeps its own message; every other screen-out gets the
    // "may not be the best fit" screen with the Text Us button.
    return (
      <div data-survey-card={cardId} className="flex w-full max-w-2xl flex-col items-center">
        {disqualifyReason === "outsideArea"
          ? <DisqualifiedScreen reason={disqualifyReason} brand={brand} />
          : <ScreenOutScreen brand={brand} address={surveyData.address} />}
        {brand.showroom && <PrototypePanel demo={demoInfo ?? {
          simulated: demoScenario, matched: dmMatched, equity_pct: null, equity_band: "unknown",
          verdict: "dq", dq_reason: disqualifyReason, credits_used: 0, summary: "",
          meta_event: "none (screened out by an answer, before the final check)",
        }} />}
      </div>
    )
  }

  if (isSubmitted) {
    return <SubmittedScreen surveyData={surveyData} />
  }

  // Record check screens (after contact details, and the final one).
  if (checkingMode) {
    return checkingMode === "early"
      ? <CheckingScreen cardId={cardId} title="Looking up your property" lines={EARLY_LINES} tick={checkTick} done={checkDone} expectedMs={4500} />
      : <CheckingScreen cardId={cardId} title="Reviewing your answers" lines={CHECK_LINES} tick={checkTick} done={checkDone} expectedMs={3000} />
  }

  // Prototype only: pick a simulated DealMachine answer (showroom, never a client site).
  const demoPicker = brand.showroom && stage === 1 && (
    <label className="flex min-w-0 flex-col gap-1 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-sm text-[#0F1D2F]">
      <span className="font-semibold">Prototype: property record answer</span>
      <select
        value={demoScenario}
        onChange={(e) => setDemoScenario(e.target.value)}
        className="w-full min-w-0 rounded-lg border border-amber-300 bg-white px-2 py-1.5"
      >
        {DEMO_SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </label>
  )

  // Contact details: Stage 1 step 3 (two-step) or the last Stage 2 step (one-step).
  const contactStep = (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">How can we reach you?</h2>
                <p className="mt-1 text-base text-[#5A6B7D]">We&apos;ll use this to send you your cash offer within 24 hours.</p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      placeholder="First name"
                      autoComplete="given-name"
                      value={surveyData.firstName}
                      onChange={(e) => { setSurveyData({ ...surveyData, firstName: e.target.value }); setValidationErrors({ ...validationErrors, firstName: "" }) }}
                      className={inputClass("firstName")}
                    />
                    {validationErrors.firstName && <p className="mt-1 text-xs text-red-500">{validationErrors.firstName}</p>}
                  </div>
                  <div>
                    <Input
                      placeholder="Last name"
                      autoComplete="family-name"
                      value={surveyData.lastName}
                      onChange={(e) => { setSurveyData({ ...surveyData, lastName: e.target.value }); setValidationErrors({ ...validationErrors, lastName: "" }) }}
                      className={inputClass("lastName")}
                    />
                    {validationErrors.lastName && <p className="mt-1 text-xs text-red-500">{validationErrors.lastName}</p>}
                  </div>
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder="Email address"
                    autoComplete="email"
                    value={surveyData.email}
                    onChange={(e) => { setSurveyData({ ...surveyData, email: e.target.value }); setValidationErrors({ ...validationErrors, email: "" }) }}
                    className={inputClass("email")}
                  />
                  {validationErrors.email && <p className="mt-1 text-xs text-red-500">{validationErrors.email}</p>}
                </div>
                <div>
                  <Input
                    type="tel"
                    placeholder="(888) 555-0000"
                    autoComplete="tel"
                    value={surveyData.phone}
                    onChange={(e) => { setSurveyData({ ...surveyData, phone: formatPhoneNumber(e.target.value) }); setValidationErrors({ ...validationErrors, phone: "" }) }}
                    maxLength={14}
                    className={inputClass("phone")}
                  />
                  {validationErrors.phone && <p className="mt-1 text-xs text-red-500">{validationErrors.phone}</p>}
                </div>

                {/* TCPA consent */}
                <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                  validationErrors.tcpaConsent ? "border-red-500" : "border-[#E2E8F0] hover:border-[#1B2A4A]/40"
                }`}>
                  <input
                    type="checkbox"
                    checked={tcpaConsent}
                    onChange={(e) => {
                      setTcpaConsent(e.target.checked)
                      if (e.target.checked) setValidationErrors({ ...validationErrors, tcpaConsent: "" })
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[#1B2A4A]"
                  />
                  <span className="text-xs text-[#5A6B7D] leading-snug">
                    By checking this box, I consent to receive calls and text messages (including autodialed) from {brand.companyName || "the company operating this website"} at the phone number provided. Consent is not a condition of any service. Standard message and data rates may apply. Reply STOP to opt out.
                  </span>
                </label>
                {validationErrors.tcpaConsent && <p className="-mt-2 text-xs text-red-500">{validationErrors.tcpaConsent}</p>}

                {/* Honeypot field */}
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="absolute -left-[9999px] opacity-0 pointer-events-none"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
            </div>
  )
  const contactSubmitButton = (onClick: () => void) => (
                <Button
                  onClick={onClick}
                  disabled={isSubmitting || !(
                    surveyData.firstName.trim().length > 0 &&
                    surveyData.lastName.trim().length > 0 &&
                    surveyData.email.trim().length > 0 &&
                    surveyData.phone.trim().length > 0
                  )}
                  className="bg-[#1B2A4A] text-white text-lg px-8 py-3 hover:bg-[#131E36] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      Submitting...
                    </span>
                  ) : (
                    <>
                      Get My Cash Offer
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
  )

  // ============================================================
  // STAGE 1 — one question per screen, NO progress bar
  // ============================================================
  if (stage === 1) {
    return (
      <div data-survey-card={cardId} className="w-full max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-4 md:p-6 shadow-lg">
        <div className="flex flex-col gap-3 md:gap-5">
          {demoPicker}
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-[#1B2A4A]" />
            <span className="text-base text-[#5A6B7D]">Get your free cash offer</span>
          </div>

          {/* Step 1: Address */}
          {stage1Step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">What&apos;s your property address?</h2>
                <p className="mt-1 text-base text-[#5A6B7D]">Start typing and select your address from the dropdown.</p>
              </div>
              <div className="flex justify-center -mb-2">
                <ArrowDown className="h-6 w-6 text-[#1B2A4A] animate-bounce" />
              </div>
              <AddressAutocomplete
                value={surveyData.address}
                onChange={(address) => { setSurveyData({ ...surveyData, address }); setAddressVerified(false); setAddressNotFound(false) }}
                onSelect={handleAddressSelect}
                placeholder="Start typing your address..."
              />
              <Button
                onClick={() => { void handleAddressContinue() }}
                disabled={!surveyData.address.trim() || resolvingAddress}
                className="w-full h-14 bg-[#1B2A4A] text-white text-lg font-semibold rounded-xl hover:bg-[#131E36] disabled:opacity-40 transition-all shadow-md hover:shadow-lg"
              >
                {resolvingAddress ? "Finding your address..." : "Get My Cash Offer"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {addressNotFound && (
                <p className="text-center text-sm font-medium" style={{ color: "#dc2626" }}>
                  Please tap your address in the list so we can find it.
                </p>
              )}
            </div>
          )}

          {/* Step 2: Condition, 4 photo cards */}
          {stage1Step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">What condition is the property in?</h2>
                <p className="mt-1 text-base text-[#5A6B7D]">Pick the photo closest to your kitchen. We buy houses in any condition.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {CONDITION_PHOTO_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => handleConditionSelect(o.id)}
                    className={`flex flex-col overflow-hidden rounded-xl border text-left transition-all ${
                      surveyData.condition === o.id
                        ? "border-[#1B2A4A] ring-2 ring-[#1B2A4A]/30"
                        : "border-[#E2E8F0] hover:border-[#1B2A4A]/50"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.img} alt={o.alt} className="aspect-[4/3] w-full object-cover" loading="eager" />
                    <span className="px-2.5 pt-2 text-base font-semibold text-[#0F1D2F]">{o.label}</span>
                    <span className="px-2.5 pb-2.5 pt-0.5 text-xs md:text-sm text-[#5A6B7D] leading-snug">{o.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Contact Information */}
          {stage1Step === STAGE1_STEPS && contactStep}

          {/* Navigation: the address screen has its own big button; option
              screens auto-advance; the contact screen submits Stage 1. */}
          {stage1Step !== 1 && (
            <div className="flex items-center justify-between">
              {backButton(handleStage1Back, isSubmitting)}
              {stage1Step === STAGE1_STEPS && contactSubmitButton(handleContactSubmit)}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================================
  // STAGE 2 — remaining questions, progress bar SHOWN
  // ============================================================
  const currentField = stage2Fields[Math.min(stage2Step, totalStage2Steps) - 1]
  return (
    <div data-survey-card={cardId} className="w-full max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-4 md:p-6 shadow-lg">
      <div className="flex flex-col gap-3 md:gap-5">
        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-[#1B2A4A]" />
            <span className="text-base text-[#5A6B7D]">Step {stage2Step} of {totalStage2Steps}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalStage2Steps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i < stage2Step ? "bg-[#1B2A4A]" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {currentField === "isLegalOwner" && renderQuestion(
          "Are you the legal homeowner?",
          "This helps us understand who we'll be working with.",
          optionsFor("isLegalOwner").map((o) => renderOptionButton(o, surveyData.isLegalOwner, () => handleStage2OptionSelect("isLegalOwner", o.id)))
        )}

        {currentField === "listedOnMarket" && renderQuestion(
          "Is the property currently listed?",
          "Let us know if the property is currently for sale.",
          optionsFor("listedOnMarket").map((o) => renderOptionButton(o, surveyData.listedOnMarket, () => handleStage2OptionSelect("listedOnMarket", o.id)))
        )}

        {currentField === "propertyType" && renderQuestion(
          "What type of property is it?",
          "Select the option that best describes your property.",
          optionsFor("propertyType").map((o) => renderOptionButton(o, surveyData.propertyType, () => handleStage2OptionSelect("propertyType", o.id)))
        )}

        {currentField === "landOwned" && renderQuestion(
          "Do you own the land the home sits on?",
          "Some homes sit on land you own. Others sit in a park where you pay lot rent.",
          LAND_OWNED_OPTIONS.map((o) => renderOptionButton(o, surveyData.landOwned ?? "", () => handleStage2OptionSelect("landOwned", o.id)))
        )}

        {currentField === "ownershipLength" && renderQuestion(
          "When did you purchase the home?",
          "This helps us estimate your equity position.",
          optionsFor("ownershipLength").map((o) => renderOptionButton(o, surveyData.ownershipLength, () => handleStage2OptionSelect("ownershipLength", o.id)))
        )}

        {currentField === "reason" && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">What&apos;s your reason for selling?</h2>
              <p className="mt-1 text-base text-[#5A6B7D]">So our team can find the option that puts the most money in your pocket.</p>
            </div>
            {/* Two columns on phones too, so "Continue" shows without scrolling. */}
            <div className="grid grid-cols-2 gap-2">
              {optionsFor("reason", REASON_OPTIONS).map((o) => renderOptionButton(o, surveyData.reason, () => {
                setSurveyData({ ...surveyData, reason: o.id })
                // Phones: bring the optional box and Continue into view once a reason is picked.
                requestAnimationFrame(() => document.querySelector(`[data-reason-continue="${CSS.escape(cardId)}"]`)
                  ?.scrollIntoView({ block: "nearest", behavior: "smooth" }))
              }))}
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-base text-[#5A6B7D]">Anything else you&apos;d like us to know? (optional)</span>
              <textarea
                value={reasonDraft}
                onChange={(e) => setReasonDraft(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={`Example: "I inherited my mom's house and can't keep up with the repairs."`}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white p-3 text-base text-[#0F1D2F] placeholder:text-[#94A3B8] focus:border-[#1B2A4A] focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/20"
              />
            </label>
            <Button
              data-reason-continue={cardId}
              onClick={handleReasonContinue}
              disabled={!surveyData.reason}
              className="h-12 w-full bg-[#1B2A4A] text-white text-lg font-semibold rounded-xl hover:bg-[#131E36] disabled:opacity-40"
            >
              Continue
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {currentField === "priority" && renderQuestion(
          "What matters most to you?",
          "Pick the one that fits best.",
          PRIORITY_OPTIONS.map((o) => renderOptionButton(o, surveyData.priority ?? "", () => handleStage2OptionSelect("priority", o.id)))
        )}

        {currentField === "contact" && contactStep}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {backButton(handleStage2Back, stage2Step === 1 || isSubmitting)}
          {currentField === "contact" && contactSubmitButton(handleOneStepContactSubmit)}
        </div>
      </div>
    </div>
  )
}
