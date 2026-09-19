# backend/main.py
"""
FastAPI RAG Microservice for BOTRON Copilot.
Integrates Vector Retrieval (FastEmbed) with Groq Cloud (Llama 3.3).
"""

import os
import time
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from rag import retriever

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("botron-api")

app = FastAPI(
    title="BOTRON RAG API",
    description="Vector RAG Backend for Shahsawar Orakzai's Modern Portfolio",
    version="1.0.0"
)

# Enable CORS for static frontend (supports localhost, GitHub Pages, orakzai.io, Vercel, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Model rotation & failover list (ordered: best of the best -> runner up -> emergency fallback)
_raw_models = os.getenv("GROQ_MODELS") or os.getenv("GROQ_MODEL") or "openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b"
GROQ_MODELS = [m.strip() for m in _raw_models.split(",") if m.strip()]

# Initialize Groq client
groq_client = None
if GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
        logger.info(f"Groq client initialized with model rotation order: {GROQ_MODELS}")
    except Exception as e:
        logger.error(f"Failed to initialize Groq client: {e}")
else:
    logger.warning("GROQ_API_KEY is not set in environment! Add it to .env to enable LLM generation.")


class ChatRequest(BaseModel):
    query: str
    top_k: Optional[int] = 3

class SourceChunk(BaseModel):
    id: str
    title: str
    category: str
    similarity: float

class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]
    retrieval_time_ms: float
    generation_time_ms: float
    model: str


SYSTEM_PROMPT_TEMPLATE = """You are BOTRON, an advanced autonomous AI copilot embedded in Shahsawar Orakzai's (Shaso's) 3D interactive portfolio (orakzai.io).
Your task is to answer visitor questions concisely, accurately, and authoritatively about Shaso's technical work, projects, background, and athletic career.

=== GROUND TRUTH RETRIEVED CONTEXT ===
{context}
======================================

GUIDELINES:
1. Ground your answers strictly in the retrieved facts provided above. Do NOT hallucinate skills, metrics, or experiences not mentioned.
2. Tone: Sharp, intelligent, disciplined, technical, and warmly professional. You may subtly use cyber-telemetry flourishes (e.g. 'AFFIRMATIVE //', 'SYS // RECORDED') where natural, but keep the core answer direct and easy to read.
3. If the retrieved context does not contain enough information to answer, state what you have indexed and offer relevant suggestions (e.g. REDNOTE, Async Web Scraper, VaultGuard, Swimming career, or contact details).
4. Keep answers concise (2 to 4 punchy sentences or clear bullet points), ideal for a fast-reading chat interface.
"""

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "BOTRON RAG API",
        "groq_configured": bool(groq_client),
        "models_configured": GROQ_MODELS,
        "indexed_chunks": len(retriever.chunks)
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "groq_ready": bool(groq_client),
        "models": GROQ_MODELS,
        "embedding_mode": "FastEmbed" if retriever.use_fastembed else "TF-IDF"
    }

@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # 1. RAG Vector Retrieval Step
    top_chunks, retrieval_ms = retriever.retrieve(query, top_k=payload.top_k or 3)

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
        # Fallback if API key has not been entered yet
        gen_ms = (time.perf_counter() - t_gen_start) * 1000
        mock_answer = (
            "<strong>SYS // RAG RETRIEVAL ACTIVE:</strong><br>"
            f"Retrieved {len(top_chunks)} verified knowledge chunks from the vector database. "
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

    # Try each configured model in order. If one is rate-limited (429) or fails, try the next.
    for model_name in GROQ_MODELS:
        try:
            logger.info(f"Attempting completion with model '{model_name}'...")
            chat_completion = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                model=model_name,
                temperature=0.2,
                max_tokens=600,
            )

            answer = chat_completion.choices[0].message.content
            gen_ms = (time.perf_counter() - t_gen_start) * 1000
            logger.info(f"Success with '{model_name}' in {gen_ms:.1f}ms.")

            return ChatResponse(
                answer=answer,
                sources=sources,
                retrieval_time_ms=retrieval_ms,
                generation_time_ms=round(gen_ms, 2),
                model=model_name
            )

        except Exception as e:
            logger.warning(
                f"Model '{model_name}' failed or hit rate limit ({e}). Failing over to next model..."
            )
            last_error = e
            continue

    logger.error(f"All configured Groq models failed. Last error: {last_error}")
    raise HTTPException(
        status_code=500,
        detail=f"All configured Groq models failed. Last error: {str(last_error)}"
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
