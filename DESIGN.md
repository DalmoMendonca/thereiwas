---
name: There I Was
description: A cinematic personal atlas built from truthful location evidence.
colors:
  canvas: "oklch(1 0 0)"
  atlas-surface: "oklch(0.968 0.006 150)"
  atlas-surface-strong: "oklch(0.92 0.012 150)"
  ink: "oklch(0.18 0.018 150)"
  ink-soft: "oklch(0.39 0.022 150)"
  waypoint-green: "oklch(0.52 0.142 150)"
  waypoint-green-deep: "oklch(0.39 0.112 150)"
  waypoint-green-pale: "oklch(0.92 0.04 150)"
  moving-marker: "oklch(0.61 0.19 32)"
  night-sea: "oklch(0.13 0.025 164)"
  land: "oklch(0.25 0.04 154)"
  border: "oklch(0.84 0.012 150)"
typography:
  display:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "clamp(3.25rem, 5.4vw, 5.9rem)"
    fontWeight: 600
    lineHeight: 0.96
    letterSpacing: "-0.036em"
  headline:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "clamp(2.2rem, 3.7vw, 3.8rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, Segoe UI, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 760
    lineHeight: 1.2
    letterSpacing: "0.055em"
rounded:
  control: "6px"
  container: "10px"
  feature: "14px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.waypoint-green-deep}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 15px"
    height: "44px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
    height: "44px"
  map-canvas:
    backgroundColor: "{colors.night-sea}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.container}"
---

# Design System: There I Was

## Overview

**Creative North Star: "The Living Atlas"**

There I Was feels like a beautifully edited atlas that wakes up when the user presses Play. The product surrounding the map is quiet, exact, and familiar; the journey canvas earns the drama. White work surfaces and near-black ink establish trust, while waypoint green marks actions and evidence. The moving marker alone carries vermilion, so the eye always knows where “now” is.

The system is editorial without becoming a travel magazine and cinematic without turning the product into a trailer. It rejects the utilitarian log of Google Timeline, generic SaaS dashboard grammar, scrapbook nostalgia, surveillance aesthetics, neon AI gradients, decorative glass, and chat-first interaction.

**Key Characteristics:**

- Pure white product surfaces interrupted by a deep geographic canvas.
- Editorial serif for memory and journey statements; system sans for every task and datum.
- Restrained component motion; expressive playback motion only.
- Dense evidence where inspection matters, generous whitespace where reflection matters.
- Square-enough controls and modest 6–14px radii; pills only for compact status.
- Grounding, privacy, and uncertainty expressed as ordinary product affordances.

## Colors

The palette is a daylight atlas wrapped around a night-sea playback field: neutral surfaces, living green evidence, and one moving ember.

### Primary

- **Waypoint Green:** Marks primary state, observed evidence, successful import, and active route progress.
- **Deep Waypoint:** Carries primary button fills and dark brand statements with white text.
- **Pale Waypoint:** Provides selected, grounded, and observed-state backgrounds without turning the page green.

### Secondary

- **Moving Marker:** Vermilion is reserved for the current point in motion, scrubber thumb, and the rare urgent cue. It is not decorative.

### Neutral

- **Canvas:** Literal white is the primary work surface.
- **Atlas Surface:** A minimally green-tinted neutral separates reports, statistics, and local previews from Canvas.
- **Ink / Soft Ink:** Near-black brand-hued text and its compliant supporting-text counterpart.
- **Night Sea / Land:** The deep map material. Land remains subordinate to the route and labels.
- **Border:** Quiet structural division; it never pairs with a diffuse decorative shadow.

### Named Rules

**The Moving Ember Rule.** Vermilion marks the current location or genuinely urgent state. If it appears elsewhere for decoration, the map loses its visual compass.

**The Ten Percent Rule.** Waypoint green stays under roughly ten percent of light product surfaces. The dark map may carry more green because geography is the content.

**The Truthful Route Rule.** Observed, enhanced, great-circle, and fallback geometry remain visually and semantically distinguishable.

## Typography

**Display Font:** Iowan Old Style (with Palatino and Georgia fallback)
**Body Font:** Inter (with system UI and Segoe UI fallback)
**Label/Mono Font:** System UI; tabular figures for live time and distance

**Character:** The serif supplies documentary authority and reflective warmth without costume. The sans disappears into controls, evidence, timestamps, and structured model output. Their contrast is deliberate: story versus operation.

### Hierarchy

- **Display** (600, up to 5.9rem, 0.96): Homepage thesis and the rare full-journey statement; letter spacing never tighter than -0.036em.
- **Headline** (600, up to 3.8rem, 1.02): Trip titles, evidence conclusions, and Memory Director titles.
- **Title** (600–700, 1.45–2rem): Chapter titles, panels, and significant place names.
- **Body** (400, 1rem, 1.65): Explanations and story prose, normally capped at 65–75 characters.
- **Label** (760, 0.78rem, 0.055em): Sparse evidence/status labels. Uppercase is allowed only for compact, functional metadata—not above every section.

