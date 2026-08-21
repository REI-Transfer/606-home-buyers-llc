import Image from "next/image"
import Link from "next/link"
import { CheckCircle2, Phone, MessageSquare } from "lucide-react"
import config from "@/lib/config"
import { ClickToPlayVideo } from "@/components/thankyou/click-to-play-video"
import { ContactCTA } from "@/components/article/contact-cta"
import { ARTICLES } from "@/lib/articles"
import { isYouTubeUrl, toYouTubeEmbed } from "@/lib/youtube"

const RECOMMENDED_READS = ARTICLES.slice(0, 4)

// Per-client env vars (read on the server). All optional — when unset, the
// page falls back to the original simpler layout so non-ABQ clients are
// unaffected.
const TOP_VIDEO_URL = process.env.NEXT_PUBLIC_THANKYOU_TOP_VIDEO_URL || ""
const VIDEO_2_URL = process.env.NEXT_PUBLIC_THANKYOU_VIDEO_2_URL || ""
const VIDEO_2_TITLE = process.env.NEXT_PUBLIC_THANKYOU_VIDEO_2_TITLE || ""
const VIDEO_2_SUBTITLE = process.env.NEXT_PUBLIC_THANKYOU_VIDEO_2_SUBTITLE || ""
const VIDEO_3_URL = process.env.NEXT_PUBLIC_THANKYOU_VIDEO_3_URL || ""
const VIDEO_3_TITLE = process.env.NEXT_PUBLIC_THANKYOU_VIDEO_3_TITLE || ""
const VIDEO_3_SUBTITLE = process.env.NEXT_PUBLIC_THANKYOU_VIDEO_3_SUBTITLE || ""
const CALLIN_DISPLAY = process.env.NEXT_PUBLIC_CALLIN_DISPLAY || ""
const CALLIN_HREF = process.env.NEXT_PUBLIC_CALLIN_HREF || ""
const FOUNDER_NOTE = process.env.NEXT_PUBLIC_FOUNDER_NOTE || ""
const HIGHLIGHT_COLOR = process.env.NEXT_PUBLIC_HIGHLIGHT_COLOR || "#FACC15"

function truthy(v: string | undefined) {
  const s = (v || "").trim().toLowerCase()
  return s === "1" || s === "true" || s === "yes" || s === "on"
}
const SHOW_ARTICLES = truthy(process.env.NEXT_PUBLIC_THANKYOU_SHOW_ARTICLES)
const SHOW_NEXT_STEPS = truthy(process.env.NEXT_PUBLIC_THANKYOU_SHOW_NEXT_STEPS)

// New "v2" thank-you layout activates only when the top video env var is set.
// Existing clients without the env var see the original layout untouched.
const useV2Layout = Boolean(TOP_VIDEO_URL)

export default function ThankYouPage() {
  if (useV2Layout) return <ThankYouV2 />
  return <ThankYouV1 />
}

