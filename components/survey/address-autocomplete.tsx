"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { MapPin } from "lucide-react"
import { getAddressBounds } from "@/lib/service-area"

export interface AddressDetails {
  formattedAddress: string
  lat?: number
  lng?: number
  state?: string
  city?: string
  county?: string
  zip?: string
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
  allowedCounties?: string[]
  placeholder?: string
  // Enter / the phone keyboard's "Go" key. Pass the same handler as the page's
  // button. Without it, Enter looks up the typed address directly.
  onSubmit?: () => void
  // Overrides where the "tap your address" hint sits (e.g. the compact header).
  hintClassName?: string
}

export interface AddressAutocompleteHandle {
  // Looks up what the visitor typed (first Google prediction) and runs the same
  // select path as tapping a suggestion, area checks included. Resolves to
  // "selected" or "outOfArea"; shows the hint and resolves false when nothing
  // is found.
  resolveTyped: () => Promise<PlaceOutcome | false>
}

type PlaceOutcome = "selected" | "outOfArea"

const PLACE_FIELDS = ["formatted_address", "address_components", "geometry"]
const HINT_PICK = "Please tap your address in the list so we can find it."
const HINT_EMPTY = "Please enter your property address."

// Google never calls back when the key or network fails, so cap each lookup
// and fall through to the hint instead of hanging silently.
function withTimeout<T>(promise: Promise<T>, fallback: T, ms = 5000): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))])
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

