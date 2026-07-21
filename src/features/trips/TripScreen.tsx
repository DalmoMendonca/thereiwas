import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../app/store'
import { BrandMark } from '../../components/BrandMark'
import { Icon } from '../../components/Icon'
import { buildTripRoutes, type RouteGeometry } from '../../domain/route-reconstruction'
import { parseTripPhotos } from '../../domain/photo-metadata'
import type { MemoryPlan, TripPhoto } from '../../domain/types'
import { deleteTripPhoto, getRouteCache, loadTripPhotos, saveTripPhotos, setRouteCache } from '../../storage/database'
import { CinematicMap } from '../map/CinematicMap'
import { MemoryDirector } from '../memory-director/MemoryDirector'
import { TripPhotos } from '../photos/TripPhotos'

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
  const [memoryPlan, setMemoryPlan] = useState<MemoryPlan>()
  const [directedPlaybackRequest, setDirectedPlaybackRequest] = useState(0)
  const [editing, setEditing] = useState(false)
  const [photos, setPhotos] = useState<TripPhoto[]>([])
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>()
  const [photoNotice, setPhotoNotice] = useState<string>()
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

  useEffect(() => {
    if (!trip) return
    let cancelled = false
    void loadTripPhotos(trip.id).then((stored) => { if (!cancelled) setPhotos(stored) })
    return () => { cancelled = true }
  }, [trip])

  const displayPhotos = useMemo(() => photos.map((photo) => ({ ...photo, url: URL.createObjectURL(photo.blob) })), [photos])
  useEffect(() => () => displayPhotos.forEach((photo) => URL.revokeObjectURL(photo.url)), [displayPhotos])

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

  const addPhotos = async (files: FileList) => {
    const result = await parseTripPhotos(files, trip)
    if (result.photos.length) {
      await saveTripPhotos(result.photos)
      setPhotos((current) => [...new Map([...current, ...result.photos].map((photo) => [photo.id, photo])).values()].sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt)))
      setSelectedPhotoId(result.photos[0].id)
    }
    const added = result.photos.length ? `${result.photos.length} photo${result.photos.length === 1 ? '' : 's'} added.` : ''
    const skipped = result.skipped.length ? `${result.skipped.length} skipped because GPS, date, or trip timing could not be read.` : ''
    setPhotoNotice([added, skipped].filter(Boolean).join(' '))
  }

  const removePhoto = async (photoId: string) => {
    await deleteTripPhoto(photoId)
    setPhotos((current) => current.filter((photo) => photo.id !== photoId))
    if (selectedPhotoId === photoId) setSelectedPhotoId(undefined)
  }

  const activateDirector = useCallback(() => setDirectorActive(true), [])
  const playMemory = useCallback(() => {
    setDirectedPlaybackRequest((request) => request + 1)
    document.querySelector('.trip-replay')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

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

      <CinematicMap routes={routes} timeline={timeline} trip={trip} loading={routeLoading} photos={displayPhotos} selectedPhotoId={selectedPhotoId} onPhotoChange={setSelectedPhotoId} memoryPlan={memoryPlan} directedPlaybackRequest={directedPlaybackRequest} />

      <TripPhotos photos={displayPhotos} selectedPhotoId={selectedPhotoId} notice={photoNotice} onAdd={(files) => void addPhotos(files)} onSelect={setSelectedPhotoId} onRemove={(photoId) => void removePhoto(photoId)} />

      <div className="trip-below-map">
        <p className="destination-line">{trip.destinations.map((destination) => destination.name).join(' · ')}</p>
        <details className="trip-details">
          <summary>How this trip was found</summary>
          <ul>{trip.evidence.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          <p>{Math.round(trip.evidence.coverageScore * 100)}% of movement legs include recorded path points.</p>
        </details>
      </div>

      <MemoryDirector timeline={timeline} trip={trip} active={directorActive} onActivate={activateDirector} routes={routes} photos={displayPhotos} onPlanChange={setMemoryPlan} onPlay={playMemory} />

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
