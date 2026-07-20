import { describe, expect, it } from 'vitest'
import { binarySearchPlayback, buildCinematicKeyframes, buildPlaybackTimeline, interpolatePlayback, mapCinematicProgress } from './playback'
import { buildTripRoutes, needsDirections, profileForMode, routeFingerprint, selectLocalGeometry, timestampGeometryByDistance } from './route-reconstruction'
import type { Leg, NormalizedTimeline, TripRecord } from './types'

const leg: Leg = {
  id: 'leg-1',
  start: '2026-07-03T08:00:00.000Z',
  end: '2026-07-03T10:00:00.000Z',
  mode: 'driving',
  origin: { lat: 0, lng: 0 },
  destination: { lat: 0, lng: 2 },
  observedPath: [],
  sourceIds: ['source-1'],
}

describe('route reconstruction and playback', () => {
  it('never maps unsupported modes to driving', () => {
    expect(profileForMode('train')).toBeUndefined()
    expect(profileForMode('unknown')).toBeUndefined()
    expect(profileForMode('walking')).toBe('walking')
  })

  it('creates a deterministic route fingerprint', () => {
    expect(routeFingerprint(leg)).toBe(routeFingerprint({ ...leg }))
    expect(routeFingerprint({ ...leg, mode: 'walking' })).not.toBe(routeFingerprint(leg))
  })

  it('routes sparse ground evidence instead of drawing long chords', () => {
    expect(needsDirections({ ...leg, observedPath: [] })).toBe(true)
    expect(needsDirections({ ...leg, observedPath: timestampGeometryByDistance([{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }], leg.start, leg.end) })).toBe(true)
    expect(needsDirections({ ...leg, destination: { lat: 0, lng: 0.02 }, observedPath: timestampGeometryByDistance([{ lat: 0, lng: 0 }, { lat: 0, lng: 0.01 }, { lat: 0, lng: 0.02 }], leg.start, leg.end) })).toBe(false)
  })

  it('allocates route time by cumulative distance', () => {
    const points = timestampGeometryByDistance(
      [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 0.1 },
        { lat: 0, lng: 2 },
      ],
      leg.start,
      leg.end,
    )
    const firstInterval = Date.parse(points[1].timestamp) - Date.parse(points[0].timestamp)
    const secondInterval = Date.parse(points[2].timestamp) - Date.parse(points[1].timestamp)
    expect(secondInterval).toBeGreaterThan(firstInterval * 10)
  })

  it('interpolates distance and position with binary search', () => {
    const route = selectLocalGeometry(leg)
    const timeline = buildPlaybackTimeline([route])
    const state = interpolatePlayback(timeline, 0.5)
    expect(state?.distanceKm).toBeGreaterThan(0)
    expect(binarySearchPlayback(timeline.points, timeline.startMs)).toBe(0)
    expect(state?.progress).toBe(0.5)
    expect(state?.utcOffsetMinutes).toBe(0)
  })

  it('allocates cinematic time to movement instead of raw trip duration', () => {
    const route = selectLocalGeometry(leg)
    const timeline = buildPlaybackTimeline([route])
    const frames = buildCinematicKeyframes([route], timeline)
    expect(frames).toHaveLength(2)
    expect(mapCinematicProgress(frames, 0.5)).toBeGreaterThan(0.5)
  })

  it('closes every reconstructed trip at Home', async () => {
    const timeline = {
      schemaVersion: 3,
      id: 'timeline',
      sourceName: 'test',
      importedAt: leg.start,
      visits: [],
      legs: [{ ...leg, observedPath: timestampGeometryByDistance([{ lat: 1, lng: 1 }, { lat: 1, lng: 2 }], leg.start, leg.end) }],
      places: {},
      memories: [],
      quarantined: [],
      report: { sourceName: 'test', recordsRead: 1, visits: 0, movementLegs: 1, pathPoints: 2, malformedRecords: 0, tripsDetected: 1, coverageWarnings: [], durationMs: 1 },
    } satisfies NormalizedTimeline
    const trip = {
      id: 'trip', source: 'detected', status: 'proposed', title: 'Trip', start: leg.start, end: leg.end,
      startLocked: false, endLocked: false, destinationIds: [], destinations: [], visitIds: [], legIds: [leg.id],
      home: { name: 'Home', coordinate: { lat: 0, lng: 0 } },
      evidence: { start: leg.start, end: leg.end, homeDistanceKm: 200, nightsAway: 1, destinationCount: 0, modes: ['flight'], timelineMemorySupport: false, coverageScore: 1, reasons: [] },
      createdAt: leg.start, updatedAt: leg.start,
    } satisfies TripRecord

    const routes = await buildTripRoutes(timeline, trip)
    expect(routes[0].points[0]).toMatchObject(trip.home.coordinate)
    expect(routes.at(-1)?.points.at(-1)).toMatchObject(trip.home.coordinate)
  })
})
