# Product scope

## Release thesis

There I Was turns a Google Timeline JSON export into trips the user can inspect, replay, direct, and correct. The competition release optimizes for one flawless three-minute experience rather than breadth.

The governing principle is: **the data supplies evidence, GPT-5.6 supplies narrative structure, and the human remains the authority over memory.**

## Core release

- Current Timeline schema import in a Web Worker
- Independent record validation and quarantine
- Normalized visits, legs, paths, places, and Timeline Memories
- Explicit or inferred home
- Explainable automatic trip detection
- Manual trip creation and locked user boundaries
- Rename, edit, confirm, dismiss, and delete operations
- Observed, enhanced, great-circle, and explicit fallback routes
- Explicit home-to-home loop closure and Mapbox-routed missing joins
- Deterministic cinematic playback and controls
- Local persistence and deletion
- Local EXIF photo import, map markers, filmstrip, and replay synchronization
- Bounded Memory Dossier
- GPT-5.6 strict structured output through a server function
- Deterministic story fallback and correction loop
- Responsive, keyboard-accessible judge path

## Release gate

The direct-testing reset at the top of `SPECS.md` is the gate. The public sample must detect exactly California, New York, and Italy from the consented source excerpt. A judge must be able to open a tightly fitted road loop, play it, add a geotagged photo, create a GPT-5.6 story, edit a trip, reload, and recover local work.

## Explicit non-goals

No account system, cloud synchronization, SQL analytics, life-stage dashboards, hosted sharing, video export, nested trip accounting, complex media library, or every historical Google schema. These belong to the post-hackathon roadmap only after the submitted experience is stable.
