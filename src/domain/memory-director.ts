import { z } from 'zod'
import { haversineKm } from './geo'
import type { MemoryDossier, MemoryPlan, NormalizedTimeline, ReflectionAnswer, TripRecord } from './types'

export const memoryPlanSchema = z.object({
  title: z.string().min(1).max(100),
  oneLineMemory: z.string().min(1).max(220),
  chapters: z.array(
    z.object({
      title: z.string().min(1).max(100),
      start: z.string(),
      end: z.string(),
      summary: z.string().min(1).max(600),
    }),
  ).max(8),
  highlights: z.array(
    z.object({
      timestamp: z.string(),
      title: z.string().min(1).max(100),
      description: z.string().min(1).max(500),
      groundingIds: z.array(z.string()).min(1).max(12),
      certainty: z.enum(['observed', 'inferred', 'user-supplied']),
    }),
  ).max(12),
  captions: z.array(
    z.object({ timestamp: z.string(), text: z.string().min(1).max(240), groundingIds: z.array(z.string()).min(1).max(12) }),
  ).max(20),
  reflectionQuestions: z.array(
    z.object({ id: z.string().min(1).max(80), question: z.string().min(1).max(240), reason: z.string().min(1).max(300) }),
  ).max(6),
  uncertaintyNotes: z.array(z.string().min(1).max(320)).max(12),
})

export function validateMemoryPlan(value: unknown): MemoryPlan {
  return memoryPlanSchema.parse(value)
}

function legDistanceKm(timeline: NormalizedTimeline, legId: string): number {
  const leg = timeline.legs.find((item) => item.id === legId)
  if (!leg) return 0
  if (leg.sourceDistanceMeters) return leg.sourceDistanceMeters / 1000
  if (leg.origin && leg.destination) return haversineKm(leg.origin, leg.destination)
  return 0
}

function dayKey(timestamp: string): string {
  return timestamp.slice(0, 10)
}

export function buildMemoryDossier(
  timeline: NormalizedTimeline,
  trip: TripRecord,
  reflectionAnswers: ReflectionAnswer[] = [],
  userNotes: string[] = [],
): MemoryDossier {
  const visits = timeline.visits.filter((visit) => trip.visitIds.includes(visit.id) && visit.semanticType?.toLowerCase() !== 'home')
  const legs = timeline.legs.filter((leg) => trip.legIds.includes(leg.id))
  const destinations = trip.destinationIds.map((id) => {
    const related = visits.filter((visit) => (visit.placeId ?? visit.id) === id)
    const place = timeline.places[id]
    const first = related[0]
    const last = related.at(-1)
    return {
      id,
      name: place?.displayName ?? first?.displayName ?? 'Unnamed stop',
      firstArrival: first?.start ?? trip.start,
      lastDeparture: last?.end ?? trip.end,
      durationMinutes: related.reduce((sum, visit) => sum + Math.max(0, Math.round((Date.parse(visit.end) - Date.parse(visit.start)) / 60_000)), 0),
    }
  })

  const days = new Map<string, MemoryDossier['days'][number]>()
  for (const visit of visits) {
    const date = dayKey(visit.start)
    const entry = days.get(date) ?? { date, destinationIds: [], movementKm: 0, notableTransitions: [] }
    entry.destinationIds.push(visit.placeId ?? visit.id)
    days.set(date, entry)
  }
  for (const leg of legs) {
    const date = dayKey(leg.start)
    const entry = days.get(date) ?? { date, destinationIds: [], movementKm: 0, notableTransitions: [] }
    entry.movementKm += legDistanceKm(timeline, leg.id)
    if (leg.mode === 'flight' || leg.mode === 'train' || leg.mode === 'ferry') entry.notableTransitions.push(`${leg.mode} transition`)
    days.set(date, entry)
  }

  const totalDistanceKm = legs.reduce((sum, leg) => sum + legDistanceKm(timeline, leg.id), 0)
  return {
    trip: {
      title: trip.title,
      start: trip.start,
      end: trip.end,
      durationDays: Math.max(1, Math.ceil((Date.parse(trip.end) - Date.parse(trip.start)) / 86_400_000)),
      nightsAway: trip.evidence.nightsAway,
      totalDistanceKm: Math.round(totalDistanceKm),
    },
    destinations,
    legs: legs.map((leg) => ({
      id: leg.id,
      start: leg.start,
      end: leg.end,
      mode: leg.mode,
      distanceKm: Math.round(legDistanceKm(timeline, leg.id) * 10) / 10,
    })),
    days: [...days.values()].map((day) => ({
      ...day,
      destinationIds: [...new Set(day.destinationIds)],
      movementKm: Math.round(day.movementKm * 10) / 10,
    })),
    coverage: { score: trip.evidence.coverageScore, gaps: timeline.report.coverageWarnings },
    uncertainties: [
      ...timeline.quarantined.map((record) => `Source record ${record.sourceIndex} was not usable.`),
      ...visits.filter((visit) => (visit.confidence ?? 1) < 0.6).map((visit) => `${visit.displayName ?? 'A stop'} has low-confidence visit evidence.`),
    ],
    userNotes: userNotes.filter(Boolean).slice(0, 20),
    reflectionAnswers: reflectionAnswers.filter((item) => item.answer.trim()).slice(0, 10),
  }
}

