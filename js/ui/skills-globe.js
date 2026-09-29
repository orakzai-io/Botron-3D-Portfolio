// js/ui/skills-globe.js
// 3D Holographic Skills Globe & Telemetry HUD Engine
// Mathematical spherical projection on HTML5 Canvas (zero WebGL context overhead).

export const SKILLS_DATA = [
  // AI & LLM (9)
  {
    id: 'openai',
    name: 'OpenAI API',
    category: 'ai',
    catLabel: 'AI & LLM',
    level: 99,
    icon: '⚡',
    desc: 'GPT-4o/o1 reasoning, tool-calling pipelines & system guardrails',
  },
  {
    id: 'groq',
    name: 'Groq API',
    category: 'ai',
    catLabel: 'AI & LLM',
    level: 95,
    icon: '⚡',
    desc: 'Ultra-low latency LLM inference & high-throughput async processing',
  },
  {
    id: 'agents',
    name: 'AI Agents',
    category: 'ai',
    catLabel: 'AI & LLM',
    level: 92,
    icon: '🤖',
    desc: 'Autonomous multi-agent orchestration, state loops & task delegation',
  },
  {
    id: 'rag',
    name: 'RAG Systems',
    category: 'ai',
    catLabel: 'AI & LLM',
    level: 92,
    icon: '🧠',
    desc: 'Sub-250ms semantic search over 10k+ chunks with hybrid re-ranking',
  },
  {
    id: 'pgvector',
    name: 'pgvector',
    category: 'ai',
    catLabel: 'AI & LLM',
    level: 95,
    icon: '📦',
    desc: 'High-dimensional embeddings, IVFFlat / HNSW vector indexing',
  },
  {
    id: 'langchain',
    name: 'LangChain',
    category: 'ai',
    catLabel: 'AI & LLM',
    level: 90,
    icon: '🔗',
    desc: 'Chains, prompt composition, output parsers & document loaders',
  },
  {
    id: 'prompt',
    name: 'Prompt Eng.',
    category: 'ai',
    catLabel: 'AI & LLM',
    level: 95,
    icon: '🎯',
    desc: 'Few-shot elicitation, structured JSON schemas & hallucination curbs',
  },
  {
    id: 'langsmith',
    name: 'LangSmith',
    category: 'ai',
    catLabel: 'AI & LLM',
    level: 88,
    icon: '🔬',
    desc: 'LLM observability, run tracing, latency metrics & evaluation datasets',
  },
  {
    id: 'n8n-ai',
    name: 'n8n Automation',
    category: 'ai',
    catLabel: 'AI & LLM',
    level: 88,
    icon: '🔄',
    desc: 'Workflow event pipelines, webhook triggers & autonomous ETL flows',
  },

  // Backend & Data (7)
  {
    id: 'python',
    name: 'Python',
    category: 'backend',
    catLabel: 'Backend & Data',
    level: 99,
    icon: '🐍',
    desc: 'Core language: async architecture, high concurrency & data pipelines',
  },
  {
    id: 'fastapi',
    name: 'FastAPI',
    category: 'backend',
    catLabel: 'Backend & Data',
    level: 90,
    icon: '🚀',
    desc: 'Asynchronous REST APIs, OpenAPI schemas & dependency injection',
  },
  {
    id: 'asyncio',
    name: 'Asyncio',
    category: 'backend',
    catLabel: 'Backend & Data',
    level: 85,
    icon: '⚡',
    desc: 'Non-blocking I/O event loops, concurrent task pools & streams',
  },
  {
    id: 'pydantic',
    name: 'Pydantic',
    category: 'backend',
    catLabel: 'Backend & Data',
    level: 90,
    icon: '🛡️',
    desc: 'Runtime data validation, immutable settings & type coercion',
  },
  {
    id: 'postgres',
    name: 'SQL / PostgreSQL',
    category: 'backend',
    catLabel: 'Backend & Data',
    level: 82,
    icon: '🐘',
    desc: 'Relational schemas, ACID transactions, complex indexing & CTEs',
  },
  {
    id: 'sqlalchemy',
    name: 'SQLAlchemy',
    category: 'backend',
    catLabel: 'Backend & Data',
    level: 80,
    icon: '🗄️',
    desc: 'Async ORM, query optimization, connection pooling & migrations',
  },
  {
    id: 'cpp',
    name: 'C / C++',
    category: 'backend',
    catLabel: 'Backend & Data',
    level: 75,
    icon: '⚙️',
    desc: 'Systems programming, memory management & algorithmic foundations',
  },

  // DevOps & Cloud (4)
  {
    id: 'docker',
    name: 'Docker',
    category: 'devops',
    catLabel: 'DevOps & Cloud',
    level: 80,
    icon: '🐳',
    desc: 'Multi-stage builds, lightweight images & container orchestration',
  },
  {
    id: 'gh-actions',
    name: 'GitHub Actions',
    category: 'devops',
    catLabel: 'DevOps & Cloud',
    level: 90,
    icon: '⚙️',
    desc: 'Automated CI/CD pipelines deploying builds in under 3 minutes',
  },
  {
    id: 'linux',
    name: 'Linux / Bash',
    category: 'devops',
    catLabel: 'DevOps & Cloud',
    level: 85,
    icon: '🐧',
    desc: 'POSIX shell scripting, process monitoring, permissions & SSH',
  },
  {
    id: 'cicd',
    name: 'CI/CD Pipelines',
    category: 'devops',
    catLabel: 'DevOps & Cloud',
    level: 85,
    icon: '🔄',
    desc: 'Automated test suites, artifact packaging & deployment gates',
  },

  // Frontend (5)
  {
    id: 'typescript',
    name: 'TypeScript',
    category: 'frontend',
    catLabel: 'Frontend',
    level: 85,
    icon: '🔷',
    desc: 'Static typing, interfaces, generics & robust client-side state',
  },
  {
    id: 'javascript',
    name: 'JavaScript ES6+',
    category: 'frontend',
    catLabel: 'Frontend',
    level: 85,
    icon: '📜',
    desc: 'Modern async/await, ES modules, DOM APIs & performance tuning',
  },
  {
    id: 'react',
    name: 'React',
    category: 'frontend',
    catLabel: 'Frontend',
    level: 75,
    icon: '⚛️',
    desc: 'Component architecture, custom hooks & reactive state management',
  },
  {
    id: 'html5',
    name: 'HTML5 Semantic',
    category: 'frontend',
    catLabel: 'Frontend',
    level: 95,
    icon: '🌐',
    desc: 'Clean DOM hierarchies, accessibility standards & SEO optimization',
  },
  {
    id: 'css3',
    name: 'Modern CSS3',
    category: 'frontend',
    catLabel: 'Frontend',
    level: 95,
    icon: '🎨',
    desc: 'Glassmorphism, custom properties, responsive grids & animations',
  },

  // Tools & Workflow (4)
  {
    id: 'git',
    name: 'Git / GitHub',
    category: 'tools',
    catLabel: 'Tools & Workflow',
    level: 90,
    icon: '🐙',
    desc: 'Feature-branch git workflows, interactive rebasing & PR reviews',
  },
  {
    id: 'n8n',
    name: 'n8n Platform',
    category: 'tools',
    catLabel: 'Tools & Workflow',
    level: 88,
    icon: '🔌',
    desc: 'Self-hosted integration engine & API orchestration workflows',
  },
  {
    id: 'vscode',
    name: 'VS Code',
    category: 'tools',
    catLabel: 'Tools & Workflow',
    level: 92,
    icon: '💻',
    desc: 'Productive developer tooling, linting, debugger & SSH workspaces',
  },
  {
    id: 'pgadmin',
    name: 'pgAdmin',
    category: 'tools',
    catLabel: 'Tools & Workflow',
    level: 80,
    icon: '📊',
    desc: 'Database administration, query execution analysis & indexing review',
  },
];

