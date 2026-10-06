# BOTRON RAG Backend

FastAPI microservice powering the chatbot on [orakzai.io](https://orakzai.io). It receives user questions, retrieves relevant chunks from a structured knowledge base, and queries Groq LLMs grounded strictly in the retrieved context.

## Request Lifecycle

Retrieval and generation operate as two distinct phases:

### Phase A: Background Initialization (Server Startup)

```
retriever.py         retriever = VectorRetriever()   # module singleton, runs on import
  └── _init_tfidf()                       # lexical index built instantly (< 1ms)

main.py lifespan                          # runs after uvicorn binds the port
  └── asyncio.to_thread(retriever.initialize)
        ├── TextEmbedding(BAAI/bge-small-en-v1.5)   # ~90 MB model load
        └── embeds 16 chunks -> normalized [16, 384] NumPy matrix
```

Heavy dense model weights load asynchronously in the background after the port binds, allowing the container to respond to health checks immediately on startup. Any queries arriving during warmup automatically use the fast lexical fallback. The retriever operates as a singleton; knowledge is not re-indexed per request.

Chunk vectors reside in an in-memory NumPy matrix, and similarity search is computed via a single matrix-vector dot product.

### Phase B: Query Execution

```
POST /chat  {"query": "what is REDNOTE?", "top_k": 3}
  │
  ├── 1. query_vec = model.embed([query])
  │      cosine search against the 16 stored vectors
  │      drop candidates below the active backend's similarity floor
  │
  ├── 2. nothing cleared the floor?
  │      └── YES -> return refusal. The LLM is never invoked.
  │
  └── 3. context_str = "[Source: REDNOTE | Relevance: 0.41]\n<chunk>\n\n..."
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(context=context_str)
        Groq receives two messages:
          { "role": "system", "content": system_prompt }
          { "role": "user",   "content": query }
```

Retrieved context is injected directly into the system prompt rather than as separate user messages.

## Retrieval Backends

`retriever.py` defaults to dense vector search and falls back gracefully to lexical retrieval if dense dependencies or model files fail to load.

| | Dense (Production Default) | Lexical Fallback |
| :--- | :--- | :--- |
| Engine | FastEmbed `BAAI/bge-small-en-v1.5` | Built-in TF-IDF |
| Dimensions | 384 (dense) | Sparse, L2-normalized |
| Store | Normalized NumPy matrix, cosine | Normalized NumPy matrix, cosine |
| Startup | ~90 MB model load, background thread | Built on import (< 1 ms) |
| Relevance floor | `DENSE_MIN_SIMILARITY` = **0.35** | `LEXICAL_MIN_SIMILARITY` = **0.06** |

Because dense embeddings and TF-IDF produce different cosine similarity distributions, each backend maintains its own calibrated threshold.

## Relevance Floor & Refusal

`MIN_SIMILARITY` prevents hallucinations when visitors ask off-topic or out-of-domain questions. If no indexed chunk clears the threshold, `/chat` returns a standardized refusal without calling the LLM.

Empirical evaluation on a calibrated benchmark (20 on-topic, 20 off-topic queries):

| Query Type | Min Score | Median Score | Max Score |
| :--- | :--- | :--- | :--- |
| On-topic | 0.087 | 0.159 | 0.339 |
| Off-topic | 0.000 | 0.000 | 0.130 |

Result: **22/22 on-topic answered, 18/20 off-topic refused.**

## Configuration

Copy `.env.example` to `.env`:

| Variable | Default | Notes |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | - | Required. From [console.groq.com](https://console.groq.com) |
| `GROQ_MODELS` | `openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b` | Failover order (retries next model on 429) |
| `MIN_SIMILARITY` | unset | Overrides both thresholds below when specified |
| `DENSE_MIN_SIMILARITY` | `0.35` | Dense retriever similarity threshold |
| `LEXICAL_MIN_SIMILARITY` | `0.06` | Lexical TF-IDF similarity threshold |
| `PORT` | `8000` | Local server port |
| `ALLOWED_ORIGINS` | `https://orakzai.io,...` | Comma-separated CORS origins (includes `http://localhost:5173` for dev) |

> Note: `main.py` executes `load_dotenv()` before importing `retriever` so custom thresholds in `.env` are read during module initialization.

## Running Locally

```bash
cd rag
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

`/health` reports service `status` (`ready` or `waking`), `groq_ready`, active `models`, and `embedding_mode`.

### Connecting the Frontend

To connect the frontend to the local RAG backend, create `.env.local` in the project root:

```env
VITE_RAG_API_URL=http://localhost:8000/chat
```

Then start the frontend with `npm run dev` (`http://localhost:5173`).

## Deployment

### FastAPI Cloud

Connect this repository and configure:

| Setting | Value |
| :--- | :--- |
| Root directory | `rag` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Environment | `GROQ_API_KEY`, `GROQ_MODELS`, `ALLOWED_ORIGINS` |

### Docker

```bash
docker build -t botron-rag ./rag
docker run -p 8000:8000 --env-file rag/.env botron-rag
```

`.dockerignore` excludes `rag/.env` and temporary files from build layers.

### Cold Starts

Free container instances sleep after inactivity. The frontend pings `/health` in the background during idle time to initiate container warmup before user queries are submitted.

## API Reference

### `POST /chat`

```jsonc
// request
{ "query": "what is REDNOTE?", "top_k": 3 }

// response
{
  "answer": "REDNOTE is an enterprise RAG document assistant...",
  "sources": [
    { "id": "project_rednote_detail",
      "title": "Project Deep-Dive: REDNOTE",
      "category": "projects",
      "similarity": 0.4123 }
  ],
  "retrieval_time_ms": 1.84,
  "generation_time_ms": 612.4,
  "model": "openai/gpt-oss-120b"
}
```

`model` returns `"none"` when the similarity floor rejects a query.

### `GET /health`

```json
{
  "status": "ready",
  "groq_ready": true,
  "models": ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"],
  "embedding_mode": "FastEmbed (NumPy Cosine)"
}
```

## Knowledge Base

To add or update facts, edit `CHUNKS` in `knowledge.py`:

```python
{
    "id": "project_example_detail",
    "title": "Project Deep-Dive: Example",
    "category": "projects",
    "content": "Example project overview and metrics...",
}
```

Restart the server to rebuild the embedding matrix.
