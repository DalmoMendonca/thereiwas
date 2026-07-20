import { useRef, useState } from 'react'
import { useAppStore } from '../../app/store'
import { Icon } from '../../components/Icon'

export function HomeScreen() {
  const importText = useAppStore((state) => state.importText)
  const timeline = useAppStore((state) => state.timeline)
  const showTrips = useAppStore((state) => state.showTrips)
  const fileInput = useRef<HTMLInputElement>(null)
  const [sampleLoading, setSampleLoading] = useState(false)

  const onFile = async (file?: File) => {
    if (!file) return
    await importText(await file.text(), file.name)
  }

  const importSample = async () => {
    setSampleLoading(true)
    try {
      const response = await fetch('/sample/sample-timeline.json')
      if (!response.ok) throw new Error('Sample data could not be loaded.')
      await importText(await response.text(), 'There I Was sample.json')
    } finally {
      setSampleLoading(false)
    }
  }

  return (
    <main className="landing">
      <section className="landing-main" aria-labelledby="landing-title">
        <h1 id="landing-title">There I Was</h1>
        <p>Import your Google Timeline to find and replay your trips.</p>
        <div className="landing-actions">
          <button className="button-primary landing-import" onClick={() => fileInput.current?.click()}>
            <Icon name="upload" /> Import Timeline JSON
          </button>
          <button className="button-secondary" onClick={() => void importSample()} disabled={sampleLoading}>
            {sampleLoading ? 'Loading\u2026' : 'Try with Sample Data'}
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        <p className="export-instructions">Google Maps app &gt; Settings &gt; Location &amp; privacy &gt; Export Timeline data</p>
        {timeline && <button className="button-text landing-return" onClick={showTrips}>Open imported trips</button>}
      </section>

      <footer className="signature-footer">Build with <span aria-label="love">{'\u2764\uFE0F'}</span> | <a href="https://dalmo.ai">dalmo.ai</a></footer>
    </main>
  )
}
