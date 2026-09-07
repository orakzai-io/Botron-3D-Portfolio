// js/main.js — NEXBOT entry point.
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
const { renderer, scene, camera, controls, composer, glowRing, particles } = setupScene({ container });

// Shared, smoothed mouse state (currentX/Y are the lerped normalized values).
const mouse = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 };
window.addEventListener("mousemove", (e) => {
  mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
});

// Camera story owns the intro + the Lenis/GSAP scrub loop.
const story = createCameraStory({ camera, controls });

createDebugOverlay({ camera, controls });
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

const BOTRON_BEAT_MESSAGES = {
  hero: `// I'M BOTRON &mdash; SHASO'S AI COPILOT. <span style="color:#5f6875">CHAT CORE OFFLINE</span>`,
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

function updateBotronBubble() {
  if (!botronBubble) return;

  // Hide bubble whenever the bot model is not visible this beat.
  if (!story.state.botVisible) {
    botronBubble.classList.remove('is-visible');
    return;
  }

  const headBone = robot.headBone;
  if (!headBone || !robot.model || !robot.model.visible) {
    botronBubble.classList.remove('is-visible');
    return;
  }

  // Project the head bone's world position to NDC, then to screen pixels.
  headBone.updateMatrixWorld(true);
  headBone.getWorldPosition(_headPos);
  _headPos.project(camera);

  // If behind the camera or out of viewport bounds, hide.
  if (_headPos.z > 1 || _headPos.x < -1.2 || _headPos.x > 1.2 || _headPos.y < -1.2 || _headPos.y > 1.2) {
    botronBubble.classList.remove('is-visible');
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
  const gap = 16; // px gap between bubble and head
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

  if (isTailRight) {
    botronBubble.classList.remove('tail-left');
  } else {
    botronBubble.classList.add('tail-left');
  }

  botronBubble.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
  botronBubble.classList.add('is-visible');
}

// --- Resize ---
window.addEventListener("resize", () => {
  _bubbleW = 0;
  _bubbleH = 0;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  story.onResize?.(); // camera-story re-collects beats + refreshes ScrollTrigger
});

// --- Render loop (FPS-throttled, paused when the tab is hidden) ---
const clock = new THREE.Clock();
let lastRenderTime = 0;
const frameInterval = 1000 / TARGET_FPS;

function animate(currentTime) {
  requestAnimationFrame(animate);

  // Pause rendering when the tab is hidden/inactive to save CPU/GPU.
  if (document.hidden) return;

  const delta = currentTime - lastRenderTime;
  if (delta < frameInterval) return;
  lastRenderTime = currentTime - (delta % frameInterval);

  const elapsedTime = clock.getElapsedTime();

  story.update(elapsedTime); // intro only; Lenis/GSAP drive the camera after
  const lerpFactor = 0.08;
  mouse.currentX += (mouse.targetX - mouse.currentX) * lerpFactor;
  mouse.currentY += (mouse.targetY - mouse.currentY) * lerpFactor;

  // On bot-hidden beats we skip the gaze math to keep the GPU idle. The
  // camera + background scene still render so scroll navigation stays smooth.
  // robot.update() ALWAYS runs: it syncs model.visible (hides the bot when the
  // beat is gated) and internally no-ops the expensive eye/rig work when hidden.
  if (story.state.botVisible !== false) {
    gaze.update(); // content gaze toward the active section's card
  }
  robot.update(elapsedTime); // bot: eyes / hands / float / glow / head+body gaze

  // Stamp botVisible on body every frame so CSS can instantly kill the bubble
  // without any scrub lag. This is the ground truth, set before updateBotronBubble.
  document.body.dataset.botVisible = story.state.botVisible ? '1' : '0';
  updateBotronBubble();      // track BOTRON's mouth position in screen space

  controls.update();
  telemetry.update();

  if (composer) composer.render();
  else renderer.render(scene, camera);
}
animate();
