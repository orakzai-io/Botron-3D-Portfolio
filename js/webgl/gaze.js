// js/webgl/gaze.js
// Content-tracking gaze.
// Projects the robot's world position to NDC, then steers a smoothed yaw/pitch
// toward the active section's card. robot.js reads state.yaw / state.pitch.
import * as THREE from "three";
import { GAZE_TARGETS } from "./config.js";

const _WB = new THREE.Vector3();

export function createGaze({ camera, beats, getRobot, getGazeBeatIndex, getBotVisible }) {
  const state = { yaw: 0, pitch: 0 };

  function update() {
    // Skip the wasted NDC/projector math entirely while the bot is hidden.
    if (getBotVisible && getBotVisible() === false) return;

    const robotModel = getRobot();
    if (!robotModel) return;

    const idx = getGazeBeatIndex();
    const beat = beats[idx];
    if (!beat) return;

    const sel = GAZE_TARGETS[beat.el.id];
    if (!sel) return; // hero beat has no gaze target — keep mouse-tracking instead

    const el = beat.el.querySelector(sel);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Fresh camera, then project the bot to NDC (-1..1).
    camera.updateMatrixWorld(true);
    robotModel.updateMatrixWorld(true);
    robotModel.getWorldPosition(_WB).project(camera);
    const botNX = _WB.x;
    const botNY = _WB.y;

    // The card center, in the same NDC space.
    const cx = (rect.left + rect.width * 0.5) / window.innerWidth * 2 - 1;
    const cy = -(rect.top + rect.height * 0.5) / window.innerHeight * 2 + 1;

    // The bot turns toward the card by their on-screen offset.
    const yawT = THREE.MathUtils.clamp((cx - botNX) * 1.3, -1.25, 1.25);
    state.yaw += (yawT - state.yaw) * 0.1;

    const pitchT = THREE.MathUtils.clamp((cy - botNY) * 0.8, -0.5, 0.5);
    state.pitch += (pitchT - state.pitch) * 0.1;
  }

  return { state, update };
}