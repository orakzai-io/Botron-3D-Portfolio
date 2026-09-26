// js/webgl/robot.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { signalBoot } from '../boot-gate.js';

// Exponential decay damping: 100% framerate-independent, never overshoots
function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

// Reverses triangle winding so a geometry baked with a mirrored
// (negative-determinant) matrix stays front-facing.
// Why: the renderer compensates for mirrored nodes at draw time via
// `frontFaceCW = object.matrixWorld.determinant() < 0` (WebGLRenderer.js),
// but baking that mirror into the geometry with applyMatrix4() — which fixes
// positions/normals but NOT the index — leaves the winding reversed on a merged
// mesh whose own determinant is positive. Result: backface culling makes the
// part render see-through ("white"). Flipping the index restores it.
// Safe to mutate: mergeByPivot always works on BufferGeometry.clone()s, whose
// index is deep-cloned (BufferGeometry.copy -> setIndex(index.clone())).
function flipWinding(geo) {
  const index = geo.getIndex();
  if (index) {
    const a = index.array;
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1];
      a[i + 1] = a[i + 2];
      a[i + 2] = t;
    }
    index.needsUpdate = true;
    return;
  }
  // Non-indexed fallback: swap the 2nd/3rd vertex of every triangle.
  for (const key in geo.attributes) {
    const attr = geo.attributes[key];
    for (let i = 0; i < attr.count; i += 3) {
      for (let k = 0; k < attr.itemSize; k++) {
        const saved = attr.getComponent(i + 1, k);
        attr.setComponent(i + 1, k, attr.getComponent(i + 2, k));
        attr.setComponent(i + 2, k, saved);
      }
    }
    attr.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// Runtime geometry merge — reduces draw calls from ~83 → ~5
// Called once after the GLTFLoader has fully decoded the model (so all
// KHR_mesh_quantization int16 attributes are already Float32 in Three.js).
// ---------------------------------------------------------------------------
function mergeByPivot(model, headBone, handNodes) {
  // Collect the 3 animated pivots. Everything else is STATIC.
  const pivots = new Set([headBone, ...handNodes].filter(Boolean));

  // For each mesh, find which pivot (if any) owns it.
  function getOwnerPivot(obj) {
    let cur = obj.parent;
    while (cur && cur !== model) {
      if (pivots.has(cur)) return cur;
      cur = cur.parent;
    }
    return null; // static
  }

  // Bucket: Map<pivot|null, Map<material, Mesh[]>>
  const buckets = new Map();
  const addToBucket = (pivot, mesh) => {
    if (!buckets.has(pivot)) buckets.set(pivot, new Map());
    const mat = mesh.material;
    if (!buckets.get(pivot).has(mat)) buckets.get(pivot).set(mat, []);
    buckets.get(pivot).get(mat).push(mesh);
  };

  // Collect all meshes, skip our JS eye panels
  const toDispose = [];
  model.traverse((obj) => {
    if (!obj.isMesh || obj.userData.isNxEye) return;
    // Skip baked eye meshes (EyeGlow_DotMatrix material) — they're dead weight
    if (obj.material && obj.material.name === 'EyeGlow_DotMatrix') {
      toDispose.push(obj);
      return;
    }
    addToBucket(getOwnerPivot(obj), obj);
  });

  // Merge each bucket
  const mergedMeshes = [];
  for (const [pivot, matMap] of buckets) {
    const parent = pivot || model;
    for (const [mat, meshes] of matMap) {
      if (meshes.length === 1) {
        // Nothing to merge — keep as-is
        mergedMeshes.push(meshes[0]);
        continue;
      }

      // Bake each mesh's world transform relative to parent into its geometry
      const geos = [];
      for (const mesh of meshes) {
        const geo = mesh.geometry.clone();

        // Convert any normalized int16 attributes to Float32 BEFORE applyMatrix4
        // (applyMatrix4 on a normalized Int16Array causes silent corruption)
        for (const name of ['position', 'normal']) {
          const attr = geo.attributes[name];
          if (!attr) continue;
          if (!(attr.array instanceof Float32Array)) {
            const f32 = new Float32Array(attr.count * attr.itemSize);
            for (let i = 0; i < attr.count; i++) {
              for (let k = 0; k < attr.itemSize; k++) {
                f32[i * attr.itemSize + k] = attr.getComponent(i, k);
              }
            }
            geo.setAttribute(name, new THREE.BufferAttribute(f32, attr.itemSize));
          }
        }

        // Bake world-to-parent-local transform
        mesh.updateWorldMatrix(true, false);
        parent.updateWorldMatrix(true, false);
        const rel = new THREE.Matrix4()
          .copy(parent.matrixWorld)
          .invert()
          .multiply(mesh.matrixWorld);
        geo.applyMatrix4(rel);

        // Mirrored parts (the GLB's scale.x = -1 nodes, e.g. the left arm and
        // left leg) reverse winding when baked — flip it back or they get
        // backface-culled and render white/see-through.
        if (rel.determinant() < 0) flipWinding(geo);

        // Strip uv if untextured to avoid mergeGeometries attribute mismatch
        if (!mat.map) geo.deleteAttribute('uv');

        geos.push(geo);
      }

      const merged = mergeGeometries(geos, false);
      if (!merged) {
        // Attribute mismatch fallback — keep originals, log warning
        console.warn('[botron] mergeGeometries returned null for', mat.name, '— keeping originals');
        meshes.forEach((m) => mergedMeshes.push(m));
        geos.forEach((g) => g.dispose());
        continue;
      }

      const mergedMesh = new THREE.Mesh(merged, mat);
      mergedMesh.castShadow = true;
      mergedMesh.receiveShadow = true;
      parent.add(mergedMesh);
      mergedMeshes.push(mergedMesh);

      // Dispose originals (already detached; toDispose holds only baked eyes)
      meshes.forEach((m) => {
        m.parent && m.parent.remove(m);
        m.geometry.dispose();
      });
      geos.forEach((g) => g.dispose());
    }
  }

  // Remove dead baked eye meshes
  toDispose.forEach((m) => {
    m.parent && m.parent.remove(m);
    m.geometry && m.geometry.dispose();
  });
}

export function createRobot({ scene, renderer, modelUrl, mouse, gazeState, storyState, env }) {
  let robotModel = null;
  let headBone = null;
  let initialBaseX = 58;
  let initialBaseY = 0;

  let handNodes = [];
  let targetScale = 1;
  let currentScale = 0.001;
  let scaleSettled = false;
  const _tmpA = new THREE.Vector3();
  const _tmpB = new THREE.Vector3();

  // Crisp bare dot-matrix vision eyes (no bezel/housing panels).
  let eyeAnchorObjs = [];
  let eyesReady = false;
  const eyePanels = [];

  // One crisp, hard-edged dot-matrix screen (6x5 square pixels, NO glow/blur).
  function createDotPanelTexture(width) {
    const cols = 6,
      rows = 5,
      pad = 6,
      dot = 26,
      gap = 4;
    const canvas = document.createElement('canvas');
    canvas.width = pad * 2 + cols * dot + (cols - 1) * gap;
    canvas.height = pad * 2 + rows * dot + (rows - 1) * gap;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    const panel = { cols, rows, pad, dot, gap, canvas, ctx, tex };

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    const aspect = canvas.width / canvas.height;
    mesh.scale.set(width, width / aspect, 1);
    mesh.material.map.needsUpdate = true;
    mesh.userData.isNxEye = true; // marks our JS eye screens so the merge never touches them
    eyePanels.push(panel);
    return mesh;
  }

  // Redraw a panel: dim full matrix + bright "iris" cross at gaze; collapses on blink.
  function drawDotGrid(panel, gazec, gazer, blink) {
    const { ctx, canvas, rows, cols, pad, dot, gap, tex } = panel;
    const litAt = (r, c) => !blink && Math.abs(r - gazer) + Math.abs(c - gazec) <= 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Soft radial halo behind every lit dot (subtle glow — keeps the hard edge).
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!litAt(r, c)) continue;
        const hx = pad + c * (dot + gap) + dot / 2;
        const hy = pad + r * (dot + gap) + dot / 2;
        const glow = ctx.createRadialGradient(hx, hy, dot * 0.25, hx, hy, dot * 2.1);
        glow.addColorStop(0, 'rgba(120,255,235,0.50)');
        glow.addColorStop(1, 'rgba(120,255,235,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(hx - dot * 2.3, hy - dot * 2.3, dot * 4.6, dot * 4.6);
      }
    }

    // Hard-edged dot layer on top (bright cores over the glow).
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = litAt(r, c);
        ctx.fillStyle = lit ? '#a8fff4' : blink ? '#0a2626' : '#0e3131';
        ctx.fillRect(pad + c * (dot + gap), pad + r * (dot + gap), dot, dot);
      }
    }
    tex.needsUpdate = true;
  }

  // Bare dot-matrix eye — NO octagon bezel, NO cavity, just the crisp dots.
  function buildEyePanel(local, R) {
    const screen = createDotPanelTexture(R * 0.9);
    screen.position.set(local.x, local.y, local.z + 0.05);
    return screen;
  }

  // Capture eye anchor world positions BEFORE any merging/deletion
  // so buildEyes() always gets pixel-identical placement.
  let capturedEyeAnchors = null;

  function captureEyeAnchors() {
    if (!headBone || !robotModel || capturedEyeAnchors) return;
    robotModel.updateMatrixWorld(true);
    if (eyeAnchorObjs.length >= 2) {
      capturedEyeAnchors = eyeAnchorObjs
        .map((o) => o.getWorldPosition(new THREE.Vector3()))
        .sort((a, b) => a.x - b.x);
    }
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

    let anchors = null;

    // Use pre-captured anchor positions if available (survives the merge/delete)
    if (capturedEyeAnchors && capturedEyeAnchors.length >= 2) {
      const list = capturedEyeAnchors.filter(
        (p) => p.x >= head.min.x && p.x <= head.max.x && p.y >= head.min.y && p.y <= head.max.y
      );
      if (list.length >= 2) anchors = [list[0], list[list.length - 1]];
    }

    // Fallback: heuristic placement
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

  // Stepped gaze-tracking + hard-edged blink
  let _lastEyeKey = -1;
  let _lastBlink = false;
  let _lastEyeDraw = -1;

  function updateEyes(t) {
    if (eyePanels.length === 0) return;

    const cycle = t % 3.2;
    const blink = cycle < 0.13;

    const cC = Math.max(0, Math.min(5, Math.round((mouse.currentX * 0.5 + 0.5) * 5)));
    const cR = Math.max(0, Math.min(4, Math.round((1 - mouse.currentY) * 0.5 * 4)));

    const eyeKey = (cC << 4) | (cR << 1) | (blink ? 1 : 0);
    if (eyeKey === _lastEyeKey) return;

    // Each redraw uploads 2 canvas textures, so steady-state iris moves are
    // time-gated to ~12.5Hz (the dot-matrix look is stepped anyway). Blink
    // transitions bypass the gate so the blink cadence is preserved exactly.
    const blinkFlipped = blink !== _lastBlink;
    if (!blinkFlipped && t - _lastEyeDraw < 0.08) return;
    _lastEyeDraw = t;
    _lastBlink = blink;
    _lastEyeKey = eyeKey;

    eyePanels.forEach((p) => drawDotGrid(p, cC, cR, blink));
  }

  // Find the two outermost side arm/hand groups for a gentle idle sway.
  // One bottom-up pass builds an Object3D → world-space Box3 map so width()
  // becomes a Map lookup instead of a subtree re-traversal with a fresh Box3
  // per query (the naive version was O(meshes × depth) Box3.setFromObject
  // calls). The numbers are identical: Box3.setFromObject is exactly the union
  // of each descendant's geometry.boundingBox transformed by its matrixWorld.
  function findHandNodes() {
    if (!robotModel) return;
    robotModel.updateMatrixWorld(true);

    const boxMap = new Map();
    const measure = (o) => {
      const box = new THREE.Box3();
      if (o.geometry !== undefined) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      }
      for (const child of o.children) box.union(measure(child));
      boxMap.set(o, box);
      return box;
    };
    const box = measure(robotModel);
    const cx = (box.min.x + box.max.x) * 0.5;
    const H = box.max.y - box.min.y;
    const lowY = box.min.y + H * 0.3;
    const topY = box.max.y - H * 0.2;
    const maxW = box.max.x - box.min.x;

    const width = (o) => {
      const b = boxMap.get(o);
      return b ? b.max.x - b.min.x : 0;
    };

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

    let left = null,
      right = null,
      bestL = -1,
      bestR = -1;
    robotModel.traverse((o) => {
      if (!o.isMesh) return;
      o.getWorldPosition(_tmpA);
      if (_tmpA.y < lowY || _tmpA.y > topY) return;
      const side = _tmpA.x >= cx ? 1 : -1;
      const root = climb(o);
      root.getWorldPosition(_tmpB);
      const d = Math.abs(_tmpB.x - cx);
      if (side === -1) {
        if (d > bestL) {
          bestL = d;
          left = root;
        }
      } else {
        if (d > bestR) {
          bestR = d;
          right = root;
        }
      }
    });

    handNodes = [left, right].filter((n) => n && n !== robotModel);
    handNodes.forEach((n) => {
      n.userData.baseRot = { x: n.rotation.x, y: n.rotation.y, z: n.rotation.z };
    });
  }

  // --- Model load (un-deferred: the boot gate covers the wait) ---
  // This used to be kicked to idle time so the GLB wouldn't compete with first
  // paint. The boot overlay now holds until the bot is actually on screen
  // (signalBoot below), so the wait is invisible and fetching immediately is
  // both safe and strictly faster.
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const startLoading = () =>
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        robotModel = model;
        model.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            if (obj.material && typeof obj.material.roughness === 'number') {
              obj.material.roughness = Math.max(obj.material.roughness, 0.04);
            }
          }
          const lowerName = obj.name.toLowerCase();
          if (!headBone && (lowerName.includes('head') || lowerName.includes('neck'))) {
            headBone = obj;
          }
          if (/cylin/i.test(lowerName)) eyeAnchorObjs.push(obj);
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.x += initialBaseX;
        initialBaseY = model.position.y - 40;
        const maxDim = Math.max(size.x, size.y, size.z);
        targetScale = 220 / maxDim;
        currentScale = targetScale * 0.2; // starts slightly scaled and expands smoothly
        model.scale.setScalar(currentScale);
        scene.add(model);

        // Step 1: capture eye anchor positions BEFORE merge deletes anything
        findHandNodes();
        captureEyeAnchors();

        // Step 2: runtime merge — 83 draws → ~5
        mergeByPivot(model, headBone, handNodes);

        // Step 3: update shadow map once from merged geometry
        renderer.shadowMap.needsUpdate = true;

        // Boot gate: fire two rAF ticks later so the first frame the user sees
        // already contains the drawn bot, not merely the added model.
        requestAnimationFrame(() => requestAnimationFrame(() => signalBoot('model')));
      },
      undefined,
      (err) => {
        console.error('Model load failed (robot will not spawn):', err.message || err);
        // Release the gate anyway — a missing bot must never block the site.
        signalBoot('model');
      }
    );

  // Start immediately — the boot overlay owns the wait (see comment above).
  startLoading();

  let robotYaw = 0;

  // --- Per-frame rig update ---
  function update(elapsedTime, dt = 0.016) {
    if (!robotModel) return;

    const visible = storyState && storyState.botVisible !== false;
    if (robotModel.visible !== visible) robotModel.visible = visible;
    if (!visible) return;

    if (!eyesReady && headBone) buildEyes();
    updateEyes(elapsedTime);

    if (!scaleSettled) {
      currentScale = damp(currentScale, targetScale, 6.0, dt);
      if (Math.abs(targetScale - currentScale) < 0.05) {
        currentScale = targetScale;
        scaleSettled = true;
      }
      robotModel.scale.setScalar(currentScale);
    }

    robotModel.position.y = initialBaseY + Math.sin(elapsedTime * 2.0) * 2.5;
    robotModel.position.x = storyState.robotBaseX + storyState.scrollDrift * 46;
    robotModel.position.z = 0;
    if (env.glowRing) env.glowRing.material.opacity = 0.05 + Math.sin(elapsedTime * 1.6) * 0.025;
    if (env.particles) env.particles.rotation.y += 0.07 * dt;

    if (headBone) {
      if (storyState.gazeBeatIndex === 0) {
        headBone.rotation.y = mouse.currentX * 0.45;
        headBone.rotation.x = -mouse.currentY * 0.3;
        headBone.rotation.z = -mouse.currentX * 0.1;
      } else if (storyState.activeBeatId === 'contact') {
        headBone.rotation.y = damp(headBone.rotation.y, -0.65, 5.0, dt);
        headBone.rotation.x = damp(headBone.rotation.x, -0.05, 5.0, dt);
        headBone.rotation.z = damp(headBone.rotation.z, 0, 3.5, dt);
      } else {
        const targetY = THREE.MathUtils.clamp(gazeState.yaw * 1.5, -1.1, 1.1);
        const targetX = THREE.MathUtils.clamp(gazeState.pitch * 1.2, -0.45, 0.45);
        headBone.rotation.y = damp(headBone.rotation.y, targetY, 4.5, dt);
        headBone.rotation.x = damp(headBone.rotation.x, targetX, 4.5, dt);
        headBone.rotation.z = damp(headBone.rotation.z, 0, 3.5, dt);
      }
    }

    if (handNodes.length === 2) {
      handNodes.forEach((h, i) => {
        const dir = i === 0 ? 1 : -1;
        const base = h.userData.baseRot || { x: 0, y: 0, z: 0 };
        h.rotation.y =
          base.y + mouse.currentX * 0.18 + Math.sin(elapsedTime * 1.4 + i) * 0.06 * dir;
        h.rotation.x = base.x - mouse.currentY * 0.12 + Math.cos(elapsedTime * 1.1) * 0.05 * dir;
        h.rotation.z = base.z + Math.sin(elapsedTime * 0.8 + i * 0.7) * 0.02;
      });
    }

    if (storyState.gazeBeatIndex === 0) {
      robotModel.rotation.y = mouse.currentX * 0.06 + Math.sin(elapsedTime * 0.5) * 0.04;
      robotModel.rotation.x = -mouse.currentY * 0.04;
      robotModel.rotation.z = mouse.currentX * -0.04;
      robotYaw = robotModel.rotation.y;
    } else if (storyState.activeBeatId === 'contact') {
      robotYaw = damp(robotYaw, -0.3, 3.8, dt);
      robotModel.rotation.y = robotYaw;
      robotModel.rotation.x = Math.sin(elapsedTime * 0.5) * 0.01;
      robotModel.rotation.z = 0;
    } else {
      robotYaw = damp(robotYaw, gazeState.yaw, 3.8, dt);
      robotModel.rotation.y = robotYaw;
      robotModel.rotation.x = Math.sin(elapsedTime * 0.5) * 0.01;
      robotModel.rotation.z = 0;
    }
  }

  return {
    get model() {
      return robotModel;
    },
    get headBone() {
      return headBone;
    },
    update,
  };
}
