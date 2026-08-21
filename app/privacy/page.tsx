import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import config from "@/lib/config"

export const metadata = {
  title: `Privacy Policy | ${process.env.COMPANY_NAME ?? "Home Buyers"}`,
}

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().getFullYear()}</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
          <p>{config.companyName} (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard information you provide when you use our website.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">Information We Collect</h2>
          <p>We collect information you voluntarily provide, including your name, email address, phone number, and property address when you submit our online form. We may also collect technical data such as IP address and browser type automatically.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">How We Use Your Information</h2>
          <p>We use the information you provide to contact you regarding your property, make cash offers, and deliver the services you requested. We do not sell your personal information to third parties.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">Contact Us</h2>
          <p>If you have questions about this Privacy Policy, contact us at <a href={`tel:${config.phoneHref}`} className="underline">{config.phoneDisplay}</a>.</p>
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