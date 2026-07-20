# There I Was: competition jury

This rubric turns the four official Build Week criteria into evidence a judge can verify in five minutes. Claims in a README earn nothing without a working product or test behind them.

## Scoring model

| Criterion | Weight | What earns the points |
| --- | ---: | --- |
| Technological implementation | 25 | Traceable Codex contribution (6); useful GPT-5.6 integration (6); non-trivial data and mapping work (7); production reliability, tests, and security (6) |
| Design | 25 | Clear first-run path (6); visual hierarchy and restraint (6); replay and photo interaction quality (7); responsive and accessible behavior (6) |
| Potential impact | 25 | Specific problem and audience (7); useful end-to-end solution (7); privacy and trust (6); adoption evidence and distribution (5) |
| Quality of idea | 25 | Novelty (8); fit for Apps for Your Life (6); defensible product choices (6); memorable demonstration (5) |

Scoring bands: 95-100 is a category favorite with almost no judge-facing doubt; 90-94 is podium quality; 80-89 is strong but beatable; 70-79 is a credible hackathon project; below 70 is not yet competitive.

## Post-rebuild assessment

| Criterion | Score | Tough but fair rationale |
| --- | ---: | --- |
| Technological implementation | 24/25 | This is real software: worker parsing, schema validation, trip inference, local place resolution, deduplication, Mapbox Directions with mode-aware sparse-route selection, explicit loop closure, IndexedDB caching, EXIF parsing, synchronized replay, a minimized GPT dossier, strict Structured Outputs, and production secret checks. Tests use three genuine public trips and a private 15,989-record export. One point remains because compatibility is proven against one person's export rather than several export versions and accounts. |
| Design | 23/25 | The rebuilt landing page is quiet and immediate. The trip page gives the route most of the screen, fits the full loop, keeps the final path visible, puts miles in a restrained rail, and ties photos to both place and time. The three-trip sample makes the product understandable without setup. Two points remain because no independent accessibility audit or cold usability study proves that first-time users understand route preparation, photo acceptance, and Memory Director without help. |
| Potential impact | 20/25 | The problem is specific and familiar: Timeline collects a rich personal history but offers a weak way to relive a trip. The product now delivers the complete first value loop from import to replay to editable story, with unusually clear privacy boundaries. Five points remain because there are no interviews, import-success metrics, testimonials, retention data, or evidence that anyone shared or kept a finished memory. The export step is still meaningful friction. |
| Quality of idea | 24/25 | A home-to-home replay built from Timeline evidence, corrected with road geometry, synchronized to a person's geotagged photos, and turned into a bounded story is a strong Apps for Your Life idea. The evidence/model/person authorship split is visible in the product. One point remains because travel recaps are a competitive space and the long-term moat is still a thesis, not proof. |
| **Total** | **91/100** | **Podium quality, but not a guaranteed winner. A simpler project with exceptional real-user proof or a flawless live demo can still beat it.** |

The rebuild earns five points over the original 86: +1 for a working production GPT path, +1 for real road-following loop reconstruction, +1 for synchronized geotagged photos, +1 for the focused landing and genuine three-trip sample, and +1 for stronger browser and production acceptance evidence. It does not earn points merely for having more features.

## The remaining nine points

| Criterion | Current | Gap | What would earn it |
| --- | ---: | ---: | --- |
| Technological implementation | 24 | +1 | Import five or more consented exports spanning Android/iOS and known schema variants; publish a compatibility matrix and retain anonymized regression fixtures. |
| Design | 23 | +2 | **+1:** Complete and publish a keyboard, screen-reader, 200% zoom, reduced-motion, contrast, and touch-target audit. **+1:** Run five cold sessions and fix every repeated first-run failure, especially route-loading comprehension, photo rejection feedback, and the transition into Memory Director. |
| Potential impact | 20 | +5 | **+2:** Test with 8-12 people using their own exports and report task success, time to first replay, and import failure rate. **+1:** Show that users save, revisit, or share the result. **+1:** Pick a beachhead audience and a credible way to reach it. **+1:** Add specific testimonials or follow-up intent from real use. |
| Quality of idea | 24 | +1 | Make the defensible memory graph tangible: editable identities for places and people, corrections that improve later trips, and a signature reveal built from the relationship between route, photos, and the user's own answers. |
| **Total** | **91** | **+9** | **A real 100 comes from compatibility, usability, and behavior evidence. Another feature sprint cannot manufacture those points.** |

## Highest-return work before judging

1. Test three more genuine exports. Record the device, export date, record count, detected-trip count, time to first replay, and every manual correction.
2. Put five people in front of the live URL without coaching. Measure whether they can reach a replay, understand the route, add a photo, and create a story.
3. Capture a new demo only after those sessions. Show the home screen for seconds, then spend the video on the California loop, one synchronized photo, the live GPT-5.6 result, and the privacy boundary.
4. Add one comparison image for Timeline, Google Photos, Polarsteps, and Relive. Use four concrete axes: Timeline import, road-following replay, evidence-bound story, and local photo handling.
5. Treat any production failure during two consecutive full rehearsals as release-blocking.

## Verdict

There I Was is now coherent, technically substantial, and easy to judge. Its remaining weakness is external proof. The fastest route to a first-place-caliber entry is to put the current product in unfamiliar hands, publish what happened, and use that evidence to make the demo impossible to dismiss.
