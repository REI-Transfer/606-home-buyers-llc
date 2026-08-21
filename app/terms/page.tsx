import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import config from "@/lib/config"

export const metadata = {
  title: `Terms of Service | ${process.env.COMPANY_NAME ?? "Home Buyers"}`,
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header
        companyName={config.companyName}
        phoneDisplay={config.phoneDisplay}
        phoneHref={config.phoneHref}
        logoUrl={config.logoUrl}
        headerBgColor={config.headerBgColor}
      />
      <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().getFullYear()}</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <p>By accessing and using {config.companyName}&apos;s website and services, you accept and agree to be bound by the following terms and conditions.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">Use of Services</h2>
          <p>Our services are intended for homeowners or authorized representatives interested in selling residential real estate. By submitting your information, you consent to being contacted by our team via phone, email, or text.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">No Obligation</h2>
          <p>Submitting a form on our website does not obligate you to sell your property. Any offer made is non-binding until a purchase agreement is signed by both parties.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">Limitation of Liability</h2>
          <p>{config.companyName} is not liable for any direct, indirect, incidental, or consequential damages arising from your use of our website or services.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">Contact Us</h2>
          <p>For questions about these Terms, contact us at <a href={`tel:${config.phoneHref}`} className="underline">{config.phoneDisplay}</a>.</p>
        </div>
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