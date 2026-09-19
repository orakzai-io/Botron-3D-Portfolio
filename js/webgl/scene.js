// js/webgl/scene.js
// Owns three.js renderer / scene / camera / controls + the
// non-robot scene dressing (ground, grid, glow pad/ring, floating dust).
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function setupScene({ container }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // --- Renderer (low-power + medium precision for zero fan noise) ---
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: "low-power",
    precision: "mediump",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // update only when the scene updates
  container.appendChild(renderer.domElement);

  // --- Scene + atmosphere ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070c);
  scene.fog = new THREE.Fog(0x05070c, 260, 780);

  // Procedural room environment for reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // --- Camera + controls (camera-story owns the actual framing/intro) ---
  const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.update();

  // --- Lighting: silver studio key, cool rim, faint cyan UI accent ---
  const key = new THREE.DirectionalLight(0xf2f5fa, 3.0);
  key.position.set(200, 300, 150);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.bias = -0.0005;
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

  // --- Contact-shadow ground plane ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 2400),
    new THREE.ShadowMaterial({ opacity: 0.32 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- Infinite silver grid (dissolves into the fog) ---
  const grid = new THREE.GridHelper(2600, 64, 0x3a4552, 0x1c222b);
  grid.material.opacity = 0.55;
  grid.material.transparent = true;
  grid.material.depthWrite = false;
  scene.add(grid);

  // --- Theme glow: faint cyan pad + pulsing outer ring ---
  const glowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 64),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.045, depthWrite: false })
  );
  glowDisc.rotation.x = -Math.PI / 2;
  glowDisc.position.y = -0.4;
  scene.add(glowDisc);

  const glowRing = new THREE.Mesh(
    new THREE.RingGeometry(26, 30, 72),
    new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide })
  );
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.y = -0.38;
  scene.add(glowRing);

  // --- Floating silver dust ---
  const pGeo = new THREE.BufferGeometry();
  const pCount = isMobile ? 70 : 380;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3 + 0] = (Math.random() - 0.5) * 1400;
    pPos[i * 3 + 1] = Math.random() * 320 - 40;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 900;
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ color: 0xbcc6d4, size: 1.6, transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true })
  );
  scene.add(particles);

  return { renderer, scene, camera, controls, glowRing, particles };
}