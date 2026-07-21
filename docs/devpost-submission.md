# Devpost submission draft

Project: There I Was

Category: Apps for Your Life

Tagline: Replay the trips hidden in your Google Timeline.

Live demo: https://thereiwas.dalmo.ai

Repository: https://github.com/DalmoMendonca/thereiwas

Demo video: https://youtu.be/P7AgqQWPYRE — 1:40, 1600 by 900, H.264/AAC

Primary Codex Session ID: `019f7d6c-353b-7853-ac63-2a3e617a1587`

## Project story

### I wanted to press Play

Google Timeline knows where I went, how long I stayed, and how I moved. I am fine with that collection. The bargain bothered me: years of detailed personal data, and the product still mostly gives me a log.

There I Was turns a current Google Maps Timeline export into trips I can replay. It finds each stretch between leaving home and returning home, names the cities where I spent meaningful time, and rebuilds the route. The finished map is a loop. Press Play and an orange marker follows the road while a green line records the path behind it.

GPT-5.6 handles the part telemetry cannot do well on its own. It turns the evidence into chapters, sets the replay pacing, and writes the captions that appear on the map. It can ask questions that only the traveler can answer, but it cannot invent the answers. The model directs. The person keeps authorship.

### Try three trips from my own Timeline

The landing page has two choices: import a Timeline JSON file or try the sample. The sample is a pared-down, consented excerpt from my export with my latest California, New York, and Italy trips. I removed every other trip and kept the same raw record shapes used by the normal importer. The app does not ship a fictional vacation.

California is the quickest judge path. The app finds a 23-night road trip from Oklahoma to the West Coast and back. Open it and the map fits the full route as tightly as possible. Sparse activity records are sent to Mapbox Directions, so interstate drives follow roads instead of drawing straight chords between Google samples. Recorded high-detail paths keep their original geometry. Missing joins are rebuilt, and route results are cached locally.

Photos are optional. Add a set from the trip and the browser reads their EXIF capture time and GPS position. Accepted photos appear as map points and a small filmstrip. Selecting one scrubs the replay to its time; playback brings each image into a restrained viewport when the marker reaches that part of the trip. Photo bytes stay on the device.

### The Timeline work happens in the browser

The current mobile export is a top-level array mixing visits, activities, path samples, and Timeline Memories. A Web Worker validates each record independently with Zod, quarantines malformed entries, normalizes timestamps and numeric strings, rebuilds path timestamps from minute offsets, and removes duplicate visit hierarchies.

An offline GeoNames index turns coordinates into cities, regions, and countries. Semantic Home visits define trip boundaries. The detector ignores short routine gaps, guards against relocations, groups meaningful destinations, and deduplicates exact date ranges. That is how the trip list gets useful titles such as California, Oklahoma City, and Italy instead of 28 copies of "A journey away from home."

The replay uses one clock for route progress, marker position, local date and time, travel mode, and photo moments. MapLibre renders OpenFreeMap tiles. Ground routes come from recorded Timeline evidence or Mapbox Directions. Flights use great-circle arcs when the export identifies them. Every trip is explicitly closed at Home.

IndexedDB stores the normalized Timeline, trip edits, route cache, prior directions, photos, and last view. Reloading restores the work. Deleting imported data clears every store.

### GPT-5.6 directs the map

When the user clicks **Direct replay**, the browser builds a compact Memory Dossier for that trip. It contains named places, dates, time spent, summarized movements, travel modes, coverage gaps, and answers the user typed. It contains no coordinates, home location, raw path points, source JSON, unrelated dates, or photo bytes.

A Netlify Function validates the dossier, calls the OpenAI Responses API through the official JavaScript SDK, requests a strict Zod-backed Structured Output from `gpt-5.6`, and validates the answer again. Every request uses `store: false`. The model returns three to five chronological chapters and timestamped captions. Those boundaries become replay keyframes, and the matching caption appears directly on the route as it plays. The instructions forbid invented activities, companions, purpose, emotion, weather, and events. If the provider fails or times out, the app returns a deterministic direction from the same named evidence.

The result does not end as another text panel. A local canvas renderer combines the completed route, dates, summary, trip statistics, and directed chapters or geotagged photos into a 1080 by 1350 memory card. The traveler can save it as a PNG or use the browser's native share sheet. The card never leaves the device unless the traveler chooses to share it.

The production failure I am happiest to have caught was painfully ordinary: the OpenAI key existed in my local `.env` but had never been added to the deployed Netlify contexts. The UI fell back correctly, which hid the deployment mistake. I added an explicit health response, fixed the production and preview secrets, extended the client budget within Netlify's 60-second function limit, and ran a live acceptance call. It returned a validated four-chapter GPT-5.6 direction with nine named destinations and no "Unnamed stop."

### Built with Codex, including the ugly parts

I used one primary Codex task for the product contract, implementation, browser inspection, debugging, deployment, and this submission. The public collaboration log records the mistakes instead of sanding them away.

The first version had duplicate trip ranges, generic titles, a useless stop list, a map zoomed too far out, and routes that looked like a child connected dots with a ruler. Browser screenshots forced each correction. The current route classifier measures the gaps between recorded points, sends sparse driving, walking, and cycling evidence through Directions, reconstructs missing joins, and asserts that the first and last coordinates are Home. Another production-only bug came from the default Vite minifier and left the map bundle throwing errors; switching the release build to esbuild fixed it.

Codex also wrote the tests that keep these fixes from slipping. The public sample must produce exactly three trips with the expected dates. A private acceptance run imports 15,989 records and requires 28 unique named trips. Unit tests cover loop closure and EXIF handling. The browser suite checks the one-screen landing page, sample import, real private import, route replay, and responsive layouts. A production scan fails if the OpenAI secret appears in browser assets.

### What remains

The importer is tuned for the current Google Maps mobile export. Older Takeout formats need adapters. First-time reconstruction of a long route can take several seconds, though the cache makes later visits immediate. The offline city index can choose a nearby city for a small town or neighborhood.

The next release should let users correct place labels and export the directed replay as video. The current Build Week version completes the first memory loop: open a trip, direct the map, watch the whole route, and keep the finished card.

## Built with

React, TypeScript, Vite, GPT-5.6, OpenAI Responses API, Codex, Zod, Web Workers, IndexedDB, Zustand, MapLibre GL JS, Mapbox Directions API, OpenFreeMap, GeoNames, exifr, Netlify Functions, Vitest, Playwright

## Judge testing note

Open https://thereiwas.dalmo.ai and click **Try with Sample Data**. Open California and wait for the road loop to finish preparing. Click **Direct replay**, wait for the live GPT-5.6 confirmation, and then click **Play memory**. Its chapters control the replay and its captions appear on the map. Finish by clicking **Save PNG** under **Your memory card**. Add geotagged photos only if you want to test the optional local photo sync.
