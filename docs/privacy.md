# Privacy and security

## Browser boundary

The browser reads the Timeline file, sends its text to a same-origin Web Worker, and stores the normalized result in IndexedDB. There is no account, analytics tracker, cloud database, or background sync.

MapLibre requests OpenFreeMap vector tiles derived from OpenStreetMap for the visible map. Mapbox receives up to 25 ordered coordinates for each sparse driving, walking, or cycling routing job, including missing joins that close the trip loop. It does not receive the Timeline file, place labels, story dossier, or photos.

Photo metadata and bytes stay in the browser. `exifr` reads them locally, and IndexedDB stores accepted photos under the selected trip. The finished memory card is also drawn locally. The app does not upload, host, or retain the generated PNG.

## GPT-5.6 boundary

OpenAI receives one selected trip's bounded dossier:

- title and dates
- named cities, regions, and countries
- arrivals, departures, and time spent
- movement modes, dates, and summarized distances
- day-level movement, coverage limits, and uncertainty
- notes and reflection answers supplied by the user

It does not receive the raw Timeline JSON, Home coordinates, raw coordinates, recorded path points, unrelated dates, media, or provider keys. The request uses `store: false`.

## Server controls

The Netlify Function exposes a metadata-only GET health response and accepts JSON POSTs for direction requests. It restricts origins, caps the body at 48 KB, validates the dossier before provider use, rate limits repeated calls per client window, keeps `OPENAI_API_KEY` server-side, validates the structured response, and returns a named-place local fallback when the provider is unavailable. It does not persist dossiers.

Provider failures are logged only as sanitized error messages for diagnosis. Dossier contents and keys are not logged.

## Deletion and repository controls

The imported-data disclosure includes a destructive action that clears normalized evidence, trips, routes, stories, photos, and view state from IndexedDB. `.env`, `.testing-data/`, known Timeline filenames, databases, logs, and private media are ignored. The production browser bundle must not contain `OPENAI_API_KEY` or any other server secret.

The public three-trip sample is a deliberately selected excerpt of the creator's Timeline export and is published with the creator's consent. It is public data once committed and deployed.
