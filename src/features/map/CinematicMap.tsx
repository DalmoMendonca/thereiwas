import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { feature } from 'topojson-client'
import world from 'world-atlas/countries-110m.json'
import { haversineKm } from '../../domain/geo'
import { buildCinematicKeyframes, buildPlaybackTimeline, interpolatePlayback, mapCinematicProgress } from '../../domain/playback'
import type { RouteGeometry } from '../../domain/route-reconstruction'
import type { NormalizedTimeline, TravelMode, TripRecord } from '../../domain/types'
import { Icon } from '../../components/Icon'

interface CinematicMapProps {
  routes: RouteGeometry[]
  timeline: NormalizedTimeline
  trip: TripRecord
  loading?: boolean
}

interface ProjectedPoint { x: number; y: number }

const WIDTH = 1000
const HEIGHT = 500

function project({ lat, lng }: { lat: number; lng: number }): ProjectedPoint {
  return { x: ((lng + 180) / 360) * WIDTH, y: ((90 - lat) / 180) * HEIGHT }
}

function geometryPath(geometry: unknown): string {
  if (!geometry || typeof geometry !== 'object') return ''
  const typed = geometry as { type?: string; coordinates?: unknown }
  const polygon = (rings: unknown) =>
    (rings as Array<Array<[number, number]>>)
      .map((ring) => ring.map(([lng, lat], index) => `${index ? 'L' : 'M'}${project({ lat, lng }).x.toFixed(2)},${project({ lat, lng }).y.toFixed(2)}`).join(' ') + ' Z')
      .join(' ')
  if (typed.type === 'Polygon') return polygon(typed.coordinates)
  if (typed.type === 'MultiPolygon') return (typed.coordinates as unknown[]).map(polygon).join(' ')
  return ''
}

function modeLabel(mode: TravelMode): string {
  return mode === 'flight' ? 'In flight' : mode === 'driving' ? 'On the road' : mode === 'walking' ? 'Walking' : mode.charAt(0).toUpperCase() + mode.slice(1)
}

function modeIcon(mode: TravelMode) {
  return mode === 'flight' ? 'flight' : 'route'
}

