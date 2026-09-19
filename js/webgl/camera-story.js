// js/webgl/camera-story.js
// Story-driven camera: a 5-beat scroll tour plus the cinematic intro.
// Backed by the Lenis + GSAP ScrollTrigger smooth-scroll stack.
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { POSES, MOBILE_BREAKPOINT, ROBOT_BASE_X_DESKTOP } from "./config.js";

gsap.registerPlugin(ScrollTrigger);

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
    activeBeatId: "hero", // id of the section currently under the viewport
    botVisible: true,     // whether the NEXBOT model should render this beat
    robotBaseX: ROBOT_BASE_X_DESKTOP,
  };

  function relayout() {
    const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
    state.robotBaseX = mobile ? 0 : ROBOT_BASE_X_DESKTOP;
    recollectBeats();
  }

  // Snaps the camera to a scroll Y across the 5-beat tour (camera + gaze beat).
  function applyCameraFromScroll(y) {
    if (beats.length < 2) return;
    const vh = window.innerHeight || 1;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    state.scrollDrift = Math.max(0, Math.min(1, y / max));

    // Find the segment [beats[i], beats[i+1]] the scroll position falls in.
    let i = 0;
    for (let s = 0; s < beats.length - 1; s++) {
      const segEnd = beats[s + 1].el.offsetTop + vh * 0.3;
      if (y < segEnd) { i = s; break; }
      i = s;
    }
    i = Math.max(0, Math.min(i, beats.length - 2));

    const A = beats[i];
    const B = beats[i + 1];
    const segStart = i === 0 ? 0 : A.el.offsetTop + vh * 0.3;
    const segEnd = B.el.offsetTop + vh * 0.3;
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
      if (y + vh * 0.4 >= beats[s].el.offsetTop) gi = s;
    }
    const gazeIdx = Math.max(0, Math.min(gi, beats.length - 1));
    state.gazeBeatIndex = gazeIdx;

    // Resolve the section currently leading the viewport so the robot can be
    // shown/hidden (and its updates skipped) per-beat to save GPU. POSES is
    // in DOM order, so POSES[gazeIdx] is the active beat's config.
    const curBeat = beats[gazeIdx];
    if (curBeat) {
      const pose = POSES.find((p) => p.id === curBeat.el.id) || POSES[gazeIdx];
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
  lenis.on("scroll", ScrollTrigger.update);          // keep GSAP scrub in sync with Lenis
  gsap.ticker.add((time) => lenis.raf(time * 1000)); // drive Lenis through GSAP's ticker
  gsap.ticker.lagSmoothing(0);

  // Scrubbed scroll → camera. span the whole document; scrub = 1 for buttery motion.
  ScrollTrigger.create({
    trigger: document.documentElement,
    start: 0,
    end: () => ScrollTrigger.maxScroll(window),
    scrub: 1,
    onUpdate: (self) => {
      applyCameraFromScroll(self.scroll());
    },
  });

  // Top-nav anchors hijack to Lenis (Lenis disables native smooth scrolling).
  document.querySelectorAll(".nx-nav-link, .nx-drawer-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        lenis.scrollTo(href, { offset: 0, duration: 1.4 });
      }
    });
  });


  const onResize = () => {
    relayout();
    applyCameraFromScroll(window.scrollY || 0);
    ScrollTrigger.refresh();
  };

  relayout();
  applyCameraFromScroll(window.scrollY || 0);
  document.body.classList.add("intro-complete");
  controls.update();

  return { state, beats, relayout, update, onResize };
}
