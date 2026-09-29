# rag/main.py
"""
FastAPI RAG Microservice for BOTRON.
Integrates Vector Retrieval (FastEmbed + NumPy) with Groq Cloud (Llama 3.3).
"""

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

from retriever import retriever

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("botron-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan handler:
    Allows Uvicorn to bind the port instantly (< 1s) while loading the
    heavier embedding weights in the background without blocking /health or /chat.
    """
    logger.info("Server port bound. Triggering background FastEmbed model initialization...")
    # Hold a reference to the task. Without one, the event loop may garbage
    # collect it mid-load, and nothing would await it on shutdown. Cancelling
    # on exit stops the load from outliving the process (the thread itself is
    # not interruptible, but the task wrapper is).
    warmup_task = asyncio.create_task(asyncio.to_thread(retriever.initialize))
    try:
        yield
    finally:
        warmup_task.cancel()
        logger.info("Shutting down BOTRON RAG API.")


app = FastAPI(
    title="BOTRON RAG API",
    description="Vector RAG Backend for Shahsawar Orakzai's Modern Portfolio",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for the static frontend. Override with ALLOWED_ORIGINS (comma separated).
# A wildcard is deliberately NOT used: allow_origins=["*"] together with
# allow_credentials=True is rejected by browsers anyway, and an open wildcard on a
# metered LLM endpoint invites abuse. The browser sends no credentials, so
# allow_credentials stays off.
_allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "https://orakzai.io,https://www.orakzai.io,https://orakzai-io.github.io",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Model rotation & failover list (ordered: best -> runner-up -> emergency fallback).
# This literal is only the no-configuration fallback for a fresh clone / CI with
# no .env and no env var. Any real deployment sets GROQ_MODELS, which takes
# precedence, so keep this in sync with .env.example rather than letting it drift
# to a stale rotation.
_raw_models = os.getenv("GROQ_MODELS") or os.getenv("GROQ_MODEL") or "openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b"
GROQ_MODELS = [m.strip() for m in _raw_models.split(",") if m.strip()]

# Initialize Groq client with bounded timeout and retries
groq_client = None
if GROQ_API_KEY:
    try:
        from groq import Groq
        # Set bounded timeout (20s) and max_retries (1) so dead requests don't hang workers
        groq_client = Groq(api_key=GROQ_API_KEY, timeout=20.0, max_retries=1)
        logger.info("Groq client initialized with model rotation order: %s", GROQ_MODELS)
    except Exception as e:
        logger.error("Failed to initialize Groq client: %s", e)
else:
    logger.warning("GROQ_API_KEY is not set in environment! Add it to .env to enable LLM generation.")


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    top_k: int = Field(default=3, ge=1, le=10)

class SourceChunk(BaseModel):
    id: str
    title: str
    category: str
    similarity: float

class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]
    retrieval_time_ms: float
    generation_time_ms: float
    model: str


SYSTEM_PROMPT_TEMPLATE = """You are BOTRON, an advanced autonomous AI assistant embedded in Shahsawar Orakzai's 3D interactive portfolio (orakzai.io).
Your task is to answer visitor questions concisely, accurately, and authoritatively about Shahsawar's technical work, projects, background, and athletic career.

=== GROUND TRUTH RETRIEVED CONTEXT ===
{context}
======================================

GUIDELINES:
1. Ground your answers strictly in the retrieved facts provided above. Do NOT hallucinate skills, metrics, or experiences not mentioned.
2. Tone: Sharp, intelligent, disciplined, technical, and warmly professional. You may subtly use cyber-telemetry flourishes (e.g. 'AFFIRMATIVE //', 'SYS // RECORDED') where natural, but keep the core answer direct and easy to read.
3. If the retrieved context does not contain the answer, say plainly that you do not have that information, then name the areas you do cover (REDNOTE, Async Web Scraper, VaultGuard, academics, experience, swimming, chess, contact). Never guess, never extrapolate, and never present a plausible-sounding inference as fact.
4. Keep answers concise (2 to 4 punchy sentences or clear bullet points), ideal for a fast-reading chat interface.
"""

@app.get("/")
def root():
    return {
        "status": "ready" if retriever.is_ready else "waking",
        "service": "BOTRON RAG API",
        "groq_configured": bool(groq_client),
        "models_configured": GROQ_MODELS,
        "indexed_chunks": len(retriever.chunks)
    }

@app.get("/health")
def health():
    return {
        "status": "ready" if retriever.is_ready else "waking",
        "groq_ready": bool(groq_client),
        "models": GROQ_MODELS,
        "embedding_mode": "FastEmbed (NumPy Cosine)" if retriever.use_fastembed else ("TF-IDF" if retriever.is_ready else "loading")
    }

@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # 1. RAG Vector Retrieval Step
    top_chunks, retrieval_ms = retriever.retrieve(query, top_k=payload.top_k)

    if not top_chunks:
        return ChatResponse(
            answer=(
                "I don't have anything indexed on that. My knowledge base covers Shahsawar's "
                "engineering work (REDNOTE, Async Web Scraper, VaultGuard), his academics and "
                "Harvard credentials, his work experience, and his swimming and chess background. "
                "Try one of those, or ask how to contact him."
            ),
            sources=[],
            retrieval_time_ms=round(retrieval_ms, 2),
            generation_time_ms=0.0,
            model="none",
        )

    # Format context for prompt
    context_str = "\n\n".join([
        f"[Source: {c['title']} | Relevance: {c['similarity']}]\n{c['content']}"
        for c in top_chunks
    ])

    sources = [
        SourceChunk(
            id=c["id"],
            title=c["title"],
            category=c["category"],
            similarity=c["similarity"]
        )
        for c in top_chunks
    ]

    # 2. Generation Step (Groq LLM with Multi-Model Rotation / Failover)
    t_gen_start = time.perf_counter()

    if not groq_client:
        gen_ms = (time.perf_counter() - t_gen_start) * 1000
        mock_answer = (
            "<strong>SYS // RAG RETRIEVAL ACTIVE:</strong><br>"
            f"Retrieved {len(top_chunks)} verified knowledge chunks from the vector store in {retrieval_ms:.1f}ms. "
            "To activate real-time LLM generation, please add your <code>GROQ_API_KEY</code> to the backend <code>.env</code> file.<br><br>"
            f"<strong>Top Retrieved Fact:</strong> {top_chunks[0]['content'] if top_chunks else 'No match.'}"
        )
        return ChatResponse(
            answer=mock_answer,
            sources=sources,
            retrieval_time_ms=retrieval_ms,
            generation_time_ms=round(gen_ms, 2),
            model="Local-RAG-Demo"
        )

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(context=context_str)
    last_error = None

    for model_name in GROQ_MODELS:
        try:
            logger.info("Attempting completion with model '%s'...", model_name)
            chat_completion = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                model=model_name,
                temperature=0.5,
                max_tokens=600,
            )

            answer = chat_completion.choices[0].message.content
            gen_ms = (time.perf_counter() - t_gen_start) * 1000
            logger.info("Success with '%s' in %.1fms.", model_name, gen_ms)

            return ChatResponse(
                answer=answer,
                sources=sources,
                retrieval_time_ms=retrieval_ms,
                generation_time_ms=round(gen_ms, 2),
                model=model_name
            )

        except Exception as e:
            logger.warning("Model '%s' failed or hit rate limit (%s). Failing over...", model_name, e)
            last_error = e
            continue

    logger.error("All configured Groq models failed. Last error: %s", last_error)
    raise HTTPException(
        status_code=500,
        detail=f"All configured Groq models failed. Last error: {last_error!s}"
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    # No reload=True: this is a documented entry point, not a dev convenience.
    # Use `uvicorn main:app --reload` locally instead.
    uvicorn.run("main:app", host="0.0.0.0", port=port)
