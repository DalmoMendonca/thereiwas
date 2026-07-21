# Devpost submission draft

Project: There I Was

Category: Apps for Your Life

Tagline: Turn a Google Timeline export into a trip replay you can direct, play, and keep.

Live demo: https://thereiwas.dalmo.ai

Repository: https://github.com/DalmoMendonca/thereiwas

Demo video: https://youtu.be/P7AgqQWPYRE (1:40, 1600 by 900, H.264/AAC)

Project thumbnail: `output/devpost/03-directed-route.png`

Primary Codex Session ID: `019f7d6c-353b-7853-ac63-2a3e617a1587`

Contributor note: I designed and built There I Was end to end: Timeline parsing, trip detection, route reconstruction, GPT-5.6 direction, replay, EXIF photo sync, and memory-card export.

## Project story

### I wanted a Play button for my Timeline

Google Maps has years of my movements. Timeline can tell me where I stopped and how I got there, but revisiting a vacation still feels like reading a database. I wanted to watch the trip happen again.

There I Was imports a Google Maps Timeline JSON file, finds each trip between leaving Home and returning, names the places where I spent time, and rebuilds the route. The whole loop stays in view. An orange marker moves along the road while the path behind it turns green.

The included sample comes from my supplied Timeline export. It contains three trips: California, New York, and Italy. Every location and date in the sample came from that export.

### Start with California

California is the fastest judge path. It covers 3,030 miles, 23 nights, and nine named places on a road trip from Oklahoma to the West Coast and back.

1. Click `Try with Sample Data`.
2. Open `California` and wait for the route to finish preparing.
3. Click `Direct replay`.
4. When GPT-5.6 finishes, click `Play memory` and watch the chapters change on the map.

The replay ends with a 1080 by 1350 memory card containing the loop, dates, trip facts, and directed chapters. Save it as a PNG or use the browser share sheet.

### GPT-5.6 is the director

The model receives a compact Memory Dossier with named places, dates, time spent, travel modes, summarized movements, coverage gaps, and any answers the traveler supplied. The request is limited to that dossier; coordinates, Home, raw path points, source JSON, unrelated dates, and photo bytes remain in the browser.

A Netlify Function validates the dossier, calls `gpt-5.6` through the OpenAI Responses API, and requests a strict Zod-backed Structured Output. Requests use `store: false`. GPT-5.6 returns three to five chronological chapters, replay pacing, and timestamped captions. Chapter boundaries become map keyframes, and each caption appears on the route at its assigned time. The model can also ask questions that location data cannot answer. The traveler can edit every title and sentence.

That output is the replay plan. It controls the product's main interaction and supplies the language saved into the final memory card.

### Rebuilding a trip from a noisy export

The current mobile export is a top-level array that mixes visits, activities, path samples, and Timeline Memories. A Web Worker validates records one at a time with Zod, quarantines malformed entries, normalizes timestamps and numeric strings, rebuilds path timing from minute offsets, and removes duplicate visit hierarchies.

An offline GeoNames index turns coordinates into city, region, and country names. Home visits define trip boundaries. The detector ignores routine gaps, guards against relocations, groups meaningful destinations, and removes duplicate date ranges. That work produces a short trip list with useful titles instead of a dump of coordinates.

Recorded Timeline geometry stays intact. Sparse driving, walking, and cycling legs go through Mapbox Directions so they follow roads. Flights use great-circle arcs when the export identifies them. The first and last point of every trip is Home, which keeps the route honest and closes the loop.

Photos are optional. The browser reads EXIF capture time and GPS data, then places accepted photos on the map and in a filmstrip. Selecting a photo moves the replay to its timestamp. Playback brings the photo into view when the route reaches that moment. The photo bytes remain on the device.

IndexedDB stores the normalized Timeline, trip edits, route cache, prior directions, photos, and last view. Deleting imported data clears every store.

### Codex built it with me

I used one primary Codex task for the product contract, implementation, browser testing, debugging, deployment, and submission work. The first build exposed duplicate trip ranges, generic titles, a useless stop list, a badly fitted map, and straight lines between sparse points. Each browser pass turned one of those defects into a concrete fix.

The ugliest production bug was ordinary. My local OpenAI key worked, but the deployed function did not have it. A healthy fallback hid the missing secret. I added an explicit health response, configured production and preview contexts, adjusted the request budget within Netlify's function limit, and ran a live acceptance call. It returned a validated GPT-5.6 plan covering all nine named destinations.

The tests now require the public sample to produce exactly three trips with the expected dates. A private acceptance run imports 15,989 records and finds 28 unique named trips. Unit tests cover loop closure, route reconstruction, GPT plan validation, and EXIF handling. Playwright checks the one-screen landing page, sample import, private import, route replay, the saved artifact, and responsive layouts. A production scan fails if a private OpenAI key appears in browser assets.

### The honest edges

The importer targets the current Google Maps mobile export. Older Takeout formats still need adapters. A long route can take several seconds to build the first time, then the local cache makes later visits faster. The offline city index occasionally chooses a nearby city for a neighborhood or small town.

Place-label correction and directed video export are next. The Build Week version completes the full loop today: import a trip, direct the replay, play it, and keep the finished memory card.

## Built with

React, TypeScript, Vite, GPT-5.6, OpenAI Responses API, Structured Outputs, Codex, Zod, Web Workers, IndexedDB, Zustand, MapLibre GL JS, Mapbox Directions API, OpenFreeMap, GeoNames, exifr, Netlify Functions, Vitest, Playwright

## Judge testing note

Open https://thereiwas.dalmo.ai and click `Try with Sample Data`. Open `California` and wait for the route to finish preparing. Click `Direct replay`. When the page says `GPT-5.6 directed the replay`, click `Play memory`. Watch at least one chapter change on the map, then scroll to `Your memory card` and click `Save PNG`. No account or API key is required.

## Gallery order and captions

1. `03-directed-route.png`: GPT-5.6 turns the trip into timed chapters and captions that play on the map.
2. `04-gpt-direction.png`: Five editable chapters set the pace for a 23-night California road trip.
3. `05-memory-card.png`: The replay ends with a 1080 by 1350 memory card you can save or share.
4. `02-three-trips.png`: One Timeline export, three trips: California, New York, and Italy.
5. `01-landing.png`: Import a Google Timeline JSON file, or try three trips from the included sample.
