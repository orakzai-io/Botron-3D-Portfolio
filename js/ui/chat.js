// js/ui/chat.js
// Interactive BOTRON RAG Chat Interface
// Built with a plug-and-play FastAPI/RAG backend hook + built-in local knowledge retriever.

// The three photos are IMPORTED, not written as bare "assets/..." strings.
// Vite only emits assets it can see statically, so a plain string would
// 404 in dist/ even though it works fine in dev.
import professionalPhoto from '../../assets/professionalpic.webp';
import swimmingPhoto from '../../assets/swimmingpic.webp';
import chessPhoto from '../../assets/chesspic.webp';

// No loading="lazy" here, unlike the project screenshots in index.html.
// These photos are only ever requested AFTER the visitor has typed a photo
// query, so intent is already proven and the cost is at most 3 files of
// <=71 KB. Worse, they are injected while the chat window is still closed and
// land inside .bt-chat-messages, an overflow-y:auto scroll container that is
// display:none until the panel opens. Chrome computes the lazy-load threshold
// against the document viewport, so inside a hidden inner scroller it defers
// the fetch: the first photo (nearest the trigger point) paints, and the ones
// below it sit as empty boxes until some scroll or resize forces a
// re-evaluation. width/height are still declared, so there is no layout shift.
const PHOTO_TAG = (url, alt, w, h) =>
  '<img class="bt-chat-photo" src="' +
  url +
  '" alt="' +
  alt +
  '" width="' +
  w +
  '" height="' +
  h +
  '" decoding="async">';

const PRO_PHOTO = PHOTO_TAG(professionalPhoto, 'Shahsawar Orakzai in a suit and tie', 577, 576);
const SWIM_PHOTO = PHOTO_TAG(
  swimmingPhoto,
  'Shahsawar Orakzai at a swimming pool wearing a medal',
  635,
  634
);
const CHESS_PHOTO = PHOTO_TAG(chessPhoto, 'Shahsawar Orakzai playing chess', 720, 1196);

// ---------------------------------------------------------------------------
// RAG BACKEND
// ---------------------------------------------------------------------------
// Configured at build time via VITE_RAG_API_URL (see .env.example), so the
// deployment URL is not hardcoded and contributors can run the site without
// editing source. Left empty, BOTRON answers locally and makes no network
// call, which is the default for a fresh clone.
const RAG_API_URL = import.meta.env.VITE_RAG_API_URL || '';
const RAG_HEALTH_URL = RAG_API_URL ? RAG_API_URL.replace(/\/chat\/?$/, '/health') : '';

// A sleeping free-tier host takes 20-45s to wake. We ping /health as soon as
// the page is idle so that cost is paid before the visitor types, not after.
const RAG_WAKE_TIMEOUT_MS = 45000;

// States: 'probing' | 'waking' | 'ready' | 'offline'
let ragState = RAG_HEALTH_URL ? 'probing' : 'offline';
let ragProbeTimeout = null;

async function checkRagHealth(timeoutMs = 15000) {
  if (!RAG_HEALTH_URL) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(RAG_HEALTH_URL, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    if (data.status === 'ready') {
      ragState = 'ready';
      return true;
    } else {
      // Backend bound port instantly and is loading weights in background
      ragState = 'waking';
      if (ragProbeTimeout) clearTimeout(ragProbeTimeout);
      ragProbeTimeout = setTimeout(() => checkRagHealth(10000), 2500);
      return false;
    }
  } catch (_err) {
    clearTimeout(t);
    ragState = 'offline';
    // Self-healing: Schedule a background re-probe after 10s so recovery is automatic
    if (ragProbeTimeout) clearTimeout(ragProbeTimeout);
    ragProbeTimeout = setTimeout(() => checkRagHealth(15000), 10000);
    return false;
  }
}

// Keep-alive ping while page is visible so free-tier containers don't suspend mid-session
function setupRagKeepAlive() {
  if (!RAG_HEALTH_URL) return;

  setInterval(() => {
    if (document.visibilityState === 'visible' && ragState === 'ready') {
      fetch(RAG_HEALTH_URL).catch(() => {});
    }
  }, 45000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ragState !== 'ready') {
      checkRagHealth(15000);
    }
  });
}

