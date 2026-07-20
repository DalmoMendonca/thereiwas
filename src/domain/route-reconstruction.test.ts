import { describe, expect, it } from 'vitest'
import { binarySearchPlayback, buildCinematicKeyframes, buildPlaybackTimeline, interpolatePlayback, mapCinematicProgress } from './playback'
import { profileForMode, routeFingerprint, selectLocalGeometry, timestampGeometryByDistance } from './route-reconstruction'
import type { Leg } from './types'

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
})
