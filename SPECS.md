# THERE I WAS
## Authoritative Codex Build Instructions for OpenAI Build Week

> **Product reset, July 20, 2026:** Direct user testing supersedes every contradictory requirement below. There is no sample journey or fake data in the product. The landing page is a no-scroll screen with one `Import Timeline JSON` action and the `Build with ❤️ | dalmo.ai` footer. Trip rows use real geographic titles, chronological significant-city trails, and numeric dates. The trip page centers a tightly fitted full-route replay with persistent route geometry, miles in a small side rail, no finale overlay, and no point-by-point journey thread. GPT-5.6 receives resolved city, region, country, date, mode, and summarized-leg evidence; it must never produce “Unnamed stop.” Submission copy and the demo video remain unchanged until the user approves the reset.

**Repository:** `thereiwas`  
**GitHub target:** `DalmoMendonca/thereiwas`  
**Visibility:** Public  
**Production host:** Netlify  
**Production domain:** `https://thereiwas.dalmo.ai`  
**Category:** Apps for Your Life  
**Deadline:** Tuesday, July 21, 2026 at 5:00 PM Pacific / 7:00 PM Central  
**Product tagline:** **Turn your location history into the stories of your life.**

---

# 0. Governing Instruction

Build **There I Was** from scratch.

The existing repository `DalmoMendonca/places` is only a source of product inspiration and lessons learned. Do not copy its source files, components, functions, styles, assets, architecture, or Git history. You may inspect it to understand useful behaviors such as smooth timeline playback, worker-based parsing, route animation, media metadata handling, and mobile controls, but implement every part of There I Was independently in a new repository.

This document is the authoritative build contract. It overrides broader or older WORLDLINE instructions whenever they conflict.

The objective is not to implement the largest possible product. The objective is to ship a technically deep, visually complete, emotionally resonant consumer application with a flawless three-minute judge experience.

---

# 1. Product Thesis

Google Timeline records where people went but does little to turn those records into memories.

**There I Was** transforms a Google Timeline JSON export into:

1. automatically detected vacations and trips
2. editable trip records
3. geographically plausible reconstructed routes
4. cinematic animated replays
5. grounded narrative structure created with GPT-5.6
6. reflective prompts that let the human restore meaning missing from telemetry

The governing product principle is:

> **The data supplies evidence. GPT-5.6 supplies narrative structure. The human remains the authority over memory.**

This is not another travel tracker. It reconstructs journeys the user already lived.

---

# 2. Input Contract

## 2.1 Only required input

The **only required user input** is a Google Timeline JSON export.

The application must deliver its complete core value from that JSON alone:

- import
- normalization
- trip detection
- manual trip creation
- place and stop extraction
- route reconstruction
- animated replay
- trip statistics
- GPT-5.6 Memory Director
- editing
- persistence

A user must never encounter a message implying that photos are needed for the application to be useful.

## 2.2 Optional peripheral input

Photos and videos are optional enhancements only.

They may be implemented after every core acceptance test passes. When present, media can enrich:

- trip covers
- stop cards
- replay moments
- captions
- story scenes

Media must not be required for:

- judge sample mode
- trip detection
- trip creation
- route animation
- Memory Director
- story generation
- persistence
- submission readiness

If optional media support threatens the core timeline-only experience, cut media support.

---

# 3. The Judge Golden Path

The deployed application must support this exact journey with no account, API key, private file, or setup:

1. Open `https://thereiwas.dalmo.ai`.
2. Click **Try a sample journey**.
3. See trips automatically detected in under five seconds.
4. Open the featured trip.
5. Read a short explanation of why the app detected it.
6. Press Play.
7. Watch an animated route with:
   - progressive path drawing
   - a moving marker
   - local date and time
   - live distance
   - current travel mode
   - significant stops
   - smooth camera movement
8. Click **Direct my memory**.
9. See GPT-5.6 produce:
   - a title
   - a one-line memory
   - narrative chapters
   - highlight moments
   - concise captions
   - uncertainty notes
   - reflective questions
10. Answer one reflective question.
11. See the story update without fabricating unsupported events.
12. Create a second trip by choosing any start date and end date.
13. Rename or adjust the trip.
14. Reload the page.
15. Confirm the user-created trip persists.

This golden path is the release gate. Do not work on deferred features while any step fails.

---

# 4. Competition Priorities

Optimize equally for:

1. **Technological Implementation**
2. **Design**
3. **Potential Impact**
4. **Quality of the Idea**

Technological Implementation is the first tie-breaker, so the finished implementation must visibly demonstrate genuine depth:

- real-world schema reverse engineering
- worker-based parsing
- explainable trip inference
- route reconstruction
- deterministic animation
- local persistence
- structured GPT-5.6 output
- privacy-conscious data minimization
- meaningful automated tests

