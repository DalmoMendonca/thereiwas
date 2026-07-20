import { useRef } from 'react'
import { BrandMark } from '../../components/BrandMark'
import { Icon } from '../../components/Icon'
import { useAppStore } from '../../app/store'

function JourneyHeroMap() {
  return (
    <div className="hero-map" aria-label="Preview of a journey route from Atlanta to Iceland">
      <svg viewBox="0 0 760 520" role="img">
        <path className="hero-continent hero-continent-left" d="M-20 70C82 23 186 29 252 93c42 40 63 102 45 163-15 52-65 63-78 119-15 66 10 112-50 166H-20Z" />
        <path className="hero-continent hero-continent-right" d="M527-10c53 50 42 112 83 158 35 40 93 44 170 26V-10ZM612 262c47-24 104-26 168-2v280H552c-2-56 10-112 38-151 33-45-9-92 22-127Z" />
        <path className="hero-island" d="m480 125 24-9 23 13-5 19-28 8-20-14Z" />
        <path className="hero-route-base" d="M188 351C256 216 359 138 499 136c-54 34-83 75-89 125 27 15 57 25 89 30" pathLength="1" />
        <path className="hero-route-animated" d="M188 351C256 216 359 138 499 136c-54 34-83 75-89 125 27 15 57 25 89 30" pathLength="1" />
        <circle className="hero-origin" cx="188" cy="351" r="6" />
        <circle className="hero-marker" cx="499" cy="291" r="7" />
        <g className="hero-map-label" transform="translate(172 382)"><text>Home</text><text y="18">Jul 3 · 6:40 AM</text></g>
        <g className="hero-map-label hero-map-label-end" transform="translate(521 298)"><text>Jökulsárlón</text><text y="18">1,141 km into the trip</text></g>
      </svg>
      <div className="hero-map-caption">
        <span>One week, reconstructed</span>
        <strong>Atlanta → Iceland</strong>
        <small>Flights · long drives · walks · 7 nights</small>
      </div>
    </div>
  )
}

export function HomeScreen() {
  const loadSample = useAppStore((state) => state.loadSample)
  const importText = useAppStore((state) => state.importText)
  const timeline = useAppStore((state) => state.timeline)
  const showTrips = useAppStore((state) => state.showTrips)
  const fileInput = useRef<HTMLInputElement>(null)

  const onFile = async (file?: File) => {
    if (!file) return
    if (file.size > 300 * 1024 * 1024) throw new Error('Choose a Timeline JSON export smaller than 300 MB for this release.')
    await importText(await file.text(), file.name)
  }

  return (
    <main className="home-screen">
      <nav className="home-nav">
        <BrandMark />
        <div>
          <a href="#how-it-works">How it works</a>
          <a href="#privacy">Privacy</a>
          {timeline && <button className="button-text" onClick={showTrips}>Open my journeys <Icon name="arrow" /></button>}
        </div>
      </nav>

      <section className="home-hero">
        <div className="hero-copy">
          <p className="hero-intro">Your Timeline kept the route. You kept the meaning.</p>
          <h1>Turn your location history into the stories of your life.</h1>
          <p className="hero-description">There I Was finds the journeys hiding in a Google Timeline export, rebuilds how you moved, and helps you remember what the data never could.</p>
          <div className="hero-actions">
            <button className="button-primary button-large" onClick={() => void loadSample()}>
              <Icon name="play" /> Try a sample journey
            </button>
            <button className="button-secondary button-large" onClick={() => fileInput.current?.click()}>
              <Icon name="upload" /> Import Timeline JSON
            </button>
            <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(event) => void onFile(event.target.files?.[0])} />
          </div>
          <p className="hero-privacy"><Icon name="lock" /> Your raw Timeline stays in this browser.</p>
        </div>
        <JourneyHeroMap />
      </section>

      <section id="how-it-works" className="home-explanation">
        <div className="explanation-lead">
          <h2>Google saved a log.<br />This makes it a memory.</h2>
          <p>Not by guessing. By separating what the record proves, what the model can structure, and what only you can know.</p>
        </div>
        <ol className="evidence-sequence">
          <li><span>Timeline evidence</span><strong>Visits, movement, paths, and time zones are normalized locally.</strong></li>
          <li><span>Explainable reconstruction</span><strong>Trips and routes include their source, confidence, and gaps.</strong></li>
          <li><span>Human memory</span><strong>GPT-5.6 finds narrative shape; your answers restore meaning.</strong></li>
        </ol>
      </section>

      <section id="privacy" className="privacy-statement">
        <div><Icon name="lock" /><span>Local by default</span></div>
        <p>Your Timeline is processed locally. Only selected route coordinates and a compact trip summary leave your browser when you use enhanced routing or the Memory Director.</p>
      </section>

      <footer className="home-footer"><BrandMark /><span>Built for OpenAI Build Week · 2026</span></footer>
    </main>
  )
}

