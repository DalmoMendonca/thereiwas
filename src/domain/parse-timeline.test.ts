import { describe, expect, it } from 'vitest'
import { normalizeNumericString, parseGeoCoordinate, parseTimestamp } from './geo'
import { parseTimelineRecords, reconstructPathTimestamps } from './parse-timeline'

describe('Timeline primitives', () => {
  it('parses geo coordinates and rejects invalid coordinates', () => {
    expect(parseGeoCoordinate('geo:64.1466,-21.9426')).toEqual({ lat: 64.1466, lng: -21.9426 })
    expect(parseGeoCoordinate('geo:99,2')).toBeUndefined()
    expect(parseGeoCoordinate('64.1,-21.9')).toBeUndefined()
  })

  it('normalizes numeric strings without coercing blanks', () => {
    expect(normalizeNumericString(' 42.5 ')).toBe(42.5)
    expect(normalizeNumericString('')).toBeUndefined()
    expect(normalizeNumericString('forty')).toBeUndefined()
  })

  it('keeps valid offset timestamps and rejects invalid values', () => {
    expect(parseTimestamp('2026-07-03T08:35:00-04:00')).toBe('2026-07-03T08:35:00-04:00')
    expect(parseTimestamp('not-a-date')).toBeUndefined()
  })

  it('reconstructs path timestamps and removes consecutive duplicate points', () => {
    const result = reconstructPathTimestamps('2026-07-04T09:10:00+00:00', [
      { point: 'geo:64.1,-21.9', durationMinutesOffsetFromStartTime: '0' },
      { point: 'geo:64.1,-21.9', durationMinutesOffsetFromStartTime: '10' },
      { point: 'geo:64.2,-21.8', durationMinutesOffsetFromStartTime: '15' },
    ])
    expect(result).toHaveLength(2)
    expect(result[1].timestamp).toBe('2026-07-04T09:25:00.000Z')
  })

  it('deduplicates hierarchy visits and quarantines malformed records independently', () => {
    const base = {
      startTime: '2026-07-01T22:00:00-04:00',
      endTime: '2026-07-02T06:00:00-04:00',
      visit: { topCandidate: { placeID: 'home', placeLocation: 'geo:33.7,-84.3', semanticType: 'Home' } },
    }
    const timeline = parseTimelineRecords([base, { ...base, visit: { hierarchyLevel: '1', ...base.visit } }, { hello: 'world' }], 'test.json')
    expect(timeline.visits).toHaveLength(1)
    expect(timeline.visits[0].sourceIds).toHaveLength(2)
    expect(timeline.quarantined).toHaveLength(1)
    expect(timeline.report.recordsRead).toBe(3)
  })
})

