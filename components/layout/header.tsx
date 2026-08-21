import { Phone } from "lucide-react"
import Image from "next/image"

interface HeaderProps {
  companyName: string
  phoneDisplay: string
  phoneHref: string
  logoUrl: string
  headerBgColor?: string
  ibuykcStyle?: boolean
}

// When LOGO_HEIGHT_PX is set the logo renders as a wide banner (height fixed,
// width auto) and the company-name text is hidden because a banner logo
// already contains the name. Other clients keep the original 44x44 square
// logo + company-name layout.
const LOGO_HEIGHT_PX = Number(process.env.LOGO_HEIGHT_PX || 0)
const isBannerLogo = LOGO_HEIGHT_PX > 0

export function Header({ companyName, phoneDisplay, phoneHref, logoUrl, headerBgColor = "#ffffff", ibuykcStyle = false }: HeaderProps) {
  const isDark = headerBgColor !== "#ffffff" && headerBgColor !== "white"

  return (
    <header className="w-full shadow-sm" style={{ backgroundColor: headerBgColor }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        {/* Logo + Company Name */}
        <div className="flex items-center gap-3">
          {logoUrl && (
            isBannerLogo ? (
              <Image
                src={logoUrl}
                alt={companyName}
                width={Math.round(LOGO_HEIGHT_PX * 4)}
                height={LOGO_HEIGHT_PX}
                className="flex-shrink-0 object-contain w-auto"
                style={{ height: `${LOGO_HEIGHT_PX}px` }}
                unoptimized
              />
            ) : (
              <Image
                src={logoUrl}
                alt={companyName}
                width={44}
                height={44}
                className={ibuykcStyle ? "h-12 md:h-16 w-auto aspect-auto flex-shrink-0 object-contain" : "h-11 w-11 flex-shrink-0 rounded-lg object-contain"}
                unoptimized
              />
            )
          )}
          {!isBannerLogo && (
            <span
              className="text-base font-bold leading-tight"
              style={{ color: isDark ? "white" : "var(--accent)" }}
            >
              {companyName}
            </span>
          )}
        </div>

        {/* Phone CTA */}
        <a
          href={`tel:${phoneHref}`}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--accent)" }}
        >
          <Phone className="h-4 w-4" />
          <span className="hidden sm:inline">{phoneDisplay}</span>
          <span className="sm:hidden">Call Now</span>
        </a>
      </div>
    </header>
  )
}
