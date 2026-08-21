"use client"

import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Home,
  Building2,
  Building,
  Truck,
  Map as MapIcon,
  HelpCircle,
  ShieldCheck,
  Tag,
  Zap,
  CalendarClock,
  CalendarDays,
  Hourglass,
  Sprout,
  TreePine,
  Anchor,
  TrendingUp,
  Crown,
  Shrink,
  Plane,
  Gift,
  KeyRound,
  Hammer,
  AlertTriangle,
  AlertCircle,
  Clock,
  Search,
  Split,
  ChevronRight,
  User,
  Users,
  Heart,
  Briefcase,
  Handshake,
  Sparkles,
  Smile,
  Wrench,
  HardHat,
  Eye,
} from "lucide-react"
import { AddressAutocomplete, type AddressDetails, type ServiceArea } from "@/components/survey/address-autocomplete"
import { readCapturedTracking } from "@/components/tracking/tracking-capture"
import { readGfSid } from "@/lib/tracking"
import { scoreLead } from "@/lib/lead-scoring"

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

type Props = {
  accentColor: string
  serviceAreas: ServiceArea[]
  disqualifiedPropertyTypes: string[]
  // 2-letter US state codes to ALLOW (ALLOWED_STATES). Empty → no state gate.
  allowedStates?: string[]
  phoneHref?: string
  phoneDisplay?: string
  // When true (MOTIVATION_V2), render William's v2 reason list incl. the
  // "no-reason" hard-disqualifier. Passed from the server page (config.motivationV2)
  // — this client component must NOT import lib/config.
  motivationV2?: boolean
}

type FormState = {
  propertyType: string
  whoAreYou: string
  listedOnMarket: string
  timeline: string
  yearsOwned: string
  reason: string
  condition: string
  address: string
  addressDetails: AddressDetails | null
  firstName: string
  lastName: string
  email: string
  phone: string
  hp_company: string
}

// HARD disqualifiers — block the user on a 'can't make an offer' screen (no
// lead captured, no pixel). Distinct from the pixel qualification gate below.
const DQ_REASONS = {
  notOwner: "We work directly with property owners, so we're not able to make an offer in this case.",
  listed: "Your home is currently listed on the market, so we can't make an offer right now. Once it's off-market, we'd be glad to take a look.",
  exploring: "It sounds like you're just gathering information right now. When you're ready to sell, come back and we'll get you a cash offer.",
  noReason: "It sounds like you're just gathering information right now. When you're ready to sell, come back and we'll get you a cash offer.",
} as const
type DqKey = keyof typeof DQ_REASONS

function checkHardDq(key: keyof FormState, value: string): DqKey | null {
  if (key === "whoAreYou" && (value === "agent" || value === "wholesaler" || value === "other")) return "notOwner"
  if (key === "listedOnMarket" && value === "yes") return "listed"
  if (key === "timeline" && value === "exploring") return "exploring"
  // v2 motivation list (MOTIVATION_V2): "no reason / seeing what my house is worth"
  // hard-disqualifies. The id only exists in REASON_OPTIONS_V2, so this is inert
  // for the legacy list.
  if (key === "reason" && value === "no-reason") return "noReason"
  return null
}

// Pixel qualification gate. A completed lead fires the Meta Lead pixel only
// when all soft fit rules pass. Hard-DQ'd users never reach here.
function isQualifiedLead(form: FormState): boolean {
  const ownerOk = ["owner", "part-owner", "family"].includes(form.whoAreYou)
  const timelineOk = form.timeline !== "exploring"
  const yearsOk = form.yearsOwned !== "0-2" && form.yearsOwned !== "3-5"
  const conditionOk = form.condition !== "excellent"
  return ownerOk && timelineOk && yearsOk && conditionOk
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^1/, "").slice(0, 10)
  if (digits.length === 0) return ""
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

type Choice = { id: string; label: string; icon: LucideIcon }

const PROPERTY_TYPES: Choice[] = [
  { id: "single-family", label: "Single Family Home", icon: Home },
  { id: "multi-family",  label: "Multi-Family / Duplex", icon: Building2 },
  { id: "condo",         label: "Condo / Townhouse", icon: Building },
  { id: "mobile-home",   label: "Mobile / Manufactured Home", icon: Truck },
  { id: "land",          label: "Vacant Land", icon: MapIcon },
  { id: "other",         label: "Other", icon: HelpCircle },
]

