export interface Coordinate {
  lat: number
  lng: number
}

export interface TimedCoordinate extends Coordinate {
  timestamp: string
}

export type TravelMode =
  | 'driving'
  | 'walking'
  | 'cycling'
  | 'running'
  | 'flight'
  | 'train'
  | 'subway'
  | 'tram'
  | 'bus'
  | 'ferry'
  | 'skiing'
  | 'unknown'

export interface Visit {
  id: string
  start: string
  end: string
  coordinate?: Coordinate
  placeId?: string
  semanticType?: string
  confidence?: number
  displayName?: string
  sourceIds: string[]
}

export interface Leg {
  id: string
  start: string
  end: string
  mode: TravelMode
  origin?: Coordinate
  destination?: Coordinate
  observedPath: TimedCoordinate[]
  sourceDistanceMeters?: number
  confidence?: number
  sourceIds: string[]
}

export interface PlaceSummary {
  id: string
  coordinate: Coordinate
  displayName?: string
  locality?: string
  region?: string
  country?: string
  labelSource: 'sample' | 'temporary-geocode' | 'user' | 'coordinate'
}

export interface TimelineMemory {
  id: string
  start: string
  end: string
  destinationIds: string[]
  distanceFromOriginKm?: number
  sourceIds: string[]
}

export interface QuarantinedRecord {
  sourceIndex: number
  reason: string
}

export interface ImportReport {
  sourceName: string
  dateRange?: { start: string; end: string }
  recordsRead: number
  visits: number
  movementLegs: number
  pathPoints: number
  malformedRecords: number
  likelyHome?: string
  tripsDetected: number
  coverageWarnings: string[]
  durationMs: number
}

export interface HomeInference {
  coordinate: Coordinate
  placeId?: string
  displayName: string
  confidence: number
  reason: string
}

export interface NormalizedTimeline {
  id: string
  sourceName: string
  importedAt: string
  visits: Visit[]
  legs: Leg[]
  places: Record<string, PlaceSummary>
  memories: TimelineMemory[]
  quarantined: QuarantinedRecord[]
  report: ImportReport
}

export interface TripEvidence {
  start: string
  end: string
  homeDistanceKm: number
  nightsAway: number
  destinationCount: number
  modes: TravelMode[]
  timelineMemorySupport: boolean
  coverageScore: number
  reasons: string[]
}

export interface TripRecord {
  id: string
  source: 'detected' | 'user'
  status: 'proposed' | 'confirmed' | 'edited'
  title: string
  start: string
  end: string
  startLocked: boolean
  endLocked: boolean
  destinationIds: string[]
  visitIds: string[]
  legIds: string[]
  evidence: TripEvidence
  createdAt: string
  updatedAt: string
}

export type Certainty = 'observed' | 'inferred' | 'user-supplied'

export interface MemoryPlan {
  title: string
  oneLineMemory: string
  chapters: Array<{
    title: string
    start: string
    end: string
    summary: string
  }>
  highlights: Array<{
    timestamp: string
    title: string
    description: string
    groundingIds: string[]
    certainty: Certainty
  }>
  captions: Array<{
    timestamp: string
    text: string
    groundingIds: string[]
  }>
  reflectionQuestions: Array<{
    id: string
    question: string
    reason: string
  }>
  uncertaintyNotes: string[]
}

export interface ReflectionAnswer {
  question: string
  answer: string
}

export interface MemoryDossier {
  trip: {
    title: string
    start: string
    end: string
    durationDays: number
    nightsAway: number
    totalDistanceKm: number
  }
  destinations: Array<{
    id: string
    name: string
    firstArrival: string
    lastDeparture: string
    durationMinutes: number
  }>
  legs: Array<{
    id: string
    start: string
    end: string
    mode: TravelMode
    distanceKm: number
  }>
  days: Array<{
    date: string
    destinationIds: string[]
    movementKm: number
    notableTransitions: string[]
  }>
  coverage: { score: number; gaps: string[] }
  uncertainties: string[]
  userNotes: string[]
  reflectionAnswers: ReflectionAnswer[]
}

