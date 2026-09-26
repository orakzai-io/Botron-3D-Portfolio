# BOTRON RAG Backend

FastAPI microservice powering the chatbot on [orakzai.io](https://orakzai.io). Takes a
question, retrieves the most relevant chunks from a structured knowledge base, and has
a Groq LLM answer using only those chunks.

## How a request is served

Retrieval and generation are **two separate phases that run at completely different
times** — this is the single most important thing to understand about this service.

### Phase A — once, at startup

```
rag.py:203   retriever = VectorRetriever()      # module-level, runs on import
  ├── _init_qdrant()                           # loads BAAI/bge-small-en-v1.5
  └── _index_chunks()                          # embeds ALL chunks in one batch
        ├── embeddings = model.embed(texts)    # 16 texts -> 16 x 384-dim vectors
        └── client.upsert(...)                  # stored in memory
```

This is the expensive part (model load, then one batch embed). **User traffic does not
trigger it.** The index is built once and waits. Only the *retriever* is a singleton
across all requests; nothing is re-indexed.

### Phase B — per request

```
POST /chat  {"query": "what is REDNOTE?", "top_k": 3}
  │
  ├── 1. query_vec = model.embed([query])          # ONE text, not 16
  │      cosine search against the 16 stored vectors
  │      drop anything below MIN_SIMILARITY
  │
  ├── 2. nothing cleared the floor?
  │      └── YES → return "I don't have that". The LLM is never called.
  │
  └── 3. context_str = "[Source: REDNOTE | Relevance: 0.41]\n<chunk>\n\n..."
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(context=context_str)
        Groq receives exactly two messages:
          { "role": "system", "content": system_prompt }   # context lives in here
          { "role": "user",   "content": query }
```

Note the retrieved chunks travel **inside the system prompt**, not as separate
messages.

## Two retrieval backends

`rag.py` attempts the dense path and silently falls back if the imports fail.

| | Dense (default in production) | Lexical fallback |
| :--- | :--- | :--- |
| Engine | FastEmbed `BAAI/bge-small-en-v1.5` | built-in TF-IDF |
| Dimensions | 384, dense | sparse, L2-normalised |
| Store | Qdrant in-memory, cosine | plain Python lists |
| Startup | ~90 MB model load | instant |
| `MIN_SIMILARITY` | **~0.35** | **0.06** |

Both are cosine-based in 0..1, so one constant covers both — but the right value is
backend-specific, which is why it is an environment variable.

## The relevance floor

`MIN_SIMILARITY` is the guard that stops the chatbot inventing things about a real
person. Without it, *any* question retrieves the top-k nearest chunks no matter how
unrelated, and the LLM answers confidently from irrelevant biography text.

When nothing clears the floor, `/chat` returns a "don't have that" answer **without
calling the LLM at all** — cheaper, and it makes confabulation structurally impossible
rather than merely discouraged.

It is calibrated, not guessed. On a labelled set of 20 on-topic and 20 off-topic
queries the lexical fallback scores:

| | min | median | max |
| :--- | --- | --- | --- |
| On-topic | 0.087 | 0.159 | 0.339 |
| Off-topic | 0.000 | 0.000 | 0.130 |

Result: **22/22 on-topic answered, 18/20 off-topic refused.**

## Configuration

Copy `.env.example` to `.env`:

| Variable | Default | Notes |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | — | **Required.** From [console.groq.com](https://console.groq.com) |
| `GROQ_MODELS` | `openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b` | Tried in order; a 429 fails over to the next |
| `MIN_SIMILARITY` | `0.06` | Use `0.35` in production (dense backend) |
| `PORT` | `8000` | Cloud hosts usually inject this |

`top_k` and query length are validated by Pydantic (`ge=1, le=10`, `max_length=2000`)
so an unbounded `top_k` cannot be used to pull the entire knowledge base into a metered
prompt.

### ⚠️ `load_dotenv()` ordering

`main.py` calls `load_dotenv()` **before** `from rag import retriever`. This is
load-bearing: importing `rag` executes its module body, which reads `MIN_SIMILARITY`
from the environment. With the import first, the `.env` value was silently discarded
and the hardcoded default was always used. There is a `# noqa: E402` on that import so
a formatter or linter does not helpfully reorder it back.

## Running locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # add your GROQ_API_KEY
uvicorn main:app --reload --port 8000
```

Verify:

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/chat \
  -H 'Content-Type: application/json' \
  -d '{"query":"what is REDNOTE?"}'
```

The `/health` response reports `indexed_chunks` and whether FastEmbed or the lexical
fallback is active.

## Deploying

### FastAPI Cloud

Connect this repository and set:

| Setting | Value |
| :--- | :--- |
| Root directory | `backend` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Environment | `GROQ_API_KEY`, `MIN_SIMILARITY=0.35`, `GROQ_MODELS` |

Secrets go in the dashboard — never in a committed `.env`. The included `Dockerfile`
targets port 7860 for Hugging Face Spaces, but note that **HF now requires a PRO
subscription for CPU Basic Docker Spaces**; use it only if you already have one.

### Any container host

```bash
docker build -t botron-rag ./backend
docker run -p 8000:8000 --env-file rag/.env botron-rag
```

`.dockerignore` is essential here: the Dockerfile does `COPY . .`, so without it a
local build copies `rag/.env` — and the real Groq key — into an image layer.

### Cold starts

Free and low-cost hosts sleep. The frontend handles this: it pings `/health` on idle so
the wake cost is paid before a visitor types, allows 45s for the first request, and
reports "backend is still waking" rather than silently degrading.

## API

### `POST /chat`

```jsonc
// request
{ "query": "what is REDNOTE?", "top_k": 3 }

// response
{
  "answer": "REDNOTE is an enterprise RAG document assistant...",
  "sources": [
    { "id": "project_rednote_detail",
      "title": "Project Deep-Dive — REDNOTE",
      "category": "projects",
      "similarity": 0.4123 }
  ],
  "retrieval_time_ms": 1.84,
  "generation_time_ms": 612.4,
  "model": "openai/gpt-oss-120b"
}
```

`model` is `"none"` when the relevance floor rejected the query — a useful signal for
distinguishing "nothing relevant" from "the model failed".

### `GET /health`
`{ "status": "healthy", "indexed_chunks": 16, "embedding_mode": "FastEmbed" }`

## Files

| File | Role |
| :--- | :--- |
| `main.py` | FastAPI app, `/chat`, `/health`, Pydantic models, system prompt |
| `rag.py` | Retrieval: dense + lexical backends, TF-IDF, relevance floor |
| `knowledge.py` | The indexed chunks — the single source of truth for what BOTRON can say |

## Adding knowledge

Append to `CHUNKS` in `knowledge.py`:

```python
{
    "id": "project_something_detail",
    "title": "Project Deep-Dive — Something",
    "category": "projects",
    "content": "Something (March 2026):\n• Core Problem: ...\n• Architecture: ..."
}
```

Restart the server — the index is built at startup, not per request. Re-run the
off-topic check afterwards to confirm the new chunk did not make unrelated questions
score above the floor.

Keep every claim verifiable. These chunks describe a real person, and the model is
instructed to refuse rather than extrapolate — a chunk that overstates something
becomes something the chatbot asserts confidently.
