import { describe, expect, it } from 'vitest'
import { memoryCardFilename, projectRoutes } from './memory-artifact'
import type { RouteGeometry } from './route-reconstruction'

const route: RouteGeometry = {
  legId: 'loop',
  mode: 'driving',
  provenance: 'observed',
  distanceKm: 100,
  startOffsetMinutes: 0,
  endOffsetMinutes: 0,
  points: [
    { lat: 35, lng: -97, timestamp: '2026-01-01T00:00:00Z' },
    { lat: 34, lng: -118, timestamp: '2026-01-02T00:00:00Z' },
    { lat: 35, lng: -97, timestamp: '2026-01-03T00:00:00Z' },
  ],
}

describe('memory card geometry', () => {
  it('fits the complete loop inside the export frame', () => {
    const projection = projectRoutes([route], 900, 500, 50)
    const points = projection.routes.flatMap((item) => item.points)
    expect(points.every((point) => point.x >= 50 && point.x <= 850)).toBe(true)
    expect(points.every((point) => point.y >= 50 && point.y <= 450)).toBe(true)
    expect(points[0]).toEqual(points.at(-1))
  })

  it('creates a stable download name', () => {
    expect(memoryCardFilename('California, Again')).toBe('there-i-was-california-again.png')
  })
})
