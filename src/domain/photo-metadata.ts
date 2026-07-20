import exifr from 'exifr'
import type { Coordinate, TripPhoto, TripRecord } from './types'

const SUPPORTED_IMAGE = /\.(avif|heic|heif|jpe?g|png|tiff?|webp)$/i

function firstFinite(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}

function coordinateFromMetadata(metadata: Record<string, unknown>): Coordinate | undefined {
  const lat = firstFinite(metadata.latitude, metadata.GPSLatitude, metadata['exif:GPSLatitude'])
  const lng = firstFinite(metadata.longitude, metadata.GPSLongitude, metadata['exif:GPSLongitude'])
  if (lat === undefined || lng === undefined || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined
  return { lat, lng }
}

function timestampFromMetadata(metadata: Record<string, unknown>, file: File): string | undefined {
  const candidates = [
    metadata.DateTimeOriginal,
    metadata.CreateDate,
    metadata.DateCreated,
    metadata.GPSDateTime,
    metadata.ModifyDate,
  ]
  for (const candidate of candidates) {
    if (candidate instanceof Date && Number.isFinite(candidate.getTime())) return candidate.toISOString()
    if (typeof candidate === 'string') {
      const normalized = candidate.trim().replace(/^(\d{4}):(\d{2}):(\d{2})[ T]/, '$1-$2-$3T')
      const parsed = Date.parse(normalized)
      if (Number.isFinite(parsed)) return new Date(parsed).toISOString()
    }
  }
  return file.lastModified ? new Date(file.lastModified).toISOString() : undefined
}

function photoId(file: File, capturedAt: string, coordinate: Coordinate): string {
  return [file.name, file.size, capturedAt, coordinate.lat.toFixed(6), coordinate.lng.toFixed(6)].join('|')
}

export function isSupportedPhoto(file: File): boolean {
  return file.type.startsWith('image/') || SUPPORTED_IMAGE.test(file.name)
}

export async function parseTripPhoto(file: File, trip: TripRecord): Promise<TripPhoto> {
  if (!isSupportedPhoto(file)) throw new Error('Not a supported photo file.')
  const metadata = await exifr.parse(file, {
    gps: true,
    xmp: true,
    tiff: true,
    exif: true,
    mergeOutput: true,
    reviveValues: true,
    translateKeys: true,
    translateValues: true,
  }) as Record<string, unknown> | undefined
  if (!metadata) throw new Error('No readable photo metadata.')
  const coordinate = coordinateFromMetadata(metadata)
  if (!coordinate) throw new Error('No GPS location in the photo.')
  const capturedAt = timestampFromMetadata(metadata, file)
  if (!capturedAt) throw new Error('No capture date in the photo.')
  const padding = 36 * 60 * 60 * 1000
  if (Date.parse(capturedAt) < Date.parse(trip.start) - padding || Date.parse(capturedAt) > Date.parse(trip.end) + padding) {
    throw new Error('The photo date falls outside this trip.')
  }
  return {
    id: photoId(file, capturedAt, coordinate),
    tripId: trip.id,
    name: file.name,
    mimeType: file.type || 'image/jpeg',
    size: file.size,
    capturedAt,
    coordinate,
    blob: file,
  }
}

export async function parseTripPhotos(files: FileList | File[], trip: TripRecord): Promise<{ photos: TripPhoto[]; skipped: string[] }> {
  const photos: TripPhoto[] = []
  const skipped: string[] = []
  for (const file of Array.from(files)) {
    try {
      photos.push(await parseTripPhoto(file, trip))
    } catch (error) {
      skipped.push(`${file.name}: ${error instanceof Error ? error.message : 'Could not read photo.'}`)
    }
  }
  photos.sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt))
  return { photos, skipped }
}

export function tripProgressForPhoto(photo: TripPhoto, trip: TripRecord): number {
  const duration = Math.max(1, Date.parse(trip.end) - Date.parse(trip.start))
  return Math.max(0, Math.min(1, (Date.parse(photo.capturedAt) - Date.parse(trip.start)) / duration))
}
