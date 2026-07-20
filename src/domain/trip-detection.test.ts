import { beforeAll, describe, expect, it } from 'vitest'
import { parseTimelineRecords } from './parse-timeline'
import { createManualTrip, detectTrips, inferHome } from './trip-detection'
import type { NormalizedTimeline } from './types'

const records = [
  { startTime: '2026-01-01T00:00:00Z', endTime: '2026-01-02T08:00:00Z', visit: { topCandidate: { semanticType: 'Home', placeID: 'home', placeLocation: 'geo:30.2672,-97.7431', displayName: 'Home' } } },
  { startTime: '2026-01-02T08:00:00Z', endTime: '2026-01-02T10:45:00Z', activity: { start: 'geo:30.2672,-97.7431', end: 'geo:32.7157,-117.1611', distanceMeters: '1850000', topCandidate: { type: 'FLYING' } } },
  { startTime: '2026-01-02T11:00:00Z', endTime: '2026-01-04T09:00:00Z', visit: { topCandidate: { placeID: 'san-diego', placeLocation: 'geo:32.7157,-117.1611', displayName: 'San Diego' } } },
  { startTime: '2026-01-04T09:00:00Z', endTime: '2026-01-04T11:30:00Z', activity: { start: 'geo:32.7157,-117.1611', end: 'geo:34.0522,-118.2437', distanceMeters: '195000', topCandidate: { type: 'IN_PASSENGER_VEHICLE' } } },
  { startTime: '2026-01-04T11:30:00Z', endTime: '2026-01-06T08:00:00Z', visit: { topCandidate: { placeID: 'los-angeles', placeLocation: 'geo:34.0522,-118.2437', displayName: 'Los Angeles' } } },
  { startTime: '2026-01-06T08:00:00Z', endTime: '2026-01-06T10:45:00Z', activity: { start: 'geo:34.0522,-118.2437', end: 'geo:30.2672,-97.7431', distanceMeters: '1980000', topCandidate: { type: 'flying' } } },
  { startTime: '2026-01-06T11:00:00Z', endTime: '2026-01-07T12:00:00Z', visit: { topCandidate: { semanticType: 'Home', placeID: 'home', placeLocation: 'geo:30.2672,-97.7431', displayName: 'Home' } } },
  { startTime: '2026-01-02T08:00:00Z', endTime: '2026-01-06T11:00:00Z', timelineMemory: { destinations: [{ identifier: 'san-diego' }, { identifier: 'los-angeles' }] } },
]

let timeline: NormalizedTimeline

beforeAll(() => {
  timeline = parseTimelineRecords(records, 'parser fixture')
  timeline.places['home'] = { ...timeline.places['home'], locality: 'Austin', region: 'Texas', country: 'United States', countryCode: 'US' }
  timeline.places['san-diego'] = { ...timeline.places['san-diego'], locality: 'San Diego', region: 'California', country: 'United States', countryCode: 'US' }
  timeline.places['los-angeles'] = { ...timeline.places['los-angeles'], locality: 'Los Angeles', region: 'California', country: 'United States', countryCode: 'US' }
})

describe('trip intelligence', () => {
  it('infers an explicit semantic home', () => {
    const home = inferHome(timeline)
    expect(home?.displayName).toBe('Home')
    expect(home?.confidence).toBeGreaterThanOrEqual(0.92)
  })

  it('deduplicates one trip between home returns and names its destinations', () => {
    const trips = detectTrips(timeline)
    expect(trips).toHaveLength(1)
    const [trip] = trips
    expect(trip.title).toBe('California')
    expect(trip.destinations.map((destination) => destination.name)).toEqual(['San Diego', 'Los Angeles'])
    expect(trip.evidence.modes).toEqual(expect.arrayContaining(['flight', 'driving']))
    expect(trip.evidence.timelineMemorySupport).toBe(true)
    expect(trip.evidence.reasons.join(' ')).toContain('Timeline Memory')
  })

  it('creates a locked user trip from any valid date range', () => {
    const trip = createManualTrip(timeline, {
      start: '2026-01-03T00:00:00.000Z',
      end: '2026-01-05T23:59:59.999Z',
      title: 'Southern California',
    })
    expect(trip.source).toBe('user')
    expect(trip.startLocked).toBe(true)
    expect(trip.title).toBe('Southern California')
  })
})
