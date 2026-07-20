import { useEffect, useState } from 'react'
import { useAppStore } from '../../app/store'
import { BrandMark } from '../../components/BrandMark'
import { Icon } from '../../components/Icon'
import { buildTripRoutes, type RouteGeometry } from '../../domain/route-reconstruction'
import { getRouteCache, setRouteCache } from '../../storage/database'
import { CinematicMap } from '../map/CinematicMap'
import { MemoryDirector } from '../memory-director/MemoryDirector'

function formatRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`
}

export function TripScreen() {
  const timeline = useAppStore((state) => state.timeline)!
  const tripId = useAppStore((state) => state.activeTripId)
  const trip = useAppStore((state) => state.trips.find((item) => item.id === tripId))
  const showTrips = useAppStore((state) => state.showTrips)
  const updateTrip = useAppStore((state) => state.updateTrip)
  const dismissTrip = useAppStore((state) => state.dismissTrip)
  const deleteTrip = useAppStore((state) => state.deleteTrip)
  const [routes, setRoutes] = useState<RouteGeometry[]>([])
  const [routeLoading, setRouteLoading] = useState(true)
  const [directorActive, setDirectorActive] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(trip?.title ?? '')
  const [startDate, setStartDate] = useState(trip?.start.slice(0, 10) ?? '')
  const [endDate, setEndDate] = useState(trip?.end.slice(0, 10) ?? '')

  useEffect(() => {
    if (!trip) return
    const controller = new AbortController()
    setRouteLoading(true)
    void buildTripRoutes(timeline, trip, {
      token: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
      signal: controller.signal,
      getCached: getRouteCache,
      setCached: setRouteCache,
    }).then(setRoutes).finally(() => setRouteLoading(false))
    return () => controller.abort()
  }, [timeline, trip])

  if (!trip) {
    return <main className="missing-trip"><h1>Trip not found</h1><button className="button-primary" onClick={showTrips}>Back to trips</button></main>
  }

  const saveEdits = async () => {
    await updateTrip(trip.id, {
      title: title.trim() || trip.title,
      start: `${startDate}T00:00:00.000Z`,
      end: `${endDate}T23:59:59.999Z`,
    })
    setEditing(false)
  }

  return (
    <main className="trip-screen">
      <nav className="trip-nav">
        <button className="button-text back-link" onClick={showTrips}><Icon name="back" /> All trips</button>
        <BrandMark />
        <button className="button-text" onClick={() => setEditing((value) => !value)}><Icon name="edit" /> Edit</button>
      </nav>

      <header className="trip-header">
        <h1>{trip.title}</h1>
        <p>{formatRange(trip.start, trip.end)}</p>
      </header>

      {editing && (
        <section className="edit-trip-inline" aria-label="Edit trip">
          <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Start<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label>End<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <div><button className="button-text" onClick={() => setEditing(false)}>Cancel</button><button className="button-primary" onClick={() => void saveEdits()}>Save</button></div>
        </section>
      )}

      <CinematicMap routes={routes} timeline={timeline} trip={trip} loading={routeLoading} />

      <div className="trip-below-map">
        <p className="destination-line">{trip.destinations.map((destination) => destination.name).join(' · ')}</p>
        <details className="trip-details">
          <summary>How this trip was found</summary>
          <ul>{trip.evidence.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          <p>{Math.round(trip.evidence.coverageScore * 100)}% of movement legs include recorded path points.</p>
        </details>
      </div>

      <MemoryDirector timeline={timeline} trip={trip} active={directorActive} onActivate={() => setDirectorActive(true)} />

      <div className="trip-actions">
        {trip.source === 'detected' && trip.status === 'proposed' && <button className="button-secondary" onClick={() => void updateTrip(trip.id, { status: 'confirmed' })}>Keep trip</button>}
        {trip.source === 'detected' ? (
          <button className="danger-link" onClick={() => void dismissTrip(trip.id)}>Dismiss trip</button>
        ) : (
          <button className="danger-link" onClick={() => { if (window.confirm('Delete this trip?')) void deleteTrip(trip.id) }}><Icon name="trash" /> Delete trip</button>
        )}
      </div>

      <footer className="signature-footer">Build with <span aria-label="love">❤️</span> | <a href="https://dalmo.ai">dalmo.ai</a></footer>
    </main>
  )
}
