# Architecture

There I Was is a React/Vite browser application with one Netlify Function. Parsing, place naming, trip detection, route reconstruction, playback, and dossier construction are plain TypeScript domain modules.

```text
Timeline JSON
  -> Web Worker parser
  -> normalized visits, movement, paths, and Timeline Memories
  -> offline place naming
  -> semantic Home returns
  -> unique trip records
  -> route reconstruction
  -> MapLibre playback
  -> local EXIF photo moments
  -> IndexedDB

selected trip
  -> coordinate-free dossier
  -> Netlify Function validation
  -> OpenAI Responses API, store: false
  -> strict Memory Plan validation
  -> editable story
```

## Import

The worker parses the top-level array once and identifies each record by shape before validating it. It normalizes numeric strings and timestamps, reconstructs recorded paths from their minute offsets, removes repeated coordinates, and attaches paths to movement legs with an indexed time lookup. Unmatched paths become their own observed movement legs.

Current Timeline exports can emit two hierarchy records for the same visit interval. Exact intervals are grouped and the semantic Home, Work, or most specific usable record wins. Source IDs are retained for traceability.

## Place naming

`public/data/cities.json` is generated from the GeoNames `cities15000`, country, and first-level administrative datasets. The worker resolves each visit to a nearby city using one-degree spatial buckets and a bounded nearest-neighbor search. The result includes locality, region, country, and country code. Neighborhood, historic, abandoned, and destroyed-place feature classes are excluded so trip labels stay legible.

The raw coordinate remains part of local route evidence. It is not used as user-facing prose or sent to GPT-5.6.

## Trip detection

Semantic Home visits are sorted and merged into Home-presence intervals. A candidate journey is the gap between leaving one Home interval and entering the next. Short gaps are ignored unless a flight or Timeline Memory supports them. A seven-day move between distant Home locations and any gap longer than 180 days are treated as relocation or insufficient evidence rather than a vacation.

Destinations are grouped by named city and retained when the record shows at least four hours, an overnight stay, or repeated visits. Titles use the dominant foreign country, dominant region/state, or dominant city. Exact start/end ranges are deduplicated before display.

## Routes and replay

Every route segment retains provenance:

- `observed`: points recorded in Timeline
- `enhanced`: Mapbox Directions for sparse driving, walking, or cycling evidence and missing ground joins
- `great-circle`: a flight without a recorded path
- `fallback`: a straight, visibly dashed connection when local evidence is incomplete

Sparse evidence is detected by measuring the distance between consecutive recorded points, with mode-specific thresholds for driving, walking, and cycling. Adjacent leg gaps are reconstructed in chronological order. The first and last route coordinates are pinned to Home, including provider routes whose endpoints snap to a nearby road.

MapLibre renders the segments over OpenFreeMap vector tiles derived from OpenStreetMap, with visible attribution. The map fits the entire home-to-home route and keeps it visible. A single animation clock advances the green progress line and orange current-position marker. React does not rerender on every frame.

## Photos

`exifr` reads capture time and GPS metadata from selected image files. Photos outside the trip window or without GPS are rejected. Accepted blobs are stored in an IndexedDB store keyed by trip, sorted by capture time, and exposed to the replay as map points. Selecting a thumbnail maps its timestamp into replay progress. During playback, the latest reached photo becomes the active viewport image.

## Story

`buildMemoryDossier` includes only the selected trip's title, dates, named destinations, durations, summarized movement, modes, daily totals, coverage, uncertainty, and explicit user answers. It excludes coordinates, recorded path points, Home coordinates, unrelated dates, and source records.

The Netlify Function limits the body to 48 KB, validates it with Zod, applies origin and rate controls, and calls `openai.responses.parse` using GPT-5.6, Zod `text.format`, low reasoning effort, and `store: false`. The structured plan is validated again. A deterministic named-place plan remains available when the provider times out, refuses, or returns an invalid result.

## Persistence

IndexedDB stores the normalized session, trip records, dismissed trips, selected view, route cache, photos, and up to five prior story drafts. Schema version changes invalidate incompatible derived data rather than trying to display stale shapes. Deleting imported data clears every store.
