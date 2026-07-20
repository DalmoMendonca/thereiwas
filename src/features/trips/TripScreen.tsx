import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../app/store'
import { BrandMark } from '../../components/BrandMark'
import { Icon } from '../../components/Icon'
import { buildTripRoutes, type RouteGeometry } from '../../domain/route-reconstruction'
import { tripDistanceKm } from '../../domain/trip-detection'
import { getRouteCache, setRouteCache } from '../../storage/database'
import { CinematicMap } from '../map/CinematicMap'
import { MemoryDirector } from '../memory-director/MemoryDirector'

function formatRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`
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

  const destinations = useMemo(() => {
    if (!trip) return []
    return trip.destinationIds.map((id) => timeline.places[id]?.displayName ?? timeline.visits.find((visit) => (visit.placeId ?? visit.id) === id)?.displayName ?? 'Unnamed stop')
  }, [timeline, trip])

  if (!trip) {
    return <main className="missing-trip"><h1>This trip is no longer in local storage.</h1><button className="button-primary" onClick={showTrips}>Back to journeys</button></main>
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
        <button className="button-text back-link" onClick={showTrips}><Icon name="back" /> All journeys</button>
        <BrandMark compact />
        <span className="trip-nav-local"><Icon name="lock" /> Timeline stays local</span>
      </nav>

      <section className="trip-hero">
        <div className="trip-titlebar">
          <div>
            <div className="trip-title-meta"><span>{trip.source === 'detected' ? 'Detected journey' : 'Your trip'}</span><span>{trip.status}</span></div>
            <h1>{trip.title}</h1>
            <p>{formatRange(trip.start, trip.end)}</p>
          </div>
          <div className="trip-title-actions">
            <button className="button-secondary" onClick={() => setEditing(!editing)}><Icon name="edit" /> Edit trip</button>
            {!directorActive && <button className="button-primary" onClick={() => { setDirectorActive(true); document.getElementById('memory-director-anchor')?.scrollIntoView({ behavior: 'smooth' }) }}><Icon name="spark" /> Direct my memory</button>}
          </div>
        </div>

        {editing && (
          <div className="edit-trip-inline">
            <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label>Start<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label>End<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
            <div><button className="button-text" onClick={() => setEditing(false)}>Cancel</button><button className="button-primary button-small" onClick={() => void saveEdits()}>Save changes</button></div>
          </div>
        )}

        <CinematicMap routes={routes} timeline={timeline} trip={trip} loading={routeLoading} />
      </section>

      <section className="trip-evidence">
        <div className="evidence-explanation">
          <span className="section-label">Why this became a trip</span>
          <h2>There is enough evidence to call this a journey.</h2>
          <ul>{trip.evidence.reasons.map((reason) => <li key={reason}><Icon name="check" />{reason}</li>)}</ul>
          <details>
            <summary>Inspect boundaries and confidence</summary>
            <dl>
              <div><dt>Start boundary</dt><dd>{formatRange(trip.start, trip.start).split(' – ')[0]}</dd></div>
              <div><dt>End boundary</dt><dd>{formatRange(trip.end, trip.end).split(' – ')[0]}</dd></div>
              <div><dt>Coverage</dt><dd>{Math.round(trip.evidence.coverageScore * 100)}%</dd></div>
              <div><dt>Timeline Memory</dt><dd>{trip.evidence.timelineMemorySupport ? 'Supports interval' : 'No supporting Memory'}</dd></div>
            </dl>
          </details>
        </div>

        <div className="trip-stat-run">
          <div><span>Distance</span><strong>{Math.round(tripDistanceKm(timeline, trip)).toLocaleString()}<small> km</small></strong></div>
          <div><span>Nights away</span><strong>{trip.evidence.nightsAway}</strong></div>
          <div><span>Destinations</span><strong>{trip.evidence.destinationCount}</strong></div>
          <div><span>Travel modes</span><strong className="stat-modes">{trip.evidence.modes.join(' · ')}</strong></div>
        </div>

        <div className="itinerary-thread">
          <h2>Journey thread</h2>
          {destinations.map((destination, index) => {
            const id = trip.destinationIds[index]
            const visits = timeline.visits.filter((visit) => (visit.placeId ?? visit.id) === id && trip.visitIds.includes(visit.id))
            const hours = visits.reduce((sum, visit) => sum + Math.max(0, Math.round((Date.parse(visit.end) - Date.parse(visit.start)) / 3_600_000)), 0)
            return <div className="itinerary-stop" key={`${destination}-${index}`}><span>{index + 1}</span><div><strong>{destination}</strong><small>{hours > 24 ? `${Math.round(hours / 24)} days` : `${Math.max(1, hours)} hours`} in the record</small></div></div>
          })}
        </div>
      </section>

      <div id="memory-director-anchor" />
      <MemoryDirector timeline={timeline} trip={trip} active={directorActive} onActivate={() => setDirectorActive(true)} />

      <footer className="trip-footer-actions">
        {trip.source === 'detected' && trip.status === 'proposed' && <button className="button-secondary" onClick={() => void updateTrip(trip.id, { status: 'confirmed' })}><Icon name="check" /> Confirm this trip</button>}
        {trip.source === 'detected' ? (
          <button className="danger-link" onClick={() => void dismissTrip(trip.id)}>Not a trip — dismiss</button>
        ) : (
          <button className="danger-link" onClick={() => { if (window.confirm('Delete this user-created trip? The imported Timeline will remain.')) void deleteTrip(trip.id) }}><Icon name="trash" /> Delete trip</button>
        )}
      </footer>
    </main>
  )
}
