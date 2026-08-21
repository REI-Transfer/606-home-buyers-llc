/**
 * /v3 — Origin zero-distraction lander (env-gated, per-client opt-in).
 *
 * Shared across every client on this template but renders ONLY when a client
 * sets V3_ENABLED=true on their own Vercel project. Every other client 404s
 * here, so enabling /v3 for one client never affects another. The page
 * self-brands entirely from each client's own env vars (logo, accent, phone,
 * headline, service area) — exactly like the homepage.
 *
 * Zero-distraction Pathway pattern: logo + headline + multi-step form
 * (qualifying questions FIRST, contact LAST). Submits to the existing
 * /api/submit route — no webhook / n8n changes.
 */

import config from "@/lib/config"
import Image from "next/image"
import { notFound } from "next/navigation"
import { ZeroDistractionForm } from "@/components/survey/zero-distraction-form"
import { Footer } from "@/components/layout/footer"
import { TrackingCapture } from "@/components/tracking/tracking-capture"

export const metadata = {
  title: config.metaTitle,
  description: config.metaDescription,
}

export default function V3Page() {
  // Per-client opt-in switch. Until a client sets V3_ENABLED=true on their
  // Vercel project, /v3 does not exist for them (404). Additive + isolated:
  // enabling it for one client cannot affect any other client's pages.
  if (process.env.V3_ENABLED !== "true") {
    notFound()
  }

  let parsedServiceAreas: Array<{ id: string; centerLat: number; centerLng: number; radiusMiles: number }> = []
  try { parsedServiceAreas = JSON.parse(config.serviceAreas) } catch {}

  const disqualifiedPropertyTypes = config.disqualifiedPropertyTypes
    .split(",").map(s => s.trim()).filter(Boolean)
  const allowedStates = config.allowedStates.split(",").map(s => s.trim()).filter(Boolean)

  return (
    <main className="relative min-h-screen bg-gray-50">
      {/* Captures UTMs / click IDs / fbp / fbc / referrer on mount; renders nothing. */}
      <TrackingCapture />

      {/* Minimal white header — logo only. */}
      <header className="w-full bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-3 lg:px-8">
          {config.logoUrl && (
            <Image
              src={config.logoUrl}
              alt={config.companyName}
              width={96}
              height={96}
              className="h-16 w-16 md:h-20 md:w-20 flex-shrink-0 object-contain"
              unoptimized
              priority
            />
          )}
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 pt-6 pb-12 md:pt-10">
        <h1 className="text-center text-2xl font-bold leading-tight text-gray-900 md:text-3xl mb-2">
          {config.headline}
          {config.headlineAccent && (
            <span className="text-gray-500"> {config.headlineAccent}</span>
          )}
        </h1>
        <p className="text-center text-sm md:text-base text-gray-600 mb-6 md:mb-8">
          {config.subheadline}
        </p>

        <ZeroDistractionForm
          accentColor={config.accentColor}
          serviceAreas={parsedServiceAreas}
          disqualifiedPropertyTypes={disqualifiedPropertyTypes}
          allowedStates={allowedStates}
          phoneHref={config.phoneHref}
          phoneDisplay={config.phoneDisplay}
          motivationV2={config.motivationV2}
        />
      </div>

      <Footer
        companyName={config.companyName}
        phoneDisplay={config.phoneDisplay}
        phoneHref={config.phoneHref}
        privacyPolicyUrl={config.privacyPolicyUrl}
        termsUrl={config.termsUrl}
      />
    </main>
  )
}
