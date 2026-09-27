// js/webgl/telemetry.js
// Bottom status strip: live FPS, smoothed mouse-position, and live network telemetry.
export function createTelemetry(mouse) {
  let _fc = 0;
  let _ft = performance.now();
  // Hoisted once — modules run after DOM parse, so the elements exist.
  const fpsEl = document.getElementById('bt-fps');
  const mouseEl = document.getElementById('bt-mouse');
  const netEl = document.getElementById('bt-net');

  // --- Live Network Telemetry ---
  function updateNetwork() {
    if (!netEl) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      netEl.textContent = 'NET: OFFLINE';
      netEl.style.color = '#ff5555';
      return;
    }
    netEl.style.color = '';
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      const parts = [];
      if (conn.effectiveType) parts.push(conn.effectiveType.toUpperCase());
      if (typeof conn.rtt === 'number' && conn.rtt > 0) parts.push(conn.rtt + 'ms');
      else if (typeof conn.downlink === 'number' && conn.downlink > 0)
        parts.push(conn.downlink + 'M');
      netEl.textContent = parts.length ? parts.join(' · ') : 'NET: ONLINE';
    } else {
      netEl.textContent = 'NET: ONLINE';
    }
  }

  updateNetwork();
  window.addEventListener('online', updateNetwork, { passive: true });
  window.addEventListener('offline', updateNetwork, { passive: true });

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && conn.addEventListener) {
    conn.addEventListener('change', updateNetwork, { passive: true });
  }

  function setIdle() {
    if (fpsEl && fpsEl.textContent !== 'IDLE') {
      fpsEl.textContent = 'IDLE';
    }
    _fc = 0;
    _ft = performance.now();
  }

  function update() {
    _fc++;
    const now = performance.now();
    if (now - _ft > 500) {
      const fps = _fc / ((now - _ft) / 1000);
      _fc = 0;
      _ft = now;
      if (fpsEl) fpsEl.textContent = Math.round(fps) + ' FPS';
      if (mouseEl)
        mouseEl.textContent =
          (mouse.currentX * 60).toFixed(0) + ',' + (-mouse.currentY * 60).toFixed(0);
    }
  }

  return { update, setIdle };
}

