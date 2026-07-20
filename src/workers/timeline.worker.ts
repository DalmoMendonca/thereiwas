/// <reference lib="webworker" />

import { detectTrips, inferHome } from '../domain/trip-detection'
import { parseTimelineText } from '../domain/parse-timeline'

const stages = [
  ['Reading', 8],
  ['Parsing', 24],
  ['Normalizing', 42],
  ['Reconstructing paths', 58],
  ['Detecting home', 70],
  ['Detecting trips', 82],
  ['Preparing routes', 91],
] as const

self.onmessage = async (event: MessageEvent<{ text: string; sourceName: string }>) => {
  try {
    for (const [stage, progress] of stages.slice(0, 3)) self.postMessage({ type: 'progress', stage, progress })
    const timeline = parseTimelineText(event.data.text, event.data.sourceName)
    for (const [stage, progress] of stages.slice(3, 5)) self.postMessage({ type: 'progress', stage, progress })
    const home = inferHome(timeline)
    self.postMessage({ type: 'progress', stage: 'Detecting trips', progress: 82 })
    const trips = detectTrips(timeline, home)
    timeline.report.likelyHome = home?.displayName
    timeline.report.tripsDetected = trips.length
    self.postMessage({ type: 'progress', stage: 'Preparing routes', progress: 91 })
    self.postMessage({ type: 'complete', timeline, trips, home })
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'The Timeline could not be imported.' })
  }
}

export {}