Depth must exist inside the golden path, not in unused infrastructure.

---

# 5. Repository Creation and Git Discipline

## 5.1 New project

Create a new folder:

```bash
mkdir thereiwas
cd thereiwas
```

Initialize a completely new Git history:

```bash
git init -b main
```

Do not fork, clone, copy, or preserve history from `places`.

## 5.2 Repository contents before first push

Before creating the GitHub repository, create at minimum:

- application scaffold
- `.gitignore`
- `.env.example`
- `LICENSE`
- `README.md`
- `docs/product-scope.md`
- `docs/architecture.md`
- `docs/codex-collaboration.md`
- `docs/build-log.md`
- `docs/privacy.md`
- `docs/demo-script.md`
- initial generated sample fixture
- first passing test

Make the first intentional commit:

```bash
git add .
git commit -m "Initialize There I Was competition build"
```

## 5.3 Create the public GitHub repository

Verify authentication:

```bash
gh auth status
```

Create and push the new public repository:

```bash
gh repo create DalmoMendonca/thereiwas \
  --public \
  --source=. \
  --remote=origin \
  --push \
  --description "Turn your Google Timeline into cinematic, editable stories of your life."
```

If the repository already exists, do not overwrite or delete it. Inspect it, verify ownership, and connect the local repository only if it is clearly the intended empty/new repository.

## 5.4 Commit expectations

Commit after every verified milestone, not after every tiny edit.

Required milestone commits:

1. foundation and sample loader
2. Timeline importer
3. normalized journey model
4. automatic trip detection
5. manual trip records
6. route reconstruction
7. cinematic playback
8. GPT-5.6 Memory Director
9. production design polish
10. tests and documentation
11. Netlify production deployment
12. submission-ready release

Use descriptive commit messages.

Push every verified milestone to `origin/main`.

Never leave completed work only in the local checkout.

## 5.5 Git safety

Never commit:

- the user's real `location-history.json`
- raw private coordinates
- photos or videos from the user
- `.env`
- `OPENAI_API_KEY`
- unrestricted Mapbox secret tokens
- Netlify auth tokens
- generated local databases containing private history
- provider response logs containing private coordinates

Before every production push, run a secret scan and inspect staged files.

---

# 6. Deployment and Production Domain

Deployment is part of the build, not a postscript.

## 6.1 Netlify project

Use Netlify CLI without requiring a global installation:

```bash
npx netlify status
```

Authenticate if necessary:

```bash
npx netlify login
```

Create or connect a Netlify site linked to the public GitHub repository.

Preferred site name:

```text
thereiwas
```

If unavailable, use a clear fallback such as:

```text
thereiwas-dalmo
```

The temporary `.netlify.app` site name does not change the required production domain.

## 6.2 Build configuration

Use `netlify.toml`:

```toml
[build]
  command = "pnpm build"
  publish = "dist"
  functions = "netlify/functions"

[dev]
  command = "pnpm dev"
  targetPort = 5173
  port = 8888

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Adjust only if the selected framework genuinely requires different settings.

## 6.3 Deployment sequence

1. Run all tests.
2. Run a local production build.
3. Create a Netlify preview deploy.
4. Test the preview in a private browser.
5. Deploy to production.
6. Link continuous deployment to `DalmoMendonca/thereiwas`.
7. Add `thereiwas.dalmo.ai` as the production custom domain.
8. Verify HTTPS.
9. Verify the golden path on the custom domain.
10. Update the GitHub repository homepage URL to `https://thereiwas.dalmo.ai`.

Suggested commands:

```bash
pnpm install
pnpm test
pnpm build
npx netlify deploy
npx netlify deploy --prod
```

## 6.4 Custom subdomain

The final production URL is:

```text
https://thereiwas.dalmo.ai
```

Add the custom domain to the Netlify site before changing DNS.

If `dalmo.ai` uses an external DNS provider, create a CNAME:

```text
Host: thereiwas
Target: <the-created-netlify-site>.netlify.app
```

Use the exact target shown by Netlify for the created site.

If Netlify DNS already manages `dalmo.ai`, add the subdomain through Netlify Domain Management.

Do not claim the custom domain is complete until all of these pass:

```bash
dig thereiwas.dalmo.ai
curl -I https://thereiwas.dalmo.ai
```

Acceptance:

- DNS resolves
- HTTPS certificate is valid
- HTTP redirects to HTTPS
- production page returns success
- the sample journey works on the custom domain

If Codex lacks access to the DNS provider, complete every other step, add the custom domain in Netlify, and report the exact CNAME target as the sole external blocker. Do not silently settle for the `.netlify.app` URL.

---

# 7. Recommended Technical Stack

Use a focused, reliable stack:

