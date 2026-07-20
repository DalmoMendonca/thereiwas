import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildMemoryDossier, validateMemoryPlan } from './memory-director'
import { parseTimelineText } from './parse-timeline'
import { detectTrips } from './trip-detection'

describe('Memory Director grounding', () => {
  const timeline = parseTimelineText(readFileSync(resolve('public/sample/sample-timeline.json'), 'utf8'), 'sample.json')
  const trip = detectTrips(timeline)[0]

  it('minimizes the dossier and excludes raw coordinates', () => {
    const dossier = buildMemoryDossier(timeline, trip)
    const serialized = JSON.stringify(dossier)
    expect(serialized).not.toContain('33.749')
    expect(serialized).not.toContain('observedPath')
    expect(serialized).not.toContain('sourceIds')
    expect(dossier.destinations.map((item) => item.name)).toContain('Reykjavík')
  })

  it('validates the cached structured Memory Plan', () => {
    const plan = JSON.parse(readFileSync(resolve('public/sample/sample-memory-plan.json'), 'utf8'))
    expect(validateMemoryPlan(plan).highlights.every((item) => item.groundingIds.length > 0)).toBe(true)
  })
})

