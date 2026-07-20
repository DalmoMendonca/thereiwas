import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { MemoryPlan, NormalizedTimeline, TripPhoto, TripRecord } from '../domain/types'
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
  photos: { key: string; value: TripPhoto; indexes: { 'by-trip': string } }
}

let databasePromise: Promise<IDBPDatabase<ThereIWasDatabase>> | undefined

function database() {
  databasePromise ??= openDB<ThereIWasDatabase>('there-i-was', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('session', { keyPath: 'id' })
        db.createObjectStore('memories', { keyPath: 'tripId' })
        db.createObjectStore('routes')
      }
      if (oldVersion < 2) {
        const photos = db.createObjectStore('photos', { keyPath: 'id' })
        photos.createIndex('by-trip', 'tripId')
      }
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
  if (session && session.timeline.schemaVersion !== 3) {
    await Promise.all([db.clear('session'), db.clear('memories'), db.clear('routes'), db.clear('photos')])
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

export async function saveTripPhotos(photos: TripPhoto[]): Promise<void> {
  if (!photos.length) return
  const db = await database()
  const transaction = db.transaction('photos', 'readwrite')
  await Promise.all([...photos.map((photo) => transaction.store.put(photo)), transaction.done])
}

export async function loadTripPhotos(tripId: string): Promise<TripPhoto[]> {
  const photos = await (await database()).getAllFromIndex('photos', 'by-trip', tripId)
  return photos.sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt))
}

export async function deleteTripPhoto(photoId: string): Promise<void> {
  await (await database()).delete('photos', photoId)
}

export async function deleteTripPhotos(tripId: string): Promise<void> {
  const db = await database()
  const keys = await db.getAllKeysFromIndex('photos', 'by-trip', tripId)
  const transaction = db.transaction('photos', 'readwrite')
  await Promise.all([...keys.map((key) => transaction.store.delete(key)), transaction.done])
}

export async function deleteAllLocalData(): Promise<void> {
  const db = await database()
  await Promise.all([db.clear('session'), db.clear('memories'), db.clear('routes'), db.clear('photos')])
}
