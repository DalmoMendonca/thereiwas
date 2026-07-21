---
name: There I Was
description: A quiet interface for replaying real trips.
colors:
  paper: "#fbfbf8"
  surface: "#f3f3ef"
  ink: "#171815"
  ink-soft: "#5f625a"
  ink-faint: "#7c8076"
  line: "#d9dad2"
  line-strong: "#a9ada3"
  action: "#146b4e"
  action-dark: "#0c503a"
  current-location: "#d65332"
  danger: "#9b2c22"
  danger-dark: "#681b16"
  toast-border: "#3b3c37"
  toast-muted: "#c8cac2"
typography:
  family: "Aptos, Segoe UI Variable, Segoe UI, ui-sans-serif, system-ui, sans-serif"
  display: "700 / 0.98"
  body: "400 / 1.55"
rounded:
  control: "8px"
  field: "6px"
spacing:
  gutter: "clamp(20px, 4vw, 48px)"
  content: "1080px"
---

# Design system

## Direction

There I Was is deliberately quiet. The landing page contains the name, one sentence, one import action, and Dalmo's signature footer. The app uses a single sans-serif family, warm white paper, near-black type, thin rules, and one restrained green action color.

The map is the only visually complex surface. It shows the whole trip at once, preserves the complete path after playback, and uses orange only for the current position. There are no decorative illustrations, stock images, fake route thumbnails, feature cards, hero statistics, shadows, gradients, eyebrows, or ornamental motion.

## Layout

- Landing: exactly one viewport; centered import action; no scroll.
- Trips: one chronological ledger with title, significant-place trail, and compact date range.
- Trip: title, dominant replay, small side statistics, photo sync, GPT-directed chapters, a memory card, collapsed evidence, and plain authority actions.
- Mobile: the map stays first; statistics and controls move directly below it.

## Type

One system sans family performs every job. Large type is reserved for the product name and current trip title. Labels use normal case. Dates and statistics use tabular numbers where useful.

## Route language

- Recorded or provider-routed geometry: solid line.
- Missing local geometry: dashed line.
- Played progress: green line above the complete route.
- Current position: orange dot with a white edge.

The camera does not chase the marker. It fits the entire trip, because understanding the loop matters more than spectacle.

## Interaction

- Primary buttons: green, 44px minimum height, 8px radius.
- Secondary controls: paper background with a one-pixel rule.
- Destructive actions: red text, never a filled primary button.
- Editing: inline and reversible.
- Direction: structured fields and chapters, not chat. The generated chapter timing and captions appear on the map during replay.
- Artifact: a restrained 4:5 card containing the final loop, edited memory line, trip facts, and optional photos.

## Copy rules

Say what the control does. Prefer “Import Timeline JSON,” “Create trip,” “Direct replay,” “Play memory,” and “Save PNG.” Avoid metaphors, claims of magic, privacy speeches, fake intimacy, and explanations of implementation details unless a user opens the relevant disclosure.
