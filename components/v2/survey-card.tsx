"use client"

import { useState, useRef, useEffect } from "react"
import { Home, ArrowRight, ArrowLeft, ArrowDown, Check, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { captureTrackingData, getIPAddress, readGfSid } from "@/lib/tracking"
import { Input } from "@/components/ui/input"
import { AddressAutocomplete, type AddressAutocompleteHandle, type AddressDetails } from "@/components/survey/address-autocomplete"
import { isWithinServiceArea } from "@/lib/service-area"
import { marketPhrase, type Brand } from "@/lib/brand"

interface SurveyData {
  address: string
  city: string
  state: string
  zip: string
  propertyType: string
  isLegalOwner: string
  ownershipLength: string
  listedOnMarket: string
  timeline: string
  condition: string
  reason: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

const PROPERTY_TYPE_OPTIONS = [
  { id: "single-family", label: "Single Family Home" },
  { id: "multi-family", label: "Multi-Family (Duplex, Triplex, etc.)" },
  { id: "condo", label: "Condo" },
  { id: "townhouse", label: "Townhouse" },
  { id: "mobile-home", label: "Mobile / Manufactured Home" },
  { id: "land", label: "Vacant Land / Lot" },
  { id: "other", label: "Other" },
]

const LEGAL_OWNER_OPTIONS = [
  { id: "yes-owner", label: "Yes, I am the legal homeowner" },
  { id: "yes-family", label: "Yes, I am a family member with the legal right to sell" },
  { id: "no", label: "No, I am not" },
]

const OWNERSHIP_LENGTH_OPTIONS = [
  { id: "1-3-years", label: "Within the last 3 years" },
  { id: "3-5-years", label: "3 to 5 years ago" },
  { id: "5-10-years", label: "5 to 10 years ago" },
  { id: "10-plus-years", label: "More than 10 years ago" },
  { id: "inherited", label: "I recently inherited it" },
]

const LISTED_OPTIONS = [
  { id: "not-listed", label: "No, never" },
  { id: "listed-active", label: "Yes, active now" },
  { id: "listed-expired", label: "Yes, but expired or cancelled" },
  { id: "not-sure", label: "Not sure" },
]

const TIMELINE_OPTIONS = [
  { id: "asap", label: "ASAP (Within 7 days)" },
  { id: "2-weeks", label: "Within 2 weeks" },
  { id: "30-days", label: "Within 30 days" },
  { id: "60-days", label: "Within 60 days" },
  { id: "flexible", label: "I'm flexible" },
]

const CONDITION_OPTIONS = [
  { id: "excellent", label: "Excellent - Move-in ready", desc: "Recently updated. Could list tomorrow with nothing to fix." },
  { id: "good", label: "Good - Minor repairs needed", desc: "Well kept, but dated kitchen, baths, or floors. Nothing broken." },
  { id: "fair", label: "Fair - Needs some work", desc: "Dated throughout, plus wear and repairs I've been putting off." },
  { id: "poor", label: "Poor - Major repairs needed", desc: "Major systems need work. Roof, HVAC, plumbing, electrical, or foundation." },
  { id: "distressed", label: "Distressed - Significant issues", desc: "Not livable as-is. Significant damage, or it's been sitting vacant." },
]

const REASON_OPTIONS = [
  { id: "foreclosure", label: "Facing foreclosure" },
  { id: "behind-payments", label: "Behind on payments" },
  { id: "inherited", label: "Inherited property" },
  { id: "divorce", label: "Divorce or separation" },
  { id: "relocation", label: "Job relocation" },
  { id: "downsizing", label: "Downsizing" },
  { id: "repairs", label: "Can't afford repairs" },
  { id: "other", label: "Other" },
]

// ─── Lead scoring (browser-side, no n8n changes) ───────────────────────
const SCORE_TIMELINE: Record<string, number> = {
  'asap': 3, '2-weeks': 2, '30-days': 1, '60-days': 0, 'flexible': 0,
}
const SCORE_OWNERSHIP: Record<string, number> = {
  '10-plus-years': 3, '5-10-years': 1, '3-5-years': 0, '1-3-years': 0,
  // inherited: exempt from the ownership hard-DQ; scored 3 (matches Elevate v2.51).
  'inherited': 3,
}
const SCORE_REASON: Record<string, number> = {
  'foreclosure': 3, 'behind-payments': 3,
  'inherited': 2, 'repairs': 2,
  'other': 1,
  'relocation': 0, 'divorce': 0, 'downsizing': 0,
}
const SCORE_CONDITION: Record<string, number> = {
  'poor': 1, 'distressed': 1,
  'fair': 0, 'good': 0, 'excellent': 0,
}
function calculateLeadScore(d: SurveyData): number {
  const t = SCORE_TIMELINE[d.timeline] ?? 0
  const o = SCORE_OWNERSHIP[d.ownershipLength] ?? 0
  const r = SCORE_REASON[d.reason] ?? 0
  const c = SCORE_CONDITION[d.condition] ?? 0
  return Math.min(10, t + o + r + c)
}
function isQualifiedForMeta(d: SurveyData): boolean {
  const okType = d.propertyType === 'single-family' || d.propertyType === 'multi-family'
  const okListed = d.listedOnMarket === 'not-listed'
  const okOwner = d.isLegalOwner !== 'no'
  return okType && okListed && okOwner
}
function leadQuality(score: number): 'premium' | 'standard' | 'low' {
  if (score >= 6) return 'premium'
  if (score >= 2) return 'standard'
  return 'low'
}
function disqualifyReasonFor(d: SurveyData): string {
  if (d.propertyType !== 'single-family' && d.propertyType !== 'multi-family') return 'property_type'
  if (d.listedOnMarket !== 'not-listed') return 'listed'
  if (d.isLegalOwner === 'no') return 'not_owner'
  if (d.condition === 'excellent') return 'excellent_condition'
  return 'unknown'
}
// ──────────────────────────────────────────────────────────────────────

const DISPOSABLE_DOMAINS = new Set(["mailinator.com","guerrillamail.com","tempmail.com","throwaway.email","yopmail.com","sharklasers.com","guerrillamail.info","grr.la","guerrillamail.biz","guerrillamail.de","guerrillamail.net","guerrillamail.org","spam4.me","trashmail.com","trashmail.me","trashmail.net","mytemp.email","mohmal.com","tempail.com","dispostable.com","maildrop.cc","10minutemail.com","temp-mail.org","fakeinbox.com","mailnesia.com","getnada.com","emailondeck.com","33mail.com","harakirimail.com","jetable.org","meltmail.com","mailcatch.com","tempinbox.com","spamgourmet.com","mailexpire.com","incognitomail.org","getairmail.com","mailnull.com","safeemail.xyz","tempmailo.com","burnermail.io"])

const BLOCKED_WORDS = new Set(["fuck","shit","ass","damn","bitch","bastard","dick","cock","pussy","cunt","whore","slut","fag","nigger","nigga","retard","penis","vagina","anus","dildo","porn","xxx","viagra","cialis","casino","bitcoin","crypto","forex","mlm","scam","spam","test123","asdf","qwerty","aaaaaa","zzzzzz","abcdef","123456"])

function formatPhoneNumber(value: string): string {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("1")) digits = digits.slice(1)
  if (digits.length > 10) digits = digits.slice(0, 10)
  if (digits.length === 0) return ""
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

function validatePhone(phone: string): { valid: boolean; msg: string } {
  const digits = phone.replace(/\D/g, "").replace(/^1/, "")
  if (digits.length !== 10) return { valid: false, msg: "Please enter a valid 10-digit US phone number." }
  const area = digits.slice(0, 3)
  // NANP structural rules: area code can't start with 0 or 1
  if (area[0] === "0" || area[0] === "1") return { valid: false, msg: `Area code (${area}) doesn't appear to be valid.` }
  if (/^(\d)\1{9}$/.test(digits)) return { valid: false, msg: "Please enter a real phone number." }
  if (["1234567890", "0123456789", "9876543210"].includes(digits)) return { valid: false, msg: "Please enter a real phone number." }
  const exchange = digits.slice(3, 6)
  if (exchange === "555") return { valid: false, msg: "Please enter a real phone number, not a 555 number." }
  if (exchange.startsWith("0") || exchange.startsWith("1")) return { valid: false, msg: "That doesn't look like a valid phone number." }
  return { valid: true, msg: "" }
}

function validateEmail(email: string): { valid: boolean; msg: string } {
  if (!email || email.trim() === "") return { valid: false, msg: "Email is required." }
  const e = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { valid: false, msg: "Please enter a valid email address." }
  const domain = e.split("@")[1]
  if (DISPOSABLE_DOMAINS.has(domain)) return { valid: false, msg: "Please use a real email address, not a temporary one." }
  const fakePatterns = ["test@test", "fake@fake", "asdf@asdf", "noemail@", "spam@", "junk@", "nobody@nobody", "aaa@aaa", "abc@abc", "example@example"]
  for (const pattern of fakePatterns) {
    if (e.startsWith(pattern)) return { valid: false, msg: "Please enter your real email address." }
  }
  const emailParts = e.replace("@", " ").replace(/\./g, " ").split(/\s+/)
  for (const part of emailParts) {
    if (BLOCKED_WORDS.has(part)) return { valid: false, msg: "Please enter a valid email address." }
  }
  return { valid: true, msg: "" }
}

function validateName(name: string): { valid: boolean; msg: string } {
  const trimmed = name.trim()
  if (!trimmed) return { valid: false, msg: "Name is required." }
  if (trimmed.length < 2) return { valid: false, msg: "Please enter your full name." }
  const words = trimmed.toLowerCase().split(/\s+/)
  for (const word of words) {
    if (BLOCKED_WORDS.has(word)) return { valid: false, msg: "Please enter your real name." }
  }
  if (/(.)\1{4,}/.test(trimmed)) return { valid: false, msg: "Please enter your real name." }
  if (/^\d+$/.test(trimmed)) return { valid: false, msg: "Please enter your real name, not a number." }
  return { valid: true, msg: "" }
}

// ─── Two-step flow ─────────────────────────────────────────────────────
// Stage 1 (no progress bar, one question per screen):
//   1 address → 2 legal owner → 3 listed on market → 4 contact details
//   Contact submit fires NO pixel event (LeadEarly removed) and POSTs
//   lead_stage='early' to /api/submit, then moves to Stage 2.
// Stage 2 (progress bar): the remaining qualification questions, in this
//   survey's original order. The final answer submits lead_stage='complete'
//   with the SAME scoring, Lead vs LeadLowIntent event, payload and
//   /thank-you redirect the one-step form used.
// Hard DQs in Stage 1 (out of area, not owner, listed) stop BEFORE contact
// details, so no early POST and no LeadEarly fire for them. Hard DQs in
// Stage 2 POST lead_stage='disqualified' so n8n does not forward the partial.
const STAGE1_STEPS = 4 // 1=address, 2=owner, 3=listed, 4=contact
type Stage2Field = "propertyType" | "ownershipLength" | "timeline" | "condition" | "reason"
// The original v2 question order, minus the questions that moved to Stage 1.
const STAGE2_FIELDS: Stage2Field[] = ["propertyType", "ownershipLength", "timeline", "condition", "reason"]

// Stage-2 hard disqualifiers (unchanged from the one-step v2 form).
// Condo is a DQ here (townhouse still qualifies).
const DQ_PROPERTY_TYPES = ["condo", "mobile-home", "land", "other"]
// Short ownership (under ~5 years: "1-3-years" = <3yr, "3-5-years" = 3-5yr)
const DQ_OWNERSHIP_LENGTHS = ["1-3-years", "3-5-years"]
// Listing hard-DQ (Elevate v2.51): only "No, never" (not-listed) passes; active,
// expired/cancelled, and "not sure" all block. Stage 1.
const DQ_LISTED = ["listed-active", "not-sure", "listed-expired"]

// Cap how long the user waits on the early POST. The request itself is not
// aborted (the page does not navigate, so it keeps running in the background);
// the user just advances to Stage 2. A failed or slow early POST never blocks.
const EARLY_POST_MAX_WAIT_MS = 4000

type FbqFn = (...args: unknown[]) => void

interface SurveyCardProps {
  allowedCounties?: string[];
  allowedStates?: string[];
  // When set (hero / header already captured the address), Stage 1 starts at
  // the legal-owner question. Owner and listed are never skipped: they are
  // hard disqualifiers.
  initialAddress?: string
  // Google details for initialAddress, so city / state / ZIP reach the lead.
  initialDetails?: AddressDetails
  // brand.companyName (config.companyName) names the company in the TCPA
  // consent text and the pixel content_name.
  brand: Brand
}

export function SurveyCard({ initialAddress, initialDetails, brand, allowedCounties = [], allowedStates = [] }: SurveyCardProps) {
  // ---- Stage state ----
  const [stage, setStage] = useState<1 | 2>(1)
  const [stage1Step, setStage1Step] = useState(initialAddress ? 2 : 1)
  const [stage2Step, setStage2Step] = useState(1) // 1..STAGE2_FIELDS.length
  const totalStage2Steps = STAGE2_FIELDS.length

  const [surveyData, setSurveyData] = useState<SurveyData>({
    address: initialAddress || "",
    city: initialDetails?.city || "",
    state: initialDetails?.state?.toUpperCase() || "",
    zip: initialDetails?.zip || "",
    propertyType: "",
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
  const [tcpaConsent, setTcpaConsent] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isDisqualified, setIsDisqualified] = useState(false)
  const [disqualifyReason, setDisqualifyReason] = useState("")
  const [addressVerified, setAddressVerified] = useState(!!initialAddress)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const formStartTime = useRef<number>(Date.now())
  const trackingRef = useRef(captureTrackingData())
  const stage1EventIdRef = useRef<string>("")
  const completeSentRef = useRef(false)
  // Set as soon as a hard-DQ answer is clicked, so a quick second click can't
  // advance (or submit) during the 300ms before the block screen appears.
  const dqPendingRef = useRef(false)
  const excellentPass = process.env.NEXT_PUBLIC_EXCELLENT_CONDITION_PASS === 'true'
  const leadSource = process.env.NEXT_PUBLIC_LEAD_SOURCE || `${brand.companyName} - Survey`
  useEffect(() => {
    getIPAddress().then((ip) => { trackingRef.current.ip = ip })
  }, [])
  const [honeypot, setHoneypot] = useState("")

  const disqualify = (reason: string) => {
    dqPendingRef.current = true
    setTimeout(() => { setDisqualifyReason(reason); setIsDisqualified(true) }, 300)
  }

  // ============================================================
  // STAGE 1
  // ============================================================

  // Same gate as the hero: state list (ALLOWED_STATES), then county list scoped
  // to those states (ALLOWED_COUNTIES). Was hardcoded to "TX", which rejected
  // every in-area address for non-Texas clients.
  const stateOk = (details: AddressDetails) =>
    allowedStates.length === 0 ||
    !!(details.state && allowedStates.map((s) => s.toUpperCase()).includes(details.state.toUpperCase()));

  const countyOk = (details: AddressDetails) => {
    if (!allowedCounties || allowedCounties.length === 0) return true;
    const n = (c?: string) => (c || "").replace(/\s+county$/i, "").trim().toLowerCase();
    return !!(stateOk(details) && details.county && allowedCounties.map(n).includes(n(details.county)));
  };

  const handleAddressSelect = (address: string, details: AddressDetails) => {
    const state = details.state?.toUpperCase() || ""
    const city = details.city || ""
    const zip = details.zip || ""
    setSurveyData({ ...surveyData, address, city, state, zip })

    // Env-driven service-area gate. Permissive when NEXT_PUBLIC_SERVICE_AREAS is
    // empty (accepts any address). addressVerified only flips true after passing.
    if (stateOk(details) && countyOk(details) && isWithinServiceArea(details.lat, details.lng)) {
      setAddressVerified(true)
      setTimeout(() => { setStage1Step(2) }, 300)
      return
    }

    setAddressVerified(false)
    disqualify("outsideArea")
  }

  const addressRef = useRef<AddressAutocompleteHandle>(null)
  // Typed but not picked from the list: look it up and run the same select /
  // out-of-area path as tapping it.
  const handleAddressContinue = () => {
    if (surveyData.address.trim().length > 0 && addressVerified) setStage1Step(2)
    else addressRef.current?.resolveTyped()
  }

  const handleOwnerSelect = (value: string) => {
    setSurveyData({ ...surveyData, isLegalOwner: value })
    if (value === "no") { disqualify("notOwner"); return }
    setTimeout(() => { if (!dqPendingRef.current) setStage1Step(3) }, 300)
  }

  const handleListedSelect = (value: string) => {
    setSurveyData({ ...surveyData, listedOnMarket: value })
    if (DQ_LISTED.includes(value)) { disqualify("listed"); return }
    setTimeout(() => { if (!dqPendingRef.current) setStage1Step(4) }, 300)
  }

  const handleStage1Back = () => {
    if (stage1Step > 1) setStage1Step(stage1Step - 1)
  }

  // Contact submit: validate → anti-bot → early POST (no pixel event) → Stage 2
  const handleContactSubmit = async () => {
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
      return
    }
    setValidationErrors({})

    // Anti-bot: too-fast submit or honeypot tripped → fake success, nothing sent
    if (Date.now() - formStartTime.current < 3000) { setIsSubmitted(true); return }
    if (honeypot) { setIsSubmitted(true); return }

    setIsSubmitting(true)

    const earlyEventId = `lead-early-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    stage1EventIdRef.current = earlyEventId

    try {
      const fullName = `${surveyData.firstName.trim()} ${surveyData.lastName.trim()}`.trim()
      const payload = {
        lead_stage: 'early',
        firstName: surveyData.firstName.trim(),
        lastName: surveyData.lastName.trim(),
        name: fullName,
        email: surveyData.email,
        phone: surveyData.phone,
        address: surveyData.address,
        city: surveyData.city,
        state: surveyData.state,
        zip: surveyData.zip,
        isLegalOwner: surveyData.isLegalOwner,
        listedOnMarket: surveyData.listedOnMarket,
        tcpa_consent: tcpaConsent,
        source: `${leadSource} (Stage 1)`,
        submittedAt: new Date().toISOString(),
        meta_event_id: earlyEventId,
        meta_event_name: 'LeadEarly',
        meta_value: 0,
        gf_sid: readGfSid(),
        ...trackingRef.current,
      }
      const post = fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => undefined)
      await Promise.race([post, new Promise((resolve) => setTimeout(resolve, EARLY_POST_MAX_WAIT_MS))])
    } catch {
      // partial fail shouldn't block user
    }

    setIsSubmitting(false)
    setStage(2)
    setStage2Step(1)
  }

  // ============================================================
  // STAGE 2
  // ============================================================

  // Final submit — scoring, qualification, event naming, payload, sessionStorage
  // bridge and redirect are unchanged from the one-step v2 form; only
  // lead_stage + stage1_event_id are added.
  const submitComplete = async (finalData: SurveyData) => {
    if (completeSentRef.current || dqPendingRef.current) return

    // Anti-bot (same guards the one-step form ran on its final submit)
    const timeSpent = Date.now() - formStartTime.current
    if (timeSpent < 3000) { setIsSubmitted(true); return }
    if (honeypot) { setIsSubmitted(true); return }

    completeSentRef.current = true
    setIsSubmitting(true)

    try {
      const score = calculateLeadScore(finalData)
      const quality = leadQuality(score)
      // Excellent / move-in-ready condition is NOT a Meta-qualifying lead:
      // capture it for the client, but never fire the real "Lead" pixel event.
      const isExcellentCondition = finalData.condition === 'excellent'
      const qualified = isQualifiedForMeta(finalData) && (excellentPass || !isExcellentCondition)
      const dqReason = qualified ? null : disqualifyReasonFor(finalData)
      const eventId = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      const payload = {
        ...finalData,
        ...trackingRef.current,
        // /api/submit requires a top-level `name`; SurveyData only has first/last.
        name: `${finalData.firstName} ${finalData.lastName}`.trim(),
        source: leadSource,
        submittedAt: new Date().toISOString(),
        qualified,
        lead_score: score,
        lead_quality: quality,
        disqualify_reason: dqReason,
        meta_event_id: eventId,
        meta_event_name: qualified ? 'Lead' : 'LeadLowIntent',
        meta_value: qualified ? score * 25 : 0,
        lead_stage: 'complete',
        stage1_event_id: stage1EventIdRef.current,
      }
      // Fire weighted Meta Pixel event (browser-side; CAPI is a separate later phase)
      if (typeof window !== 'undefined' && (window as { fbq?: FbqFn }).fbq) {
        const fbq = (window as { fbq: FbqFn }).fbq
        if (qualified) {
          fbq('track', 'Lead', {
            value: score * 25, currency: 'USD',
            content_name: `${brand.companyName} Survey`, content_category: 'real_estate',
            lead_score: score, lead_quality: quality,
          }, { eventID: eventId })
        } else {
          fbq('trackCustom', 'LeadLowIntent', {
            content_name: `${brand.companyName} Survey`, content_category: 'real_estate',
            disqualify_reason: dqReason, lead_score: score,
          }, { eventID: eventId })
        }
      }
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        console.error('Submit failed:', res.status, await res.text())
      }
    } catch (e) {
      console.error('Submit error:', e)
    }

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

  // Stage-2 hard disqualifiers — same outcomes as the one-step v2 form: block
  // screen, and the complete lead is never submitted.
  const stage2DisqualifyReason = (field: Stage2Field, value: string): string | null => {
    if (field === "propertyType" && DQ_PROPERTY_TYPES.includes(value)) return "propertyType"
    if (field === "ownershipLength" && DQ_OWNERSHIP_LENGTHS.includes(value)) return "shortOwnership"
    // Default hard-DQ: move-in ready / excellent condition (not a distressed/motivated
    // seller). NEXT_PUBLIC_EXCELLENT_CONDITION_PASS=true turns it off.
    if (field === "condition" && value === "excellent" && !excellentPass) return "excellentCondition"
    return null
  }

  // Stage-2 hard DQ: tell n8n this seller was disqualified, so the workflow's
  // 15-minute partial-lead follow-up does not forward them to the client CRM.
  // No pixel event, no GoFunnel forward (the server route skips both).
  const sendDisqualified = (reason: string, answers: SurveyData) => {
    try {
      const fullName = `${answers.firstName.trim()} ${answers.lastName.trim()}`.trim()
      void fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_stage: 'disqualified',
          firstName: answers.firstName.trim(),
          lastName: answers.lastName.trim(),
          name: fullName,
          email: answers.email,
          phone: answers.phone,
          address: answers.address,
          city: answers.city,
          state: answers.state,
          zip: answers.zip,
          isLegalOwner: answers.isLegalOwner,
          listedOnMarket: answers.listedOnMarket,
          propertyType: answers.propertyType,
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

  const handleStage2OptionSelect = (field: Stage2Field, value: string) => {
    const next = { ...surveyData, [field]: value }
    setSurveyData(next)

    const dq = stage2DisqualifyReason(field, value)
    if (dq) { sendDisqualified(dq, next); disqualify(dq); return }

    setTimeout(() => {
      if (dqPendingRef.current) return
      if (stage2Step < totalStage2Steps) {
        setStage2Step(stage2Step + 1)
      } else {
        void submitComplete(next)
      }
    }, 300)
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

  const renderQuestion = (title: string, subtitle: string, options: React.ReactNode, grid = false) => (
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
    const disqualifyMessages: Record<string, { title: string; message: string; detail: string }> = {
      notOwner: {
        title: "We're Unable to Assist",
        message: "Unfortunately, we can only work with individuals who have the legal right to sell the property.",
        detail: "If you believe you have legal authority to sell (such as power of attorney, executor of estate, or court-appointed representative), please contact us directly.",
      },
      listed: {
        title: "We Can't Make an Offer Right Now",
        message: "We're unable to make an offer on properties that are currently listed on the market.",
        detail: "If your listing expires or you decide to take it off the market, we'd love to help. Feel free to reach out to us at that time.",
      },
      propertyType: {
        title: "We're Unable to Assist",
        message: "Unfortunately, we're not able to make an offer on this type of property at this time.",
        detail: "We primarily purchase single-family homes, multi-family properties, and townhouses. If you have a different property you'd like to sell, feel free to reach out.",
      },
      excellentCondition: {
        title: "This May Not Be the Right Fit",
        message: "Based on your answers, your home sounds like it's in great shape. For a move-in-ready property like yours, listing with a traditional agent will usually get you a higher price than a cash offer.",
        detail: "We work best with homeowners who need to sell quickly or whose property needs some work, so we're likely not the best fit right now. Thanks for your time.",
      },
      shortOwnership: {
        title: "This May Not Be the Right Fit",
        message: "Based on your answers, we may not be the best fit for your situation right now.",
        detail: "We work best with homeowners who've owned their property a bit longer. If your situation changes, feel free to come back any time — we'd be glad to help.",
      },
      outsideArea: {
        title: "We Don't Service That Area Yet",
        message: `We're not able to make an offer on properties outside our current buying area.`,
        detail: `If you have a property in ${marketPhrase(brand)} you'd like to sell, feel free to submit that address instead. We'd love to help.`,
      },
    }
    const msg = disqualifyMessages[disqualifyReason] || disqualifyMessages.notOwner

    return (
      <div className="w-full max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-lg">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">{msg.title}</h2>
            <p className="mt-2 text-[#5A6B7D] text-lg">{msg.message}</p>
            <p className="mt-4 text-base text-[#5A6B7D]">{msg.detail}</p>
          </div>
          <a
            href={`tel:${brand.phoneHref}`}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#1B2A4A] px-8 py-4 text-lg text-white hover:bg-[#131E36] transition-colors"
          >
            Call Us: {brand.phoneDisplay}
          </a>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-lg">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">Thank You, {surveyData.firstName}!</h2>
            <p className="mt-2 text-[#5A6B7D] text-lg">
              We&apos;ve received your information and will be in touch shortly with your cash offer.
            </p>
            <p className="mt-4 text-base text-[#5A6B7D]">
              One of our team members will call you within 24 hours to discuss your property.
            </p>
          </div>
          <div className="mt-2 rounded-xl bg-[#F5F7FA] p-4 text-left w-full">
            <h3 className="text-base font-medium text-[#0F1D2F] mb-2">Your Submission Summary:</h3>
            <div className="text-base text-[#5A6B7D] space-y-1">
              <p><span className="font-medium">Property:</span> {surveyData.address}</p>
              <p><span className="font-medium">Email:</span> {surveyData.email}</p>
              <p><span className="font-medium">Phone:</span> {surveyData.phone}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // STAGE 1 — one question per screen, NO progress bar
  // ============================================================
  if (stage === 1) {
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-4 md:p-6 shadow-lg">
        <div className="flex flex-col gap-3 md:gap-5">
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
                ref={addressRef}
                onSubmit={handleAddressContinue}
                value={surveyData.address}
                onChange={(address) => { setSurveyData({ ...surveyData, address }); setAddressVerified(false) }}
                onSelect={handleAddressSelect}
                onOutOfArea={() => { setAddressVerified(false); disqualify("outsideArea") }}
                allowedStates={allowedStates}
                allowedCounties={allowedCounties}
                placeholder="Start typing your address..."
              />
              <Button
                onClick={handleAddressContinue}
                disabled={!surveyData.address.trim()}
                className="w-full h-14 bg-[#1B2A4A] text-white text-lg font-semibold rounded-xl hover:bg-[#131E36] disabled:opacity-40 transition-all shadow-md hover:shadow-lg"
              >
                Get My Cash Offer
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Step 2: Legal Owner */}
          {stage1Step === 2 && renderQuestion(
            "Are you the legal homeowner?",
            "This helps us understand who we'll be working with.",
            LEGAL_OWNER_OPTIONS.map((o) => renderOptionButton(o, surveyData.isLegalOwner, () => handleOwnerSelect(o.id)))
          )}

          {/* Step 3: Listed on Market */}
          {stage1Step === 3 && renderQuestion(
            "Is the property currently listed?",
            "Let us know if the property is currently for sale.",
            LISTED_OPTIONS.map((o) => renderOptionButton(o, surveyData.listedOnMarket, () => handleListedSelect(o.id)))
          )}

          {/* Step 4: Contact Information */}
          {stage1Step === STAGE1_STEPS && (
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
          )}

          {/* Navigation — the address screen has its own big button; option
              screens auto-advance; the contact screen submits Stage 1. */}
          {stage1Step !== 1 && (
            <div className="flex items-center justify-between">
              {backButton(handleStage1Back, isSubmitting)}
              {stage1Step === STAGE1_STEPS && (
                <Button
                  onClick={handleContactSubmit}
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
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================================
  // STAGE 2 — remaining questions, progress bar SHOWN
  // ============================================================
  const currentField = STAGE2_FIELDS[stage2Step - 1]
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-4 md:p-6 shadow-lg">
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

        {currentField === "propertyType" && renderQuestion(
          "What type of property is it?",
          "Select the option that best describes your property.",
          PROPERTY_TYPE_OPTIONS.map((o) => renderOptionButton(o, surveyData.propertyType, () => handleStage2OptionSelect("propertyType", o.id)))
        )}

        {currentField === "ownershipLength" && renderQuestion(
          "When did you purchase the home?",
          "This helps us estimate your equity position.",
          OWNERSHIP_LENGTH_OPTIONS.map((o) => renderOptionButton(o, surveyData.ownershipLength, () => handleStage2OptionSelect("ownershipLength", o.id)))
        )}

        {currentField === "timeline" && renderQuestion(
          "How fast are you looking to sell?",
          "Select your ideal timeline for closing.",
          TIMELINE_OPTIONS.map((o) => renderOptionButton(o, surveyData.timeline, () => handleStage2OptionSelect("timeline", o.id)))
        )}

        {currentField === "condition" && renderQuestion(
          "What condition is the property in?",
          "Be honest. We buy houses in any condition.",
          CONDITION_OPTIONS.map((o) => renderOptionButton(o, surveyData.condition, () => handleStage2OptionSelect("condition", o.id)))
        )}

        {currentField === "reason" && renderQuestion(
          "What's your reason for selling?",
          "This helps us understand your situation better.",
          REASON_OPTIONS.map((o) => renderOptionButton(o, surveyData.reason, () => handleStage2OptionSelect("reason", o.id))),
          true
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {backButton(handleStage2Back, stage2Step === 1 || isSubmitting)}
          {isSubmitting && (
            <span className="flex items-center gap-2 text-base text-[#5A6B7D]">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#1B2A4A]" />
              Submitting...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
