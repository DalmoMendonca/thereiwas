import { describe, expect, it } from 'vitest'
import { buildMemoryDossier, createDeterministicMemoryPlan, validateMemoryPlan } from './memory-director'
import { parseTimelineRecords } from './parse-timeline'
import { detectTrips } from './trip-detection'

const timeline = parseTimelineRecords([
  { startTime: '2026-01-01T00:00:00Z', endTime: '2026-01-02T08:00:00Z', visit: { topCandidate: { semanticType: 'Home', placeID: 'home', placeLocation: 'geo:30.2672,-97.7431', displayName: 'Home' } } },
  { startTime: '2026-01-02T08:00:00Z', endTime: '2026-01-02T10:45:00Z', activity: { start: 'geo:30.2672,-97.7431', end: 'geo:32.7157,-117.1611', distanceMeters: '1850000', topCandidate: { type: 'flying' } } },
  { startTime: '2026-01-02T11:00:00Z', endTime: '2026-01-04T09:00:00Z', visit: { topCandidate: { placeID: 'san-diego', placeLocation: 'geo:32.7157,-117.1611', displayName: 'San Diego' } } },
  { startTime: '2026-01-04T10:00:00Z', endTime: '2026-01-04T12:00:00Z', activity: { start: 'geo:32.7157,-117.1611', end: 'geo:30.2672,-97.7431', distanceMeters: '1850000', topCandidate: { type: 'flying' } } },
  { startTime: '2026-01-04T12:00:00Z', endTime: '2026-01-05T12:00:00Z', visit: { topCandidate: { semanticType: 'Home', placeID: 'home', placeLocation: 'geo:30.2672,-97.7431', displayName: 'Home' } } },
], 'dossier fixture')

timeline.places['home'] = { ...timeline.places['home'], locality: 'Austin', region: 'Texas', country: 'United States', countryCode: 'US' }
timeline.places['san-diego'] = { ...timeline.places['san-diego'], locality: 'San Diego', region: 'California', country: 'United States', countryCode: 'US' }
const trip = detectTrips(timeline)[0]

describe('Memory Director grounding', () => {
  it('uses named places while excluding raw coordinates and path data', () => {
    const dossier = buildMemoryDossier(timeline, trip)
    const serialized = JSON.stringify(dossier)
    expect(serialized).not.toContain('30.2672')
    expect(serialized).not.toContain('observedPath')
    expect(serialized).not.toContain('sourceIds')
    expect(dossier.destinations.map((item) => item.name)).toContain('San Diego')
    expect(dossier.legs.some((leg) => leg.from || leg.to)).toBe(true)
  })

  it('validates a grounded local story plan', () => {
    const dossier = buildMemoryDossier(timeline, trip)
    const plan = validateMemoryPlan(createDeterministicMemoryPlan(dossier))
    expect(plan.chapters.length).toBeGreaterThan(0)
    expect(plan.highlights.every((item) => item.groundingIds.length > 0)).toBe(true)
    expect(JSON.stringify(plan)).not.toContain('Unnamed stop')
  })
})
