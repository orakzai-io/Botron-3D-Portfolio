// js/stage.js — NEXBOT engine (imported by js/main.js).
// Glues the WebGL scene, scroll-driven camera story, robot, gaze, and UI
// telemetry together, then drives the (FPS-throttled) render loop.
import * as THREE from "three";
import { setupScene } from "./webgl/scene.js";
import { createCameraStory } from "./webgl/camera-story.js";
import { createGaze } from "./webgl/gaze.js";
import { createRobot } from "./webgl/robot.js";
import { createTelemetry } from "./webgl/telemetry.js";
import { createDebugOverlay } from "./webgl/debug-camera.js"; // <--- NEW
import nexbotModelUrl from "./data/nexbot.glb?url";
import { TARGET_FPS } from "./webgl/config.js";

const container = document.getElementById("stage-container");
const { renderer, scene, camera, controls, glowRing, particles } = setupScene({ container });

// Shared, smoothed mouse state (currentX/Y are the lerped normalized values).
const mouse = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 };
window.addEventListener("mousemove", (e) => {
  mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
}, { passive: true });

// Camera story owns the intro + the Lenis/GSAP scrub loop.
const story = createCameraStory({ camera, controls });

// Dev-only: camera/draw-call overlay (press "D"). Vite replaces import.meta.env.DEV
// with false in prod builds, tree-shaking debug-camera.js out of the bundle.
if (import.meta.env.DEV) createDebugOverlay({ camera, controls, renderer });
// gaze reads the robot model via a getter so it can be created before the robot.
const gaze = createGaze({
  camera,
  beats: story.beats,
  getRobot: () => (robot && robot.model),
  getGazeBeatIndex: () => story.state.gazeBeatIndex,
  getBotVisible: () => story.state.botVisible,
});

const robot = createRobot({
  scene,
  renderer,
  modelUrl: nexbotModelUrl,
  mouse,
  gazeState: gaze.state,
  storyState: story.state,
  env: { glowRing, particles },
});

const telemetry = createTelemetry(mouse);

// --- BOTRON Bubble: tracks the robot's head/mouth in screen space ---
// BOTRON is only present on 'hero' and 'about'. On any section where there is no bot, hide bubble.
const _headPos = new THREE.Vector3();
const botronBubble = document.getElementById('botron-bubble');
const botronBubbleText = botronBubble ? botronBubble.querySelector('p') : null;
let _bubbleW = 0, _bubbleH = 0;
let _currentBeatId = null;

if (botronBubble && botronBubbleText) {
  let _feedbackTimer = null;
  botronBubble.addEventListener('click', () => {
    clearTimeout(_feedbackTimer);
    const win = document.getElementById('nx-chat-window');
    // If win has 'is-open', chat just opened -> show option to close
    // If win does NOT have 'is-open', chat just closed -> show option to reopen
    const isOpen = win && win.classList.contains('is-open');
    if (isOpen) {
      botronBubbleText.innerHTML = `// <span style="color:#00f0ff">RAG COPILOT ONLINE • [CLICK TO CLOSE]</span>`;
    } else {
      botronBubbleText.innerHTML = `// <span style="color:#00f0ff">COPILOT MINIMIZED • [CLICK TO REOPEN]</span>`;
    }
    _feedbackTimer = setTimeout(() => {
      const msg = BOTRON_BEAT_MESSAGES[_currentBeatId] || BOTRON_BEAT_MESSAGES.hero;
      botronBubbleText.innerHTML = msg;
    }, 2800);
  });
}

const BOTRON_BEAT_MESSAGES = {
  hero: `// I'M BOTRON • ASK ME ABOUT SHASO <span style="color:#00f0ff">[CLICK TO CHAT]</span>`,
  about: `// CHECK ABOUT MY CREATOR SHASO &darr;`,
  contact: `// TRANSMISSION READY &mdash; SHASO RESPONDS FAST &darr;`,
};

function getCurrentSectionId() {
  const sectionIds = ['hero', 'about', 'skills', 'experience', 'projects', 'education', 'testimonials', 'contact'];
  const midY = window.innerHeight * 0.5;

  for (const id of sectionIds) {
    const el = document.getElementById(id);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top <= midY && rect.bottom >= midY) {
        return id;
      }
    }
  }
  // If at very top of the page
  if ((window.scrollY || 0) < 200) return 'hero';
  return null;
}

// Exponential decay damping: 100% framerate-independent, never overshoots
function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

let _lastTailLeft = null;
let _lastBubbleX = -9999;
let _lastBubbleY = -9999;
let _lastBubbleVisible = false;

function hideBubble() {
  if (_lastBubbleVisible) {
    botronBubble.classList.remove('is-visible');
    _lastBubbleVisible = false;
  }
}

