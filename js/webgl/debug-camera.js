// js/webgl/debug-camera.js
// Temporary tool: press "D" to freely drag the camera and read its x/y/z live.
// Remove this file (and its one import) once you're done tuning POSES.

export function createDebugOverlay({ camera, controls }) {
  const box = document.createElement("div");
  box.style.cssText = `
    position: fixed; top: 10px; left: 10px; z-index: 99999;
    background: rgba(0,0,0,0.75); color: #0f0; font-family: monospace;
    font-size: 13px; padding: 10px 14px; border-radius: 6px;
    line-height: 1.5; white-space: pre; pointer-events: none;
    display: none;
  `;
  document.body.appendChild(box);

  let active = false;

  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "d") return;
    active = !active;
    controls.enabled = active;       // lets you drag/zoom/pan with mouse
    box.style.display = active ? "block" : "none";
    console.log(active ? "[debug] camera drag ON — drag with mouse, don't scroll" : "[debug] camera drag OFF");
  });

  function tick() {
    if (active) {
      const p = camera.position;
      const t = controls.target;
      box.textContent =
        `CAMERA DRAG MODE (press D to exit)\n\n` +
        `c: [${p.x.toFixed(0)}, ${p.y.toFixed(0)}, ${p.z.toFixed(0)}]\n` +
        `t: [${t.x.toFixed(0)}, ${t.y.toFixed(0)}, ${t.z.toFixed(0)}]`;
    }
    requestAnimationFrame(tick);
  }
  tick();
}