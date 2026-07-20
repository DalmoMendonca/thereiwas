import { useMemo, useState } from 'react'
import { useAppStore } from '../../app/store'
import { BrandMark } from '../../components/BrandMark'
import { Icon } from '../../components/Icon'
import { tripDistanceKm } from '../../domain/trip-detection'
import type { Coordinate, TripRecord } from '../../domain/types'

function formatRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`
}

function routePreviewPath(coordinates: Coordinate[]): string {
  if (coordinates.length < 2) return ''
  const minLat = Math.min(...coordinates.map((point) => point.lat))
  const maxLat = Math.max(...coordinates.map((point) => point.lat))
  const minLng = Math.min(...coordinates.map((point) => point.lng))
  const maxLng = Math.max(...coordinates.map((point) => point.lng))
  return coordinates.map((point, index) => {
    const x = 12 + ((point.lng - minLng) / Math.max(0.001, maxLng - minLng)) * 176
    const y = 80 - ((point.lat - minLat) / Math.max(0.001, maxLat - minLat)) * 64
    return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

function TripRoutePreview({ trip }: { trip: TripRecord }) {
  const timeline = useAppStore((state) => state.timeline)!
  const coordinates = timeline.legs
    .filter((leg) => trip.legIds.includes(leg.id))
    .flatMap((leg) => leg.observedPath.length ? leg.observedPath : [leg.origin, leg.destination].filter((item): item is Coordinate => Boolean(item)))
  const path = routePreviewPath(coordinates)
  return (
    <svg className="trip-route-preview" viewBox="0 0 200 92" aria-label="Compact route preview">
      <path d="M7 20c40-18 89-18 141-8 26 5 42 17 50 34v46H0V36c2-7 4-12 7-16Z" className="preview-land" />
      <path d={path} pathLength="1" className="preview-route-base" />
      <path d={path} pathLength="1" className="preview-route" />
      {coordinates.length > 0 && <circle cx="188" cy="18" r="3" className="preview-marker" />}
    </svg>
  )
}

function CreateTripPanel({ onClose }: { onClose: () => void }) {
  const timeline = useAppStore((state) => state.timeline)!
  const createTrip = useAppStore((state) => state.createTrip)
  const initialStart = timeline.report.dateRange?.start.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  const initialEnd = timeline.report.dateRange?.end.slice(0, 10) ?? initialStart
  const [startDate, setStartDate] = useState(initialStart)
  const [endDate, setEndDate] = useState(initialEnd)
  const [title, setTitle] = useState('')
  const start = `${startDate}T00:00:00.000Z`
  const end = `${endDate}T23:59:59.999Z`
  const preview = useMemo(() => {
    const visits = timeline.visits.filter((visit) => Date.parse(visit.end) >= Date.parse(start) && Date.parse(visit.start) <= Date.parse(end))
    const legs = timeline.legs.filter((leg) => Date.parse(leg.end) >= Date.parse(start) && Date.parse(leg.start) <= Date.parse(end))
    const names = [...new Set(visits.map((visit) => visit.displayName).filter((name): name is string => Boolean(name && name !== 'Home')))]
    const modes = [...new Set(legs.map((leg) => leg.mode))]
    const distance = legs.reduce((sum, leg) => sum + (leg.sourceDistanceMeters ?? 0) / 1000, 0)
    return { visits, legs, names, modes, distance }
  }, [timeline, start, end])
  const valid = Date.parse(end) > Date.parse(start)

  return (
    <section className="create-trip-panel" aria-labelledby="create-trip-title">
      <div className="create-trip-copy">
        <button className="button-icon panel-close" onClick={onClose} aria-label="Close trip creator"><Icon name="close" /></button>
        <span className="section-label">Your dates, your boundaries</span>
        <h2 id="create-trip-title">Create a trip from any interval</h2>
        <p>Even sparse evidence is allowed. There I Was will show what falls inside your dates without changing them later.</p>
        <div className="date-fields">
          <label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <span aria-hidden="true">→</span>
          <label>End date<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        </div>
        <label className="title-field">Trip title <span>optional</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give these days a name" /></label>
        {!valid && <p className="field-error">Choose an end date after the start date.</p>}
        <button className="button-primary" disabled={!valid} onClick={() => void createTrip({ start, end, title })}><Icon name="check" /> Save trip</button>
      </div>
      <div className="trip-preview-live">
        <span>Inside these dates</span>
        <strong>{preview.names.length || 'No'} destination{preview.names.length === 1 ? '' : 's'}</strong>
        <p>{preview.names.length ? preview.names.join(' · ') : 'No named destinations; you can still save this interval.'}</p>
        <dl>
          <div><dt>Visits</dt><dd>{preview.visits.length}</dd></div>
          <div><dt>Movement legs</dt><dd>{preview.legs.length}</dd></div>
          <div><dt>Recorded distance</dt><dd>{Math.round(preview.distance).toLocaleString()} km</dd></div>
          <div><dt>Modes</dt><dd>{preview.modes.length ? preview.modes.join(', ') : 'Unknown'}</dd></div>
        </dl>
        {timeline.report.coverageWarnings.length > 0 && <p className="preview-warning">Sparse sections remain visible as honest inferred geometry.</p>}
      </div>
    </section>
  )
}

export function TripsScreen() {
  const timeline = useAppStore((state) => state.timeline)!
  const trips = useAppStore((state) => state.trips)
  const dismissed = useAppStore((state) => state.dismissedTripIds)
  const openTrip = useAppStore((state) => state.openTrip)
  const showHome = useAppStore((state) => state.showHome)
  const clearData = useAppStore((state) => state.clearData)
  const [creating, setCreating] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const visibleTrips = trips.filter((trip) => !dismissed.includes(trip.id))
  const featured = visibleTrips[0]

  return (
    <main className="trips-screen">
      <nav className="app-nav">
        <button className="brand-button" onClick={showHome}><BrandMark /></button>
        <div className="nav-local"><Icon name="lock" /> Processed locally</div>
        <button className="button-primary button-small" onClick={() => setCreating(true)}><Icon name="plus" /> Create trip</button>
      </nav>

      <header className="trips-header">
        <div>
          <span className="section-label">Your journeys</span>
          <h1>{visibleTrips.length ? `${visibleTrips.length} trip${visibleTrips.length === 1 ? '' : 's'} found in the record` : 'The record is ready for your boundaries'}</h1>
          <p>{timeline.report.dateRange ? formatRange(timeline.report.dateRange.start, timeline.report.dateRange.end) : timeline.sourceName} · {timeline.report.recordsRead} Timeline records</p>
        </div>
        <button className="report-toggle" onClick={() => setShowReport(!showReport)} aria-expanded={showReport}>
          <span><Icon name="check" /> Import complete</span>
          <small>{timeline.report.visits} visits · {timeline.report.movementLegs} movement legs</small>
          <Icon name="chevron" />
        </button>
      </header>

      {showReport && (
        <section className="import-report">
          <h2>What the importer found</h2>
          <dl>
            <div><dt>Date range</dt><dd>{timeline.report.dateRange ? formatRange(timeline.report.dateRange.start, timeline.report.dateRange.end) : 'Unknown'}</dd></div>
            <div><dt>Records read</dt><dd>{timeline.report.recordsRead}</dd></div>
            <div><dt>Visits</dt><dd>{timeline.report.visits}</dd></div>
            <div><dt>Movement legs</dt><dd>{timeline.report.movementLegs}</dd></div>
            <div><dt>Observed path points</dt><dd>{timeline.report.pathPoints}</dd></div>
            <div><dt>Likely home</dt><dd>{timeline.report.likelyHome ?? 'Not enough evidence'}</dd></div>
            <div><dt>Malformed records</dt><dd>{timeline.report.malformedRecords}</dd></div>
            <div><dt>Processing time</dt><dd>{timeline.report.durationMs} ms</dd></div>
          </dl>
          {timeline.report.coverageWarnings.map((warning) => <p key={warning} className="report-warning">{warning}</p>)}
        </section>
      )}

      {creating && <CreateTripPanel onClose={() => setCreating(false)} />}

      {featured ? (
        <section className="trip-collection">
          <article className="featured-trip">
            <button className="featured-trip-visual" onClick={() => openTrip(featured.id)} aria-label={`Open ${featured.title}`}>
              <TripRoutePreview trip={featured} />
              <span className="confidence-badge">{Math.round(featured.evidence.coverageScore * 100)}% route coverage</span>
            </button>
            <div className="featured-trip-copy">
              <div className="trip-source"><span>{featured.source === 'detected' ? 'Detected journey' : 'Your trip'}</span><span>{featured.status}</span></div>
              <h2>{featured.title}</h2>
              <p>{formatRange(featured.start, featured.end)}</p>
              <dl>
                <div><dt>Nights</dt><dd>{featured.evidence.nightsAway}</dd></div>
                <div><dt>Distance</dt><dd>{Math.round(tripDistanceKm(timeline, featured)).toLocaleString()} km</dd></div>
                <div><dt>Destinations</dt><dd>{featured.evidence.destinationCount}</dd></div>
                <div><dt>Modes</dt><dd>{featured.evidence.modes.join(' · ')}</dd></div>
              </dl>
              <p className="detection-summary">{featured.evidence.reasons[0]}</p>
              <button className="button-primary" onClick={() => openTrip(featured.id)}>Open journey <Icon name="arrow" /></button>
            </div>
          </article>

          {visibleTrips.slice(1).length > 0 && (
            <div className="other-trips">
              <h2>More journeys</h2>
              {visibleTrips.slice(1).map((trip) => (
                <button className="trip-list-row" key={trip.id} onClick={() => openTrip(trip.id)}>
                  <TripRoutePreview trip={trip} />
                  <span><small>{trip.source === 'user' ? 'Your trip' : 'Detected'}</small><strong>{trip.title}</strong><span>{formatRange(trip.start, trip.end)}</span></span>
                  <span className="row-stat"><strong>{trip.evidence.nightsAway}</strong> nights</span>
                  <span className="row-stat"><strong>{Math.round(tripDistanceKm(timeline, trip)).toLocaleString()}</strong> km</span>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="empty-trips">
          <div className="empty-route"><Icon name="route" /></div>
          <h2>No automatic trip met the evidence threshold.</h2>
          <p>That does not mean the journey was not real. Choose the dates and create it yourself.</p>
          <button className="button-primary" onClick={() => setCreating(true)}><Icon name="plus" /> Create a trip</button>
        </section>
      )}

      <footer className="app-footer">
        <span>{timeline.sourceName} · stored only in this browser</span>
        <button className="danger-link" onClick={() => { if (window.confirm('Delete the imported Timeline, trips, routes, and memory plans stored in this browser?')) void clearData() }}><Icon name="trash" /> Delete my local data</button>
      </footer>
    </main>
  )
}

