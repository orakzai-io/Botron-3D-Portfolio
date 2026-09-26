// js/main.js — instant entry point.
// boot-gate.js is imported FIRST: ESM evaluates dependencies in order, so its
// listeners exist before any other module's top-level code runs. It owns the
// reveal and releases on fonts — the 3D stage is hydrated AFTER the shell has
// painted (progressive hydration), so the first paint is content, not a boot
// screen. The bot scales in from 0.2 when it lands, so the late arrival is a
// feature, not a pop.
import './boot-gate.js';

// Disable browser scroll restoration so page always reloads at the top.
// Without this, Chromium restores the previous scroll position before JS runs,
// which means applyCameraFromScroll sees a non-zero Y and may set botVisible=false
// before the hero section is rendered — making the bot invisible on reload.
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
