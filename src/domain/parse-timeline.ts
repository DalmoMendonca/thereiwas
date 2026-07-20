import { z } from 'zod'
import { coordinateKey, haversineKm, normalizeNumericString, parseGeoCoordinate, parseTimestamp } from './geo'
import type {
  Leg,
  NormalizedTimeline,
  PlaceSummary,
  QuarantinedRecord,
  TimelineMemory,
  TimedCoordinate,
  TravelMode,
  Visit,
} from './types'

const visitSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  visit: z.object({
    hierarchyLevel: z.string().optional(),
    probability: z.string().optional(),
    topCandidate: z
      .object({
        probability: z.string().optional(),
        semanticType: z.string().optional(),
        placeID: z.string().optional(),
        placeLocation: z.string().optional(),
        displayName: z.string().optional(),
      })
      .optional(),
  }),
})

const activitySchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  activity: z.object({
    probability: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    distanceMeters: z.string().optional(),
    topCandidate: z.object({ type: z.string().optional(), probability: z.string().optional() }).optional(),
  }),
})

const timelinePathSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  timelinePath: z.array(
    z.object({ point: z.string(), durationMinutesOffsetFromStartTime: z.string() }),
  ),
})

const memorySchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  timelineMemory: z.object({
    destinations: z.array(z.object({ identifier: z.string() })).optional(),
    distanceFromOriginKms: z.string().optional(),
  }),
})

const MODE_MAP: Record<string, TravelMode> = {
  'in passenger vehicle': 'driving',
  'in vehicle': 'driving',
  motorcycling: 'driving',
  walking: 'walking',
  cycling: 'cycling',
  running: 'running',
  flying: 'flight',
  'in train': 'train',
  'in subway': 'subway',
  'in tram': 'tram',
  'in bus': 'bus',
  'in ferry': 'ferry',
  skiing: 'skiing',
}

export function reconstructPathTimestamps(
  start: string,
  points: Array<{ point: string; durationMinutesOffsetFromStartTime: string }>,
): TimedCoordinate[] {
  const startMs = Date.parse(start)
  if (Number.isNaN(startMs)) return []
  const reconstructed: TimedCoordinate[] = []
  for (const item of points) {
    const coordinate = parseGeoCoordinate(item.point)
    const offsetMinutes = normalizeNumericString(item.durationMinutesOffsetFromStartTime)
    if (!coordinate || offsetMinutes === undefined || offsetMinutes < 0) continue
    const next = { ...coordinate, timestamp: new Date(startMs + offsetMinutes * 60_000).toISOString() }
    const previous = reconstructed.at(-1)
    if (!previous || coordinateKey(previous, 6) !== coordinateKey(next, 6)) reconstructed.push(next)
  }
  return reconstructed
}

function stableId(prefix: string, index: number, start: string): string {
  return `${prefix}-${index}-${Date.parse(start).toString(36)}`
}

function visitPreference(visit: Visit): number {
  const semanticType = visit.semanticType?.toLowerCase()
  const semanticScore = semanticType === 'home' ? 100 : semanticType === 'work' || semanticType === 'inferred work' ? 80 : 0
  const hierarchyScore = visit.hierarchyLevel === undefined ? 0 : Math.max(0, 10 - visit.hierarchyLevel)
  return semanticScore + hierarchyScore + (visit.coordinate ? 2 : 0) + (visit.placeId ? 1 : 0)
}

function deduplicateVisits(visits: Visit[]): Visit[] {
  const groups = new Map<string, Visit[]>()
  for (const visit of visits) {
    const key = `${visit.start}|${visit.end}`
    const group = groups.get(key) ?? []
    group.push(visit)
    groups.set(key, group)
  }
  return [...groups.values()]
    .map((group) => {
      const primary = [...group].sort((a, b) => visitPreference(b) - visitPreference(a) || (b.confidence ?? 0) - (a.confidence ?? 0))[0]
      return { ...primary, sourceIds: [...new Set(group.flatMap((visit) => visit.sourceIds))] }
    })
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
}

function inferModeFromPath(points: TimedCoordinate[], start: string, end: string): TravelMode {
  if (points.length < 2) return 'unknown'
  let distanceKm = 0
  for (let index = 1; index < points.length; index += 1) distanceKm += haversineKm(points[index - 1], points[index])
  const hours = Math.max(1 / 60, (Date.parse(end) - Date.parse(start)) / 3_600_000)
  const speed = distanceKm / hours
  if (speed >= 240) return 'flight'
  if (speed >= 22) return 'driving'
  if (speed >= 8) return 'cycling'
  return 'walking'
}

