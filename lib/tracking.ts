// Capture UTM parameters, click IDs, and IP address

interface TrackingData {
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  utm_term: string
  fbclid: string
  gclid: string
  msclkid: string
  ttclid: string
  ip: string
  referrer: string
  landing_page: string
  user_agent: string
}

export function captureTrackingData(): TrackingData {
  if (typeof window === "undefined") {
    return {
      utm_source: "", utm_medium: "", utm_campaign: "",
      utm_content: "", utm_term: "", fbclid: "", gclid: "",
      msclkid: "", ttclid: "", ip: "", referrer: "", landing_page: "", user_agent: "",
    }
  }

  const params = new URLSearchParams(window.location.search)

  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    utm_term: params.get("utm_term") || "",
    fbclid: params.get("fbclid") || "",
    gclid: params.get("gclid") || "",
    msclkid: params.get("msclkid") || "",
    ttclid: params.get("ttclid") || "",
    ip: "",
    referrer: document.referrer || "",
    landing_page: window.location.href,
    user_agent: navigator.userAgent || "",
  }
}

// Read the GoFunnel session id captured by the tracking script, in the same
// fallback order the script itself uses. Capturing it client-side and sending
// it in the submit body (rather than relying on the /api/submit route reading
// the gf_sid cookie server-side) keeps attribution intact on Meta in-app-browser
// / Safari ITP traffic, where the cookie often does not round-trip to the server.
export function readGfSid(): string {
  if (typeof window === "undefined") return ""
  const w = window as unknown as { __gf_sid?: string }
  if (w.__gf_sid) return w.__gf_sid
  try {
    const ls = localStorage.getItem("gf_sid")
    if (ls) return ls
  } catch {
    // localStorage unavailable
  }
  const m = document.cookie.match(/(?:^|; )gf_sid=([^;]*)/)
  if (m) return decodeURIComponent(m[1])
  return new URLSearchParams(window.location.search).get("sid") || ""
}

export async function getIPAddress(): Promise<string> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(3000) })
    const data = await res.json()
    return data.ip || ""
  } catch {
    return ""
  }
}