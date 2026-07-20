import { lazy, Suspense, useEffect } from 'react'
import { useAppStore } from './store'
import { Icon } from '../components/Icon'
import { HomeScreen } from '../features/home/HomeScreen'

const TripScreen = lazy(() => import('../features/trips/TripScreen').then((module) => ({ default: module.TripScreen })))
const TripsScreen = lazy(() => import('../features/trips/TripsScreen').then((module) => ({ default: module.TripsScreen })))

export function App() {
  const initialized = useAppStore((state) => state.initialized)
  const initialize = useAppStore((state) => state.initialize)
  const view = useAppStore((state) => state.view)
  const timeline = useAppStore((state) => state.timeline)
  const importProgress = useAppStore((state) => state.importProgress)
  const error = useAppStore((state) => state.error)
  const clearError = useAppStore((state) => state.clearError)

  useEffect(() => { void initialize() }, [initialize])
  useEffect(() => { window.scrollTo(0, 0) }, [view])

  if (!initialized) {
    return <div className="app-boot" role="status">Opening There I Was…</div>
  }

  return (
    <>
      <Suspense fallback={<div className="app-boot" role="status">Opening trips…</div>}>
        {view === 'home' && <HomeScreen />}
        {view === 'trips' && timeline && <TripsScreen />}
        {view === 'trip' && timeline && <TripScreen />}
      </Suspense>

      {importProgress && (
        <div className="import-overlay" role="dialog" aria-modal="true" aria-labelledby="import-stage">
          <div className="import-progress-card">
            <h2 id="import-stage">{importProgress.stage}</h2>
            <div className="progress-track"><span style={{ width: `${importProgress.progress}%` }} /></div>
            <small>{importProgress.progress}%</small>
          </div>
        </div>
      )}

      {error && (
        <div className="error-toast" role="alert">
          <div><strong>Import failed</strong><span>{error}</span></div>
          <button className="button-icon" onClick={clearError} aria-label="Dismiss error"><Icon name="close" /></button>
        </div>
      )}
    </>
  )
}
