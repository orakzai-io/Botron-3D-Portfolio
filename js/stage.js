// js/stage.js — BOTRON engine (imported by js/main.js).
// Glues the WebGL scene, scroll-driven camera story, robot, gaze, and UI
// telemetry together, then drives the (FPS-throttled) render loop.
import * as THREE from 'three';
import { setupScene } from './webgl/scene.js';
import { createCameraStory } from './webgl/camera-story.js';
import { createGaze } from './webgl/gaze.js';
import { createRobot } from './webgl/robot.js';
import { createTelemetry } from './webgl/telemetry.js';
import botronModelUrl from './models/botron.glb?url';
import { signalBoot } from './boot-gate.js';

const container = document.getElementById('stage-container');
const { renderer, scene, camera, controls, glowRing, particles } = setupScene({
  container,
});

// Shared, smoothed mouse state (currentX/Y are the lerped normalized values).
const mouse = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 };
window.addEventListener(
  'mousemove',
  (e) => {
    mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
  },
  { passive: true }
);

// Camera story owns the scroll scrub loop (Lenis + GSAP ScrollTrigger).
const story = createCameraStory({ camera, controls, onScroll: () => wakeRender(25) });
// gaze reads the robot model via a getter so it can be created before the robot.
const gaze = createGaze({
  camera,
  beats: story.beats,
  getRobot: () => robot && robot.model,
  getGazeBeatIndex: () => story.state.gazeBeatIndex,
  getBotVisible: () => story.state.botVisible,
});

const robot = createRobot({
  scene,
  modelUrl: botronModelUrl,
  mouse,
  gazeState: gaze.state,
  storyState: story.state,
  env: { glowRing, particles },
});

const telemetry = createTelemetry(mouse);

// --- BOTRON Bubble: tracks the robot's head/mouth in screen space ---
// BOTRON renders on the beats whose POSES entry sets bot: true (hero, about,
// contact). On every other beat the bubble is hidden.
const _headPos = new THREE.Vector3();
const botronBubble = document.getElementById('botron-bubble');
const botronBubbleText = botronBubble ? botronBubble.querySelector('p') : null;
let _bubbleW = 0,
  _bubbleH = 0;
let _currentBeatId = null;

// The bubble click is owned by js/ui/chat.js (it already tracks the open state
// and has syncBubbleState). Keeping a second handler here duplicated the same
// text and then reverted it after 2.8s while the chat was still open.

const BOTRON_BEAT_MESSAGES = {
  hero: `// I'M BOTRON • ASK ME ANYTHING <span style="color:#00f0ff">[CLICK TO CHAT]</span>`,
  about: `// CHECK OUT MY CREATOR &darr;`,
  contact: `// TRANSMISSION READY &mdash; HE RESPONDS FAST &darr;`,
};

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
  // The chat window owns the bubble copy while it is open: never overwrite the
  // call to action under the visitor's cursor.
  const chatWin = document.getElementById('bt-chat-window');
  if (chatWin && chatWin.classList.contains('is-open')) return;

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
  if (
    _headPos.z > 1 ||
    _headPos.x < -1.2 ||
    _headPos.x > 1.2 ||
    _headPos.y < -1.2 ||
    _headPos.y > 1.2
  ) {
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

  // Bubble gap (px) from the projected head CENTER; contact needs more to clear the shoulder and arm.
  const GAP_BY_SECTION = { contact: 50 };
  const gap = GAP_BY_SECTION[currentSection] ?? 16;

  // Space-aware placement (replaces the old hard rule that forced the bubble to
  // the right from beat 1 on — in the contact beat the head sits near the right
  // edge, so the naive clamp used to drag the bubble over the bot's face):
  //   - hero: keep the classic left-of-bot look (tail pointing right at the bot)
  //   - later beats: prefer the right, but fall back to the left whenever the
  //     bubble would overflow the viewport; if neither side truly fits, pick the
  //     side with more room. The bubble is never clamped on top of the head.
  const pad = 12; // min distance from viewport edges
  const fitsRight = screenX + gap + _bubbleW + pad <= sw;
  const fitsLeft = screenX - gap - _bubbleW - pad >= 0;
  const preferRight =
    currentSection === 'about' || (story && story.state && story.state.beatIndex >= 1);

  let placeOnRight;
  if (!fitsRight && !fitsLeft) {
    // Bubble wider than the free space on both sides — take the roomier side.
    placeOnRight = sw - screenX >= screenX;
  } else if (preferRight) {
    placeOnRight = fitsRight || !fitsLeft;
  } else {
    placeOnRight = !fitsLeft && fitsRight;
  }

  let x = placeOnRight ? screenX + gap : screenX - _bubbleW - gap;

  // Clamp within viewport (side selection above guarantees this never covers the head)
  x = Math.max(pad, Math.min(sw - _bubbleW - pad, x));
  const y = Math.max(70, Math.min(sh - _bubbleH - 20, screenY - _bubbleH * 0.5));

  const isTailLeft = placeOnRight;
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

// --- Resize (rAF-coalesced) ---
// Mobile browsers fire resize continuously while the URL bar collapses —
// per-event canvas reallocs + ScrollTrigger.refresh() jank the compositor
// exactly while the user is scrolling.
let _lastAppliedW = window.innerWidth;
let _resizePending = false;
window.addEventListener(
  'resize',
  () => {
    if (_resizePending) return;
    _resizePending = true;
    requestAnimationFrame(() => {
      _resizePending = false;
      const widthChanged = window.innerWidth !== _lastAppliedW;
      _bubbleW = 0;
      _bubbleH = 0;
      // ONLY reallocate WebGL canvas buffer on width changes (orientation flip).
      // Height-only changes are the collapsing mobile URL bar; canvas is fixed inset:0.
      if (widthChanged) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
        story.onResize?.({ widthChanged: true });
        _lastAppliedW = window.innerWidth;
      } else {
        story.onResize?.({ widthChanged: false });
      }
    });
  },
  { passive: true }
);

