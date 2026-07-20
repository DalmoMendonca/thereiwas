import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { applyReflectionAnswer, buildMemoryDossier, createDeterministicMemoryPlan, validateMemoryPlan } from '../../domain/memory-director'
import type { MemoryPlan, NormalizedTimeline, ReflectionAnswer, TripRecord } from '../../domain/types'
import { loadMemoryPlan, saveMemoryPlan } from '../../storage/database'

interface MemoryDirectorProps {
  timeline: NormalizedTimeline
  trip: TripRecord
  active: boolean
  onActivate: () => void
}

interface RequestRecord {
  provider: string
  purpose: string
  size: string
  time: string
  status: string
}

function modelLabel(model?: string | null) {
  if (!model) return 'GPT-5.6'
  return model.replace(/^gpt-/i, 'GPT-')
}

function formatDate(timestamp: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(timestamp))
}

export function MemoryDirector({ timeline, trip, active, onActivate }: MemoryDirectorProps) {
  const [plan, setPlan] = useState<MemoryPlan>()
  const [history, setHistory] = useState<MemoryPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string>()
  const [expandedMoment, setExpandedMoment] = useState<number>()
  const [showDossier, setShowDossier] = useState(false)
  const [answeringId, setAnsweringId] = useState<string>()
  const [answer, setAnswer] = useState('')
  const [requestRecords, setRequestRecords] = useState<RequestRecord[]>([])
  const dossier = useMemo(() => buildMemoryDossier(timeline, trip), [timeline, trip])

  useEffect(() => {
    let cancelled = false
    void loadMemoryPlan(trip.id).then((stored) => {
      if (!cancelled && stored) {
        setPlan(stored.current)
        setHistory(stored.history)
      }
    })
    return () => { cancelled = true }
  }, [trip.id])

  const ensurePlan = async () => {
    onActivate()
    if (plan) return
    setLoading(true)
    try {
      let next: MemoryPlan
      if (trip.source === 'detected' && timeline.sourceName === 'Generated sample journey') {
        const response = await fetch('/sample/sample-memory-plan.json')
        next = validateMemoryPlan(await response.json())
      } else next = createDeterministicMemoryPlan(dossier)
      setPlan(next)
      await saveMemoryPlan(trip.id, next)
    } catch {
      const next = createDeterministicMemoryPlan(dossier)
      setPlan(next)
      await saveMemoryPlan(trip.id, next)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (active && !plan && !loading) void ensurePlan()
    // Activation is the intentional one-shot trigger; plan/loading updates are handled inside ensurePlan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const persistPlan = async (next: MemoryPlan, keepPrevious = true) => {
    const previous = plan
    setPlan(next)
    if (keepPrevious && previous) setHistory((items) => [...items, previous].slice(-5))
    await saveMemoryPlan(trip.id, next, keepPrevious ? previous : undefined)
  }

  const regenerate = async (answers: ReflectionAnswer[] = []) => {
    const liveDossier = buildMemoryDossier(timeline, trip, answers)
    const serialized = JSON.stringify(liveDossier)
    const started = new Date()
    setLoading(true)
    setNotice(undefined)
    const request: RequestRecord = {
      provider: 'OpenAI',
      purpose: 'Memory Director narrative structure',
      size: `${new Blob([serialized]).size.toLocaleString()} bytes · 0 raw path points`,
      time: started.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      status: 'Sending',
    }
    setRequestRecords((records) => [request, ...records].slice(0, 5))
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 32_000)
    try {
      const response = await fetch('/.netlify/functions/direct-memory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: serialized,
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('The live Memory Director did not return a usable plan.')
      const payload = (await response.json()) as { plan: unknown; source?: string; model?: string | null; notice?: string }
      const next = validateMemoryPlan(payload.plan)
      await persistPlan(next)
      setNotice(payload.notice ?? (payload.source === 'openai' ? `Directed live with ${modelLabel(payload.model)}.` : 'A grounded deterministic structure was used.'))
      setRequestRecords((records) => records.map((record, index) => index === 0 ? { ...record, status: payload.source === 'openai' ? 'Complete' : 'Fallback used' } : record))
    } catch {
      const fallback = createDeterministicMemoryPlan(liveDossier)
      await persistPlan(fallback)
      setNotice('The live call was unavailable. Your journey remains fully usable with its grounded fallback.')
      setRequestRecords((records) => records.map((record, index) => index === 0 ? { ...record, status: 'Local fallback' } : record))
    } finally {
      window.clearTimeout(timeout)
      setLoading(false)
    }
  }

  const submitAnswer = async (questionId: string) => {
    if (!plan || !answer.trim()) return
    const question = plan.reflectionQuestions.find((item) => item.id === questionId)
    const updated = applyReflectionAnswer(plan, questionId, answer)
    await persistPlan(updated)
    setAnswer('')
    setAnsweringId(undefined)
    setNotice('Your words are now part of the story, labeled as user-supplied.')
    if (question) void regenerate([{ question: question.question, answer }])
  }

  const restorePrevious = async () => {
    const previous = history.at(-1)
    if (!previous) return
    setHistory((items) => items.slice(0, -1))
    await persistPlan(previous, false)
    setNotice('Previous version restored.')
  }

  if (!active) {
    return (
      <section className="director-callout">
        <div className="director-mark"><Icon name="spark" /></div>
        <div>
          <h2>Give the route a narrative shape</h2>
          <p>GPT-5.6 can organize the evidence into chapters, highlights, and questions—without deciding what the trip meant.</p>
        </div>
        <button className="button-primary" onClick={() => void ensurePlan()}>
          <Icon name="spark" /> Direct my memory
        </button>
      </section>
    )
  }

  return (
    <section className="memory-director" aria-busy={loading}>
      <header className="director-header">
        <div>
          <span className="section-label"><Icon name="spark" /> Memory Director</span>
          <h2>{plan?.title ?? 'Finding the story in the route…'}</h2>
        </div>
        <div className="director-actions">
          {history.length > 0 && <button className="button-text" onClick={() => void restorePrevious()}>Restore previous</button>}
          <button className="button-secondary" onClick={() => void regenerate()} disabled={loading}>
            <Icon name="spark" /> {loading ? 'Directing…' : 'Regenerate with GPT-5.6'}
          </button>
        </div>
      </header>

      {loading && <div className="director-progress" role="status"><span /> Reading the evidence, not inventing around it…</div>}
      {notice && <p className="director-notice" role="status">{notice}</p>}

      {plan && (
        <>
          <label className="editable-memory-title">
            <span>One-line memory</span>
            <textarea
              value={plan.oneLineMemory}
              rows={2}
              onChange={(event) => setPlan({ ...plan, oneLineMemory: event.target.value })}
              onBlur={() => void saveMemoryPlan(trip.id, plan)}
            />
          </label>

          <div className="chapter-thread" aria-label="Narrative chapters">
            {plan.chapters.map((chapter, index) => (
              <article key={`${chapter.start}-${index}`} className="chapter">
                <div className="chapter-time">{formatDate(chapter.start)}<span />{formatDate(chapter.end)}</div>
                <label>
                  <span className="sr-only">Chapter title</span>
                  <input
                    value={chapter.title}
                    onChange={(event) => setPlan({ ...plan, chapters: plan.chapters.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) })}
                    onBlur={() => void saveMemoryPlan(trip.id, plan)}
                  />
                </label>
                <label>
                  <span className="sr-only">Chapter summary</span>
                  <textarea
                    value={chapter.summary}
                    rows={2}
                    onChange={(event) => setPlan({ ...plan, chapters: plan.chapters.map((item, itemIndex) => itemIndex === index ? { ...item, summary: event.target.value } : item) })}
                    onBlur={() => void saveMemoryPlan(trip.id, plan)}
                  />
                </label>
              </article>
            ))}
          </div>

          <div className="director-grid">
            <div className="highlights-panel">
              <h3>Why these moments</h3>
              {plan.highlights.map((highlight, index) => (
                <article className="highlight-row" key={`${highlight.timestamp}-${index}`}>
                  <button className="highlight-main" onClick={() => setExpandedMoment(expandedMoment === index ? undefined : index)} aria-expanded={expandedMoment === index}>
                    <span className={`certainty certainty-${highlight.certainty}`}>{highlight.certainty}</span>
                    <strong>{highlight.title}</strong>
                    <span>{highlight.description}</span>
                    <small>{formatDate(highlight.timestamp)} · Why this moment?</small>
                  </button>
                  {expandedMoment === index && (
                    <div className="grounding-detail">
                      <Icon name="route" /> Grounded to {highlight.groundingIds.join(', ')}. This text may be edited; the evidence reference remains visible.
                    </div>
                  )}
                </article>
              ))}
            </div>

            <div className="reflection-panel">
              <h3>Only you can answer</h3>
              <p>Telemetry can trace a route. It cannot recover what made it yours.</p>
              {plan.reflectionQuestions.map((question) => (
                <article className="reflection-question" key={question.id}>
                  <strong>{question.question}</strong>
                  <small>{question.reason}</small>
                  {answeringId === question.id ? (
                    <div className="reflection-answer">
                      <textarea autoFocus rows={3} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Write what you remember…" />
                      <div><button className="button-text" onClick={() => setAnsweringId(undefined)}>Cancel</button><button className="button-primary button-small" onClick={() => void submitAnswer(question.id)} disabled={!answer.trim()}>Add to story</button></div>
                    </div>
                  ) : (
                    <button className="button-text answer-link" onClick={() => setAnsweringId(question.id)}>Answer this</button>
                  )}
                </article>
              ))}
            </div>
          </div>

          <div className="uncertainty-panel">
            <h3>What the data cannot confirm</h3>
            <ul>{plan.uncertaintyNotes.map((note) => <li key={note}>{note}</li>)}</ul>
          </div>
        </>
      )}

      <div className="privacy-inspector">
        <button className="inspector-toggle" onClick={() => setShowDossier(!showDossier)} aria-expanded={showDossier}>
          <span><Icon name="lock" /> What was sent?</span><Icon name="chevron" />
        </button>
        {showDossier && (
          <div className="inspector-body">
            <p>A compact dossier for this trip only: {dossier.destinations.length} destinations, {dossier.legs.length} summarized legs, {dossier.days.length} day summaries, and <strong>zero raw path points</strong>. Home is represented only by its role.</p>
            <dl>
              <div><dt>Trip range</dt><dd>{formatDate(dossier.trip.start)}–{formatDate(dossier.trip.end)}</dd></div>
              <div><dt>Payload preview</dt><dd>{new Blob([JSON.stringify(dossier)]).size.toLocaleString()} bytes</dd></div>
              <div><dt>Raw Timeline</dt><dd>Never sent</dd></div>
            </dl>
            {requestRecords.length > 0 && (
              <div className="request-log">
                <h4>Recent requests</h4>
                {requestRecords.map((record, index) => (
                  <div key={`${record.time}-${index}`}><span>{record.provider}</span><span>{record.purpose}</span><span>{record.size}</span><span>{record.time}</span><strong>{record.status}</strong></div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