- Node.js 24 LTS
- pnpm
- TypeScript with strict mode
- React
- Vite
- Mapbox GL JS
- Zod
- `@js-temporal/polyfill`
- IndexedDB through a small maintained wrapper
- Web Workers
- Zustand or an equally small state layer
- Vitest
- Playwright
- Netlify Functions
- official OpenAI JavaScript SDK
- `exifr` only if optional media is implemented

Do not add DuckDB, Arrow, Parquet, PMTiles, a database server, user accounts, authentication, or a large UI component library during the competition build.

Verify current compatible package versions before pinning them.

---

# 8. Application Architecture

Use a small workspace or clean single-app structure:

```text
thereiwas/
  src/
    app/
    components/
    features/
      import/
      trips/
      map/
      playback/
      memory-director/
      optional-media/
    domain/
    workers/
    services/
    storage/
    styles/
    test/
  netlify/
    functions/
      direct-memory.ts
  public/
    sample/
      sample-timeline.json
  docs/
  scripts/
  netlify.toml
  package.json
  README.md
```

Keep domain logic separate from React.

Core pure modules:

- `parseTimeline`
- `normalizeTimeline`
- `inferHome`
- `detectTrips`
- `buildTripEvidence`
- `buildRouteCandidates`
- `selectRouteGeometry`
- `buildPlaybackTimeline`
- `buildMemoryDossier`
- `validateMemoryPlan`

React components must not contain trip-detection or route-reconstruction algorithms.

---

# 9. Supported Timeline Schema

The private acceptance file is a top-level JSON array containing combinations of:

## 9.1 Visit records

```ts
interface RawVisitRecord {
  startTime: string;
  endTime: string;
  visit: {
    hierarchyLevel?: string;
    probability?: string;
    topCandidate?: {
      probability?: string;
      semanticType?: string;
      placeID?: string;
      placeLocation?: string;
    };
  };
}
```

## 9.2 Activity records

```ts
interface RawActivityRecord {
  startTime: string;
  endTime: string;
  activity: {
    probability?: string;
    start?: string;
    end?: string;
    distanceMeters?: string;
    topCandidate?: {
      type?: string;
      probability?: string;
    };
  };
}
```

## 9.3 Timeline path records

```ts
interface RawTimelinePathRecord {
  startTime: string;
  endTime: string;
  timelinePath: Array<{
    point: string;
    durationMinutesOffsetFromStartTime: string;
  }>;
}
```

## 9.4 Timeline memory records

```ts
interface RawTimelineMemoryRecord {
  startTime: string;
  endTime: string;
  timelineMemory: {
    destinations?: Array<{ identifier: string }>;
    distanceFromOriginKms?: string;
  };
}
```

For the competition critical path, support this schema extremely well.

Support for older `locations[]` exports may be added only after the golden path is complete.

---

# 10. Importer Requirements

## 10.1 Import experience

Homepage primary actions:

- **Try a sample journey**
- **Import Timeline JSON**

The sample journey must use the same parser and derivation pipeline as a real upload wherever practical.

## 10.2 Processing

- parse in a Web Worker
- keep the UI responsive
- validate records independently
- quarantine malformed records
- preserve source index
- normalize numeric strings
- parse `geo:lat,lng`
- reconstruct timeline-path timestamps
- sort globally by start time
- remove duplicate consecutive points
- preserve timezone offsets
- report real processing stages

Stages:

1. Reading
2. Parsing
3. Normalizing
4. Reconstructing paths
5. Detecting home
6. Detecting trips
7. Preparing routes
8. Saving

## 10.3 Import report

Show:

- date range
- records read
- visits
- movement legs
- path points
- malformed records
- likely home
- trips detected
- coverage warnings

Keep the report readable. Do not expose a forensic data dashboard during the judge flow.

## 10.4 Persistence

Persist normalized data and user trip records in IndexedDB.

On reload:

- restore the imported dataset
- restore detected/confirmed trips
- restore user-created trips
- restore Memory Director results
- restore route cache
- reopen the last meaningful view

Provide a clear **Delete my local data** action.

---

# 11. Core Domain Model

Use the minimum model needed for the complete experience.

```ts
interface Coordinate {
  lat: number;
  lng: number;
}
```

```ts
interface Visit {
  id: string;
  start: string;
  end: string;
  coordinate?: Coordinate;
  placeId?: string;
  semanticType?: string;
  confidence?: number;
  sourceIds: string[];
}
```

```ts
type TravelMode =
  | "driving"
  | "walking"
  | "cycling"
  | "running"
  | "flight"
  | "train"
  | "subway"
  | "tram"
  | "bus"
  | "ferry"
  | "skiing"
  | "unknown";
```

```ts
interface TimedCoordinate extends Coordinate {
  timestamp: string;
}
```

```ts
interface Leg {
  id: string;
  start: string;
  end: string;
  mode: TravelMode;
  origin?: Coordinate;
  destination?: Coordinate;
  observedPath: TimedCoordinate[];
  sourceDistanceMeters?: number;
}
```

