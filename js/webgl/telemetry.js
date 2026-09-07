// js/webgl/telemetry.js
// Bottom status strip: live FPS + smoothed mouse-position readout.
export function createTelemetry(mouse) {
  let _fc = 0;
  let _ft = performance.now();

  function update() {
    _fc++;
    const now = performance.now();
    if (now - _ft > 500) {
      const fps = _fc / ((now - _ft) / 1000);
      _fc = 0;
      _ft = now;
      const f = document.getElementById("nx-fps");
      if (f) f.textContent = Math.round(fps) + " FPS";
      const m = document.getElementById("nx-mouse");
      if (m) m.textContent = (mouse.currentX * 60).toFixed(0) + "," + (-mouse.currentY * 60).toFixed(0);
    }
  }

  return { update };
}