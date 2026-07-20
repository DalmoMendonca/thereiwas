import { coordinateKey, haversineKm } from './geo'
import type { Coordinate, NormalizedTimeline, PlaceSummary } from './types'

type CityTuple = [lat: number, lng: number, name: string, countryCode: string, admin1Code: string, population: number]

export interface GazetteerData {
  version: 1
  attribution: string
  countries: Record<string, string>
  regions: Record<string, string>
  buckets: Record<string, CityTuple[]>
}

export interface ResolvedPlace {
  locality: string
  region?: string
  country?: string
  countryCode: string
  coordinate: Coordinate
  distanceKm: number
}

const SEARCH_RADIUS_DEGREES = 3
const MAX_CITY_DISTANCE_KM = 180

export function resolveNearestCity(coordinate: Coordinate, gazetteer: GazetteerData): ResolvedPlace | undefined {
  const latBucket = Math.floor(coordinate.lat)
  const lngBucket = Math.floor(coordinate.lng)
  let nearest: { city: CityTuple; distanceKm: number } | undefined

  for (let latOffset = -SEARCH_RADIUS_DEGREES; latOffset <= SEARCH_RADIUS_DEGREES; latOffset += 1) {
    for (let lngOffset = -SEARCH_RADIUS_DEGREES; lngOffset <= SEARCH_RADIUS_DEGREES; lngOffset += 1) {
      const bucket = gazetteer.buckets[`${latBucket + latOffset}:${lngBucket + lngOffset}`] ?? []
      for (const city of bucket) {
        const distanceKm = haversineKm(coordinate, { lat: city[0], lng: city[1] })
        if (!nearest || distanceKm < nearest.distanceKm || (distanceKm === nearest.distanceKm && city[5] > nearest.city[5])) {
          nearest = { city, distanceKm }
        }
      }
    }
  }

  if (!nearest || nearest.distanceKm > MAX_CITY_DISTANCE_KM) return undefined
  const [lat, lng, locality, countryCode, admin1Code] = nearest.city
  return {
    locality,
    region: gazetteer.regions[`${countryCode}.${admin1Code}`],
    country: gazetteer.countries[countryCode],
    countryCode,
    coordinate: { lat, lng },
    distanceKm: nearest.distanceKm,
  }
}

function coordinateLabel(coordinate: Coordinate): string {
  return `${coordinate.lat.toFixed(2)}, ${coordinate.lng.toFixed(2)}`
}

export function nameTimelinePlaces(timeline: NormalizedTimeline, gazetteer: GazetteerData): NormalizedTimeline {
  const placeIdByCoordinate = new Map<string, string>()

  for (const [placeId, place] of Object.entries(timeline.places)) {
    const resolved = resolveNearestCity(place.coordinate, gazetteer)
    placeIdByCoordinate.set(coordinateKey(place.coordinate, 4), placeId)
    if (!resolved) {
      place.displayName ??= coordinateLabel(place.coordinate)
      continue
    }
    place.displayName = resolved.locality
    place.locality = resolved.locality
    place.region = resolved.region
    place.country = resolved.country
    place.countryCode = resolved.countryCode
    place.labelSource = 'gazetteer'
  }

  for (const visit of timeline.visits) {
    const placeId = visit.placeId ?? (visit.coordinate ? placeIdByCoordinate.get(coordinateKey(visit.coordinate, 4)) : undefined)
    const place: PlaceSummary | undefined = placeId ? timeline.places[placeId] : undefined
    if (visit.semanticType?.toLowerCase() === 'home') visit.displayName = 'Home'
    else if (place?.displayName) visit.displayName = place.displayName
    else if (visit.coordinate) visit.displayName = coordinateLabel(visit.coordinate)
  }

  return timeline
}
