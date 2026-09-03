/**
 * lib/brand.ts — the serializable brand shape threaded from server pages
 * (page.tsx / v2/page.tsx) down into "use client" section components.
 *
 * Client components must import ONLY the `Brand` type from here via
 * `import type { Brand }` (erased at build time). `buildBrand()` reads the
 * server-only config and must be called from server components only.
 */
import config from "./config"

export interface Brand {
  companyName: string
  phoneDisplay: string
  phoneHref: string
  callinDisplay: string
  callinHref: string
  accentColor: string
  logoUrl: string
  ownerName: string
  headshotUrl: string
  foundersPhotoUrl: string
  foundersCaption: string
  headline: string
  headlineAccent: string
  subheadline: string
  marketName: string
  smsKeyword: string
  stat1Value: string
  stat1Label: string
  stat2Value: string
  stat2Label: string
  stat3Value: string
  stat3Label: string
}

/** Server-only. Build the plain, serializable brand object from env config. */
export function buildBrand(): Brand {
  return {
    companyName: config.companyName,
    phoneDisplay: config.phoneDisplay,
    phoneHref: config.phoneHref,
    callinDisplay: config.callinDisplay,
    callinHref: config.callinHref,
    accentColor: config.accentColor,
    logoUrl: config.logoUrl,
    ownerName: config.ownerName,
    headshotUrl: config.headshotUrl,
    foundersPhotoUrl: config.foundersPhotoUrl,
    foundersCaption: config.foundersCaption,
    headline: config.headline,
    headlineAccent: config.headlineAccent,
    subheadline: config.subheadline,
    marketName: config.marketName,
    smsKeyword: config.smsKeyword,
    stat1Value: config.stat1Value,
    stat1Label: config.stat1Label,
    stat2Value: config.stat2Value,
    stat2Label: config.stat2Label,
    stat3Value: config.stat3Value,
    stat3Label: config.stat3Label,
  }
}

/** Convenience for copy: the market phrase, e.g. "in Salt Lake City" or "in your area". */
export function marketPhrase(brand: Brand): string {
  return brand.marketName ? brand.marketName : "your area"
}
