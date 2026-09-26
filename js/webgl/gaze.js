// js/webgl/gaze.js
// Content-tracking gaze.
// Projects the robot's world position to NDC, then steers a smoothed yaw/pitch
// toward the active section's card. robot.js reads state.yaw / state.pitch.
import * as THREE from 'three';
import { GAZE_TARGETS, GAZE_YAW_BIAS } from './config.js';

// Exponential decay damping: 100% framerate-independent, never overshoots
function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

const _WB = new THREE.Vector3();
const _targetElCache = new Map();

// Throttle: only re-measure DOM rect + bot NDC every N frames.
// getBoundingClientRect() causes a browser layout flush — very expensive per frame.
const RECT_THROTTLE = 10;
let _frameCount = 0;
let _cachedRect = null;
let _cachedBeatId = null;
let _cachedBotNX = 0;
let _cachedBotNY = 0;

export function createGaze({ camera, beats, getRobot, getGazeBeatIndex, getBotVisible }) {
  const state = { yaw: 0, pitch: 0 };

  function update(dt = 0.016) {
    // Skip the wasted NDC/projector math entirely while the bot is hidden.
    if (getBotVisible && getBotVisible() === false) return;

    const robotModel = getRobot();
    if (!robotModel) return;

    const idx = getGazeBeatIndex();
    const beat = beats[idx];
    if (!beat) return;

    const sel = GAZE_TARGETS[beat.el.id];
    if (!sel) return; // hero beat has no gaze target — keep mouse-tracking instead

    // Cache target element to avoid executing querySelector in the hot render loop
    let el = _targetElCache.get(beat.el.id);
    if (!el) {
      el = beat.el.querySelector(sel);
      if (el) _targetElCache.set(beat.el.id, el);
      else return;
    }

    _frameCount++;
    const beatChanged = beat.el.id !== _cachedBeatId;

    // Only re-measure DOM rect + bot NDC position every RECT_THROTTLE frames (or on beat change).
    // No forced updateMatrixWorld — Three.js already updates matrices before render.
    if (beatChanged || _frameCount % RECT_THROTTLE === 0) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      _cachedRect = rect;
      _cachedBeatId = beat.el.id;

      // Guard: skip projection if camera matrix isn't ready yet (first few frames)
      try {
        robotModel.getWorldPosition(_WB).project(camera);
        _cachedBotNX = _WB.x;
        _cachedBotNY = _WB.y;
      } catch (_) {
        return;
      }
    }

    if (!_cachedRect) return;

    // The card center, in the same NDC space.
    const cx = ((_cachedRect.left + _cachedRect.width * 0.5) / window.innerWidth) * 2 - 1;
    const cy = (-(_cachedRect.top + _cachedRect.height * 0.5) / window.innerHeight) * 2 + 1;

    // The bot turns toward the card by their on-screen offset.
    const yawT = THREE.MathUtils.clamp(
      (cx - _cachedBotNX) * 1.3 + (GAZE_YAW_BIAS[beat.el.id] ?? 0),
      -1.25,
      1.25
    );
    state.yaw = damp(state.yaw, yawT, 6.0, dt);

    const pitchT = THREE.MathUtils.clamp((cy - _cachedBotNY) * 0.8, -0.5, 0.5);
    state.pitch = damp(state.pitch, pitchT, 6.0, dt);
  }

  return { state, update };
}
