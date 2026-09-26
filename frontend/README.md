# Frontend

The 3D portfolio itself — everything that runs in the browser. The RAG service lives
in [`../backend`](../backend/README.md); this directory is documentation for the code
in the repository root, since the frontend *is* the root.

## Stack

Vanilla ES modules, no framework. Three.js for the 3D stage, GSAP ScrollTrigger +
Lenis for motion, Vite for bundling. No React, no CSS framework — the design system
is ~3,000 lines of hand-written CSS driven by custom properties.

## Boot sequence

Load order is deliberate and load-bearing:

```
index.html  ──▶  paints immediately (content first, not a spinner)
   │
boot-gate.js ──▶  owns the reveal; releases the overlay when fonts are ready
   │
main.js     ──▶  double requestAnimationFrame
   │              └─ guarantees ≥1 painted frame before the stage chunk downloads
   │
stage.js    ──▶  dynamic import — 3D hydrates after the shell is visible
```

The robot scales in from 0.2 when it lands, so the late arrival reads as a feature
rather than a pop. `BOOT_MAX_MS` hard-releases the overlay at 3.5s even if the model
hasn't arrived, so a slow network degrades to "page then bot" instead of a hang.

## Source map

| File | Responsibility |
| :--- | :--- |
| `js/main.js` | Entry. Disables scroll restoration, schedules the stage import |
| `js/boot-gate.js` | Boot overlay lifecycle; releases on `document.fonts.ready` |
| `js/stage.js` | Owns renderer, camera story, gaze, telemetry, the render loop |
| `js/webgl/scene.js` | Renderer, camera, lights, dust particles, controls shim |
| `js/webgl/robot.js` | GLB load, Meshopt decode, procedural LED eyes, idle motion |
| `js/webgl/gaze.js` | Projects the cursor to world space, drives IK head tracking |
| `js/webgl/camera-story.js` | Scroll-driven camera choreography (GSAP scrub) |
| `js/webgl/telemetry.js` | FPS / draw-call / triangle counters for the HUD |
| `js/ui/chat.js` | BOTRON: warm-up, fetch, photo layer, HTML sanitiser, lightbox |
| `js/ui/skills-globe.js` | 2D-canvas 3D projection of the skills graph |
| `css/base.css` | Reset, design tokens, typography |
| `css/theme.css` | Components, sections, the mobile layer |
| `css/chat.css` | Chat window, FAB, photo lightbox |

## Performance decisions

These were measured or benchmarked, not guessed:

**Low-power render path.** The renderer requests `powerPreference: 'low-power'`,
disables antialiasing and shadow maps, omits the ground plane, and runs 70 atmosphere
particles. A richer 380-particle tier can be restored from `docs/quality-tiers.md`, which is kept out of the published repo.

**Adaptive frame rate.** 60 FPS while scrolling, touching or tracking the cursor;
20 FPS when idle. A constant 60 wastes battery for a page nobody is animating.

**`content-visibility` disabled on mobile.** `contain-intrinsic-size: 1px 750px`
substitutes a fixed 750px placeholder when a section scrolls off-screen. On a phone
these sections are *taller* than 750px, so scrolling swapped real content for
placeholder boxes and produced large phantom gaps. Overridden to `visible` at ≤900px.

**`100svh`, not `100vh`.** `100vh` is the *tall* viewport on mobile — it includes the
area under the collapsing URL bar — so every section overhung the screen. An
`@supports` fallback covers older iOS.

**Assets are Vite imports, not strings.** The three photos use real `import`
statements. A bare `"assets/photo.webp"` string is invisible to the bundler, so it
works in dev and 404s in `dist/`. This was a real bug, caught by inspecting the build
output rather than the source.

**No `backdrop-filter`.** Frosted glass re-blurs everything painted behind it, every
frame, over an animating WebGL canvas. It was removed in favour of opaque panels.

## Mobile specifics

- `env(safe-area-inset-*)` on the FAB, status strip, and chat window (iOS home indicator)
- Chat FAB collapses to a 52px circle after 3.5s at ≤900px — expanded on load so the
  affordance exists without a hover to reveal it
- The collapse breakpoint is deliberately locked to the 900px rule that hides the 3D
  speech bubble; an earlier mismatch left 601–900px screens with neither
- The status strip's `MOUSE 0,0 · CURSOR TRK` readout is hidden on coarse pointers —
  it is meaningless on a device with no cursor

## Accessibility & fallbacks

- Every hover-only effect is inside `@media (hover: hover) and (pointer: fine)`
- The FAB collapse is skipped entirely under `prefers-reduced-motion: reduce`
- The lightbox is a `role="dialog"`, dismissible by Escape or tap
- `telemetry.js` and the skills globe degrade rather than throw

## Commands

```bash
npm run dev          # dev server
npm run build        # → dist/
npm run preview      # serve the production build locally
npm run fonts        # re-fetch self-hosted fonts
npm run format       # prettier
```

Always test the production build for asset regressions with `npm run preview` —
several bugs in this codebase (missing photo URLs, unused modules) only appear there.