// Two-color contract: cyan × violet only — categories differ by shade/depth, never hue.
const CATEGORY_COLORS = {
  ai: {
    main: '#00f0ff',
    glow: 'rgba(0, 240, 255, 0.45)',
    bg: 'rgba(0, 240, 255, 0.12)',
    dot: '#00f0ff',
  },
  backend: {
    main: '#67e8f9',
    glow: 'rgba(103, 232, 249, 0.45)',
    bg: 'rgba(103, 232, 249, 0.12)',
    dot: '#67e8f9',
  },
  devops: {
    main: '#a78bfa',
    glow: 'rgba(167, 139, 250, 0.45)',
    bg: 'rgba(167, 139, 250, 0.12)',
    dot: '#a78bfa',
  },
  frontend: {
    main: '#c4b5fd',
    glow: 'rgba(196, 181, 253, 0.45)',
    bg: 'rgba(196, 181, 253, 0.12)',
    dot: '#c4b5fd',
  },
  tools: {
    main: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.45)',
    bg: 'rgba(139, 92, 246, 0.12)',
    dot: '#8b5cf6',
  },
};

export class SkillsGlobe {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.container = this.canvas.parentElement;

    // Single look: always the 1x backing store, no canvas shadows, ~30fps cap.
    this.isIntersecting = false; // gates per-event getBoundingClientRect reads
    this._lastT = 0;
    // Per-frame caches (see render / drawNodeBadge / drawCyberCore)
    this._metrics = new Map(); // font+text → measured width (memoized measureText)
    this._font = null; // last font string set on ctx
    this._sorted = []; // scratch array for the per-frame z-sort
    this._gradCache = new Map(); // rounded radius → cached canvas gradient
    this.activeCategory = 'all';
    this.hoveredSkill = null;
    this.selectedSkill = SKILLS_DATA[0]; // default to OpenAI / primary

