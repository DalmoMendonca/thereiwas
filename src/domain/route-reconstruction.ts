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
const MAX_OBSERVED_SEGMENT_KM: Partial<Record<TravelMode, number>> = {
  driving: 28,
  walking: 2.5,
  cycling: 8,
}

export function profileForMode(mode: TravelMode): 'driving' | 'walking' | 'cycling' | undefined {
  return ROUTABLE_MODES.has(mode) ? (mode as 'driving' | 'walking' | 'cycling') : undefined
}

export function needsDirections(leg: Leg): boolean {
  const threshold = MAX_OBSERVED_SEGMENT_KM[leg.mode]
  if (!threshold) return false
  const evidence = [
    ...(leg.origin ? [leg.origin] : []),
    ...leg.observedPath,
    ...(leg.destination ? [leg.destination] : []),
  ]
  if (evidence.length < 2) return false
  if (leg.observedPath.length < 2) return true
  return evidence.slice(1).some((point, index) => haversineKm(evidence[index], point) > threshold)
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
    'v6-mapbox-sparse-ground',
    leg.mode,
    leg.origin ? `${leg.origin.lat.toFixed(5)},${leg.origin.lng.toFixed(5)}` : 'none',
    leg.destination ? `${leg.destination.lat.toFixed(5)},${leg.destination.lng.toFixed(5)}` : 'none',
    leg.observedPath.map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`).join(';'),
  ].join('|')
  return `route-${fnv1a(normalized)}`
}

function dedupeCoordinates(points: Coordinate[]): Coordinate[] {
  const result: Coordinate[] = []
  for (const point of points) {
    const previous = result.at(-1)
    if (!previous || haversineKm(previous, point) >= 0.015) result.push(point)
  }
  return result
}

function sampleWaypoints(points: Coordinate[], limit = 25): Coordinate[] {
  const deduped = dedupeCoordinates(points)
  if (deduped.length <= limit) return deduped
  const sampled = Array.from({ length: limit }, (_, index) => deduped[Math.round(index * (deduped.length - 1) / (limit - 1))])
  return dedupeCoordinates(sampled)
}

function waypointsForLeg(leg: Leg): Coordinate[] {
  return sampleWaypoints([
    ...(leg.origin ? [leg.origin] : []),
    ...leg.observedPath,
    ...(leg.destination ? [leg.destination] : []),
  ])
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
  const waypoints = waypointsForLeg(leg)
  if (!profile || waypoints.length < 2 || !token) return undefined
  const coordinates = waypoints.map((point) => `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`).join(';')
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`)
  url.searchParams.set('access_token', token)
  url.searchParams.set('geometries', 'geojson')
  url.searchParams.set('overview', 'full')
  url.searchParams.set('continue_straight', 'true')
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

async function connectorGeometry(
  id: string,
  origin: Coordinate,
  destination: Coordinate,
  start: string,
  end: string,
  mode: TravelMode,
  token?: string,
  signal?: AbortSignal,
  getCached?: (key: string) => Promise<RouteGeometry | undefined>,
  setCached?: (key: string, value: RouteGeometry) => Promise<void>,
): Promise<RouteGeometry> {
  const synthetic: Leg = {
    id,
    start,
    end,
    mode,
    origin,
    destination,
    observedPath: [],
    sourceIds: [],
    confidence: 0.65,
  }
  const key = routeFingerprint(synthetic)
  const cached = await getCached?.(key)
  if (cached) return cached
  let route: RouteGeometry
  if (token && profileForMode(mode)) {
    try {
      const enhanced = await fetchEnhancedGeometry(synthetic, token, signal)
      if (enhanced) {
        await setCached?.(key, enhanced)
        return enhanced
      }
    } catch {
      // The explicit fallback below keeps the loop honest when routing is unavailable.
    }
  }
  route = selectLocalGeometry(synthetic)
  await setCached?.(key, route)
  return route
}

