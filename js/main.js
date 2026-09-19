// js/main.js — instant entry point.
import "./stage.js";

// Disable browser scroll restoration so page always reloads at the top.
// Without this, Chromium restores the previous scroll position before JS runs,
// which means applyCameraFromScroll sees a non-zero Y and may set botVisible=false
// before the hero section is rendered — making the bot invisible on reload.
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);

// Reveal UI immediately with zero artificial delay
document.body.classList.add("intro-complete");
