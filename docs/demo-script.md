# Three-minute demo script

## 0:00–0:20 — The problem

Open `https://thereiwas.dalmo.ai` in a private window.

“Google Timeline remembers where I went, but it gives me a log. There I Was turns that same data into a journey I can replay, understand, and correct.”

Choose **Try a sample journey**. Point out that no account, key, private file, OpenAI call, or Mapbox request is required.

## 0:20–0:45 — Real schema, real inference

Open the detected Iceland trip.

“The sample uses the same Web Worker parser and trip-inference pipeline as an upload. It normalized visits, activities, observed paths, numeric strings, time-zone offsets, and a Timeline Memory. The trip is explainable, not a black box.”

Show **Why this became a trip** and the coverage/boundary details.

## 0:45–1:30 — The centerpiece

Press **Play** in 30-second mode.

“One deterministic clock keeps the progressive route, marker, local time, odometer, transport mode, stops, and camera synchronized. Observed paths remain separate from great-circle, provider-enhanced, and explicit fallback geometry. Unsupported modes never silently become driving.”

Let the route finish on the summary.

## 1:30–2:20 — GPT-5.6 with humility

Choose **Direct my memory**.

“GPT-5.6 receives a compact, coordinate-free dossier for this trip—not the raw Timeline. Structured Outputs require chapters, grounded highlights, captions, questions, and uncertainty.”

Open **Why this moment?** and **What was sent?**. Show grounding IDs, certainty, zero raw path points, and the request inspector.

Answer: “The wind kept pushing the car sideways, and we kept laughing every time the road disappeared into mist.”

“That detail is now explicitly user-supplied. The model can restructure around it, but it cannot pretend it observed it.”

## 2:20–2:50 — Human authority

Return to journeys, choose **Create trip**, select any valid start and end date, name it “The south coast days,” and save. Edit the title or dates.

Reload.

“The manual trip and edits persist locally. Automatic detection proposes; the human decides.”

## 2:50–3:00 — Close

“There I Was makes a treasure trove of personal data useful without making the model the author of someone’s life. The evidence, the model, and the human each have a clear role.”

