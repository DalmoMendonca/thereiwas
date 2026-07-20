import { haversineKm, interpolateCoordinate } from './geo'
import type { Coordinate, Leg, NormalizedTimeline, TimedCoordinate, TravelMode, TripRecord } from './types'

export type RouteProvenance = 'observed' | 'enhanced' | 'fallback' | 'great-circle'

export interface RouteGeometry {
  legId: string
  mode: TravelMode
  provenance: RouteProvenance
  points: TimedCoordinate[]
  distanceKm: number
  startOffsetMinutes: number
  endOffsetMinutes: number
}

const ROUTABLE_MODES = new Set<TravelMode>(['driving', 'walking', 'cycling'])

export function profileForMode(mode: TravelMode): 'driving' | 'walking' | 'cycling' | undefined {
  return ROUTABLE_MODES.has(mode) ? (mode as 'driving' | 'walking' | 'cycling') : undefined
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

export function routeFingerprint(leg: Leg): string {
  const normalized = [
    'v3',
    leg.mode,
    leg.origin ? `${leg.origin.lat.toFixed(5)},${leg.origin.lng.toFixed(5)}` : 'none',
    leg.destination ? `${leg.destination.lat.toFixed(5)},${leg.destination.lng.toFixed(5)}` : 'none',
    leg.observedPath.map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`).join(';'),
  ].join('|')
  return `route-${fnv1a(normalized)}`
}

function timestampOffsetMinutes(timestamp: string): number {
  if (timestamp.endsWith('Z')) return 0
  const match = /([+-])(\d{2}):(\d{2})$/.exec(timestamp)
  if (!match) return 0
  const minutes = Number(match[2]) * 60 + Number(match[3])
  return match[1] === '-' ? -minutes : minutes
}

function cumulativeDistances(points: Coordinate[]): number[] {
  const cumulative = [0]
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(cumulative[index - 1] + haversineKm(points[index - 1], points[index]))
  }
  return cumulative
}

export function timestampGeometryByDistance(points: Coordinate[], start: string, end: string): TimedCoordinate[] {
  if (!points.length) return []
  const cumulative = cumulativeDistances(points)
  const total = cumulative.at(-1) || 1
  const startMs = Date.parse(start)
  const durationMs = Math.max(1, Date.parse(end) - startMs)
  return points.map((point, index) => ({
    ...point,
    timestamp: new Date(startMs + (cumulative[index] / total) * durationMs).toISOString(),
  }))
}

export function greatCirclePoints(origin: Coordinate, destination: Coordinate, count = 64): Coordinate[] {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const toDeg = (radians: number) => (radians * 180) / Math.PI
  const lat1 = toRad(origin.lat)
  const lng1 = toRad(origin.lng)
  const lat2 = toRad(destination.lat)
  const lng2 = toRad(destination.lng)
  const angular = 2 * Math.asin(
    Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2),
  )
  if (angular === 0) return [origin, destination]
  return Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1)
    const a = Math.sin((1 - t) * angular) / Math.sin(angular)
    const b = Math.sin(t * angular) / Math.sin(angular)
    const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2)
    const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2)
    const z = a * Math.sin(lat1) + b * Math.sin(lat2)
    return { lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), lng: toDeg(Math.atan2(y, x)) }
  })
}

function fallbackCurve(origin: Coordinate, destination: Coordinate, mode: TravelMode, count = 12): Coordinate[] {
  if (mode === 'flight') return greatCirclePoints(origin, destination)
  return Array.from({ length: count }, (_, index) => interpolateCoordinate(origin, destination, index / (count - 1)))
}

export function selectLocalGeometry(leg: Leg): RouteGeometry {
  if (leg.observedPath.length >= 2) {
    return {
      legId: leg.id,
      mode: leg.mode,
      provenance: 'observed',
      points: leg.observedPath,
      distanceKm: cumulativeDistances(leg.observedPath).at(-1) ?? 0,
      startOffsetMinutes: timestampOffsetMinutes(leg.start),
      endOffsetMinutes: timestampOffsetMinutes(leg.end),
    }
  }
  if (!leg.origin || !leg.destination) return { legId: leg.id, mode: leg.mode, provenance: 'fallback', points: [], distanceKm: 0, startOffsetMinutes: timestampOffsetMinutes(leg.start), endOffsetMinutes: timestampOffsetMinutes(leg.end) }
  const points = fallbackCurve(leg.origin, leg.destination, leg.mode)
  return {
    legId: leg.id,
    mode: leg.mode,
    provenance: leg.mode === 'flight' ? 'great-circle' : 'fallback',
    points: timestampGeometryByDistance(points, leg.start, leg.end),
    distanceKm: leg.sourceDistanceMeters ? leg.sourceDistanceMeters / 1000 : cumulativeDistances(points).at(-1) ?? 0,
    startOffsetMinutes: timestampOffsetMinutes(leg.start),
    endOffsetMinutes: timestampOffsetMinutes(leg.end),
  }
}

export async function fetchEnhancedGeometry(
  leg: Leg,
  token: string,
  signal?: AbortSignal,
): Promise<RouteGeometry | undefined> {
  const profile = profileForMode(leg.mode)
  if (!profile || !leg.origin || !leg.destination || !token) return undefined
  const coordinates = `${leg.origin.lng},${leg.origin.lat};${leg.destination.lng},${leg.destination.lat}`
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`)
  url.searchParams.set('access_token', token)
  url.searchParams.set('geometries', 'geojson')
  url.searchParams.set('overview', 'full')
  url.searchParams.set('annotations', 'duration,distance')
  const response = await fetch(url, { signal })
  if (!response.ok) {
    if (response.status >= 500 || response.status === 429) throw new Error(`Routing provider temporarily unavailable (${response.status}).`)
    return undefined
  }
  const payload = (await response.json()) as { routes?: Array<{ geometry?: { coordinates?: Array<[number, number]> }; distance?: number }> }
  const route = payload.routes?.[0]
  const coordinatesOut = route?.geometry?.coordinates?.map(([lng, lat]) => ({ lat, lng })) ?? []
  if (coordinatesOut.length < 2) return undefined
  return {
    legId: leg.id,
    mode: leg.mode,
    provenance: 'enhanced',
    points: timestampGeometryByDistance(coordinatesOut, leg.start, leg.end),
    distanceKm: route?.distance ? route.distance / 1000 : cumulativeDistances(coordinatesOut).at(-1) ?? 0,
    startOffsetMinutes: timestampOffsetMinutes(leg.start),
    endOffsetMinutes: timestampOffsetMinutes(leg.end),
  }
}

export async function buildTripRoutes(
  timeline: NormalizedTimeline,
  trip: TripRecord,
  options: { token?: string; signal?: AbortSignal; getCached?: (key: string) => Promise<RouteGeometry | undefined>; setCached?: (key: string, value: RouteGeometry) => Promise<void> } = {},
): Promise<RouteGeometry[]> {
  const legs = timeline.legs.filter((leg) => trip.legIds.includes(leg.id))
  const results: RouteGeometry[] = []
  for (const leg of legs) {
    const key = routeFingerprint(leg)
    const cached = await options.getCached?.(key)
    if (cached) {
      results.push(cached)
      continue
    }
    let route: RouteGeometry | undefined
    if (options.token && profileForMode(leg.mode) && leg.observedPath.length < 2) {
      try {
        route = await fetchEnhancedGeometry(leg, options.token, options.signal)
      } catch {
        route = undefined
      }
    }
    route ??= selectLocalGeometry(leg)
    await options.setCached?.(key, route)
    results.push(route)
  }
  return results
}