function ThankYouV2() {
  const followupVideos = [
    { url: VIDEO_2_URL, title: VIDEO_2_TITLE, subtitle: VIDEO_2_SUBTITLE },
    { url: VIDEO_3_URL, title: VIDEO_3_TITLE, subtitle: VIDEO_3_SUBTITLE },
  ].filter((v) => v.url)

  const callinDisplay = CALLIN_DISPLAY || config.phoneDisplay
  const callinHref = (CALLIN_HREF || config.phoneHref || "").replace(/^tel:/, "")
  const founderParas = FOUNDER_NOTE.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

  return (
    <main className="relative min-h-screen bg-[#FAFAF9]">
      {config.logoUrl && (
        <header className="bg-white border-b border-gray-200">
          <div className="mx-auto max-w-5xl px-4 py-5 flex items-center justify-between">
            <div className="relative h-16 md:h-24 w-[200px] md:w-[300px] flex-shrink-0">
              <Image
                src={config.logoUrl}
                alt={config.companyName}
                fill
                unoptimized
                className="object-contain object-left"
              />
            </div>
            <a
              href={`tel:${callinHref}`}
              className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-black transition-colors"
            >
              <Phone className="h-4 w-4" />
              {callinDisplay}
            </a>
          </div>
        </header>
      )}

      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 pt-12 pb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900">
            <CheckCircle2 className="h-7 w-7" style={{ color: HIGHLIGHT_COLOR }} />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 text-balance">
            Thanks. Your Info Is In.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base md:text-lg text-gray-600">
            Watch the short video below{config.ownerName ? ` from ${config.ownerName}` : ""} so you know exactly what to expect next.
          </p>
        </div>
      </section>

      <section className="bg-white pb-12">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-4 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              {process.env.NEXT_PUBLIC_THANKYOU_TOP_VIDEO_TITLE || "Thank You for Filling Out the Form"}
            </h2>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-black">
            {isYouTubeUrl(TOP_VIDEO_URL) ? (
              <iframe
                src={`${toYouTubeEmbed(TOP_VIDEO_URL)}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`}
                title={process.env.NEXT_PUBLIC_THANKYOU_TOP_VIDEO_TITLE || "Thank You for Filling Out the Form"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full block"
                style={{ aspectRatio: "16/9", border: 0 }}
              />
            ) : (
              <video
                src={TOP_VIDEO_URL}
                autoPlay
                muted
                playsInline
                controls
                className="w-full block"
                style={{ aspectRatio: "16/9", objectFit: "cover" }}
              />
            )}
          </div>
        </div>
      </section>

      {callinDisplay && (
        <section className="bg-[#FAFAF9]">
          <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
            <div className="rounded-2xl bg-white shadow-md ring-1 ring-gray-200 px-6 py-10 md:px-10 md:py-12 text-center">
              <p className="uppercase tracking-widest text-xs font-semibold mb-3 text-gray-500">
                Important
              </p>
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-balance text-gray-900">
                Expect a call or text from{" "}
                <span
                  className="whitespace-nowrap rounded-md px-2 py-0.5"
                  style={{ backgroundColor: HIGHLIGHT_COLOR, color: "#0F1D2F" }}
                >
                  {callinDisplay}
                </span>
              </h2>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
                That number is our local team. Save it to your phone so you don't miss us.
                Prefer to reach out first? Call or text us directly and let us know how you'd like to be contacted.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={`tel:${callinHref}`}
                  className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-base font-semibold text-gray-900 hover:opacity-90 transition-opacity w-full sm:w-auto justify-center shadow"
                  style={{ backgroundColor: HIGHLIGHT_COLOR }}
                >
                  <Phone className="h-5 w-5" />
                  Call {callinDisplay}
                </a>
                <a
                  href={`sms:${callinHref}`}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 hover:bg-black px-8 py-3 text-base font-semibold text-white transition-colors w-full sm:w-auto justify-center"
                >
                  <MessageSquare className="h-5 w-5" />
                  Text Us Instead
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {followupVideos.length > 0 && (
        <section className="bg-[#FAFAF9] py-14 md:py-20">
          <div className="mx-auto max-w-4xl px-4">
            <div className="text-center mb-10">
              <p className="uppercase tracking-widest text-xs font-semibold text-gray-500 mb-2">While You Wait</p>
              <h2 className="text-2xl md:text-4xl font-bold text-gray-900 text-balance">
                Quick answers to what most sellers ask next.
              </h2>
            </div>
            <div className="space-y-12">
              {followupVideos.map((v) => (
                <div key={v.url}>
                  {(v.title || v.subtitle) && (
                    <div className="mb-4 text-center">
                      {v.title && <h3 className="text-xl md:text-2xl font-bold text-gray-900">{v.title}</h3>}
                      {v.subtitle && <p className="text-sm md:text-base text-gray-600 mt-1">{v.subtitle}</p>}
                    </div>
                  )}
                  <ClickToPlayVideo src={v.url} title={v.title || "Video"} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {SHOW_ARTICLES && (
        <section className="bg-white border-t border-gray-200">
          <div className="mx-auto max-w-2xl px-4 py-14 md:py-20">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 md:p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-1">While You Wait, a Few Honest Reads</h3>
              <p className="text-sm text-gray-500 mb-5">
                Straight talk on the questions almost every homeowner asks before they sell.
              </p>
              <div className="grid grid-cols-1 gap-3">
                {RECOMMENDED_READS.map((a) => (
                  <Link
                    key={a.slug}
                    href={a.slug}
                    className="group flex gap-4 rounded-xl border border-gray-200 p-3 transition-colors hover:bg-gray-50 no-underline"
                  >
                    <Image
                      src={a.image}
                      alt={a.title}
                      width={120}
                      height={90}
                      className="h-[72px] w-[96px] sm:h-[84px] sm:w-[112px] shrink-0 rounded-lg object-cover bg-gray-100"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 leading-snug">{a.title}</div>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{a.teaser}</p>
                      <span className="mt-1 inline-block text-sm font-semibold" style={{ color: config.accentColor }}>
                        Read the article &rarr;
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link href="/articles" className="text-sm font-semibold underline" style={{ color: config.accentColor }}>
                  See all articles
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {SHOW_NEXT_STEPS && (
        <section className="bg-[#FAFAF9]">
          <div className="mx-auto max-w-2xl px-4 py-14 md:py-20">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 md:p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">What Happens Next</h3>
              <div className="space-y-4">
                {[
                  { step: "1", title: "We review your property", desc: "Our team looks at your submission and researches the property." },
                  { step: "2", title: "You get a cash offer", desc: "Within 24 hours, we’ll reach out with a fair, no-obligation offer." },
                  { step: "3", title: "You choose your closing date", desc: "If you accept, you pick the date. We handle the rest." },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-4">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: config.accentColor }}
                    >
                      {step}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{title}</p>
                      <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {founderParas.length > 0 && (
        <section className="bg-white border-t border-gray-200">
          <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
            <p className="uppercase tracking-widest text-xs font-semibold text-gray-500 mb-3 text-center">
              A Note From The Founder
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-6 text-balance">
              From {config.ownerName || "Our Founder"}, {config.companyName}
            </h2>

            {config.headshotUrl && (
              <div className="flex justify-center mb-6">
                <div className="relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-gray-200">
                  <Image
                    src={config.headshotUrl}
                    alt={config.ownerName || config.companyName}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            <div className="space-y-4 text-gray-700 text-base md:text-lg leading-relaxed">
              {founderParas.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {config.ownerName && (
                <p>
                  Talk soon,
                  <br />
                  <span className="font-semibold text-gray-900">{config.ownerName}</span>
                  <br />
                  <span className="text-sm text-gray-500">Founder, {config.companyName}</span>
                </p>
              )}
            </div>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={`tel:${callinHref}`}
                className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-3 text-base font-semibold text-white hover:bg-black transition-colors w-full sm:w-auto justify-center"
              >
                <Phone className="h-5 w-5" />
                Call {callinDisplay}
              </a>
              <a
                href={`sms:${callinHref}`}
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-base font-semibold text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center"
              >
                <MessageSquare className="h-5 w-5" />
                Text Us Instead
              </a>
            </div>
          </div>
        </section>
      )}

      <footer className="bg-white border-t border-gray-200 py-8 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} {config.companyName}. All rights reserved.
      </footer>
    </main>
  )
}

function ThankYouV1() {
  return (
    <main className="min-h-screen bg-gray-50">

      <div className="mx-auto max-w-2xl px-4 py-12 md:py-20">
        {/* Confirmation icon */}
        <div className="flex justify-center mb-6">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: `${config.accentColor}20` }}
          >
            <CheckCircle2 className="h-8 w-8" style={{ color: config.accentColor }} />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
            Thank You for Your Submission!
          </h1>
          <p className="mt-3 text-lg text-gray-600 max-w-lg mx-auto">
            The {config.companyName} team has received your information and will be in touch within{" "}
            <strong>24 hours</strong> with your cash offer. In the meantime, here are answers to common questions.
          </p>
        </div>

        {/* Video section */}
        {process.env.NEXT_PUBLIC_THANKYOU_VIDEO_URL && (
          <div className="mb-8">
            <h2 className="mb-3 text-center text-xl font-bold text-gray-900">
              Watch This While You Wait
            </h2>
            <div className="mx-auto max-w-xs overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <video
                src={process.env.NEXT_PUBLIC_THANKYOU_VIDEO_URL}
                controls
                playsInline
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Personal note card */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 md:p-8 mb-6">
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">
            A Personal Note
          </p>
          {config.ownerName ? (
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              From {config.ownerName}
            </h2>
          ) : (
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              From Our Team
            </h2>
          )}

          {/* Owner headshot (if available) */}
          {config.headshotUrl && (
            <div className="flex items-center gap-3 mb-5">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border-2" style={{ borderColor: config.accentColor }}>
                <Image
                  src={config.headshotUrl}
                  alt={config.ownerName || config.companyName}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{config.ownerName || config.companyName}</p>
                <p className="text-xs text-gray-500">{config.companyName}</p>
              </div>
            </div>
          )}

          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              If you&apos;re reading this, you just took a step that most homeowners put off for months, sometimes years.
              So before anything else, we want you to know that was the right call.
            </p>
            <p>
              Selling a house is stressful. The uncertainty, the waiting, the feeling like you&apos;re at the mercy of a system
              that wasn&apos;t built for you. Realtors want you to fix everything up, stage the house, wait 90 days,
              and hope for the best. That works for some people. It does not work for everyone.
            </p>
            <p>
              We started {config.companyName} because we kept meeting good people stuck in tough spots. Inherited properties
              they couldn&apos;t afford to keep. Houses that needed more work than they had time or money for. Divorces,
              job relocations, tax liens. Life happens. And when it does, the last thing you need is someone telling
              you to repaint your kitchen and &ldquo;list it in the spring.&rdquo;
            </p>
            <p>
              Here&apos;s what happens next: Our team is going to review the information you submitted. Within 24 hours,
              you&apos;ll hear from us with a fair, no-obligation cash offer. No pressure. No games. If the number works
              for you, great. If it doesn&apos;t, no hard feelings. We&apos;ll still answer any questions you have.
            </p>
          </div>
        </div>

        {/* While you wait: advertorial reads */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 md:p-8 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">While You Wait, a Few Honest Reads</h3>
          <p className="text-sm text-gray-500 mb-5">
            Straight talk on the questions almost every homeowner asks before they sell.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {RECOMMENDED_READS.map((a) => (
              <Link
                key={a.slug}
                href={a.slug}
                className="group flex gap-4 rounded-xl border border-gray-200 p-3 transition-colors hover:bg-gray-50 no-underline"
              >
                <Image
                  src={a.image}
                  alt={a.title}
                  width={120}
                  height={90}
                  className="h-[72px] w-[96px] sm:h-[84px] sm:w-[112px] shrink-0 rounded-lg object-cover bg-gray-100"
                />
                <div className="min-w-0">
                  <div className="font-bold text-gray-900 leading-snug">{a.title}</div>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{a.teaser}</p>
                  <span className="mt-1 inline-block text-sm font-semibold" style={{ color: config.accentColor }}>
                    Read the article &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link href="/articles" className="text-sm font-semibold underline" style={{ color: config.accentColor }}>
              See all articles
            </Link>
          </div>
        </div>

        {/* Text / call CTA */}
        <ContactCTA
          phoneDisplay={config.phoneDisplay}
          phoneHref={config.phoneHref}
          smsKeyword={config.smsKeyword}
          heading="Want your offer faster? Reach us now."
          subheading="Tap to text us the word OFFER, or call and a local team member will pick up."
        />

        {/* What happens next */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 md:p-8 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">What Happens Next</h3>
          <div className="space-y-4">
            {[
              { step: "1", title: "We review your property", desc: "Our team looks at your submission and researches the property." },
              { step: "2", title: "You get a cash offer", desc: "Within 24 hours, we’ll reach out with a fair, no-obligation offer." },
              { step: "3", title: "You choose your closing date", desc: "If you accept, you pick the date. We handle the rest." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: config.accentColor }}
                >
                  {step}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{title}</p>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call CTA */}
        <div className="text-center">
          <p className="text-gray-500 mb-4">Have questions in the meantime? Give us a call.</p>
          <a
            href={`tel:${config.phoneHref}`}
            className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-lg font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: config.accentColor }}
          >
            <Phone className="h-5 w-5" />
            {config.phoneDisplay}
          </a>
          <p className="mt-10 text-sm text-gray-400">
            &copy; {new Date().getFullYear()} {config.companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  )
}
