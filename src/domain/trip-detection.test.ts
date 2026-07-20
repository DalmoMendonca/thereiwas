import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { parseTimelineText } from './parse-timeline'
import { createManualTrip, detectTrips, inferHome } from './trip-detection'
import type { NormalizedTimeline } from './types'

let timeline: NormalizedTimeline

beforeAll(() => {
  timeline = parseTimelineText(readFileSync(resolve('public/sample/sample-timeline.json'), 'utf8'), 'sample-timeline.json')
})

describe('trip intelligence', () => {
  it('infers an explicit semantic home', () => {
    const home = inferHome(timeline)
    expect(home?.displayName).toBe('Home')
    expect(home?.confidence).toBeGreaterThanOrEqual(0.92)
  })

  it('detects the generated sample journey with explainable boundaries', () => {
    const trips = detectTrips(timeline)
    expect(trips).toHaveLength(1)
    const [trip] = trips
    expect(trip).toBeDefined()
    expect(trip.destinationIds).toEqual(expect.arrayContaining(['sample-reykjavik', 'sample-vik', 'sample-jokulsarlon']))
    expect(trip.evidence.modes).toContain('flight')
    expect(trip.evidence.timelineMemorySupport).toBe(true)
    expect(trip.evidence.reasons.join(' ')).toContain('Timeline Memory')
    expect(Date.parse(trip.end)).toBeGreaterThan(Date.parse(trip.start))
  })

  it('creates a locked user trip from any valid date range', () => {
    const trip = createManualTrip(timeline, {
      start: '2026-07-04T00:00:00.000Z',
      end: '2026-07-07T23:59:59.999Z',
      title: 'The south coast days',
    })
    expect(trip.source).toBe('user')
    expect(trip.startLocked).toBe(true)
    expect(trip.title).toBe('The south coast days')
  })
})