```ts
interface PlaceSummary {
  id: string;
  coordinate: Coordinate;
  displayName?: string;
  locality?: string;
  region?: string;
  country?: string;
  labelSource: "sample" | "temporary-geocode" | "user" | "coordinate";
}
```

```ts
interface TripEvidence {
  start: string;
  end: string;
  homeDistanceKm: number;
  nightsAway: number;
  destinationCount: number;
  modes: TravelMode[];
  timelineMemorySupport: boolean;
  coverageScore: number;
  reasons: string[];
}
```

```ts
interface TripRecord {
  id: string;
  source: "detected" | "user";
  status: "proposed" | "confirmed" | "edited";
  title: string;
  start: string;
  end: string;
  startLocked: boolean;
  endLocked: boolean;
  destinationIds: string[];
  visitIds: string[];
  legIds: string[];
  evidence: TripEvidence;
  createdAt: string;
  updatedAt: string;
}
```

```ts
interface MemoryPlan {
  title: string;
  oneLineMemory: string;
  chapters: Array<{
    title: string;
    start: string;
    end: string;
    summary: string;
  }>;
  highlights: Array<{
    timestamp: string;
    title: string;
    description: string;
    groundingIds: string[];
  }>;
  captions: Array<{
    timestamp: string;
    text: string;
    groundingIds: string[];
  }>;
  reflectionQuestions: string[];
  uncertaintyNotes: string[];
}
```

---

# 12. Explainable Automatic Trip Detection

Automatic detection runs after every import.

## 12.1 Home inference

Strong evidence:

- `semanticType: "Home"`
- repeated overnight presence

Fallback:

1. identify visits overlapping local 10:00 PM–6:00 AM
2. cluster nearby coordinates
3. score clusters by nights, duration, recurrence, and date span
4. select the dominant persistent cluster
5. retain a confidence score

For the competition, prioritize a reliable single-home model over a complex history of relocations.

## 12.2 Trip start

Propose a trip when at least one is true:

- the user spends a night at least 40 km from inferred home
- a flight leg departs the home region
- a Timeline Memory supports the interval
- the user remains meaningfully away for at least 18 hours

## 12.3 Trip end

End when the user returns to the home radius and remains there long enough to indicate a completed return.

Default:

- at least six hours at home including an overnight period, or
- at least twelve continuous hours near home

## 12.4 Candidate merging

Merge adjacent away episodes when:

- they are separated by less than eighteen hours
- the home interval looks like a transfer or brief stop
- long-distance movement resumes immediately

## 12.5 Relocation guard

Do not classify an interval as a vacation when a new overnight cluster becomes dominant and persists through the end of the dataset or a long subsequent period.

A practical guard is sufficient. Do not build a complete residential-history engine.

## 12.6 Detection explanation

Every candidate must include plain-language reasons, for example:

> Detected as a 28-day trip because you left your home area, traveled by air, spent 27 nights away across 14 destinations, and returned home on August 2.

The user must be able to inspect:

- why it was detected
- confidence
- coverage
- start/end boundaries

## 12.7 Manual authority

The user can:

- confirm a candidate
- rename it
- edit start/end
- dismiss it
- create a trip independently

User-created or user-edited boundaries must not be changed automatically.

---

# 13. Manual Trip Creation

Provide a persistent **Create trip** action.

Required input:

- start date
- end date

Optional:

- exact time
- title

As dates change, show a live preview:

- route bounds
- included visits
- movement legs
- destinations
- nights
- distance
- travel modes
- coverage gaps

The user may save even if evidence is sparse.

Required operations:

- create
- rename
- edit dates
- confirm detected trip
- dismiss detected trip
- delete user trip
- persist across refresh

Do not implement nested trips, complex merging, or overlapping aggregate accounting before submission.

---

# 14. Place Naming

Timeline JSON may contain coordinates and Google Place IDs without readable names.

The app must still work.

Priority:

1. embedded sample fixture names
2. user-edited label
3. temporary reverse-geocoded city/region name
4. coordinate-based fallback

For real uploads, use Mapbox Geocoding v6 reverse geocoding only for significant selected stops, not every raw point.

Requirements:

- minimize coordinate requests
- batch when appropriate
- respect provider storage terms
- use session-only caching for temporary results
- persist only user-confirmed labels unless permanent result storage is explicitly authorized
- show generic coordinates when naming fails
- trip detection must not depend on successful geocoding

The sample journey should include safe embedded place names so judges never wait for geocoding.

---

# 15. Route Reconstruction

Enhanced Routes is enabled by default.

## 15.1 Preserve provenance

Maintain separately:

- observed source path
- enhanced provider route
- explicit fallback route

Never overwrite source geometry.

## 15.2 Routing decision

### Dense driving/walking/cycling trace

