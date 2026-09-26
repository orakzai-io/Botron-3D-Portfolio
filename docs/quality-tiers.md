# Quality tiers - REMOVED (archive + restore guide)

The site ships **one look on every device**. Everything that used to switch between a
"full / glass" presentation and a cut-down one was deliberately deleted. This file is the
archive: it keeps the original values so the glass design can be rebuilt later. Nothing
here is loaded at runtime.

Pointer comments in the source:
`index.html`, `css/nexus.css`, `css/chat.css`, `js/webgl/config.js`, `js/stage.js`,
`js/webgl/scene.js`, `js/ui/skills-globe.js`.

---

## What existed before (now deleted)

Two mechanisms with different triggers:

1. **CSS class `nx-lite` on `<html>`**, set by an inline script in `index.html`. It was
   set on **every** load (the script defaulted to the low tier), so the flat look is what
   every visitor actually saw. A second, identical rule block keyed on
   `@media (hover: none) and (pointer: coarse)` covered touch devices.
2. **A JS flag `IS_LOW_POWER`** (in `js/webgl/config.js`), derived from that class plus
   touch detection, and consumed by `scene.js`, `stage.js`, `camera-story.js` and
   `skills-globe.js`.

`?quality=lite` / `?quality=full` overrode the tier. `ENABLE_AUTO_TIER = false` disabled
the one-shot FPS watchdog, and the weak-device heuristic below it was unreachable dead
code (an earlier `if (q !== "full") { ...; return; }` always returned first).

---

## The permanent look (what the code does now)

Flat panels - the site has no live `backdrop-filter` blur. The mobile navigation
drawer is included in the flat panel set below.

| Element | Background now | Was (glass tier) |
| --- | --- | --- |
| `.nx-nav`, `.nx-bubble`, `.nx-btn`, `.nx-filter-pill`, `.nx-telemetry-hud`, `.nx-timeline-card`, `.nx-quote`, `.nx-proj`, `.nx-mini` | `rgba(8, 12, 22, 0.94)` | gradient / translucent + `backdrop-filter: blur(8-18px)` |
| `.nx-strip` | `rgba(6, 8, 12, 0.94)` | `rgba(6, 8, 12, 0.5)` + `blur(12px)` |
| `.nx-footer` | `rgba(5, 7, 12, 0.94)`, `border-top: 1px solid transparent` | `rgba(5, 7, 12, 0.88)` + `blur(16px)`, plus a two-layer gradient border trick that painted a cyan top hairline |
| `.nx-chat-fab`, `.nx-chat-window` | `rgba(6, 10, 20, 0.96)` | `blur(16px)` / `blur(28px)` |
| `.nx-timeline-card`, `.nx-proj`, `.nx-quote` | `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6)` | `0 8px 28px rgba(0, 0, 0, 0.35)` |
| `body::before`, `body::after` (aurora) | static gradients, `filter: none`, `animation: none` | `filter: blur(90px)` + infinite drift |
| `.nx-fx::before` (scanlines) | deleted - `mix-blend-mode: overlay` full-viewport layer | repeating-linear-gradient scanlines |
| `.nx-fx::after` (vignette) | kept, unchanged | same |

The live `backdrop-filter` declarations were removed from `base.css`; the explicit
`none` resets in `nexus.css` remain as a cache-safe guard. The flat backgrounds
only remain `!important` for `.nx-filter-pill`, `.nx-telemetry-hud`, and
`.nx-contact-info .nx-mini`, whose earlier `base.css` backgrounds are important.
Other backgrounds and the card shadows are normal-weight so the enhancement layer's
hover/active states can replace them. **If you restore the glass, remove this entire
flat-panel block first** so it cannot suppress the restored state styles.

---

## The deleted head script (verbatim, from index.html)

```html
<script>
    (function () {
        try {
            var NX_AUTO_TIER = false;
            var q = (location.search.match(/[?&]quality=(lite|full)/) || [])[1];
            if (q === "full") { window.__nxQualityReason = "forced ?quality=full"; return; }
            if (q === "lite") {
                document.documentElement.classList.add("nx-lite");
                window.__nxQualityReason = "forced ?quality=lite";
                return;
            }
            if (q !== "full") {  // always true here -> the flat tier was the default
                document.documentElement.classList.add("nx-lite");
                window.__nxQualityReason = "default: LITE (testing) - ?quality=full for heavy";
                return;
            }
            var n = navigator;
            var c = n.connection || n.mozConnection || n.webkitConnection || {};
            var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
            var weak = reduced || c.saveData === true || /(^|-)(2|3)g/.test(c.effectiveType || "") ||
                       (n.hardwareConcurrency && n.hardwareConcurrency <= 4) ||
                       (n.deviceMemory && n.deviceMemory <= 4);
            if (!weak) { window.__nxQualityReason = "auto: device meets all thresholds"; return; }
            document.documentElement.classList.add("nx-lite");
        } catch (e) { /* never block the page */ }
    })();
</script>
```

