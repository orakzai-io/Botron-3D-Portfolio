// js/webgl/config.js
// Single place for all tuning knobs: camera poses, gaze targets, perf limits.

export const BLOOM_ENABLED = false;
export const TARGET_FPS = 40;          // render-loop throttle
export const MOBILE_BREAKPOINT = 900;  // below this, hero re-centers
export const ROBOT_BASE_X_DESKTOP = 58; // right-of-center staging (desktop)
export const INTRO_DURATION = 5;     // seconds for the intro pull-back

// One camera pose per story beat. c = camera position [x,y,z], t = look-at [x,y,z].
// `bot` = whether the NEXBOT 3D model is rendered during this beat (false hides it
// and skips its per-frame updates to save GPU).
export const POSES = [
  { id: "hero",           c: [100, 60, 250],     t: [-6, 64, 0],       bot: true },
  { id: "about",          c: [-76, 50, 22],      t: [-6, 64, 0],       bot: true },
  { id: "skills",         c: [-50, 62, 206],     t: [2, 52, 100],      bot: false },
  { id: "experience",     c: [-40, 68, 230],     t: [2, 60, 0],        bot: false },
  { id: "projects",       c: [-10, 76, 258],     t: [2, 60, 0],        bot: false },
  { id: "education",      c: [20, 70, 240],      t: [-6, 56, 0],       bot: false },
  { id: "testimonials",   c: [-30, 66, 235],     t: [2, 58, 0],        bot: false },
  { id: "contact",        c: [-10, 80, 258],     t: [2, 60, 0],        bot: true },
];

// Which DOM element the robot looks at during each beat's scroll section.
// null = that beat uses mouse-tracking gaze instead of a content target.
export const GAZE_TARGETS = {
  hero: null,
  about: ".nx-beat-copy",
  skills: "#skills-globe-container",
  experience: ".nx-beat-copy",
  projects: ".nx-beat-copy",
  education: ".nx-beat-copy",
  testimonials: ".nx-beat-copy",
  contact: ".nx-beat-copy",
};