function updateBotronBubble() {
  if (!botronBubble) return;

  // Hide bubble whenever the bot model is not visible this beat.
  if (!story.state.botVisible) {
    hideBubble();
    return;
  }

  const headBone = robot.headBone;
  if (!headBone || !robot.model || !robot.model.visible) {
    hideBubble();
    return;
  }

  // Project the head bone's world position to NDC, then to screen pixels.
  headBone.getWorldPosition(_headPos);
  _headPos.project(camera);

  // If behind the camera or out of viewport bounds, hide.
  if (_headPos.z > 1 || _headPos.x < -1.2 || _headPos.x > 1.2 || _headPos.y < -1.2 || _headPos.y > 1.2) {
    hideBubble();
    return;
  }

  // Update text dynamically whenever active beat changes
  const currentSection = story.state.activeBeatId;
  if (currentSection !== _currentBeatId) {
    _currentBeatId = currentSection;
    const msg = BOTRON_BEAT_MESSAGES[currentSection] || BOTRON_BEAT_MESSAGES.hero;
    if (botronBubbleText) {
      botronBubbleText.innerHTML = msg;
    }
    // Reset cached dimensions so bubble recalculates accurately for new text
    _bubbleW = botronBubble.offsetWidth;
    _bubbleH = botronBubble.offsetHeight;
    _lastBubbleX = -9999;
    _lastBubbleY = -9999;
  }

  const sw = window.innerWidth;
  const sh = window.innerHeight;
  // Screen position of the bone (projected mouth/head)
  const screenX = (_headPos.x * 0.5 + 0.5) * sw;
  const screenY = (-_headPos.y * 0.5 + 0.5) * sh;

  if (!_bubbleW) {
    _bubbleW = botronBubble.offsetWidth;
    _bubbleH = botronBubble.offsetHeight;
  }

  // Position bubble: default to LEFT of head with tail pointing right -> bot
  // Bubble gap (px) from the projected head CENTER; contact needs more to clear the shoulder and arm.
  const GAP_BY_SECTION = { contact: 50 };
  const gap = GAP_BY_SECTION[currentSection] ?? 16;
  let x = screenX - _bubbleW - gap;
  let isTailRight = true;

  // If bubble would clip off the left edge, flip to RIGHT of head
  if (x < 16) {
    x = screenX + gap;
    isTailRight = false;
  }

  // Clamp within viewport
  x = Math.max(12, Math.min(sw - _bubbleW - 12, x));
  const y = Math.max(70, Math.min(sh - _bubbleH - 20, screenY - _bubbleH * 0.5));

  const isTailLeft = !isTailRight;
  if (_lastTailLeft !== isTailLeft) {
    if (isTailLeft) {
      botronBubble.classList.add('tail-left');
    } else {
      botronBubble.classList.remove('tail-left');
    }
    _lastTailLeft = isTailLeft;
  }

  const rx = Math.round(x);
  const ry = Math.round(y);
  if (rx !== _lastBubbleX || ry !== _lastBubbleY) {
    botronBubble.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    _lastBubbleX = rx;
    _lastBubbleY = ry;
  }

  if (!_lastBubbleVisible) {
    botronBubble.classList.add('is-visible');
    _lastBubbleVisible = true;
  }
}

// --- Resize ---
window.addEventListener("resize", () => {
  _bubbleW = 0;
  _bubbleH = 0;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
  story.onResize?.(); // camera-story re-collects beats + refreshes ScrollTrigger
});

// --- Render loop (Adaptive GPU sleeping, FPS-throttled, paused when tab is hidden) ---
const clock = new THREE.Clock();
let lastRenderTime = 0;
const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
const activeFPS = isMobile ? 24 : TARGET_FPS;
const frameInterval = 1000 / activeFPS;

// User scroll & interaction activity tracker
let _isScrolling = true;
let _settleFrames = 30; // initial frames on page load so scene initializes cleanly
let _activityTimeout = null;

function wakeRender(frames = 20) {
  _isScrolling = true;
  _settleFrames = Math.max(_settleFrames, frames);
  clearTimeout(_activityTimeout);
  _activityTimeout = setTimeout(() => {
    _isScrolling = false;
  }, 140);
}

window.addEventListener("scroll", () => wakeRender(20), { passive: true });
window.addEventListener("wheel", () => wakeRender(20), { passive: true });
window.addEventListener("touchmove", () => wakeRender(20), { passive: true });
window.addEventListener("resize", () => wakeRender(30), { passive: true });

function animate(currentTime) {
  requestAnimationFrame(animate);

  // Pause rendering completely when the tab is backgrounded to save CPU/GPU
  if (document.hidden) return;

  const delta = currentTime - lastRenderTime;
  if (delta < frameInterval) return;
  lastRenderTime = currentTime - (delta % frameInterval);

  // When robot is hidden (Skills, Experience, Projects, etc.) and page is stationary,
  // sleep the renderer after settling. Saves 70-80% idle GPU during content reading!
  const botIsVisible = story.state.botVisible !== false;
  if (!botIsVisible && !_isScrolling) {
    if (_settleFrames > 0) {
      _settleFrames--;
    } else {
      // GPU SLEEP STATE: Zero draw calls while user reads non-robot sections.
      return;
    }
  }

  // Clamped delta-time in seconds (prevents huge jumps after backgrounding/lag spikes)
  const dt = Math.min(delta / 1000, 0.05);
  const elapsedTime = clock.getElapsedTime();

  story.update(elapsedTime, dt); // camera-story
  mouse.currentX = damp(mouse.currentX, mouse.targetX, 6.0, dt);
  mouse.currentY = damp(mouse.currentY, mouse.targetY, 6.0, dt);

  // On bot-hidden beats we skip the gaze math to keep GPU idle.
  if (botIsVisible) {
    gaze.update(dt);
  }
  robot.update(elapsedTime, dt);

  // Stamp botVisible on body ONLY when changed to prevent DOM mutation churn
  const nextBotVisible = botIsVisible ? '1' : '0';
  if (document.body.dataset.botVisible !== nextBotVisible) {
    document.body.dataset.botVisible = nextBotVisible;
  }
  updateBotronBubble();

  controls.update();
  telemetry.update();

  renderer.render(scene, camera);
}

// Start the loop via rAF so the first frame receives a valid timestamp.
// Calling animate() directly left `currentTime` undefined -> delta became NaN
// and poisoned lastRenderTime/dt/mouse forever, turning the robot's rotation
// NaN (invisible model) — the "MOUSE NaN,NaN" telemetry bug.
requestAnimationFrame(animate);
