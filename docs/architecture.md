# Architecture

How a request moves through the site, and why the non-obvious decisions were made.

## System shape

```
                       ┌──────────────────────────────┐
   browser             │  static host (dist/)         │
  ──────────▶          │  Three.js stage + chat UI    │
                       └───────────┬──────────────────┘
                                   │  POST /chat  (only if VITE_RAG_API_URL set)
                                   ▼
                       ┌──────────────────────────────┐
                       │  FastAPI service             │
                       │  retrieve ──▶ floor ──▶ LLM  │
                       └───────────┬──────────────────┘
                                   │  Groq API
                                   ▼
                             gpt-oss-120b → qwen3-27b → gpt-oss-20b
```

Every arrow is optional at runtime. With no backend configured the chat answers
locally; if retrieval finds nothing relevant the LLM call is skipped entirely.

## The RAG request lifecycle

1. **Warm-up.** On page idle the frontend pings `/health`. A sleeping host costs
   20–45s to start, and paying that during boot rather than mid-question is the whole
   point. `requestIdleCallback` keeps it from competing with the WebGL load.
2. **Send.** The first request gets a 45s budget while the host is waking; later
   requests get 12s. A timeout *during* waking is reported as "still waking" rather
   than treated as failure.
3. **Retrieve.** Only the query is embedded. The 16 chunk vectors already exist.
4. **Filter.** Anything below `MIN_SIMILARITY` is discarded. If nothing survives the
   request ends here — no LLM call, no chance of invention.
5. **Generate.** Chunks are interpolated into the system prompt. Groq receives a
   system message and a user message. Models are tried in order; a 429 fails over.
6. **Render.** `formatMarkdown` runs the reply through an allowlist HTML sanitiser
   before it reaches `innerHTML`.
7. **Photo layer.** `ensurePhotos()` checks whether the query has photo intent and
   whether the reply already contains one. If not, a deterministic `<img>` is
   appended.

## Layer boundaries

**Photos are deterministic, prose is generated.** This split is the important one. A
generative model asked for a photo may describe it in words, emit a broken URL, or
invent a fourth photo. So the image never depends on the model choosing correctly —
only the surrounding text does.

**Knowledge lives in exactly one place.** `backend/knowledge.py` is the source of
truth. The frontend holds no copy of the facts, so the two cannot drift. (They
previously did: the 3D model was documented as 700 KB in one file and 322 KB in the
other.)

**The floor is structural, not advisory.** Instructing a model to "say I don't know"
is a suggestion. Never calling it is a guarantee.

## Rendering pipeline

```
scroll position
   └─▶ Lenis (smooth scroll)
         └─▶ GSAP ScrollTrigger  ──scrub 0.25──▶  camera-story.js
                                                       │
                                                       ▼
                                              camera position + target
   cursor position                                     │
   └─▶ gaze.js ──project to world space──▶ robot IK head tracking
                                                       │
                                                       ▼
                                          stage.js render loop
                                          60 FPS interacting / 20 idle
                                                       │
                                                       ▼
                                        WebGL canvas (low-power path)
```

`controls` in `scene.js` is a shim exposing only `target` and `update()`. The real
`OrbitControls` class was never used in the running app — only by a since-removed
debug tool — so shipping it would have cost ~25 KB for nothing.

## Performance model

| Decision | Value | Why |
| :--- | :--- | :--- |
| GPU hint | `low-power` | Battery and thermal budget on a portfolio |
| Antialiasing | off | The art style is flat-shaded; MSAA buys little |
| Shadow maps | off | Highest cost per visual return at this scale |
| Dust particles | 70 | 380 measured as not worth it on mid-range mobile |
| Idle frame rate | 20 FPS | A still page should not spin a GPU |
| Glass blur | removed | Re-blurs the animating canvas every frame |

The richer tier is preserved in [quality-tiers.md](quality-tiers.md) with exact file
locations, so this is reversible rather than a dead end.

## Mobile corrections worth recording

- **`content-visibility: auto` is a trap on short pages.** `contain-intrinsic-size:
  1px 750px` replaced off-screen sections with 750px boxes that were *shorter* than
  the real content, producing phantom gaps and a shifting scroll height.
- **`100vh` is the wrong viewport on mobile.** It includes the area behind the
  collapsing URL bar. `100svh` plus an `@supports` fallback.
- **Two breakpoints that must stay matched.** The 3D speech bubble hides at ≤900px;
  the chat FAB collapses at ≤900px. When these drifted apart, 601–900px screens
  (most phones in portrait, all tablets) got neither affordance.
- **Safe-area insets were entirely absent.** Any fixed bottom element sat under the
  iOS home indicator.

## Failure modes and what happens

| Failure | Behaviour |
| :--- | :--- |
| No `VITE_RAG_API_URL` | Local summary; zero network calls |
| Backend asleep | 45s budget, "still waking" message |
| Backend unreachable | Local summary, marked offline |
| Nothing relevant retrieved | "I don't have that", LLM never called |
| First model rate-limited | Fail over to the next in `GROQ_MODELS` |
| No `GROQ_API_KEY` | Retrieval-only response naming the missing variable |
| WebGL unavailable | Stage degrades; the page remains readable |