// Fire the warm-up without competing with the WebGL boot for bandwidth.
function scheduleRagWarmup() {
  if (!RAG_HEALTH_URL) return;
  const go = () => {
    checkRagHealth(RAG_WAKE_TIMEOUT_MS);
    setupRagKeepAlive();
  };
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 4000 });
  else setTimeout(go, 2500);
}

// ---------------------------------------------------------------------------
// DETERMINISTIC PHOTOS
// ---------------------------------------------------------------------------
// The photos used to be guaranteed because the local knowledge base literally
// contained the <img> tag. With the RAG answering, the model would have to
// choose to emit it, and when it instead describes the photo in words the
// images silently vanish. So photo intent is detected here and the tag is
// injected regardless of what the model said — only the prose is generated.
const PHOTO_INTENT =
  /\b(photo|photos|pic|pics|picture|pictures|image|images|portrait|portraits|snapshot|face|headshot|selfie|photograph|photographs|look\s+like|see\s+(him|his)|show\s+(me|him|his)|send\s+(me|his)|view|who\s+is\s+(shahsawar|he|this|the\s+developer|the\s+creator)|tell\s+me\s+about\s+shahsawar)\b/i;
const PHOTO_ALL = /\b(all|every|each|both)\b/i;
const PHOTO_CHESS = /\b(chess|board|game|games|strategy|strategic|tactics)\b/i;
const PHOTO_SWIM =
  /\b(swim|swimming|swimmer|medal|medals|medalist|pool|athlet|athletic|coach|coaching|competition)\b/i;

function photoTagsFor(query) {
  const q = String(query || '');
  if (!PHOTO_INTENT.test(q)) return '';
  let tags = '';
  if (PHOTO_ALL.test(q)) {
    tags = PRO_PHOTO + '<br>' + SWIM_PHOTO + '<br>' + CHESS_PHOTO;
  } else if (PHOTO_CHESS.test(q)) {
    tags = CHESS_PHOTO;
  } else if (PHOTO_SWIM.test(q)) {
    tags = SWIM_PHOTO;
  } else {
    tags = PRO_PHOTO;
  }
  return tags;
}

// If the reply already carries one of our photos (the model complied), leave
// it alone. Otherwise append ours so a photo request always shows a photo.
function ensurePhotos(query, answerHtml) {
  const tags = photoTagsFor(query);
  if (!tags) return answerHtml;
  if (/<img[^>]*class="[^"]*bt-chat-photo/.test(answerHtml)) return answerHtml;
  const label = PHOTO_CHESS.test(query)
    ? 'Chess.'
    : PHOTO_SWIM.test(query)
      ? 'Swimming.'
      : 'This is Shahsawar.';
  return answerHtml + '<br><strong>' + label + '</strong><br>' + tags;
}

