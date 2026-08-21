interface FooterProps {
  companyName: string
  phoneDisplay: string
  phoneHref: string
  privacyPolicyUrl: string
  termsUrl: string
}

export function Footer({
  companyName,
  phoneDisplay,
  phoneHref,
  privacyPolicyUrl,
  termsUrl,
}: FooterProps) {
  return (
    <footer className="bg-white px-4 lg:px-8 mt-8">
      <div className="mx-auto max-w-7xl border-t border-gray-200 py-8">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm font-semibold text-gray-700">{companyName}</p>

          <p className="text-sm text-gray-500">
            We buy houses in any condition. No obligation, no pressure.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
            <a
              href={privacyPolicyUrl}
              className="transition-colors hover:text-gray-900"
            >
              Privacy Policy
            </a>
            <span className="text-gray-300">|</span>
            <a
              href={termsUrl}
              className="transition-colors hover:text-gray-900"
            >
              Terms of Service
            </a>
            <span className="text-gray-300">|</span>
            <a
              href={`tel:${phoneHref}`}
              className="transition-colors hover:text-gray-900"
            >
              {phoneDisplay}
            </a>
          </div>

          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
          </p>

          <p className="text-xs text-gray-400 max-w-2xl">
            {companyName} is not a licensed real estate agent or broker. We are a
            cash home buying company. All offers are subject to property inspection
            and due diligence.
          </p>
        </div>
      </div>
    </footer>
  )
}
