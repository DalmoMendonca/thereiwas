import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TripRecord } from './types'

const { parseMetadata } = vi.hoisted(() => ({ parseMetadata: vi.fn() }))
vi.mock('exifr', () => ({ default: { parse: parseMetadata } }))

import { parseTripPhoto } from './photo-metadata'

const trip: TripRecord = {
  id: 'trip-california',
  source: 'detected',
  status: 'proposed',
  title: 'California',
  start: '2026-06-19T18:46:54.082-05:00',
  end: '2026-07-12T13:55:06.209-05:00',
  startLocked: false,
  endLocked: false,
  destinationIds: [],
  destinations: [],
  visitIds: [],
  legIds: [],
  home: { name: 'Home', coordinate: { lat: 0, lng: 0 } },
  evidence: {
    start: '2026-06-19T18:46:54.082-05:00',
    end: '2026-07-12T13:55:06.209-05:00',
    homeDistanceKm: 0,
    nightsAway: 23,
    destinationCount: 0,
    modes: ['driving'],
    timelineMemorySupport: false,
    coverageScore: 1,
    reasons: [],
  },
  createdAt: '2026-07-20T00:00:00.000Z',
  updatedAt: '2026-07-20T00:00:00.000Z',
}

describe('trip photo metadata', () => {
  beforeEach(() => parseMetadata.mockReset())

  it('keeps a geotagged photo locally with its capture time and coordinate', async () => {
    const capturedAt = new Date('2026-06-22T17:00:00.000Z')
    parseMetadata.mockResolvedValue({ latitude: 37.7749, longitude: -122.4194, DateTimeOriginal: capturedAt })
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'san-francisco.jpg', { type: 'image/jpeg' })

    const photo = await parseTripPhoto(file, trip)

    expect(photo.tripId).toBe(trip.id)
    expect(photo.coordinate).toEqual({ lat: 37.7749, lng: -122.4194 })
    expect(photo.capturedAt).toBe(capturedAt.toISOString())
    expect(photo.blob).toBe(file)
  })

  it('rejects photos without a GPS position', async () => {
    parseMetadata.mockResolvedValue({ DateTimeOriginal: new Date('2026-06-22T17:00:00.000Z') })
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'no-location.jpg', { type: 'image/jpeg' })
    await expect(parseTripPhoto(file, trip)).rejects.toThrow('No GPS location')
  })

  it('rejects photos outside the selected trip', async () => {
    parseMetadata.mockResolvedValue({ latitude: 37.7749, longitude: -122.4194, DateTimeOriginal: new Date('2024-01-01T00:00:00.000Z') })
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'old-photo.jpg', { type: 'image/jpeg' })
    await expect(parseTripPhoto(file, trip)).rejects.toThrow('outside this trip')
  })
})
