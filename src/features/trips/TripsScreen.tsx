import { useMemo, useState } from 'react'
import { useAppStore } from '../../app/store'
import { BrandMark } from '../../components/BrandMark'
import { Icon } from '../../components/Icon'

function formatRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: '2-digit', timeZone: 'UTC' })
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`
}

function destinationTrail(names: string[]): string {
  return names.filter((name, index) => index === 0 || name !== names[index - 1]).join(' · ')
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
    const cities = [...new Set(visits.map((visit) => visit.displayName).filter((name): name is string => Boolean(name && name !== 'Home')))]
    return { visits: visits.length, legs: legs.length, cities }
  }, [timeline, start, end])
  const valid = Date.parse(end) > Date.parse(start)

  return (
    <section className="create-trip-panel" aria-labelledby="create-trip-title">
      <div className="create-trip-heading">
        <h2 id="create-trip-title">Create trip</h2>
        <button className="button-icon" onClick={onClose} aria-label="Close trip creator"><Icon name="close" /></button>
      </div>
      <div className="create-trip-fields">
        <label>Start<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label>End<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        <label>Title <span>optional</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      </div>
      <p className="create-trip-preview">
        {preview.cities.length ? destinationTrail(preview.cities) : 'No named places in these dates'}
        <small>{preview.visits} visits · {preview.legs} movements</small>
      </p>
      {!valid && <p className="field-error">The end date must be after the start date.</p>}
      <button className="button-primary" disabled={!valid} onClick={() => void createTrip({ start, end, title })}>Save trip</button>
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
  const visibleTrips = trips
    .filter((trip) => !dismissed.includes(trip.id))
    .sort((a, b) => Date.parse(b.start) - Date.parse(a.start))

  return (
    <main className="trips-screen">
      <nav className="app-nav">
        <button className="brand-button" onClick={showHome}><BrandMark /></button>
        <button className="button-primary" onClick={() => setCreating(true)}><Icon name="plus" /> Create trip</button>
      </nav>

      <header className="trips-header">
        <h1>Your trips</h1>
        <p>{visibleTrips.length} found between {timeline.report.dateRange ? formatRange(timeline.report.dateRange.start, timeline.report.dateRange.end) : 'the imported dates'}</p>
      </header>

      {creating && <CreateTripPanel onClose={() => setCreating(false)} />}

      {visibleTrips.length ? (
        <section className="trip-list" aria-label="Trips">
          {visibleTrips.map((trip) => (
            <button className="trip-row" key={trip.id} onClick={() => openTrip(trip.id)}>
              <span className="trip-row-copy">
                <strong>{trip.title}</strong>
                <span>{destinationTrail(trip.destinations.map((destination) => destination.name)) || 'No named destination'}</span>
                <small>{formatRange(trip.start, trip.end)}</small>
              </span>
              <Icon name="chevron" />
            </button>
          ))}
        </section>
      ) : (
        <section className="empty-trips">
          <h2>No trips found</h2>
          <p>Choose dates to add one.</p>
          <button className="button-primary" onClick={() => setCreating(true)}>Create trip</button>
        </section>
      )}

      <details className="data-details">
        <summary>Imported data</summary>
        <p>{timeline.report.recordsRead.toLocaleString()} records · {timeline.report.visits.toLocaleString()} visits · {timeline.report.movementLegs.toLocaleString()} movements</p>
        <button className="danger-link" onClick={() => { if (window.confirm('Delete the imported Timeline and every saved trip?')) void clearData() }}><Icon name="trash" /> Delete imported data</button>
      </details>

      <footer className="signature-footer">Build with <span aria-label="love">❤️</span> | <a href="https://dalmo.ai">dalmo.ai</a></footer>
    </main>
  )
}