export function CinematicMap({ routes, timeline, trip, loading }: CinematicMapProps) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<1 | 2 | 5 | 10>(1)
  const [cinematic, setCinematic] = useState(true)
  const [finished, setFinished] = useState(false)
  const progressValue = useRef(0)
  const wallProgressValue = useRef(0)
  const animationFrame = useRef<number>(0)
  const animationStartedAt = useRef(0)
  const animationStartProgress = useRef(0)
  const routePath = useRef<SVGPathElement>(null)
  const marker = useRef<SVGGElement>(null)
  const camera = useRef<SVGGElement>(null)
  const progressInput = useRef<HTMLInputElement>(null)
  const dateText = useRef<HTMLSpanElement>(null)
  const timeText = useRef<HTMLSpanElement>(null)
  const distanceText = useRef<HTMLSpanElement>(null)
  const modeText = useRef<HTMLSpanElement>(null)
  const placeText = useRef<HTMLSpanElement>(null)
  const modeGlyph = useRef<HTMLSpanElement>(null)
  const reducedMotion = useRef(false)

  const playback = useMemo(() => buildPlaybackTimeline(routes), [routes])
  const cinematicKeyframes = useMemo(() => buildCinematicKeyframes(routes, playback), [routes, playback])
  const landPath = useMemo(() => {
    const collection = feature(world as never, (world as { objects: { countries: unknown } }).objects.countries as never) as unknown as { features: Array<{ geometry: unknown }> }
    return collection.features.map((item) => geometryPath(item.geometry)).join(' ')
  }, [])
  const tripVisits = useMemo(() => timeline.visits.filter((visit) => trip.visitIds.includes(visit.id) && visit.coordinate && visit.displayName !== 'Home'), [timeline, trip])
  const routeD = useMemo(
    () =>
      routes
        .map((route) => route.points.map((point, index) => {
          const position = project(point)
          return `${index ? 'L' : 'M'}${position.x.toFixed(2)},${position.y.toFixed(2)}`
        }).join(' '))
        .join(' '),
    [routes],
  )

  const updateVisuals = useCallback(
    (progress: number) => {
      const state = interpolatePlayback(playback, progress)
      if (!state) return
      progressValue.current = progress
      if (progressInput.current) progressInput.current.value = String(progress)
      if (routePath.current) routePath.current.style.strokeDashoffset = String(1 - progress)
      const point = project(state)
      if (marker.current) marker.current.setAttribute('transform', `translate(${point.x} ${point.y})`)
      const zoom = reducedMotion.current ? 1 : state.mode === 'flight' ? 1.15 : state.mode === 'driving' ? 3.05 : 4.1
      if (camera.current) camera.current.setAttribute('transform', `translate(${WIDTH / 2} ${HEIGHT / 2}) scale(${zoom}) translate(${-point.x} ${-point.y})`)
      const localClock = new Date(Date.parse(state.timestamp) + state.utcOffsetMinutes * 60_000)
      const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(localClock)
      const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(localClock)
      if (dateText.current) dateText.current.textContent = date
      if (timeText.current) timeText.current.textContent = time
      if (distanceText.current) distanceText.current.textContent = `${Math.round(state.distanceKm).toLocaleString()} km`
      if (modeText.current) modeText.current.textContent = modeLabel(state.mode)
      if (modeGlyph.current) modeGlyph.current.dataset.mode = modeIcon(state.mode)
      const nearest = tripVisits
        .map((visit) => ({ visit, distance: haversineKm(state, visit.coordinate!) }))
        .sort((a, b) => a.distance - b.distance)[0]
      if (placeText.current) placeText.current.textContent = nearest && nearest.distance < 65 ? nearest.visit.displayName ?? 'On the way' : state.mode === 'flight' ? 'Across the Atlantic' : 'On the way'
    },
    [playback, tripVisits],
  )

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    updateVisuals(0)
    return () => cancelAnimationFrame(animationFrame.current)
  }, [updateVisuals])

  const tick = useCallback(
    (now: number) => {
      const duration = cinematic ? 30_000 : 120_000 / speed
      const elapsed = now - animationStartedAt.current
      const wallProgress = Math.min(1, animationStartProgress.current + elapsed / duration)
      wallProgressValue.current = wallProgress
      const progress = cinematic ? mapCinematicProgress(cinematicKeyframes, wallProgress) : wallProgress
      updateVisuals(progress)
      if (wallProgress >= 1) {
        setPlaying(false)
        setFinished(true)
        return
      }
      animationFrame.current = requestAnimationFrame(tick)
    },
    [cinematic, cinematicKeyframes, speed, updateVisuals],
  )

  const togglePlayback = useCallback(() => {
    if (playing) {
      cancelAnimationFrame(animationFrame.current)
      setPlaying(false)
      return
    }
    if (progressValue.current >= 1) {
      progressValue.current = 0
      wallProgressValue.current = 0
      setFinished(false)
      updateVisuals(0)
    }
    animationStartProgress.current = cinematic ? wallProgressValue.current : progressValue.current
    animationStartedAt.current = performance.now()
    setPlaying(true)
    animationFrame.current = requestAnimationFrame(tick)
  }, [playing, tick, updateVisuals])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.code === 'Space') {
        event.preventDefault()
        togglePlayback()
      }
      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        event.preventDefault()
        const direction = event.code === 'ArrowRight' ? 1 : -1
        const next = Math.max(0, Math.min(1, progressValue.current + direction * 0.025))
        cancelAnimationFrame(animationFrame.current)
        setPlaying(false)
        updateVisuals(next)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlayback, updateVisuals])

  const onScrub = (value: number) => {
    cancelAnimationFrame(animationFrame.current)
    setPlaying(false)
    setFinished(value >= 1)
    wallProgressValue.current = value
    updateVisuals(value)
  }

  const setPlaybackSpeed = (value: 1 | 2 | 5 | 10) => {
    setCinematic(false)
    setSpeed(value)
    if (playing) {
      cancelAnimationFrame(animationFrame.current)
      animationStartProgress.current = cinematic ? wallProgressValue.current : progressValue.current
      animationStartedAt.current = performance.now()
      animationFrame.current = requestAnimationFrame(tick)
    }
  }

  const provenance = [...new Set(routes.map((route) => route.provenance))]

  return (
    <section className="cinematic-map" aria-label="Cinematic trip replay">
      <div className="map-stage">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Animated route for ${trip.title}`}>
          <rect width={WIDTH} height={HEIGHT} className="map-ocean" />
          <g ref={camera} className="map-camera">
            <path d={landPath} className="map-land" />
            <path d={routeD} className="route-shadow" pathLength="1" />
            <path ref={routePath} d={routeD} className="route-progress" pathLength="1" />
            {tripVisits.map((visit) => {
              const location = project(visit.coordinate!)
              return (
                <g key={visit.id} transform={`translate(${location.x} ${location.y})`} className="map-stop">
                  <circle r="3.2" />
                  <text x="6" y="-5">{visit.displayName}</text>
                </g>
              )
            })}
            <g ref={marker} className="map-marker">
              <circle r="8" className="marker-halo" />
              <circle r="3.8" className="marker-core" />
            </g>
          </g>
        </svg>

        {loading && (
          <div className="map-loading" role="status">
            <span className="loading-line" />
            Reconstructing the route…
          </div>
        )}

        <div className="map-hud map-hud-top" aria-live="polite">
          <div className="hud-place"><span ref={placeText}>At the origin</span><small ref={modeText}>Ready</small></div>
          <div className="hud-clock"><span ref={dateText}>Jul 3</span><strong ref={timeText}>6:40 AM</strong></div>
        </div>

        <div className="map-hud map-hud-distance">
          <span ref={modeGlyph} className="hud-mode-icon" data-mode="route"><Icon name="route" /></span>
          <strong ref={distanceText}>0 km</strong>
          <small>traveled</small>
        </div>

        {finished && (
          <div className="journey-finale" role="status">
            <span>The route closes</span>
            <strong>{Math.round(playback.totalDistanceKm).toLocaleString()} km</strong>
            <small>{trip.evidence.nightsAway} nights · {trip.evidence.destinationCount} destinations</small>
          </div>
        )}

        <div className="map-provenance" title="Source geometry is preserved separately from enhanced or inferred route geometry">
          {provenance.includes('enhanced') ? 'Enhanced + source route' : provenance.includes('observed') ? 'Observed + inferred route' : 'Honest inferred route'}
        </div>
      </div>

      <div className="playback-controls">
        <button className="play-button" onClick={togglePlayback} disabled={!playback.points.length} aria-label={playing ? 'Pause replay' : finished ? 'Replay journey' : 'Play journey'}>
          <Icon name={playing ? 'pause' : 'play'} />
          <span>{playing ? 'Pause' : finished ? 'Replay' : 'Play'}</span>
        </button>
        <input
          ref={progressInput}
          className="scrubber"
          type="range"
          min="0"
          max="1"
          step="0.001"
          defaultValue="0"
          onChange={(event) => onScrub(Number(event.target.value))}
          aria-label="Replay position"
        />
        <div className="speed-controls" aria-label="Playback speed">
          <button className={cinematic ? 'active' : ''} onClick={() => setCinematic(true)}>30 sec</button>
          {([1, 2, 5, 10] as const).map((value) => (
            <button key={value} className={!cinematic && speed === value ? 'active' : ''} onClick={() => setPlaybackSpeed(value)}>{value}×</button>
          ))}
        </div>
        <span className="keyboard-hint"><kbd>Space</kbd> play · <kbd>←</kbd><kbd>→</kbd> scrub</span>
      </div>
    </section>
  )
}