// --- Render loop (Adaptive GPU sleeping, FPS-throttled, paused when tab is hidden) ---
const clock = new THREE.Clock();
let lastRenderTime = 0;
let firstFrameSignalled = false; // boot gate: fires once, after the first render
let _perfLogged = false; // DEV: one-shot "bot on screen" report
// User scroll & interaction activity tracker
let _isScrolling = true;
let _settleFrames = 30; // initial frames on page load so scene initializes cleanly
let _activityTimeout = null;

function wakeRender(frames = 30) {
  _isScrolling = true;
  _settleFrames = Math.max(_settleFrames, frames);
  clearTimeout(_activityTimeout);
  _activityTimeout = setTimeout(() => {
    _isScrolling = false;
  }, 400); // 400ms covers mobile touch-lift inertial momentum decay
}

window.addEventListener('scroll', () => wakeRender(25), { passive: true });
window.addEventListener('wheel', () => wakeRender(25), { passive: true });
window.addEventListener('touchstart', () => wakeRender(35), { passive: true });
window.addEventListener('touchmove', () => wakeRender(35), { passive: true });
window.addEventListener('touchend', () => wakeRender(35), { passive: true });
window.addEventListener('mousemove', () => wakeRender(15), { passive: true });
window.addEventListener('resize', () => wakeRender(30), { passive: true });


function animate(currentTime) {
  requestAnimationFrame(animate);

  // Pause rendering completely when the tab is backgrounded to save CPU/GPU
  if (document.hidden) return;


  // Adaptive frame rate:
  // - Interacting (scroll / touch / cursor): 60 FPS, for judder-free motion.
  // - Idle with the bot visible: 30 FPS, enough for the idle breathing cycle.
  // - Idle with the bot hidden: skip the frame entirely (zero draw calls).
  const isInteracting = _isScrolling || _settleFrames > 0;
  const currentFPS = isInteracting ? 60 : 30;
  const currentInterval = 1000 / currentFPS;

  const delta = currentTime - lastRenderTime;
  if (delta < currentInterval) return;
  lastRenderTime = currentTime - (delta % currentInterval);

  // When robot is hidden (Skills, Experience, Projects, etc.) and page is stationary,
  // sleep the renderer after settling. Saves 70-80% idle GPU during content reading!
  const botIsVisible = story.state.botVisible !== false;
  if (!botIsVisible && !_isScrolling && firstFrameSignalled) {
    if (_settleFrames > 0) {
      _settleFrames--;
    } else {
      // GPU SLEEP STATE: Zero draw calls while user reads non-robot sections.
      telemetry.setIdle?.();
      return;
    }
  }

  // Clamped delta-time in seconds (prevents huge jumps after backgrounding/lag spikes)
  const dt = Math.min(delta / 1000, 0.05);
  const elapsedTime = clock.getElapsedTime();

  mouse.currentX = damp(mouse.currentX, mouse.targetX, 6.0, dt);
  mouse.currentY = damp(mouse.currentY, mouse.targetY, 6.0, dt);

  // On bot-hidden beats we skip the gaze math to keep GPU idle.
  if (botIsVisible) {
    gaze.update(dt);
  }
  robot.update(elapsedTime, dt);

  // DEV instrumentation: once the bot is on screen, report how long it took and
  // whether the GLB was served from cache.
  if (import.meta.env.DEV && !_perfLogged && robot.model) {
    _perfLogged = true;
    const glb = performance.getEntriesByType('resource').find((e) => /botron.*\.glb/.test(e.name));
    console.info(
      '[bt] perf — bot on screen at ' + Math.round(performance.now()) + 'ms',
      glb
        ? {
            glbMs: Math.round(glb.duration),
            glbKB: Math.round(glb.encodedBodySize / 1024),
            fromCache: glb.transferSize === 0,
          }
        : { glb: 'no resource entry (preload removed or not started)' }
    );
  }

  // Stamp botVisible on body ONLY when changed to prevent DOM mutation churn
  const nextBotVisible = botIsVisible ? '1' : '0';
  if (document.body.dataset.botVisible !== nextBotVisible) {
    document.body.dataset.botVisible = nextBotVisible;
  }
  updateBotronBubble();

  controls.update();
  telemetry.update();

  renderer.render(scene, camera);

  // Boot gate: first real frame — the canvas is painted with the hero pose.
  if (!firstFrameSignalled) {
    firstFrameSignalled = true;
    signalBoot('firstFrame');
  }
}

// Start the loop via rAF so the first frame receives a valid timestamp.
// Calling animate() directly left `currentTime` undefined -> delta became NaN
// and poisoned lastRenderTime/dt/mouse forever, turning the robot's rotation
// NaN (invisible model) — the "MOUSE NaN,NaN" telemetry bug.
requestAnimationFrame(animate);
