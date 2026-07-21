import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
  type GeoJSONSource,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { haversineKm } from '../../domain/geo'
import { buildCinematicKeyframes, buildDirectedKeyframes, buildPlaybackTimeline, interpolatePlayback, mapCinematicProgress } from '../../domain/playback'
import type { RouteGeometry } from '../../domain/route-reconstruction'
import { tripDistanceKm } from '../../domain/trip-detection'
import type { MemoryPlan, NormalizedTimeline, TravelMode, TripRecord } from '../../domain/types'
import { Icon } from '../../components/Icon'
import type { DisplayTripPhoto } from '../photos/TripPhotos'

interface CinematicMapProps {
  routes: RouteGeometry[]
  timeline: NormalizedTimeline
  trip: TripRecord
  loading?: boolean
  photos?: DisplayTripPhoto[]
  selectedPhotoId?: string
  onPhotoChange?: (photoId: string) => void
  memoryPlan?: MemoryPlan
  directedPlaybackRequest?: number
}

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

function lineFeature(points: Array<{ lat: number; lng: number }>, properties: Record<string, string> = {}) {
  return {
    type: 'Feature' as const,
    properties,
    geometry: { type: 'LineString' as const, coordinates: points.map((point) => [point.lng, point.lat]) },
  }
}

function fullRouteData(routes: RouteGeometry[]) {
  return {
    type: 'FeatureCollection' as const,
    features: routes.filter((route) => route.points.length > 1).map((route) => lineFeature(route.points, { provenance: route.provenance })),
  }
}

function progressData(points: Array<{ lat: number; lng: number }>) {
  return {
    type: 'FeatureCollection' as const,
    features: points.length > 1 ? [lineFeature(points)] : [],
  }
}

function markerData(point?: { lat: number; lng: number }) {
  return {
    type: 'FeatureCollection' as const,
    features: point ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [point.lng, point.lat] } }] : [],
  }
}

function photoMarkerData(photos: DisplayTripPhoto[]) {
  return {
    type: 'FeatureCollection' as const,
    features: photos.map((photo) => ({
      type: 'Feature' as const,
      properties: { id: photo.id },
      geometry: { type: 'Point' as const, coordinates: [photo.coordinate.lng, photo.coordinate.lat] },
    })),
  }
}

function modeLabel(mode: TravelMode): string {
  const labels: Record<TravelMode, string> = {
    driving: 'Driving',
    walking: 'Walking',
    cycling: 'Cycling',
    running: 'Running',
    flight: 'Flying',
    train: 'Train',
    subway: 'Subway',
    tram: 'Tram',
    bus: 'Bus',
    ferry: 'Ferry',
    skiing: 'Skiing',
    unknown: 'Moving',
  }
  return labels[mode]
}

