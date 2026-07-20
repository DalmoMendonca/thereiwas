import { coordinateKey, haversineKm } from './geo'
import type { HomeInference, Leg, NormalizedTimeline, TripRecord, Visit } from './types'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function durationHours(start: string, end: string): number {
  return Math.max(0, Date.parse(end) - Date.parse(start)) / HOUR
}

function localHour(iso: string): number {
  const match = /T(\d{2})/.exec(iso)
  return match ? Number(match[1]) : new Date(iso).getUTCHours()
}

function spansOvernight(visit: Visit): boolean {
  return durationHours(visit.start, visit.end) >= 6 && (localHour(visit.start) >= 18 || localHour(visit.end) <= 8)
}

export function inferHome(timeline: NormalizedTimeline): HomeInference | undefined {
  const semantic = timeline.visits.filter((visit) => visit.coordinate && visit.semanticType?.toLowerCase() === 'home')
  if (semantic.length) {
    const primary = semantic.sort((a, b) => durationHours(b.start, b.end) - durationHours(a.start, a.end))[0]
    return {
      coordinate: primary.coordinate!,
      placeId: primary.placeId,
      displayName: 'Home',
      confidence: Math.max(0.92, primary.confidence ?? 0),
      reason: 'Timeline explicitly identified this recurring overnight place as Home.',
    }
  }

  const clusters = new Map<string, { coordinate: { lat: number; lng: number }; visits: Visit[]; score: number }>()
  for (const visit of timeline.visits) {
    if (!visit.coordinate || !spansOvernight(visit)) continue
    const key = coordinateKey(visit.coordinate, 2)
    const existing = clusters.get(key) ?? { coordinate: visit.coordinate, visits: [], score: 0 }
    existing.visits.push(visit)
    existing.score += Math.min(24, durationHours(visit.start, visit.end)) + 12
    clusters.set(key, existing)
  }
  const winner = [...clusters.values()].sort((a, b) => b.score - a.score)[0]
  if (!winner) return undefined
  const dateSpan = Date.parse(winner.visits.at(-1)!.end) - Date.parse(winner.visits[0].start)
  return {
    coordinate: winner.coordinate,
    placeId: winner.visits[0].placeId,
    displayName: winner.visits[0].displayName ?? 'Likely home',
    confidence: Math.min(0.89, 0.48 + winner.visits.length * 0.08 + Math.min(0.2, dateSpan / (90 * DAY) / 5)),
    reason: 'This was the most persistent recurring overnight location in the imported dates.',
  }
}

function totalLegDistanceKm(legs: Leg[]): number {
  return legs.reduce((sum, leg) => {
    if (leg.sourceDistanceMeters) return sum + leg.sourceDistanceMeters / 1000
    if (leg.origin && leg.destination) return sum + haversineKm(leg.origin, leg.destination)
    return sum
  }, 0)
}

function titleFor(visits: Visit[]): string {
  const names = [...new Set(visits.map((visit) => visit.displayName).filter((name): name is string => Boolean(name && name !== 'Home')))]
  if (!names.length) return 'A journey away from home'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  return `${names[0]} to ${names.at(-1)}`
}

