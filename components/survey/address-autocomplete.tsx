"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { MapPin } from "lucide-react"

export interface AddressDetails {
  formattedAddress: string
  lat?: number
  lng?: number
  state?: string
  city?: string
  county?: string
}

export interface ServiceArea {
  id: string
  centerLat: number
  centerLng: number
  radiusMiles: number
}

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string) => void
  onSelect: (address: string, details: AddressDetails) => void
  onOutOfArea?: (address: string) => void
  serviceAreas?: ServiceArea[]
  // 2-letter US state codes to ALLOW. Empty → no state gate. Out-of-list
  // states are routed through onOutOfArea (same block path as out-of-service-area).
  allowedStates?: string[]
  placeholder?: string
}

declare global {
  interface Window {
    google: typeof google
    initGooglePlaces: () => void
  }
}

function haversineDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function isInServiceArea(lat: number, lng: number, areas: ServiceArea[]): boolean {
  if (!areas || areas.length === 0) return true // no restriction if no areas configured
  // Defensive: ignore malformed entries (e.g. ["StateName"] from the onboarding tool)
  // that have no numeric center, so a bad SERVICE_AREAS value never blocks selection.
  const valid = areas.filter(a => typeof a?.centerLat === "number" && typeof a?.centerLng === "number" && typeof a?.radiusMiles === "number")
  if (valid.length === 0) return true
  return valid.some(area => haversineDistanceMiles(lat, lng, area.centerLat, area.centerLng) <= area.radiusMiles)
}

// Singleton loader: the Google Maps script must load EXACTLY ONCE per page.
// Multiple AddressAutocomplete instances (sticky bar + form + modal) each
// injecting their own <script> makes Places load multiple times -> "included
// multiple times" error -> autocomplete breaks page-wide. This shared promise
// guarantees a single load; every instance awaits it and binds when ready.
let googleMapsPromise: Promise<void> | null = null
function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.google?.maps?.places) return Promise.resolve()
  if (googleMapsPromise) return googleMapsPromise
  googleMapsPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]")
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")))
      if (window.google?.maps?.places) resolve()
      return
    }
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places`
    script.async = true
    script.defer = true
    script.setAttribute("data-google-maps", "true")
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Google Maps failed to load"))
    document.head.appendChild(script)
  })
  return googleMapsPromise
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onOutOfArea,
  serviceAreas = [],
  allowedStates = [],
  placeholder = "Start typing your address...",
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadGoogleMaps()
      .then(() => {
        if (cancelled) return
        setIsLoaded(true)
        initAutocomplete()
      })
      .catch(() => {
        /* key/network failure — input still works as a plain text field */
      })

    return () => {
      cancelled = true
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [])

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) return

    // Build bounds covering all service area circles
    let bounds: google.maps.LatLngBounds | undefined
    const hasServiceAreas = serviceAreas.length > 0
    if (hasServiceAreas) {
      bounds = new google.maps.LatLngBounds()
      serviceAreas.forEach(area => {
        // Approximate circle bounding box (1 degree lat ≈ 69 miles)
        const latOffset = area.radiusMiles / 69
        const lngOffset = area.radiusMiles / (69 * Math.cos(area.centerLat * Math.PI / 180))
        bounds!.extend({ lat: area.centerLat - latOffset, lng: area.centerLng - lngOffset })
        bounds!.extend({ lat: area.centerLat + latOffset, lng: area.centerLng + lngOffset })
      })
    }

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "us" },
      types: ["address"],
      fields: ["formatted_address", "address_components", "geometry"],
      // strictBounds when a service-area box exists keeps out-of-area suggestions
      // out of the dropdown (not just biased). No bounds = nationwide (no restriction).
      ...(bounds ? { bounds, strictBounds: true } : {}),
    })

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace()
      if (!place?.formatted_address) return

      let state = ""
      let city = ""
      let county = ""
      let lat: number | undefined
      let lng: number | undefined

      place.address_components?.forEach((component) => {
        if (component.types.includes("administrative_area_level_1")) state = component.short_name
        if (component.types.includes("locality")) city = component.long_name
        if (component.types.includes("administrative_area_level_2")) county = component.long_name
      })

      if (place.geometry?.location) {
        lat = place.geometry.location.lat()
        lng = place.geometry.location.lng()
      }

      const details: AddressDetails = { formattedAddress: place.formatted_address, lat, lng, state, city, county }

      // State allow-list gate (env ALLOWED_STATES). When set, any address whose
      // state is not in the list is treated as out-of-area. Empty → no gate.
      if (allowedStates.length > 0 && (!state || !allowedStates.map(s => s.toUpperCase()).includes(state.toUpperCase()))) {
        onChange(place.formatted_address)
        onOutOfArea?.(place.formatted_address)
        return
      }

      // Service area validation
      if (serviceAreas.length > 0 && lat !== undefined && lng !== undefined) {
        if (!isInServiceArea(lat, lng, serviceAreas)) {
          onChange(place.formatted_address)
          onOutOfArea?.(place.formatted_address)
          return
        }
      }

      onChange(place.formatted_address)
      onSelect(place.formatted_address, details)
    })
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
        <MapPin className="h-5 w-5 text-gray-400" />
      </div>
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 pl-10 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent)] focus:ring-[var(--accent)]/20"
      />
      {!isLoaded && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[var(--accent)]" />
        </div>
      )}
    </div>
  )
}
