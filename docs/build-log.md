# Build log

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

## Remaining submission operations

- Run the final custom-domain E2E and secret scan after the release push.
- Tag `v1.0.0-build-week` and create the GitHub release.
- Record and publish the sub-three-minute narrated demo.
- Fill the Devpost draft and record the judge rubric assessment.
