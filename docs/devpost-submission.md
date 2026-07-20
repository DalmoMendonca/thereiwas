# Devpost submission draft

Project: There I Was

Category: Apps for Your Life

Elevator pitch: Turn your Google Timeline into cinematic, editable journeys, and use GPT-5.6 to find the story without inventing the memory.

Live demo: https://thereiwas.dalmo.ai

Demo video: https://youtu.be/yNq8QA40OEM

Repository: https://github.com/DalmoMendonca/thereiwas

Primary Codex Session ID: `019f7d6c-353b-7853-ac63-2a3e617a1587`

## Public project story

### The log I couldn't stop thinking about

Google Timeline knows where I have been, how long I stayed, and how I moved between places. I am fine with the collection. What bothered me was the bargain: years of coordinates, and the product still mostly gives me a list.

I wanted to press Play.

There I Was turns a current Google Timeline JSON export into trips you can inspect, edit, replay, and remember. The raw file stays in the browser. The app finds stretches away from home, explains why each stretch qualifies as a trip, reconstructs the route, and plays it back with a moving marker, local clock, distance, travel mode, stops, and camera movement.

Then GPT-5.6 helps find the shape of the story. The human supplies the meaning.

### Three minutes from JSON to memory

The public demo needs no account, API key, or private file. Click **Try a sample journey** and the same worker and inference pipeline used for an upload processes 20 generated Timeline records. It finds one Iceland trip. Open it and the evidence is visible: six nights away, four destinations, flights, drives, a walk, a Timeline Memory, and one deliberately uncertain roadside stop.

Press Play for a 30-second cut of the week. The route draws while the marker moves. The clock changes with the local UTC offset. Distance advances from one precomputed timeline instead of several animations that can drift apart.

Open Memory Director to get chapters, grounded highlights, captions, uncertainty notes, and questions about what the data cannot know. Answer one question and the response becomes user-supplied evidence. Create a second trip from any date range, rename it, reload, and it is still there.

### What happens under the map

Timeline exports are messy enough to make the product interesting. A Web Worker validates each record separately with Zod, quarantines malformed rows, normalizes numeric strings and `geo:lat,lng`, reconstructs path timestamps from minute offsets, removes duplicate points, preserves source IDs and timezone offsets, and sorts everything into one evidence model.

Trip detection starts with explicit Home evidence and falls back to recurring overnight clusters. Away episodes use distance, duration, flights, and Timeline Memories. Brief returns can merge; sustained new overnight clusters trigger a relocation guard. Every proposed trip carries the exact reasons that created it. User-edited date boundaries stay locked when evidence is recomputed.

Route geometry keeps its provenance. Observed paths remain observed. Flights use great-circle arcs. Supported sparse ground legs can use Mapbox Directions when a browser-safe token is present. The fallback draws an honest inferred route, and an unsupported mode never quietly becomes driving.

IndexedDB stores the normalized Timeline, trip decisions, route cache, story versions, and last view. The app restores all of it after reload. A delete action removes the local dataset.

### GPT-5.6 directs the evidence

Memory Director sends a compact dossier for one selected trip. It contains dates, named destinations, summarized legs, daily movement, coverage gaps, user notes, and reflection answers. It contains zero raw path points and no home coordinates.

The Netlify Function validates the dossier, calls the Responses API through the official OpenAI JavaScript SDK, requests a strict Zod-backed Structured Output, and validates the result again. `store: false` is set on every call. Factual highlights and captions must cite grounding IDs. Certainty is explicit: observed, inferred, or user-supplied.

The sample includes a cached validated plan, so the judge flow stays instant. The live **Regenerate with GPT-5.6** path runs in production. A deterministic plan takes over on provider timeout or rate limit, preserving the full experience.

### Building it with Codex

I built the core project in one Codex session. Codex translated the product contract into pure domain modules, wrote the parser and inference tests, assembled the React experience, and drove the browser after each major change. The public collaboration log includes the primary Session ID, representative prompts, architectural decisions, commits, and bugs.

The bugs are part of the record. A nested low-confidence visit once split the Iceland week into two trips. Browser testing exposed it, and the fix changed episode grouping to compare against the furthest covered end time. A stale route cache later produced an invalid local clock. Versioned fingerprints and defensive offset defaults fixed that. Production exposed another hard edge: GPT-5.6 Structured Outputs crossed Netlify's 30-second function ceiling under default reasoning. Low reasoning effort, no retries, and a 24-second client budget brought the validated response under the limit while leaving room for fallback.

Codex also helped make privacy testable. The production build scan fails if a private provider key appears in browser assets. Playwright records outgoing requests and asserts that the sample file never leaves the browser and the Memory Dossier excludes home coordinates and observed paths.

### Where it goes next

The competition build is intentionally about Timeline JSON. Photos, shared stories, video export, and lifetime mobility analysis can wait. The next useful work is broader support for historic Takeout formats, better place naming, and optional on-device photo matching.

The larger idea stays the same: personal data should return something personal. A log can show where you were. There I Was gives you a way back into the day.

## Built with

React, TypeScript, Vite, GPT-5.6, OpenAI Responses API, Codex, Zod, IndexedDB, Web Workers, Zustand, TopoJSON, Mapbox GL JS, Netlify Functions, Vitest, Playwright

## Judge testing note

Open https://thereiwas.dalmo.ai and click **Try a sample journey**. Open the detected Iceland trip, press **Play**, then click **Direct my memory**. Sample mode is cached and requires no provider call. **Regenerate with GPT-5.6** exercises the live server function.
