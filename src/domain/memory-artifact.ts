import type { RouteGeometry } from './route-reconstruction'
import type { Coordinate, MemoryPlan, TripRecord } from './types'

interface ArtifactPhoto {
  name: string
  url: string
}

interface ProjectedRoute {
  points: Array<{ x: number; y: number }>
}

interface RouteProjection {
  routes: ProjectedRoute[]
  project: (coordinate: Coordinate) => { x: number; y: number }
}

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1350

function mercatorY(latitude: number): number {
  const clamped = Math.max(-85, Math.min(85, latitude)) * Math.PI / 180
  return Math.log(Math.tan(Math.PI / 4 + clamped / 2))
}

export function projectRoutes(routes: RouteGeometry[], width: number, height: number, padding: number): RouteProjection {
  const coordinates = routes.flatMap((route) => route.points)
  const xs = coordinates.map((point) => point.lng * Math.PI / 180)
  const ys = coordinates.map((point) => mercatorY(point.lat))
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const xSpan = Math.max(0.0001, maxX - minX)
  const ySpan = Math.max(0.0001, maxY - minY)
  const scale = Math.min((width - padding * 2) / xSpan, (height - padding * 2) / ySpan)
  const drawnWidth = xSpan * scale
  const drawnHeight = ySpan * scale
  const offsetX = (width - drawnWidth) / 2
  const offsetY = (height - drawnHeight) / 2
  const project = (coordinate: Coordinate) => ({
    x: offsetX + (coordinate.lng * Math.PI / 180 - minX) * scale,
    y: offsetY + (maxY - mercatorY(coordinate.lat)) * scale,
  })
  return {
    routes: routes.filter((route) => route.points.length > 1).map((route) => ({ points: route.points.map(project) })),
    project,
  }
}

function formatDateRange(start: string, end: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const words = text.trim().split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width <= maxWidth || !line) line = candidate
    else {
      lines.push(line)
      line = word
      if (lines.length === maxLines - 1) break
    }
  }
  if (line && lines.length < maxLines) lines.push(line)
  const consumedWords = lines.join(' ').split(/\s+/).length
  if (consumedWords < words.length && lines.length) {
    let final = lines.at(-1)!
    while (context.measureText(`${final}...`).width > maxWidth && final.includes(' ')) final = final.slice(0, final.lastIndexOf(' '))
    lines[lines.length - 1] = `${final}...`
  }
  lines.forEach((value, index) => context.fillText(value, x, y + index * lineHeight))
  return y + lines.length * lineHeight
}

function drawRoute(context: CanvasRenderingContext2D, routes: RouteGeometry[], trip: TripRecord) {
  const frame = { x: 82, y: 350, width: 916, height: 550 }
  context.fillStyle = '#ffffff'
  context.fillRect(frame.x, frame.y, frame.width, frame.height)
  const projection = projectRoutes(routes, frame.width, frame.height, 54)
  context.save()
  context.translate(frame.x, frame.y)
  context.strokeStyle = '#27313a'
  context.lineWidth = 7
  context.lineCap = 'round'
  context.lineJoin = 'round'
  for (const route of projection.routes) {
    context.beginPath()
    route.points.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y))
    context.stroke()
  }
  for (const destination of trip.destinations.slice(0, 12)) {
    const point = projection.project(destination.coordinate)
    context.beginPath()
    context.arc(point.x, point.y, 7, 0, Math.PI * 2)
    context.fillStyle = '#fbfbf8'
    context.fill()
    context.strokeStyle = '#146b4e'
    context.lineWidth = 4
    context.stroke()
  }
  const home = projection.project(trip.home.coordinate)
  context.beginPath()
  context.arc(home.x, home.y, 11, 0, Math.PI * 2)
  context.fillStyle = '#d65332'
  context.fill()
  context.strokeStyle = '#ffffff'
  context.lineWidth = 5
  context.stroke()
  context.restore()
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Photo could not be added to the memory card.'))
    image.src = url
  })
}

function drawImageCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const sourceWidth = width / scale
  const sourceHeight = height / scale
  const sourceX = (image.naturalWidth - sourceWidth) / 2
  const sourceY = (image.naturalHeight - sourceHeight) / 2
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The memory card could not be rendered.')), 'image/png'))
}

export async function renderMemoryCard(input: {
  plan: MemoryPlan
  trip: TripRecord
  routes: RouteGeometry[]
  photos?: ArtifactPhoto[]
  distanceMiles: number
}): Promise<Blob> {
  const { plan, trip, routes, photos = [], distanceMiles } = input
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('The memory card could not be rendered.')

  context.fillStyle = '#fbfbf8'
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  context.fillStyle = '#5f625a'
  context.font = '500 24px Aptos, Segoe UI, sans-serif'
  context.fillText(formatDateRange(trip.start, trip.end), 82, 92)
  context.fillStyle = '#171815'
  context.font = '700 66px Aptos, Segoe UI, sans-serif'
  const titleBottom = drawWrappedText(context, plan.title, 82, 176, 916, 70, 2)
  context.fillStyle = '#5f625a'
  context.font = '400 30px Aptos, Segoe UI, sans-serif'
  drawWrappedText(context, plan.oneLineMemory, 82, titleBottom + 28, 916, 40, 2)

  drawRoute(context, routes, trip)

  const footerTop = 958
  if (photos.length) {
    const chosen = photos.slice(0, 3)
    const gap = 12
    const photoWidth = (916 - gap * (chosen.length - 1)) / chosen.length
    const loaded = await Promise.all(chosen.map((photo) => loadImage(photo.url).catch(() => undefined)))
    loaded.forEach((image, index) => {
      if (image) drawImageCover(context, image, 82 + index * (photoWidth + gap), footerTop, photoWidth, 205)
    })
  } else {
    context.fillStyle = '#171815'
    context.font = '650 26px Aptos, Segoe UI, sans-serif'
    context.fillText('Directed with GPT-5.6', 82, footerTop + 28)
    context.fillStyle = '#5f625a'
    context.font = '400 24px Aptos, Segoe UI, sans-serif'
    drawWrappedText(context, plan.chapters.slice(0, 4).map((chapter) => chapter.title).join('  /  '), 82, footerTop + 72, 916, 34, 3)
  }

  context.fillStyle = '#171815'
  context.font = '650 30px Aptos, Segoe UI, sans-serif'
  context.fillText(`${distanceMiles.toLocaleString()} mi`, 82, 1238)
  context.fillText(`${trip.evidence.nightsAway} nights`, 290, 1238)
  context.fillText(`${trip.destinations.length} places`, 500, 1238)
  context.fillStyle = '#5f625a'
  context.font = '500 22px Aptos, Segoe UI, sans-serif'
  context.textAlign = 'right'
  context.fillText('There I Was  |  dalmo.ai', 998, 1238)
  context.textAlign = 'left'
  context.fillStyle = '#146b4e'
  context.fillRect(82, 1298, 916, 8)
  return canvasBlob(canvas)
}

export function memoryCardFilename(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'trip'
  return `there-i-was-${slug}.png`
}