export function initChat() {
  const fab = document.getElementById('bt-chat-fab');
  const win = document.getElementById('bt-chat-window');
  const closeBtn = document.getElementById('bt-chat-close-btn');
  const messagesContainer = document.getElementById('bt-chat-messages');
  const input = document.getElementById('bt-chat-input');
  const sendBtn = document.getElementById('bt-chat-send-btn');
  const suggestionsContainer = document.getElementById('bt-chat-suggestions');
  const botronBubble = document.getElementById('botron-bubble');
  const scrollBtn = document.getElementById('bt-chat-scroll-btn');

  if (!win || !input || !messagesContainer) return;

  let isOpen = false;

  // --- Mobile FAB: show the label, then collapse to a circle. ---
  // The pill is the only affordance that says "tap me" on touch (the 3D speech
  // bubble is display:none <=900px), but a wide label sitting at the bottom
  // right overlaps the .bt-strip status bar. So: expanded on load, collapsing
  // to a circle after a beat, and it is still a single-tap control throughout.
  // Desktop is untouched -- it has room, and :hover is a better affordance
  // than a timer.
  // MUST stay matched to the two CSS breakpoints: the 900px rule that hides the
  // 3D speech bubble (theme.css) and the 900px block that draws .is-collapsed
  // (chat.css). At 600px, a 601-900px screen got no bubble and no collapse.
  const collapseQuery = window.matchMedia('(max-width: 900px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let fabCollapseTimer = null;

  function setFabCollapsed(collapsed) {
    if (!fab) return;
    fab.classList.toggle('is-collapsed', collapsed);
  }

  function scheduleFabCollapse() {
    if (!fab) return;
    clearTimeout(fabCollapseTimer);
    // No auto-collapse for reduced-motion users: a control that changes shape
    // on a timer is disorienting when motion sensitivity is declared.
    if (reducedMotion.matches || !collapseQuery.matches) return;
    fabCollapseTimer = setTimeout(() => {
      // Never collapse out from under an open window.
      if (!isOpen) setFabCollapsed(true);
    }, 3500);
  }

  if (fab) {
    // ONE tap always opens the chat, whether the FAB is a pill or a circle.
    // (An earlier version peeked the label on the first tap when collapsed, which
    // made the control a 3-step flow: circle -> label -> chat. The circle already
    // carries the same pulsing dot and chat icon, and the aria-label is
    // "Open BOTRON", so it is not ambiguous enough to justify that cost.)
    scheduleFabCollapse();
    // Re-evaluate when crossing the breakpoint so a desktop->mobile resize
    // doesn't leave a stale collapsed pill behind.
    collapseQuery.addEventListener('change', () => {
      clearTimeout(fabCollapseTimer);
      if (!collapseQuery.matches) setFabCollapsed(false);
      else scheduleFabCollapse();
    });
  }

  function syncBubbleState(open) {
    if (!botronBubble) return;
    const textEl = botronBubble.querySelector('p');
    if (!textEl) return;
    if (open) {
      textEl.innerHTML = `// <span style="color:#00f0ff">RAG ONLINE • [CLICK TO CLOSE]</span>`;
    } else {
      textEl.innerHTML = `// <span style="color:#00f0ff">BOTRON IDLE • [CLICK TO REOPEN]</span>`;
    }
  }

  function scrollToBottom(smooth = true) {
    requestAnimationFrame(() => {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
      // Second tick ensures layout updates (typing dots, markdown render) are accounted for
      setTimeout(() => {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto',
        });
        updateScrollBtn();
      }, 50);
    });
  }

  function openChat() {
    isOpen = true;
    win.classList.add('is-open');
    win.setAttribute('aria-hidden', 'false');
    syncBubbleState(true);
    input.focus();
    scrollToBottom(false);
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('is-open');
    win.setAttribute('aria-hidden', 'true');
    syncBubbleState(false);
  }

  function toggleChat() {
    if (isOpen) closeChat();
    else openChat();
  }

  if (fab) fab.addEventListener('click', toggleChat);
  if (closeBtn) closeBtn.addEventListener('click', closeChat);

  // Hide BOTRON chat button when reaching footer so all social icons are clean to scan
  const footerEl = document.querySelector('.bt-footer');

  function updateFabFooterVisibility() {
    if (!fab || !footerEl) return;
    const footerRect = footerEl.getBoundingClientRect();
    // When the footer enters the bottom of the viewport
    const isAtFooter = footerRect.top <= window.innerHeight - 10;
    if (isAtFooter) {
      fab.classList.add('is-footer-hidden');
    } else {
      fab.classList.remove('is-footer-hidden');
    }
  }

  if (footerEl && fab) {
    if ('IntersectionObserver' in window) {
      const footerObs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              fab.classList.add('is-footer-hidden');
            } else {
              updateFabFooterVisibility();
            }
          });
        },
        { rootMargin: '0px 0px -10px 0px', threshold: 0 }
      );
      footerObs.observe(footerEl);
    } else {
      // No IntersectionObserver (ancient browser): fall back to a scroll poll.
      window.addEventListener('scroll', updateFabFooterVisibility, { passive: true });
    }

    window.addEventListener('resize', updateFabFooterVisibility, { passive: true });
    updateFabFooterVisibility();
  }

  // Hook into the 3D robot speech bubble — click to toggle open/close
  if (botronBubble) {
    botronBubble.addEventListener('click', () => {
      toggleChat();
    });
  }

  // --- Missing-photo fallback ---
  // The three photos in assets/ are real files on disk. If one is ever moved, renamed
  // or not yet added, swap the broken-image icon for a sentence rather than
  // showing a torn-image glyph. 'error' does not bubble, hence capture=true.
  if (messagesContainer) {
    messagesContainer.addEventListener(
      'error',
      (e) => {
        const photo = e.target;
        if (!photo.classList || !photo.classList.contains('bt-chat-photo')) return;
        const note = document.createElement('span');
        note.className = 'photo-error';
        note.textContent = 'Photo unavailable right now.';
        photo.replaceWith(note);
      },
      true
    );
  }
  // --- Photo lightbox ---
  // The inline thumbnail is too small to actually see a face, so tapping it
  // opens a full-size overlay. Delegated on the messages container because
  // photo responses are appended dynamically, not present at init.
  function openPhotoLightbox(src, alt) {
    const box = document.createElement('div');
    box.className = 'bt-photo-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', alt || 'Photo');
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    box.appendChild(img);
    // One teardown path for both exits (click and Escape), so the document-level
    // keydown listener can never outlive the overlay it belongs to.
    function onKey(e) {
      if (e.key === 'Escape') close();
    }
    const close = () => {
      document.removeEventListener('keydown', onKey, true);
      box.remove();
    };
    box.addEventListener('click', close);
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(box);
  }

  if (messagesContainer) {
    messagesContainer.addEventListener('click', (e) => {
      const photo = e.target.closest('.bt-chat-photo');
      if (!photo) return;
      e.preventDefault();
      openPhotoLightbox(photo.src, photo.alt);
    });
  }
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeChat();
    }
  });

  // Hide the quick suggestion chips after the user asks their first question
  function hideSuggestions() {
    if (suggestionsContainer && !suggestionsContainer.classList.contains('is-hidden')) {
      suggestionsContainer.classList.add('is-hidden');
    }
  }

  function getTimeString() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // --- HTML sanitiser ---
  // Bot replies are LLM output, and the LLM is fed raw visitor text, so the
  // response is untrusted. Previously any reply containing a known tag was
  // passed through to innerHTML untouched, which let a crafted question make
  // the model emit markup that then executed in the page. Everything is now
  // parsed and rebuilt from an allowlist: unknown elements are unwrapped, and
  // any attribute not explicitly permitted is dropped.
  const SANITIZE_TAGS = new Set([
    'A',
    'B',
    'BR',
    'CODE',
    'DIV',
    'EM',
    'I',
    'IMG',
    'LI',
    'OL',
    'P',
    'PRE',
    'SPAN',
    'STRONG',
    'UL',
  ]);
  // Removed outright along with their text content.
  const SANITIZE_DROP = new Set([
    'SCRIPT',
    'STYLE',
    'IFRAME',
    'OBJECT',
    'EMBED',
    'LINK',
    'META',
    'FORM',
    'SVG',
  ]);
  const SANITIZE_ATTRS = {
    A: ['href', 'target', 'rel', 'title', 'download'],
    IMG: ['src', 'alt', 'width', 'height', 'loading', 'decoding', 'class'],
    SPAN: ['class'],
    DIV: ['class'],
  };
  // Allows your own relative assets, absolute paths, real links and mailto:.
  // Blocks javascript:, data:, vbscript: and every other scheme.
  // NOTE: "assets/..." is allowed because the resume PDF is linked that way
  // (assets/Shahsawar.dev.pdf). Without it the sanitiser stripped the href.
  const SANITIZE_URL = /^(https?:\/\/|mailto:|\/(?!\/)|\.\/|\.\.\/|assets\/|#)/i;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeHtml(html) {
    if (!html) return '';
    if (!/<[a-zA-Z]/.test(html)) return html;
    const doc = new DOMParser().parseFromString(
      '<div id="bt-san-root">' + html + '</div>',
      'text/html'
    );
    const root = doc.getElementById('bt-san-root');
    if (!root) return escapeHtml(html);
    const stack = [root];
    while (stack.length) {
      const node = stack.pop();
      for (const el of Array.from(node.children)) {
        const tag = el.tagName.toUpperCase();
        if (SANITIZE_DROP.has(tag)) {
          el.remove();
          continue;
        }
        if (!SANITIZE_TAGS.has(tag)) {
          // unwrap: keep the words, lose the element
          const parent = el.parentNode;
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          el.remove();
          stack.push(parent);
          continue;
        }
        const allowed = SANITIZE_ATTRS[tag] || [];
        for (const a of Array.from(el.attributes)) {
          const n = a.name.toLowerCase();
          if (allowed.indexOf(n) === -1) {
            el.removeAttribute(a.name);
            continue;
          }
          if ((n === 'href' || n === 'src') && !SANITIZE_URL.test(a.value.trim())) {
            el.removeAttribute(a.name);
          }
        }
        if (tag === 'A') {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer nofollow');
        }
        stack.push(el);
      }
    }
    return root.innerHTML;
  }
  // The backend can only be told the *source* path (assets/professionalpic.webp);
  // Vite rewrites the real files to content-hashed names, so anything coming back
  // from the LLM is remapped to the imported URL here. Without this the backend
  // photo path always rendered a broken image.
  const PHOTO_SRC_MAP = new Map([
    ['assets/professionalpic.webp', professionalPhoto],
    ['assets/swimmingpic.webp', swimmingPhoto],
    ['assets/chesspic.webp', chessPhoto],
  ]);
  function remapPhotoSrc(html) {
    // Any <img> in a reply is a photo we injected, and it renders inside
    // .bt-chat-messages (an overflow-y:auto scroller that is display:none until
    // the panel opens). A loading="lazy" there makes Chrome defer the fetch
    // against the document viewport, so the first photo paints and the rest
    // never load at all. The attribute is stripped from every incoming tag
    // rather than trusting the model prompt to omit it.
    return html
      .replace(/(<img[^>]*?)\s+loading=(["'])lazy\2/gi, '$1')
      .replace(/(<img[^>]*?src=")([^"]+)(")/g, (full, pre, src, post) => {
        const mapped = PHOTO_SRC_MAP.get(src.trim());
        return mapped ? pre + mapped + post : full;
      });
  }

  function formatMarkdown(text) {
    if (!text) return '';
    const mapped = remapPhotoSrc(text);
    const parsed = mapped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^[-•*]\s+(.*)$/gm, '• $1')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
    return sanitizeHtml(parsed);
  }

  function appendMessage(text, sender = 'bot', meta = null) {
    const msgEl = document.createElement('div');
    msgEl.className = `bt-chat-msg bt-chat-msg--${sender}`;

    let metaHtml = '';
    if (meta && meta.sources && meta.sources.length) {
      const topSources = meta.sources
        .slice(0, 2)
        .map((s) =>
          escapeHtml(
            String(s.title || '')
              .split('—')[0]
              .trim()
          )
        )
        .join(', ');
      const sim = meta.sources[0]?.similarity
        ? ` • ${(meta.sources[0].similarity * 100).toFixed(0)}% MATCH`
        : '';
      const latency = meta.retrieval_time_ms ? ` • ${meta.retrieval_time_ms}ms` : '';
      metaHtml = `
        <div class="bt-chat-msg-meta">
          <span class="bt-meta-badge">⚡ VECTOR RAG</span>
          <span class="bt-meta-details">${topSources}${sim}${latency}</span>
        </div>
      `;
    }

    // User text is escaped outright: it is never markup. Bot text goes
    // through formatMarkdown, which sanitises before it reaches innerHTML.
    const contentHtml = sender === 'user' ? escapeHtml(text) : formatMarkdown(text);

    msgEl.innerHTML = `
      <div class="bt-chat-bubble">${contentHtml}</div>
      ${metaHtml}
      <span class="bt-chat-time">${getTimeString()}</span>
    `;
    messagesContainer.appendChild(msgEl);
    scrollToBottom(true);
  }

  // --- Scroll-to-bottom button ---
  function updateScrollBtn() {
    if (!scrollBtn) return;
    const distFromBottom =
      messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;
    if (distFromBottom > 80) {
      scrollBtn.classList.add('is-visible');
    } else {
      scrollBtn.classList.remove('is-visible');
    }
  }

  messagesContainer.addEventListener('scroll', updateScrollBtn, { passive: true });

  if (scrollBtn) {
    scrollBtn.addEventListener('click', () => {
      scrollToBottom(true);
    });
  }

  function showTypingIndicator() {
    const typingEl = document.createElement('div');
    typingEl.className = 'bt-chat-typing';
    typingEl.id = 'bt-chat-typing';
    typingEl.innerHTML = `
      <span class="bt-chat-typing-dot"></span>
      <span class="bt-chat-typing-dot"></span>
      <span class="bt-chat-typing-dot"></span>
      <span class="bt-chat-typing-txt">BOTRON IS THINKING...</span>
    `;
    messagesContainer.appendChild(typingEl);
    scrollToBottom(true);
  }

  function removeTypingIndicator() {
    const typingEl = document.getElementById('bt-chat-typing');
    if (typingEl) typingEl.remove();
  }

  async function handleSendMessage(text) {
    const query = text || input.value.trim();
    if (!query) return;

    hideSuggestions();
    appendMessage(query, 'user');
    input.value = '';
    showTypingIndicator();

    // No backend configured: stay local and instant.
    // If backend is currently offline, answer locally and trigger background probe.
    if (!RAG_API_URL) {
      removeTypingIndicator();
      appendMessage(ensurePhotos(query, offlineAnswer(query)), 'bot');
      return;
    }

    if (ragState === 'offline') {
      checkRagHealth(10000);
      removeTypingIndicator();
      appendMessage(ensurePhotos(query, offlineAnswer(query)), 'bot');
      return;
    }

    let timeoutId = null;
    try {
      // While the host is waking or probing, allow the wake budget.
      const budget = ragState === 'ready' ? 12000 : RAG_WAKE_TIMEOUT_MS;
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), budget);

      const response = await fetch(RAG_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      ragState = 'ready';
      removeTypingIndicator();
      const answer = data.answer || data.response || 'No response generated.';
      appendMessage(ensurePhotos(query, formatMarkdown(answer)), 'bot', data);
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      const wasWaking = ragState === 'waking' || ragState === 'probing';
      if (err && err.name === 'AbortError' && wasWaking) {
        removeTypingIndicator();
        appendMessage(
          '<em>// RAG BACKEND IS STILL WAKING UP // sleeping hosts take 20-45s to start. ' +
            'It may be back shortly; meanwhile BOTRON can still show you his projects.</em><br>' +
            ensurePhotos(query, offlineAnswer(query)),
          'bot'
        );
        return;
      }
      ragState = 'offline';
      if (ragProbeTimeout) clearTimeout(ragProbeTimeout);
      ragProbeTimeout = setTimeout(() => checkRagHealth(10000), 5000);
      removeTypingIndicator();
      appendMessage(ensurePhotos(query, offlineAnswer(query)), 'bot');
    }
  }

  function offlineAnswer(query) {
    return (
      '<em>// RAG BACKEND OFFLINE // answering from the local index.</em><br>' +
      'Shahsawar Orakzai is a Full-Stack AI Engineer and Computer Science undergraduate at UAP ' +
      'with a 4.0 CGPA and dual Harvard CS50x/CS50P credentials. He has delivered 5+ production ' +
      'AI applications, including <strong>REDNOTE</strong> (vector RAG over 10,000+ chunks), ' +
      'an async scraping intelligence pipeline, and <strong>VaultGuard</strong>, a zero-knowledge ' +
      'credential vault. He is also a former MINDGIGS Python intern, a 10-year National Swimmer, ' +
      'and a competitive chess player.<br><br>Once the backend is reachable I can answer in detail. ' +
      'Please try again in a moment.'
    );
  }

  // Warm the host before anyone types, without blocking the 3D boot.
  scheduleRagWarmup();

  if (sendBtn) {
    sendBtn.addEventListener('click', () => handleSendMessage());
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Handle Quick Chips click
  if (suggestionsContainer) {
    suggestionsContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.bt-chat-chip');
      if (chip && chip.dataset.query) {
        handleSendMessage(chip.dataset.query);
      }
    });
  }
}

// Auto-boot chat once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChat);
} else {
  initChat();
}
