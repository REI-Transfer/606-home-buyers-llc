"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

// Read pixel ID from NEXT_PUBLIC_ env var — empty string = pixel disabled
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID || ""

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void
    _fbq: (...args: unknown[]) => void
  }
}

export function FacebookPixel() {
  const pathname = usePathname()

  useEffect(() => {
    if (!FB_PIXEL_ID) return // Pixel not configured — skip

    if (window.fbq) return // Already loaded

    const fbq = function (...args: unknown[]) {
      ;(fbq as any).callMethod
        ? (fbq as any).callMethod(...args)
        : (fbq as any).queue.push(args)
    }
    ;(fbq as any).push = fbq
    ;(fbq as any).loaded = true
    ;(fbq as any).version = "2.0"
    ;(fbq as any).queue = []
    window.fbq = fbq
    window._fbq = fbq

    const s = document.createElement("script")
    s.async = true
    s.src = "https://connect.facebook.net/en_US/fbevents.js"
    document.getElementsByTagName("script")[0]?.parentNode?.insertBefore(
      s,
      document.getElementsByTagName("script")[0]
    )

    window.fbq("init", FB_PIXEL_ID)
  }, [])

  useEffect(() => {
    if (!FB_PIXEL_ID) return
    if (window.fbq) window.fbq("track", "PageView")
  }, [pathname])

  if (!FB_PIXEL_ID) return null

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  )
}
