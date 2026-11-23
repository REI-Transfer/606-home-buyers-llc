import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Form funnel pings (lib/form-funnel.ts) → the central collector, which saves them for
// the internal dashboard. Adds which site and device; no personal data, no IP. Always
// answers 204 and never blocks the form.
const COLLECTOR_URL = process.env.FUNNEL_COLLECTOR_URL || "https://rei-funnel-collector.vercel.app/api/collect"

const device = (ua: string): string =>
  /ipad|tablet|kindle|silk|(android(?!.*mobile))/i.test(ua) ? "tablet" : /mobi|iphone|android/i.test(ua) ? "phone" : "desktop"

export async function POST(req: Request) {
  try {
    const ping = JSON.parse(await req.text()) as Record<string, unknown>
    const ua = req.headers.get("user-agent") || ""
    if (/bot|crawl|spider|headless|lighthouse|preview/i.test(ua)) return new NextResponse(null, { status: 204 })
    await fetch(COLLECTOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...ping,
        site: (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").slice(0, 100),
        repo: process.env.VERCEL_GIT_REPO_SLUG || "",
        device: device(ua),
        user_agent: ua.slice(0, 300),
      }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {})
  } catch { /* tracking must never affect the seller */ }
  return new NextResponse(null, { status: 204 })
}
