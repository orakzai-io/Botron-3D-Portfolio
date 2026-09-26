// js/boot-gate.js — the single authority for revealing the site.
// Imported FIRST by js/main.js: ESM evaluates dependencies in order, so this
// module's listeners exist before any other module's top-level code runs.
//
// Signals (all async, delivered via signalBoot()):
//   firstFrame — stage.js, after the first renderer.render()
//   model      — robot.js, two rAF ticks after the bot is added to the scene
//   fonts      — here, once document.fonts settles (raced with a short timeout)
//
// Release rule: every required signal in AND BOOT_MIN_MS elapsed — OR the
// BOOT_MAX_MS absolute deadline is hit, whichever comes first. Deadlines use
// performance.now() directly because it already counts from navigation start;
// subtracting a script-start t0 would undercount by the whole JS parse.
//
// index.html carries the nets for the "bundle never evaluated" case (a failed
// SCRIPT error listener + an 8s backstop) and sets window.__bBootInit's
// counterpart state; this module owns the reveal from the moment it evaluates
// and marks that with window.__bBootInit / window.__bBootDone.
import { BOOT_MIN_MS, BOOT_MAX_MS, BOOT_FONTS_TIMEOUT_MS } from './webgl/config.js';

window.__bBootInit = true;

// Progressive hydration: release on fonts ONLY (≤ BOOT_FONTS_TIMEOUT_MS plus a
// few frame ticks). The stage chunk hydrates right after the shell paints, and
// the 583 KB bot streams in behind the content and scales up smoothly when it
// lands — the user reads the page while the 3D boots, never a spinner.
const REQUIRED = new Set(['fonts']);

const seen = new Set();
let released = false;

function release() {
  if (released) return;
  released = true;
  window.__bBootDone = true;
  window.removeEventListener('visibilitychange', onVisibilityChange);
  document.body.classList.add('intro-complete');
  if (import.meta.env.DEV) {
    console.debug(
      '[boot-gate] released at',
      Math.round(performance.now()) + 'ms',
      'signals:',
      [...seen].join(',') || 'none'
    );
  }
}

// A hidden tab never renders (stage.js bails before renderer.render), so
// firstFrame would never arrive. Nobody is watching — release immediately.
function onVisibilityChange() {
  if (document.hidden) release();
}

function maybeRelease() {
  const now = performance.now();
  if (now >= BOOT_MAX_MS) return release(); // absolute deadline from page load
  if (now < BOOT_MIN_MS) return setTimeout(maybeRelease, BOOT_MIN_MS - now);
  for (const s of REQUIRED) if (!seen.has(s)) return;
  release();
}

if (document.hidden) release();
else window.addEventListener('visibilitychange', onVisibilityChange);

// Fonts come from fonts.googleapis.com and can stall for seconds when slow or
// blocked — race them against BOOT_FONTS_TIMEOUT_MS so they never gate alone.
const fontsReady =
  document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
Promise.race([
  fontsReady,
  new Promise((resolve) => setTimeout(resolve, BOOT_FONTS_TIMEOUT_MS)),
]).then(() => {
  seen.add('fonts');
  maybeRelease();
});

// Kick the deadline check once, in case the gate evaluated past BOOT_MAX_MS.
maybeRelease();

export function signalBoot(name) {
  if (released || seen.has(name)) return;
  seen.add(name);
  maybeRelease();
}
