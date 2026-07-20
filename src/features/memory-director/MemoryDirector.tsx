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
  time: string
  status: string
}

function formatDate(timestamp: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(timestamp))
}

export function MemoryDirector({ timeline, trip, active, onActivate }: MemoryDirectorProps) {
  const [plan, setPlan] = useState<MemoryPlan>()
  const [history, setHistory] = useState<MemoryPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string>()
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

  const persistPlan = async (next: MemoryPlan, keepPrevious = true) => {
    const previous = plan
    setPlan(next)
    if (keepPrevious && previous) setHistory((items) => [...items, previous].slice(-5))
    await saveMemoryPlan(trip.id, next, keepPrevious ? previous : undefined)
  }

  const regenerate = async (answers: ReflectionAnswer[] = []) => {
    onActivate()
    const liveDossier = buildMemoryDossier(timeline, trip, answers)
    const serialized = JSON.stringify(liveDossier)
    const started = new Date()
    setLoading(true)
    setNotice(undefined)
    setRequestRecords((records) => [{ time: started.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), status: 'Sending' }, ...records].slice(0, 5))
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 57_000)
    try {
      const response = await fetch('/.netlify/functions/direct-memory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: serialized,
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('Story request failed.')
      const payload = (await response.json()) as { plan: unknown; source?: string; notice?: string }
      await persistPlan(validateMemoryPlan(payload.plan))
      setNotice(payload.source === 'openai' ? 'Drafted with GPT-5.6.' : (payload.notice ?? 'A local draft was used.'))
      setRequestRecords((records) => records.map((record, index) => index === 0 ? { ...record, status: payload.source === 'openai' ? 'Complete' : 'Local draft' } : record))
    } catch {
      await persistPlan(createDeterministicMemoryPlan(liveDossier))
      setNotice('GPT-5.6 was unavailable, so the app made a local draft from the same trip summary.')
      setRequestRecords((records) => records.map((record, index) => index === 0 ? { ...record, status: 'Local draft' } : record))
    } finally {
      window.clearTimeout(timeout)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (active && !plan && !loading) void regenerate()
    // Activation intentionally starts one request. The request owns plan and loading updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const submitAnswer = async (questionId: string) => {
    if (!plan || !answer.trim()) return
    const question = plan.reflectionQuestions.find((item) => item.id === questionId)
    await persistPlan(applyReflectionAnswer(plan, questionId, answer))
    const submittedAnswer = answer
    setAnswer('')
    setAnsweringId(undefined)
    if (question) void regenerate([{ question: question.question, answer: submittedAnswer }])
  }

  const restorePrevious = async () => {
    const previous = history.at(-1)
    if (!previous) return
    setHistory((items) => items.slice(0, -1))
    setPlan(previous)
    await saveMemoryPlan(trip.id, previous)
  }

  if (!active) {
    return (
      <section className="story-entry">
        <div><h2>Story</h2><p>GPT-5.6 can draft chapters from the named places, dates, and movement in this trip.</p></div>
        <button className="button-primary" onClick={() => void regenerate()}><Icon name="spark" /> Create story</button>
      </section>
    )
  }

  return (
    <section className="memory-director" aria-busy={loading}>
      <header className="story-header">
        <h2>Story</h2>
        <div>
          {history.length > 0 && <button className="button-text" onClick={() => void restorePrevious()}>Undo last draft</button>}
          <button className="button-secondary" onClick={() => void regenerate()} disabled={loading}>{loading ? 'Drafting…' : 'Draft again'}</button>
        </div>
      </header>

      {loading && !plan && <p className="story-loading" role="status">Reading the named stops and movement…</p>}
      {notice && <p className="story-notice" role="status">{notice}</p>}

      {plan && (
        <>
          <label className="story-title-field">
            <span>Title</span>
            <input value={plan.title} onChange={(event) => setPlan({ ...plan, title: event.target.value })} onBlur={() => void saveMemoryPlan(trip.id, plan)} />
          </label>
          <label className="story-summary-field">
            <span>Your summary</span>
            <textarea rows={2} value={plan.oneLineMemory} onChange={(event) => setPlan({ ...plan, oneLineMemory: event.target.value })} onBlur={() => void saveMemoryPlan(trip.id, plan)} />
          </label>

          <div className="story-chapters">
            {plan.chapters.map((chapter, index) => (
              <article key={`${chapter.start}-${index}`}>
                <span>{formatDate(chapter.start)} - {formatDate(chapter.end)}</span>
                <input aria-label={`Chapter ${index + 1} title`} value={chapter.title} onChange={(event) => setPlan({ ...plan, chapters: plan.chapters.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) })} onBlur={() => void saveMemoryPlan(trip.id, plan)} />
                <textarea aria-label={`Chapter ${index + 1} summary`} rows={2} value={chapter.summary} onChange={(event) => setPlan({ ...plan, chapters: plan.chapters.map((item, itemIndex) => itemIndex === index ? { ...item, summary: event.target.value } : item) })} onBlur={() => void saveMemoryPlan(trip.id, plan)} />
              </article>
            ))}
          </div>

          {plan.reflectionQuestions.length > 0 && (
            <section className="story-prompts">
              <h3>Add what the map missed</h3>
              {plan.reflectionQuestions.slice(0, 3).map((question) => (
                <div key={question.id}>
                  <p>{question.question}</p>
                  {answeringId === question.id ? (
                    <div className="story-answer">
                      <textarea autoFocus rows={3} value={answer} onChange={(event) => setAnswer(event.target.value)} />
                      <button className="button-primary" onClick={() => void submitAnswer(question.id)} disabled={!answer.trim()}>Add memory</button>
                    </div>
                  ) : <button className="button-text" onClick={() => setAnsweringId(question.id)}>Answer</button>}
                </div>
              ))}
            </section>
          )}

          <details className="story-sources">
            <summary>Sources and limits</summary>
            <p>{dossier.destinations.length} named places, {dossier.legs.length} movements, {dossier.days.length} days, and no raw path points were sent to GPT-5.6.</p>
            {plan.uncertaintyNotes.length > 0 && <ul>{plan.uncertaintyNotes.map((note) => <li key={note}>{note}</li>)}</ul>}
            {requestRecords.map((record, index) => <small key={`${record.time}-${index}`}>{record.time} · {record.status}</small>)}
          </details>
        </>
      )}
    </section>
  )
}