const WHO_ARE_YOU_OPTIONS: Choice[] = [
  { id: "owner",         label: "I'm the owner",                       icon: User },
  { id: "part-owner",    label: "I'm a part owner / co-owner",         icon: Users },
  { id: "family",        label: "Family member with rights to sell",   icon: Heart },
  { id: "agent",         label: "I'm an agent representing the seller", icon: Briefcase },
  { id: "wholesaler",    label: "I'm a wholesaler",                    icon: Handshake },
  { id: "other",         label: "Other",                               icon: HelpCircle },
]

const LISTED_OPTIONS: Choice[] = [
  { id: "no",  label: "No, it's not listed",  icon: ShieldCheck },
  { id: "yes", label: "Yes, it's listed",     icon: Tag },
]

const TIMELINE_OPTIONS: Choice[] = [
  { id: "asap",      label: "ASAP (within 30 days)",  icon: Zap },
  { id: "3-months",  label: "Within 3 months",        icon: CalendarClock },
  { id: "6-months",  label: "Within 6 months",        icon: CalendarDays },
  { id: "6-plus",    label: "6+ months",              icon: Hourglass },
  { id: "exploring", label: "Just exploring",         icon: Eye },
]

const YEARS_OWNED_OPTIONS: Choice[] = [
  { id: "0-2",   label: "Less than 2 years",      icon: Sprout },
  { id: "3-5",   label: "3 to 5 years",           icon: TreePine },
  { id: "6-10",  label: "6 to 10 years",          icon: Anchor },
  { id: "11-20", label: "11 to 20 years",         icon: TrendingUp },
  { id: "20+",   label: "More than 20 years",     icon: Crown },
]

const REASON_OPTIONS: Choice[] = [
  { id: "downsize",    label: "Downsizing / Empty Nest",   icon: Shrink },
  { id: "relocation",  label: "Relocating",                icon: Plane },
  { id: "inheritance", label: "Inherited / Probate",       icon: Gift },
  { id: "landlord",    label: "Tired Landlord",            icon: KeyRound },
  { id: "repairs",     label: "Too Many Repairs",          icon: Hammer },
  { id: "foreclosure", label: "Behind on Payments",        icon: AlertTriangle },
  { id: "divorce",     label: "Divorce",                   icon: Split },
  { id: "other",       label: "Other",                     icon: HelpCircle },
]

// William's v2 reason list — rendered only when MOTIVATION_V2 is on (new clients).
// "no-reason" is a hard-disqualifier handled in checkHardDq: selecting it shows the
// block screen and the lead is never submitted (same path as timeline "exploring").
const REASON_OPTIONS_V2: Choice[] = [
  { id: "foreclosure",      label: "Facing foreclosure",                          icon: AlertTriangle },
  { id: "behind-payments",  label: "Behind on payments",                          icon: Clock },
  { id: "inherited",        label: "Inherited property",                          icon: Gift },
  { id: "divorce",          label: "Divorce or separation",                       icon: Split },
  { id: "repairs",          label: "Can't afford repairs",                        icon: Hammer },
  { id: "vacant",           label: "Vacant property I need to sell",              icon: Home },
  { id: "urgent-financial", label: "Urgent financial situation not listed above", icon: AlertCircle },
  { id: "personal",         label: "Personal situation not listed above",         icon: HelpCircle },
  { id: "no-reason",        label: "No reason / seeing what my house is worth",   icon: Search },
]

type ConditionChoice = { id: string; label: string; sub: string; icon: LucideIcon }
const CONDITION_OPTIONS: ConditionChoice[] = [
  { id: "excellent", label: "Excellent", sub: "2025+ build or recently renovated. Move-in ready.", icon: Sparkles },
  { id: "good",      label: "Good",      sub: "Needs minor TLC. Paint, carpet, small cosmetic fixes.", icon: Smile },
  { id: "fair",      label: "Fair",      sub: "Dated but solid. Needs work to hit current standards.", icon: Wrench },
  { id: "poor",      label: "Poor",      sub: "Won't pass inspection. Major repairs needed.", icon: HardHat },
]