    // Spherical rotation angles and velocities
    this.rotX = 0.2;
    this.rotY = 0.4;
    this.velX = 0.0025;
    this.velY = 0.0055;
    this.targetVelX = 0.0025;
    this.targetVelY = 0.0055;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseCanvasX = -9999;
    this.mouseCanvasY = -9999;
    this.pulseTime = 0;

    // Build Fibonacci 3D nodes
    this.nodes = this.buildNodes();

    this.initCanvasSize();
    this.bindEvents();
    this.updateTelemetryCard(this.selectedSkill);
    this.render = this.render.bind(this);
    this.isRunning = false;
    this.render(); // Draw initial static frame immediately
    this.initIntersectionObserver();
  }

  buildNodes() {
    const N = SKILLS_DATA.length;
    return SKILLS_DATA.map((skill, i) => {
      // Golden spiral distribution on unit sphere
      const phi = Math.acos(1 - (2 * (i + 0.5)) / N);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

      const ux = Math.sin(phi) * Math.cos(theta);
      const uy = Math.cos(phi);
      const uz = Math.sin(phi) * Math.sin(theta);

      return {
        ...skill,
        ux,
        uy,
        uz, // unit sphere coords
        x: 0,
        y: 0,
        z: 0, // world 3D coords
        sx: 0,
        sy: 0, // screen projected coords
        scale: 1,
        alpha: 1,
        radius: 0,
        boxW: 0,
        boxH: 26,
      };
    });
  }

  initCanvasSize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = 1; // 1x backing store — the only look
    const w = rect.width || 420;
    const h = rect.height || 420;
    // Skip the backing-store realloc when nothing changed — mobile browsers
    // fire resize continuously while the URL bar collapses.
    if (w === this.width && h === this.height && dpr === this._dpr) return;
    this._dpr = dpr;
    this.width = w;
    this.height = h;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    this._gradCache.clear(); // gradients are keyed to (cx, cy, r)

    // Globe radius dynamically fits container
    this.globeRadius = Math.min(this.width, this.height) * 0.38;
  }

  bindEvents() {
    let _resizePending = false;
    let _lastW = window.innerWidth;
    window.addEventListener(
      'resize',
      () => {
        if (window.innerWidth === _lastW) return; // skip height-only URL bar collapse firehose
        if (_resizePending) return;
        _resizePending = true;
        requestAnimationFrame(() => {
          _resizePending = false;
          _lastW = window.innerWidth;
          this.initCanvasSize();
        });
      },
      { passive: true }
    );

    // Pointer events for smooth drag & hover on both touch & desktop
    const onStart = (clientX, clientY) => {
      this.isDragging = true;
      // A pointer landing on the canvas proves the globe is on screen — never
      // let a stale (or never-fired) IntersectionObserver flag kill the drag,
      // and make sure the render loop runs so rotation is actually painted.
      this.isIntersecting = true;
      this.start();
      this.lastMouseX = clientX;
      this.lastMouseY = clientY;
    };

    const onMove = (clientX, clientY) => {
      // The globe is usually off-screen: reading the rect here would force a
      // layout on EVERY mouse/touchmove page-wide (and on mobile, every
      // touchmove of a native scroll). Gate it on visibility instead — but
      // never drop an active drag that started on the canvas itself.
      if (!this.isIntersecting && !this.isDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      this.mouseCanvasX = clientX - rect.left;
      this.mouseCanvasY = clientY - rect.top;

      if (this.isDragging) {
        const dx = clientX - this.lastMouseX;
        const dy = clientY - this.lastMouseY;

        this.rotY += dx * 0.008;
        this.rotX -= dy * 0.008;

        this.velY = dx * 0.004;
        this.velX = -dy * 0.004;

        this.lastMouseX = clientX;
        this.lastMouseY = clientY;
      }
    };

    const onEnd = () => {
      this.isDragging = false;
    };

    this.canvas.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onEnd);

    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1) {
          onStart(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: true }
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 1) {
          onMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: true }
    );

    window.addEventListener('touchend', onEnd);

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseCanvasX = -9999;
      this.mouseCanvasY = -9999;
      this.hoveredSkill = null;
    });

    // Canvas click selects hovered skill
    this.canvas.addEventListener('click', () => {
      if (this.hoveredSkill) {
        this.selectedSkill = this.hoveredSkill;
        this.updateTelemetryCard(this.selectedSkill);
      }
    });

    // Filter Buttons
    const filterButtons = document.querySelectorAll('.bt-filter-pill');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.setCategory(btn.dataset.category || 'all');
      });
    });
  }

  setCategory(category) {
    this.activeCategory = category;
    // Highlight or select the first skill in that category
    if (category !== 'all') {
      const match = SKILLS_DATA.find((s) => s.category === category);
      if (match) {
        this.selectedSkill = match;
        this.updateTelemetryCard(match);
      }
    }
  }

  updateTelemetryCard(skill) {
    if (!skill) return;
    const colors = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.ai;

    const nameEl = document.getElementById('bt-telemetry-name');
    const catEl = document.getElementById('bt-telemetry-cat');
    const levelEl = document.getElementById('bt-telemetry-level');
    const barEl = document.getElementById('bt-telemetry-bar');
    const descEl = document.getElementById('bt-telemetry-desc');
    const iconEl = document.getElementById('bt-telemetry-icon');

    if (nameEl) nameEl.textContent = skill.name;
    if (catEl) {
      catEl.textContent = skill.catLabel.toUpperCase();
      catEl.style.color = colors.main;
      catEl.style.borderColor = colors.glow;
    }
    if (levelEl) levelEl.textContent = `${skill.level}%`;
    if (barEl) {
      barEl.style.width = `${skill.level}%`;
      barEl.style.backgroundColor = colors.main;
      barEl.style.boxShadow = `0 0 12px ${colors.glow}`;
    }
    if (descEl) descEl.textContent = skill.desc;
    if (iconEl) iconEl.textContent = skill.icon || '⚡';
  }

  render(now) {
    // FPS cap: ~30fps. step=2 keeps the animation real-time at half rate.
    const step = 2;
    const t = now || performance.now();
    if (t - this._lastT < 33) {
      if (this.isRunning) this.rafId = requestAnimationFrame(this.render);
      return;
    }
    this._lastT = t;

    this.pulseTime += 0.02 * step;

    // Physics inertia & dampening
    if (!this.isDragging) {
      if (this.hoveredSkill) {
        // Smoothly pause on hover
        const damp = Math.pow(0.88, step);
        this.velX *= damp;
        this.velY *= damp;
      } else {
        // Blend back toward auto-orbit velocity
        this.velX += (this.targetVelX - this.velX) * 0.03 * step;
        this.velY += (this.targetVelY - this.velY) * 0.03 * step;
      }
      this.rotX += this.velX * step;
      this.rotY += this.velY * step;
    }

    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const R = this.globeRadius;

    ctx.clearRect(0, 0, this.width, this.height);

    // Rotation matrices
    const cosX = Math.cos(this.rotX),
      sinX = Math.sin(this.rotX);
    const cosY = Math.cos(this.rotY),
      sinY = Math.sin(this.rotY);

    // Compute rotated 3D coordinates
    const D = R * 2.8; // Camera distance
    this.nodes.forEach((node) => {
      // Rotate around Y
      let x1 = node.ux * cosY + node.uz * sinY;
      let y1 = node.uy;
      let z1 = -node.ux * sinY + node.uz * cosY;

      // Rotate around X
      let x2 = x1;
      let y2 = y1 * cosX - z1 * sinX;
      let z2 = y1 * sinX + z1 * cosX;

      node.x = x2 * R;
      node.y = y2 * R;
      node.z = z2 * R;

      // Perspective projection
      node.scale = D / (D + node.z);
      node.sx = cx + node.x * node.scale;
      node.sy = cy + node.y * node.scale;

      // Alpha depth fading: z ranges from -R (front) to +R (back)
      // Front is z < 0, back is z > 0
      const depthRatio = (node.z + R) / (2 * R); // 0 (front) to 1 (back)
      node.alpha = Math.max(0.18, Math.min(1.0, 1.0 - depthRatio * 0.72));

      // Category filter weighting
      if (this.activeCategory !== 'all') {
        if (node.category === this.activeCategory) {
          node.alpha = Math.min(1.0, node.alpha + 0.35);
        } else {
          node.alpha *= 0.22; // dim non-active
        }
      }
    });

    // 1. Draw central Holographic Wireframe Cyber-Core
    this.drawCyberCore(ctx, cx, cy, R * 0.65);

    // 2. Sort nodes by Z (draw furthest/back nodes first) — reuse a scratch
    // array instead of allocating a spread copy every frame.
    const sortedNodes = this._sorted;
    sortedNodes.length = 0;
    for (const n of this.nodes) sortedNodes.push(n);
    sortedNodes.sort((a, b) => b.z - a.z);

    // 3. Detect hover
    let currentHover = null;
    // Iterate from front to back to prioritize frontmost nodes for hover
    for (let i = sortedNodes.length - 1; i >= 0; i--) {
      const node = sortedNodes[i];
      if (node.alpha < 0.25) continue; // Don't hover faded background nodes
      const halfW = node.boxW / 2;
      const halfH = node.boxH / 2;
      if (
        this.mouseCanvasX >= node.sx - halfW &&
        this.mouseCanvasX <= node.sx + halfW &&
        this.mouseCanvasY >= node.sy - halfH &&
        this.mouseCanvasY <= node.sy + halfH
      ) {
        currentHover = node;
        break;
      }
    }

    if (currentHover !== this.hoveredSkill) {
      this.hoveredSkill = currentHover;
      if (this.hoveredSkill) {
        this.selectedSkill = this.hoveredSkill;
        this.updateTelemetryCard(this.selectedSkill);
        this.canvas.style.cursor = 'pointer';
      } else {
        this.canvas.style.cursor = this.isDragging ? 'grabbing' : 'grab';
      }
    }

    // 4. Render all nodes
    sortedNodes.forEach((node) => {
      this.drawNodeBadge(ctx, node, node === this.hoveredSkill, node === this.selectedSkill);
    });

    if (this.isRunning) {
      this.rafId = requestAnimationFrame(this.render);
    }
  }

  drawCyberCore(ctx, cx, cy, radius) {
    const pulse = Math.sin(this.pulseTime * 1.5) * 0.12 + 0.95;
    const fastPulse = Math.sin(this.pulseTime * 3) * 0.08 + 1.0;
    const r = radius * pulse;
    const S = 0; // shadowBlur multiplier: 0 = no software blur (single look)

    ctx.save();

    // 1. Radiant Outer Energy Flare & Nebula Glow — cached by rounded radius
    // (was: a new gradient allocated every frame; gradients are pure functions
    // of (cx, cy, r), and cx/cy only change on resize, which clears the cache)
    const gradCache = this._gradCache;
    const outerR = Math.round(r * 1.6);
    let outerGrad = gradCache.get('o' + outerR);
    if (!outerGrad) {
      outerGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, outerR);
      outerGrad.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
      outerGrad.addColorStop(0.25, 'rgba(167, 139, 250, 0.28)');
      outerGrad.addColorStop(0.55, 'rgba(103, 232, 249, 0.12)');
      outerGrad.addColorStop(1, 'rgba(3, 7, 18, 0)');
      gradCache.set('o' + outerR, outerGrad);
    }
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fill();

    // 2. High-Energy Luminous Core (Hot Nucleus) — gradient cached by rounded
    // radius; the pulse quantizes to 1px steps, which is imperceptible on a glow.
    const nucleusR = Math.max(12, Math.round(r * 0.22 * fastPulse));
    let nucleusGrad = gradCache.get('n' + nucleusR);
    if (!nucleusGrad) {
      nucleusGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucleusR);
      nucleusGrad.addColorStop(0, '#ffffff');
      nucleusGrad.addColorStop(0.35, '#00f0ff');
      nucleusGrad.addColorStop(0.7, '#a78bfa');
      nucleusGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
      gradCache.set('n' + nucleusR, nucleusGrad);
    }
    ctx.fillStyle = nucleusGrad;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 24 * S;
    ctx.beginPath();
    ctx.arc(cx, cy, nucleusR, 0, Math.PI * 2);
    ctx.fill();

    // 3. Multi-Axis 3D Atomic Orbit Rings
    const orbits = [
      {
        rx: r * 1.05,
        ry: r * 0.38,
        angle: this.rotY * 0.6,
        color: '#00f0ff',
        glow: 'rgba(0, 240, 255, 0.7)',
        dash: [],
        speed: 1.2,
      },
      {
        rx: r * 0.95,
        ry: r * 0.35,
        angle: -this.rotX * 0.8 + 1.05,
        color: '#c4b5fd',
        glow: 'rgba(196, 181, 253, 0.7)',
        dash: [6, 6],
        speed: 1.6,
      },
      {
        rx: r * 0.9,
        ry: r * 0.42,
        angle: this.rotY * 0.5 - 1.05,
        color: '#67e8f9',
        glow: 'rgba(103, 232, 249, 0.7)',
        dash: [],
        speed: 0.9,
      },
      {
        rx: r * 0.75,
        ry: r * 0.3,
        angle: this.pulseTime * 0.4,
        color: '#8b5cf6',
        glow: 'rgba(139, 92, 246, 0.65)',
        dash: [4, 4],
        speed: 2.1,
      },
    ];

    orbits.forEach((orb) => {
      ctx.save();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = orb.color;
      ctx.shadowColor = orb.glow;
      ctx.shadowBlur = 14 * S;
      if (orb.dash.length) ctx.setLineDash(orb.dash);

      ctx.beginPath();
      ctx.ellipse(cx, cy, orb.rx, orb.ry, orb.angle, 0, Math.PI * 2);
      ctx.stroke();

      // Orbiting Electron Particle along the ring
      const eAngle = (this.pulseTime * orb.speed) % (Math.PI * 2);
      const ex =
        cx +
        Math.cos(eAngle) * orb.rx * Math.cos(orb.angle) -
        Math.sin(eAngle) * orb.ry * Math.sin(orb.angle);
      const ey =
        cy +
        Math.cos(eAngle) * orb.rx * Math.sin(orb.angle) +
        Math.sin(eAngle) * orb.ry * Math.cos(orb.angle);

      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = orb.color;
      ctx.shadowBlur = 12 * S;
      ctx.beginPath();
      ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    // 4. Central Target Reticle & Crosshairs
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6 * S;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair ticks
    const tickLen = 6;
    const tickDist = 12;
    ctx.beginPath();
    // North
    ctx.moveTo(cx, cy - tickDist);
    ctx.lineTo(cx, cy - tickDist - tickLen);
    // South
    ctx.moveTo(cx, cy + tickDist);
    ctx.lineTo(cx, cy + tickDist + tickLen);
    // West
    ctx.moveTo(cx - tickDist, cy);
    ctx.lineTo(cx - tickDist - tickLen, cy);
    // East
    ctx.moveTo(cx + tickDist, cy);
    ctx.lineTo(cx + tickDist + tickLen, cy);
    ctx.stroke();

    ctx.restore();
  }

  drawNodeBadge(ctx, node, isHovered, isSelected) {
    const colors = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.ai;
    const S = 0; // shadowBlur multiplier: 0 = no software blur (single look)
    const fontSize = Math.round(11 * Math.max(0.72, Math.min(1.2, node.scale)));
    // Set the font only when it changes, and memoize measureText: the label set
    // is fixed (29 skills × ~6 font sizes), so after warmup this is a Map hit
    // instead of a text-shaping call per node per frame.
    const fontStr = `600 ${fontSize}px "Inter", -apple-system, sans-serif`;
    if (fontStr !== this._font) {
      this._font = fontStr;
      ctx.font = fontStr;
    }
    const text = node.name;
    const mKey = fontStr + '|' + text;
    let textW = this._metrics.get(mKey);
    if (textW === undefined) {
      textW = ctx.measureText(text).width;
      this._metrics.set(mKey, textW);
    }
    const paddingX = 10 * node.scale;
    const pillH = 22 * node.scale;
    const dotR = 3.5 * node.scale;
    const pillW = textW + paddingX * 2 + (dotR * 2 + 6 * node.scale);

    node.boxW = pillW;
    node.boxH = pillH;

    const x = node.sx - pillW / 2;
    const y = node.sy - pillH / 2;
    const r = pillH / 2;

    const alpha = isHovered ? 1.0 : isSelected ? Math.max(0.85, node.alpha) : node.alpha;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Badge Background
    ctx.beginPath();
    ctx.roundRect(x, y, pillW, pillH, r);

    if (isHovered) {
      ctx.fillStyle = 'rgba(10, 18, 36, 0.92)';
      ctx.shadowColor = colors.main;
      ctx.shadowBlur = 16 * S;
    } else if (isSelected) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.shadowColor = colors.main;
      ctx.shadowBlur = 8 * S;
    } else {
      ctx.fillStyle = 'rgba(8, 12, 22, 0.7)';
      ctx.shadowBlur = 0;
    }
    ctx.fill();

    // Badge Border
    ctx.lineWidth = isHovered || isSelected ? 1.5 : 1;
    ctx.strokeStyle = isHovered
      ? colors.main
      : isSelected
        ? colors.glow
        : `rgba(255, 255, 255, ${0.12 * alpha})`;
    ctx.stroke();

    // Category Status Dot
    const dotX = x + paddingX + dotR;
    const dotY = node.sy;
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? '#ffffff' : colors.dot;
    if (isHovered) {
      ctx.shadowColor = colors.main;
      ctx.shadowBlur = 8 * S;
    }
    ctx.fill();
    if (isHovered) {
      ctx.shadowBlur = 0;
    }

    // Text Label
    ctx.fillStyle = isHovered
      ? '#ffffff'
      : isSelected
        ? colors.main
        : `rgba(241, 245, 249, ${0.92 * alpha})`;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, dotX + dotR + 6 * node.scale, node.sy + 0.5);

    // If hovered, draw subtle corner tech brackets
    if (isHovered) {
      ctx.strokeStyle = colors.main;
      ctx.lineWidth = 1;
      const bracketSize = 4 * node.scale;
      // Top-left bracket
      ctx.beginPath();
      ctx.moveTo(x - 2, y + bracketSize);
      ctx.lineTo(x - 2, y - 2);
      ctx.lineTo(x + bracketSize, y - 2);
      ctx.stroke();
      // Bottom-right bracket
      ctx.beginPath();
      ctx.moveTo(x + pillW + 2, y + pillH - bracketSize);
      ctx.lineTo(x + pillW + 2, y + pillH + 2);
      ctx.lineTo(x + pillW - bracketSize, y + pillH + 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.rafId = requestAnimationFrame(this.render);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  initIntersectionObserver() {
    const target = this.container || this.canvas;
    if (!target) {
      this.start();
      return;
    }

    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            this.isIntersecting = entry.isIntersecting;
            if (entry.isIntersecting) {
              this.start();
            } else {
              this.stop();
            }
          });
        },
        {
          rootMargin: '140px 0px', // start rendering 140px before entering viewport for instant seamless experience
          threshold: 0,
        }
      );
      this.observer.observe(target);
    } else {
      this.isIntersecting = true;
      this.start();
    }
  }

  destroy() {
    this.stop();
    if (this.observer) this.observer.disconnect();
  }
}

// Auto-initialize when DOM is loaded
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.__skillsGlobe = new SkillsGlobe('skills-globe');
    });
  } else {
    window.__skillsGlobe = new SkillsGlobe('skills-globe');
  }
}
