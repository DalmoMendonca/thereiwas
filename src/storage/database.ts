import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { MemoryPlan, NormalizedTimeline, TripRecord } from '../domain/types'
import type { RouteGeometry } from '../domain/route-reconstruction'

interface StoredSession {
  id: 'current'
  timeline: NormalizedTimeline
  trips: TripRecord[]
  dismissedTripIds: string[]
  lastView: string
  updatedAt: string
}

interface ThereIWasDatabase extends DBSchema {
  session: { key: 'current'; value: StoredSession }
  memories: { key: string; value: { tripId: string; current: MemoryPlan; history: MemoryPlan[]; updatedAt: string } }
  routes: { key: string; value: RouteGeometry }
}

let databasePromise: Promise<IDBPDatabase<ThereIWasDatabase>> | undefined

function database() {
  databasePromise ??= openDB<ThereIWasDatabase>('there-i-was', 1, {
    upgrade(db) {
      db.createObjectStore('session', { keyPath: 'id' })
      db.createObjectStore('memories', { keyPath: 'tripId' })
      db.createObjectStore('routes')
    },
  })
  return databasePromise
}

export async function saveSession(session: Omit<StoredSession, 'id' | 'updatedAt'>): Promise<void> {
  const db = await database()
  await db.put('session', { ...session, id: 'current', updatedAt: new Date().toISOString() })
}

export async function loadSession(): Promise<StoredSession | undefined> {
  const db = await database()
  const session = await db.get('session', 'current')
  if (session && session.timeline.schemaVersion !== 2) {
    await Promise.all([db.clear('session'), db.clear('memories'), db.clear('routes')])
    return undefined
  }
  return session
}

export async function saveMemoryPlan(tripId: string, plan: MemoryPlan, previous?: MemoryPlan): Promise<void> {
  const db = await database()
  const stored = await db.get('memories', tripId)
  const history = [...(stored?.history ?? [])]
  if (previous) history.push(previous)
  await db.put('memories', { tripId, current: plan, history: history.slice(-5), updatedAt: new Date().toISOString() })
}

export async function loadMemoryPlan(tripId: string) {
  return (await database()).get('memories', tripId)
}

export async function getRouteCache(key: string): Promise<RouteGeometry | undefined> {
  return (await database()).get('routes', key)
}

export async function setRouteCache(key: string, route: RouteGeometry): Promise<void> {
  await (await database()).put('routes', route, key)
}

export async function deleteAllLocalData(): Promise<void> {
  const db = await database()
  await Promise.all([db.clear('session'), db.clear('memories'), db.clear('routes')])
}