function ChoiceButton({
  choice, selected, accentColor, onClick,
}: { choice: Choice; selected?: boolean; accentColor: string; onClick: () => void }) {
  const Icon = choice.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full min-h-14 rounded-xl border-2 px-4 py-3 text-base md:text-lg font-medium text-left transition-all active:scale-[0.98] flex items-center gap-3"
      style={{
        borderColor: selected ? accentColor : "#e5e7eb",
        backgroundColor: selected ? `${accentColor}0D` : "#ffffff",
        color: selected ? accentColor : "#111827",
      }}
    >
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: selected ? `${accentColor}1A` : "#f3f4f6",
          color: selected ? accentColor : "#4b5563",
        }}
      >
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="flex-1">{choice.label}</span>
      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:translate-x-0.5 transition-transform" />
    </button>
  )
}

function NextButton({
  disabled, onClick, accentColor, label = "Next",
}: { disabled?: boolean; onClick: () => void; accentColor: string; label?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full h-14 md:h-16 rounded-xl text-white font-semibold text-lg md:text-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ backgroundColor: accentColor }}
    >
      {label}
    </button>
  )
}

function StepHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 text-center md:text-left">
      {children}
    </h2>
  )
}

export function ZeroDistractionForm({ accentColor, serviceAreas, disqualifiedPropertyTypes, allowedStates = [], motivationV2 = false }: Props) {
  const [step, setStep] = useState(1)
  const TOTAL_STEPS = 9
  const [outsideAreaError, setOutsideAreaError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [dq, setDq] = useState<DqKey | null>(null)

  const [form, setForm] = useState<FormState>({
    propertyType: "",
    whoAreYou: "",
    listedOnMarket: "",
    timeline: "",
    yearsOwned: "",
    reason: "",
    condition: "",
    address: "",
    addressDetails: null,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    hp_company: "",
  })

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // Auto-advance after a choice. Hard-DQ selections short-circuit to the DQ
  // screen; everything else proceeds (soft rules only affect the pixel).
  const pickAndAdvance = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    const hardDq = typeof value === "string" ? checkHardDq(key, value) : null
    if (hardDq) {
      setTimeout(() => setDq(hardDq), 150)
      return
    }
    setTimeout(() => setStep(s => Math.min(s + 1, TOTAL_STEPS)), 150)
  }

  const isPropertyDisqualified = (typeId: string) => disqualifiedPropertyTypes.includes(typeId)

  const isInServiceArea = (details: AddressDetails): boolean => {
    if (serviceAreas.length === 0) return true
    if (!details.lat || !details.lng) return true
    return serviceAreas.some(area => {
      const dLat = (details.lat! - area.centerLat) * Math.PI / 180
      const dLng = (details.lng! - area.centerLng) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(area.centerLat * Math.PI / 180) *
        Math.cos(details.lat! * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return 3959 * c <= area.radiusMiles
    })
  }

  const submit = async () => {
    setSubmitting(true)
    setSubmitError("")
    try {
      if (form.hp_company.trim().length > 0) {
        await new Promise(r => setTimeout(r, 400))
        window.location.href = "/thank-you"
        return
      }

      const score = scoreLead({
        propertyType:   form.propertyType,
        whoAreYou:      form.whoAreYou,
        listedOnMarket: form.listedOnMarket,
        timeline:       form.timeline,
        yearsOwned:     form.yearsOwned,
        reason:         form.reason,
        condition:      form.condition,
      })

      const tracking = readCapturedTracking()
      const qualified = isQualifiedLead(form)

      const emailNorm = form.email.toLowerCase().trim().replace(/[^a-z0-9]/g, "")
      const eventID = emailNorm
        ? `rei_lead_${emailNorm.slice(0, 16)}`
        : `rei_lead_anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

      if (qualified && typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "Lead", {
          value: score.meta_value,
          currency: "USD",
          qualified: true,
          lead_score: score.lead_score,
          lead_quality: score.lead_quality,
          content_name: "Cash Offer Request",
          content_category: "cash_buyer_v3",
        }, { eventID })
      }

      const payload = {
        name: `${form.firstName} ${form.lastName}`.trim(),
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
        address: form.address,

        property_type:    form.propertyType,
        who_are_you:      form.whoAreYou,
        listed_on_market: form.listedOnMarket,
        timeline:         form.timeline,
        years_owned:      form.yearsOwned,
        reason:           form.reason,
        condition:        form.condition,

        // Legacy field-name aliases consumed by the existing n8n Lead Handler.
        firstName:      form.firstName,
        lastName:       form.lastName,
        propertyType:   form.propertyType,
        isLegalOwner:   form.whoAreYou,
        listedOnMarket: form.listedOnMarket,

        lead_score:           score.lead_score,
        lead_quality:         score.lead_quality,
        lead_meta_value:      score.meta_value,
        lead_score_breakdown: score.breakdown,

        event_id: eventID,
        qualified,

        utm_source:   tracking.utm_source   ?? "",
        utm_medium:   tracking.utm_medium   ?? "",
        utm_campaign: tracking.utm_campaign ?? "",
        utm_content:  tracking.utm_content  ?? "",
        utm_term:     tracking.utm_term     ?? "",
        fbclid:       tracking.fbclid       ?? "",
        gclid:        tracking.gclid        ?? "",
        ttclid:       tracking.ttclid       ?? "",
        msclkid:      tracking.msclkid      ?? "",
        fbp:          tracking.fbp          ?? "",
        fbc:          tracking.fbc          ?? "",
        referrer:     tracking.referrer     ?? "",
        landing_url:  tracking.landing_url  ?? "",
        captured_at:  tracking.captured_at  ?? "",
        gf_sid:  readGfSid(),

        lead_stage: 'complete',
        funnel_variant: 'v3-zero-distraction',
        page_url: typeof window !== "undefined" ? window.location.href : "",
      }

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Submission failed")
      }
      window.location.href = "/thank-you"
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong")
      setSubmitting(false)
    }
  }

  // ---- Hard-DQ screen ----
  if (dq) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 md:p-8 text-center">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
          We&apos;re not able to make an offer
        </h2>
        <p className="text-sm md:text-base text-gray-600 max-w-md mx-auto">
          {DQ_REASONS[dq]}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 md:p-8">
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">Step {step} of {TOTAL_STEPS}</span>
          <span className="text-xs font-medium" style={{ color: accentColor }}>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>

      {step === 1 && (
        <div>
          <StepHeader>What type of property is it?</StepHeader>
          <div className="space-y-3">
            {PROPERTY_TYPES.map(c => (
              <ChoiceButton key={c.id} accentColor={accentColor}
                choice={c}
                selected={form.propertyType === c.id}
                onClick={() => {
                  if (isPropertyDisqualified(c.id)) {
                    update("propertyType", c.id)
                  }
                  pickAndAdvance("propertyType", c.id)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <StepHeader>And who are you in this transaction?</StepHeader>
          <div className="space-y-3">
            {WHO_ARE_YOU_OPTIONS.map(c => (
              <ChoiceButton key={c.id} accentColor={accentColor} choice={c} selected={form.whoAreYou === c.id} onClick={() => pickAndAdvance("whoAreYou", c.id)} />
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <StepHeader>Is your home currently listed with a realtor?</StepHeader>
          <div className="space-y-3">
            {LISTED_OPTIONS.map(c => (
              <ChoiceButton key={c.id} accentColor={accentColor} choice={c} selected={form.listedOnMarket === c.id} onClick={() => pickAndAdvance("listedOnMarket", c.id)} />
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <StepHeader>How soon would you like to sell?</StepHeader>
          <div className="space-y-3">
            {TIMELINE_OPTIONS.map(c => (
              <ChoiceButton key={c.id} accentColor={accentColor} choice={c} selected={form.timeline === c.id} onClick={() => pickAndAdvance("timeline", c.id)} />
            ))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <StepHeader>How long have you owned the property?</StepHeader>
          <div className="space-y-3">
            {YEARS_OWNED_OPTIONS.map(c => (
              <ChoiceButton key={c.id} accentColor={accentColor} choice={c} selected={form.yearsOwned === c.id} onClick={() => pickAndAdvance("yearsOwned", c.id)} />
            ))}
          </div>
        </div>
      )}

      {step === 6 && (
        <div>
          <StepHeader>What&apos;s the main reason for selling?</StepHeader>
          <div className="space-y-3">
            {(motivationV2 ? REASON_OPTIONS_V2 : REASON_OPTIONS).map(c => (
              <ChoiceButton key={c.id} accentColor={accentColor} choice={c} selected={form.reason === c.id} onClick={() => pickAndAdvance("reason", c.id)} />
            ))}
          </div>
        </div>
      )}

      {step === 7 && (
        <div>
          <StepHeader>How would you describe the condition?</StepHeader>
          <div className="space-y-3">
            {CONDITION_OPTIONS.map(c => {
              const Icon = c.icon
              const selected = form.condition === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickAndAdvance("condition", c.id)}
                  className="group w-full rounded-xl border-2 px-4 py-3 text-left transition-all active:scale-[0.98] flex items-start gap-3"
                  style={{
                    borderColor: selected ? accentColor : "#e5e7eb",
                    backgroundColor: selected ? `${accentColor}0D` : "#ffffff",
                  }}
                >
                  <span
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg mt-0.5"
                    style={{
                      backgroundColor: selected ? `${accentColor}1A` : "#f3f4f6",
                      color: selected ? accentColor : "#4b5563",
                    }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <span className="flex-1">
                    <span
                      className="block text-base md:text-lg font-semibold leading-tight"
                      style={{ color: selected ? accentColor : "#111827" }}
                    >
                      {c.label}
                    </span>
                    <span className="block text-sm text-gray-500 mt-0.5 leading-snug">
                      {c.sub}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-gray-300 mt-2 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {step === 8 && (
        <div>
          <StepHeader>What&apos;s the property address?</StepHeader>
          <div className="space-y-3">
            <AddressAutocomplete
              value={form.address}
              onChange={(v) => { update("address", v); setOutsideAreaError(false) }}
              onSelect={(addr, details) => {
                if (!isInServiceArea(details)) {
                  setOutsideAreaError(true)
                  return
                }
                setOutsideAreaError(false)
                setForm(prev => ({ ...prev, address: addr, addressDetails: details }))
                setStep(s => s + 1)
              }}
              onOutOfArea={() => setOutsideAreaError(true)}
              serviceAreas={serviceAreas}
              allowedStates={allowedStates}
              placeholder="Start typing your address..."
            />
            {outsideAreaError && (
              <p className="text-sm text-red-600 text-center">
                Sorry, that address is outside our buying area. Please enter a property in our service area.
              </p>
            )}
            <p className="text-xs text-gray-500 text-center">
              We only buy in our service area.
            </p>
          </div>
        </div>
      )}

      {step === 9 && (
        <div>
          <StepHeader>Who should we send the offer to?</StepHeader>
          <div className="space-y-4">
            <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
              <label htmlFor="hp_company">Company (leave blank)</label>
              <input
                id="hp_company"
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={form.hp_company}
                onChange={e => update("hp_company", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  inputMode="text"
                  autoComplete="given-name"
                  placeholder="John"
                  value={form.firstName}
                  onChange={e => update("firstName", e.target.value)}
                  className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  inputMode="text"
                  autoComplete="family-name"
                  placeholder="Smith"
                  value={form.lastName}
                  onChange={e => update("lastName", e.target.value)}
                  className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => update("email", e.target.value)}
                className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(949) 555-1234"
                value={form.phone}
                onChange={e => update("phone", formatPhoneDisplay(e.target.value))}
                className="w-full h-14 px-4 rounded-xl border-2 border-gray-200 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent tabular-nums"
              />
            </div>
            {submitError && (
              <p className="text-sm text-red-600 text-center">{submitError}</p>
            )}
            <NextButton
              accentColor={accentColor}
              label={submitting ? "Sending..." : "Get My Cash Offer"}
              disabled={
                submitting ||
                !form.firstName.trim() ||
                !form.lastName.trim() ||
                !form.email.trim() ||
                form.phone.replace(/\D/g, "").length < 10
              }
              onClick={submit}
            />
            <p className="text-xs text-gray-500 text-center px-2">
              By tapping above you agree to be contacted about your offer. No spam. No obligation.
            </p>
          </div>
        </div>
      )}

      {step > 1 && step < 9 && (
        <button
          type="button"
          onClick={() => setStep(s => Math.max(s - 1, 1))}
          className="mt-5 w-full text-sm text-gray-500 hover:text-gray-700 text-center"
        >
          ← Back
        </button>
      )}
    </div>
  )
}
