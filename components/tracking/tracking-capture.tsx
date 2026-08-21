"use client"

/**
 * TrackingCapture — on mount, captures attribution signals (UTMs, click IDs,
 * _fbp/_fbc cookies, referrer, first-touch URL, timestamp) into sessionStorage
 * so the multi-step form can attach them to the lead at submit. First-touch
 * wins (never overwrites). Renders nothing.
 */

import { useEffect } from "react"

const STORAGE_KEY = "rei_tracking_v1"

type TrackingPayload = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  fbclid?: string
  gclid?: string
  ttclid?: string
  msclkid?: string
  fbp?: string
  fbc?: string
  referrer?: string
  landing_url?: string
  captured_at?: string
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)"))
  return match ? decodeURIComponent(match[1]) : undefined
}

export function TrackingCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return

    let existing: TrackingPayload = {}
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) existing = JSON.parse(raw) as TrackingPayload
    } catch { /* ignore */ }

    const params = new URLSearchParams(window.location.search)
    const fresh: TrackingPayload = { ...existing }

    const urlKeys = [
      "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
      "fbclid", "gclid", "ttclid", "msclkid",
    ] as const

    for (const k of urlKeys) {
      const v = params.get(k)
      if (v && !fresh[k]) fresh[k] = v
    }

    const fbp = readCookie("_fbp")
    const fbc = readCookie("_fbc")
    if (fbp && !fresh.fbp) fresh.fbp = fbp
    if (fbc && !fresh.fbc) fresh.fbc = fbc

    if (!fresh.referrer) fresh.referrer = document.referrer || ""
    if (!fresh.landing_url) fresh.landing_url = window.location.href
    if (!fresh.captured_at) fresh.captured_at = new Date().toISOString()

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    } catch { /* storage may be disabled */ }
  }, [])

  return null
}

export function readCapturedTracking(): TrackingPayload {
  if (typeof window === "undefined") return {}
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as TrackingPayload
  } catch {
    return {}
  }
}