export function applyReflectionAnswer(plan: MemoryPlan, questionId: string, answer: string): MemoryPlan {
  const question = plan.reflectionQuestions.find((item) => item.id === questionId)
  if (!question || !answer.trim()) return plan
  const timestamp = plan.highlights.at(-1)?.timestamp ?? plan.chapters[0]?.start ?? new Date().toISOString()
  return {
    ...plan,
    oneLineMemory: answer.trim(),
    highlights: [
      ...plan.highlights,
      {
        timestamp,
        title: 'What you remembered',
        description: answer.trim(),
        groundingIds: [`reflection:${questionId}`],
        certainty: 'user-supplied',
      },
    ],
    uncertaintyNotes: plan.uncertaintyNotes.filter((note) => !note.toLowerCase().includes(questionId.toLowerCase())),
  }
}

export function createDeterministicMemoryPlan(dossier: MemoryDossier): MemoryPlan {
  const destinations = dossier.destinations.map((item) => item.name)
  const first = dossier.destinations[0]
  const last = dossier.destinations.at(-1)
  const longestLeg = [...dossier.legs].sort((a, b) => b.distanceKm - a.distanceKm)[0]
  const latestAnswer = dossier.reflectionAnswers.at(-1)
  const middleStart = first?.firstArrival ?? dossier.trip.start
  const middleEnd = last?.lastDeparture ?? dossier.trip.end
  const observedHighlights: MemoryPlan['highlights'] = []
  if (longestLeg) {
    observedHighlights.push({
      timestamp: longestLeg.start,
      title: longestLeg.mode === 'flight' ? 'The long crossing' : `The longest ${longestLeg.mode} leg`,
      description: `${Math.round(longestLeg.distanceKm).toLocaleString()} km of ${longestLeg.mode} movement anchors the largest transition in the record.`,
      groundingIds: [longestLeg.id],
      certainty: 'observed',
    })
  }
  if (last) {
    observedHighlights.push({
      timestamp: last.firstArrival,
      title: `Arrival at ${last.name}`,
      description: `The Timeline records an arrival and a stay of ${Math.max(1, Math.round(last.durationMinutes / 60))} hours.`,
      groundingIds: [last.id],
      certainty: 'observed',
    })
  }
  if (latestAnswer?.answer.trim()) {
    observedHighlights.push({
      timestamp: last?.firstArrival ?? dossier.trip.start,
      title: 'What you remembered',
      description: latestAnswer.answer.trim(),
      groundingIds: [`reflection:${dossier.reflectionAnswers.length}`],
      certainty: 'user-supplied',
    })
  }
  return {
    title: destinations.length > 1 ? `${destinations[0]} to ${destinations.at(-1)}` : dossier.trip.title,
    oneLineMemory: latestAnswer?.answer.trim() || `${dossier.trip.durationDays} days, ${dossier.trip.nightsAway} nights, and ${Math.round(dossier.trip.totalDistanceKm).toLocaleString()} km reconstructed from Timeline evidence.`,
    chapters: [
      { title: 'Leaving the familiar radius', start: dossier.trip.start, end: middleStart, summary: 'The record moves away from Home and into the first sustained destination.' },
      { title: 'The journey between', start: middleStart, end: middleEnd, summary: destinations.length ? `Movement connects ${destinations.join(', ')}.` : 'The middle of the journey is held by its visits and movement legs.' },
      { title: 'The return boundary', start: middleEnd, end: dossier.trip.end, summary: 'The final movement closes when the route returns to the home radius.' },
    ],
    highlights: observedHighlights,
    captions: observedHighlights.map((highlight) => ({ timestamp: highlight.timestamp, text: highlight.description, groundingIds: highlight.groundingIds })),
    reflectionQuestions: [
      {
        id: 'first-detail',
        question: `What is the first detail you remember from ${first?.name ?? 'this journey'} that the map cannot show?`,
        reason: 'Location evidence records presence, not the personal detail that made the moment matter.',
      },
      {
        id: 'return-feeling',
        question: 'What changed between leaving Home and returning?',
        reason: 'The route closes geographically, but the data cannot know what the journey changed for you.',
      },
    ],
    uncertaintyNotes: dossier.uncertainties.length
      ? dossier.uncertainties
      : ['The Timeline establishes movement and duration, but not companions, purpose, activities, or emotion.'],
  }
}
