// js/webgl/camera-story.js
// Story-driven camera: a 5-beat scroll tour plus the cinematic intro.
// Backed by the Lenis + GSAP ScrollTrigger smooth-scroll stack.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { POSES, MOBILE_BREAKPOINT, ROBOT_BASE_X_DESKTOP } from './config.js';

gsap.registerPlugin(ScrollTrigger);

// id → pose lookup (replaces a POSES.find() scan on every scrub tick)
const POSE_BY_ID = new Map(POSES.map((p) => [p.id, p]));

const _VC = new THREE.Vector3();
const _VT = new THREE.Vector3();
const _VB = new THREE.Vector3();

export function createCameraStory({ camera, controls }) {
  const beats = [];

  const recollectBeats = () => {
    beats.length = 0;
    POSES.forEach((p) => {
      const el = document.getElementById(p.id);
      if (el) beats.push({ el, c: p.c, t: p.t });
    });
  };

  // Shared state, read by gaze.js + robot.js (+ main.js render loop).
  const state = {
    scrollDrift: 0,
    beatIndex: 0,
    beatAlpha: 0,
    gazeBeatIndex: 0,
    activeBeatId: 'hero', // id of the section currently under the viewport
    botVisible: true, // whether the BOTRON model should render this beat
    robotBaseX: ROBOT_BASE_X_DESKTOP,
  };

  // Cached layout metrics — applyCameraFromScroll runs on every scrub tick, so
  // it must never read offsetTop/scrollHeight there (each read after a style
  // write forces a synchronous layout flush).
  let _docMax = 1; // max scroll Y
  let _tops = []; // beats[i].el.offsetTop

  function measure() {
    const vh = window.innerHeight || 1;
    _docMax = Math.max(1, document.documentElement.scrollHeight - vh);
    _tops = beats.map((b) => b.el.offsetTop);
  }

  function relayout() {
    const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
    state.robotBaseX = mobile ? 0 : ROBOT_BASE_X_DESKTOP;
    recollectBeats();
    measure();
  }

  // Snaps the camera to a scroll Y across the 5-beat tour (camera + gaze beat).
  function applyCameraFromScroll(y) {
    if (beats.length < 2) return;
    const vh = window.innerHeight || 1;
    if (_tops.length !== beats.length) measure(); // beats re-collected, not yet measured
    // Staleness catch (e.g. a late image grew the document): re-measure once
    // instead of reading layout on every tick.
    if (y > _docMax + vh) measure();
    state.scrollDrift = Math.max(0, Math.min(1, y / _docMax));

    // Find the segment [beats[i], beats[i+1]] the scroll position falls in.
    let i = 0;
    for (let s = 0; s < beats.length - 1; s++) {
      const segEnd = _tops[s + 1] + vh * 0.3;
      if (y < segEnd) {
        i = s;
        break;
      }
      i = s;
    }
    i = Math.max(0, Math.min(i, beats.length - 2));

    const A = beats[i];
    const B = beats[i + 1];
    const segStart = i === 0 ? 0 : _tops[i] + vh * 0.3;
    const segEnd = _tops[i + 1] + vh * 0.3;
    let r = (y - segStart) / Math.max(1, segEnd - segStart);
    r = Math.max(0, Math.min(1, r));
    const ease = 1 - Math.pow(1 - r, 2);

    _VC.set(A.c[0], A.c[1], A.c[2]).lerp(_VB.set(B.c[0], B.c[1], B.c[2]), ease);
    camera.position.copy(_VC);
    _VT.set(A.t[0], A.t[1], A.t[2]).lerp(_VB.set(B.t[0], B.t[1], B.t[2]), ease);
    controls.target.copy(_VT);

    state.beatIndex = i;
    state.beatAlpha = r;
    controls.update();

    // Gaze activates when a beat's top is ~40% up the viewport — the bot starts
    // looking at the card as soon as it appears, not late.
    let gi = 0;
    for (let s = 0; s < beats.length; s++) {
      if (y + vh * 0.4 >= _tops[s]) gi = s;
    }
    const gazeIdx = Math.max(0, Math.min(gi, beats.length - 1));
    state.gazeBeatIndex = gazeIdx;

    // Resolve the section currently leading the viewport so the robot can be
    // shown/hidden (and its updates skipped) per-beat to save GPU. POSES is
    // in DOM order, so POSES[gazeIdx] is the active beat's config.
    const curBeat = beats[gazeIdx];
    if (curBeat) {
      const pose = POSE_BY_ID.get(curBeat.el.id) || POSES[gazeIdx];
      if (pose) {
        state.activeBeatId = pose.id;
        state.botVisible = pose.bot !== false;
      }
    }
  }

  // story.update() no-op since intro is removed; camera is immediately scroll-driven
  function update() {
    return false;
  }

  // ---------- Lenis + GSAP smooth-scroll stack ----------
  const lenis = new Lenis({
    lerp: 0.09,
    smoothWheel: true,
    syncTouch: false, // Ensures mobile touch scrolling uses native GPU compositor momentum
  });
  lenis.on('scroll', ScrollTrigger.update); // keep GSAP scrub in sync with Lenis
  gsap.ticker.add((time) => lenis.raf(time * 1000)); // drive Lenis through GSAP's ticker
  gsap.ticker.lagSmoothing(0);

  // Scrubbed scroll → camera. Tight 0.25-0.4s scrub eliminates 1s rubber-band lag.
  ScrollTrigger.create({
    trigger: document.documentElement,
    start: 0,
    end: () => ScrollTrigger.maxScroll(window),
    scrub: 0.25,
    onUpdate: (self) => {
      applyCameraFromScroll(self.scroll());
    },
  });

  // Top-nav anchors hijack to Lenis (Lenis disables native smooth scrolling).
  document.querySelectorAll('.bt-nav-link, .bt-drawer-link').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        lenis.scrollTo(href, { offset: 0, duration: 1.4 });
      }
    });
  });

  // Height-only resizes (mobile URL bar collapse) do NOT need a
  // ScrollTrigger.refresh() — Lenis re-measures itself and the scrub uses
  // absolute scroll Y — and skipping it avoids re-measuring the whole
  // document inside the resize firehose.
  const onResize = (opts = {}) => {
    const widthChanged = opts.widthChanged !== false; // default true for legacy callers
    relayout();
    applyCameraFromScroll(window.scrollY || 0);
    if (widthChanged) ScrollTrigger.refresh();
  };

  relayout();
  applyCameraFromScroll(window.scrollY || 0);
  controls.update();

  // Keep the cached metrics honest: GSAP refresh re-lays-out the page, fonts
  // swap in late, and body size changes (late images, chat growth,
  // content-visibility re-layouts) all shift the beat offsets.
  ScrollTrigger.addEventListener('refresh', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);

  return { state, beats, relayout, update, onResize };
}
