import type { Coordinate } from './types'

const EARTH_RADIUS_KM = 6371.0088

export function parseGeoCoordinate(value: unknown): Coordinate | undefined {
  if (typeof value !== 'string') return undefined
  const match = /^geo:([+-]?(?:\d+(?:\.\d+)?|\.\d+)),([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/i.exec(value.trim())
  if (!match) return undefined
  const lat = Number(match[1])
  const lng = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined
  return { lat, lng }
}

export function normalizeNumericString(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : undefined
}

export function parseTimestamp(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/T/.test(value)) return undefined
  return Number.isNaN(Date.parse(value)) ? undefined : value
}

export function haversineKm(a: Coordinate, b: Coordinate): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const deltaLat = toRad(b.lat - a.lat)
  const deltaLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function coordinateKey(coordinate: Coordinate, precision = 3): string {
  return `${coordinate.lat.toFixed(precision)},${coordinate.lng.toFixed(precision)}`
}

export function interpolateCoordinate(a: Coordinate, b: Coordinate, progress: number): Coordinate {
  const t = Math.max(0, Math.min(1, progress))
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }
}

