/// <reference lib="webworker" />

import { detectTrips, inferHome } from '../domain/trip-detection'
import { parseTimelineText } from '../domain/parse-timeline'
import { nameTimelinePlaces, type GazetteerData } from '../domain/place-names'

const stages = [
  ['Reading', 8],
  ['Parsing', 24],
  ['Normalizing', 42],
  ['Reconstructing paths', 58],
  ['Naming places', 66],
  ['Detecting home', 74],
  ['Detecting trips', 84],
  ['Preparing routes', 93],
] as const

self.onmessage = async (event: MessageEvent<{ text: string; sourceName: string }>) => {
  try {
    for (const [stage, progress] of stages.slice(0, 3)) self.postMessage({ type: 'progress', stage, progress })
    const timeline = parseTimelineText(event.data.text, event.data.sourceName)
    self.postMessage({ type: 'progress', stage: 'Reconstructing paths', progress: 58 })
    self.postMessage({ type: 'progress', stage: 'Naming places', progress: 66 })
    const gazetteerResponse = await fetch('/data/cities.json', { cache: 'force-cache' })
    if (!gazetteerResponse.ok) throw new Error('Place names could not be loaded. Try the import again.')
    nameTimelinePlaces(timeline, await gazetteerResponse.json() as GazetteerData)
    self.postMessage({ type: 'progress', stage: 'Detecting home', progress: 74 })
    const home = inferHome(timeline)
    self.postMessage({ type: 'progress', stage: 'Detecting trips', progress: 84 })
    const trips = detectTrips(timeline, home)
    timeline.report.likelyHome = home?.displayName
    timeline.report.tripsDetected = trips.length
    self.postMessage({ type: 'progress', stage: 'Preparing routes', progress: 93 })
    self.postMessage({ type: 'complete', timeline, trips, home })
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'The Timeline could not be imported.' })
  }
}

export {}
