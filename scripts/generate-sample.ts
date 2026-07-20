import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const visit = (
  startTime: string,
  endTime: string,
  placeID: string,
  placeLocation: string,
  displayName: string,
  semanticType?: string,
  probability = '0.96',
) => ({
  startTime,
  endTime,
  visit: {
    hierarchyLevel: '0',
    probability,
    topCandidate: {
      probability,
      semanticType,
      placeID,
      placeLocation,
      displayName,
    },
  },
})

const activity = (
  startTime: string,
  endTime: string,
  type: string,
  start: string,
  end: string,
  distanceMeters: number,
  probability = '0.94',
) => ({
  startTime,
  endTime,
  activity: {
    probability,
    start,
    end,
    distanceMeters: String(distanceMeters),
    topCandidate: { type, probability },
  },
})

const path = (startTime: string, endTime: string, points: Array<[string, number]>) => ({
  startTime,
  endTime,
  timelinePath: points.map(([point, offset]) => ({
    point,
    durationMinutesOffsetFromStartTime: String(offset),
  })),
})

const records = [
  visit('2026-07-01T20:00:00-04:00', '2026-07-03T06:40:00-04:00', 'sample-home', 'geo:33.7490,-84.3880', 'Home', 'Home'),
  activity('2026-07-03T06:40:00-04:00', '2026-07-03T07:20:00-04:00', 'IN_PASSENGER_VEHICLE', 'geo:33.7490,-84.3880', 'geo:33.6407,-84.4277', 17600),
  path('2026-07-03T06:40:00-04:00', '2026-07-03T07:20:00-04:00', [
    ['geo:33.7490,-84.3880', 0],
    ['geo:33.7045,-84.4010', 14],
    ['geo:33.6698,-84.4254', 29],
    ['geo:33.6407,-84.4277', 40],
  ]),
  activity('2026-07-03T08:35:00-04:00', '2026-07-03T18:10:00+00:00', 'FLYING', 'geo:33.6407,-84.4277', 'geo:63.9850,-22.6056', 5334000, '0.99'),
  visit('2026-07-03T18:45:00+00:00', '2026-07-05T08:10:00+00:00', 'sample-reykjavik', 'geo:64.1466,-21.9426', 'Reykjavík', undefined, '0.98'),
  activity('2026-07-04T09:10:00+00:00', '2026-07-04T11:05:00+00:00', 'WALKING', 'geo:64.1466,-21.9426', 'geo:64.1508,-21.9326', 6300),
  path('2026-07-04T09:10:00+00:00', '2026-07-04T11:05:00+00:00', [
    ['geo:64.1466,-21.9426', 0],
    ['geo:64.1481,-21.9392', 19],
    ['geo:64.1470,-21.9348', 43],
    ['geo:64.1508,-21.9326', 72],
    ['geo:64.1466,-21.9426', 115],
  ]),
  activity('2026-07-05T08:10:00+00:00', '2026-07-05T11:05:00+00:00', 'IN_PASSENGER_VEHICLE', 'geo:64.1466,-21.9426', 'geo:63.4186,-19.0060', 187000),
  visit('2026-07-05T11:05:00+00:00', '2026-07-07T08:20:00+00:00', 'sample-vik', 'geo:63.4186,-19.0060', 'Vík í Mýrdal', undefined, '0.97'),
  activity('2026-07-06T15:20:00+00:00', '2026-07-06T15:42:00+00:00', 'WALKING', 'geo:63.4186,-19.0060', 'geo:63.4057,-19.0716', 3800),
  visit('2026-07-06T15:42:00+00:00', '2026-07-06T16:04:00+00:00', 'sample-roadside', 'geo:63.4057,-19.0716', 'A quiet turn on Route 1', undefined, '0.46'),
  activity('2026-07-07T08:20:00+00:00', '2026-07-07T11:50:00+00:00', 'IN_PASSENGER_VEHICLE', 'geo:63.4186,-19.0060', 'geo:64.0485,-16.1794', 271000),
  path('2026-07-07T08:20:00+00:00', '2026-07-07T11:50:00+00:00', [
    ['geo:63.4186,-19.0060', 0],
    ['geo:63.7390,-18.4260', 48],
    ['geo:63.7901,-18.0572', 92],
    ['geo:63.9964,-16.8974', 151],
    ['geo:64.0485,-16.1794', 210],
  ]),
  visit('2026-07-07T11:50:00+00:00', '2026-07-09T08:15:00+00:00', 'sample-jokulsarlon', 'geo:64.0485,-16.1794', 'Jökulsárlón', undefined, '0.96'),
  activity('2026-07-09T08:15:00+00:00', '2026-07-09T14:10:00+00:00', 'IN_PASSENGER_VEHICLE', 'geo:64.0485,-16.1794', 'geo:64.1466,-21.9426', 380000),
  visit('2026-07-09T14:10:00+00:00', '2026-07-10T07:15:00+00:00', 'sample-reykjavik', 'geo:64.1466,-21.9426', 'Reykjavík', undefined, '0.98'),
  activity('2026-07-10T09:05:00+00:00', '2026-07-10T14:15:00-04:00', 'FLYING', 'geo:63.9850,-22.6056', 'geo:33.6407,-84.4277', 5334000, '0.99'),
  activity('2026-07-10T15:00:00-04:00', '2026-07-10T15:38:00-04:00', 'IN_PASSENGER_VEHICLE', 'geo:33.6407,-84.4277', 'geo:33.7490,-84.3880', 17600),
  visit('2026-07-10T15:38:00-04:00', '2026-07-12T09:00:00-04:00', 'sample-home', 'geo:33.7490,-84.3880', 'Home', 'Home'),
  {
    startTime: '2026-07-03T06:40:00-04:00',
    endTime: '2026-07-10T15:38:00-04:00',
    timelineMemory: {
      destinations: [
        { identifier: 'sample-reykjavik' },
        { identifier: 'sample-vik' },
        { identifier: 'sample-jokulsarlon' },
      ],
      distanceFromOriginKms: '5334',
    },
  },
]

const output = resolve('public/sample/sample-timeline.json')
await mkdir(dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify(records, null, 2)}\n`, 'utf8')
console.log(`Wrote ${records.length} generated sample records to ${output}`)