function modeForGap(previous: RouteGeometry, next: RouteGeometry, distanceKm: number): TravelMode {
  if (previous.mode === 'flight' || next.mode === 'flight') return 'flight'
  const previousEnd = previous.points.at(-1)!
  const nextStart = next.points[0]
  const elapsedHours = Math.max(0.01, (Date.parse(nextStart.timestamp) - Date.parse(previousEnd.timestamp)) / 3_600_000)
  if (distanceKm > 500 && distanceKm / elapsedHours > 160) return 'flight'
  if (profileForMode(next.mode)) return next.mode
  if (profileForMode(previous.mode)) return previous.mode
  return 'unknown'
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, task: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await task(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

export async function buildTripRoutes(
  timeline: NormalizedTimeline,
  trip: TripRecord,
  options: { token?: string; signal?: AbortSignal; getCached?: (key: string) => Promise<RouteGeometry | undefined>; setCached?: (key: string, value: RouteGeometry) => Promise<void> } = {},
): Promise<RouteGeometry[]> {
  const legs = timeline.legs
    .filter((leg) => trip.legIds.includes(leg.id))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  const results = await mapWithConcurrency(legs, 4, async (leg) => {
    const key = routeFingerprint(leg)
    const cached = await options.getCached?.(key)
    if (cached) return cached
    let route: RouteGeometry | undefined
    // Recorded Timeline paths are the strongest evidence of where the person
    // actually moved. Mapbox replaces only sparse ground legs that would
    // otherwise render as a straight origin-to-destination chord.
    if (options.token && needsDirections(leg)) {
      try {
        route = await fetchEnhancedGeometry(leg, options.token, options.signal)
      } catch {
        route = undefined
      }
    }
    route ??= selectLocalGeometry(leg)
    await options.setCached?.(key, route)
    return route
  })

  const drawable = results.filter((route) => route.points.length > 0)
  if (!drawable.length) return results
  const connected: RouteGeometry[] = []
  for (const route of drawable) {
    const previous = connected.at(-1)
    if (previous) {
      const previousEnd = previous.points.at(-1)!
      const nextStart = route.points[0]
      const gapKm = haversineKm(previousEnd, nextStart)
      if (gapKm > 0.03) {
        connected.push(await connectorGeometry(
          `${trip.id}-gap-${connected.length}`,
          previousEnd,
          nextStart,
          previousEnd.timestamp,
          nextStart.timestamp,
          modeForGap(previous, route, gapKm),
          options.token,
          options.signal,
          options.getCached,
          options.setCached,
        ))
      }
    }
    connected.push(route)
  }
  const first = connected[0].points[0]
  const lastRoute = connected.at(-1)!
  const last = lastRoute.points.at(-1)!
  const home = trip.home.coordinate
  const loop: RouteGeometry[] = [...connected]
  if (haversineKm(home, first) > 0.15) {
    const distance = haversineKm(home, first)
    const mode: TravelMode = trip.evidence.modes.includes('flight') && distance > 500 ? 'flight' : 'driving'
    loop.unshift(await connectorGeometry(`${trip.id}-home-out`, home, first, trip.start, connected[0].points[0].timestamp, mode, options.token, options.signal, options.getCached, options.setCached))
  } else if (haversineKm(home, first) > 0) {
    drawable[0].points.unshift({ ...home, timestamp: trip.start })
  }
  if (haversineKm(last, home) > 0.15) {
    const distance = haversineKm(last, home)
    const mode: TravelMode = trip.evidence.modes.includes('flight') && distance > 500 ? 'flight' : 'driving'
    loop.push(await connectorGeometry(`${trip.id}-home-in`, last, home, last.timestamp, trip.end, mode, options.token, options.signal, options.getCached, options.setCached))
  } else if (haversineKm(last, home) > 0) {
    lastRoute.points.push({ ...home, timestamp: trip.end })
  }
  const loopStart = loop.find((route) => route.points.length)?.points
  if (loopStart?.length && haversineKm(loopStart[0], home) > 0) loopStart.unshift({ ...home, timestamp: trip.start })
  const loopEnd = [...loop].reverse().find((route) => route.points.length)?.points
  if (loopEnd?.length && haversineKm(loopEnd.at(-1)!, home) > 0) loopEnd.push({ ...home, timestamp: trip.end })
  return loop
}
