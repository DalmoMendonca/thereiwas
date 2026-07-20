import { useRef } from 'react'
import { Icon } from '../../components/Icon'
import type { TripPhoto } from '../../domain/types'

export type DisplayTripPhoto = TripPhoto & { url: string }

interface TripPhotosProps {
  photos: DisplayTripPhoto[]
  selectedPhotoId?: string
  notice?: string
  onAdd: (files: FileList) => void
  onSelect: (photoId: string) => void
  onRemove: (photoId: string) => void
}

function formatPhotoDate(timestamp: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp))
}

export function TripPhotos({ photos, selectedPhotoId, notice, onAdd, onSelect, onRemove }: TripPhotosProps) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <section className={`trip-photos${photos.length ? ' has-photos' : ''}`} aria-labelledby="trip-photos-title">
      <header>
        <div>
          <h2 id="trip-photos-title">Photos</h2>
          {photos.length > 0 && <span>{photos.length} geotagged</span>}
        </div>
        <button className={photos.length ? 'button-secondary' : 'button-text'} onClick={() => input.current?.click()}>
          <Icon name="photo" /> {photos.length ? 'Add more' : 'Add photos'}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif,image/tiff,image/webp,image/avif,.jpg,.jpeg,.png,.heic,.heif,.tif,.tiff,.webp,.avif"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files?.length) onAdd(event.target.files)
            event.target.value = ''
          }}
        />
      </header>
      {notice && <p className="photo-notice" role="status">{notice}</p>}
      {photos.length > 0 && (
        <div className="photo-strip" aria-label="Trip photos">
          {photos.map((photo) => (
            <div className={`photo-thumb${photo.id === selectedPhotoId ? ' is-active' : ''}`} key={photo.id}>
              <button onClick={() => onSelect(photo.id)} aria-label={`Show ${photo.name}, ${formatPhotoDate(photo.capturedAt)}`}>
                <img src={photo.url} alt="" />
                <span>{formatPhotoDate(photo.capturedAt)}</span>
              </button>
              <button className="photo-remove" onClick={() => onRemove(photo.id)} aria-label={`Remove ${photo.name}`}><Icon name="close" /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
