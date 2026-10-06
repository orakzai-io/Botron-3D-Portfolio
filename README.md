# Personal Portfolio · 3D Cyber-Mech Experience

A scroll-driven 3D portfolio featuring an integrated retrieval-augmented chatbot. A WebGL robot follows scroll progress down the page, tracks the cursor using inverse kinematics, and answers questions about projects using vector search over a structured knowledge base.

**Live:** [orakzai-io.github.io](https://orakzai-io.github.io) | **Contact:** shahsawar.dev@gmail.com

<video src="https://github.com/user-attachments/assets/afdd3e64-6152-4805-8645-fafef5768bb6"
       autoplay loop muted playsinline width="100%"></video>

---

## Features

- **3D stage:** Three.js robot with IK cursor gaze tracking, procedural LED eyes, and scroll-driven camera choreography.
- **BOTRON chatbot:** RAG assistant with background model warmup, cold-start handling, and deterministic photo rendering.
- **Skills globe:** Mathematical 3D projection on a 2D canvas with zero additional WebGL contexts.
- **Adaptive frame rate:** 60 FPS during interaction, 30 FPS when idle, and 0 draw calls once off-screen.
- **Mobile-tuned:** Safe-area insets, collapse-to-circle FAB, `100svh` viewports, and touch-optimized states.

## Stack

| Layer     | Technology                                                                        |
| :-------- | :-------------------------------------------------------------------------------- |
| 3D        | Three.js, WebGL, GLTF/GLB + Meshopt, PMREM                                        |
| Motion    | GSAP ScrollTrigger, Lenis smooth scroll                                           |
| Frontend  | Vanilla ES modules, Vite, modern CSS                                              |
| Retrieval | FastEmbed `bge-small-en-v1.5`, NumPy cosine index, TF-IDF fallback                |
| LLM       | Groq: `openai/gpt-oss-120b` -> `qwen/qwen3.8-27b` -> `openai/gpt-oss-20b` failover |
| Backend   | FastAPI, Pydantic, Uvicorn                                                        |

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

The site works immediately with **no backend** (BOTRON falls back to a local summary without making network requests).

To run the local retrieval-augmented backend (FastEmbed embeddings + Groq LLM), see [**rag/README.md**](rag/README.md).

## Architecture & Guardrails

Most portfolio bots use basic keyword matching and canned strings. This implementation uses a full retrieval and generation loop:

```
  question ──▶ embed (1 vector) ──▶ cosine search over 16 embedded chunks
                                        │
                              relevance floor (MIN_SIMILARITY)
                                   │              │
                             cleared          nothing cleared
                                   │              │
                                   ▼              ▼
                      chunks → Groq LLM      "I don't have that"
                     (3 models, failover)    (LLM never called)
```

### Core safeguards

1. **Refusal over hallucination:** Retrieval enforces a minimum similarity floor. If no chunk clears the threshold, the LLM is never called. This prevents hallucinations on out-of-domain questions (e.g. general trivia or unrelated topics).

2. **Calibrated TF-IDF fallback:** When dense dependencies are unavailable, retrieval falls back to an in-memory TF-IDF index. The lexical retriever uses sublinear TF scaling, smoothed IDF, stopword filtering, and stem/plural folding so off-topic queries reliably score near zero.

3. **Deterministic image injection:** Photo requests are handled deterministically client-side. Rather than relying on the LLM to format image tags accurately, media intent is detected and injected directly, ensuring consistent rendering.

## Repository structure

```
.
├── index.html            # single page entry point
├── src/
│   └── sections/         # modular HTML section templates
├── css/
│   ├── base.css          # reset and layout overrides
│   ├── core.css          # typography and structural styles
│   ├── theme.css         # design system tokens and variables
│   ├── chat.css          # BOTRON chat interface
│   ├── fonts.css         # self-hosted font definitions
│   ├── polish.css        # visual enhancements and animations
│   ├── touch.css         # mobile touch adjustments
│   ├── components/       # component styles
│   └── sections/         # section-specific styles
├── js/
│   ├── main.js           # progressive hydration entry point
│   ├── boot-gate.js      # initial reveal orchestrator
│   ├── stage.js          # WebGL stage orchestration
│   ├── models/           # botron.glb (322 KB, Meshopt-compressed)
│   ├── webgl/            # scene, robot, gaze, camera, and telemetry
│   └── ui/               # chat, skills globe, and UI bindings
├── assets/               # bundled screenshots, photos, and fonts (Vite-imported)
├── public/               # static files served untouched (e.g. resume PDF)
├── rag/                  # FastAPI RAG service (see rag/README.md)
│   ├── main.py           # /chat, /health, and app lifecycle
│   ├── retriever.py      # dense and lexical retrievers with relevance floor
│   └── knowledge.py      # indexed knowledge chunks
```

## How it works

### Boot sequence

`index.html` renders static layout immediately without blocking for 3D assets. `boot-gate.js` manages the initial reveal once fonts are loaded (`document.fonts.ready`), and `main.js` waits two animation frames before downloading the 3D bundle. If assets take longer than expected, `BOOT_MAX_MS` automatically releases the overlay after 3.5s.

### Performance optimizations

- **Low-power render path:** Configured with `powerPreference: 'low-power'`, antialiasing and shadow maps disabled, and a lightweight particle system.
- **Adaptive frame rate:** Targets 60 FPS during scrolling, touch, or gaze tracking; drops to 30 FPS when idle; pauses rendering completely when the canvas scrolls out of view.
- **Mobile layout stabilization:** `content-visibility` is disabled on mobile viewports to prevent layout shifts caused by dynamic browser chrome.
- **`100svh` viewports:** Uses small viewport units (`100svh`) with `@supports` fallback to prevent overflow beneath mobile address bars.
- **Bundled asset imports:** Media assets are imported directly in JavaScript, allowing Vite to hash filenames and optimize production outputs.
- **Canvas over CSS blur:** Avoids continuous CSS `backdrop-filter` operations over the active WebGL canvas to preserve frame stability.

### Mobile adaptations

- Safe-area inset support on the chat FAB, status indicators, and modal views.
- The chat FAB collapses to a compact circle after 3.5 seconds on viewports <= 900px.
- Hardware telemetry readouts (cursor tracking coordinates) automatically hide on coarse pointer devices.

## Deployment

**Frontend:** Standard static build via `npm run build` targeting `dist/`. Configured with `base: "./"` in `vite.config.js` for compatibility with root domains and subpaths. Automated deployment to GitHub Pages runs on pushes to `main` via `.github/workflows/deploy-pages.yml`.

**Backend:** Deployed to FastAPI Cloud, Docker, or any container runtime. See [**rag/README.md**](rag/README.md) for environment configuration and setup details.

## Security notes

- `rag/.env` is gitignored and excluded from container builds via `.dockerignore`.
- API endpoint URLs are injected at build time (`VITE_RAG_API_URL`).
- LLM API keys are strictly server-side and never exposed to the client.
- Chat responses pass through client-side HTML sanitization prior to DOM insertion.

## License

MIT - see [LICENSE](LICENSE).
