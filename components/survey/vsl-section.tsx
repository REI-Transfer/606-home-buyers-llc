"use client"

import { useEffect, useRef, useCallback } from "react"

// Reads from NEXT_PUBLIC_ env vars — empty = hide VSL entirely
const VIDALYTICS_ACCOUNT_ID = process.env.NEXT_PUBLIC_VIDALYTICS_ACCOUNT_ID || ""
const VIDALYTICS_EMBED_ID = process.env.NEXT_PUBLIC_VIDALYTICS_EMBED_ID || ""

export function VSLSection() {
  const initialized = useRef(false)

  const loadVidalytics = useCallback(() => {
    if (!VIDALYTICS_ACCOUNT_ID || !VIDALYTICS_EMBED_ID) return

    const embedId = `vidalytics_embed_${VIDALYTICS_EMBED_ID}`
    const loaderUrl = `https://fast.vidalytics.com/embeds/${VIDALYTICS_ACCOUNT_ID}/${VIDALYTICS_EMBED_ID}/`

    const targetElement = document.getElementById(embedId)
    if (!targetElement) return

    const v = window as any
    if (v[`_vidalytics_initialized_${embedId}`]) return
    v[`_vidalytics_initialized_${embedId}`] = true

    const i = document
    const d = "Vidalytics"
    const y = "_" + d.toLowerCase()
    const c = d + "L"

    if (!v[d]) v[d] = {}
    if (!v[c]) v[c] = {}
    if (!v[y]) v[y] = {}

    const vl = "Loader"
    let vli = v[y][vl]
    let vsl = v[c][vl + "Script"]
    let vlf = v[c][vl + "Loaded"]
    const ve = "Embed"
    let t: any

    if (!vsl) {
      vsl = function (u: string, cb: () => void) {
        if (t) { cb(); return }
        const s = i.createElement("script")
        s.type = "text/javascript"
        s.async = true
        s.src = u
        s.onload = function () { vlf = 1; cb() }
        i.getElementsByTagName("head")[0].appendChild(s)
      }
    }

    vsl(loaderUrl + "loader.min.js", function () {
      if (!document.getElementById(embedId)) return
      if (!vli) {
        const vlc = v[c][vl]
        vli = new vlc()
      }
      vli.loadScript(loaderUrl + "player.min.js", function () {
        if (!document.getElementById(embedId)) return
        const vec = v[d][ve]
        t = new vec()
        t.run(embedId)
      })
    })
  }, [])

  useEffect(() => {
    if (!VIDALYTICS_ACCOUNT_ID || !VIDALYTICS_EMBED_ID) return
    if (initialized.current) return
    initialized.current = true

    const embedId = `vidalytics_embed_${VIDALYTICS_EMBED_ID}`
    const el = document.getElementById(embedId)
    if (el && el.children.length > 0) return

    requestAnimationFrame(() => { loadVidalytics() })
  }, [loadVidalytics])

  // If not configured, render nothing
  if (!VIDALYTICS_ACCOUNT_ID || !VIDALYTICS_EMBED_ID) return null

  const embedId = `vidalytics_embed_${VIDALYTICS_EMBED_ID}`

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-xl md:rounded-2xl border border-gray-200 bg-white shadow-md md:shadow-lg">
        <div
          id={embedId}
          style={{ width: "100%", position: "relative", paddingTop: "56.25%" }}
        />
      </div>
    </div>
  )
}
