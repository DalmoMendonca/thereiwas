import type { Handler } from '@netlify/functions'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { createDeterministicMemoryPlan, memoryPlanSchema } from '../../src/domain/memory-director'

const MAX_BODY_BYTES = 48_000
const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 6

const dossierSchema = z.object({
  trip: z.object({
    title: z.string().min(1).max(120),
    start: z.string().max(50),
    end: z.string().max(50),
    durationDays: z.number().int().min(1).max(366),
    nightsAway: z.number().int().min(0).max(366),
    totalDistanceKm: z.number().min(0).max(500_000),
  }),
  destinations: z.array(z.object({ id: z.string().max(120), name: z.string().max(160), firstArrival: z.string().max(50), lastDeparture: z.string().max(50), durationMinutes: z.number().min(0).max(1_000_000) })).max(80),
  legs: z.array(z.object({ id: z.string().max(120), start: z.string().max(50), end: z.string().max(50), mode: z.enum(['driving', 'walking', 'cycling', 'running', 'flight', 'train', 'subway', 'tram', 'bus', 'ferry', 'skiing', 'unknown']), distanceKm: z.number().min(0).max(100_000) })).max(200),
  days: z.array(z.object({ date: z.string().max(20), destinationIds: z.array(z.string().max(120)).max(40), movementKm: z.number().min(0).max(100_000), notableTransitions: z.array(z.string().max(120)).max(20) })).max(366),
  coverage: z.object({ score: z.number().min(0).max(1), gaps: z.array(z.string().max(320)).max(30) }),
  uncertainties: z.array(z.string().max(320)).max(40),
  userNotes: z.array(z.string().max(1000)).max(20),
  reflectionAnswers: z.array(z.object({ question: z.string().max(300), answer: z.string().max(1500) })).max(10),
})

const rateLimits = new Map<string, { startedAt: number; count: number }>()

function allowedOrigin(origin: string | undefined): string | undefined {
  if (!origin) return undefined
  if (/^https:\/\/thereiwas\.dalmo\.ai$/.test(origin)) return origin
  if (/^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(origin)) return origin
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  return undefined
}

function headers(origin?: string) {
  return {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...(origin ? { 'access-control-allow-origin': origin, vary: 'origin' } : {}),
  }
}

function response(statusCode: number, body: unknown, origin?: string) {
  return { statusCode, headers: headers(origin), body: JSON.stringify(body) }
}

function permit(ip: string): boolean {
  const now = Date.now()
  const current = rateLimits.get(ip)
  if (!current || now - current.startedAt > WINDOW_MS) {
    rateLimits.set(ip, { startedAt: now, count: 1 })
    return true
  }
  current.count += 1
  return current.count <= MAX_REQUESTS_PER_WINDOW
}

const instructions = `You are the Memory Director for There I Was. Build narrative structure from the supplied compact Timeline dossier.

Rules:
- Use only dossier evidence and explicit reflection answers or user notes.
- Never invent an activity, companion, emotion, purpose, event, weather condition, or sensory detail.
- Label inferences with certainty "inferred" and use them sparingly.
- Treat reflection answers as user-supplied evidence and ground them to IDs prefixed "reflection:".
- Use restrained, specific prose. Avoid travel-blog language, uplift cliches, and generic sentiment.
- Preserve every meaningful uncertainty. If evidence is weak, say so.
- Every factual highlight and caption needs grounding IDs copied from destination or leg IDs in the dossier.
- Reflection questions must ask for human meaning the telemetry cannot know.
- Return a concise plan sized for a three-minute product experience.`

export const handler: Handler = async (event) => {
  const origin = allowedOrigin(event.headers.origin)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...headers(origin), 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' }, body: '' }
  }
  if (event.httpMethod !== 'POST') return response(405, { error: 'Use POST for Memory Director requests.' }, origin)
  if (event.headers.origin && !origin) return response(403, { error: 'This origin is not allowed.' })
  if (!event.headers['content-type']?.toLowerCase().includes('application/json')) return response(415, { error: 'Send the Memory Dossier as JSON.' }, origin)
  const size = Number(event.headers['content-length'] ?? new TextEncoder().encode(event.body ?? '').byteLength)
  if (!Number.isFinite(size) || size > MAX_BODY_BYTES) return response(413, { error: 'The selected trip summary is too large.' }, origin)
  const ip = event.headers['x-nf-client-connection-ip'] ?? event.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? 'unknown'
  if (!permit(ip)) return response(429, { error: 'Memory Director is resting for a few minutes. Your saved story is still available.' }, origin)

  let dossier: z.infer<typeof dossierSchema>
  try {
    dossier = dossierSchema.parse(JSON.parse(event.body ?? '{}'))
  } catch {
    return response(400, { error: 'The selected trip summary is incomplete or invalid.' }, origin)
  }

  const fallback = createDeterministicMemoryPlan(dossier)
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return response(200, { plan: fallback, source: 'deterministic-fallback', model: null }, origin)

  try {
    const client = new OpenAI({ apiKey, timeout: 28_000, maxRetries: 1 })
    const result = await client.responses.parse({
      model: process.env.OPENAI_MODEL || 'gpt-5.6',
      store: false,
      instructions,
      input: JSON.stringify(dossier),
      text: { format: zodTextFormat(memoryPlanSchema, 'memory_plan') },
      max_output_tokens: 4500,
    })
    const parsed = result.output_parsed
    if (!parsed) throw new Error('Structured response was empty.')
    return response(200, { plan: memoryPlanSchema.parse(parsed), source: 'openai', model: process.env.OPENAI_MODEL || 'gpt-5.6' }, origin)
  } catch {
    return response(200, { plan: fallback, source: 'deterministic-fallback', model: null, notice: 'The live direction was unavailable, so a grounded local structure was used.' }, origin)
  }
}

