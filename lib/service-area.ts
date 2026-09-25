/**
 * lib/service-area.ts — client-safe service-area gate.
 *
 * Reads NEXT_PUBLIC_SERVICE_AREAS, a JSON array of circles:
 *   [{ "lat": 40.7608, "lng": -111.8910, "radiusMiles": 30 }, ...]
 * (aliases accepted: latitude/longitude, radius_miles/radius).
 *
 * When the list is empty / missing / unparseable, the gate is PERMISSIVE —
 * every address is accepted (no geo-lock). This replaces the old hardcoded
 * Salt Lake bounding box + county allow-list so the template ships area-agnostic.
 */

export interface ServiceCircle {
  lat: number
  lng: number
  radiusMiles: number
}

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : (v as number)
  return typeof n === "number" && Number.isFinite(n) ? n : undefined
}

export function parseServiceAreas(raw?: string): ServiceCircle[] {
  const src = raw ?? process.env.NEXT_PUBLIC_SERVICE_AREAS ?? ""
  if (!src.trim()) return []
  try {
    const parsed = JSON.parse(src)
    if (!Array.isArray(parsed)) return []
    const circles: ServiceCircle[] = []
    for (const c of parsed) {
      if (!c || typeof c !== "object") continue
      const lat = num((c as any).lat ?? (c as any).latitude)
      const lng = num((c as any).lng ?? (c as any).longitude ?? (c as any).lon)
      const radiusMiles = num((c as any).radiusMiles ?? (c as any).radius_miles ?? (c as any).radius)
      if (lat === undefined || lng === undefined || radiusMiles === undefined) continue
      circles.push({ lat, lng, radiusMiles })
    }
    return circles
  } catch {
    return []
  }
}

function haversineMiles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const lat1 = (aLat * Math.PI) / 180
  const lat2 = (bLat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Returns true when the point is inside the configured service area.
 * Permissive (true) when no areas are configured, or when lat/lng are unknown
 * (we never block a lead we can't geolocate).
 */
export function isWithinServiceArea(
  lat?: number,
  lng?: number,
  raw?: string
): boolean {
  const circles = parseServiceAreas(raw)
  if (circles.length === 0) return true
  if (lat === undefined || lng === undefined) return true
  return circles.some((c) => haversineMiles(lat, lng, c.lat, c.lng) <= c.radiusMiles)
}

export interface AddressBounds {
  south: number
  west: number
  north: number
  east: number
}

/**
 * The box Google address suggestions are kept inside.
 *   1. NEXT_PUBLIC_ADDRESS_BOUNDS = "south,west,north,east" (decimal degrees), when set and valid.
 *   2. Otherwise the box around every NEXT_PUBLIC_SERVICE_AREAS circle (lat/lng ± radius in degrees).
 *   3. Otherwise undefined: no box, suggestions stay nationwide (US only).
 */
export function getAddressBounds(): AddressBounds | undefined {
  const raw = (process.env.NEXT_PUBLIC_ADDRESS_BOUNDS || "").trim()
  if (raw) {
    const p = raw.split(",").map((s) => Number(s.trim()))
    if (p.length === 4 && p.every(Number.isFinite) && p[0] < p[2] && p[1] < p[3]) {
      return { south: p[0], west: p[1], north: p[2], east: p[3] }
    }
  }

  const circles = parseServiceAreas()
  if (circles.length === 0) return undefined
  const box = { south: 90, west: 180, north: -90, east: -180 }
  for (const c of circles) {
    const dLat = c.radiusMiles / 69 // 1 degree of latitude ≈ 69 miles
    const dLng = c.radiusMiles / (69 * Math.max(0.01, Math.cos((c.lat * Math.PI) / 180)))
    box.south = Math.min(box.south, c.lat - dLat)
    box.north = Math.max(box.north, c.lat + dLat)
    box.west = Math.min(box.west, c.lng - dLng)
    box.east = Math.max(box.east, c.lng + dLng)
  }
  return box
}
