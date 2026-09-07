// js/ui/ui.js
// UI runtime: custom reticle cursor, scroll progress hairline, beat reveals.
(function () {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  if (fine) root.classList.add('nx-cursor-on');

  const cursor = document.getElementById('nx-cursor');
  if (fine && cursor) {
    const dot = cursor.querySelector('.nx-cursor-dot');
    const ring = cursor.querySelector('.nx-cursor-ring');
    let mx = innerWidth / 2, my = innerHeight / 2;
    let dx = mx, dy = my, rx = mx, ry = my;
    addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
    const roll = () => {
      dx += (mx - dx) * 0.32; dy += (my - dy) * 0.32;
      rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
      if (dot) dot.style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0)';
      if (ring) ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(roll);
    };
    requestAnimationFrame(roll);
    const hoverEls = 'a, button, .nx-chip, .nx-mini, .nx-proj, .nx-filter-pill, .nx-telemetry-hud';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest && e.target.closest(hoverEls)) cursor.classList.add('is-hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest && e.target.closest(hoverEls)) cursor.classList.remove('is-hover');
    });
    document.addEventListener('mousedown', () => cursor.classList.add('is-down'));
    document.addEventListener('mouseup', () => cursor.classList.remove('is-down'));
  }

  // scroll progress hairline under the nav
  const hair = document.getElementById('nx-hair');
  const onScroll = () => {
    if (hair) {
      const sc = window.scrollY || document.documentElement.scrollTop || 0;
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      hair.style.width = (sc / max * 100) + '%';
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // reveal narrative beats as they cross into the viewport
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.22 });
  document.querySelectorAll('.nx-beat, .nx-reveal').forEach((el) => io.observe(el));


  // ============================================================
  // Testimonials carousel — prev/next + dots, 6s auto-advance
  // paused on hover and whenever the viewport is off-screen.
  // ============================================================
  const quoteViewport = document.querySelector('.nx-quotes-viewport');
  if (quoteViewport) {
    const track = quoteViewport.querySelector('.nx-quotes-track');
    const slides = quoteViewport.querySelectorAll('.nx-quote');
    const dotsEl = quoteViewport.querySelector('.nx-quotes-dots');
    const prevBtn = quoteViewport.querySelector('[data-action="prev"]');
    const nextBtn = quoteViewport.querySelector('[data-action="next"]');

    if (track && slides.length > 1) {
      const count = slides.length;
      let idx = 0;
      let timer = null;
      const AUTO_MS = 6000;

      // build the dot indicators
      if (dotsEl) {
        slides.forEach((_, i) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'nx-quotes-dot' + (i === 0 ? ' active' : '');
          dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
          dot.addEventListener('click', () => go(i));
          dotsEl.appendChild(dot);
        });
      }
      const dots = dotsEl ? Array.prototype.slice.call(dotsEl.children) : [];

      function go(i) {
        idx = (i + count) % count;
        track.style.transform = 'translateX(-' + (idx * 100) + '%)';
        dots.forEach((d, j) => d.classList.toggle('active', j === idx));
      }

      function goPrev() { go(idx - 1); }
      function goNext() { go(idx + 1); }
      if (prevBtn) prevBtn.addEventListener('click', goPrev);
      if (nextBtn) nextBtn.addEventListener('click', goNext);

      function start() { if (!timer) timer = setInterval(goNext, AUTO_MS); }
      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      function restart() { stop(); start(); }

      quoteViewport.addEventListener('mouseenter', stop);
      quoteViewport.addEventListener('mouseleave', restart);

      const qIO = new IntersectionObserver((entries) => {
        entries.forEach((en) => { en.isIntersecting ? start() : stop(); });
      }, { threshold: 0.35 });
      qIO.observe(quoteViewport);

      go(0);
      stop(); // wait until scrolled into view before auto-playing
    }
  }

  // ============================================================
  // Contact form — labelled fields with inline transmission errors.
  // ============================================================
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.noValidate = true;

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      let isValid = true;
      const checks = [
        { id: 'cf-name', msg: 'NAME REQUIRED' },
        { id: 'cf-email', msg: 'VALID EMAIL REQUIRED', email: true },
        { id: 'cf-subject', msg: 'SUBJECT REQUIRED' },
        { id: 'cf-message', msg: 'MESSAGE REQUIRED' },
      ];

      checks.forEach((c) => {
        const input = document.getElementById(c.id);
        const field = input ? input.closest('.nx-field') : null;
        const errEl = field ? field.querySelector('.nx-field-error') : null;
        if (!field || !errEl) return;
        field.classList.remove('has-error');
        errEl.textContent = '';
        const val = (input.value || '').trim();
        if (!val) {
          field.classList.add('has-error');
          errEl.textContent = c.msg;
          isValid = false;
        } else if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          field.classList.add('has-error');
          errEl.textContent = c.msg;
          isValid = false;
        }
      });
      if (!isValid) return;

      const btn = contactForm.querySelector('button[type="submit"]');
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'TRANSMITTING…';
      try {
        const res = await fetch(contactForm.action, {
          method: 'POST',
          body: new FormData(contactForm),
          headers: { 'Accept': 'application/json' },
        });
        btn.textContent = res.ok ? 'TRANSMISSION SENT ✓' : 'TRANSMISSION FAILED ✕';
        if (res.ok) contactForm.reset();
      } catch (err) {
        btn.textContent = 'TRANSMISSION FAILED ✕';
      }
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = label;
      }, 3000);
    });
  }
})();