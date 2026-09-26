# rag/rag.py
"""
Vector RAG Engine for BOTRON.
Uses Qdrant in-memory vector database with FastEmbed (BAAI/bge-small-en-v1.5)
for dense semantic retrieval over the knowledge base.

Architecture:
  - Qdrant QdrantClient(":memory:") — ephemeral, zero-disk, production-identical API
  - FastEmbed TextEmbedding — ONNX-optimized, CPU-friendly, 384-dim dense vectors
  - Cosine similarity search — native Qdrant HNSW index
"""

import os
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

# Relevance floor. Without this, ANY question retrieves the top_k nearest
# chunks no matter how unrelated they are, and the LLM then answers confidently
# from unrelated biography text -- i.e. it invents facts about Shahsawar. On a
# portfolio that is the worst possible failure mode, so below this score we
# return nothing and the caller says "I don't have that" instead.
# Both backends are cosine-based and 0..1 normalised, so one constant covers
# Qdrant and the TF-IDF fallback.
#
# Calibrated against a labelled set of 20 on-topic and 20 off-topic queries.
# Lexical TF-IDF scores sit low: most off-topic questions land at exactly 0.0
# (no shared content word), and on-topic ones run 0.087 - 0.35. 0.06 sits
# below the weakest real query and above pure noise.
#
# IF YOU ENABLE THE DENSE BACKEND (FastEmbed + Qdrant, both already in
# requirements.txt and used automatically when importable) raise this to ~0.35
# -- dense embeddings separate far better than lexical overlap. It is an env
# var precisely because the right number is backend-specific.
MIN_SIMILARITY = float(os.getenv("MIN_SIMILARITY", "0.06"))


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
        self._tfidf_idf:  List[float] = []
        self._idf = None

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
            self._tfidf_idf   = self._build_idf(texts)
            self._idf        = self._tfidf_idf
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

    # Function words carry no retrieval signal but appear in nearly every
    # question, so they diluted the cosine for on-topic queries while an
    # off-topic question still matched them. Dropping them measurably improved
    # separation between on-topic and unrelated questions.
    _STOPWORDS = frozenset("""
        what which who whom whose when where why how is are was were be been
        being do does did done have has had having will would shall should can
        could may might must a an the and or but if then than that this these
        those it its he she they them his her their you your i we our us me my
        of in on at to for from by with about as into over under again further
        more most other some such no nor not only own same so too very just
        me tell please give know about
    """.split())

    def _tokenize(self, text: str) -> List[str]:
        import re
        toks = re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", text.lower())
        # fold trivial plurals so "projects" == "project", "medals" == "medal"
        return [
            t[:-1] if len(t) > 4 and t.endswith("s") and not t.endswith("ss") else t
            for t in toks if t not in self._STOPWORDS
        ]

    def _build_vocab(self, texts: List[str]) -> Dict[str, int]:
        vocab: Dict[str, int] = {}
        for text in texts:
            for word in self._tokenize(text):
                if word not in vocab:
                    vocab[word] = len(vocab)
        return vocab

    def _build_idf(self, texts: List[str]) -> List[float]:
        """Inverse document frequency per vocab term.

        This was MISSING, which made the "TF-IDF" fallback a plain normalised
        word count. Without it, ubiquitous words carried as much weight as
        distinctive ones, so unrelated questions scored as highly as on-topic
        ones (measured: "best pizza in Lahore" 0.20 vs "what are his projects"
        0.07 -- the two score distributions fully overlapped and no relevance
        floor could work).
        """
        import math
        n_docs = len(texts)
        df: Dict[str, int] = {}
        for text in texts:
            for word in set(self._tokenize(text)):
                df[word] = df.get(word, 0) + 1
        return [math.log((1.0 + n_docs) / (1.0 + df.get(w, 0))) + 1.0
                for w in sorted(self._tfidf_vocab, key=self._tfidf_vocab.get)]

    def _tfidf_vector(self, text: str) -> List[float]:
        """Sublinear TF x IDF, L2-normalised, so it is a true cosine."""
        import math
        if not getattr(self, "_idf", None) or len(self._idf) != len(self._tfidf_vocab):
            return self._bow_vector(text)
        tokens = self._tokenize(text)
        vec = [0.0] * len(self._tfidf_vocab)
        for token in tokens:
            idx = self._tfidf_vocab.get(token)
            if idx is not None:
                # sublinear TF: 1 + log(tf) stops a repeated word dominating
                vec[idx] = 1.0 + math.log(vec[idx] + 1.0) if vec[idx] else 1.0
        vec = [v * w for v, w in zip(vec, self._idf)]
        norm = math.sqrt(sum(v * v for v in vec))
        return [v / norm for v in vec] if norm > 0 else vec

    def _bow_vector(self, text: str) -> List[float]:
        """Unweighted bag-of-words. Only used before IDF is built."""
        import math
        vec = [0.0] * len(self._tfidf_vocab)
        for token in self._tokenize(text):
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
        # Hard length cap: an unbounded query is unbounded embedding work.
        query = query.strip()[:2000]

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

        # Drop anything below the relevance floor, and never return an empty
        # list of "matches" -- if nothing clears the bar, say so.
        results = [r for r in results if r["similarity"] >= MIN_SIMILARITY]

        dur_ms = (time.perf_counter() - t0) * 1000
        if not results:
            logger.info("No chunk cleared MIN_SIMILARITY=%.2f for query %r", MIN_SIMILARITY, query[:60])
        return results, round(dur_ms, 2)


# Singleton — loaded once at server startup
retriever = VectorRetriever()