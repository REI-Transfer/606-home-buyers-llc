import Image from "next/image"
import { SurveyCard } from "@/components/survey/survey-card"
import { VSLSection } from "@/components/survey/vsl-section"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import config from "@/lib/config"

export default function HomePage() {
  const stats = [
    { value: config.stat1Value, label: config.stat1Label },
    { value: config.stat2Value, label: config.stat2Label },
    { value: config.stat3Value, label: config.stat3Label },
  ]

  // Parse service areas for client-side validation
  let parsedServiceAreas: Array<{ id: string; centerLat: number; centerLng: number; radiusMiles: number }> = []
  try { parsedServiceAreas = JSON.parse(config.serviceAreas) } catch {}

  const disqualifiedPropertyTypes = config.disqualifiedPropertyTypes.split(",").map(s => s.trim()).filter(Boolean)
  const disqualifiedOwnershipLengths = config.disqualifiedOwnershipLengths.split(",").map(s => s.trim()).filter(Boolean)
  const allowedStates = config.allowedStates.split(",").map(s => s.trim()).filter(Boolean)

  const ibuykc = config.useIbuykcStyle

  return (
    <main className={ibuykc ? "relative min-h-screen bg-gray-50" : "relative min-h-screen"} style={ibuykc ? undefined : { backgroundColor: config.accentColor }}>
      <div className="relative z-10">
        <Header
          companyName={config.companyName}
          phoneDisplay={config.phoneDisplay}
          phoneHref={config.phoneHref}
          logoUrl={config.logoUrl}
          headerBgColor={config.headerBgColor}
          ibuykcStyle={ibuykc}
        />

        <div className="mx-auto max-w-7xl px-4 py-4 md:py-6 lg:px-8">
          {/* Hero */}
          <div className="mx-auto text-center">
            <h1 className={ibuykc ? "text-4xl font-extrabold leading-tight text-gray-900 md:text-5xl lg:text-[3.75rem] lg:leading-[1.15] text-balance" : "text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-[3.75rem] lg:leading-[1.15] text-balance"}>
              {config.headline}
              {config.headlineAccent && (
                <span className={ibuykc ? "text-gray-900" : "text-white/80"}> {config.headlineAccent}</span>
              )}
            </h1>
            <p className={ibuykc ? "mt-2 md:mt-3 text-base md:text-lg text-gray-600" : "mt-2 md:mt-3 text-base md:text-lg text-white/70"}>
              {config.subheadline}
            </p>

            {/* Trust indicators — accent-colored checkmarks */}
            <div className="mt-3 md:mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 md:gap-5">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-1.5">
                  <div
                    className={ibuykc ? "flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10" : "flex h-6 w-6 items-center justify-center rounded-full"}
                    style={ibuykc ? undefined : { backgroundColor: "rgba(255,255,255,0.15)" }}
                  >
                    <svg
                      className={ibuykc ? "h-3.5 w-3.5 text-green-500" : "h-3.5 w-3.5"}
                      style={ibuykc ? undefined : { color: "white" }}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className={ibuykc ? "text-sm md:text-base font-medium text-gray-700" : "text-sm md:text-base font-medium text-white/80"}>
                    <strong>{stat.value}</strong> {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Survey Form */}
          <div className="mt-4 md:mt-6 mx-auto max-w-3xl">
            <SurveyCard
              phoneDisplay={config.phoneDisplay}
              phoneHref={config.phoneHref}
              serviceAreas={parsedServiceAreas}
              disqualifiedPropertyTypes={disqualifiedPropertyTypes}
              disqualifiedOwnershipLengths={disqualifiedOwnershipLengths}
              allowedStates={allowedStates}
              motivationV2={config.motivationV2}
            />
          </div>

          {/* Owner / Founder section — shows when ownerName or headshotUrl is set */}
          {(config.ownerName || config.headshotUrl) && (
            <div className="mt-8 md:mt-12 mx-auto flex flex-col items-center gap-3">
              {config.headshotUrl && (
                ibuykc ? (
                  <div className="w-full max-w-xs">
                    <Image
                      src={config.headshotUrl}
                      alt={config.ownerName || config.companyName}
                      width={640}
                      height={640}
                      unoptimized
                      className="h-auto w-full aspect-auto rounded-2xl object-contain"
                    />
                  </div>
                ) : (
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border-2" style={{ borderColor: "rgba(255,255,255,0.5)" }}>
                    <Image
                      src={config.headshotUrl}
                      alt={config.ownerName || config.companyName}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                )
              )}
              {config.ownerName && (
                <div className="text-center">
                  <p className={ibuykc ? "text-base font-semibold text-gray-900" : "text-base font-semibold text-white"}>{config.ownerName}</p>
                  <p className={ibuykc ? "text-sm text-gray-500" : "text-sm text-white/60"}>{config.companyName}</p>
                </div>
              )}
            </div>
          )}

          {/* VSL (conditional on env vars) */}
          <div className="mt-6 md:mt-8 mx-auto max-w-4xl">
            <VSLSection />
          </div>
        </div>

        <Footer
          companyName={config.companyName}
          phoneDisplay={config.phoneDisplay}
          phoneHref={config.phoneHref}
          privacyPolicyUrl={config.privacyPolicyUrl}
          termsUrl={config.termsUrl}
        />
      </div>
    </main>
  )
}