After Directions works reliably, use Map Matching when:

- there are enough useful timed points
- trace density is appropriate
- mode has a compatible Mapbox profile

### Sparse ground leg

Use Mapbox Directions:

- `mapbox/driving`
- `mapbox/walking`
- `mapbox/cycling`

Use between two and twenty-five ordered waypoints per request.

### Flight

Use a great-circle arc.

Never send flight endpoints through ground routing.

### Train, subway, tram, ferry, skiing, unknown

Prefer observed path geometry.

If missing, use a clearly styled inferred curve or line.

Never silently route these as driving.

## 15.3 Route queue

Implement:

- deterministic request fingerprint
- IndexedDB cache
- visible loading status
- cancellation when trip dates change
- bounded concurrency
- retry only transient failures
- honest fallback
- no duplicate provider request across reloads

Prioritize the currently open trip.

## 15.4 Temporal interpolation

Do not assign time uniformly by returned vertex index.

Priority:

1. provider duration annotations
2. trace timestamps
3. cumulative route distance
4. linear time only as last fallback

The marker, path, clock, stop cards, and odometer must stay synchronized.

---

# 16. Cinematic Playback Engine

The animation is the product centerpiece.

## 16.1 Runtime

Use one deterministic `requestAnimationFrame` clock.

Do not rerender the React tree every frame.

Precompute:

- timestamp arrays
- coordinate arrays
- cumulative distances
- stop intervals
- route segment boundaries
- camera keyframes

Use binary search to locate current route state by time.

## 16.2 Required visuals

- full-screen map
- route draws progressively
- current marker moves smoothly
- live date
- live local time
- live distance
- current transport mode
- current city or stop when known
- automatic camera movement
- route final reveal
- trip summary at end

## 16.3 Camera language

- begin wide enough to establish context
- approach the origin
- follow local ground movement at useful scale
- pull back for long-distance travel
- use a globe-like or wide arc treatment for flights
- pause at major stops
- avoid abrupt bearing reversals
- keep labels readable
- reserve safe space for UI

## 16.4 Controls

- play
- pause
- replay
- scrub
- 1×
- 2×
- 5×
- 10×
- cinematic 30-second mode
- keyboard controls

The 30-second mode should intelligently allocate more screen time to:

- major travel transitions
- overnight destinations
- first arrival in a new region
- significant stops
- final reveal

## 16.5 Timeline-only storytelling

The replay must feel complete with no photos.

Use:

- city labels
- day cards
- transport changes
- stop duration
- distance
- nights
- first/last moments
- route scale transitions
- Memory Director captions

Optional photos may later appear as accents, never as the narrative foundation.

---

# 17. GPT-5.6 Memory Director

This is the primary OpenAI-native feature.

Use the OpenAI Responses API with Structured Outputs through a server-side Netlify Function.

Default model:

```text
gpt-5.6
```

Allow an environment override:

```text
OPENAI_MODEL
```

Never call OpenAI directly from the browser with a secret key.

## 17.1 Server function

Create:

```text
netlify/functions/direct-memory.ts
```

Environment variables:

```text
OPENAI_API_KEY
OPENAI_MODEL=gpt-5.6
```

The function must:

- accept a bounded trip dossier
- validate input with Zod
- reject oversized payloads
- call the Responses API
- require strict structured output
- validate returned JSON
- strip unsupported fields
- return no provider internals
- avoid persistent storage
- rate-limit abuse
- return a safe fallback on provider failure

## 17.2 Trip dossier

Generate locally.

Include only selected trip evidence:

```ts
interface MemoryDossier {
  trip: {
    title: string;
    start: string;
    end: string;
    durationDays: number;
    nightsAway: number;
    totalDistanceKm: number;
  };
  destinations: Array<{
    id: string;
    name: string;
    firstArrival: string;
    lastDeparture: string;
    durationMinutes: number;
  }>;
  legs: Array<{
    id: string;
    start: string;
    end: string;
    mode: TravelMode;
    distanceKm: number;
  }>;
  days: Array<{
    date: string;
    destinationIds: string[];
    movementKm: number;
    notableTransitions: string[];
  }>;
  coverage: {
    score: number;
    gaps: string[];
  };
  uncertainties: string[];
  userNotes: string[];
  reflectionAnswers: Array<{
    question: string;
    answer: string;
  }>;
}
```

Do not send:

- the complete raw JSON
- unrelated dates
- home address precision
- unselected raw path points
- private provider keys
- optional media bytes

## 17.3 Memory Director prompt rules

GPT-5.6 must:

- use only dossier evidence and explicit user answers
- never invent an activity, companion, emotion, purpose, or event
- label inferences
- use restrained, specific prose
- avoid generic travel-blog language
- create a coherent chapter structure
- select moments based on movement, arrival, duration, novelty, and transitions
- produce reflection questions that ask for human meaning absent from the data
- preserve uncertainty
- reference grounding IDs for factual highlights and captions

