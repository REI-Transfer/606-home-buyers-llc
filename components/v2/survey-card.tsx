"use client"

import { useState, useRef, useEffect } from "react"
import { Home, ArrowRight, ArrowLeft, ArrowDown, Check, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { captureTrackingData, getIPAddress } from "@/lib/tracking"
import { Input } from "@/components/ui/input"
import { AddressAutocomplete, type AddressDetails } from "@/components/survey/address-autocomplete"
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

interface SurveyCardProps {
  allowedCounties?: string[];
  initialAddress?: string
  brand: Brand
}

export function SurveyCard({ initialAddress, brand, allowedCounties = [] }: SurveyCardProps) {
  const [step, setStep] = useState(initialAddress ? 2 : 1)
  const [surveyData, setSurveyData] = useState<SurveyData>({
    address: initialAddress || "",
    city: "",
    state: "",
    zip: "",
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
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isDisqualified, setIsDisqualified] = useState(false)
  const [disqualifyReason, setDisqualifyReason] = useState("")
  const [addressVerified, setAddressVerified] = useState(!!initialAddress)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const formStartTime = useRef<number>(Date.now())
  const trackingRef = useRef(captureTrackingData())
  const excellentPass = process.env.NEXT_PUBLIC_EXCELLENT_CONDITION_PASS === 'true'
  useEffect(() => {
    getIPAddress().then((ip) => { trackingRef.current.ip = ip })
  }, [])
  const [honeypot, setHoneypot] = useState("")

  const totalSteps = 9

  const handleNext = async () => {
    if (step === 9) {
      const errors: {[key: string]: string} = {}
      const firstNameCheck = validateName(surveyData.firstName)
      if (!firstNameCheck.valid) errors.firstName = firstNameCheck.msg
      const lastNameCheck = validateName(surveyData.lastName)
      if (!lastNameCheck.valid) errors.lastName = lastNameCheck.msg
      const emailCheck = validateEmail(surveyData.email)
      if (!emailCheck.valid) errors.email = emailCheck.msg
      const phoneCheck = validatePhone(surveyData.phone)
      if (!phoneCheck.valid) errors.phone = phoneCheck.msg

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        return
      }

      const timeSpent = Date.now() - formStartTime.current
      if (timeSpent < 3000) { setIsSubmitted(true); return }
      if (honeypot) { setIsSubmitted(true); return }

      setIsSubmitting(true)

      try {
        const score = calculateLeadScore(surveyData)
        const quality = leadQuality(score)
        // Excellent / move-in-ready condition is NOT a Meta-qualifying lead:
        // capture it for the client, but never fire the real "Lead" pixel event.
        const isExcellentCondition = surveyData.condition === 'excellent'
        const qualified = isQualifiedForMeta(surveyData) && (excellentPass || !isExcellentCondition)
        const dqReason = qualified ? null : disqualifyReasonFor(surveyData)
        const eventId = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
        const payload = {
          ...surveyData,
          ...trackingRef.current,
          source: process.env.NEXT_PUBLIC_LEAD_SOURCE || `${brand.companyName} - Survey`,
          submittedAt: new Date().toISOString(),
          qualified,
          lead_score: score,
          lead_quality: quality,
          disqualify_reason: dqReason,
          meta_event_id: eventId,
          meta_event_name: qualified ? 'Lead' : 'LeadLowIntent',
          meta_value: qualified ? score * 25 : 0,
        }
        // Fire weighted Meta Pixel event (browser-side; CAPI is a separate later phase)
        if (typeof window !== 'undefined' && (window as { fbq?: (...args: unknown[]) => void }).fbq) {
          const fbq = (window as { fbq: (...args: unknown[]) => void }).fbq
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
          firstName: surveyData.firstName,
          lastName: surveyData.lastName,
          email: surveyData.email,
          phone: surveyData.phone,
          address: surveyData.address,
          city: surveyData.city,
          state: surveyData.state,
          zip: surveyData.zip,
        }))
        // Bridge the property condition to the thank-you page so its Lead
        // pixel fire can suppress excellent / move-in-ready leads.
        sessionStorage.setItem('lead_condition', surveyData.condition)
      } catch {}

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
      case 4: return surveyData.ownershipLength !== ""
      case 5: return surveyData.listedOnMarket !== ""
      case 6: return surveyData.timeline !== ""
      case 7: return surveyData.condition !== ""
      case 8: return surveyData.reason !== ""
      case 9: return surveyData.firstName.trim().length > 0 && surveyData.lastName.trim().length > 0 && surveyData.email.trim().length > 0 && surveyData.phone.trim().length > 0
      default: return false
    }
  }

  const handleOptionSelect = (field: keyof SurveyData, value: string) => {
    setSurveyData({ ...surveyData, [field]: value })

    // Disqualify: property type (condo, mobile home, land, other — townhouse still qualifies)
    if (field === "propertyType" && ["condo", "mobile-home", "land", "other"].includes(value)) {
      setTimeout(() => { setDisqualifyReason("propertyType"); setIsDisqualified(true) }, 300)
      return
    }
    // Default hard-DQ: move-in ready / excellent condition (not a distressed/motivated seller)
    if (field === "condition" && value === "excellent" && !excellentPass) {
      setTimeout(() => { setDisqualifyReason("excellentCondition"); setIsDisqualified(true) }, 300)
      return
    }
    // Listing hard-DQ (Elevate v2.51): only "No, never" (not-listed) passes; active,
    // expired/cancelled, and "not sure" all block.
    if (field === "listedOnMarket" && ["listed-active", "not-sure", "listed-expired"].includes(value)) {
      setTimeout(() => { setDisqualifyReason("listed"); setIsDisqualified(true) }, 300)
      return
    }
    if (field === "isLegalOwner" && value === "no") {
      setTimeout(() => { setDisqualifyReason("notOwner"); setIsDisqualified(true) }, 300)
      return
    }
    // Default hard-DQ: short ownership (under ~5 years — real option ids: "1-3-years" = <3yr, "3-5-years" = 3-5yr)
    if (field === "ownershipLength" && ["1-3-years", "3-5-years"].includes(value)) {
      setTimeout(() => { setDisqualifyReason("shortOwnership"); setIsDisqualified(true) }, 300)
      return
    }

    setTimeout(() => { if (step < totalSteps) setStep(step + 1) }, 300)
  }

  const countyOk = (details: AddressDetails) => {
    if (!allowedCounties || allowedCounties.length === 0) return true;
    const n = (c?: string) => (c || "").replace(/\s+county$/i, "").trim().toLowerCase();
    return !!(details.state && details.state.toUpperCase() === "TX" && details.county && allowedCounties.map(n).includes(n(details.county)));
  };

  const handleAddressSelect = (address: string, details: AddressDetails) => {
    const state = details.state?.toUpperCase() || ""
    const city = details.city || ""
    const zip = details.zip || ""
    setSurveyData({ ...surveyData, address, city, state, zip })

    // Env-driven service-area gate. Permissive when NEXT_PUBLIC_SERVICE_AREAS is
    // empty (accepts any address). addressVerified only flips true after passing.
    if (countyOk(details) && isWithinServiceArea(details.lat, details.lng)) {
      setAddressVerified(true)
      setTimeout(() => { setStep(2) }, 300)
      return
    }

    setAddressVerified(false)
    setTimeout(() => { setDisqualifyReason("outsideArea"); setIsDisqualified(true) }, 300)
  }

  const renderOptionButton = (
    option: { id: string; label: string; desc?: string },
    selectedValue: string,
    field: keyof SurveyData
  ) => (
    <button
      key={option.id}
      onClick={() => handleOptionSelect(field, option.id)}
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

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-4 md:p-6 shadow-lg">
      <div className="flex flex-col gap-3 md:gap-5">
        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-[#1B2A4A]" />
            <span className="text-base text-[#5A6B7D]">Step {step} of {totalSteps}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i < step ? "bg-[#1B2A4A]" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Address */}
        {step === 1 && (
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
              onChange={(address) => { setSurveyData({ ...surveyData, address }); setAddressVerified(false) }}
              onSelect={handleAddressSelect}
              placeholder="Start typing your address..."
            />
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="w-full h-14 bg-[#1B2A4A] text-white text-lg font-semibold rounded-xl hover:bg-[#131E36] disabled:opacity-40 transition-all shadow-md hover:shadow-lg"
            >
              Get My Cash Offer
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Step 2: Property Type */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">What type of property is it?</h2>
              <p className="mt-1 text-base text-[#5A6B7D]">Select the option that best describes your property.</p>
            </div>
            <div className="flex flex-col gap-2">
              {PROPERTY_TYPE_OPTIONS.map((option) => renderOptionButton(option, surveyData.propertyType, "propertyType"))}
            </div>
          </div>
        )}

        {/* Step 3: Legal Owner */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">Are you the legal homeowner?</h2>
              <p className="mt-1 text-base text-[#5A6B7D]">This helps us understand who we&apos;ll be working with.</p>
            </div>
            <div className="flex flex-col gap-2">
              {LEGAL_OWNER_OPTIONS.map((option) => renderOptionButton(option, surveyData.isLegalOwner, "isLegalOwner"))}
            </div>
          </div>
        )}

        {/* Step 4: Ownership Length */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">When did you purchase the home?</h2>
              <p className="mt-1 text-base text-[#5A6B7D]">This helps us estimate your equity position.</p>
            </div>
            <div className="flex flex-col gap-2">
              {OWNERSHIP_LENGTH_OPTIONS.map((option) => renderOptionButton(option, surveyData.ownershipLength, "ownershipLength"))}
            </div>
          </div>
        )}

        {/* Step 5: Listed on Market */}
        {step === 5 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">Is the property currently listed?</h2>
              <p className="mt-1 text-base text-[#5A6B7D]">Let us know if the property is currently for sale.</p>
            </div>
            <div className="flex flex-col gap-2">
              {LISTED_OPTIONS.map((option) => renderOptionButton(option, surveyData.listedOnMarket, "listedOnMarket"))}
            </div>
          </div>
        )}

        {/* Step 6: Timeline */}
        {step === 6 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">How fast are you looking to sell?</h2>
              <p className="mt-1 text-base text-[#5A6B7D]">Select your ideal timeline for closing.</p>
            </div>
            <div className="flex flex-col gap-2">
              {TIMELINE_OPTIONS.map((option) => renderOptionButton(option, surveyData.timeline, "timeline"))}
            </div>
          </div>
        )}

        {/* Step 7: Condition */}
        {step === 7 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">What condition is the property in?</h2>
              <p className="mt-1 text-base text-[#5A6B7D]">Be honest. We buy houses in any condition.</p>
            </div>
            <div className="flex flex-col gap-2">
              {CONDITION_OPTIONS.map((option) => renderOptionButton(option, surveyData.condition, "condition"))}
            </div>
          </div>
        )}

        {/* Step 8: Reason */}
        {step === 8 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">What&apos;s your reason for selling?</h2>
              <p className="mt-1 text-base text-[#5A6B7D]">This helps us understand your situation better.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {REASON_OPTIONS.map((option) => renderOptionButton(option, surveyData.reason, "reason"))}
            </div>
          </div>
        )}

        {/* Step 9: Contact Information */}
        {step === 9 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">Almost done. How can we reach you?</h2>
              <p className="mt-1 text-base text-[#5A6B7D]">We&apos;ll use this to send you your cash offer within 24 hours.</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    placeholder="First name"
                    value={surveyData.firstName}
                    onChange={(e) => { setSurveyData({ ...surveyData, firstName: e.target.value }); setValidationErrors({ ...validationErrors, firstName: "" }) }}
                    className={`h-14 text-lg rounded-xl border-[#E2E8F0] bg-white text-[#0F1D2F] placeholder:text-[#94A3B8] focus:border-[#1B2A4A] focus:ring-[#1B2A4A]/20 ${validationErrors.firstName ? "border-red-500" : ""}`}
                  />
                  {validationErrors.firstName && <p className="mt-1 text-xs text-red-500">{validationErrors.firstName}</p>}
                </div>
                <div>
                  <Input
                    placeholder="Last name"
                    value={surveyData.lastName}
                    onChange={(e) => { setSurveyData({ ...surveyData, lastName: e.target.value }); setValidationErrors({ ...validationErrors, lastName: "" }) }}
                    className={`h-14 text-lg rounded-xl border-[#E2E8F0] bg-white text-[#0F1D2F] placeholder:text-[#94A3B8] focus:border-[#1B2A4A] focus:ring-[#1B2A4A]/20 ${validationErrors.lastName ? "border-red-500" : ""}`}
                  />
                  {validationErrors.lastName && <p className="mt-1 text-xs text-red-500">{validationErrors.lastName}</p>}
                </div>
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={surveyData.email}
                  onChange={(e) => { setSurveyData({ ...surveyData, email: e.target.value }); setValidationErrors({ ...validationErrors, email: "" }) }}
                  className={`h-14 text-lg rounded-xl border-[#E2E8F0] bg-white text-[#0F1D2F] placeholder:text-[#94A3B8] focus:border-[#1B2A4A] focus:ring-[#1B2A4A]/20 ${validationErrors.email ? "border-red-500" : ""}`}
                />
                {validationErrors.email && <p className="mt-1 text-xs text-red-500">{validationErrors.email}</p>}
              </div>
              <div>
                <Input
                  type="tel"
                  placeholder="(888) 555-0000"
                  value={surveyData.phone}
                  onChange={(e) => { setSurveyData({ ...surveyData, phone: formatPhoneNumber(e.target.value) }); setValidationErrors({ ...validationErrors, phone: "" }) }}
                  maxLength={14}
                  className={`h-14 text-lg rounded-xl border-[#E2E8F0] bg-white text-[#0F1D2F] placeholder:text-[#94A3B8] focus:border-[#1B2A4A] focus:ring-[#1B2A4A]/20 ${validationErrors.phone ? "border-red-500" : ""}`}
                />
                {validationErrors.phone && <p className="mt-1 text-xs text-red-500">{validationErrors.phone}</p>}
              </div>
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

        {/* Navigation buttons */}
        {step !== 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
            className="text-[#5A6B7D] hover:text-[#0F1D2F] hover:bg-[#F5F7FA] text-base disabled:opacity-0"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isSubmitting}
            className="bg-[#1B2A4A] text-white text-lg px-8 py-3 hover:bg-[#131E36] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Submitting...
              </span>
            ) : (
              <>
                {step === totalSteps ? "Get My Cash Offer" : "Continue"}
                {step !== totalSteps && <ArrowRight className="ml-2 h-5 w-5" />}
              </>
            )}
          </Button>
        </div>
        )}
      </div>
    </div>
  )
}
