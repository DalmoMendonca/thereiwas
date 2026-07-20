import fs from 'node:fs'
import path from 'node:path'

type TimelineRecord = {
  startTime?: string
  endTime?: string
  visit?: { topCandidate?: { semanticType?: string } }
}

const sourcePath = path.resolve('.testing-data/location-history.json')
const outputPath = path.resolve('public/sample/sample-timeline.json')
const windows = [
  ['2025-06-28T00:00:00.000Z', '2025-08-03T23:59:59.999Z'],
  ['2025-10-29T00:00:00.000Z', '2025-11-23T23:59:59.999Z'],
  ['2026-06-18T00:00:00.000Z', '2026-07-13T23:59:59.999Z'],
] as const

function overlapsWindow(record: TimelineRecord): boolean {
  const start = Date.parse(record.startTime ?? '')
  const end = Date.parse(record.endTime ?? '')
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false
  return windows.some(([windowStart, windowEnd]) => end >= Date.parse(windowStart) && start <= Date.parse(windowEnd))
}

function isHome(record: TimelineRecord): boolean {
  return record.visit?.topCandidate?.semanticType?.toLowerCase() === 'home'
}

if (!fs.existsSync(sourcePath)) throw new Error(`Private source not found: ${sourcePath}`)
const records = JSON.parse(fs.readFileSync(sourcePath, 'utf8')) as TimelineRecord[]
const sample = records.filter((record) => overlapsWindow(record) || isHome(record))
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(sample)}\n`)
console.log(`Wrote ${sample.length.toLocaleString()} real Timeline records to ${outputPath}`)
