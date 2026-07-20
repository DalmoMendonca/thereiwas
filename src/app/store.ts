import { create } from 'zustand'
import { createManualTrip, detectTrips, inferHome } from '../domain/trip-detection'
import type { HomeInference, NormalizedTimeline, TripRecord } from '../domain/types'
import { deleteAllLocalData, loadSession, saveSession } from '../storage/database'

export type AppView = 'home' | 'trips' | 'trip'

interface ImportProgress {
  stage: string
  progress: number
}

interface AppState {
  initialized: boolean
  view: AppView
  timeline?: NormalizedTimeline
  home?: HomeInference
  trips: TripRecord[]
  dismissedTripIds: string[]
  activeTripId?: string
  importProgress?: ImportProgress
  error?: string
  initialize: () => Promise<void>
  importText: (text: string, sourceName: string) => Promise<void>
  openTrip: (tripId: string) => void
  showTrips: () => void
  showHome: () => void
  createTrip: (input: { start: string; end: string; title?: string }) => Promise<TripRecord>
  updateTrip: (tripId: string, patch: Partial<Pick<TripRecord, 'title' | 'start' | 'end' | 'status'>>) => Promise<void>
  deleteTrip: (tripId: string) => Promise<void>
  dismissTrip: (tripId: string) => Promise<void>
  clearData: () => Promise<void>
  clearError: () => void
}

function runWorker(
  text: string,
  sourceName: string,
  onProgress: (progress: ImportProgress) => void,
): Promise<{ timeline: NormalizedTimeline; trips: TripRecord[]; home?: HomeInference }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/timeline.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent) => {
      const message = event.data as { type: string; stage?: string; progress?: number; message?: string; timeline?: NormalizedTimeline; trips?: TripRecord[]; home?: HomeInference }
      if (message.type === 'progress') onProgress({ stage: message.stage ?? 'Working', progress: message.progress ?? 0 })
      if (message.type === 'complete' && message.timeline && message.trips) {
        worker.terminate()
        resolve({ timeline: message.timeline, trips: message.trips, home: message.home })
      }
      if (message.type === 'error') {
        worker.terminate()
        reject(new Error(message.message ?? 'Timeline import failed.'))
      }
    }
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'Timeline import failed in the background worker.'))
    }
    worker.postMessage({ text, sourceName })
  })
}

async function persist(state: Pick<AppState, 'timeline' | 'trips' | 'dismissedTripIds' | 'view'>) {
  if (!state.timeline) return
  await saveSession({
    timeline: state.timeline,
    trips: state.trips,
    dismissedTripIds: state.dismissedTripIds,
    lastView: state.view,
  })
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  view: 'home',
  trips: [],
  dismissedTripIds: [],
  initialize: async () => {
    try {
      const session = await loadSession()
      if (session) {
        const home = inferHome(session.timeline)
        set({
          initialized: true,
          timeline: session.timeline,
          home,
          trips: session.trips,
          dismissedTripIds: session.dismissedTripIds,
          view: session.lastView === 'trip' ? 'trips' : (session.lastView as AppView),
        })
      } else set({ initialized: true })
    } catch {
      set({ initialized: true, error: 'Your saved local journey could not be restored. You can import it again.' })
    }
  },
  importText: async (text, sourceName) => {
    set({ error: undefined, importProgress: { stage: 'Reading', progress: 4 } })
    try {
      const result = await runWorker(text, sourceName, (importProgress) => set({ importProgress }))
      set({ importProgress: { stage: 'Saving', progress: 98 } })
      const timeline = { ...result.timeline, report: { ...result.timeline.report, likelyHome: result.home?.displayName, tripsDetected: result.trips.length } }
      set({ timeline, trips: result.trips, home: result.home, dismissedTripIds: [], view: 'trips', importProgress: undefined })
      await persist(get())
    } catch (error) {
      set({ importProgress: undefined, error: error instanceof Error ? error.message : 'Timeline import failed.' })
    }
  },
  openTrip: (tripId) => {
    set({ activeTripId: tripId, view: 'trip' })
    void persist(get())
  },
  showTrips: () => {
    set({ view: 'trips', activeTripId: undefined })
    void persist(get())
  },
  showHome: () => set({ view: 'home', activeTripId: undefined }),
  createTrip: async (input) => {
    const state = get()
    if (!state.timeline) throw new Error('Import a Timeline before creating a trip.')
    const trip = createManualTrip(state.timeline, input, state.home)
    set({ trips: [...state.trips, trip], activeTripId: trip.id, view: 'trip' })
    await persist(get())
    return trip
  },
  updateTrip: async (tripId, patch) => {
    const state = get()
    if (!state.timeline) return
    let trips = state.trips.map((trip) =>
      trip.id === tripId ? { ...trip, ...patch, status: patch.status ?? 'edited', startLocked: true, endLocked: true, updatedAt: new Date().toISOString() } : trip,
    )
    const edited = trips.find((trip) => trip.id === tripId)
    if (edited && (patch.start || patch.end)) {
      const recomputed = createManualTrip(state.timeline, { start: edited.start, end: edited.end, title: edited.title }, state.home)
      trips = trips.map((trip) => (trip.id === tripId ? { ...recomputed, id: tripId, source: edited.source, status: 'edited', createdAt: edited.createdAt } : trip))
    }
    set({ trips })
    await persist(get())
  },
  deleteTrip: async (tripId) => {
    const state = get()
    set({ trips: state.trips.filter((trip) => trip.id !== tripId), view: 'trips', activeTripId: undefined })
    await persist(get())
  },
  dismissTrip: async (tripId) => {
    const state = get()
    const dismissedTripIds = [...new Set([...state.dismissedTripIds, tripId])]
    set({ dismissedTripIds, view: 'trips', activeTripId: undefined })
    await persist(get())
  },
  clearData: async () => {
    await deleteAllLocalData()
    set({ timeline: undefined, home: undefined, trips: [], dismissedTripIds: [], activeTripId: undefined, view: 'home' })
  },
  clearError: () => set({ error: undefined }),
}))