function findBestMatchingLeg(legs: Leg[], path: { start: string; end: string }): Leg | undefined {
  const startMs = Date.parse(path.start)
  const endMs = Date.parse(path.end)
  let low = 0
  let high = legs.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (Date.parse(legs[middle].start) < startMs) low = middle + 1
    else high = middle
  }
  let best: { leg: Leg; score: number } | undefined
  for (let index = Math.max(0, low - 10); index < Math.min(legs.length, low + 10); index += 1) {
    const leg = legs[index]
    const overlapMs = Math.max(0, Math.min(endMs, Date.parse(leg.end)) - Math.max(startMs, Date.parse(leg.start)))
    if (!overlapMs) continue
    const boundaryDelta = Math.abs(Date.parse(leg.start) - startMs) + Math.abs(Date.parse(leg.end) - endMs)
    const score = overlapMs - boundaryDelta * 0.05
    if (!best || score > best.score) best = { leg, score }
  }
  return best?.leg
}

export function parseTimelineRecords(
  rawRecords: unknown,
  sourceName = 'Timeline export',
  importedAt = new Date().toISOString(),
): NormalizedTimeline {
  const startedAt = performance.now()
  if (!Array.isArray(rawRecords)) throw new Error('Timeline JSON must be a top-level array.')

  const visits: Visit[] = []
  const legs: Leg[] = []
  const paths: Array<{ start: string; end: string; points: TimedCoordinate[]; sourceId: string }> = []
  const memories: TimelineMemory[] = []
  const places: Record<string, PlaceSummary> = {}
  const quarantined: QuarantinedRecord[] = []

  rawRecords.forEach((record, sourceIndex) => {
    const sourceId = `source-${sourceIndex}`
    if (!record || typeof record !== 'object') {
      quarantined.push({ sourceIndex, reason: 'Unsupported or malformed Timeline record.' })
      return
    }
    const recordObject = record as Record<string, unknown>

    if ('visit' in recordObject) {
      const visitResult = visitSchema.safeParse(record)
      if (!visitResult.success) {
        quarantined.push({ sourceIndex, reason: 'Visit is malformed.' })
        return
      }
      const start = parseTimestamp(visitResult.data.startTime)
      const end = parseTimestamp(visitResult.data.endTime)
      if (!start || !end || Date.parse(end) < Date.parse(start)) {
        quarantined.push({ sourceIndex, reason: 'Visit has an invalid time range.' })
        return
      }
      const candidate = visitResult.data.visit.topCandidate
      const coordinate = parseGeoCoordinate(candidate?.placeLocation)
      const placeId = candidate?.placeID ?? (coordinate ? `coordinate-${coordinateKey(coordinate, 4)}` : undefined)
      const id = stableId('visit', sourceIndex, start)
      const confidence = normalizeNumericString(candidate?.probability ?? visitResult.data.visit.probability)
      visits.push({
        id,
        start,
        end,
        coordinate,
        placeId,
        semanticType: candidate?.semanticType,
        hierarchyLevel: normalizeNumericString(visitResult.data.visit.hierarchyLevel),
        displayName: candidate?.displayName,
        confidence,
        sourceIds: [sourceId],
      })
      if (coordinate && placeId) {
        places[placeId] = {
          id: placeId,
          coordinate,
          displayName: candidate?.displayName,
          labelSource: candidate?.displayName ? 'embedded' : 'coordinate',
        }
      }
      return
    }

    if ('activity' in recordObject) {
      const activityResult = activitySchema.safeParse(record)
      if (!activityResult.success) {
        quarantined.push({ sourceIndex, reason: 'Activity is malformed.' })
        return
      }
      const start = parseTimestamp(activityResult.data.startTime)
      const end = parseTimestamp(activityResult.data.endTime)
      if (!start || !end || Date.parse(end) < Date.parse(start)) {
        quarantined.push({ sourceIndex, reason: 'Activity has an invalid time range.' })
        return
      }
      const activity = activityResult.data.activity
      legs.push({
        id: stableId('leg', sourceIndex, start),
        start,
        end,
        mode: MODE_MAP[(activity.topCandidate?.type ?? '').trim().toLowerCase().replaceAll('_', ' ')] ?? 'unknown',
        origin: parseGeoCoordinate(activity.start),
        destination: parseGeoCoordinate(activity.end),
        observedPath: [],
        sourceDistanceMeters: normalizeNumericString(activity.distanceMeters),
        confidence: normalizeNumericString(activity.topCandidate?.probability ?? activity.probability),
        sourceIds: [sourceId],
      })
      return
    }

    if ('timelinePath' in recordObject) {
      const pathResult = timelinePathSchema.safeParse(record)
      if (!pathResult.success) {
        quarantined.push({ sourceIndex, reason: 'Timeline path is malformed.' })
        return
      }
      const start = parseTimestamp(pathResult.data.startTime)
      const end = parseTimestamp(pathResult.data.endTime)
      if (!start || !end) {
        quarantined.push({ sourceIndex, reason: 'Timeline path has an invalid time range.' })
        return
      }
      paths.push({ start, end, points: reconstructPathTimestamps(start, pathResult.data.timelinePath), sourceId })
      return
    }

    if ('timelineMemory' in recordObject) {
      const memoryResult = memorySchema.safeParse(record)
      if (!memoryResult.success) {
        quarantined.push({ sourceIndex, reason: 'Timeline Memory is malformed.' })
        return
      }
      const start = parseTimestamp(memoryResult.data.startTime)
      const end = parseTimestamp(memoryResult.data.endTime)
      if (!start || !end) {
        quarantined.push({ sourceIndex, reason: 'Timeline Memory has an invalid time range.' })
        return
      }
      memories.push({
        id: stableId('memory', sourceIndex, start),
        start,
        end,
        destinationIds: memoryResult.data.timelineMemory.destinations?.map((item) => item.identifier) ?? [],
        distanceFromOriginKm: normalizeNumericString(memoryResult.data.timelineMemory.distanceFromOriginKms),
        sourceIds: [sourceId],
      })
      return
    }

    quarantined.push({ sourceIndex, reason: 'Unsupported or malformed Timeline record.' })
  })

  legs.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  const exactLegs = new Map<string, Leg[]>()
  for (const leg of legs) {
    const key = `${leg.start}|${leg.end}`
    const matches = exactLegs.get(key) ?? []
    matches.push(leg)
    exactLegs.set(key, matches)
  }

  for (const path of paths) {
    const exact = exactLegs.get(`${path.start}|${path.end}`)?.find((leg) => leg.observedPath.length === 0)
    const matchingLeg = exact ?? findBestMatchingLeg(legs, path)
    if (matchingLeg) {
      matchingLeg.observedPath = [...matchingLeg.observedPath, ...path.points]
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
        .filter((point, index, points) => index === 0 || coordinateKey(point, 6) !== coordinateKey(points[index - 1], 6))
      matchingLeg.sourceIds.push(path.sourceId)
      matchingLeg.origin ??= path.points[0]
      matchingLeg.destination ??= path.points.at(-1)
    } else if (path.points.length > 1) {
      legs.push({
        id: `leg-path-${path.sourceId}`,
        start: path.start,
        end: path.end,
        mode: inferModeFromPath(path.points, path.start, path.end),
        origin: path.points[0],
        destination: path.points.at(-1),
        observedPath: path.points,
        sourceIds: [path.sourceId],
      })
    }
  }

  const dedupedVisits = deduplicateVisits(visits)
  legs.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  const timestamps = [...dedupedVisits.flatMap((item) => [item.start, item.end]), ...legs.flatMap((item) => [item.start, item.end])]
    .filter(Boolean)
    .sort((a, b) => Date.parse(a) - Date.parse(b))
  const observedPointCount = legs.reduce((count, leg) => count + leg.observedPath.length, 0)
  const coverageWarnings: string[] = []
  if (quarantined.length) coverageWarnings.push(`${quarantined.length} record${quarantined.length === 1 ? '' : 's'} could not be used.`)
  if (observedPointCount < Math.max(4, legs.length)) coverageWarnings.push('Some movement legs are sparse and will use explicit inferred geometry.')

  return {
    schemaVersion: 2,
    id: `dataset-${Date.parse(importedAt).toString(36)}`,
    sourceName,
    importedAt,
    visits: dedupedVisits,
    legs,
    places,
    memories,
    quarantined,
    report: {
      sourceName,
      dateRange: timestamps.length ? { start: timestamps[0], end: timestamps.at(-1)! } : undefined,
      recordsRead: rawRecords.length,
      visits: dedupedVisits.length,
      movementLegs: legs.length,
      pathPoints: observedPointCount,
      malformedRecords: quarantined.length,
      tripsDetected: 0,
      coverageWarnings,
      durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    },
  }
}

export function parseTimelineText(text: string, sourceName?: string, importedAt?: string): NormalizedTimeline {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON. Export Timeline as JSON and try again.')
  }
  return parseTimelineRecords(parsed, sourceName, importedAt)
}
