"use client"

// Shared by the one-step form (survey-card.tsx) and the two-step form
// (survey-card-two-step.tsx): answer options, lead scoring, validation and the
// two end screens. Moved here verbatim from survey-card.tsx so both forms score,
// qualify and validate from ONE copy of the rules.
import { Check, XCircle, MessageSquare, Phone } from "lucide-react"
import { marketPhrase, type Brand } from "@/lib/brand"

export interface SurveyData {
  address: string
  city: string
  state: string
  zip: string
  propertyType: string
  landOwned?: string // two-step form only
  priority?: string // two-step form only
  reasonDetails?: string // two-step form only: optional "anything else?" text
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

export const PROPERTY_TYPE_OPTIONS = [
  { id: "single-family", label: "Single Family Home" },
  { id: "multi-family", label: "Multi-Family (Duplex, Triplex, etc.)" },
  { id: "condo", label: "Condo" },
  { id: "townhouse", label: "Townhouse" },
  { id: "mobile-home", label: "Mobile / Manufactured Home" },
  { id: "land", label: "Vacant Land / Lot" },
  { id: "other", label: "Other" },
]

// Asked only after "Mobile / Manufactured Home" (William 2026-11-16): a mobile home on land
// the seller owns is a buyable deal; one in a park or on a rented lot is not.
export const LAND_OWNED_OPTIONS = [
  { id: "yes", label: "Yes, I own the land" },
  { id: "no", label: "No, I rent the lot or pay lot rent" },
  { id: "not-sure", label: "Not sure" },
]

export const LEGAL_OWNER_OPTIONS = [
  { id: "yes-owner", label: "Yes, I am the legal homeowner" },
  { id: "yes-family", label: "Yes, I am a family member with the legal right to sell" },
  { id: "no", label: "No, I am not" },
]

export const OWNERSHIP_LENGTH_OPTIONS = [
  { id: "1-3-years", label: "Within the last 3 years" },
  { id: "3-5-years", label: "3 to 5 years ago" },
  { id: "5-10-years", label: "5 to 10 years ago" },
  { id: "10-plus-years", label: "More than 10 years ago" },
  { id: "inherited", label: "I recently inherited it" },
]

export const LISTED_OPTIONS = [
  { id: "not-listed", label: "No, never" },
  { id: "listed-active", label: "Yes, active now" },
  { id: "listed-expired", label: "Yes, but expired or cancelled" },
  { id: "not-sure", label: "Not sure" },
]

export const TIMELINE_OPTIONS = [
  { id: "asap", label: "ASAP (Within 7 days)" },
  { id: "2-weeks", label: "Within 2 weeks" },
  { id: "30-days", label: "Within 30 days" },
  { id: "60-days", label: "Within 60 days" },
  { id: "flexible", label: "I'm flexible" },
]

export const CONDITION_OPTIONS = [
  { id: "excellent", label: "Excellent - Move-in ready", desc: "Recently updated. Could list tomorrow with nothing to fix." },
  { id: "good", label: "Good - Minor repairs needed", desc: "Well kept, but dated kitchen, baths, or floors. Nothing broken." },
  { id: "fair", label: "Fair - Needs some work", desc: "Dated throughout, plus wear and repairs I've been putting off." },
  { id: "poor", label: "Poor - Major repairs needed", desc: "Major systems need work. Roof, HVAC, plumbing, electrical, or foundation." },
  { id: "distressed", label: "Distressed - Significant issues", desc: "Not livable as-is. Significant damage, or it's been sitting vacant." },
]

// Equity-checked two-step form: condition as 4 photo cards, asked before contact.
// Stored values stay excellent/good/fair/poor so CRMs and scoring keep working.
export const CONDITION_PHOTO_OPTIONS = [
  { id: "excellent", label: "Excellent", desc: "Remodeled, like new. Ready to move in.", img: "/images/condition/level-1.jpg", alt: "Remodeled white kitchen" },
  { id: "good", label: "Good", desc: "Clean but dated. Everything works, but the look is 10 to 20 years old.", img: "/images/condition/level-2.jpg", alt: "Clean kitchen with older wood cabinets" },
  { id: "fair", label: "Fair", desc: "Original and tired. Needs updating throughout.", img: "/images/condition/level-3.jpg", alt: "Worn original kitchen with old wallpaper" },
  { id: "poor", label: "Poor", desc: "Needs major repairs. Roof, foundation, water damage, or rooms torn out.", img: "/images/condition/level-4.jpg", alt: "Kitchen with a collapsed ceiling and debris" },
]

// "What matters most to you?" Tag only: nobody is screened out on this answer.
export const PRIORITY_OPTIONS = [
  { id: "fast-as-is", label: "A fast, simple sale. As-is, no repairs, no fees." },
  { id: "highest-price", label: "Getting the highest price, even if it takes longer and needs repairs." },
  { id: "not-sure", label: "Not sure yet" },
]

export const REASON_OPTIONS = [
  { id: "foreclosure", label: "Facing foreclosure" },
  { id: "behind-payments", label: "Behind on payments" },
  { id: "inherited", label: "Inherited property" },
  { id: "divorce", label: "Divorce or separation" },
  { id: "relocation", label: "Job relocation" },
  { id: "downsizing", label: "Downsizing" },
  { id: "repairs", label: "Can't afford repairs" },
  { id: "other", label: "Other" },
]

// ─── Lead scoring: lib/lead-score.ts (shared with the submit route, which re-scores
// the two-step form after filling answers from the property record) ───────────
export { SCORE_TIMELINE, SCORE_OWNERSHIP, SCORE_REASON, SCORE_CONDITION } from "@/lib/lead-score"
import { calculateLeadScore as scoreAnswers, leadQuality as qualityFor } from "@/lib/lead-score"
export function calculateLeadScore(d: SurveyData): number { return scoreAnswers(d) }
export function isQualifiedForMeta(d: SurveyData): boolean {
  const okType = d.propertyType === 'single-family' || d.propertyType === 'multi-family'
    || (d.propertyType === 'mobile-home' && d.landOwned === 'yes')
  const okListed = d.listedOnMarket === 'not-listed'
  const okOwner = d.isLegalOwner !== 'no'
  return okType && okListed && okOwner
}
export function leadQuality(score: number): 'premium' | 'standard' | 'low' { return qualityFor(score) }
export function disqualifyReasonFor(d: SurveyData): string {
  if (d.propertyType === 'mobile-home' && d.landOwned !== 'yes') return 'land_not_confirmed'
  if (d.propertyType !== 'single-family' && d.propertyType !== 'multi-family' && d.propertyType !== 'mobile-home') return 'property_type'
  if (d.listedOnMarket !== 'not-listed') return 'listed'
  if (d.isLegalOwner === 'no') return 'not_owner'
  if (d.condition === 'excellent') return 'excellent_condition'
  return 'unknown'
}
// ──────────────────────────────────────────────────────────────────────

export const DISPOSABLE_DOMAINS = new Set(["mailinator.com","guerrillamail.com","tempmail.com","throwaway.email","yopmail.com","sharklasers.com","guerrillamail.info","grr.la","guerrillamail.biz","guerrillamail.de","guerrillamail.net","guerrillamail.org","spam4.me","trashmail.com","trashmail.me","trashmail.net","mytemp.email","mohmal.com","tempail.com","dispostable.com","maildrop.cc","10minutemail.com","temp-mail.org","fakeinbox.com","mailnesia.com","getnada.com","emailondeck.com","33mail.com","harakirimail.com","jetable.org","meltmail.com","mailcatch.com","tempinbox.com","spamgourmet.com","mailexpire.com","incognitomail.org","getairmail.com","mailnull.com","safeemail.xyz","tempmailo.com","burnermail.io"])

export const BLOCKED_WORDS = new Set(["fuck","shit","ass","damn","bitch","bastard","dick","cock","pussy","cunt","whore","slut","fag","nigger","nigga","retard","penis","vagina","anus","dildo","porn","xxx","viagra","cialis","casino","bitcoin","crypto","forex","mlm","scam","spam","test123","asdf","qwerty","aaaaaa","zzzzzz","abcdef","123456"])

export function formatPhoneNumber(value: string): string {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("1")) digits = digits.slice(1)
  if (digits.length > 10) digits = digits.slice(0, 10)
  if (digits.length === 0) return ""
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

export function validatePhone(phone: string): { valid: boolean; msg: string } {
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

export function validateEmail(email: string): { valid: boolean; msg: string } {
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

export function validateName(name: string): { valid: boolean; msg: string } {
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

// Block screen shown after a hard disqualifier (same copy for both forms).
export function DisqualifiedScreen({ reason: disqualifyReason, brand }: { reason: string; brand: Brand }) {
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

// Equity-checked two-step form: ONE screen-out for every "not a fit" reason
// (low equity, listed, property type, rented lot, excellent condition, and the
// fallback questions). Never mentions equity, loans or public records.
// Text Us opens the seller's text app with the message pre-filled; numbers that
// can't take texts (PHONE_ACCEPTS_TEXT=0) get Call Us instead.
export function ScreenOutScreen({ brand, address }: { brand: Brand; address: string }) {
  const digits = (brand.phoneHref || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")
  const e164 = `+1${digits}`
  const body = `Hi, I filled out the form on your website and it said I might not be a fit, but I'm still interested in getting an offer on my house at ${address || "my property"}.`
  const href = brand.phoneAcceptsText ? `sms:${e164}?&body=${encodeURIComponent(body)}` : `tel:${e164}`
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-lg">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-[#0F1D2F]">We May Not Be the Best Fit</h2>
          <p className="mt-2 text-[#5A6B7D] text-lg">
            Based on the details of your property, a cash sale may not get you the result you&apos;re looking for. We&apos;d rather tell you that now than waste your time.
          </p>
          <p className="mt-4 text-base text-[#5A6B7D]">
            If you think we got this wrong, {brand.phoneAcceptsText ? "text" : "call"} us using the button below and we&apos;ll take a look.
          </p>
        </div>
        <a
          href={href}
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#1B2A4A] px-8 py-4 text-lg text-white hover:bg-[#131E36] transition-colors"
        >
          {brand.phoneAcceptsText ? <MessageSquare className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
          {brand.phoneAcceptsText ? "Text Us" : "Call Us"} · {brand.phoneDisplay}
        </a>
      </div>
    </div>
  )
}

// Anti-bot "fake success" screen (too-fast submit or honeypot tripped).
export function SubmittedScreen({ surveyData }: { surveyData: SurveyData }) {
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
