# Privacy and security

## Local by default

The imported Timeline file never becomes an upload. The browser reads it, sends the text to a same-origin Web Worker, normalizes it, and stores the derived dataset in IndexedDB. The app has no account, analytics tracker, cloud database, or background sync.

## External requests

Mapbox receives only coordinates required for a selected significant routing or geocoding job, and only when a URL-restricted public browser token is configured. Flights and unsupported modes never become ground-routing requests.

OpenAI receives one selected trip’s bounded Memory Dossier:

- title and trip dates
- duration, nights, and total distance
- destination IDs, safe names, arrivals, departures, and durations
- leg IDs, modes, dates, and distances
- day-level movement and significant transitions
- coverage gaps and uncertainty
- notes and reflection answers the user explicitly supplied

It does not receive the raw Timeline JSON, unrelated dates, home coordinates, complete path points, media, or provider keys. Home is represented as “Home.” The OpenAI request sets `store: false`.

## Request inspector

The interface shows provider, purpose, minimized payload size, time, and outcome. It never shows or logs secret values. The request preview explicitly reports zero raw path points.

## Server controls

The Netlify Function:

- accepts JSON POSTs only
- restricts CORS to production, Netlify previews, and local development
- limits request bodies to 48 KB
- validates the dossier before provider use
- limits repeated calls per client window
- keeps `OPENAI_API_KEY` server-side
- validates and strips the structured response
- returns sanitized errors or a deterministic fallback
- does not persist or intentionally log dossiers

Site headers restrict frame ancestors, content types, referrers, permissions, script/connect origins, and forms.

## Local deletion

**Delete my local data** clears normalized Timeline evidence, trip records, route cache, Memory Plans, story history, and last-view state from IndexedDB. Re-importing remains possible from the original file.

## Public repository controls

`.env`, raw Timeline filenames, databases, logs, and private media are ignored. The browser bundle uses only `VITE_MAPBOX_ACCESS_TOKEN`; `OPENAI_API_KEY` is never assigned a `VITE_` prefix. Staged diffs and secret scans are checked before push.

