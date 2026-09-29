// js/main.js — instant entry point.
// boot-gate.js is imported FIRST: ESM evaluates dependencies in order, so its
// listeners exist before any other module's top-level code runs. It owns the
// reveal and releases on fonts, which is what lifts the .bt-boot overlay that
// index.html paints. The 3D stage is hydrated AFTER that gate releases
// (progressive hydration), and the bot scales in when its GLB lands, so the
// late arrival reads as a feature rather than a pop.
import './boot-gate.js';

// Chromium restores the previous scroll position before this module evaluates,
// which makes camera-story's applyCameraFromScroll() see a non-zero Y and can set
// botVisible=false before the hero has rendered — bot invisible on reload. The
// inline script at the end of index.html already does this earlier (it is the
// only slot guaranteed to run before any module), so this is a belt-and-braces
// repeat for the case where that block has not parsed yet.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// Double-rAF guarantees at least one painted frame before the (large) stage
// chunk starts downloading/parsing, so the shell is on screen first.
const hydrate = () => {
  requestAnimationFrame(() => requestAnimationFrame(() => import('./stage.js')));
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrate, { once: true });
} else {
  hydrate();
}
