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
- Deterministic cinematic playback and controls
- Local persistence and deletion
- Bounded Memory Dossier
- GPT-5.6 strict structured output through a server function
- Cached sample plan, deterministic fallback, correction loop, and request inspector
- Responsive, keyboard-accessible judge path

## Release gate

The golden path in `SPECS.md` is the gate. Optional features cannot delay it. Sample mode must work without external keys or network providers; a judge must be able to detect a trip, play it, direct the memory, answer a question, create a second trip, edit it, reload, and recover it.

## Explicit non-goals

No account system, cloud synchronization, SQL analytics, life-stage dashboards, advanced media manager, hosted sharing, video export, nested trip accounting, or every historical Google schema. These belong to the post-hackathon roadmap only after the submitted experience is stable.

