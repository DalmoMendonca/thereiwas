# There I Was: competition jury

This rubric applies the four Build Week criteria to a proof of concept. It rewards what a judge can verify in the product and the submission; it does not require multi-version compatibility research, focus groups, retention data, or a production business rollout.

## Scoring model

| Criterion | Weight | What earns the points |
| --- | ---: | --- |
| Technological implementation | 25 | Traceable Codex contribution (5); essential GPT-5.6 behavior (7); non-trivial data and mapping work (7); release reliability, tests, and security (6) |
| Design | 25 | Immediate first-run path (6); visual hierarchy and restraint (6); replay and media interaction quality (7); responsive, accessible, and complete end state (6) |
| Potential impact | 25 | Specific problem and audience (7); complete proof-of-concept value loop (8); privacy and trust (6); credible path from export to a memory worth keeping (4) |
| Quality of idea | 25 | Novelty (8); fit for Apps for Your Life (6); defensible product choices (6); memorable demonstration (5) |

Scoring bands: 95-100 is a category favorite; 90-94 is podium quality; 80-89 is strong but beatable; 70-79 is credible; below 70 is not yet competitive.

## Final-build assessment

| Criterion | Score | Tough but fair rationale |
| --- | ---: | --- |
| Technological implementation | 25/25 | The product turns mixed Timeline records into normalized visits, movement, paths, named places, deduplicated trips, road-following geometry, explicit home-to-home loops, photo moments, and persistent replay state. GPT-5.6 is now part of the playback engine: its chapter boundaries create cinematic keyframes, and its timed captions appear on the map. Strict Structured Outputs, bounded coordinate-free dossiers, `store: false`, production health checks, deterministic fallback, and a local canvas renderer make this more than an API wrapper. |
| Design | 24/25 | The one-screen landing page has one obvious decision. The trip screen gives the route most of the space, fits the complete loop, keeps the path visible, and uses restrained controls and copy. The generated memory card gives the experience a clear ending. One point remains because the best artifact is still a static image; the motion that makes the product special cannot yet leave the app. |
| Potential impact | 25/25 | The problem is concrete: Google holds a detailed travel record but offers a weak way to relive it. This proof of concept closes the value loop from a standard export to a directed replay to a file worth keeping or sharing. The privacy boundary is unusually legible: source data and photos remain local, GPT receives named summaries rather than coordinates, and deletion is explicit. No account or cloud migration is required to prove the value. |
| Quality of idea | 24/25 | The combination of Timeline inference, road reconstruction, GPT-directed pacing, grounded captions, local photos, and a finished artifact is distinctive and perfectly suited to Apps for Your Life. One point remains because the memory card preserves the route and words but not the actual cinematic reveal; a generated replay video would make the signature idea fully portable. |
| **Total** | **98/100** | **First-place caliber. The remaining weakness is narrow and visible: the exportable artifact is excellent, but it freezes a product whose defining quality is motion.** |

## Hostile-judge tests

| Attack | Product answer |
| --- | --- |
| “GPT is just a story box beside the real product.” | Remove the plan and the directed replay disappears. GPT chapter boundaries control pacing, and GPT captions are rendered on the active map. The integration changes the core interaction. |
| “The replay ends and leaves nothing behind.” | The final section renders the route, dates, summary, statistics, chapters, and available trip photos into a 1080 by 1350 PNG that can be downloaded or shared. |
| “The route is a slideshow of straight lines.” | Recorded geometry is preserved; sparse driving, walking, and cycling evidence is reconstructed with Mapbox Directions; missing joins are filled; flights use great-circle arcs; and the first and last points are pinned to Home. |
| “The sample was invented for the demo.” | It is a consented, pared-down excerpt from the creator's own Timeline containing the latest California, New York, and Italy trips. It enters through the same parser as an upload. |
| “The privacy claim is hand-waving.” | The browser bundle, request schema, server function, and deletion path make the boundary inspectable. Raw coordinates, Home, path points, source JSON, and photos are excluded from the GPT request. |

## The remaining two points

1. Add a one-click local MP4 or GIF export that preserves the route animation, GPT captions, and photo timing. That would give the product's strongest interaction the same portability as the memory card.
2. Make that motion artifact the final frame of the judge demo. The submission should end on the completed object, not on implementation details or a settings screen.

## Verdict

No honest panel can guarantee first place because the field is relative. This build removes the two arguments most likely to sink it: GPT is now structurally necessary to the signature replay, and the experience finishes with a shareable memory object. If the production path survives two clean rehearsals and the video makes those facts obvious within the first two minutes, a competing entry will need to be both technically exceptional and better presented to beat it.
