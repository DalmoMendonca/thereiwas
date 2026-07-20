import { haversineKm, interpolateCoordinate } from './geo'
import type { Coordinate, TravelMode } from './types'
import type { RouteGeometry } from './route-reconstruction'

export interface PlaybackPoint extends Coordinate {
  timestamp: string
  mode: TravelMode
  legId: string
  cumulativeDistanceKm: number
  utcOffsetMinutes: number
}

export interface PlaybackTimeline {
  points: PlaybackPoint[]
  startMs: number
  endMs: number
  totalDistanceKm: number
}

export interface CinematicKeyframe {
  wallStart: number
  wallEnd: number
  tripStart: number
  tripEnd: number
  kind: 'movement' | 'pause'
}

export interface PlaybackState extends Coordinate {
  timestamp: string
  mode: TravelMode
  distanceKm: number
  progress: number
  pointIndex: number
  utcOffsetMinutes: number
}

export function buildPlaybackTimeline(routes: RouteGeometry[]): PlaybackTimeline {
  const flattened = routes
    .flatMap((route) => route.points.map((point, index) => ({
      ...point,
      mode: route.mode,
      legId: route.legId,
      utcOffsetMinutes:
        (Number.isFinite(route.startOffsetMinutes) ? route.startOffsetMinutes : 0) +
        ((Number.isFinite(route.endOffsetMinutes) ? route.endOffsetMinutes : 0) - (Number.isFinite(route.startOffsetMinutes) ? route.startOffsetMinutes : 0)) *
          (index / Math.max(1, route.points.length - 1)),
    })))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
  const points: PlaybackPoint[] = []
  let distance = 0
  for (const point of flattened) {
    const previous = points.at(-1)
    if (previous && previous.lat === point.lat && previous.lng === point.lng && previous.timestamp === point.timestamp) continue
    if (previous) distance += haversineKm(previous, point)
    points.push({ ...point, cumulativeDistanceKm: distance })
  }
  const startMs = points.length ? Date.parse(points[0].timestamp) : 0
  const endMs = points.length ? Date.parse(points.at(-1)!.timestamp) : 0
  return { points, startMs, endMs, totalDistanceKm: distance }
}

export function buildCinematicKeyframes(routes: RouteGeometry[], timeline: PlaybackTimeline): CinematicKeyframe[] {
  if (!timeline.points.length || timeline.endMs <= timeline.startMs) return []
  const ordered = [...routes].filter((route) => route.points.length > 1).sort((a, b) => Date.parse(a.points[0].timestamp) - Date.parse(b.points[0].timestamp))
  const sections: Array<{ tripStart: number; tripEnd: number; weight: number; kind: 'movement' | 'pause' }> = []
  const toTripProgress = (timestamp: string) => (Date.parse(timestamp) - timeline.startMs) / (timeline.endMs - timeline.startMs)
  ordered.forEach((route, index) => {
    const tripStart = Math.max(0, toTripProgress(route.points[0].timestamp))
    const tripEnd = Math.min(1, toTripProgress(route.points.at(-1)!.timestamp))
    const movementWeight = route.mode === 'flight' ? 3.2 : route.mode === 'driving' ? 2.35 : route.mode === 'walking' ? 1.55 : 1.9
    sections.push({ tripStart, tripEnd, weight: movementWeight, kind: 'movement' })
    const next = ordered[index + 1]
    if (next) {
      const pauseStart = tripEnd
      const pauseEnd = Math.max(pauseStart, toTripProgress(next.points[0].timestamp))
      const gapHours = (Date.parse(next.points[0].timestamp) - Date.parse(route.points.at(-1)!.timestamp)) / 3_600_000
      if (pauseEnd > pauseStart) sections.push({ tripStart: pauseStart, tripEnd: pauseEnd, weight: gapHours >= 8 ? 1.7 : 0.65, kind: 'pause' })
    }
  })
  if (sections.length) {
    sections.push({ tripStart: sections.at(-1)!.tripEnd, tripEnd: 1, weight: 1.1, kind: 'pause' })
  }
  const totalWeight = sections.reduce((sum, section) => sum + section.weight, 0) || 1
  let cursor = 0
  return sections.map((section) => {
    const wallStart = cursor
    cursor += section.weight / totalWeight
    return { wallStart, wallEnd: cursor, tripStart: section.tripStart, tripEnd: section.tripEnd, kind: section.kind }
  })
}

export function mapCinematicProgress(keyframes: CinematicKeyframe[], wallProgress: number): number {
  if (!keyframes.length) return Math.max(0, Math.min(1, wallProgress))
  const clamped = Math.max(0, Math.min(1, wallProgress))
  const frame = keyframes.find((item) => clamped <= item.wallEnd) ?? keyframes.at(-1)!
  const span = Math.max(0.0001, frame.wallEnd - frame.wallStart)
  const local = Math.max(0, Math.min(1, (clamped - frame.wallStart) / span))
  const eased = frame.kind === 'pause' ? local : 1 - (1 - local) ** 2.2
  return frame.tripStart + (frame.tripEnd - frame.tripStart) * eased
}

export function binarySearchPlayback(points: PlaybackPoint[], timestampMs: number): number {
  let low = 0
  let high = Math.max(0, points.length - 1)
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (Date.parse(points[mid].timestamp) <= timestampMs) low = mid
    else high = mid - 1
  }
  return low
}

export function interpolatePlayback(timeline: PlaybackTimeline, progress: number): PlaybackState | undefined {
  if (!timeline.points.length) return undefined
  const clamped = Math.max(0, Math.min(1, progress))
  const timestampMs = timeline.startMs + (timeline.endMs - timeline.startMs) * clamped
  const index = binarySearchPlayback(timeline.points, timestampMs)
  const current = timeline.points[index]
  const next = timeline.points[Math.min(index + 1, timeline.points.length - 1)]
  const span = Math.max(1, Date.parse(next.timestamp) - Date.parse(current.timestamp))
  const localProgress = Math.max(0, Math.min(1, (timestampMs - Date.parse(current.timestamp)) / span))
  const coordinate = interpolateCoordinate(current, next, localProgress)
  return {
    ...coordinate,
    timestamp: new Date(timestampMs).toISOString(),
    mode: localProgress > 0.5 ? next.mode : current.mode,
    distanceKm: current.cumulativeDistanceKm + (next.cumulativeDistanceKm - current.cumulativeDistanceKm) * localProgress,
    progress: clamped,
    pointIndex: index,
    utcOffsetMinutes: current.utcOffsetMinutes + (next.utcOffsetMinutes - current.utcOffsetMinutes) * localProgress,
  }
}
