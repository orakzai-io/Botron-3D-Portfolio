# backend/rag.py
"""
Vector RAG Engine for BOTRON.
Uses Qdrant in-memory vector database with FastEmbed (BAAI/bge-small-en-v1.5)
for dense semantic retrieval over the knowledge base.

Architecture:
  - Qdrant QdrantClient(":memory:") — ephemeral, zero-disk, production-identical API
  - FastEmbed TextEmbedding — ONNX-optimized, CPU-friendly, 384-dim dense vectors
  - Cosine similarity search — native Qdrant HNSW index
"""

import time
import uuid
import logging
from typing import List, Dict, Any, Tuple
from knowledge import CHUNKS

logger = logging.getLogger("rag")
logging.basicConfig(level=logging.INFO)

COLLECTION_NAME = "botron_knowledge"
EMBEDDING_MODEL  = "BAAI/bge-small-en-v1.5"
VECTOR_SIZE      = 384   # bge-small output dimensionality


class VectorRetriever:
    def __init__(self):
        self.chunks = CHUNKS
        self._client = None
        self._embed_model = None
        self.use_qdrant = False
        self.use_fastembed = False

        self._init_qdrant()
        self._index_chunks()

    # ------------------------------------------------------------------ #
    #  Initialisation                                                      #
    # ------------------------------------------------------------------ #

    def _init_qdrant(self):
        """Spin up an in-memory Qdrant instance and create the collection."""
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.models import Distance, VectorParams
            from fastembed import TextEmbedding

            logger.info("Initialising Qdrant in-memory vector database...")
            self._client = QdrantClient(":memory:")

            self._client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=VECTOR_SIZE,
                    distance=Distance.COSINE,
                ),
            )

            logger.info(f"Loading FastEmbed model '{EMBEDDING_MODEL}'...")
            self._embed_model = TextEmbedding(model_name=EMBEDDING_MODEL)

            self.use_qdrant = True
            self.use_fastembed = True
            logger.info("Qdrant + FastEmbed initialised successfully.")

        except Exception as e:
            logger.warning(
                f"Qdrant/FastEmbed could not be loaded ({e}). "
                "Falling back to built-in TF-IDF vectoriser."
            )
            self.use_qdrant = False
            self.use_fastembed = False
            self._tfidf_vocab: Dict[str, int] = {}
            self._tfidf_vecs: List[List[float]] = []

    def _index_chunks(self):
        """Embed all knowledge chunks and upsert them into Qdrant (or TF-IDF)."""
        import math, re

        t0 = time.perf_counter()
        texts = [f"{c['title']}: {c['content']}" for c in self.chunks]

        if self.use_qdrant and self._client and self._embed_model:
            from qdrant_client.models import PointStruct

            embeddings = list(self._embed_model.embed(texts))

            points = [
                PointStruct(
                    id=i,
                    vector=embeddings[i].tolist(),
                    payload={
                        "id":       chunk["id"],
                        "title":    chunk["title"],
                        "category": chunk["category"],
                        "content":  chunk["content"],
                    },
                )
                for i, chunk in enumerate(self.chunks)
            ]

            self._client.upsert(collection_name=COLLECTION_NAME, points=points)

        else:
            # Lightweight TF-IDF fallback (zero extra deps)
            self._tfidf_vocab = self._build_vocab(texts)
            self._tfidf_vecs  = [self._tfidf_vector(t) for t in texts]

        dur_ms = (time.perf_counter() - t0) * 1000
        logger.info(
            f"Indexed {len(self.chunks)} knowledge chunks into "
            f"{'Qdrant in-memory' if self.use_qdrant else 'TF-IDF'} "
            f"in {dur_ms:.1f}ms."
        )

    # ------------------------------------------------------------------ #
    #  TF-IDF fallback helpers                                            #
    # ------------------------------------------------------------------ #

    def _tokenize(self, text: str) -> List[str]:
        import re
        return re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", text.lower())

    def _build_vocab(self, texts: List[str]) -> Dict[str, int]:
        vocab: Dict[str, int] = {}
        for text in texts:
            for word in self._tokenize(text):
                if word not in vocab:
                    vocab[word] = len(vocab)
        return vocab

    def _tfidf_vector(self, text: str) -> List[float]:
        import math
        tokens = self._tokenize(text)
        vec = [0.0] * len(self._tfidf_vocab)
        for token in tokens:
            idx = self._tfidf_vocab.get(token)
            if idx is not None:
                vec[idx] += 1.0
        norm = math.sqrt(sum(v * v for v in vec))
        return [v / norm for v in vec] if norm > 0 else vec

    def _cosine_sim(self, a: List[float], b: List[float]) -> float:
        import math
        dot   = sum(x * y for x, y in zip(a, b))
        na    = math.sqrt(sum(x * x for x in a))
        nb    = math.sqrt(sum(x * x for x in b))
        return dot / (na * nb) if na and nb else 0.0

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    def retrieve(
        self, query: str, top_k: int = 3
    ) -> Tuple[List[Dict[str, Any]], float]:
        """
        Retrieve top_k chunks most relevant to *query*.
        Returns (ranked_chunks, retrieval_time_ms).
        """
        t0 = time.perf_counter()
        if not query.strip():
            return [], 0.0

        if self.use_qdrant and self._client and self._embed_model:
            query_vec = list(self._embed_model.embed([query]))[0].tolist()

            hits = self._client.search(
                collection_name=COLLECTION_NAME,
                query_vector=query_vec,
                limit=top_k,
                with_payload=True,
            )

            results = [
                {
                    "id":         hit.payload["id"],
                    "title":      hit.payload["title"],
                    "category":   hit.payload["category"],
                    "content":    hit.payload["content"],
                    "similarity": round(float(hit.score), 4),
                }
                for hit in hits
            ]

        else:
            query_vec = self._tfidf_vector(query)
            scored = [
                {
                    **chunk,
                    "similarity": round(self._cosine_sim(query_vec, self._tfidf_vecs[i]), 4),
                }
                for i, chunk in enumerate(self.chunks)
            ]
            results = sorted(scored, key=lambda x: x["similarity"], reverse=True)[:top_k]

        dur_ms = (time.perf_counter() - t0) * 1000
        return results, round(dur_ms, 2)


# Singleton — loaded once at server startup
retriever = VectorRetriever()