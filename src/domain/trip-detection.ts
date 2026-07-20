import { coordinateKey, haversineKm } from './geo'
import type {
  Coordinate,
  HomeInference,
  Leg,
  NormalizedTimeline,
  PlaceSummary,
  TripDestination,
  TripRecord,
  Visit,
} from './types'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const HOME_RADIUS_KM = 40

function durationMinutes(start: string, end: string): number {
  return Math.max(0, Date.parse(end) - Date.parse(start)) / 60_000
}

function calendarNights(start: string, end: string): number {
  const startDay = Date.parse(`${start.slice(0, 10)}T00:00:00.000Z`)
  const endDay = Date.parse(`${end.slice(0, 10)}T00:00:00.000Z`)
  return Math.max(1, Math.round((endDay - startDay) / DAY))
}

function placeForVisit(timeline: NormalizedTimeline, visit: Visit): PlaceSummary | undefined {
  return visit.placeId ? timeline.places[visit.placeId] : undefined
}

function homeFromVisit(timeline: NormalizedTimeline, visit: Visit, reason: string): HomeInference {
  const place = placeForVisit(timeline, visit)
  return {
    coordinate: visit.coordinate!,
    placeId: visit.placeId,
    displayName: 'Home',
    confidence: Math.max(0.94, visit.confidence ?? 0),
    reason,
    locality: place?.locality,
    region: place?.region,
    country: place?.country,
    countryCode: place?.countryCode,
  }
}

function semanticHomeVisits(timeline: NormalizedTimeline): Visit[] {
  return timeline.visits
    .filter((visit) => visit.coordinate && visit.semanticType?.toLowerCase() === 'home')
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
}

export function inferHome(timeline: NormalizedTimeline): HomeInference | undefined {
  const semantic = semanticHomeVisits(timeline)
  if (semantic.length) {
    const latest = semantic.at(-1)!
    return homeFromVisit(timeline, latest, 'Timeline identified this location as Home in the most recent records.')
  }

  const clusters = new Map<string, { coordinate: Coordinate; visits: Visit[]; minutes: number }>()
  for (const visit of timeline.visits) {
    if (!visit.coordinate || durationMinutes(visit.start, visit.end) < 6 * 60) continue
    const key = coordinateKey(visit.coordinate, 2)
    const cluster = clusters.get(key) ?? { coordinate: visit.coordinate, visits: [], minutes: 0 }
    cluster.visits.push(visit)
    cluster.minutes += Math.min(24 * 60, durationMinutes(visit.start, visit.end))
    clusters.set(key, cluster)
  }
  const winner = [...clusters.values()].sort((a, b) => b.minutes - a.minutes)[0]
  if (!winner) return undefined
  const place = placeForVisit(timeline, winner.visits[0])
  return {
    coordinate: winner.coordinate,
    placeId: winner.visits[0].placeId,
    displayName: 'Likely home',
    confidence: Math.min(0.89, 0.5 + winner.visits.length * 0.025),
    reason: 'This is the most persistent overnight location in the imported dates.',
    locality: place?.locality,
    region: place?.region,
    country: place?.country,
    countryCode: place?.countryCode,
  }
}

function inferHomeAt(timeline: NormalizedTimeline, timestamp: string): HomeInference | undefined {
  const homes = semanticHomeVisits(timeline)
  if (!homes.length) return inferHome(timeline)
  const target = Date.parse(timestamp)
  const before = homes.filter((visit) => Date.parse(visit.start) <= target).at(-1)
  const nearest = before ?? homes[0]
  return homeFromVisit(timeline, nearest, 'Timeline identified this location as Home near these dates.')
}

interface HomePresence {
  start: string
  end: string
  coordinate: Coordinate
  placeId?: string
}

function mergeHomePresences(visits: Visit[]): HomePresence[] {
  const presences: HomePresence[] = []
  for (const visit of visits) {
    const current = presences.at(-1)
    if (
      current
      && Date.parse(visit.start) - Date.parse(current.end) <= 6 * HOUR
      && haversineKm(current.coordinate, visit.coordinate!) < 15
    ) {
      if (Date.parse(visit.end) > Date.parse(current.end)) current.end = visit.end
      continue
    }
    presences.push({ start: visit.start, end: visit.end, coordinate: visit.coordinate!, placeId: visit.placeId })
  }
  return presences
}

