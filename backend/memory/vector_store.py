"""
VentureNode — FAISS Vector Store for Agent Memory.

Provides long-term, cross-session memory for the VentureNode pipeline.
Research summaries and idea analyses are embedded and stored in a local
FAISS index, allowing future agent runs to retrieve semantically similar
historical context — enabling knowledge transfer across startup ideas.

Architecture:
  - Embeddings: sentence-transformers (all-MiniLM-L6-v2) — free, local.
  - Index: FAISS flat L2 index — in-process, zero cloud dependency.
  - Persistence: Index + metadata saved to disk as .faiss + .json files.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

from backend.core.logging import get_logger

logger = get_logger(__name__)

# ------------------------------------------------------------------ #
# Constants                                                            #
# ------------------------------------------------------------------ #

_MODEL_NAME = "all-MiniLM-L6-v2"
_EMBEDDING_DIM = 384  # Dimension for all-MiniLM-L6-v2
_STORE_DIR = Path(__file__).parent.parent.parent / ".vector_store"
_INDEX_PATH = _STORE_DIR / "venturenode.faiss"
_META_PATH = _STORE_DIR / "venturenode_meta.json"


# ------------------------------------------------------------------ #
# VectorMemory Class                                                   #
# ------------------------------------------------------------------ #


class VectorMemory:
    """FAISS-backed vector memory store for VentureNode agent context.

    Provides simple add/search operations over text documents. Documents
    are embedded using a local sentence-transformers model and stored in
    a persistent FAISS flat L2 index on disk.

    Attributes:
        model: The sentence-transformers embedding model.
        index: The FAISS flat L2 index.
        metadata: List of metadata dicts corresponding to each vector.

    Example:
        memory = VectorMemory()
        memory.add("User research: founders struggle with roadmap...", {"run_id": "abc"})
        results = memory.search("startup roadmap challenges", k=3)
    """

    def __init__(self) -> None:
        """Initialize the vector memory store.

        Loads the embedding model and either restores an existing FAISS
        index from disk or creates a new empty one.
        """
        logger.info("Initializing VectorMemory", model=_MODEL_NAME)
        self.model = SentenceTransformer(_MODEL_NAME)
        self.metadata: list[dict] = []
        self._load_or_create_index()

    def _load_or_create_index(self) -> None:
        """Load FAISS index from disk or create a new one.

        Creates the storage directory if it does not exist. If persisted
        index files are found, loads them; otherwise initializes empty.
        """
        _STORE_DIR.mkdir(parents=True, exist_ok=True)

        if _INDEX_PATH.exists() and _META_PATH.exists():
            try:
                self.index = faiss.read_index(str(_INDEX_PATH))
                with open(_META_PATH, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                logger.info(
                    "Loaded existing FAISS index",
                    vectors=self.index.ntotal,
                    meta_entries=len(self.metadata),
                )
                return
            except Exception as exc:
                logger.warning("Failed to load FAISS index, creating new", error=str(exc))

        self.index = faiss.IndexFlatL2(_EMBEDDING_DIM)
        self.metadata = []
        logger.info("Created new FAISS index", dim=_EMBEDDING_DIM)

    def _save(self) -> None:
        """Persist the FAISS index and metadata to disk."""
        try:
            faiss.write_index(self.index, str(_INDEX_PATH))
            with open(_META_PATH, "w", encoding="utf-8") as f:
                json.dump(self.metadata, f, ensure_ascii=False, indent=2)
        except Exception as exc:
            logger.error("Failed to persist FAISS index", error=str(exc))

    def add(self, text: str, meta: Optional[dict] = None) -> None:
        """Embed and store a text document in the vector memory.

        Args:
            text: The text content to embed and store.
            meta: Optional metadata dict to associate with this vector
                  (e.g. run_id, agent_name, timestamp).
        """
        if not text.strip():
            return

        embedding = self.model.encode([text], normalize_embeddings=True)
        vector = np.array(embedding, dtype=np.float32)

        self.index.add(vector)
        self.metadata.append(meta or {})
        self._save()

        logger.debug("Added vector to memory", total=self.index.ntotal)

    def search(self, query: str, k: int = 5) -> list[dict]:
        """Search the vector store for the most semantically similar documents.

        Args:
            query: The search query text.
            k: Number of nearest neighbour results to return.

        Returns:
            list[dict]: List of result dicts with 'score' and 'meta' keys,
                        ordered by ascending L2 distance (most similar first).
        """
        if self.index.ntotal == 0:
            return []

        k = min(k, self.index.ntotal)
        query_vector = self.model.encode([query], normalize_embeddings=True)
        query_array = np.array(query_vector, dtype=np.float32)

        distances, indices = self.index.search(query_array, k)

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0 or idx >= len(self.metadata):
                continue
            results.append({
                "score": float(dist),
                "meta": self.metadata[idx],
            })

        return results

    def retrieve_context(self, query: str, k: int = 3) -> str:
        """Retrieve relevant historical context as a formatted text block.

        A convenience wrapper around search() that formats results for
        direct injection into LLM prompts.

        Args:
            query: The query to find relevant context for.
            k: Number of results to retrieve.

        Returns:
            str: Formatted context string, or empty string if no results found.
        """
        results = self.search(query, k=k)
        if not results:
            return ""

        lines = ["[Historical Context from VentureNode Memory:]"]
        for i, result in enumerate(results, start=1):
            meta = result.get("meta", {})
            agent = meta.get("agent", "unknown")
            run_id = meta.get("run_id", "unknown")
            content = meta.get("content", "")
            lines.append(f"{i}. [{agent} | run {run_id[:8]}] {content[:300]}")

        return "\n".join(lines)

    @property
    def size(self) -> int:
        """Return the number of vectors currently stored in the index.

        Returns:
            int: Total vector count.
        """
        return self.index.ntotal


# ------------------------------------------------------------------ #
# Module-level Singleton                                              #
# ------------------------------------------------------------------ #

_memory_instance: Optional[VectorMemory] = None


def get_memory() -> VectorMemory:
    """Return the module-level VectorMemory singleton.

    Lazily instantiates on first call. Subsequent calls return the
    cached instance to avoid repeated model loading.

    Returns:
        VectorMemory: The global vector memory instance.
    """
    global _memory_instance
    if _memory_instance is None:
        _memory_instance = VectorMemory()
    return _memory_instance
