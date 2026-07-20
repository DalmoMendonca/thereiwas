# There I Was — competition jury

This rubric turns the four official Build Week criteria into evidence a judge can verify in under five minutes. A feature earns no credit merely because the README claims it exists.

## Rubric

| Criterion | Weight | What earns the points |
| --- | ---: | --- |
| Technological implementation | 25 | Codex contribution and traceability (8); useful, grounded GPT-5.6 integration (7); non-trivial correctness and tests (6); production reliability and security (4) |
| Design | 25 | Coherent end-to-end flow (7); visual hierarchy and craft (7); interaction quality and delight (6); accessibility and responsive behavior (5) |
| Potential impact | 25 | Real and specific audience/problem (7); complete solution to that problem (7); privacy and user trust (6); adoption evidence and credible distribution (5) |
| Quality of idea | 25 | Novelty versus existing travel journals (8); fit for “Apps for Your Life” (6); defensible product choices (6); memorable story and demonstration (5) |

Scoring bands: 95–100 is a category favorite with almost no judge-facing doubt; 90–94 is podium quality; 80–89 is strong but beatable; 70–79 is a good hackathon project; below 70 is not yet competitive.

## Brutal assessment

| Criterion | Score | Jury rationale |
| --- | ---: | --- |
| Technological implementation | 23/25 | This is real software, not a narrated prototype: worker parsing, normalization, explainable trip detection, deterministic playback, route provenance, IndexedDB persistence, strict Structured Outputs, Zod validation, rate limiting, fallbacks, unit tests, and hosted browser tests. GPT-5.6 has a constrained job and receives a minimized dossier. Points are withheld because real-world Google export formats remain broader than the fixtures, and enhanced ground routing depends on an optional provider token. |
| Design | 22/25 | The evidence/model/human division is unusually coherent. The 30-second replay, local-time HUD, route draw, evidence language, privacy inspector, editable chapters, and uncertainty labels feel like one product. It is responsive and keyboard-aware. Points are withheld because the world map is intentionally stylized rather than geographically rich, the densest Memory Director view asks a lot of a first-time user, and there has been no external usability study. |
| Potential impact | 19/25 | The problem is real: Timeline captures trips but does little to help people relive them. Local-first processing, explicit provenance, and human authorship make the solution trustworthy. The product can be tried without setup. The score stops here because there are no interviews, retention data, import-success telemetry, or testimonials from people using their own exports. “People who travel” is still a broad market, and export friction is outside the app's control. |
| Quality of idea | 22/25 | The best idea is not “AI travel journal.” It is a three-part authorship model: telemetry supplies evidence, GPT-5.6 supplies structure, and the person supplies meaning. That distinction is both novel and visible in the interface. Points are withheld because travel-memory products and auto-generated recaps already exist; the moat will depend on import quality, emotional taste, and trust rather than the broad concept alone. |
| **Total** | **86/100** | **Strong, memorable, and credible—but not remotely guaranteed to win.** A polished competitor with real-user evidence or a more instantly spectacular demo can beat it. |

## The exact route from 86 to 100

The missing points are not fourteen equally valuable features. Most are evidence that the current product works for real people with real exports.

| Criterion | Current | Missing points | Evidence required for full credit |
| --- | ---: | ---: | --- |
| Technological implementation | 23 | +2 | **+1:** Parse at least five genuine Timeline exports across known variants, publish a compatibility matrix, and retain anonymized regression fixtures. **+0.5:** Move the live GPT request behind a cancellable job with progress, timeout recovery, and production observability. **+0.5:** Add adversarial import tests for malformed, huge, duplicated, and timezone-hostile exports. |
| Design | 22 | +3 | **+1:** Make the first Memory Director view a single clear director's cut and reflection prompt; reveal provenance on demand. **+1:** Pass a documented keyboard, screen-reader, 200% zoom, reduced-motion, contrast, and touch-target audit on desktop and mobile. **+1:** Add an exportable vertical recap whose captions, timing, and provenance remain editable before export. |
| Potential impact | 19 | +6 | **+2:** Run 8–12 unmoderated or lightly moderated sessions and publish task success, time to first replay, certainty comprehension, and the failures. **+1:** Report real-import success by export variant. **+1:** Show that users keep or share an exported recap. **+1:** Name a sharp beachhead audience and a plausible path to reach it. **+1:** Add credible quotes or follow-up intent from people who used their own data. |
| Quality of the idea | 22 | +3 | **+1:** State the competitive distinction against Timeline, Google Photos, Polarsteps, and Relive in one glance. **+1:** Turn provenance plus human-supplied meaning into a defensible memory graph rather than a one-off generated recap. **+1:** Demonstrate a signature emotional reveal that competitors cannot reproduce from photos alone. |
| **Total** | **86** | **+14** | **100 requires product proof, experience proof, and differentiation proof—not a longer feature list.** |

## Highest-return work before the deadline

1. Test three to five genuine exports. Fix only blockers, record exact results, and add the compatibility table to the README and submission.
2. Run five cold usability sessions. Measure time to first replay, whether the person understands uncertainty, and whether they can add a memory without help.
3. Tighten the submission around one contrast: Timeline gives you a log; There I Was gives you an editable replay without letting the model rewrite your life.
4. Add a compact comparison table to the submission. Make privacy, explainability, synchronized replay, and human authorship the axes.
5. Do not spend the final day adding speculative surface area. The live product already demonstrates enough breadth; the judge-facing weakness is independent proof.

## Post-deadline route to a true 100

1. Add a local, editable vertical-video export with burned-in captions and provenance.
2. Build a durable import compatibility suite from consented, anonymized real exports.
3. Add richer place naming and optional photo matching without sending raw location history to a server.
4. Simplify Memory Director through progressive disclosure, then validate the revision with the same usability tasks.
5. Measure repeat use after a second trip. A memory product is only proven when people choose to return.

## Improvements completed before submission

- Replaced generic hackathon copy with a specific claim and an inspectable build story.
- Added a no-setup generated sample that exercises the real parser and inference path.
- Made route source, gaps, trip boundaries, certainty, and model payload visible in-product.
- Validated the production GPT-5.6 path under the host's function timeout and preserved a deterministic fallback.
- Added a public live deployment, public repository, judge instructions, tests, screenshots, and a narrated demo that explicitly covers both Codex and GPT-5.6.

The honest submission strategy is to make the current 86 impossible to dismiss, not to pretend it is already a 100.
