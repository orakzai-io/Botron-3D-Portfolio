// js/webgl/scene.js
// Owns three.js renderer / scene / camera / controls + the
// non-robot scene dressing (grid, glow pad/ring, floating dust).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function setupScene({ container }) {
  // --- Renderer ---
  // Must use highp: mobile GPUs (Mali/Adreno) implement mediump as 16-bit half-floats (max 65504).
  // In PBR shaders (MeshStandardMaterial), Cook-Torrance GGX specular highlights exceed 65504,
  // causing fp16 overflow (NaN / Inf) which renders as black speckles and blotches on shiny surfaces.
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'low-power',
    precision: 'highp',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = false; // low-power path: nothing in the scene casts or receives a shadow
  container.appendChild(renderer.domElement);

  // --- Scene + atmosphere ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);
  scene.fog = new THREE.Fog(0x05070c, 260, 780);

  // Procedural room environment for reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // --- Camera + controls (camera-story.js owns the framing) ---
  const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 5000);
  // Controls shim — not the real OrbitControls (~25 KB), which is never used at
  // runtime. camera-story.js writes `target` and calls update() to aim the
  // camera at each story beat; that lookAt is the ONLY camera-orientation
  // source in the app, so removing it breaks every camera angle. The rest of
  // OrbitControls (spherical coords, pan, damping, limits) is absent because
  // nothing needs it: there is no orbit input, no damping and no bounds.
  const controls = {
    target: new THREE.Vector3(),
    update() {
      camera.lookAt(this.target);
    },
  };

  // --- Lighting: silver studio key, cool rim, faint cyan UI accent ---
  // No light casts a shadow: the renderer's shadowMap is disabled above.
  const key = new THREE.DirectionalLight(0xf2f5fa, 3.0);
  key.position.set(200, 300, 150);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xbfd0ff, 1.3);
  rim.position.set(-220, 150, -260);
  scene.add(rim);

  const cyanFill = new THREE.DirectionalLight(0x00f0ff, 0.8);
  cyanFill.position.set(60, 140, 260);
  scene.add(cyanFill);

  const violetFill = new THREE.DirectionalLight(0xa78bfa, 0.55);
  violetFill.position.set(-180, 80, 220);
  scene.add(violetFill);

  const fill = new THREE.AmbientLight(0x3c4658, 0.35);
  scene.add(fill);

  // No ground plane / contact shadow is created: with shadowMap disabled a
  // ShadowMaterial plane would draw nothing but still cost a pass.

  // --- Infinite silver grid (dissolves into the fog) ---
  const grid = new THREE.GridHelper(2600, 64, 0x3a4552, 0x1c222b);
  grid.material.opacity = 0.55;
  grid.material.transparent = true;
  grid.material.depthWrite = false;
  scene.add(grid);

  // --- Theme glow: faint cyan pad + pulsing outer ring ---
  const glowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 64),
    new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
    })
  );
  glowDisc.rotation.x = -Math.PI / 2;
  glowDisc.position.y = -0.4;
  scene.add(glowDisc);

  const glowRing = new THREE.Mesh(
    new THREE.RingGeometry(26, 30, 72),
    new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.y = -0.38;
  scene.add(glowRing);

  // --- Floating silver dust ---
  const pGeo = new THREE.BufferGeometry();
  const pCount = 70; // low-power dust count (full tier used 380)
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3 + 0] = (Math.random() - 0.5) * 1400;
    pPos[i * 3 + 1] = Math.random() * 320 - 40;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 900;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: 0xbcc6d4,
      size: 1.6,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  scene.add(particles);

  return { renderer, scene, camera, controls, glowRing, particles };
}
