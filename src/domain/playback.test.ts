import { describe, expect, it } from 'vitest'
import { buildDirectedKeyframes, mapCinematicProgress, type PlaybackTimeline } from './playback'
import type { MemoryPlan } from './types'

const timeline: PlaybackTimeline = {
  points: [
    { lat: 35, lng: -97, timestamp: '2026-06-01T00:00:00Z', mode: 'driving', legId: 'out', cumulativeDistanceKm: 0, utcOffsetMinutes: -300 },
    { lat: 34, lng: -118, timestamp: '2026-06-11T00:00:00Z', mode: 'driving', legId: 'back', cumulativeDistanceKm: 2000, utcOffsetMinutes: -420 },
  ],
  startMs: Date.parse('2026-06-01T00:00:00Z'),
  endMs: Date.parse('2026-06-11T00:00:00Z'),
  totalDistanceKm: 2000,
}

const plan: MemoryPlan = {
  title: 'California',
  oneLineMemory: 'A loop west and home again.',
  chapters: [
    { title: 'Outward', start: '2026-06-02T00:00:00Z', end: '2026-06-04T00:00:00Z', summary: 'The drive west.' },
    { title: 'Coast', start: '2026-06-06T00:00:00Z', end: '2026-06-09T00:00:00Z', summary: 'Time on the coast before the return.' },
  ],
  highlights: [],
  captions: [],
  reflectionQuestions: [],
  uncertaintyNotes: [],
}

describe('GPT-directed playback', () => {
  it('uses the generated chapter boundaries while preserving the full loop', () => {
    const frames = buildDirectedKeyframes(plan, timeline)
    expect(frames[0].tripStart).toBe(0)
    expect(frames.at(-1)?.tripEnd).toBe(1)
    expect(frames.filter((frame) => frame.kind === 'chapter')).toHaveLength(2)
    expect(frames[0].wallStart).toBe(0)
    expect(frames.at(-1)?.wallEnd).toBe(1)
    expect(mapCinematicProgress(frames, 0)).toBe(0)
    expect(mapCinematicProgress(frames, 1)).toBe(1)
  })
})