function significantDestinations(
  timeline: NormalizedTimeline,
  visits: Visit[],
  home: HomeInference,
): TripDestination[] {
  interface DestinationGroup extends TripDestination { overnight: boolean }
  const groups = new Map<string, DestinationGroup>()

  for (const visit of visits) {
    if (!visit.coordinate || visit.semanticType?.toLowerCase() === 'home') continue
    if (haversineKm(visit.coordinate, home.coordinate) < HOME_RADIUS_KM) continue
    const place = placeForVisit(timeline, visit)
    const locality = place?.locality ?? visit.displayName
    const name = locality ?? place?.region ?? place?.country ?? `${visit.coordinate.lat.toFixed(2)}, ${visit.coordinate.lng.toFixed(2)}`
    const id = [place?.countryCode, place?.region, locality ?? coordinateKey(visit.coordinate, 2)].filter(Boolean).join('|')
    const minutes = durationMinutes(visit.start, visit.end)
    const existing = groups.get(id)
    if (existing) {
      existing.durationMinutes += minutes
      existing.visitIds.push(visit.id)
      if (Date.parse(visit.start) < Date.parse(existing.firstArrival)) existing.firstArrival = visit.start
      if (Date.parse(visit.end) > Date.parse(existing.lastDeparture)) existing.lastDeparture = visit.end
      existing.overnight ||= visit.start.slice(0, 10) !== visit.end.slice(0, 10)
      continue
    }
    groups.set(id, {
      id,
      name,
      locality,
      region: place?.region,
      country: place?.country,
      countryCode: place?.countryCode,
      coordinate: visit.coordinate,
      firstArrival: visit.start,
      lastDeparture: visit.end,
      durationMinutes: minutes,
      visitIds: [visit.id],
      overnight: visit.start.slice(0, 10) !== visit.end.slice(0, 10),
    })
  }

  const ordered = [...groups.values()].sort((a, b) => Date.parse(a.firstArrival) - Date.parse(b.firstArrival))
  const significant = ordered.filter((destination) => destination.durationMinutes >= 240 || destination.overnight || destination.visitIds.length >= 3)
  const selected = significant.length ? significant : [...ordered].sort((a, b) => b.durationMinutes - a.durationMinutes).slice(0, 3)
  return selected
    .sort((a, b) => Date.parse(a.firstArrival) - Date.parse(b.firstArrival))
    .map(({ overnight: _overnight, ...destination }) => destination)
}

function totalBy<T extends string>(destinations: TripDestination[], value: (destination: TripDestination) => T | undefined) {
  const totals = new Map<T, number>()
  for (const destination of destinations) {
    const key = value(destination)
    if (key) totals.set(key, (totals.get(key) ?? 0) + destination.durationMinutes)
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1])
}

export function titleForDestinations(destinations: TripDestination[], home?: HomeInference): string {
  if (!destinations.length) return 'Trip'
  const totalMinutes = destinations.reduce((sum, destination) => sum + destination.durationMinutes, 0) || 1
  const countries = totalBy(destinations, (destination) => destination.country)
  const countryCodes = totalBy(destinations, (destination) => destination.countryCode)
  const regions = totalBy(destinations, (destination) => destination.region)
  const localities = totalBy(destinations, (destination) => destination.locality)
  const dominantCountryCode = countryCodes[0]
  const dominantCountry = countries[0]

  if (
    dominantCountry
    && dominantCountryCode
    && dominantCountryCode[0] !== home?.countryCode
    && dominantCountry[1] / totalMinutes >= 0.55
    && localities.length > 1
  ) return dominantCountry[0]

  const dominantRegion = regions[0]
  if (dominantRegion && dominantRegion[1] / totalMinutes >= 0.62 && localities.length > 1) return dominantRegion[0]
  if (localities[0]) return localities[0][0]
  return dominantRegion?.[0] ?? dominantCountry?.[0] ?? destinations[0].name
}

function totalLegDistanceKm(legs: Leg[]): number {
  return legs.reduce((sum, leg) => {
    if (leg.sourceDistanceMeters) return sum + leg.sourceDistanceMeters / 1000
    if (leg.origin && leg.destination) return sum + haversineKm(leg.origin, leg.destination)
    return sum
  }, 0)
}

function buildTrip(
  timeline: NormalizedTimeline,
  home: HomeInference,
  range: { start: string; end: string; title?: string },
  source: 'detected' | 'user',
): TripRecord {
  const visits = timeline.visits.filter((visit) => Date.parse(visit.end) >= Date.parse(range.start) && Date.parse(visit.start) <= Date.parse(range.end))
  const legs = timeline.legs.filter((leg) => Date.parse(leg.end) >= Date.parse(range.start) && Date.parse(leg.start) <= Date.parse(range.end))
  const memories = timeline.memories.filter((memory) => Date.parse(memory.end) >= Date.parse(range.start) && Date.parse(memory.start) <= Date.parse(range.end))
  const awayVisits = visits.filter((visit) => visit.coordinate && visit.semanticType?.toLowerCase() !== 'home' && haversineKm(visit.coordinate, home.coordinate) >= HOME_RADIUS_KM)
  const destinations = significantDestinations(timeline, awayVisits, home)
  const farthestDistance = Math.max(0, ...awayVisits.map((visit) => haversineKm(visit.coordinate!, home.coordinate)))
  const modes = [...new Set(legs.map((leg) => leg.mode).filter((mode) => mode !== 'unknown'))]
  const coverageScore = legs.length
    ? Math.max(0.25, Math.min(1, legs.filter((leg) => leg.observedPath.length > 1).length / legs.length))
    : 0
  const nightsAway = calendarNights(range.start, range.end)
  const now = new Date().toISOString()
  const reasons = [`${nightsAway} night${nightsAway === 1 ? '' : 's'} between visits to Home.`]
  if (modes.includes('flight')) reasons.push('Timeline recorded at least one flight.')
  if (memories.length) reasons.push('A Timeline Memory overlaps these dates.')

  return {
    id: `${source}-trip-${Date.parse(range.start).toString(36)}-${Date.parse(range.end).toString(36)}`,
    source,
    status: source === 'detected' ? 'proposed' : 'confirmed',
    title: range.title?.trim() || titleForDestinations(destinations, home),
    start: range.start,
    end: range.end,
    startLocked: source === 'user',
    endLocked: source === 'user',
    destinationIds: destinations.map((destination) => destination.id),
    destinations,
    visitIds: visits.map((visit) => visit.id),
    legIds: legs.map((leg) => leg.id),
    evidence: {
      start: range.start,
      end: range.end,
      homeDistanceKm: farthestDistance,
      nightsAway,
      destinationCount: destinations.length,
      modes: modes.length ? modes : ['unknown'],
      timelineMemorySupport: memories.length > 0,
      coverageScore,
      reasons,
    },
    createdAt: now,
    updatedAt: now,
  }
}

