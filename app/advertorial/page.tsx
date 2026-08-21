import type { Metadata } from "next"
import { AdvertorialPage } from "@/components/advertorial/advertorial-page"
import type { ServiceArea } from "@/components/survey/address-autocomplete"
import config from "@/lib/config"

const market = config.marketName || "Your Area"

export const metadata: Metadata = {
  title: `Why More ${market} Homeowners Are Selling Their Homes For Cash | ${config.companyName}`,
  description:
    "A simpler way longtime homeowners are selling as-is. No repairs, no open houses, no agent fees taken out of the price. See if your home qualifies.",
}

export default function AdvertorialRoute() {
  let serviceAreas: ServiceArea[] = []
  try {
    serviceAreas = JSON.parse(config.serviceAreas)
  } catch {}

  const allowedStates = config.allowedStates.split(",").map(s => s.trim()).filter(Boolean)

  return (
    <main className="relative min-h-screen bg-white">
      <AdvertorialPage
        companyName={config.companyName}
        phoneDisplay={config.phoneDisplay}
        phoneHref={config.phoneHref}
        marketName={config.marketName}
        accentColor={config.accentColor}
        ownerName={config.ownerName}
        headshotUrl={config.headshotUrl}
        serviceAreas={serviceAreas}
        allowedStates={allowedStates}
        motivationV2={config.motivationV2}
      />
    </main>
  )
}