### Named Rules

**The Two Voices Rule.** Serif expresses journey and memory; sans performs every task. Never set buttons, inputs, labels, or dense data in the display serif.

**The Quiet Data Rule.** Time, distance, and confidence use tabular figures and steady scale. They support the route; they do not become a hero-metric template.

## Elevation

The system is flat by default. Depth comes from tonal contrast, document flow, map immersion, and state. The featured trip and transient overlays may use a compact structural shadow; bordered controls do not add broad soft shadows.

### Shadow Vocabulary

- **Structural lift** (`0 6px 8px oklch(0.16 0.02 150 / 0.09)`): Featured journey and create-trip workspace only.
- **Toast lift** (`0 4px 8px oklch(0.05 0 0 / 0.30)`): Temporary error feedback over the active surface.

### Named Rules

**The Flat Until Lifted Rule.** Resting panels use color and spacing. Shadows appear only when a surface truly sits above another surface or competes with moving content.

## Components

Controls are concise, familiar, and tactile. The distinctive character belongs to route playback and story structure, not reinvented buttons.

### Buttons

- **Shape:** Modestly curved controls (6px) with a 44px minimum height.
- **Primary:** Deep Waypoint fill, white text, 12px × 16px padding, and one-pixel upward hover response.
- **Hover / Focus:** Primary darkens; focus uses a high-contrast blue-cyan outline outside the control. Active returns to baseline.
- **Secondary / Ghost / Tertiary:** White with a structural border, or text-only for reversible low-emphasis actions. Destructive text is explicit red and never masquerades as a primary action.

### Chips

- **Style:** Full pills only for certainty, confidence, and provenance labels. Pale tonal fills carry dark readable text.
- **State:** Observed, inferred, and user-supplied certainty labels use distinct text plus color; color is never the sole signal.

### Cards / Containers

- **Corner Style:** Containers use 10px; visually dominant feature surfaces may use 14px. Nothing reaches 32px.
- **Background:** Canvas for work, Atlas Surface for grouped evidence, Night Sea for playback.
- **Shadow Strategy:** Flat at rest; structural lift only for the featured journey and active creator.
- **Border:** Full horizontal or enclosing borders only. Colored side stripes are prohibited.
- **Internal Padding:** 16–40px based on density and viewport.

### Inputs / Fields

- **Style:** White field, one-pixel Border stroke, 6px radius, 44px minimum height.
- **Focus:** Three-pixel external focus outline with offset; no glow.
- **Error / Disabled:** Error text is explicit and near the field; disabled controls retain legibility and lose interaction emphasis.

### Navigation

The brand mark, one contextual back action, local-processing status, and one primary task form the complete application navigation. Mobile removes nonessential status text before compressing actions. No deferred-feature navigation exists.

### Cinematic Map

The map is the signature component: local public-domain topology, progressive route, source-aware base trace, moving marker, local clock, odometer, current mode and place, camera keyframes, scrubber, speed controls, and final reveal. It uses a single deterministic frame clock and a reduced-motion alternative.

### Memory Director

Memory Director is a structured editorial surface, never a chat. Chapters are inline editable; highlights disclose grounding IDs and certainty; reflection questions visibly separate human meaning from model structure; the request inspector explains exactly what left the browser.

## Do's and Don'ts

### Do:

- **Do** make the route the largest and most expressive object on a trip screen.
- **Do** use Canvas for normal work and Night Sea only when geography or playback is active.
- **Do** reserve Moving Marker vermilion for current location, scrub state, and urgent feedback.
- **Do** use 6px controls, 10px containers, 14px feature surfaces, and 999px only for compact status.
- **Do** label observed, inferred, and user-supplied content in text.
- **Do** keep every animation meaningful, interruptible, keyboard-operable, and safe under reduced motion.
- **Do** preserve “Timeline-only must feel complete”; never render empty media slots.
- **Do** let privacy be felt through local behavior and contextual request inspection.

### Don't:

- **Don't** reproduce Google Timeline as a utilitarian log of rows with weak playback and no emotional structure.
- **Don't** build a generic SaaS dashboard with interchangeable statistic cards, a permanent sidebar, or setup funnels.
- **Don't** use neon AI gradients, gradient text, glassmorphism, or chat-first model interaction.
- **Don't** make a scrapbook or photo-album interface that implies memories require media.
- **Don't** resemble a surveillance dashboard or foreground raw coordinates and developer internals.
- **Don't** use parchment, stamps, doodles, handwritten scripts, or nostalgic travel-journal decoration.
- **Don't** use colored side-stripe borders, decorative grid backgrounds, repeating diagonal stripes, or sketch-style SVG illustration.
- **Don't** pair a one-pixel border with a diffuse shadow of 16px blur or more.
- **Don't** exceed 14px radius on cards and sections, or use pills for ordinary buttons.
- **Don't** put tiny uppercase tracked eyebrows or numbered markers above every section.
- **Don't** invent companions, purpose, activity, emotion, weather, or events missing from evidence.