export const AddressAutocomplete = forwardRef<AddressAutocompleteHandle, AddressAutocompleteProps>(function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onOutOfArea,
  serviceAreas = [],
  allowedStates = [],
  allowedCounties = [],
  placeholder = "Start typing your address...",
  onSubmit,
  hintClassName,
}, ref) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hint, setHint] = useState("")
  const resolvingRef = useRef(false)

  // NEXT_PUBLIC_ADDRESS_BOUNDS (or NEXT_PUBLIC_SERVICE_AREAS circles), else the
  // serviceAreas prop circles, else undefined (nationwide).
  const searchBounds = (): google.maps.LatLngBounds | undefined => {
    const box = getAddressBounds()
    if (box) return new google.maps.LatLngBounds({ lat: box.south, lng: box.west }, { lat: box.north, lng: box.east })

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
    return bounds
  }

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

    const bounds = searchBounds()

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "us" },
      types: ["address"],
      fields: PLACE_FIELDS,
      // strictBounds when a service-area box exists keeps out-of-area suggestions
      // out of the dropdown (not just biased). No bounds = nationwide (no restriction).
      ...(bounds ? { bounds, strictBounds: true } : {}),
    })

    autocompleteRef.current.addListener("place_changed", () => {
      handlePlaceRef.current(autocompleteRef.current?.getPlace())
    })
  }

  // One select path for both a tapped suggestion and a typed-then-submitted
  // address. Kept in a ref so the Google listener always calls the latest
  // props rather than the ones from the first render.
  const handlePlaceRef = useRef<(place?: google.maps.places.PlaceResult) => PlaceOutcome | undefined>(() => undefined)
  handlePlaceRef.current = (place) => {
    if (!place?.formatted_address) return

    let state = ""
    let city = ""
    let county = ""
    let zip = ""
    let lat: number | undefined
    let lng: number | undefined

    place.address_components?.forEach((component) => {
      if (component.types.includes("administrative_area_level_1")) state = component.short_name
      if (component.types.includes("locality")) city = component.long_name
      if (component.types.includes("administrative_area_level_2")) county = component.long_name
      if (component.types.includes("postal_code")) zip = component.short_name
    })

    if (place.geometry?.location) {
      lat = place.geometry.location.lat()
      lng = place.geometry.location.lng()
    }

    const details: AddressDetails = { formattedAddress: place.formatted_address, lat, lng, state, city, county, zip }

    // State allow-list gate (env ALLOWED_STATES). When set, any address whose
    // state is not in the list is treated as out-of-area. Empty → no gate.
    if (allowedStates.length > 0 && (!state || !allowedStates.map(s => s.toUpperCase()).includes(state.toUpperCase()))) {
      onChange(place.formatted_address)
      onOutOfArea?.(place.formatted_address)
      return "outOfArea"
    }

    // County allow-list gate (env ALLOWED_COUNTIES), STATE-SCOPED via ALLOWED_STATES:
    // county names repeat across states (Montgomery, Harris, ...), so require the address
    // state to be in ALLOWED_STATES AND the county in the list. Google Places gives the
    // county as long_name (e.g. "Harris County"); normalize by stripping " County".
    // Empty ALLOWED_COUNTIES -> no county gate; empty ALLOWED_STATES -> no state scoping.
    if (allowedCounties.length > 0) {
      const normCounty = (c: string) => (c || "").replace(/\s+county$/i, "").trim().toLowerCase()
      const inList = allowedCounties.map(normCounty).includes(normCounty(county))
      const stateOk = allowedStates.length === 0
        ? true
        : (!!state && allowedStates.map(s => s.toUpperCase()).includes(state.toUpperCase()))
      if (!(stateOk && county && inList)) {
        onChange(place.formatted_address)
        onOutOfArea?.(place.formatted_address)
        return "outOfArea"
      }
    }

    // Service area validation
    if (serviceAreas.length > 0 && lat !== undefined && lng !== undefined) {
      if (!isInServiceArea(lat, lng, serviceAreas)) {
        onChange(place.formatted_address)
        onOutOfArea?.(place.formatted_address)
        return "outOfArea"
      }
    }

    onChange(place.formatted_address)
    onSelect(place.formatted_address, details)
    return "selected"
  }

  const showHint = (msg: string) => {
    setHint(msg)
    inputRef.current?.focus()
  }

  const resolveTyped = async (): Promise<PlaceOutcome | false> => {
    const input = (inputRef.current?.value ?? value ?? "").trim()
    if (!input) { showHint(HINT_EMPTY); return false }
    const places = window.google?.maps?.places
    if (!places) { showHint(HINT_PICK); return false }
    if (resolvingRef.current) return false
    resolvingRef.current = true
    try {
      const sessionToken = new places.AutocompleteSessionToken()
      const box = searchBounds()
      const predictions = await withTimeout(new Promise<google.maps.places.AutocompletePrediction[]>((resolve) => {
        new places.AutocompleteService().getPlacePredictions(
          // locationBias is the current name for the request's `bounds`: it ranks
          // in-area matches first but still finds an out-of-area address, so the
          // area check can show its own "outside our buying area" message.
          { input, componentRestrictions: { country: "us" }, types: ["address"], sessionToken, ...(box ? { locationBias: box } : {}) },
          (results, status) => resolve(status === places.PlacesServiceStatus.OK && results ? results : [])
        )
      }), [])
      if (!predictions[0]) { showHint(HINT_PICK); return false }
      const place = await withTimeout(new Promise<google.maps.places.PlaceResult | null>((resolve) => {
        new places.PlacesService(document.createElement("div")).getDetails(
          { placeId: predictions[0].place_id, fields: PLACE_FIELDS, sessionToken },
          (result, status) => resolve(status === places.PlacesServiceStatus.OK ? result : null)
        )
      }), null)
      const outcome = place?.formatted_address ? handlePlaceRef.current(place) : undefined
      if (!outcome) { showHint(HINT_PICK); return false }
      setHint("")
      return outcome
    } catch {
      showHint(HINT_PICK)
      return false
    } finally {
      resolvingRef.current = false
    }
  }

  useImperativeHandle(ref, () => ({ resolveTyped }))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    // Visitor arrowed onto a suggestion: Google selects it itself.
    const suggestionHighlighted = Array.from(document.querySelectorAll<HTMLElement>(".pac-container")).some(
      (c) => c.style.display !== "none" && c.querySelector(".pac-item-selected")
    )
    if (suggestionHighlighted) return
    e.preventDefault()
    if (onSubmit) onSubmit()
    else void resolveTyped()
  }

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          <MapPin className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => { setHint(""); onChange(e.target.value) }}
          onKeyDownCapture={handleKeyDown}
          enterKeyHint="go"
          className="h-12 pl-10 rounded-xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-[var(--accent)] focus:ring-[var(--accent)]/20"
        />
        {!isLoaded && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[var(--accent)]" />
          </div>
        )}
      </div>
      {hint && (
        <p role="alert" className={hintClassName ?? "mt-2 text-center text-sm font-medium"} style={{ color: "#dc2626" }}>
          {hint}
        </p>
      )}
    </div>
  )
})
