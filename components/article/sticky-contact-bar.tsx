"use client"

import { useEffect, useState } from "react"

// Sticky bottom text/call bar for the advertorial articles. Mirrors ContactCTA's
// behavior: "Text" opens the SMS app pre-filled with the keyword ("OFFER"), "Call"
// dials. Both fire the Facebook pixel. Reveals after the reader scrolls past the hero.

interface StickyContactBarProps {
  phoneDisplay: string
  phoneHref: string
  smsKeyword?: string
}

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

export function StickyContactBar({
  phoneDisplay,
  phoneHref,
  smsKeyword = "OFFER",
}: StickyContactBarProps) {
  const [show, setShow] = useState(false)
  const num = dialable(phoneHref)
  const smsHref = `sms:${num}?&body=${encodeURIComponent(smsKeyword)}`
  const telHref = `tel:${num}`

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-[#e5e5e5] bg-white/95 backdrop-blur-sm shadow-[0_-4px_16px_rgba(0,0,0,0.08)] transition-transform duration-300 ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-auto flex max-w-[760px] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <a
          href={smsHref}
          onClick={() => fireFb("ClickToText")}
          className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#1f8a4c] px-4 py-3 text-[15px] font-extrabold text-white no-underline transition-colors hover:bg-[#176e3c] sm:text-[16px]"
        >
          💬 Text Us &quot;{smsKeyword}&quot;
        </a>
        <a
          href={telHref}
          onClick={() => fireFb("ClickToCall")}
          className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#1a4d8f] px-4 py-3 text-[15px] font-extrabold text-white no-underline transition-colors hover:bg-[#143a6b] sm:text-[16px]"
        >
          📞 <span className="hidden xs:inline">Call</span>
          <span className="sm:inline">{phoneDisplay}</span>
        </a>
      </div>
    </div>
  )
}