function buildTrip(
  timeline: NormalizedTimeline,
  home: HomeInference,
  awayVisits: Visit[],
  index: number,
  source: 'detected' | 'user' = 'detected',
  lockedRange?: { start: string; end: string; title?: string },
): TripRecord {
  const firstAway = awayVisits[0]
  const lastAway = awayVisits.at(-1)!
  const precedingLeg = [...timeline.legs]
    .reverse()
    .find((leg) => Date.parse(leg.start) <= Date.parse(firstAway.start) && leg.origin && haversineKm(leg.origin, home.coordinate) < 40)
  const followingLeg = timeline.legs.find(
    (leg) => Date.parse(leg.end) >= Date.parse(lastAway.end) && leg.destination && haversineKm(leg.destination, home.coordinate) < 40,
  )
  const start = lockedRange?.start ?? precedingLeg?.start ?? firstAway.start
  const end = lockedRange?.end ?? followingLeg?.end ?? lastAway.end
  const visits = timeline.visits.filter((visit) => Date.parse(visit.end) >= Date.parse(start) && Date.parse(visit.start) <= Date.parse(end))
  const relevantAwayVisits = visits.filter((visit) => visit.coordinate && haversineKm(visit.coordinate, home.coordinate) >= 40)
  const legs = timeline.legs.filter((leg) => Date.parse(leg.end) >= Date.parse(start) && Date.parse(leg.start) <= Date.parse(end))
  const memories = timeline.memories.filter((memory) => Date.parse(memory.end) >= Date.parse(start) && Date.parse(memory.start) <= Date.parse(end))
  const farthestDistance = Math.max(0, ...relevantAwayVisits.map((visit) => haversineKm(visit.coordinate!, home.coordinate)))
  const nightsAway = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / DAY) - 1)
  const destinationIds = [...new Set(relevantAwayVisits.map((visit) => visit.placeId ?? visit.id))]
  const modes = [...new Set(legs.map((leg) => leg.mode))]
  const coverageScore = Math.max(0.3, Math.min(1, 0.55 + legs.filter((leg) => leg.observedPath.length > 1).length * 0.08 - timeline.quarantined.length * 0.03))
  const reasons = [
    `You left the inferred home area and traveled as far as ${Math.round(farthestDistance).toLocaleString()} km away.`,
    `The interval includes ${nightsAway} night${nightsAway === 1 ? '' : 's'} away across ${destinationIds.length} significant destination${destinationIds.length === 1 ? '' : 's'}.`,
  ]
  if (modes.includes('flight')) reasons.push('A flight connects the home region to the journey and back.')
  if (memories.length) reasons.push('A Timeline Memory independently supports these dates.')
  const now = new Date().toISOString()
  return {
    id: `${source}-trip-${index}-${Date.parse(start).toString(36)}`,
    source,
    status: source === 'detected' ? 'proposed' : 'confirmed',
    title: lockedRange?.title?.trim() || titleFor(relevantAwayVisits),
    start,
    end,
    startLocked: source === 'user',
    endLocked: source === 'user',
    destinationIds,
    visitIds: visits.map((visit) => visit.id),
    legIds: legs.map((leg) => leg.id),
    evidence: {
      start,
      end,
      homeDistanceKm: farthestDistance,
      nightsAway,
      destinationCount: destinationIds.length,
      modes,
      timelineMemorySupport: memories.length > 0,
      coverageScore,
      reasons,
    },
    createdAt: now,
    updatedAt: now,
  }
}

export function detectTrips(timeline: NormalizedTimeline, home = inferHome(timeline)): TripRecord[] {
  if (!home) return []
  const awayVisits = timeline.visits
    .filter((visit) => visit.coordinate && haversineKm(visit.coordinate, home.coordinate) >= 40)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  if (!awayVisits.length) return []

  const groups: Visit[][] = []
  for (const visit of awayVisits) {
    const current = groups.at(-1)
    const coveredUntil = current ? Math.max(...current.map((item) => Date.parse(item.end))) : 0
    if (!current || Date.parse(visit.start) - coveredUntil >= 18 * HOUR) groups.push([visit])
    else current.push(visit)
  }

  return groups.flatMap((group, index) => {
    const duration = Date.parse(group.at(-1)!.end) - Date.parse(group[0].start)
    const hasFlight = timeline.legs.some(
      (leg) => leg.mode === 'flight' && Date.parse(leg.end) >= Date.parse(group[0].start) - DAY && Date.parse(leg.start) <= Date.parse(group.at(-1)!.end) + DAY,
    )
    const memorySupport = timeline.memories.some(
      (memory) => Date.parse(memory.end) >= Date.parse(group[0].start) && Date.parse(memory.start) <= Date.parse(group.at(-1)!.end),
    )
    const returnObserved = timeline.visits.some(
      (visit) => visit.coordinate && Date.parse(visit.start) >= Date.parse(group.at(-1)!.end) && haversineKm(visit.coordinate, home.coordinate) < 40 && durationHours(visit.start, visit.end) >= 6,
    )
    const relocationLike = !returnObserved && duration > 30 * DAY
    if (relocationLike || (duration < 18 * HOUR && !hasFlight && !memorySupport)) return []
    return [buildTrip(timeline, home, group, index)]
  })
}

export function createManualTrip(
  timeline: NormalizedTimeline,
  input: { start: string; end: string; title?: string },
  home = inferHome(timeline),
): TripRecord {
  if (!home) throw new Error('A likely home is needed before creating a trip from these dates.')
  if (Date.parse(input.end) <= Date.parse(input.start)) throw new Error('The end of a trip must be after its start.')
  const visits = timeline.visits.filter((visit) => Date.parse(visit.end) >= Date.parse(input.start) && Date.parse(visit.start) <= Date.parse(input.end))
  return buildTrip(timeline, home, visits.length ? visits : timeline.visits.slice(0, 1), Date.now(), 'user', input)
}

export function tripDistanceKm(timeline: NormalizedTimeline, trip: TripRecord): number {
  return totalLegDistanceKm(timeline.legs.filter((leg) => trip.legIds.includes(leg.id)))
}
