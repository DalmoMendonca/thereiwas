# There I Was

There I Was imports a Google Timeline JSON export, finds real trips, names the significant places, and replays the complete route. GPT-5.6 can turn one selected trip's minimized evidence dossier into an editable story draft.

This branch is the product reset awaiting final approval. The existing public demo and video have not been replaced.

## What changed

- Removed the public sample journey and every fake-data entry point.
- Replaced the landing page with one no-scroll import screen.
- Deduplicated Timeline hierarchy records before trip detection.
- Recognized the activity labels used by current Timeline exports.
- Added an offline GeoNames city index for city, state, and country labels.
- Detects journeys between actual returns to semantic Home records.
- Titles trips by their dominant city, state, or country and lists significant cities chronologically.
- Replaced decorative route previews with a MapLibre replay on OpenFreeMap vector tiles derived from OpenStreetMap.
- Fits the full home-to-home path and keeps it visible throughout playback.
- Separates recorded routes from honest dashed fallback geometry.
- Sends GPT-5.6 named places, dates, travel modes, and summarized legs instead of coordinates or raw paths.

## Run locally

```bash
pnpm install
pnpm dev
```

Node.js 22.12 or newer is required.

Copy `.env.example` to `.env` to configure optional providers:

```dotenv
VITE_MAPBOX_ACCESS_TOKEN=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
```

`VITE_MAPBOX_ACCESS_TOKEN` is only used to route sparse driving, walking, and cycling legs. Recorded Timeline paths work without it. Run `npx netlify dev` to exercise the server-side story function locally.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm test:privacy
```

The committed browser suite verifies the minimal landing screen. When `.testing-data/location-history.json` is present locally, it also imports the private acceptance export and verifies 28 unique named trips, meaningful titles, no unnamed stops, the map, miles, and playback.

## Architecture

1. A Web Worker validates and normalizes visits, movement, recorded paths, and Timeline Memories.
2. Exact duplicate visit intervals are collapsed with semantic Home records preferred.
3. The local gazetteer resolves coordinates to nearby cities, regions, and countries.
4. Home returns define trip boundaries; relocation and long-gap guards prevent false journeys.
5. MapLibre displays recorded geometry first and optional provider-routed or dashed fallback geometry second.
6. The browser stores normalized data, edits, routes, and stories in IndexedDB.
7. The selected trip becomes a coordinate-free dossier. A Netlify Function validates it, requests a strict GPT-5.6 Structured Output with `store: false`, and validates the result again.

See [docs/architecture.md](docs/architecture.md) for more detail.

## Data sources

Place names are derived from [GeoNames](https://www.geonames.org/) data under CC BY 4.0. The map uses [OpenFreeMap](https://openfreemap.org/) vector tiles derived from [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), with visible attribution in the product.

## Privacy boundary

- The raw Timeline file remains in the browser.
- GPT-5.6 receives only the selected trip's named destinations, dates, summarized movement, coverage limits, and user answers.
- Raw coordinates, Home coordinates, full-resolution paths, unrelated dates, and the source file are excluded from the story request.
- `OPENAI_API_KEY` remains server-side and must never use a `VITE_` prefix.

## License

[MIT](LICENSE) © 2026 Dalmo Mendonca.
