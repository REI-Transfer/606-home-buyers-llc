"use client"

import { useState, useRef, useEffect } from "react"
import { Home, ArrowRight, ArrowLeft, Check, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { captureTrackingData, getIPAddress, readGfSid } from "@/lib/tracking"
import { Input } from "@/components/ui/input"
import { AddressAutocomplete, type AddressDetails, type ServiceArea } from "./address-autocomplete"

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
  { id: "excellent", label: "Excellent - Move-in ready" },
  { id: "good", label: "Good - Minor repairs needed" },
  { id: "fair", label: "Fair - Needs some work" },
  { id: "poor", label: "Poor - Major repairs needed" },
  { id: "distressed", label: "Distressed - Significant issues" },
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
  // at step 2 so the user does not have to re-enter the address they already gave.
  // These props do NOT change the form's submit, webhook, or redirect behavior.
  initialAddress?: string
  initialStep?: number
  // When true (MOTIVATION_V2), render William's v2 reason list incl. the
  // "no-reason" hard-disqualifier. Passed from the server page (config.motivationV2)
  // — this client component must NOT import lib/config.
  motivationV2?: boolean
}

export function SurveyCard({ phoneDisplay = "(800) 000-0000", phoneHref = "8000000000", serviceAreas = [], disqualifiedPropertyTypes = ["mobile-home", "land", "other"], disqualifiedOwnershipLengths = [], allowedStates = [], allowedCounties = [], initialAddress, initialStep, motivationV2 = false }: SurveyCardProps) {
  const [step, setStep] = useState(initialStep && initialStep >= 2 && initialStep <= 8 ? initialStep : 1)
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
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isDisqualified, setIsDisqualified] = useState(false)
  const [disqualifyReason, setDisqualifyReason] = useState("")
  const [addressVerified, setAddressVerified] = useState(false)
  const [addressOutOfArea, setAddressOutOfArea] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const formStartTime = useRef<number>(Date.now())
  const trackingRef = useRef(captureTrackingData())
  useEffect(() => {
    getIPAddress().then((ip) => { trackingRef.current.ip = ip })
  }, [])
  const [honeypot, setHoneypot] = useState("")

  const totalSteps = 9

  const handleNext = async () => {
    // Block out-of-area addresses on Continue with a disqualify screen
    if (step === 1 && addressOutOfArea) {
      setDisqualifyReason("outOfArea")
      setIsDisqualified(true)
      return
    }
    if (step === totalSteps) {
      const errors: {[key: string]: string} = {}

      const firstCheck = validateName(surveyData.firstName)
      if (!firstCheck.valid) errors.firstName = firstCheck.msg
      const lastCheck = validateName(surveyData.lastName)
      if (!lastCheck.valid) errors.lastName = lastCheck.msg

      const emailCheck = validateEmail(surveyData.email)
      if (!emailCheck.valid) errors.email = emailCheck.msg

      const phoneCheck = validatePhone(surveyData.phone)
      if (!phoneCheck.valid) errors.phone = phoneCheck.msg

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        return
      }

      const timeSpent = Date.now() - formStartTime.current
      if (timeSpent < 3000) {
        setIsSubmitted(true)
        return
      }

      if (honeypot) {
        setIsSubmitted(true)
        return
      }

      setIsSubmitting(true)

      try {
        const fullName = `${surveyData.firstName.trim()} ${surveyData.lastName.trim()}`.trim()
        const score = calculateLeadScore(surveyData)
        const quality = leadQuality(score)
        const qualified = isQualifiedForMeta(surveyData)
        const dqReason = qualified ? null : disqualifyReasonFor(surveyData)
        const eventId = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
        const payload = {
          firstName: surveyData.firstName.trim(),
          lastName: surveyData.lastName.trim(),
          name: fullName,
          email: surveyData.email,
          phone: surveyData.phone,
          address: surveyData.address,
          propertyType: surveyData.propertyType,
          isLegalOwner: surveyData.isLegalOwner,
          condition: surveyData.condition,
          timeline: surveyData.timeline,
          reason: surveyData.reason,
          ownershipLength: surveyData.ownershipLength,
          source: 'Survey Form',
          submittedAt: new Date().toISOString(),
          qualified,
          lead_score: score,
          lead_quality: quality,
          disqualify_reason: dqReason,
          meta_event_id: eventId,
          meta_event_name: qualified ? 'Lead' : 'LeadLowIntent',
          meta_value: qualified ? score * 25 : 0,
          gf_sid: readGfSid(),
          ...trackingRef.current,
        }
        // Fire weighted Meta Pixel event (browser-side; CAPI is a separate later phase)
        if (typeof window !== 'undefined' && (window as { fbq?: (...args: unknown[]) => void }).fbq) {
          const fbq = (window as { fbq: (...args: unknown[]) => void }).fbq
          // content_name uses the brand from config so each cloned client gets the right label automatically
          const brandName = (typeof window !== 'undefined' && (window as unknown as { __NEXT_DATA__?: { runtimeConfig?: { companyName?: string } } }).__NEXT_DATA__?.runtimeConfig?.companyName) || 'REI Survey'
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
    } else if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const canProceed = () => {
    switch (step) {
      case 1: return surveyData.address.trim().length > 0 && addressVerified
      case 2: return surveyData.propertyType !== ""
      case 3: return surveyData.isLegalOwner !== ""
      case 4: return surveyData.listedOnMarket !== ""
      case 5: return surveyData.timeline !== ""
      case 6: return surveyData.condition !== ""
      case 7: return surveyData.reason !== ""
      case 8: return surveyData.ownershipLength !== ""
      case 9: return (
        surveyData.firstName.trim().length > 0 &&
        surveyData.lastName.trim().length > 0 &&
        surveyData.email.trim().length > 0 &&
        surveyData.phone.trim().length > 0
      )
      default: return false
    }
  }

  const handleOptionSelect = (field: keyof SurveyData, value: string) => {
    setSurveyData({ ...surveyData, [field]: value })

    if (field === "propertyType" && disqualifiedPropertyTypes.includes(value)) {
      setTimeout(() => { setDisqualifyReason("propertyType"); setIsDisqualified(true) }, 300)
      return
    }
    if (field === "listedOnMarket" && ["listed-realtor", "listed-fsbo"].includes(value)) {
      setTimeout(() => { setDisqualifyReason("listed"); setIsDisqualified(true) }, 300)
      return
    }
    if (field === "isLegalOwner" && value === "no") {
      setTimeout(() => { setDisqualifyReason("notOwner"); setIsDisqualified(true) }, 300)
      return
    }
    // Ownership-length hard DQ (DISQUALIFIED_OWNERSHIP_LENGTHS). Empty prop (default)
    // → inert: [].includes(value) is always false, so the step advances as today.
    if (field === "ownershipLength" && disqualifiedOwnershipLengths.includes(value)) {
      setTimeout(() => { setDisqualifyReason("noEquity"); setIsDisqualified(true) }, 300)
      return
    }
    // v2 motivation list (MOTIVATION_V2): "no reason / seeing what my house is
    // worth" hard-disqualifies — block screen, lead never submitted. The id only
    // exists in REASON_OPTIONS_V2, so this branch is inert for the legacy list.
    if (field === "reason" && value === "no-reason") {
      setTimeout(() => { setDisqualifyReason("noReason"); setIsDisqualified(true) }, 300)
      return
    }

    setTimeout(() => { if (step < totalSteps) setStep(step + 1) }, 300)
  }

  const handleAddressSelect = (address: string, _details: AddressDetails) => {
    setSurveyData({ ...surveyData, address })
    setAddressVerified(true)
    setAddressOutOfArea(false)
    setTimeout(() => { setStep(2) }, 300)
  }

  const renderOptionButton = (
    option: { id: string; label: string },
    selectedValue: string,
    field: keyof SurveyData
  ) => (
    <button
      key={option.id}
      onClick={() => handleOptionSelect(field, option.id)}
      className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
        selectedValue === option.id
          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-gray-900"
          : "border-gray-200 bg-white text-gray-700 hover:border-[var(--accent)]/50 hover:bg-gray-50"
      }`}
    >
      {option.label}
    </button>
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

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
      <div className="flex flex-col gap-5">
        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-[var(--accent)]" />
            <span className="text-sm text-gray-600">Step {step} of {totalSteps}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i < step ? "bg-[var(--accent)]" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">What's your property address?</h2>
              <p className="mt-1 text-sm text-gray-500">Start typing and select your address from the dropdown.</p>
            </div>
            <AddressAutocomplete
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

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">What type of property is it?</h2>
              <p className="mt-1 text-sm text-gray-500">Select the option that best describes your property.</p>
            </div>
            <div className="flex flex-col gap-2">
              {PROPERTY_TYPE_OPTIONS.map((option) => renderOptionButton(option, surveyData.propertyType, "propertyType"))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Are you the legal homeowner?</h2>
              <p className="mt-1 text-sm text-gray-500">This helps us understand who we'll be working with.</p>
            </div>
            <div className="flex flex-col gap-2">
              {LEGAL_OWNER_OPTIONS.map((option) => renderOptionButton(option, surveyData.isLegalOwner, "isLegalOwner"))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Is the property currently listed on the market?</h2>
              <p className="mt-1 text-sm text-gray-500">Let us know if the property is currently for sale.</p>
            </div>
            <div className="flex flex-col gap-2">
              {LISTED_OPTIONS.map((option) => renderOptionButton(option, surveyData.listedOnMarket, "listedOnMarket"))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">How fast are you looking to sell?</h2>
              <p className="mt-1 text-sm text-gray-500">Select your ideal timeline for closing.</p>
            </div>
            <div className="flex flex-col gap-2">
              {TIMELINE_OPTIONS.map((option) => renderOptionButton(option, surveyData.timeline, "timeline"))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">What condition is the property in?</h2>
              <p className="mt-1 text-sm text-gray-500">Be honest - we buy houses in any condition.</p>
            </div>
            <div className="flex flex-col gap-2">
              {CONDITION_OPTIONS.map((option) => renderOptionButton(option, surveyData.condition, "condition"))}
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">What's your reason for selling?</h2>
              <p className="mt-1 text-sm text-gray-500">This helps us understand your situation better.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(motivationV2 ? REASON_OPTIONS_V2 : REASON_OPTIONS).map((option) => renderOptionButton(option, surveyData.reason, "reason"))}
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">How long have you owned the home?</h2>
              <p className="mt-1 text-sm text-gray-500">This helps us tailor your offer.</p>
            </div>
            <div className="flex flex-col gap-2">
              {OWNERSHIP_LENGTH_OPTIONS.map((option) => renderOptionButton(option, surveyData.ownershipLength, "ownershipLength"))}
            </div>
          </div>
        )}

        {step === 9 && (
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
                    value={surveyData.firstName}
                    onChange={(e) => {
                      setSurveyData({ ...surveyData, firstName: e.target.value })
                      setValidationErrors({ ...validationErrors, firstName: "" })
                    }}
                    className={`h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent)] focus:ring-[var(--accent)]/20 ${validationErrors.firstName ? "border-red-500" : ""}`}
                  />
                  {validationErrors.firstName && <p className="mt-1 text-xs text-red-500">{validationErrors.firstName}</p>}
                </div>
                <div>
                  <Input
                    placeholder="Last name"
                    value={surveyData.lastName}
                    onChange={(e) => {
                      setSurveyData({ ...surveyData, lastName: e.target.value })
                      setValidationErrors({ ...validationErrors, lastName: "" })
                    }}
                    className={`h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent)] focus:ring-[var(--accent)]/20 ${validationErrors.lastName ? "border-red-500" : ""}`}
                  />
                  {validationErrors.lastName && <p className="mt-1 text-xs text-red-500">{validationErrors.lastName}</p>}
                </div>
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={surveyData.email}
                  onChange={(e) => {
                    setSurveyData({ ...surveyData, email: e.target.value })
                    setValidationErrors({ ...validationErrors, email: "" })
                  }}
                  className={`h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent)] focus:ring-[var(--accent)]/20 ${validationErrors.email ? "border-red-500" : ""}`}
                />
                {validationErrors.email && <p className="mt-1 text-xs text-red-500">{validationErrors.email}</p>}
              </div>
              <div>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={surveyData.phone}
                  onChange={(e) => {
                    setSurveyData({ ...surveyData, phone: formatPhoneNumber(e.target.value) })
                    setValidationErrors({ ...validationErrors, phone: "" })
                  }}
                  maxLength={14}
                  className={`h-12 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent)] focus:ring-[var(--accent)]/20 ${validationErrors.phone ? "border-red-500" : ""}`}
                />
                {validationErrors.phone && <p className="mt-1 text-xs text-red-500">{validationErrors.phone}</p>}
              </div>
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

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
            className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="bg-[var(--accent)] text-white hover:bg-[var(--accent)] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Submitting...
              </span>
            ) : (
              <>
                {step === totalSteps ? "Get My Cash Offer" : "Continue"}
                {step !== totalSteps && <ArrowRight className="ml-2 h-4 w-4" />}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
