/**
 * lib/config.ts — Single server-side env var read point.
 * Import this ONLY in server components (layout.tsx, page.tsx, API routes).
 * Never import in "use client" components — pass values as props instead.
 */
const config = {
  // Brand
  companyName:     process.env.COMPANY_NAME     ?? "Your Home Buyers",
  phoneDisplay:    process.env.PHONE_DISPLAY     ?? "(800) 000-0000",
  phoneHref:       process.env.PHONE_HREF        ?? "8000000000",
  accentColor:     process.env.ACCENT_COLOR      ?? "#2563eb",
  headerBgColor:   process.env.HEADER_BG_COLOR   ?? "#ffffff",
  logoUrl:         process.env.LOGO_URL          ?? "",

  // Owner / personalization
  ownerName:       process.env.OWNER_NAME        ?? "",
  headshotUrl:     process.env.HEADSHOT_URL      ?? "",

  // Hero
  headline:        process.env.HEADLINE          ?? "Sell Your House Fast For Cash",
  headlineAccent:  process.env.HEADLINE_ACCENT   ?? "",
  subheadline:     process.env.SUBHEADLINE       ?? "No fees. No repairs. Cash offer in 24 hours.",

  // Service areas — JSON array of {id, centerLat, centerLng, radiusMiles}. Must be
  // valid circle objects or "[]". NEVER a state-name array like ["Wisconsin"].
  serviceAreas:    process.env.SERVICE_AREAS     ?? "[]",
  // Market name for advertorial copy ("Wisconsin"); empty renders "the areas we serve".
  marketName:      process.env.MARKET_NAME       ?? "",
  smsKeyword:      process.env.SMS_KEYWORD       ?? "OFFER",

  // Trust indicators
  stat1Value:      process.env.STAT_1_VALUE      ?? "1,000+",
  stat1Label:      process.env.STAT_1_LABEL      ?? "Homes Purchased",
  stat2Value:      process.env.STAT_2_VALUE      ?? "10+",
  stat2Label:      process.env.STAT_2_LABEL      ?? "Years in Business",
  stat3Value:      process.env.STAT_3_VALUE      ?? "24 Hrs",
  stat3Label:      process.env.STAT_3_LABEL      ?? "Cash Offer",

  // SEO
  metaTitle:       process.env.META_TITLE        ?? "Sell Your House Fast For Cash",
  metaDescription: process.env.META_DESCRIPTION  ?? "Get a fair cash offer for your home in 24 hours. No fees, no repairs, no hassle.",

  // Footer
  privacyPolicyUrl: process.env.PRIVACY_POLICY_URL ?? "/privacy",
  termsUrl:         process.env.TERMS_URL           ?? "/terms",

  // Survey disqualification — comma-separated property type IDs to hard-disqualify
  disqualifiedPropertyTypes: process.env.DISQUALIFIED_PROPERTY_TYPES ?? "mobile-home,land,other",

  // Survey disqualification — comma-separated ownership-length option IDs to hard-
  // disqualify (e.g. "less-than-3,3-to-5" to block under-5-year owners). Valid IDs:
  // less-than-3, 3-to-5, 5-to-10, 10-plus. Empty (default) → no ownership gate →
  // byte-identical legacy behavior for all existing rei-survey-template@main
  // projects that never set DISQUALIFIED_OWNERSHIP_LENGTHS.
  disqualifiedOwnershipLengths: process.env.DISQUALIFIED_OWNERSHIP_LENGTHS ?? "",

  // Geo allow-list — comma-separated 2-letter US state codes (e.g. "CA" or
  // "CA,NV"). When set, any address whose state is NOT in the list is treated
  // as out-of-area (blocked at step 1, no lead fires). Empty (default) → no geo
  // gate → byte-identical legacy behavior for all existing rei-survey-template
  // @main projects that never set ALLOWED_STATES.
  allowedStates:   process.env.ALLOWED_STATES ?? "",

  // Webhook (server-side only — never exposed to browser)
  webhookUrl:      process.env.WEBHOOK_URL ?? "",

  // Style flag — when IBUYKC_STYLE === "true" (default for new clients via the
  // env-schema default), render the iBuyKC style: white page, accent only on
  // buttons, dark text, enlarged logo, flexible owner/team photo. The ~17
  // projects deploying rei-survey-template@main have no IBUYKC_STYLE env → falsy
  // → byte-identical legacy style.
  useIbuykcStyle:  process.env.IBUYKC_STYLE === "true",

  // Motivation list flag — when MOTIVATION_V2 === "true" (default for new clients
  // via the env-schema default), both forms (v1 homepage + /v3) render William's
  // v2 reason-for-selling list, including the "No reason / seeing what my house is
  // worth" hard-disqualifier. Existing rei-survey-template@main projects without
  // this env → falsy → byte-identical legacy reason list, no disqualifier.
  motivationV2:    process.env.MOTIVATION_V2 === "true",
} as const

export default config
export type Config = typeof config