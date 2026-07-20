import { useEffect } from 'react'
import { useAppStore } from './store'
import { Icon } from '../components/Icon'
import { HomeScreen } from '../features/home/HomeScreen'
import { TripScreen } from '../features/trips/TripScreen'
import { TripsScreen } from '../features/trips/TripsScreen'

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
    return <div className="app-boot" role="status"><span className="brand-orbit" /> Restoring your local journeys…</div>
  }

  return (
    <>
      {view === 'home' && <HomeScreen />}
      {view === 'trips' && timeline && <TripsScreen />}
      {view === 'trip' && timeline && <TripScreen />}

      {importProgress && (
        <div className="import-overlay" role="dialog" aria-modal="true" aria-labelledby="import-stage">
          <div className="import-progress-card">
            <div className="import-route-animation"><span /><i /></div>
            <span className="section-label">Reading the journey</span>
            <h2 id="import-stage">{importProgress.stage}</h2>
            <p>Your raw Timeline is being processed in a background worker. It is not uploaded.</p>
            <div className="progress-track"><span style={{ width: `${importProgress.progress}%` }} /></div>
            <small>{importProgress.progress}%</small>
          </div>
        </div>
      )}

      {error && (
        <div className="error-toast" role="alert">
          <Icon name="route" />
          <div><strong>The route hit a gap.</strong><span>{error}</span></div>
          <button className="button-icon" onClick={clearError} aria-label="Dismiss error"><Icon name="close" /></button>
        </div>
      )}
    </>
  )
}