## 17.4 Structured output

Return:

```ts
interface MemoryPlan {
  title: string;
  oneLineMemory: string;
  chapters: Array<{
    title: string;
    start: string;
    end: string;
    summary: string;
  }>;
  highlights: Array<{
    timestamp: string;
    title: string;
    description: string;
    groundingIds: string[];
    certainty: "observed" | "inferred" | "user-supplied";
  }>;
  captions: Array<{
    timestamp: string;
    text: string;
    groundingIds: string[];
  }>;
  reflectionQuestions: Array<{
    id: string;
    question: string;
    reason: string;
  }>;
  uncertaintyNotes: string[];
}
```

## 17.5 Human correction loop

The user can:

- edit generated title
- edit chapter title or summary
- edit captions
- answer reflection questions
- regenerate with answers
- restore previous version

Show:

- **What was sent?**
- **Why this moment?**
- certainty labels where relevant

## 17.6 Judge reliability

The sample journey must have:

- a cached, validated Memory Plan bundled with the app
- a visible live **Regenerate with GPT-5.6** action
- a deterministic fallback when the API is unavailable

The judge flow may never fail because of API credits, latency, or rate limits.

---

# 18. Optional Media

This section is P1 and may be omitted from the submission build.

Only begin after the complete timeline-only golden path is deployed and stable.

Possible features:

- import geotagged photos/videos
- parse timestamp and coordinate locally
- match media to trip time and location
- show a small filmstrip
- insert optional media moments into playback
- allow a trip cover

Constraints:

- no media upload to OpenAI
- no media upload to Netlify
- no requirement to select media
- no empty photo placeholders
- no photo-first homepage
- no photo-related error in the core flow

If implemented, keep it peripheral.

---

# 19. User Experience

## 19.1 Homepage

Hero:

**There I Was**

**Turn your location history into the stories of your life.**

Primary actions:

- Try a sample journey
- Import Timeline JSON

Supporting sentence:

> Your Timeline is processed locally. Only selected route coordinates and a compact trip summary leave your browser when you use enhanced routing or the Memory Director.

Do not lead with a technical privacy manifesto.

## 19.2 Trips view

Show:

- detected trips
- user trips
- dates
- destination summary
- nights
- distance
- modes
- confidence
- compact route preview

Primary action:

- Create trip

## 19.3 Trip view

Dominant map.

Supporting elements:

- title
- dates
- detection explanation
- Play
- Direct my memory
- Edit dates
- concise itinerary
- compact statistics
- optional Memory Director panel

## 19.4 Visual character

Aim for:

- editorial travel documentary
- warm, human, reflective
- polished and minimal
- map-led
- strong typography
- restrained motion outside playback
- excellent empty/loading/error states

Avoid:

- generic SaaS dashboard
- card grid overload
- excessive rounded pills
- neon AI gradients
- chat interface as the main UI
- dozens of settings
- developer-debug information in the judge path

One finished visual theme is enough.

---

# 20. Sample Journey

Build a generated, non-sensitive sample JSON that uses the same supported schema.

It should contain:

- a stable inferred home
- a flight departure
- multiple cities or destinations
- driving
- walking
- at least one sparse route requiring Directions
- at least one observed timeline path
- overnight stays
- a return home
- one low-confidence moment
- one Timeline Memory
- enough data for a compelling 25–35 second replay

The sample must not contain:

- the user's actual coordinates
- transformed versions of private coordinates
- personally identifying home/work locations
- copyrighted media
- third-party trademarks in the demo visuals unless necessary and permitted

Embed safe place names directly in sample metadata.

Create expected outputs for tests:

- detected trip boundaries
- destination order
- travel modes
- expected distance range
- Memory Director sample plan

---

# 21. Privacy and Security

## 21.1 Local by default

The raw Timeline JSON is:

- read locally
- parsed locally
- normalized locally
- stored locally
- never uploaded

## 21.2 External requests

Mapbox receives only route/geocoding coordinates needed for selected jobs.

OpenAI receives only the bounded Memory Dossier.

Provide a request inspector showing:

- provider
- purpose
- number of coordinates or dossier size
- date/time
- status

Do not display raw secret values.

## 21.3 Sensitive location treatment

For the Memory Dossier:

- replace exact home address with “Home”
- omit full-resolution home coordinates
- prefer city/region names
- omit unrelated routine locations

## 21.4 Netlify function security

- keep `OPENAI_API_KEY` server-side
- restrict CORS to production and local development origins
- validate content type
- impose body size limits
- rate-limit requests
- sanitize errors
- never log dossiers in production
- set appropriate security headers

## 21.5 Public repository safety

Before every push:

```bash
git diff --cached
git grep -n "sk-" || true
git grep -n "pk\." || true
```

