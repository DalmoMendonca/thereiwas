# Build log

## 2026-07-20 - Direct-testing rebuild

- Replaced the landing page with one no-scroll import screen, a real three-trip sample, and the exact Google Maps export path.
- Cut the sample from the supplied Timeline export and verified that it detects exactly California, New York, and Italy.
- Added the missing Mapbox and OpenAI environment variables to production, deploy-preview, and branch-deploy contexts.
- Rebuilt sparse ground routes with Mapbox Directions, reconstructed gaps between legs, pinned both ends to Home, and versioned the route cache.
- Replaced the production minifier after browser testing found release-only map errors.
- Added local EXIF photo parsing, IndexedDB photo storage, map markers, a filmstrip, timestamp scrubbing, and a synchronized replay viewport.
- Added favicon, Apple touch icon, Open Graph metadata, and a social card captured from the real California route.
- Verified a live GPT-5.6 Structured Output with four chapters, nine named destinations, and no unnamed stops.
- Passed 20 unit tests, all six desktop/mobile browser runs, private 15,989-record import acceptance, bundle secret scanning, and manual desktop/mobile visual checks.
- Published deploy `6a5e49129efd2d5cc0281670` to `thereiwas.dalmo.ai` and repeated the private golden path against production: 28 trips, 55 map requests, a coordinate-free dossier, a live GPT-5.6 story, no unnamed stops, and no browser console errors.

## 2026-07-19 — Foundation and golden path

- Converted the authoritative spec into a product design contract.
- Selected a restrained atlas palette anchored in waypoint green, pure neutral surfaces, inky map fields, and a single vermilion moving marker.
- Verified current package versions and official OpenAI Structured Outputs guidance.
- Added React/Vite/TypeScript, Vitest, Playwright, IndexedDB, TopoJSON world geometry, Netlify configuration, and security headers.
- Generated the non-sensitive Iceland sample fixture.
- Implemented worker parsing, normalization, home inference, explainable trip detection, trip records, route provenance, deterministic playback, cinematic time allocation, Memory Dossier minimization, cached sample plan, GPT-5.6 function, and correction loop.
- Diagnosed and fixed a nested-visit duplicate trip bug through live browser testing.
- Corrected playback local time and versioned route cache.
- Verified strict typecheck, unit tests, production build, desktop rendering, sample import, and playback.

## 2026-07-19 — Production release hardening

- Published the public repository at `github.com/DalmoMendonca/thereiwas` and connected Netlify continuous deployment to `main`.
- Created an isolated `thereiwas` Netlify project after detecting an unrelated parent-folder project link before deployment.
- Added the server key as an unreadable Netlify secret. Netlify CLI 24 initially used the team display slug and silently failed to create the variable; the environment API with the canonical account slug fixed the production injection.
- Tuned GPT-5.6 Structured Outputs to low reasoning, no retries, and a 24-second client budget after live testing exposed Netlify's 30-second synchronous function ceiling.
- Expanded the in-memory guard to twelve calls per ten minutes and made rate limiting return a useful grounded plan instead of an error.
- Verified live GPT-5.6 output through the production function and UI.
- Added and verified `thereiwas.dalmo.ai` through Netlify DNS, including HTTPS and security headers.
- Linked the GitHub repository to Netlify for branch and pull-request deploys.
- Passed the hosted golden path in desktop Chromium and mobile WebKit.

## Submission status

- The current Devpost copy and 91/100 jury assessment are complete in `docs/devpost-submission.md` and `docs/judge-rubric.md`.
- The Devpost browser session expired before the draft could be saved. GitHub and Google OAuth both require a fresh sign-in.
- The existing video remains unchanged. A new recording is intentionally held until the final product is approved.
