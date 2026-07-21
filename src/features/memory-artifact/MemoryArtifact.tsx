import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { memoryCardFilename, renderMemoryCard } from '../../domain/memory-artifact'
import type { RouteGeometry } from '../../domain/route-reconstruction'
import type { MemoryPlan, TripRecord } from '../../domain/types'
import type { DisplayTripPhoto } from '../photos/TripPhotos'

interface MemoryArtifactProps {
  plan: MemoryPlan
  trip: TripRecord
  routes: RouteGeometry[]
  photos: DisplayTripPhoto[]
  distanceMiles: number
}

export function MemoryArtifact({ plan, trip, routes, photos, distanceMiles }: MemoryArtifactProps) {
  const [blob, setBlob] = useState<Blob>()
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [notice, setNotice] = useState<string>()

  useEffect(() => {
    let cancelled = false
    let nextUrl: string | undefined
    setBlob(undefined)
    void renderMemoryCard({ plan, trip, routes, photos, distanceMiles }).then((nextBlob) => {
      if (cancelled) return
      nextUrl = URL.createObjectURL(nextBlob)
      setBlob(nextBlob)
      setPreviewUrl(nextUrl)
    }).catch(() => setNotice('The memory card could not be prepared.'))
    return () => {
      cancelled = true
      if (nextUrl) URL.revokeObjectURL(nextUrl)
    }
  }, [distanceMiles, photos, plan, routes, trip])

  const file = blob ? new File([blob], memoryCardFilename(plan.title), { type: 'image/png' }) : undefined
  const canShare = Boolean(file && 'share' in navigator && 'canShare' in navigator && navigator.canShare({ files: [file] }))

  const download = () => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = memoryCardFilename(plan.title)
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Memory card saved.')
  }

  const share = async () => {
    if (!file || !canShare) return
    try {
      await navigator.share({ title: plan.title, text: plan.oneLineMemory, files: [file] })
      setNotice('Memory card shared.')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setNotice('Sharing was unavailable. You can save the card instead.')
    }
  }

  return (
    <section className="memory-artifact" aria-labelledby="memory-artifact-title">
      <div className="memory-artifact-copy">
        <h3 id="memory-artifact-title">Your memory card</h3>
        <p>The route, the GPT-5.6 direction, and your edits become one image you can keep.</p>
        <div className="memory-artifact-actions">
          <button className="button-primary" onClick={download} disabled={!blob}><Icon name="download" /> Save PNG</button>
          {canShare && <button className="button-secondary" onClick={() => void share()}><Icon name="share" /> Share</button>}
        </div>
        {notice && <p className="artifact-notice" role="status">{notice}</p>}
      </div>
      <figure className="memory-card-preview">
        {previewUrl ? <img src={previewUrl} alt={`Shareable memory card for ${plan.title}`} /> : <div role="status">Preparing card...</div>}
      </figure>
    </section>
  )
}
