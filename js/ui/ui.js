// js/ui/ui.js
// UI runtime: custom reticle cursor, scroll progress hairline, beat reveals.
(function () {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  const LIT_CARDS = '.bt-proj, .bt-timeline-card, .bt-edu, .bt-quote';
  if (fine) root.classList.add('bt-cursor-on');

  const cursor = document.getElementById('bt-cursor');
  if (fine && cursor) {
    const dot = cursor.querySelector('.bt-cursor-dot');
    const ring = cursor.querySelector('.bt-cursor-ring');
    let mx = innerWidth / 2,
      my = innerHeight / 2;
    let rx = mx,
      ry = my;

    let isRolling = false;

    const roll = () => {
      const dx = mx - rx;
      const dy = my - ry;
      rx += dx * 0.28;
      ry += dy * 0.28;
      // Dot is written here too — one style write per frame instead of one per
      // mousemove event (high-polling mice fire up to 1000 events/s).
      if (dot) dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
      if (ring) ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;

      // Sleep the loop once reticle ring converges on the pointer
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        requestAnimationFrame(roll);
      } else {
        isRolling = false;
        rx = mx;
        ry = my;
        if (ring) ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      }
    };

    const wakeRoll = () => {
      if (!isRolling) {
        isRolling = true;
        requestAnimationFrame(roll);
      }
    };

    addEventListener(
      'mousemove',
      (e) => {
        mx = e.clientX;
        my = e.clientY;
        // A release that happened outside the window never fires mouseup — catch
        // it here so the press state can never stick to the reticle.
        if (e.buttons === 0) cursor.classList.remove('is-down');
        wakeRoll(); // dot position is written in roll() — per frame, not per event
      },
      { passive: true }
    );

    wakeRoll();
    const hoverEls = 'a, button, .bt-chip, .bt-mini, .bt-proj, .bt-filter-pill, .bt-telemetry-hud';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest && e.target.closest(hoverEls)) cursor.classList.add('is-hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest && e.target.closest(hoverEls)) cursor.classList.remove('is-hover');
    });
    document.addEventListener('mousedown', () => cursor.classList.add('is-down'));
    document.addEventListener('mouseup', () => cursor.classList.remove('is-down'));
    addEventListener('blur', () => cursor.classList.remove('is-down')); // focus lost mid-press
  }

  // scroll progress hairline under the nav — cached document height +
  // compositor-only scaleX write, so scrolling never pairs a layout read
  // (scrollHeight) with a style write (width) on the same tick.
  const hair = document.getElementById('bt-hair');
  if (hair) {
    hair.style.width = '100%'; // CSS keeps this too; set defensively
    let _max = 1;
    let _lastPct = -1;
    const measureMax = () => {
      _max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    };
    const onScroll = () => {
      const sc = window.scrollY || document.documentElement.scrollTop || 0;
      const pct = Math.min(1, sc / _max);
      if (Math.abs(pct - _lastPct) > 0.0015) {
        // skip sub-pixel writes
        _lastPct = pct;
        hair.style.transform = `scaleX(${pct})`;
      }
    };
    measureMax();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener(
      'resize',
      () => {
        measureMax();
        onScroll();
      },
      { passive: true }
    );
    // Late layout shifts (fonts, images, reveals) — re-measure, don't poll.
    if ('ResizeObserver' in window) {
      new ResizeObserver(measureMax).observe(document.body);
    } else if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureMax);
    }
    onScroll();
  }

  // reveal narrative beats as they cross into the viewport
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.22 }
  );
  document.querySelectorAll('.bt-beat, .bt-reveal').forEach((el) => io.observe(el));

  // ============================================================
  // Testimonials carousel — prev/next + dots, 2s auto-advance
  // paused on hover and whenever the viewport is off-screen.
  // ============================================================
  const quoteViewport = document.querySelector('.bt-quotes-viewport');
  if (quoteViewport) {
    const track = quoteViewport.querySelector('.bt-quotes-track');
    const slides = quoteViewport.querySelectorAll('.bt-quote');
    const dotsEl = quoteViewport.querySelector('.bt-quotes-dots');
    const prevBtn = quoteViewport.querySelector('[data-action="prev"]');
    const nextBtn = quoteViewport.querySelector('[data-action="next"]');

    if (track && slides.length > 1) {
      const count = slides.length;
      let idx = 0;
      let timer = null;
      const AUTO_MS = 2000;

      // build the dot indicators
      if (dotsEl) {
        slides.forEach((_, i) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'bt-quotes-dot' + (i === 0 ? ' active' : '');
          dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
          dot.addEventListener('click', () => go(i));
          dotsEl.appendChild(dot);
        });
      }
      const dots = dotsEl ? Array.prototype.slice.call(dotsEl.children) : [];

      function go(i) {
        idx = (i + count) % count;
        track.style.transform = 'translateX(-' + idx * 100 + '%)';
        dots.forEach((d, j) => d.classList.toggle('active', j === idx));
      }

      function goPrev() {
        go(idx - 1);
      }
      function goNext() {
        go(idx + 1);
      }
      if (prevBtn) prevBtn.addEventListener('click', goPrev);
      if (nextBtn) nextBtn.addEventListener('click', goNext);

      function start() {
        if (!timer) timer = setInterval(goNext, AUTO_MS);
      }
      function stop() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }
      function restart() {
        stop();
        start();
      }

      quoteViewport.addEventListener('mouseenter', stop);
      quoteViewport.addEventListener('mouseleave', restart);

      // threshold 0.15, not 0.35: the deck is max-width 720px but its height is
      // the tallest quote, so on a short window 0.35 was never reached and the
      // observer kept reporting isIntersecting=false while the section was
      // plainly on screen.
      const qIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            en.isIntersecting ? start() : stop();
          });
        },
        { threshold: 0.15 }
      );

      // ORDER MATTERS: qIO.observe() must come AFTER go(0)/stop(). This element
      // is also a .bt-reveal, so the reveal observer above targets the same
      // node — registering here first let the initial IO callback start the
      // timer and the reveal path stop it a tick later, freezing the reviews
      // until an unrelated mouseenter/mouseleave happened to restart them.
      go(0);
      stop(); // wait until scrolled into view before auto-playing
      qIO.observe(quoteViewport);
    }
  }

  // ============================================================
  // Contact form — labelled fields with inline transmission errors.
  // ============================================================
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.noValidate = true;

    const clearFieldError = (input) => {
      const field = input ? input.closest('.bt-field') : null;
      if (!field || !field.classList.contains('has-error')) return;
      field.classList.remove('has-error');
      const errEl = field.querySelector('.bt-field-error');
      if (errEl) errEl.textContent = '';
    };

    // Clear error immediately when user focuses or types/edits a field
    contactForm.querySelectorAll('input, textarea').forEach((input) => {
      input.addEventListener('input', () => clearFieldError(input));
      input.addEventListener('focus', () => clearFieldError(input));
    });

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
        const field = input ? input.closest('.bt-field') : null;
        const errEl = field ? field.querySelector('.bt-field-error') : null;
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
          headers: { Accept: 'application/json' },
        });
        btn.textContent = res.ok ? 'TRANSMISSION SENT ✓' : 'TRANSMISSION FAILED ✕';
        if (res.ok) contactForm.reset();
      } catch {
        btn.textContent = 'TRANSMISSION FAILED ✕';
      }
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = label;
      }, 3000);
    });
  }

  // ── Mobile hamburger menu ──────────────────────────────────────────────
  const burger = document.getElementById('bt-burger');
  const drawer = document.getElementById('bt-drawer');

  if (burger && drawer) {
    const open = () => {
      burger.classList.add('is-open');
      drawer.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      drawer.setAttribute('aria-hidden', 'false');
    };
    const close = () => {
      burger.classList.remove('is-open');
      drawer.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      drawer.setAttribute('aria-hidden', 'true');
    };

    burger.addEventListener('click', (e) => {
      e.stopPropagation();
      burger.classList.contains('is-open') ? close() : open();
    });

    // Close when any drawer link is tapped
    drawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        close();
      });
    });

    // Close on outside tap
    document.addEventListener('click', (e) => {
      if (
        drawer.classList.contains('is-open') &&
        !drawer.contains(e.target) &&
        !burger.contains(e.target)
      ) {
        close();
      }
    });
  }

  // Tap stands in for hover. :hover never fires under a finger, and the touch
  // block in theme.css deliberately strips it so a tap cannot leave a card
  // stuck lifted -- so a tap sets .bt-lit instead, which carries the same
  // declarations as the desktop :hover rules. The next tap anywhere clears it,
  // so exactly one card is lit at a time. :focus is not used: it outlives the
  // tap and would recreate the stuck-card problem the reset avoids.
  //
  // Bound per element rather than through one document listener, so no other
  // module can interpose. There is deliberately NO hover/pointer capability
  // check here or in the CSS: gating on maxTouchPoints or a (hover: none)
  // query silently disables the whole feature in a desktop browser's device
  // emulator, which is where it was debugged and failed every time. Desktop is
  // unaffected -- its :hover rules are untouched, and .bt-lit is only ever added
  // by a real click.
  // On old iOS (e.g. iPhone 7 / iOS 12), stopPropagation on the synthetic
  // click can leak through to the document handler, causing .bt-lit to be
  // added by the card handler and then immediately cleared by the document
  // handler in the same event loop tick — the card appears to "jump" twice.
  // cardJustClicked suppresses the document clear for exactly that one tick.
  let cardJustClicked = false;

  document.querySelectorAll(LIT_CARDS).forEach((card) => {
    card.addEventListener('click', (e) => {
      // Do not trap clicks on action links or buttons inside the card
      if (e.target.closest('a, button')) return;
      e.stopPropagation();
      cardJustClicked = true;
      const wasLit = card.classList.contains('bt-lit');
      document.querySelectorAll('.bt-lit').forEach((el) => el.classList.remove('bt-lit'));
      if (!wasLit) card.classList.add('bt-lit');
    });
    // Ensure mouse departure immediately unlocks the hover/lit state on desktop
    card.addEventListener('mouseleave', () => {
      card.classList.remove('bt-lit');
    });
  });

  // Clear lit state on any tap/click outside.
  // Guard: if the click originated on a card (cardJustClicked), skip —
  // stopPropagation should have handled it, but old iOS may still dispatch here.
  document.addEventListener('click', () => {
    if (cardJustClicked) {
      cardJustClicked = false;
      return;
    }
    document.querySelectorAll('.bt-lit').forEach((el) => el.classList.remove('bt-lit'));
  });
})();
