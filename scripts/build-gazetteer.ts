import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

type CityTuple = [lat: number, lng: number, name: string, countryCode: string, admin1Code: string, population: number]

const sourceDirectory = resolve(process.argv[2] ?? '.testing-data/geonames')
const outputPath = resolve('public/data/cities.json')

const [cityText, adminText, countryText] = await Promise.all([
  readFile(resolve(sourceDirectory, 'cities15000.txt'), 'utf8'),
  readFile(resolve(sourceDirectory, 'admin1CodesASCII.txt'), 'utf8'),
  readFile(resolve(sourceDirectory, 'countryInfo.txt'), 'utf8'),
])

const countries = Object.fromEntries(
  countryText
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const columns = line.split('\t')
      return [columns[0], columns[4]]
    }),
)

const regions = Object.fromEntries(
  adminText
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const columns = line.split('\t')
      return [columns[0], columns[1]]
    }),
)

const buckets: Record<string, CityTuple[]> = {}
for (const line of cityText.split(/\r?\n/)) {
  if (!line) continue
  const columns = line.split('\t')
  const lat = Number(columns[4])
  const lng = Number(columns[5])
  const featureCode = columns[7]
  if (['PPLX', 'PPLH', 'PPLQ', 'PPLW'].includes(featureCode)) continue
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
  const tuple: CityTuple = [
    Number(lat.toFixed(4)),
    Number(lng.toFixed(4)),
    columns[1],
    columns[8],
    columns[10],
    Number(columns[14]) || 0,
  ]
  const key = `${Math.floor(lat)}:${Math.floor(lng)}`
  ;(buckets[key] ??= []).push(tuple)
}

for (const cities of Object.values(buckets)) cities.sort((a, b) => b[5] - a[5])

await mkdir(resolve('public/data'), { recursive: true })
await writeFile(outputPath, JSON.stringify({
  version: 1,
  attribution: 'GeoNames, CC BY 4.0',
  countries,
  regions,
  buckets,
}))

const cityCount = Object.values(buckets).reduce((sum, cities) => sum + cities.length, 0)
console.log(`Wrote ${cityCount.toLocaleString()} cities to ${outputPath}`)