function detectFromHomeReturns(timeline: NormalizedTimeline): TripRecord[] {
  const homes = mergeHomePresences(semanticHomeVisits(timeline))
  const trips: TripRecord[] = []

  for (let index = 0; index < homes.length - 1; index += 1) {
    const departureHome = homes[index]
    const returnHome = homes[index + 1]
    const startMs = Date.parse(departureHome.end)
    const endMs = Date.parse(returnHome.start)
    const durationMs = endMs - startMs
    if (durationMs <= 0) continue

    const hasMemory = timeline.memories.some((memory) => Date.parse(memory.end) >= startMs && Date.parse(memory.start) <= endMs)
    const hasFlight = timeline.legs.some((leg) => leg.mode === 'flight' && Date.parse(leg.end) >= startMs && Date.parse(leg.start) <= endMs)
    if (durationMs < 18 * HOUR && !hasMemory && !hasFlight) continue

    const homeShiftKm = haversineKm(departureHome.coordinate, returnHome.coordinate)
    if (homeShiftKm >= HOME_RADIUS_KM && durationMs >= 7 * DAY) continue
    if (durationMs > 180 * DAY) continue

    const home = inferHomeAt(timeline, departureHome.end)
    if (!home) continue
    const awayVisits = timeline.visits.filter((visit) =>
      visit.coordinate
      && visit.semanticType?.toLowerCase() !== 'home'
      && Date.parse(visit.end) >= startMs
      && Date.parse(visit.start) <= endMs
      && haversineKm(visit.coordinate, home.coordinate) >= HOME_RADIUS_KM,
    )
    if (!awayVisits.length && !hasMemory && !hasFlight) continue

    const trip = buildTrip(timeline, home, { start: departureHome.end, end: returnHome.start }, 'detected')
    if (trip.destinations.length || hasMemory || hasFlight) trips.push(trip)
  }

  return trips
}

function detectFromSingleHome(timeline: NormalizedTimeline, home: HomeInference): TripRecord[] {
  const awayVisits = timeline.visits
    .filter((visit) => visit.coordinate && visit.semanticType?.toLowerCase() !== 'home' && haversineKm(visit.coordinate, home.coordinate) >= HOME_RADIUS_KM)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  const groups: Visit[][] = []
  for (const visit of awayVisits) {
    const current = groups.at(-1)
    if (!current || Date.parse(visit.start) - Date.parse(current.at(-1)!.end) >= 18 * HOUR) groups.push([visit])
    else current.push(visit)
  }
  return groups
    .filter((group) => Date.parse(group.at(-1)!.end) - Date.parse(group[0].start) >= 18 * HOUR)
    .map((group) => buildTrip(timeline, home, { start: group[0].start, end: group.at(-1)!.end }, 'detected'))
}

export function detectTrips(timeline: NormalizedTimeline, fallbackHome = inferHome(timeline)): TripRecord[] {
  const homes = semanticHomeVisits(timeline)
  const trips = homes.length >= 2
    ? detectFromHomeReturns(timeline)
    : fallbackHome ? detectFromSingleHome(timeline, fallbackHome) : []
  const unique = new Map<string, TripRecord>()
  for (const trip of trips) unique.set(`${trip.start}|${trip.end}`, trip)
  return [...unique.values()].sort((a, b) => Date.parse(b.start) - Date.parse(a.start))
}

export function createManualTrip(
  timeline: NormalizedTimeline,
  input: { start: string; end: string; title?: string },
  fallbackHome = inferHome(timeline),
): TripRecord {
  if (Date.parse(input.end) <= Date.parse(input.start)) throw new Error('The end of a trip must be after its start.')
  const home = inferHomeAt(timeline, input.start) ?? fallbackHome
  if (!home) throw new Error('There is not enough Home history to create this trip.')
  return buildTrip(timeline, home, input, 'user')
}

export function tripDistanceKm(timeline: NormalizedTimeline, trip: TripRecord): number {
  return totalLegDistanceKm(timeline.legs.filter((leg) => trip.legIds.includes(leg.id)))
}
