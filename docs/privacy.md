# Privacy and security

## Browser boundary

The browser reads the Timeline file, sends its text to a same-origin Web Worker, and stores the normalized result in IndexedDB. There is no account, analytics tracker, cloud database, or background sync.

MapLibre requests OpenFreeMap vector tiles derived from OpenStreetMap for the visible map. When a browser-safe, URL-restricted Mapbox token is configured, Mapbox receives only the start and end coordinates of sparse driving, walking, or cycling legs selected for route enhancement.

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

The Netlify Function accepts JSON POSTs only, restricts origins, caps the body at 48 KB, validates the dossier before provider use, rate limits repeated calls per client window, keeps `OPENAI_API_KEY` server-side, validates the structured response, and returns a named-place local fallback when the provider is unavailable. It does not persist dossiers.

Provider failures are logged only as sanitized error messages for diagnosis. Dossier contents and keys are not logged.

## Deletion and repository controls

The imported-data disclosure includes a destructive action that clears normalized evidence, trips, routes, stories, and view state from IndexedDB. `.env`, `.testing-data/`, known Timeline filenames, databases, logs, and private media are ignored. The production browser bundle must not contain `OPENAI_API_KEY` or any other server secret.
