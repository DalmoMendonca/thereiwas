# Architecture

## Boundaries

There I Was is a static React/Vite application with one server-side Netlify Function. Domain algorithms are pure TypeScript and do not live in React components.

```text
Browser
  Timeline file
    -> Web Worker parser
    -> normalized evidence
    -> home and trip inference
    -> route selection
    -> playback timeline
    -> IndexedDB

  selected trip only
    -> coordinate-free Memory Dossier
    -> POST /.netlify/functions/direct-memory

Netlify Function
  origin, type, size, rate, and Zod validation
    -> OpenAI Responses API (store: false)
    -> Zod Memory Plan validation
    -> sanitized result or deterministic fallback
```

## Import pipeline

The worker receives text and a source name. It parses a top-level array, validates supported records independently, preserves source indexes, normalizes numeric strings and `geo:` coordinates, reconstructs path timestamps from minute offsets, removes consecutive duplicate points, attaches observed paths to overlapping movement legs, and globally sorts normalized evidence. Unsupported records are quarantined rather than failing the import.

Stages emitted to the UI are Reading, Parsing, Normalizing, Reconstructing paths, Detecting home, Detecting trips, Preparing routes, and Saving.

## Trip inference

Home uses an explicit `semanticType: Home` when available. The fallback scores clustered overnight visits by recurrence, duration, and date span.

Away visits at least 40 km from home are grouped by their furthest covered timestamp so nested visits cannot split an episode. A candidate needs a sustained stay, flight, or Timeline Memory. Boundaries expand to a home-region departure and return. A long, unreturned dominant cluster triggers the practical relocation guard. Every candidate exposes distance, nights, destinations, modes, Memory support, coverage, and plain-language reasons.

User-created and edited boundaries are locked. Recomputing included evidence may change derived statistics, never the dates themselves.

## Route reconstruction

Each route retains provenance:

- `observed`: Timeline source path
- `enhanced`: Mapbox Directions for sparse driving, walking, or cycling only
- `great-circle`: flights
- `fallback`: explicit inferred curve/line for unsupported or unavailable modes

Unsupported modes are never silently routed as driving. A deterministic versioned fingerprint keys IndexedDB route cache. Provider errors degrade to local geometry. Returned vertices are timestamped by cumulative distance rather than vertex index.

## Playback

The playback timeline stores coordinate arrays, timestamps, cumulative distances, route boundaries, and UTC offsets. Binary search finds the active interval. A single `requestAnimationFrame` clock directly updates SVG dash offset, marker transform, camera transform, slider, clock, distance, mode, and nearest place; the React tree does not rerender per frame.

The 30-second mode maps wall time through cinematic keyframes. Flights, major ground movement, overnight pauses, arrivals, and the final reveal receive deliberate weight rather than inheriting raw trip duration. Reduced-motion mode removes camera choreography while keeping state changes and controls.

## Memory Director

`buildMemoryDossier` creates a coordinate-free selected-trip summary. The function accepts at most 48 KB, validates it with Zod, restricts origins, rate limits by client IP, and calls `openai.responses.parse` with a Zod `text.format`. `store: false` is set.

The returned plan is validated again. Highlights and captions require grounding IDs and certainty. Provider failure returns a deterministic grounded plan; the sample ships with a separately validated cached plan.

## Persistence

IndexedDB stores one current normalized session, trip records, dismissed candidates, last view, up to five prior Memory Plan versions per trip, and route cache entries. **Delete my local data** clears every store. No Timeline content is persisted on the server.

## Failure behavior

- Invalid JSON: human-readable import error
- Partially malformed Timeline: valid records continue; warnings are reported
- No home evidence: automatic and manual inference pauses honestly
- Sparse route: explicit inferred geometry
- Provider failure: no mode substitution; visible fallback
- OpenAI timeout/refusal/schema failure: cached or deterministic grounded plan
- Stale route cache shape: versioned fingerprint and defensive offset defaults