Use a proper secret scanner if available.

A public Mapbox browser token may exist in the built client only if it is URL-restricted and contains no secret scopes. Never copy the token from `places`.

---

# 22. Testing

## 22.1 Unit tests

Required:

- `geo:` coordinate parsing
- numeric-string normalization
- timestamp parsing
- timeline-path timestamp reconstruction
- duplicate-point removal
- hierarchy visit deduplication
- home inference
- trip start/end inference
- brief-home-stop merging
- relocation guard
- detection explanation
- manual trip persistence
- route mode decision
- route fingerprint
- cumulative-distance interpolation
- Memory Dossier minimization
- Memory Plan schema validation

## 22.2 Integration tests

Required:

- sample JSON imports
- expected trip detected
- trip opens
- enhanced route resolves or honestly falls back
- manual trip created
- date edit recomputes evidence
- Memory Director cached result displays
- live Memory Director endpoint validates response
- reload restores data

## 22.3 End-to-end test

Create one Playwright golden-path test matching Section 3.

Run it against:

- local Netlify development
- deploy preview
- production custom domain

## 22.4 Privacy tests

Assert:

- JSON file is not submitted through network
- unrelated events are absent from Memory Dossier
- OpenAI key is absent from browser bundle
- production logs do not contain dossier data
- sample mode requires no external AI call

---

# 23. Performance Targets

On a modern laptop using the supplied private acceptance file:

- import begins feedback immediately
- UI never freezes for more than one animation frame during worker processing
- complete import and derivation target: under ten seconds
- sample mode usable: under five seconds
- trip list interaction: immediate
- playback: stable 30–60 FPS
- scrub lookup: effectively instant
- Memory Director cached result: immediate
- live Memory Director response: clear progress and graceful timeout

Do not pursue theoretical 500 MB support before the supplied acceptance file and sample golden path are excellent.

---

# 24. Build Order

Follow this order strictly.

## Milestone 1 — Public skeleton and deployment

- new Git repository
- public GitHub repository
- Vite/React/TypeScript
- homepage
- sample loader
- Netlify preview
- first production deploy
- test setup

Exit criterion:

- public repo exists
- Netlify site exists
- homepage works remotely

## Milestone 2 — Timeline importer

- worker parsing
- normalized visits/legs/paths
- progress UI
- import report
- IndexedDB
- sample fixture through real pipeline

Exit criterion:

- private acceptance JSON imports correctly
- sample imports in production
- reload restores dataset

## Milestone 3 — Trip intelligence

- home inference
- trip detection
- explanation
- trip gallery
- confirmation/dismissal

Exit criterion:

- featured sample trip detected correctly
- private acceptance trips are plausible
- tests pass

## Milestone 4 — Manual authority

- Create trip
- date preview
- persistence
- rename/edit/delete
- recomputation

Exit criterion:

- exact judge manual-trip flow works after reload

## Milestone 5 — Route reconstruction

- source path
- Directions
- flight arcs
- route cache
- fallback
- place labels

Exit criterion:

- featured trip has a coherent route
- no unsupported mode silently becomes driving

## Milestone 6 — Cinematic playback

- deterministic clock
- marker
- route trail
- date/time
- odometer
- modes
- stops
- camera
- controls
- 30-second mode

Exit criterion:

- one uninterrupted, polished featured replay

## Milestone 7 — Memory Director

- dossier
- Netlify function
- GPT-5.6 Structured Output
- cached sample
- edits
- reflection loop
- request inspector

Exit criterion:

- cached and live paths work
- no fabricated details in fixtures
- judge flow remains reliable offline from OpenAI

## Milestone 8 — Production polish

- final responsive layout
- loading/error states
- accessibility essentials
- privacy copy
- README
- architecture docs
- Codex collaboration docs
- screenshots
- demo script

Exit criterion:

- someone unfamiliar can complete golden path without help

## Milestone 9 — Domain and release

- production deploy
- custom domain
- HTTPS verification
- end-to-end production test
- repository homepage
- final release tag

Suggested release:

```bash
git tag -a v1.0.0-build-week -m "OpenAI Build Week submission"
git push origin v1.0.0-build-week
gh release create v1.0.0-build-week \
  --title "There I Was — OpenAI Build Week" \
  --generate-notes
```

---

# 25. Explicitly Deferred

Do not scaffold or implement these before the competition release:

- DuckDB-Wasm
- Parquet
- Arrow
- natural-language SQL
- lifetime analytics dashboard
- mobility entropy
- geographic center-of-gravity studies
- ghost maps
- full life chapters
- collaborative accounts
- cloud synchronization
- advanced place gazetteer
- Google Place Details
- Overture pipeline
- MapLibre strict-local runtime
- PMTiles
- advanced offline PWA
- multiple themes
- MP4 rendering pipeline
- 4K export
- GIF export
- shareable hosted story pages
- advanced nested trips
- complex overlapping-trip analytics
- correction patch import/export
- support for every historic Google Takeout schema
- large media library management

