# rag/retriever.py
"""
Vector RAG Engine for BOTRON.
Uses FastEmbed (BAAI/bge-small-en-v1.5) with vectorized NumPy cosine similarity
for high-speed dense retrieval over the knowledge base, with instant fallback
to an optimized TF-IDF lexical engine.

Architecture:
  - FastEmbed TextEmbedding (ONNX CPU, 384-dim dense vectors)
  - Vectorized NumPy Cosine Similarity: matrix @ vector in <0.1ms
  - Non-blocking initialization for instant server port binding
  - Sublinear TF-IDF fallback with inverted index and relevance floor
"""

import logging
import os
import threading
import time
from typing import Any, Optional

import numpy as np

from knowledge import CHUNKS

logger = logging.getLogger("rag")
logging.basicConfig(level=logging.INFO)

EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
VECTOR_SIZE     = 384   # bge-small output dimensionality

# Relevance floor: below this score we return nothing so the bot doesn't hallucinate.
#
# The floor is BACKEND-SPECIFIC, and the two backends are not on the same scale.
# Measured on a labelled set of 20 on-topic / 20 off-topic queries, the lexical
# TF-IDF scores run 0.087 - 0.339 on-topic (median 0.159) and 0.000 - 0.130
# off-topic, while dense embeddings separate far better and sit much higher.
#
# A single shared constant CANNOT cover both: anything high enough to be a real
# floor for dense (0.35) rejects the *median* on-topic lexical query, and
# anything low enough for lexical (0.06) lets off-topic noise through the dense
# path. The previous single value of 0.25 sat right between the lexical on-topic
# median (0.159) and the off-topic maximum (0.130), which is close to a coin
# flip -- and because the lexical path is what serves requests while the dense
# model is still loading, that mis-tuned constant made the bot answer "I don't
# have that" to legitimate questions on every cold start.
#
# MIN_SIMILARITY is still honoured as an explicit override for both, so an
# operator who wants one number for a single-backend deployment still gets it.
_env_floor = os.getenv("MIN_SIMILARITY")
DENSE_MIN_SIMILARITY = float(_env_floor) if _env_floor else 0.35
LEXICAL_MIN_SIMILARITY = float(_env_floor) if _env_floor else 0.06