---

## The deleted JS

`js/webgl/config.js` exported:

```js
export const ENABLE_AUTO_TIER = false;
export const IS_LOW_POWER = (() => {
  if (typeof window === 'undefined') return false;
  const forced = new URLSearchParams(location.search).get('quality');
  if (forced === 'lite') return true;
  if (forced === 'full') return false;
  const lite = document.documentElement.classList.contains('nx-lite');
  const touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  return lite || touch;
})();
```

`js/stage.js` had a one-shot watchdog: it sampled the raw rAF cadence and, when
`ENABLE_AUTO_TIER` was true and frames averaged worse than 22ms (~45fps) over 120
samples while awake, it called `downgradeQuality()`, which did:

```js
document.documentElement.classList.add('nx-lite');
window.dispatchEvent(new CustomEvent('nx-lite-on'));
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 0.75));
keyLight.castShadow = false; ground.visible = false; particles.visible = false;
```

`js/ui/skills-globe.js` listened for the `nx-lite-on` event to switch to its 1x backing
store and 30fps budget at runtime.

---

## The low-power 3D values that are now hard-coded

The site always runs these now. The FULL-tier alternative is in brackets - it was
**never rendered for anyone**, because the head script forced the flat tier on every
load (including the author's own machine).

| File | Now | Full-tier value |
| --- | --- | --- |
| `scene.js` | `renderer.shadowMap.enabled = false` | `true` (PCFSoftShadowMap) |
| `scene.js` | ground plane not created | `PlaneGeometry(2400, 2400)` + `ShadowMaterial({ opacity: 0.32 })`, `y = -0.5`, `receiveShadow = true` |
| `scene.js` | `pCount = 70` dust particles | `380` |
| `stage.js` | idle FPS cap `20` (60 while interacting) | `24` |
| `camera-story.js` | `scrub: 0.25` | `0.4` |
| `skills-globe.js` | `dpr = 1` | `Math.min(window.devicePixelRatio, 2)` |
| `skills-globe.js` | `step = 2`, frame budget `33ms` (~30fps) | `step = 1`, `16.6ms` (~60fps) |
| `skills-globe.js` | `S = 0` (no `shadowBlur` on the globe) | `S = 1` (glow on) |

Note: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0))` in `stage.js` was
never tier-dependent - the `0.75` value only ever appeared inside the dead watchdog, so
nothing about render resolution changed.

---

## How to restore the glass / full tier

1. **CSS** - the flat rules sit in one place near the end of `css/nexus.css` (the
   `Flat panels` block, plus one rule in `css/chat.css`). Delete them, then re-add the
   glass declarations to each element's own rule (values in the table above), and restore
   the aurora `filter: blur(90px)` + `animation` and the `.nx-fx::before` scanline layer.
   Keep the vignette `.nx-fx::after` as-is.
2. **3D** - put the full-tier values back at the sites listed in the table above
   (`scene.js`, `stage.js`, `camera-story.js`, `skills-globe.js`).
3. **Tier switching (optional)** - re-add the head script above if you want the runtime
   class back. If you do, fix the unreachable branch: the weak-device heuristic must not
   sit behind an `if (q !== "full") { ...; return; }` that always fires.
4. **Re-test with the blur on** - `backdrop-filter` on the same element as
   `overflow: hidden`/`clip` is known to break the frosted glass in Safari and Chromium,
   which is why `.nx-timeline-card` uses a background-layer top bar and no clipping.

---

## Gotchas learned from removing this

- `.nx-drawer` was a **dead selector** (no element has that class). The real mobile drawer
   is `.nx-nav-drawer`; it is now explicitly included in the flat panel set so mobile
   never pays for a live `blur(24px)` backdrop pass.
- `.nx-footer`'s cyan top hairline never rendered: the flat `background !important`
  replaced both layers of its gradient-border trick. Restoring the footer means restoring
  `border-top: 1px solid transparent` **and** the two-layer background.
- The flat `!important` background rules must not cover interactive states. The
  base.css-important elements use matching important backgrounds; the other flat
  backgrounds and card shadows stay normal-weight so later hover rules can win.
  introduced by the removal.
- `css/nexus.css` and much of the JS here are **uncommitted working-tree changes**, so
  `git` cannot recover anything deleted in this refactor - this document is the archive.
