"use client"

// Two-button call to action used on the thank-you page and every article.
// - "Text Us Now"  -> opens the prospect's SMS app, pre-addressed to the client,
//   pre-filled with the keyword (default "OFFER") so they just hit send and the
//   client's CRM catches the keyword.
// - "Call Now"     -> tel: link to the client.
// Both clicks fire the Facebook pixel (Contact + a custom event) for attribution.

interface ContactCTAProps {
  phoneDisplay: string
  phoneHref: string
  smsKeyword?: string
  heading?: string
  subheading?: string
}

// Normalize to an E.164-ish dialable string: keep a leading +, else assume US (+1).
function dialable(raw: string): string {
  const trimmed = (raw || "").trim()
  if (trimmed.startsWith("+")) return trimmed.replace(/[^\d+]/g, "")
  const digits = trimmed.replace(/\D/g, "")
  return digits.length === 10 ? `+1${digits}` : `+${digits}`
}

function fireFb(custom: string) {
  if (typeof window !== "undefined" && typeof (window as any).fbq === "function") {
    ;(window as any).fbq("track", "Contact")
    ;(window as any).fbq("trackCustom", custom)
  }
}

export function ContactCTA({
  phoneDisplay,
  phoneHref,
  smsKeyword = "OFFER",
  heading = "Ready to get your cash offer?",
  subheading = "Send us a quick text or give us a call. A local team member will get right back to you.",
}: ContactCTAProps) {
  const num = dialable(phoneHref)
  const smsHref = `sms:${num}?&body=${encodeURIComponent(smsKeyword)}`
  const telHref = `tel:${num}`

  return (
    <div className="my-10 rounded-[14px] border-2 border-[#1a4d8f] bg-[#f5f9ff] px-6 py-8 text-center max-w-[620px] mx-auto">
      <h3 className="text-[22px] md:text-[25px] font-extrabold text-[#1a1a1a]">{heading}</h3>
      <p className="mt-2 mb-6 text-[15px] text-[#4a4a4a]">{subheading}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={smsHref}
          onClick={() => fireFb("ClickToText")}
          className="inline-flex items-center justify-center gap-2 bg-[#1f8a4c] hover:bg-[#176e3c] text-white font-extrabold text-[17px] px-6 py-4 rounded-[10px] transition-colors no-underline"
        >
          💬 Text Us "{smsKeyword}"
        </a>
        <a
          href={telHref}
          onClick={() => fireFb("ClickToCall")}
          className="inline-flex items-center justify-center gap-2 bg-[#1a4d8f] hover:bg-[#143a6b] text-white font-extrabold text-[17px] px-6 py-4 rounded-[10px] transition-colors no-underline"
        >
          📞 Call {phoneDisplay}
        </a>
      </div>
      <p className="mt-4 text-[13px] text-[#6b6b6b]">No cost. No obligation. No pushy sales calls.</p>
    </div>
  )
}