class VectorRetriever:
    def __init__(self):
        self.chunks = CHUNKS
        self._embed_model = None
        self.use_fastembed = False
        self.is_ready = False
        self._lock = threading.Lock()

        # Dense storage (NumPy array of normalized vectors: shape [N, 384]).
        # None until initialize() finishes; retrieval checks before use.
        self._dense_matrix: Optional[np.ndarray] = None

        # Pre-build lightweight TF-IDF index immediately (< 1ms) so the retriever is
        # immediately usable even before FastEmbed finishes loading.
        self._init_tfidf()

    def initialize(self):
        """Load FastEmbed model and pre-compute/index dense chunk vectors in the background."""
        with self._lock:
            if self.is_ready and self.use_fastembed:
                return

            t0 = time.perf_counter()
            try:
                from fastembed import TextEmbedding

                logger.info("Loading FastEmbed model '%s'...", EMBEDDING_MODEL)
                self._embed_model = TextEmbedding(model_name=EMBEDDING_MODEL)

                # Embed all chunks and normalize for instant dot-product cosine similarity
                texts = [f"{c['title']}: {c['content']}" for c in self.chunks]
                raw_embeddings = list(self._embed_model.embed(texts))
                matrix = np.array(raw_embeddings, dtype=np.float32)

                # L2-normalize chunk vectors
                norms = np.linalg.norm(matrix, axis=1, keepdims=True)
                norms[norms == 0] = 1.0
                self._dense_matrix = matrix / norms

                self.use_fastembed = True
                self.is_ready = True
                dur_ms = (time.perf_counter() - t0) * 1000
                logger.info(
                    "FastEmbed dense matrix loaded (%d chunks, %d dims) in %.1fms.",
                    len(self.chunks), self._dense_matrix.shape[1], dur_ms
                )
            except Exception as e:
                logger.warning(
                    "FastEmbed could not be loaded (%s). Using lexical TF-IDF index.", e
                )
                self.use_fastembed = False
                self.is_ready = True

    # ------------------------------------------------------------------ #
    #  TF-IDF fallback helpers                                           #
    # ------------------------------------------------------------------ #

    _STOPWORDS = frozenset(["what", "which", "who", "whom", "whose", "when", "where", "why", "how", "is", "are", "was", "were", "be", "been", "being", "do", "does", "did", "done", "have", "has", "had", "having", "will", "would", "shall", "should", "can", "could", "may", "might", "must", "a", "an", "the", "and", "or", "but", "if", "then", "than", "that", "this", "these", "those", "it", "its", "he", "she", "they", "them", "his", "her", "their", "you", "your", "i", "we", "our", "us", "me", "my", "of", "in", "on", "at", "to", "for", "from", "by", "with", "about", "as", "into", "over", "under", "again", "further", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "too", "very", "just", "me", "tell", "please", "give", "know", "about"])

    def _tokenize(self, text: str) -> list[str]:
        import re
        toks = re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", text.lower())
        return [
            t[:-1] if len(t) > 4 and t.endswith("s") and not t.endswith("ss") else t
            for t in toks if t not in self._STOPWORDS
        ]

    def _build_vocab(self, texts: list[str]) -> dict[str, int]:
        vocab: dict[str, int] = {}
        for text in texts:
            for word in self._tokenize(text):
                if word not in vocab:
                    vocab[word] = len(vocab)
        return vocab

    def _build_idf(self, texts: list[str]) -> list[float]:
        import math
        n_docs = len(texts)
        df: dict[str, int] = {}
        for text in texts:
            for word in set(self._tokenize(text)):
                df[word] = df.get(word, 0) + 1
        return [
            math.log((1.0 + n_docs) / (1.0 + df.get(w, 0))) + 1.0
            for w in sorted(self._tfidf_vocab, key=self._tfidf_vocab.get)
        ]

    def _tfidf_vector(self, text: str) -> list[float]:
        import math
        tokens = self._tokenize(text)
        vec = [0.0] * len(self._tfidf_vocab)
        for token in tokens:
            idx = self._tfidf_vocab.get(token)
            if idx is not None:
                vec[idx] = 1.0 + math.log(vec[idx] + 1.0) if vec[idx] else 1.0
        vec = [v * w for v, w in zip(vec, self._tfidf_idf)]
        norm = math.sqrt(sum(v * v for v in vec))
        return [v / norm for v in vec] if norm > 0 else vec

    def _init_tfidf(self):
        texts = [f"{c['title']}: {c['content']}" for c in self.chunks]
        self._tfidf_vocab  = self._build_vocab(texts)
        self._tfidf_idf    = self._build_idf(texts)
        self._tfidf_matrix = np.array(
            [self._tfidf_vector(t) for t in texts], dtype=np.float32
        )

    # ------------------------------------------------------------------ #
    #  Public API                                                        #
    # ------------------------------------------------------------------ #

    def retrieve(
        self, query: str, top_k: int = 3
    ) -> tuple[list[dict[str, Any]], float]:
        """
        Retrieve top_k chunks most relevant to *query*.
        Returns (ranked_chunks, retrieval_time_ms).
        """
        t0 = time.perf_counter()
        if not query.strip():
            return [], 0.0
        query = query.strip()[:2000]

        if self.use_fastembed and self._dense_matrix is not None and self._embed_model:
            try:
                return self._retrieve_dense(query, top_k, t0)
            except Exception as e:
                logger.warning("Dense retrieval error (%s). Falling back to TF-IDF.", e)

        return self._retrieve_lexical(query, top_k, t0)

    def _retrieve_dense(self, query: str, top_k: int, t0: float):
        query_emb = next(iter(self._embed_model.embed([query])))
        q_vec = np.array(query_emb, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm > 0:
            q_vec /= q_norm

        # Vectorized Cosine Similarity over all chunks: (N, D) @ (D,) -> (N,) in < 0.05ms
        sims = np.dot(self._dense_matrix, q_vec)
        top_indices = np.argsort(sims)[::-1][:top_k]

        results = [
            {
                "id":         self.chunks[i]["id"],
                "title":      self.chunks[i]["title"],
                "category":   self.chunks[i]["category"],
                "content":    self.chunks[i]["content"],
                "similarity": round(float(sims[i]), 4),
            }
            for i in top_indices
        ]
        return self._finalise(results, top_k, query, t0, DENSE_MIN_SIMILARITY)

    def _retrieve_lexical(self, query: str, top_k: int, t0: float):
        q_vec = np.array(self._tfidf_vector(query), dtype=np.float32)
        sims = np.dot(self._tfidf_matrix, q_vec)
        top_indices = np.argsort(sims)[::-1][:top_k]

        results = [
            {
                "id":         self.chunks[i]["id"],
                "title":      self.chunks[i]["title"],
                "category":   self.chunks[i]["category"],
                "content":    self.chunks[i]["content"],
                "similarity": round(float(sims[i]), 4),
            }
            for i in top_indices
        ]
        return self._finalise(results, top_k, query, t0, LEXICAL_MIN_SIMILARITY)

    def _finalise(self, results, top_k, query, t0, floor):
        # Drop anything below the relevance floor, and never return an empty
        # list of "matches" -- if nothing clears the bar, say so.
        filtered = [r for r in results if r["similarity"] >= floor]
        dur_ms = (time.perf_counter() - t0) * 1000
        if not filtered:
            logger.info(
                "No chunk cleared the %.2f floor for query %r", floor, query[:60]
            )
        return filtered, round(dur_ms, 2)


# Singleton — lightweight init at import time; heavy weights loaded via lifespan
retriever = VectorRetriever()