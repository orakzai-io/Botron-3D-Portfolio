# Implementation Plan

**Goal:** Ensure the NEXBOT bot hides on the GPU-heavy beats, fix the malformed/nested **Projects** section, and replace the placeholder About text with the real bio — preserving the current NEXBOT aesthetic and leaving the camera logic untouched.

## Overview
Audit confirmed bot-hiding is **already correctly wired** end-to-end (config flags -> `camera-story.js` gate -> `robot.js` visibility short-circuit -> `main.js` gaze skip), so no change is required there. The real defects are in `index.html`: a **duplicate `<section id="projects">` opener** (lines 620 and 623) that nests Education/Testimonials/Contact and corrupts beat/camera offsets, plus a **leftover placeholder** for the About bio. This plan fixes both, deriving the About text from `my_website/src/html/about.html` (read-only data source — nothing there is modified).

## Scope
- Bot visibility is driven only by the `bot` flag in `js/webgl/config.js` POSES. Current: hero/about/skills/contact `true`; experience/projects/education/testimonials `false`. Matches the goal -> **leave untouched**.
- "Forget the camera - i will handle it" -> **no changes** to `camera-story.js`, `gaze.js`, `robot.js`, or POSES coordinates.
- Aesthetic preserved: only placeholder text + duplicate markup change.

## Types
None - static HTML + plain ES modules, no type system. POSES/GAZE_TARGETS shapes unchanged.

## Files
**Modified:** `c:\Users\shahs\project\modern-portfolio\index.html`
1. **Remove duplicate Projects opener** - delete the empty `<section ... id="projects">` at line 620 + the stray `<!-- Projects Section -->` comment at 622, keeping the populated opener at 623. Result: `getElementById('projects')` returns the real section; `education`/`testimonials`/`contact` un-nest and become siblings again (fixes camera beat offsets).
2. **Consolidate duplicated Experience comment** - collapse the doubled `<!-- Experience & Career Section -->` at lines 570-571.
3. **Replace About placeholder** (line 524) with a concise NEXBOT-voice bio from legacy `about.html` facts (4.0 CGPA BSCS, Full-Stack AI Engineer, 10-yr National Swimmer/Gold, sub-250ms RAG + pgvector, Docker/CI, 50k+ records, KP Swimming IT Manager + coach of 30+, chess). Tag chips stay as-is.

**Reference (read-only):** `my_website/src/html/about.html`
**Unchanged (intentional):** `config.js`, `camera-story.js`, `gaze.js`, `robot.js`, `scene.js`, `main.js`, `ui.js`, all CSS, and `debug-camera.js` (user handles camera).

## Functions / Classes / Dependencies
None - import map already provides three/three-addons/gsap/ScrollTrigger/lenis and is working.

## Testing
1. Serve locally (`python -m http.server` or Live Server).
2. Console: `document.querySelectorAll('[id=projects]').length === 1`; `education/testimonials/contact` are siblings of `projects` (`parentElement.id`).
3. Bot visible on hero/about/skills/contact; hidden on experience/projects/education/testimonials.
4. 8 beats land correctly, no mid-beat teleport.
5. About shows real bio; no `[ placeholder` text remains (grep returns none in body).

## Implementation Order
1. Re-read lines ~617-745 fresh to lock exact line numbers.
2. Remove duplicate Projects opener + consolidate Experience comment.
3. Replace About placeholder bio.
4. Grep-check single `id="projects"` and no `placeholder`.
5. Manual browser test; summarize changes.