Put them in `docs/post-hackathon-roadmap.md`.

Do not create placeholder navigation for deferred sections.

---

# 26. Codex Collaboration Documentation

Maintain `docs/codex-collaboration.md` throughout the build.

Document:

- the initial product objective
- how Codex inspected the Timeline schema
- architecture proposed by Codex
- architecture accepted or rejected by the human
- important bugs Codex introduced
- how those bugs were diagnosed
- significant product decisions made by the human
- tests produced with Codex
- how GPT-5.6 was used in the product
- which work occurred in the primary `/feedback` session
- representative prompts
- representative commits

Do not manufacture a flawless story. Honest iteration demonstrates genuine collaboration.

Use one main Codex session for most core functionality so the required `/feedback` Session ID represents the project meaningfully.

---

# 27. README Requirements

The public README must begin with:

```md
# There I Was

Turn your Google Timeline into cinematic, editable stories of your life.
```

Above the fold:

- screenshot or short owned animation
- live demo link
- Try Sample instruction
- one-paragraph explanation
- privacy statement
- Built for OpenAI Build Week

Required sections:

1. What it does
2. Why it matters
3. Try it
4. How it works
5. Technical architecture
6. GPT-5.6 Memory Director
7. Privacy
8. Run locally
9. Environment variables
10. Tests
11. How Codex was used
12. Limitations
13. Roadmap
14. License

Local quick start must be no longer than:

```bash
git clone https://github.com/DalmoMendonca/thereiwas.git
cd thereiwas
pnpm install
cp .env.example .env
pnpm dev
```

Explain that sample mode works without API keys, while live Mapbox/OpenAI functionality requires configured keys.

---

# 28. Environment Variables

Create `.env.example`:

```bash
# Browser-safe, URL-restricted public token
VITE_MAPBOX_ACCESS_TOKEN=

# Server-side only
OPENAI_API_KEY=

# Server-side default
OPENAI_MODEL=gpt-5.6
```

Netlify production variables:

- `VITE_MAPBOX_ACCESS_TOKEN`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Never expose `OPENAI_API_KEY` through a `VITE_` variable.

After adding environment variables, trigger a new production deploy.

---

# 29. Demo-Readiness Requirements

Before declaring the build complete:

- fresh private-window golden path passes
- sample mode never asks for a key
- sample mode never depends on an OpenAI call
- no private data appears in GitHub
- all production URLs work
- mobile layout is usable
- console has no uncaught errors
- failed provider requests have elegant fallback
- route animation does not stutter visibly
- Memory Director does not invent facts
- README instructions work in a clean checkout
- custom domain has valid HTTPS
- final code is pushed
- release is tagged
- demo video can be recorded without hidden setup steps

---

# 30. Codex Operating Rules

1. Keep working until the golden path is complete.
2. Do not stop at scaffolding.
3. Do not build broad infrastructure before visible functionality.
4. Inspect the browser after meaningful UI changes.
5. Run tests after every milestone.
6. Fix regressions before adding features.
7. Commit and push every verified milestone.
8. Keep the application deployable continuously.
9. Never claim a feature is finished because code exists.
10. Never expose private Timeline data.
11. Never copy code from `places`.
12. Never allow optional photos to dominate the build.
13. Never leave the public repository stale relative to local work.
14. Never accept the `.netlify.app` URL as the final production target.
15. Stop feature expansion once the submission experience is polished and reliable.

---

# 31. First Codex Action

Begin by doing all of the following in one continuous workflow:

1. create the new `thereiwas` folder and Git history
2. write the foundational docs
3. scaffold React/Vite/TypeScript
4. add tests
5. create the generated sample Timeline fixture
6. build the homepage with sample and import actions
7. implement the initial worker parser
8. make the first verified commit
9. create and push `DalmoMendonca/thereiwas` as a public GitHub repository
10. create and deploy the first Netlify production site
11. report:
    - GitHub URL
    - Netlify URL
    - commit SHA
    - tests run
    - first visible functionality
    - next milestone

Then continue automatically through the milestones above without waiting for permission unless authentication or DNS access is genuinely unavailable.

---

# 32. Final Success Condition

The build is successful only when:

- the source is public at `github.com/DalmoMendonca/thereiwas`
- the app is live at `https://thereiwas.dalmo.ai`
- Timeline JSON alone delivers the complete core experience
- automatic trips work
- manual trip records work
- cinematic playback works
- GPT-5.6 Memory Director works
- the sample judge flow works without external setup
- all core tests pass
- documentation is complete
- every verified change is committed and pushed
- the product is ready to demonstrate in under three minutes

Build the smallest version of the full vision that already feels like the future.
