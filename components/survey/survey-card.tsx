"use client"

import { useState, useRef, useEffect } from "react"
import { Home, ArrowRight, ArrowLeft, Check, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { captureTrackingData, getIPAddress, readGfSid } from "@/lib/tracking"
import { Input } from "@/components/ui/input"
import { AddressAutocomplete, type AddressAutocompleteHandle, type AddressDetails, type ServiceArea } from "./address-autocomplete"

interface SurveyData {
  address: string
  propertyType: string
  isLegalOwner: string
  listedOnMarket: string
  timeline: string
  condition: string
  reason: string
  ownershipLength: string
  firstName: string
  lastName: string
  name: string
  email: string
  phone: string
}

const PROPERTY_TYPE_OPTIONS = [
  { id: "single-family", label: "Single Family Home" },
  { id: "multi-family", label: "Multi-Family (Duplex, Triplex, etc.)" },
  { id: "condo-townhouse", label: "Condo / Townhouse" },
  { id: "mobile-home", label: "Mobile / Manufactured Home" },
  { id: "land", label: "Vacant Land / Lot" },
  { id: "other", label: "Other" },
]

const LEGAL_OWNER_OPTIONS = [
  { id: "yes-owner", label: "Yes, I am the legal homeowner" },
  { id: "yes-family", label: "Yes, I am a family member with the legal right to sell" },
  { id: "no", label: "No, I am not" },
]

const LISTED_OPTIONS = [
  { id: "not-listed", label: "No, it is not listed" },
  { id: "listed-realtor", label: "Yes, listed with a realtor" },
  { id: "listed-fsbo", label: "Yes, listed for sale by owner" },
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

// William's v2 reason list — rendered only when MOTIVATION_V2 is on (new clients).
// The final option ("no-reason") is a hard-disqualifier: selecting it shows the
// block screen and the lead is never submitted (see handleOptionSelect).
const REASON_OPTIONS_V2 = [
  { id: "foreclosure", label: "Facing foreclosure" },
  { id: "behind-payments", label: "Behind on payments" },
  { id: "inherited", label: "Inherited property" },
  { id: "divorce", label: "Divorce or separation" },
  { id: "repairs", label: "Can't afford repairs" },
  { id: "vacant", label: "Vacant property I need to sell" },
  { id: "urgent-financial", label: "Urgent financial situation not listed above" },
  { id: "personal", label: "Personal situation not listed above" },
  { id: "no-reason", label: "No reason / seeing what my house is worth" },
]

const OWNERSHIP_LENGTH_OPTIONS = [
  { id: "less-than-3", label: "Less than 3 years" },
  { id: "3-to-5", label: "3 to 5 years" },
  { id: "5-to-10", label: "5 to 10 years" },
  { id: "10-plus", label: "10+ years" },
]

// ─── Lead scoring (browser-side) ───────────────────────────────────────
// Standard scoring matrix used across all REI Transfer client surveys.
// Applied automatically when this template is cloned for a new client.
const SCORE_TIMELINE: Record<string, number> = {
  'asap': 3, '2-weeks': 2, '30-days': 1, '60-days': 0, 'flexible': 0,
}
const SCORE_REASON: Record<string, number> = {
  'foreclosure': 3, 'behind-payments': 3,
  'inherited': 2, 'repairs': 2,
  'other': 1,
  'relocation': 0, 'divorce': 0, 'downsizing': 0,
  // v2 list IDs (MOTIVATION_V2). 'no-reason' DQs pre-submit so its weight is moot.
  'urgent-financial': 3, 'vacant': 2, 'personal': 1, 'no-reason': 0,
}
const SCORE_CONDITION: Record<string, number> = {
  'poor': 1, 'distressed': 1,
  'fair': 0, 'good': 0, 'excellent': 0,
}
function calculateLeadScore(d: SurveyData): number {
  const t = SCORE_TIMELINE[d.timeline] ?? 0
  const r = SCORE_REASON[d.reason] ?? 0
  const c = SCORE_CONDITION[d.condition] ?? 0
  return Math.min(10, t + r + c)
}
function isQualifiedForMeta(d: SurveyData): boolean {
  const okType = d.propertyType === 'single-family' || d.propertyType === 'multi-family'
  const okListed = d.listedOnMarket === 'not-listed'
  const okOwner = d.isLegalOwner !== 'no'
  const okCondition = d.condition !== 'excellent'
  return okType && okListed && okOwner && okCondition
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

// Valid US area codes
// Disposable email domains
const DISPOSABLE_DOMAINS = new Set(["mailinator.com","guerrillamail.com","tempmail.com","throwaway.email","yopmail.com","sharklasers.com","guerrillamail.info","grr.la","guerrillamail.biz","guerrillamail.de","guerrillamail.net","guerrillamail.org","spam4.me","trashmail.com","trashmail.me","trashmail.net","mytemp.email","mohmal.com","tempail.com","dispostable.com","maildrop.cc","10minutemail.com","temp-mail.org","fakeinbox.com","mailnesia.com","getnada.com","emailondeck.com","33mail.com","harakirimail.com","jetable.org","meltmail.com","mailcatch.com","tempinbox.com","spamgourmet.com","mailexpire.com","incognitomail.org","getairmail.com","mailnull.com","safeemail.xyz","tempmailo.com","burnermail.io"])

// Profanity / spam word list
const BLOCKED_WORDS = new Set(["fuck","shit","ass","damn","bitch","bastard","dick","cock","pussy","cunt","whore","slut","fag","nigger","nigga","retard","penis","vagina","anus","dildo","porn","xxx","viagra","cialis","casino","bitcoin","crypto","forex","mlm","scam","spam","test123","asdf","qwerty","aaaaaa","zzzzzz","abcdef","123456"])

// Format phone as (XXX) XXX-XXXX
function formatPhoneNumber(value: string): string {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("1")) digits = digits.slice(1)
  if (digits.length > 10) digits = digits.slice(0, 10)
  if (digits.length === 0) return ""
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

// Validate US phone number
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

// Validate email
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
  const localPart = e.split("@")[0]
  const domainName = domain.split(".")[0]
  for (const word of BLOCKED_WORDS) {
    if (word.length >= 4 && (localPart.includes(word) || domainName.includes(word))) {
      return { valid: false, msg: "Please enter a valid email address." }
    }
  }
  return { valid: true, msg: "" }
}

// Validate name
function validateName(name: string): { valid: boolean; msg: string } {
  const trimmed = name.trim()
  if (!trimmed) return { valid: false, msg: "Name is required." }
  if (trimmed.length < 2) return { valid: false, msg: "Please enter your full name." }
  const words = trimmed.toLowerCase().split(/\s+/)
  for (const word of words) {
    if (BLOCKED_WORDS.has(word)) return { valid: false, msg: "Please enter your real name." }
  }
  if (/(.)\\1{4,}/.test(trimmed)) return { valid: false, msg: "Please enter your real name." }
  if (/^\d+$/.test(trimmed)) return { valid: false, msg: "Please enter your real name, not a number." }
  return { valid: true, msg: "" }
}


// ─── Two-step flow ─────────────────────────────────────────────────────
// Stage 1 (no progress bar, one question per screen):
//   1 address → 2 legal owner → 3 listed on market → 4 contact details
//   Contact submit fires NO pixel event (LeadEarly removed) and POSTs
//   lead_stage='early' to /api/submit, then moves to Stage 2.
// Stage 2 (progress bar): the remaining qualification questions. The final
//   answer submits lead_stage='complete' with the SAME scoring, Lead vs
//   LeadLowIntent event and /thank-you redirect the one-step form used.
// Hard DQs in Stage 1 (out of area, not owner, listed) stop BEFORE contact
// details, so no early POST and no LeadEarly fire for them.
const STAGE1_STEPS = 4 // 1=address, 2=owner, 3=listed, 4=contact
type Stage2Field = "propertyType" | "timeline" | "condition" | "reason" | "ownershipLength"
// The template's original question order, minus the questions that moved to Stage 1.
const STAGE2_FIELDS: Stage2Field[] = ["propertyType", "timeline", "condition", "reason", "ownershipLength"]

// Cap how long the user waits on the early POST. The request itself is not
// aborted (the page does not navigate, so it keeps running in the background);
// the user just advances to Stage 2. A failed or slow early POST never blocks.
const EARLY_POST_MAX_WAIT_MS = 4000

type FbqFn = (...args: unknown[]) => void

// content_name uses the brand from config so each cloned client gets the right label automatically
function getBrandName(): string {
  return (typeof window !== 'undefined' && (window as unknown as { __NEXT_DATA__?: { runtimeConfig?: { companyName?: string } } }).__NEXT_DATA__?.runtimeConfig?.companyName) || 'REI Survey'
}

interface SurveyCardProps {
  phoneDisplay?: string
  phoneHref?: string
  serviceAreas?: ServiceArea[]
  disqualifiedPropertyTypes?: string[]
  // Comma-parsed ownership-length option IDs to hard-disqualify
  // (DISQUALIFIED_OWNERSHIP_LENGTHS). Empty (default) → no ownership gate.
  disqualifiedOwnershipLengths?: string[]
  // 2-letter US state codes to ALLOW (ALLOWED_STATES). Empty → no state gate.
  allowedStates?: string[]
  allowedCounties?: string[]
  // Additive seed props for the advertorial sticky-bar -> popup flow.
  // When an address is captured in the sticky bar, we open the modal pre-seeded
  // past the address question so the user does not have to re-enter it.
  // Two-step mapping: any initialStep in the legacy 2..8 range means "address
  // already captured" and starts Stage 1 at the legal-owner question. We never
  // skip owner/listed, because those are hard disqualifiers.
  // These props do NOT change the form's submit, webhook, or redirect behavior.
  initialAddress?: string
  initialStep?: number
  // When true (MOTIVATION_V2), render William's v2 reason list incl. the
  // "no-reason" hard-disqualifier. Passed from the server page (config.motivationV2)
  // — this client component must NOT import lib/config.
  motivationV2?: boolean
  // Brand name shown in the TCPA consent text and the pixel content_name.
  // Pages pass config.companyName; falls back to neutral wording.
  companyName?: string
}

export function SurveyCard({ phoneDisplay = "(800) 000-0000", phoneHref = "8000000000", serviceAreas = [], disqualifiedPropertyTypes = ["mobile-home", "land", "other"], disqualifiedOwnershipLengths = [], allowedStates = [], allowedCounties = [], initialAddress, initialStep, motivationV2 = false, companyName }: SurveyCardProps) {
  // ---- Stage state ----
  const [stage, setStage] = useState<1 | 2>(1)
  const [stage1Step, setStage1Step] = useState(initialStep && initialStep >= 2 && initialStep <= 8 ? 2 : 1)
  const [stage2Step, setStage2Step] = useState(1) // 1..STAGE2_FIELDS.length
  const totalStage2Steps = STAGE2_FIELDS.length

  const [surveyData, setSurveyData] = useState<SurveyData>({
    address: initialAddress ?? "",
    propertyType: "",
    isLegalOwner: "",
    listedOnMarket: "",
    timeline: "",
    condition: "",
    reason: "",
    ownershipLength: "",
    firstName: "",
    lastName: "",
    name: "",
    email: "",
    phone: "",
  })
  const [tcpaConsent, setTcpaConsent] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isDisqualified, setIsDisqualified] = useState(false)
  const [disqualifyReason, setDisqualifyReason] = useState("")
  const [addressVerified, setAddressVerified] = useState(false)
  const [addressOutOfArea, setAddressOutOfArea] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const formStartTime = useRef<number>(Date.now())
  const trackingRef = useRef(captureTrackingData())
  const stage1EventIdRef = useRef<string>("")
  const completeSentRef = useRef(false)
  // Set as soon as a hard-DQ answer is clicked, so a quick second click can't
  // advance (or submit) during the 300ms before the block screen appears.
  const dqPendingRef = useRef(false)
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

  // Address Continue: block out-of-area addresses with the disqualify screen
  // (service-area radius + ALLOWED_STATES, both evaluated in AddressAutocomplete).
  const addressRef = useRef<AddressAutocompleteHandle>(null)
  const handleAddressContinue = async () => {
    if (addressOutOfArea) {
      setDisqualifyReason("outOfArea")
      setIsDisqualified(true)
      return
    }
    if (surveyData.address.trim().length > 0 && addressVerified) { setStage1Step(2); return }
    // Typed but not picked from the list: look it up and run the same select /
    // out-of-area path as tapping it. Out of area goes straight to the block
    // screen, as the next Continue press would.
    if ((await addressRef.current?.resolveTyped()) === "outOfArea") {
      setDisqualifyReason("outOfArea")
      setIsDisqualified(true)
    }
  }

  const handleAddressSelect = (address: string, _details: AddressDetails) => {
    setSurveyData({ ...surveyData, address })
    setAddressVerified(true)
    setAddressOutOfArea(false)
    setTimeout(() => { setStage1Step(2) }, 300)
  }

  const handleOwnerSelect = (value: string) => {
    setSurveyData({ ...surveyData, isLegalOwner: value })
    if (value === "no") { disqualify("notOwner"); return }
    setTimeout(() => { if (!dqPendingRef.current) setStage1Step(3) }, 300)
  }

  const handleListedSelect = (value: string) => {
    setSurveyData({ ...surveyData, listedOnMarket: value })
    if (["listed-realtor", "listed-fsbo"].includes(value)) { disqualify("listed"); return }
    setTimeout(() => { if (!dqPendingRef.current) setStage1Step(4) }, 300)
  }

  const handleStage1Back = () => {
    if (stage1Step > 1) setStage1Step(stage1Step - 1)
  }

  // Contact submit: validate → anti-bot → early POST (no pixel event) → Stage 2
  const handleContactSubmit = async () => {
    const errors: {[key: string]: string} = {}

    const firstCheck = validateName(surveyData.firstName)
    if (!firstCheck.valid) errors.firstName = firstCheck.msg
    const lastCheck = validateName(surveyData.lastName)
    if (!lastCheck.valid) errors.lastName = lastCheck.msg

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
        isLegalOwner: surveyData.isLegalOwner,
        listedOnMarket: surveyData.listedOnMarket,
        tcpa_consent: tcpaConsent,
        source: 'Survey Form (Stage 1)',
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

  // Final submit — scoring, qualification, event naming, payload and redirect are
  // unchanged from the one-step form; only lead_stage + stage1_event_id are added.
  const submitComplete = async (finalData: SurveyData) => {
    if (completeSentRef.current || dqPendingRef.current) return

    // Anti-bot (same guards the one-step form ran on its final submit)
    const timeSpent = Date.now() - formStartTime.current
    if (timeSpent < 3000) {
      setIsSubmitted(true)
      return
    }

    if (honeypot) {
      setIsSubmitted(true)
      return
    }

    completeSentRef.current = true
    setIsSubmitting(true)

    try {
      const fullName = `${finalData.firstName.trim()} ${finalData.lastName.trim()}`.trim()
      const score = calculateLeadScore(finalData)
      const quality = leadQuality(score)
      const qualified = isQualifiedForMeta(finalData)
      const dqReason = qualified ? null : disqualifyReasonFor(finalData)
      const eventId = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      const payload = {
        lead_stage: 'complete',
        firstName: finalData.firstName.trim(),
        lastName: finalData.lastName.trim(),
        name: fullName,
        email: finalData.email,
        phone: finalData.phone,
        address: finalData.address,
        propertyType: finalData.propertyType,
        isLegalOwner: finalData.isLegalOwner,
        condition: finalData.condition,
        timeline: finalData.timeline,
        reason: finalData.reason,
        ownershipLength: finalData.ownershipLength,
        source: 'Survey Form',
        submittedAt: new Date().toISOString(),
        qualified,
        lead_score: score,
        lead_quality: quality,
        disqualify_reason: dqReason,
        meta_event_id: eventId,
        meta_event_name: qualified ? 'Lead' : 'LeadLowIntent',
        meta_value: qualified ? score * 25 : 0,
        stage1_event_id: stage1EventIdRef.current,
        gf_sid: readGfSid(),
        ...trackingRef.current,
      }
      // Fire weighted Meta Pixel event (browser-side; CAPI is a separate later phase)
      if (typeof window !== 'undefined' && (window as { fbq?: FbqFn }).fbq) {
        const fbq = (window as { fbq: FbqFn }).fbq
        const brandName = companyName || getBrandName()
        if (qualified) {
          fbq('track', 'Lead', {
            value: score * 25, currency: 'USD',
            content_name: `${brandName} Survey`, content_category: 'real_estate',
            lead_score: score, lead_quality: quality,
          }, { eventID: eventId })
        } else {
          fbq('trackCustom', 'LeadLowIntent', {
            content_name: `${brandName} Survey`, content_category: 'real_estate',
            disqualify_reason: dqReason, lead_score: score,
          }, { eventID: eventId })
        }
      }
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (e) {
      // Continue to thank-you even if webhook fails
    }

    window.location.href = '/thank-you'
  }

  // Stage-2 hard disqualifiers — same outcomes as the one-step form: block
  // screen, and the complete lead is never submitted.
  const stage2DisqualifyReason = (field: Stage2Field, value: string): string | null => {
    if (field === "propertyType" && disqualifiedPropertyTypes.includes(value)) return "propertyType"
    // Ownership-length hard DQ (DISQUALIFIED_OWNERSHIP_LENGTHS). Empty prop (default)
    // → inert: [].includes(value) is always false, so the step advances as today.
    if (field === "ownershipLength" && disqualifiedOwnershipLengths.includes(value)) return "noEquity"
    // v2 motivation list (MOTIVATION_V2): "no reason / seeing what my house is
    // worth" hard-disqualifies — block screen, lead never submitted. The id only
    // exists in REASON_OPTIONS_V2, so this branch is inert for the legacy list.
    if (field === "reason" && value === "no-reason") return "noReason"
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
          isLegalOwner: answers.isLegalOwner,
          listedOnMarket: answers.listedOnMarket,
          propertyType: answers.propertyType,
          timeline: answers.timeline,
          condition: answers.condition,
          reason: answers.reason,
          ownershipLength: answers.ownershipLength,
          qualified: false,
          disqualify_reason: reason,
          source: 'Survey Form (Stage 2 disqualified)',
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
      className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
        selectedValue === option.id
          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-gray-900"
          : "border-gray-200 bg-white text-gray-700 hover:border-[var(--accent)]/50 hover:bg-gray-50"
      }`}
    >
      {option.desc ? (
        <>
          <span className="block">{option.label}</span>
          <span className="mt-0.5 block text-xs font-normal text-gray-500">{option.desc}</span>
        </>
      ) : (
        option.label
      )}
    </button>
  )

  const renderQuestion = (title: string, subtitle: string, options: React.ReactNode, grid = false) => (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
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
      className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-0"
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back
    </Button>
  )

  const spinner = (
    <span className="flex items-center gap-2">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      Submitting...
    </span>
  )

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
        detail: "We primarily purchase single-family homes, multi-family properties, and condos/townhouses. If you have a different property you'd like to sell, feel free to reach out.",
      },
      outOfArea: {
        title: "Outside Our Service Area",
        message: "Unfortunately, we don't currently buy properties in that area.",
        detail: "We only serve select markets at this time. If you believe your property is within our coverage area, please try a different address or give us a call.",
      },
      noReason: {
        title: "Just Browsing?",
        message: "It sounds like you're gathering information right now rather than looking to sell.",
        detail: "When you're ready to sell, come back and we'll get you a fair cash offer. Feel free to call us any time if your situation changes.",
      },
      noEquity: {
        title: "We're Unable to Make an Offer",
        message: "Unfortunately, based on how long you've owned the property, there typically isn't enough equity for us to make a fair cash offer.",
        detail: "If your situation changes or you'd like to discuss your options, feel free to give us a call. We're always happy to help.",
      },
    }
    const msg = disqualifyMessages[disqualifyReason] || disqualifyMessages.notOwner

    return (
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-7 w-7 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{msg.title}</h2>
            <p className="mt-2 text-gray-600">{msg.message}</p>
            <p className="mt-4 text-sm text-gray-500">{msg.detail}</p>
          </div>
          <a
            href={`tel:${phoneHref}`}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-white hover:opacity-90 transition-opacity"
          >
            Call Us: {phoneDisplay}
          </a>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#22c55e]/10">
            <Check className="h-7 w-7 text-[#22c55e]" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Thank You, {surveyData.firstName}!</h2>
            <p className="mt-2 text-gray-600">We've received your information and will be in touch shortly.</p>
            <p className="mt-4 text-sm text-gray-500">One of our team members will call you within 24 hours.</p>
          </div>
        </div>
      </div>
    )
  }

  const inputClass = (field: string) =>
    `h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent)] focus:ring-[var(--accent)]/20 ${validationErrors[field] ? "border-red-500" : ""}`

  // ============================================================
  // STAGE 1 — one question per screen, NO progress bar
  // ============================================================
  if (stage === 1) {
    return (
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-[var(--accent)]" />
            <span className="text-sm text-gray-600">Get your free cash offer</span>
          </div>

          {stage1Step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">What's your property address?</h2>
                <p className="mt-1 text-sm text-gray-500">Start typing and select your address from the dropdown.</p>
              </div>
              <AddressAutocomplete
                ref={addressRef}
                onSubmit={handleAddressContinue}
                value={surveyData.address}
                onChange={(address) => { setSurveyData({ ...surveyData, address }); setAddressVerified(false); setAddressOutOfArea(false) }}
                onSelect={handleAddressSelect}
                onOutOfArea={(addr) => { setSurveyData({ ...surveyData, address: addr }); setAddressVerified(true); setAddressOutOfArea(true) }}
                serviceAreas={serviceAreas}
                allowedStates={allowedStates} allowedCounties={allowedCounties}
                placeholder="Start typing your address..."
              />
            </div>
          )}

          {stage1Step === 2 && renderQuestion(
            "Are you the legal homeowner?",
            "This helps us understand who we'll be working with.",
            LEGAL_OWNER_OPTIONS.map((o) => renderOptionButton(o, surveyData.isLegalOwner, () => handleOwnerSelect(o.id)))
          )}

          {stage1Step === 3 && renderQuestion(
            "Is the property currently listed on the market?",
            "Let us know if the property is currently for sale.",
            LISTED_OPTIONS.map((o) => renderOptionButton(o, surveyData.listedOnMarket, () => handleListedSelect(o.id)))
          )}

          {stage1Step === STAGE1_STEPS && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">How can we reach you?</h2>
                <p className="mt-1 text-sm text-gray-500">We'll use this to send you your cash offer.</p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      placeholder="First name"
                      autoComplete="given-name"
                      value={surveyData.firstName}
                      onChange={(e) => {
                        setSurveyData({ ...surveyData, firstName: e.target.value })
                        setValidationErrors({ ...validationErrors, firstName: "" })
                      }}
                      className={inputClass("firstName")}
                    />
                    {validationErrors.firstName && <p className="mt-1 text-xs text-red-500">{validationErrors.firstName}</p>}
                  </div>
                  <div>
                    <Input
                      placeholder="Last name"
                      autoComplete="family-name"
                      value={surveyData.lastName}
                      onChange={(e) => {
                        setSurveyData({ ...surveyData, lastName: e.target.value })
                        setValidationErrors({ ...validationErrors, lastName: "" })
                      }}
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
                    onChange={(e) => {
                      setSurveyData({ ...surveyData, email: e.target.value })
                      setValidationErrors({ ...validationErrors, email: "" })
                    }}
                    className={inputClass("email")}
                  />
                  {validationErrors.email && <p className="mt-1 text-xs text-red-500">{validationErrors.email}</p>}
                </div>
                <div>
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    autoComplete="tel"
                    value={surveyData.phone}
                    onChange={(e) => {
                      setSurveyData({ ...surveyData, phone: formatPhoneNumber(e.target.value) })
                      setValidationErrors({ ...validationErrors, phone: "" })
                    }}
                    maxLength={14}
                    className={inputClass("phone")}
                  />
                  {validationErrors.phone && <p className="mt-1 text-xs text-red-500">{validationErrors.phone}</p>}
                </div>

                {/* TCPA consent */}
                <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                  validationErrors.tcpaConsent ? "border-red-500" : "border-gray-200 hover:border-gray-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={tcpaConsent}
                    onChange={(e) => {
                      setTcpaConsent(e.target.checked)
                      if (e.target.checked) setValidationErrors({ ...validationErrors, tcpaConsent: "" })
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[var(--accent)]"
                  />
                  <span className="text-xs text-gray-500 leading-snug">
                    By checking this box, I consent to receive calls and text messages (including autodialed) from {companyName || "the company operating this website"} at the phone number provided. Consent is not a condition of any service. Standard message and data rates may apply. Reply STOP to opt out.
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

          {/* Navigation — Continue only on the address screen (out-of-area block
              fires on Continue, as before) and the contact screen. Option
              screens auto-advance. */}
          <div className="flex items-center justify-between">
            {backButton(handleStage1Back, stage1Step === 1 || isSubmitting)}
            {stage1Step === 1 && (
              <Button
                onClick={handleAddressContinue}
                disabled={!surveyData.address.trim()}
                className="bg-[var(--accent)] text-white hover:bg-[var(--accent)] disabled:opacity-50"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {stage1Step === STAGE1_STEPS && (
              <Button
                onClick={handleContactSubmit}
                disabled={isSubmitting || !(
                  surveyData.firstName.trim().length > 0 &&
                  surveyData.lastName.trim().length > 0 &&
                  surveyData.email.trim().length > 0 &&
                  surveyData.phone.trim().length > 0
                )}
                className="bg-[var(--accent)] text-white hover:bg-[var(--accent)] disabled:opacity-50"
              >
                {isSubmitting ? spinner : (
                  <>
                    Get My Cash Offer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // STAGE 2 — remaining questions, progress bar SHOWN
  // ============================================================
  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
      <div className="flex flex-col gap-5">
        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-[var(--accent)]" />
            <span className="text-sm text-gray-600">Step {stage2Step} of {totalStage2Steps}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalStage2Steps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i < stage2Step ? "bg-[var(--accent)]" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {STAGE2_FIELDS[stage2Step - 1] === "propertyType" && renderQuestion(
          "What type of property is it?",
          "Select the option that best describes your property.",
          PROPERTY_TYPE_OPTIONS.map((o) => renderOptionButton(o, surveyData.propertyType, () => handleStage2OptionSelect("propertyType", o.id)))
        )}

        {STAGE2_FIELDS[stage2Step - 1] === "timeline" && renderQuestion(
          "How fast are you looking to sell?",
          "Select your ideal timeline for closing.",
          TIMELINE_OPTIONS.map((o) => renderOptionButton(o, surveyData.timeline, () => handleStage2OptionSelect("timeline", o.id)))
        )}

        {STAGE2_FIELDS[stage2Step - 1] === "condition" && renderQuestion(
          "What condition is the property in?",
          "Be honest - we buy houses in any condition.",
          CONDITION_OPTIONS.map((o) => renderOptionButton(o, surveyData.condition, () => handleStage2OptionSelect("condition", o.id)))
        )}

        {STAGE2_FIELDS[stage2Step - 1] === "reason" && renderQuestion(
          "What's your reason for selling?",
          "This helps us understand your situation better.",
          (motivationV2 ? REASON_OPTIONS_V2 : REASON_OPTIONS).map((o) => renderOptionButton(o, surveyData.reason, () => handleStage2OptionSelect("reason", o.id))),
          true
        )}

        {STAGE2_FIELDS[stage2Step - 1] === "ownershipLength" && renderQuestion(
          "How long have you owned the home?",
          "This helps us tailor your offer.",
          OWNERSHIP_LENGTH_OPTIONS.map((o) => renderOptionButton(o, surveyData.ownershipLength, () => handleStage2OptionSelect("ownershipLength", o.id)))
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {backButton(handleStage2Back, stage2Step === 1 || isSubmitting)}
          {isSubmitting && (
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[var(--accent)]" />
              Submitting...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
