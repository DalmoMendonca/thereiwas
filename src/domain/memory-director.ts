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
  const destinations = trip.destinations.map((destination) => ({
    id: destination.id,
    name: destination.name,
    locality: destination.locality,
    region: destination.region,
    country: destination.country,
    firstArrival: destination.firstArrival,
    lastDeparture: destination.lastDeparture,
    durationMinutes: destination.durationMinutes,
  }))
  const destinationByVisitId = new Map(trip.destinations.flatMap((destination) => destination.visitIds.map((visitId) => [visitId, destination.id] as const)))
  const lowConfidencePlaceNames = [...new Set(
    visits
      .filter((visit) => (visit.confidence ?? 1) < 0.6)
      .map((visit) => visit.displayName ?? 'A stop'),
  )].slice(0, 10)

  const nearestDestination = (coordinate?: { lat: number; lng: number }) => {
    if (!coordinate || !trip.destinations.length) return undefined
    const nearest = trip.destinations
      .map((destination) => ({ destination, distance: haversineKm(coordinate, destination.coordinate) }))
      .sort((a, b) => a.distance - b.distance)[0]
    return nearest && nearest.distance <= 100 ? nearest.destination.name : undefined
  }

  const days = new Map<string, MemoryDossier['days'][number]>()
  for (const visit of visits) {
    const date = dayKey(visit.start)
    const entry = days.get(date) ?? { date, destinationIds: [], movementKm: 0, notableTransitions: [] }
    const destinationId = destinationByVisitId.get(visit.id)
    if (destinationId) entry.destinationIds.push(destinationId)
    days.set(date, entry)
  }
  for (const leg of legs) {
    const date = dayKey(leg.start)
    const entry = days.get(date) ?? { date, destinationIds: [], movementKm: 0, notableTransitions: [] }
    entry.movementKm += legDistanceKm(timeline, leg.id)
    if (leg.mode === 'flight' || leg.mode === 'train' || leg.mode === 'ferry') entry.notableTransitions.push(`${leg.mode} transition`)
    days.set(date, entry)
  }

  const topMovementIds = new Set(
    [...legs]
      .sort((a, b) => legDistanceKm(timeline, b.id) - legDistanceKm(timeline, a.id))
      .slice(0, 30)
      .map((leg) => leg.id),
  )
  const notableModes = new Set(['flight', 'train', 'subway', 'tram', 'bus', 'ferry'])
  const dossierLegs = legs.filter((leg, index) =>
    index === 0
    || index === legs.length - 1
    || topMovementIds.has(leg.id)
    || notableModes.has(leg.mode),
  ).slice(0, 60)
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
    legs: dossierLegs.map((leg) => ({
      id: leg.id,
      start: leg.start,
      end: leg.end,
      mode: leg.mode,
      distanceKm: Math.round(legDistanceKm(timeline, leg.id) * 10) / 10,
      from: nearestDestination(leg.origin),
      to: nearestDestination(leg.destination),
    })),
    days: [...days.values()].map((day) => ({
      ...day,
      destinationIds: [...new Set(day.destinationIds)],
      movementKm: Math.round(day.movementKm * 10) / 10,
    })),
    coverage: { score: trip.evidence.coverageScore, gaps: timeline.report.coverageWarnings },
    uncertainties: [
      ...(timeline.quarantined.length ? [`${timeline.quarantined.length} imported records could not be used.`] : []),
      ...lowConfidencePlaceNames.map((name) => `${name} has low-confidence visit evidence.`),
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
  const chapterSize = Math.max(1, Math.ceil(dossier.destinations.length / 4))
  const chapters = dossier.destinations.length
    ? Array.from({ length: Math.ceil(dossier.destinations.length / chapterSize) }, (_, index) => {
        const group = dossier.destinations.slice(index * chapterSize, (index + 1) * chapterSize)
        const chapterFirst = group[0]
        const chapterLast = group.at(-1)!
        const names = group.map((destination) => destination.name)
        return {
          title: names.length === 1 ? names[0] : `${names[0]} to ${names.at(-1)}`,
          start: chapterFirst.firstArrival,
          end: chapterLast.lastDeparture,
          summary: `Timeline records time in ${new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' }).format(names)}.`,
        }
      })
    : [{ title: dossier.trip.title, start: dossier.trip.start, end: dossier.trip.end, summary: 'Timeline recorded movement during these dates.' }]
  const observedHighlights: MemoryPlan['highlights'] = []
  if (longestLeg) {
    observedHighlights.push({
      timestamp: longestLeg.start,
      title: longestLeg.from && longestLeg.to ? `${longestLeg.from} to ${longestLeg.to}` : `Longest ${longestLeg.mode} leg`,
      description: `${Math.round(longestLeg.distanceKm).toLocaleString()} km by ${longestLeg.mode}.`,
      groundingIds: [longestLeg.id],
      certainty: 'observed',
    })
  }
  if (last) {
    observedHighlights.push({
      timestamp: last.firstArrival,
      title: `Arrived in ${last.name}`,
      description: `${Math.max(1, Math.round(last.durationMinutes / 60))} recorded hours in ${last.name}.`,
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
    title: dossier.trip.title,
    oneLineMemory: latestAnswer?.answer.trim() || (destinations.length ? new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' }).format(destinations) : dossier.trip.title),
    chapters,
    highlights: observedHighlights,
    captions: observedHighlights.map((highlight) => ({ timestamp: highlight.timestamp, text: highlight.description, groundingIds: highlight.groundingIds })),
    reflectionQuestions: [
      {
        id: 'first-detail',
        question: `What do you remember first about arriving in ${first?.name ?? 'the first stop'}?`,
        reason: 'Timeline records the arrival, not what you noticed.',
      },
      {
        id: 'return-feeling',
        question: `What do you remember about the trip home from ${last?.name ?? 'the final stop'}?`,
        reason: 'Timeline records the return. You remember the rest.',
      },
    ],
    uncertaintyNotes: dossier.uncertainties.length
      ? dossier.uncertainties
      : ['Timeline does not record companions, purpose, or what happened between stops.'],
  }
}
