// js/webgl/config.js
// Single place for all tuning knobs: camera poses, gaze targets, perf limits.

export const MOBILE_BREAKPOINT = 900; // below this, hero re-centers
export const ROBOT_BASE_X_DESKTOP = 58; // right-of-center staging (desktop)

// Quality tiers were removed on purpose. The site ships ONE look on every device:
// flat panels (no CSS glass blur) and the low-power 3D path. The FULL/glass tier,
// the weak-device heuristic, the ?quality=lite|full overrides and the one-shot FPS
// watchdog all lived here -- see docs/quality-tiers.md for that code and how to
// bring it back if you ever want the glass design again.

// --- Boot gate (js/boot-gate.js) ---
// The boot overlay releases once firstFrame + model + fonts are all in, but
// never before BOOT_MIN_MS (no warm-cache flicker) and never after BOOT_MAX_MS.
// Set to 0: zero artificial delay. The instant the concurrent background loader
// renders the model and first frame, the boot screen lifts immediately.
export const BOOT_MIN_MS = 0;
export const BOOT_MAX_MS = 3500;
// fonts.googleapis.com can stall for seconds when slow or blocked; race it.
export const BOOT_FONTS_TIMEOUT_MS = 600;

// One camera pose per story beat. c = camera position [x,y,z], t = look-at [x,y,z].
// `bot` = whether the BOTRON 3D model is rendered during this beat (false hides it
// and skips its per-frame updates to save GPU).
export const POSES = [
  { id: 'hero', c: [100, 60, 250], t: [-6, 64, 0], bot: true },
  { id: 'about', c: [-76, 50, 22], t: [-6, 64, 0], bot: true },
  { id: 'skills', c: [-50, 62, 206], t: [2, 52, 100], bot: false },
  { id: 'experience', c: [-40, 68, 230], t: [2, 60, 0], bot: false },
  { id: 'projects', c: [-10, 76, 258], t: [2, 60, 0], bot: false },
  { id: 'education', c: [20, 70, 240], t: [-6, 56, 0], bot: false },
  { id: 'testimonials', c: [-30, 66, 235], t: [2, 58, 0], bot: false },
  { id: 'contact', c: [-10, 80, 258], t: [2, 60, 0], bot: true },
];

// Which DOM element the robot looks at during each beat's scroll section.
// null = that beat uses mouse-tracking gaze instead of a content target.
export const GAZE_TARGETS = {
  hero: null,
  about: '.bt-beat-copy',
  skills: '#skills-globe-container',
  experience: '.bt-beat-copy',
  projects: '.bt-beat-copy',
  education: '.bt-beat-copy',
  testimonials: '.bt-beat-copy',
  contact: '.bt-contact-stage',
};

// Extra yaw bias per beat (gaze units). Positive = head turns further
// screen-right, negative = further left. 0 / missing = current behavior.
export const GAZE_YAW_BIAS = {
  contact: 0.35,
};
