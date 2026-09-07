// js/webgl/robot.js
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export function createRobot({ scene, renderer, modelUrl, mouse, gazeState, storyState, env }) {
  let robotModel = null;
  let headBone = null;
  let initialBaseX = 58;
  let initialBaseY = 0;

  let handNodes = [];
  const _tmpA = new THREE.Vector3();
  const _tmpB = new THREE.Vector3();

  // Crisp bare dot-matrix vision eyes (no bezel/housing panels).
  let eyeAnchorObjs = [];
  let eyesReady = false;
  const eyePanels = [];

  // One crisp, hard-edged dot-matrix screen (6x5 square pixels, NO glow/blur).
  function createDotPanelTexture(width) {
    const cols = 6, rows = 5, pad = 6, dot = 26, gap = 4;
    const canvas = document.createElement("canvas");
    canvas.width = pad * 2 + cols * dot + (cols - 1) * gap;
    canvas.height = pad * 2 + rows * dot + (rows - 1) * gap;
    const ctx = canvas.getContext("2d");
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    const panel = { cols, rows, pad, dot, gap, canvas, ctx, tex };

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: tex, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      })
    );
    const aspect = canvas.width / canvas.height;
    mesh.scale.set(width, width / aspect, 1);
    mesh.material.map.needsUpdate = true;
    mesh.userData.isNxEye = true; // never let the cleanup below hide OUR screens
    eyePanels.push(panel);
    return mesh;
  }

  // Redraw a panel: dim full matrix + bright "iris" cross at gaze; collapses on blink.
  function drawDotGrid(panel, gazec, gazer, blink) {
    const { ctx, canvas, rows, cols, pad, dot, gap, tex } = panel;
    const litAt = (r, c) => !blink && (Math.abs(r - gazer) + Math.abs(c - gazec) <= 1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Soft radial halo behind every lit dot (subtle glow — keeps the hard edge).
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!litAt(r, c)) continue;
        const hx = pad + c * (dot + gap) + dot / 2;
        const hy = pad + r * (dot + gap) + dot / 2;
        const glow = ctx.createRadialGradient(hx, hy, dot * 0.25, hx, hy, dot * 2.1);
        glow.addColorStop(0, "rgba(120,255,235,0.50)");
        glow.addColorStop(1, "rgba(120,255,235,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(hx - dot * 2.3, hy - dot * 2.3, dot * 4.6, dot * 4.6);
      }
    }

    // Hard-edged dot layer on top (bright cores over the glow).
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = litAt(r, c);
        ctx.fillStyle = lit ? "#a8fff4" : (blink ? "#0a2626" : "#0e3131");
        ctx.fillRect(pad + c * (dot + gap), pad + r * (dot + gap), dot, dot);
      }
    }
    tex.needsUpdate = true;
  }

  // Bare dot-matrix eye — NO octagon bezel, NO cavity, just the crisp dots.
  function buildEyePanel(local, R) {
    // Same visual width as the old inset screen (was R * 0.74 * 1.04).
    const screen = createDotPanelTexture(R * 0.9);
    screen.position.set(local.x, local.y, local.z + 0.05);
    return screen;
  }

  // Build BOTH angular dot-matrix eye panels, embedded into the face.
  function buildEyes() {
    if (!headBone || !robotModel || eyesReady) return;

    robotModel.updateMatrixWorld(true);

    const head = new THREE.Box3().setFromObject(headBone);
    const headW = head.max.x - head.min.x;
    const headH = head.max.y - head.min.y;
    const frontZ = head.max.z;
    const hcx = (head.min.x + head.max.x) * 0.5;
    const hcy = (head.min.y + head.max.y) * 0.5;

    // Prefer anchoring on the model's cylindrical sensor housings.
    let anchors = null;
    if (eyeAnchorObjs.length) {
      // Nuke EVERY baked-in eye mesh in the eye band of the head, whatever it's
      // named (cylinders, cubes, planes...). Skips the head shell itself (too
      // big) and our own dot screens. Logs what it hid so it's debuggable.
      const range = head.max.z - head.min.z;
      headBone.traverse((o) => {
        if (!o.isMesh || o.userData.isNxEye || !o.visible) return;
        const b = new THREE.Box3().setFromObject(o);
        const s = b.getSize(new THREE.Vector3());
        const maxDim = Math.max(s.x, s.y, s.z);
        if (maxDim >= Math.min(headW, headH) * 0.9) return; // the head shell
        const c = b.getCenter(new THREE.Vector3());
        const inEyeBand =
          Math.abs(c.y - hcy) <= headH * 0.3 &&
          c.z > head.min.z + range * 0.35; // front of the face only
        if (inEyeBand) {
          o.visible = false;
          console.info("[nexbot] hid baked-in eye mesh:", o.name || o.type);
        }
      });
      const list = eyeAnchorObjs
        .map((o) => o.getWorldPosition(new THREE.Vector3()))
        .filter((p) => p.x >= head.min.x && p.x <= head.max.x && p.y >= head.min.y && p.y <= head.max.y)
        .sort((a, b) => a.x - b.x);
      if (list.length >= 2) anchors = [list[0], list[list.length - 1]];
    }
    if (!anchors) {
      const ex = headW * 0.22;
      anchors = [
        new THREE.Vector3(hcx - ex, hcy, frontZ),
        new THREE.Vector3(hcx + ex, hcy, frontZ),
      ];
    }

    const eyeR = Math.max(headH * 0.15, 6);
    anchors.forEach((wp) => {
      headBone.add(buildEyePanel(headBone.worldToLocal(wp.clone()), eyeR));
    });
    eyesReady = true;
  }

  // Stepped gaze-tracking + hard-edged blink, driven each frame.
  function updateEyes(t) {
    if (eyePanels.length === 0) return;

    // Hard blink roughly every ~3.2s, closed for a crisp 0.13s.
    const cycle = t % 3.2;
    const blink = cycle < 0.13;

    // Quantize cursor [-1..1] into crisp grid steps (never smooth/blurry).
    const cC = Math.max(0, Math.min(5, Math.round((mouse.currentX * 0.5 + 0.5) * 5)));
    const cR = Math.max(0, Math.min(4, Math.round(((1 - mouse.currentY) * 0.5) * 4)));

    eyePanels.forEach((p) => drawDotGrid(p, cC, cR, blink));
  }

  // Find the two outermost side arm/hand groups for a gentle idle sway.
  function findHandNodes() {
    if (!robotModel) return;
    robotModel.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(robotModel);
    const cx = (box.min.x + box.max.x) * 0.5;
    const H = box.max.y - box.min.y;
    const lowY = box.min.y + H * 0.3;  // skip legs/feet
    const topY = box.max.y - H * 0.2;  // skip head
    const maxW = box.max.x - box.min.x;

    const width = (o) => {
      const b = new THREE.Box3().setFromObject(o);
      return b.max.x - b.min.x;
    };

    // Climb to the outermost ancestor that is still entirely one side of the
    // model, but STOP early (<=30% width) so we animate a forearm/hand subtree.
    const climb = (o) => {
      let cur = o;
      while (
        cur.parent &&
        cur.parent !== robotModel &&
        !/head|neck|face|chin|eye/i.test(cur.parent.name) &&
        width(cur.parent) < maxW * 0.3
      ) {
        cur = cur.parent;
      }
      return cur;
    };

    let left = null, right = null, bestL = -1, bestR = -1;
    robotModel.traverse((o) => {
      if (!o.isMesh) return;
      o.getWorldPosition(_tmpA);
      if (_tmpA.y < lowY || _tmpA.y > topY) return;
      const side = _tmpA.x >= cx ? 1 : -1;
      const root = climb(o);
      root.getWorldPosition(_tmpB);
      const d = Math.abs(_tmpB.x - cx);
      if (side === -1) { if (d > bestL) { bestL = d; left = root; } }
      else { if (d > bestR) { bestR = d; right = root; } }
    });

    handNodes = [left, right].filter((n) => n && n !== robotModel);
    // Remember the model's own pose so we animate ADDITIVELY and never fight it.
    handNodes.forEach((n) => {
      n.userData.baseRot = { x: n.rotation.x, y: n.rotation.y, z: n.rotation.z };
    });

  }

  // --- Model load ---
  // The .glb is fetched as a content-hashed asset (Vite `?url` import) instead
  // of being base64-embedded in the JS bundle — keeps the bundle small and the
  // model cached independently of code changes.
  const loader = new GLTFLoader();
  loader.load(
    modelUrl,
    (gltf) => {
      const model = gltf.scene;
      robotModel = model;
      model.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
        const lowerName = obj.name.toLowerCase();
        if (!headBone && (lowerName.includes("head") || lowerName.includes("neck"))) {
          headBone = obj;
        }
        // Collect cylindrical parts (likely the eye housings) for eye anchoring.
        if (/cylin/i.test(lowerName)) eyeAnchorObjs.push(obj);
      });
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.position.x += initialBaseX;
      initialBaseY = model.position.y - 40; // Shifted slightly down
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 220 / maxDim;
      model.scale.setScalar(scale);
      scene.add(model);
      renderer.shadowMap.needsUpdate = true; // Update static shadow map once loaded

      // Locate the hands for the gentle idle sway.
      findHandNodes();
    },
    (err) => {
      console.error("Model load failed (robot will not spawn):", err.message || err);
    }
  );

  let robotYaw = 0;

    // --- Per-frame rig update ---
  function update(elapsedTime) {
    if (!robotModel) return;

    // Show/hide the whole model based on the active beat. While it's hidden we
    // short-circuit ALL per-frame work (eye-panel redraws, head/hand/body rig
    // math, glow/particle spin) to keep the GPU idle on non-header sections.
    const visible = storyState && storyState.botVisible !== false;
    if (robotModel.visible !== visible) robotModel.visible = visible;
    if (!visible) return;

    // Build the eye panels once the model + head are available.
    if (!eyesReady && headBone) buildEyes();
    updateEyes(elapsedTime);

    // Subtle floating / breathing hover effect + horizontal drift with scroll
    robotModel.position.y = initialBaseY + Math.sin(elapsedTime * 2.0) * 2.5;
    robotModel.position.x = storyState.robotBaseX + storyState.scrollDrift * 46;
    robotModel.position.z = 0;
    if (env.glowRing) env.glowRing.material.opacity = 0.05 + Math.sin(elapsedTime * 1.6) * 0.025;
    if (env.particles) env.particles.rotation.y += 0.0012;

    // Head gaze — mouse in the hero; content-gaze during scroll beats.
    if (headBone) {
      if (storyState.gazeBeatIndex === 0) {
        headBone.rotation.y = mouse.currentX * 0.45;   // ~25 deg
        headBone.rotation.x = -mouse.currentY * 0.3;   // ~17 deg
        headBone.rotation.z = -mouse.currentX * 0.1;   // subtle natural roll
      } else {
        headBone.rotation.y += (THREE.MathUtils.clamp(gazeState.yaw * 1.5, -1.1, 1.1) - headBone.rotation.y) * 0.07;
        headBone.rotation.x += (THREE.MathUtils.clamp(gazeState.pitch * 1.2, -0.45, 0.45) - headBone.rotation.x) * 0.07;
        headBone.rotation.z *= 0.95; // ease out any roll
      }
    }

    // Hands — same cursor tech as the head, plus a gentle mirrored sway.
    if (handNodes.length === 2) {
      handNodes.forEach((h, i) => {
        const dir = i === 0 ? 1 : -1;
        const base = h.userData.baseRot || { x: 0, y: 0, z: 0 };
        h.rotation.y = base.y + mouse.currentX * 0.18 + Math.sin(elapsedTime * 1.4 + i) * 0.06 * dir;
        h.rotation.x = base.x - mouse.currentY * 0.12 + Math.cos(elapsedTime * 1.1) * 0.05 * dir;
        h.rotation.z = base.z + Math.sin(elapsedTime * 0.8 + i * 0.7) * 0.02;
      });
    }

    // Body turn — subtle in hero (mouse), content-gaze during scroll beats.
    if (storyState.gazeBeatIndex === 0) {
      robotModel.rotation.y = mouse.currentX * 0.06 + Math.sin(elapsedTime * 0.5) * 0.04;
      robotModel.rotation.x = -mouse.currentY * 0.04;
      robotModel.rotation.z = mouse.currentX * -0.04;
      robotYaw = robotModel.rotation.y;
    } else {
      robotYaw += (gazeState.yaw - robotYaw) * 0.06;
      robotModel.rotation.y = robotYaw;
      robotModel.rotation.x = Math.sin(elapsedTime * 0.5) * 0.01; // idle breath
      robotModel.rotation.z = 0;
    }
  }

  return {
    get model() { return robotModel; },
    get headBone() { return headBone; },
    update,
  };
}