export function CinematicMap({ routes, timeline, trip, loading, photos = [], selectedPhotoId, onPhotoChange, memoryPlan, directedPlaybackRequest = 0 }: CinematicMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const mapLoaded = useRef(false)
  const animationFrame = useRef(0)
  const animationStartedAt = useRef(0)
  const animationStartProgress = useRef(0)
  const progressValue = useRef(0)
  const lastMapUpdate = useRef(0)
  const progressInput = useRef<HTMLInputElement>(null)
  const dateText = useRef<HTMLSpanElement>(null)
  const timeText = useRef<HTMLSpanElement>(null)
  const modeText = useRef<HTMLSpanElement>(null)
  const placeText = useRef<HTMLSpanElement>(null)
  const activePhotoIdRef = useRef<string | undefined>(undefined)
  const directedRef = useRef(false)
  const handledDirectedRequest = useRef(0)
  const photosRef = useRef(photos)
  photosRef.current = photos
  const [playing, setPlaying] = useState(false)
  const [activePhotoId, setActivePhotoId] = useState<string>()
  const [directed, setDirected] = useState(false)
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>()
  const [activeCaption, setActiveCaption] = useState<string>()

  const playback = useMemo(() => buildPlaybackTimeline(routes), [routes])
  const keyframes = useMemo(() => buildCinematicKeyframes(routes, playback), [routes, playback])
  const directedKeyframes = useMemo(() => memoryPlan ? buildDirectedKeyframes(memoryPlan, playback) : [], [memoryPlan, playback])
  const completeRoute = useMemo(() => fullRouteData(routes), [routes])
  const miles = Math.round(tripDistanceKm(timeline, trip) * 0.621371)
  const modeLabels = [...new Set(routes.filter((route) => route.mode !== 'unknown').map((route) => route.mode))]
    .map((mode) => ({ mode, count: routes.filter((route) => route.mode === mode).length }))
    .sort((a, b) => b.count - a.count)
    .map(({ mode }) => modeLabel(mode))
  const travelModes = modeLabels.length > 2 ? `${modeLabels.slice(0, 2).join(', ')} +${modeLabels.length - 2}` : modeLabels.join(', ') || 'Recorded movement'

  const fitRoute = useCallback(() => {
    const activeMap = map.current
    const points = routes.flatMap((route) => route.points)
    if (!activeMap || !mapLoaded.current || !points.length) return
    const bounds = new LngLatBounds()
    for (const point of points) bounds.extend([point.lng, point.lat])
    activeMap.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 0 })
  }, [routes])

  useEffect(() => {
    if (!container.current || map.current) return
    const activeMap = new MapLibreMap({
      container: container.current,
      style: MAP_STYLE,
      center: [0, 20],
      zoom: 1,
      attributionControl: false,
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
    })
    map.current = activeMap
    activeMap.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    activeMap.addControl(new AttributionControl({
      compact: true,
      customAttribution: '<a href="https://www.geonames.org/" target="_blank" rel="noreferrer">Place names © GeoNames</a>',
    }))
    activeMap.on('load', () => {
      mapLoaded.current = true
      activeMap.addSource('route-full', { type: 'geojson', data: completeRoute })
      activeMap.addSource('route-progress', { type: 'geojson', data: progressData([]) })
      activeMap.addSource('route-marker', { type: 'geojson', data: markerData(playback.points[0]) })
      activeMap.addSource('route-photos', { type: 'geojson', data: photoMarkerData(photosRef.current) })
      activeMap.addLayer({
        id: 'route-fallback',
        type: 'line',
        source: 'route-full',
        filter: ['in', ['get', 'provenance'], ['literal', ['fallback', 'great-circle']]],
        paint: { 'line-color': '#4b5563', 'line-width': 3, 'line-opacity': 0.66, 'line-dasharray': [2, 2] },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      activeMap.addLayer({
        id: 'route-recorded',
        type: 'line',
        source: 'route-full',
        filter: ['!', ['in', ['get', 'provenance'], ['literal', ['fallback', 'great-circle']]]],
        paint: { 'line-color': '#27313a', 'line-width': 3, 'line-opacity': 0.72 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      activeMap.addLayer({
        id: 'route-progress-line',
        type: 'line',
        source: 'route-progress',
        paint: { 'line-color': '#0d6b4d', 'line-width': 5, 'line-opacity': 0.95 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      activeMap.addLayer({
        id: 'route-marker-dot',
        type: 'circle',
        source: 'route-marker',
        paint: {
          'circle-radius': 7,
          'circle-color': '#d64b2a',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
        },
      })
      activeMap.addLayer({
        id: 'route-photo-points',
        type: 'circle',
        source: 'route-photos',
        paint: {
          'circle-radius': 4,
          'circle-color': '#fbfbf8',
          'circle-stroke-color': '#146b4e',
          'circle-stroke-width': 2,
        },
      })
      activeMap.addLayer({
        id: 'route-photo-active',
        type: 'circle',
        source: 'route-photos',
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-radius': 9,
          'circle-color': '#146b4e',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
        },
      })
      fitRoute()
    })
    return () => {
      cancelAnimationFrame(animationFrame.current)
      activeMap.remove()
      map.current = null
      mapLoaded.current = false
    }
  }, [completeRoute, fitRoute, playback.points])

  useEffect(() => {
    if (!mapLoaded.current) return
    ;(map.current?.getSource('route-photos') as GeoJSONSource | undefined)?.setData(photoMarkerData(photos))
  }, [photos])

  useEffect(() => {
    const activeMap = map.current
    if (!activeMap || !mapLoaded.current) return
    ;(activeMap.getSource('route-full') as GeoJSONSource | undefined)?.setData(completeRoute)
    ;(activeMap.getSource('route-progress') as GeoJSONSource | undefined)?.setData(progressData([]))
    ;(activeMap.getSource('route-marker') as GeoJSONSource | undefined)?.setData(markerData(playback.points[0]))
    progressValue.current = 0
    if (progressInput.current) progressInput.current.value = '0'
    fitRoute()
  }, [completeRoute, fitRoute, playback.points])

  const updateVisuals = useCallback((progress: number, now = performance.now()) => {
    const state = interpolatePlayback(playback, progress)
    if (!state) return
    progressValue.current = progress
    if (progressInput.current) progressInput.current.value = String(progress)
    const localClock = new Date(Date.parse(state.timestamp) + state.utcOffsetMinutes * 60_000)
    if (dateText.current) dateText.current.textContent = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(localClock)
    if (timeText.current) timeText.current.textContent = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(localClock)
    if (modeText.current) modeText.current.textContent = modeLabel(state.mode)
    const nearest = trip.destinations
      .map((destination) => ({ destination, distance: haversineKm(state, destination.coordinate) }))
      .sort((a, b) => a.distance - b.distance)[0]
    if (placeText.current) placeText.current.textContent = nearest && nearest.distance < 75 ? nearest.destination.name : modeLabel(state.mode)

    if (directedRef.current && memoryPlan?.chapters.length) {
      const timestamp = Date.parse(state.timestamp)
      const containing = memoryPlan.chapters.findIndex((chapter) => timestamp >= Date.parse(chapter.start) && timestamp <= Date.parse(chapter.end))
      const previous = memoryPlan.chapters.reduce((selected, chapter, index) => Date.parse(chapter.start) <= timestamp ? index : selected, 0)
      setActiveChapterIndex(containing >= 0 ? containing : previous)
      const caption = memoryPlan.captions.reduce<{ timestamp: string; text: string } | undefined>((selected, item) => Date.parse(item.timestamp) <= timestamp ? item : selected, undefined)
      setActiveCaption(caption?.text)
    } else {
      setActiveChapterIndex(undefined)
      setActiveCaption(undefined)
    }

    const photo = photos.filter((item) => Date.parse(item.capturedAt) <= Date.parse(state.timestamp)).at(-1)
    if (photo && activePhotoIdRef.current !== photo.id) {
      activePhotoIdRef.current = photo.id
      setActivePhotoId(photo.id)
      onPhotoChange?.(photo.id)
      if (mapLoaded.current && map.current?.getLayer('route-photo-active')) {
        map.current.setFilter('route-photo-active', ['==', ['get', 'id'], photo.id])
      }
    }

    if (mapLoaded.current && now - lastMapUpdate.current >= 40) {
      lastMapUpdate.current = now
      const progressed = [...playback.points.slice(0, state.pointIndex + 1), state]
      ;(map.current?.getSource('route-progress') as GeoJSONSource | undefined)?.setData(progressData(progressed))
      ;(map.current?.getSource('route-marker') as GeoJSONSource | undefined)?.setData(markerData(state))
    }
  }, [memoryPlan, onPhotoChange, photos, playback, trip.destinations])

  useEffect(() => {
    updateVisuals(0)
    return () => cancelAnimationFrame(animationFrame.current)
  }, [updateVisuals])

  const tick = useCallback((now: number) => {
    const elapsed = now - animationStartedAt.current
    const wallProgress = Math.min(1, animationStartProgress.current + elapsed / 30_000)
    const activeKeyframes = directedRef.current && directedKeyframes.length ? directedKeyframes : keyframes
    updateVisuals(mapCinematicProgress(activeKeyframes, wallProgress), now)
    if (wallProgress >= 1) {
      setPlaying(false)
      return
    }
    animationFrame.current = requestAnimationFrame(tick)
  }, [directedKeyframes, keyframes, updateVisuals])

  const beginPlayback = useCallback((useDirection: boolean) => {
    cancelAnimationFrame(animationFrame.current)
    const shouldRestart = progressValue.current >= 0.999 || useDirection !== directedRef.current
    directedRef.current = useDirection
    setDirected(useDirection)
    if (shouldRestart) updateVisuals(0)
    animationStartProgress.current = shouldRestart ? 0 : progressValue.current
    animationStartedAt.current = performance.now()
    setPlaying(true)
    animationFrame.current = requestAnimationFrame(tick)
  }, [tick, updateVisuals])

  const togglePlayback = useCallback(() => {
    if (playing) {
      cancelAnimationFrame(animationFrame.current)
      setPlaying(false)
      return
    }
    beginPlayback(Boolean(memoryPlan && directedKeyframes.length))
  }, [beginPlayback, directedKeyframes.length, memoryPlan, playing])

  useEffect(() => {
    if (!memoryPlan || directedPlaybackRequest <= 0 || directedPlaybackRequest <= handledDirectedRequest.current) return
    handledDirectedRequest.current = directedPlaybackRequest
    beginPlayback(true)
  }, [beginPlayback, directedPlaybackRequest, memoryPlan])

  const scrub = (value: number) => {
    cancelAnimationFrame(animationFrame.current)
    setPlaying(false)
    updateVisuals(value)
  }

  const activeChapter = activeChapterIndex === undefined ? undefined : memoryPlan?.chapters[activeChapterIndex]

  useEffect(() => {
    if (!selectedPhotoId || selectedPhotoId === activePhotoIdRef.current || !playback.points.length) return
    const photo = photos.find((item) => item.id === selectedPhotoId)
    if (!photo) return
    cancelAnimationFrame(animationFrame.current)
    setPlaying(false)
    const progress = Math.max(0, Math.min(1, (Date.parse(photo.capturedAt) - playback.startMs) / Math.max(1, playback.endMs - playback.startMs)))
    activePhotoIdRef.current = photo.id
    setActivePhotoId(photo.id)
    updateVisuals(progress)
    if (mapLoaded.current && map.current?.getLayer('route-photo-active')) {
      map.current.setFilter('route-photo-active', ['==', ['get', 'id'], photo.id])
    }
  }, [photos, playback, selectedPhotoId, updateVisuals])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.code === 'Space') {
        event.preventDefault()
        togglePlayback()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlayback])

  return (
    <section className="trip-replay" aria-label={`Replay ${trip.title}`}>
      <div className="map-stage">
        <div ref={container} className="map-canvas" aria-label={`Map of ${trip.title}`} />
        {loading && <div className="map-loading" role="status">Preparing the route…</div>}
        <div className="map-now" aria-live="polite">
          <strong ref={placeText}>{trip.destinations[0]?.name ?? trip.title}</strong>
          <span><span ref={dateText} /> <span ref={timeText} /> · <span ref={modeText}>Ready</span></span>
        </div>
        <button className="fit-route" type="button" onClick={fitRoute}>Fit route</button>
        {directed && activeChapter && (
          <article className="map-story-caption" aria-live="polite">
            <span>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(activeChapter.start))}</span>
            <strong>{activeChapter.title}</strong>
            <p>{activeCaption ?? activeChapter.summary}</p>
          </article>
        )}
        {activePhotoId && (() => {
          const photo = photos.find((item) => item.id === activePhotoId)
          if (!photo) return null
          const index = photos.findIndex((item) => item.id === photo.id)
          return (
            <figure className="map-photo-viewport">
              <img src={photo.url} alt={photo.name} />
              <figcaption><span>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(photo.capturedAt))}</span><span>{index + 1}/{photos.length}</span></figcaption>
            </figure>
          )
        })()}
      </div>

      <aside className="replay-panel">
        <div className="trip-stats" aria-label="Trip statistics">
          <div><span>Distance</span><strong>{miles.toLocaleString()} mi</strong></div>
          <div><span>Nights</span><strong>{trip.evidence.nightsAway}</strong></div>
          <div><span>Places</span><strong>{trip.destinations.length}</strong></div>
          <div><span>Travel</span><strong>{travelModes}</strong></div>
        </div>
        <div className="replay-controls">
          <button className="play-button" onClick={togglePlayback} disabled={!playback.points.length} aria-label={playing ? 'Pause replay' : memoryPlan ? 'Play GPT-5.6 memory' : progressValue.current >= 0.999 ? 'Replay trip' : 'Play trip'}>
            <Icon name={playing ? 'pause' : 'play'} />
            {playing ? 'Pause' : memoryPlan ? 'Play memory' : progressValue.current >= 0.999 ? 'Replay' : 'Play'}
          </button>
          <input
            ref={progressInput}
            className="scrubber"
            type="range"
            min="0"
            max="1"
            step="0.001"
            defaultValue="0"
            onChange={(event) => scrub(Number(event.target.value))}
            aria-label="Replay position"
          />
          <span>{memoryPlan ? 'GPT-5.6 directed · 30 sec' : '30 seconds'}</span>
        </div>
      </aside>
    </section>
  )
}
