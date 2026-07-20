import { z } from 'zod'
import { coordinateKey, normalizeNumericString, parseGeoCoordinate, parseTimestamp } from './geo'
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
  IN_PASSENGER_VEHICLE: 'driving',
  IN_VEHICLE: 'driving',
  MOTORCYCLING: 'driving',
  WALKING: 'walking',
  CYCLING: 'cycling',
  RUNNING: 'running',
  FLYING: 'flight',
  IN_TRAIN: 'train',
  IN_SUBWAY: 'subway',
  IN_TRAM: 'tram',
  IN_BUS: 'bus',
  IN_FERRY: 'ferry',
  SKIING: 'skiing',
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

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return Date.parse(aStart) <= Date.parse(bEnd) && Date.parse(bStart) <= Date.parse(aEnd)
}

function deduplicateVisits(visits: Visit[]): Visit[] {
  const map = new Map<string, Visit>()
  for (const visit of visits) {
    const location = visit.coordinate ? coordinateKey(visit.coordinate, 5) : visit.placeId ?? 'unknown'
    const key = `${visit.start}|${visit.end}|${location}`
    const existing = map.get(key)
    if (existing) {
      existing.sourceIds.push(...visit.sourceIds)
      if ((visit.confidence ?? 0) > (existing.confidence ?? 0)) map.set(key, { ...visit, sourceIds: existing.sourceIds })
    } else {
      map.set(key, visit)
    }
  }
  return [...map.values()].sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
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
    const visitResult = visitSchema.safeParse(record)
    if (visitResult.success) {
      const start = parseTimestamp(visitResult.data.startTime)
      const end = parseTimestamp(visitResult.data.endTime)
      if (!start || !end || Date.parse(end) < Date.parse(start)) {
        quarantined.push({ sourceIndex, reason: 'Visit has an invalid time range.' })
        return
      }
      const candidate = visitResult.data.visit.topCandidate
      const coordinate = parseGeoCoordinate(candidate?.placeLocation)
      const id = stableId('visit', sourceIndex, start)
      const confidence = normalizeNumericString(candidate?.probability ?? visitResult.data.visit.probability)
      visits.push({
        id,
        start,
        end,
        coordinate,
        placeId: candidate?.placeID,
        semanticType: candidate?.semanticType,
        displayName: candidate?.displayName,
        confidence,
        sourceIds: [sourceId],
      })
      if (coordinate) {
        const placeId = candidate?.placeID ?? `coordinate-${coordinateKey(coordinate, 4)}`
        places[placeId] = {
          id: placeId,
          coordinate,
          displayName: candidate?.displayName,
          labelSource: candidate?.displayName ? 'sample' : 'coordinate',
        }
      }
      return
    }

    const activityResult = activitySchema.safeParse(record)
    if (activityResult.success) {
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
        mode: MODE_MAP[activity.topCandidate?.type ?? ''] ?? 'unknown',
        origin: parseGeoCoordinate(activity.start),
        destination: parseGeoCoordinate(activity.end),
        observedPath: [],
        sourceDistanceMeters: normalizeNumericString(activity.distanceMeters),
        confidence: normalizeNumericString(activity.topCandidate?.probability ?? activity.probability),
        sourceIds: [sourceId],
      })
      return
    }

    const pathResult = timelinePathSchema.safeParse(record)
    if (pathResult.success) {
      const start = parseTimestamp(pathResult.data.startTime)
      const end = parseTimestamp(pathResult.data.endTime)
      if (!start || !end) {
        quarantined.push({ sourceIndex, reason: 'Timeline path has an invalid time range.' })
        return
      }
      paths.push({ start, end, points: reconstructPathTimestamps(start, pathResult.data.timelinePath), sourceId })
      return
    }

    const memoryResult = memorySchema.safeParse(record)
    if (memoryResult.success) {
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

  for (const path of paths) {
    const matchingLeg = legs.find((leg) => overlaps(leg.start, leg.end, path.start, path.end))
    if (matchingLeg) {
      matchingLeg.observedPath = path.points
      matchingLeg.sourceIds.push(path.sourceId)
      matchingLeg.origin ??= path.points[0]
      matchingLeg.destination ??= path.points.at(-1)
    } else if (path.points.length > 1) {
      legs.push({
        id: `leg-path-${path.sourceId}`,
        start: path.start,
        end: path.end,
        mode: 'unknown',
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

