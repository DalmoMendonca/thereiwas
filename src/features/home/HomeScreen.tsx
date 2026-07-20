import { useRef } from 'react'
import { useAppStore } from '../../app/store'
import { BrandMark } from '../../components/BrandMark'
import { Icon } from '../../components/Icon'

export function HomeScreen() {
  const importText = useAppStore((state) => state.importText)
  const timeline = useAppStore((state) => state.timeline)
  const showTrips = useAppStore((state) => state.showTrips)
  const fileInput = useRef<HTMLInputElement>(null)

  const onFile = async (file?: File) => {
    if (!file) return
    await importText(await file.text(), file.name)
  }

  return (
    <main className="landing">
      <header className="landing-header"><BrandMark /></header>

      <section className="landing-main" aria-labelledby="landing-title">
        <h1 id="landing-title">There I Was</h1>
        <p>Import your Google Timeline to find and replay your trips.</p>
        <button className="button-primary landing-import" onClick={() => fileInput.current?.click()}>
          <Icon name="upload" /> Import Timeline JSON
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        {timeline && <button className="button-text landing-return" onClick={showTrips}>Open imported trips</button>}
      </section>

      <footer className="signature-footer">Build with <span aria-label="love">❤️</span> | <a href="https://dalmo.ai">dalmo.ai</a></footer>
    </main>
  )
}
