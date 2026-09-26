# Personal Portfolio &middot; 3D Cyber-Mech Experience

A scroll-driven 3D portfolio with a real retrieval-augmented chatbot. A WebGL robot
follows you down the page, tracks your cursor with inverse kinematics, and answers
questions about the work using vector retrieval over a structured knowledge base
rather than canned replies.

**Live:** [orakzai.io](https://orakzai.io) &nbsp;&middot;&nbsp; **Contact:** shahsawar.dev@gmail.com

---

## What is actually interesting here

Most portfolio chatbots match keywords and print a hardcoded paragraph. This one
retrieves and generates:

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

Three things make that defensible rather than decorative:

**1. It refuses instead of inventing.** Retrieval has a similarity floor. If nothing
clears it, the LLM is *never called* — it cannot confabulate an answer to "who won the
2024 election" from unrelated biography text. For a portfolio about a real person, a
confident false statement is the worst possible failure mode.

**2. The fallback retriever is real TF-IDF.** The dense path uses FastEmbed
(`BAAI/bge-small-en-v1.5`, 384-dim) in Qdrant. When those aren't installed it falls
back to lexical retrieval — and that fallback originally *omitted the IDF term
entirely*, so it was a normalised bag-of-words count. Measured result: "best pizza in
Lahore" scored **0.2009** while "what are his projects" scored **0.0662** — the score
distributions fully overlapped and no relevance threshold could exist. Fixing IDF,
adding sublinear TF, stopword removal and plural folding moved the off-topic median
from 0.159 to **0.0000**. Calibrated on 20 on-topic + 20 off-topic queries: **22/22
answered, 18/20 refused.**

**3. Photos can't be taken away by the model.** Images used to be guaranteed because
the answer string literally contained the `<img>` tag. With an LLM generating the
answer, it would have to *choose* to emit one — and when it describes a photo in words
instead, the images silently vanish. Photo intent is therefore detected client-side
and the tag is injected regardless of what the model said. The prose is generated;
the image is deterministic.

## Features

- **3D stage** — Three.js robot with IK cursor gaze tracking, procedural LED eyes,
  scroll-driven camera story
- **BOTRON** — RAG chatbot with health-check warm-up, cold-start handling, and a
  deterministic photo layer
- **Skills globe** — mathematical 3D projection on a 2D canvas, zero extra WebGL contexts
- **Adaptive performance** — 60 FPS while interacting, 20 FPS idle, deliberate
  low-power render path, chosen deliberately for battery and thermal headroom
- **Mobile-tuned** — safe-area insets, collapse-to-circle FAB, `100svh` beats,
  touch-only states

## Stack

| Layer | Technology |
| :--- | :--- |
| 3D | Three.js, WebGL, GLTF/GLB + Meshopt, PMREM |
| Motion | GSAP ScrollTrigger, Lenis smooth scroll |
| Frontend | Vanilla ES modules, Vite, modern CSS (custom properties) |
| Retrieval | FastEmbed `bge-small-en-v1.5`, Qdrant (in-memory), TF-IDF fallback |
| LLM | Groq — `gpt-oss-120b` → `qwen3-27b` → `gpt-oss-20b` failover |
| Backend | FastAPI, Pydantic, Uvicorn |

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

The site works immediately with **no backend** — BOTRON answers from a short local
summary and makes no network requests.

To run the full RAG locally:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                # add your GROQ_API_KEY
uvicorn main:app --reload --port 8000
```

Then point the frontend at it — create `.env.local` in the repo root:

```
VITE_RAG_API_URL=http://localhost:8000/chat
```

## Repository structure

```
.
├── index.html            # single page, all sections
├── css/
│   ├── base.css          # resets, tokens, typography
│   ├── theme.css         # design system, sections, enhancement layer
│   └── chat.css          # BOTRON chat UI
├── js/
│   ├── main.js           # entry: progressive hydration
│   ├── boot-gate.js      # owns the reveal, releases on fonts
│   ├── stage.js          # WebGL stage orchestration
│   ├── models/botron.glb   # 322 KB, Meshopt-compressed
│   ├── webgl/            # scene, robot, gaze, camera story, telemetry
│   └── ui/               # chat, skills globe, UI wiring
├── assets/               # project screenshots, photos, fonts (Vite-imported)
├── public/                # files served verbatim, NOT processed by Vite
│   └── assets/Shahsawar.dev.pdf
├── backend/              # FastAPI RAG service  (see backend/README.md)
│   ├── main.py           # /chat, /health, request model
│   ├── rag.py            # retrieval: dense + TF-IDF, relevance floor
│   └── knowledge.py      # the indexed knowledge chunks
```

> **Two `assets` directories, on purpose.** `assets/` holds files the bundler
> processes — they are imported in JS, content-hashed, and emitted to `dist/assets/`.
> `public/` holds files Vite copies through untouched, at their exact path. The
> resume PDF lives in `public/assets/` because it is linked with a plain
> `<a href>`, which the bundler cannot see or process.

**More:** [frontend/README.md](frontend/README.md) &middot;
[backend/README.md](backend/README.md)

## Deployment

**Frontend** — any static host. Build `npm run build`, publish `dist/`. `vite.config.js`
uses `base: "./"`, so it works on a root domain or a sub-path unchanged.

**Backend** — FastAPI Cloud or any container host. Root directory `backend`,
start command `uvicorn main:app --host 0.0.0.0 --port $PORT`, with `GROQ_API_KEY` and
`MIN_SIMILARITY` set as environment variables. Full instructions in
[backend/README.md](backend/README.md).

The frontend must be told where the backend lives via `VITE_RAG_API_URL` at build time.

## Security notes

- `backend/.env` is gitignored and a `.dockerignore` keeps it out of container images
- `RAG_API_URL` is a build-time env var, so no deployment URL is committed
- The Groq key is only ever used server-side; the browser never sees it
- Bot replies pass through an allowlist HTML sanitiser before reaching `innerHTML`

## License

MIT — see [LICENSE](LICENSE). Fork it, learn from it, build something better.
