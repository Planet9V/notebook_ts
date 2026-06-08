"""
Memory-First Search Caching & RRF Hybrid Search

Orchestrates checking local Postgres+pgvector research memory before
querying the Valyu SDK, and merges semantic + full-text search results
using Reciprocal Rank Fusion.
"""

import asyncio
from typing import Any, Dict, List, Optional
from loguru import logger

from open_notebook.search.research_memory import ResearchMemory
from open_notebook.search.valyu_search import run_valyu_search
from open_notebook.utils.embedding import generate_embedding, generate_embeddings


async def _store_results_in_background(query: str, results: List[Dict[str, Any]]) -> None:
    """Helper to embed and store search results in Postgres in the background."""
    try:
        if not results:
            return

        logger.debug(f"Async storage: embedding {len(results)} results for query: '{query[:40]}'")
        
        # Prepare contents to embed
        contents = [r.get("content", "") or "" for r in results]
        
        # Batch generate embeddings
        try:
            embeddings = await generate_embeddings(contents)
        except Exception as embed_err:
            logger.warning(f"Failed to generate embeddings for results: {embed_err}. Storing without embeddings.")
            embeddings = [None] * len(results)

        # Store each result in database
        for r, emb in zip(results, embeddings):
            # Map search result keys to database expected schema
            result_to_store = {
                "title": r.get("title", "Valyu Result"),
                "url": r.get("url", ""),
                "content": r.get("content", ""),
                "source_type": r.get("source", r.get("source_type", "web")),
                "relevance_score": r.get("score", 0.0),
            }
            await ResearchMemory.store_result(query, result_to_store, emb)

        logger.debug(f"Successfully stored {len(results)} results in background memory")
    except Exception as e:
        logger.error(f"Error in background research memory storage: {e}")


async def query_with_cache(
    query: str,
    context: str = "general",
    max_results: int = 10,
    search_type: str | None = None,
    min_similarity: float = 0.85,
    force_refresh: bool = False,
) -> List[Dict[str, Any]]:
    """Search with memory-first caching.

    Checks pgvector semantic memory first. If matches are found above the similarity
    threshold, returns them. Otherwise, queries Valyu, returns results, and triggers
    asynchronous background indexing to populate the cache.

    Args:
        query: Search query string.
        context: Business context (e.g. compliance, academic, financial, web).
        max_results: Maximum results to return.
        search_type: Optional explicit Valyu search type override.
        min_similarity: Cosine similarity threshold (0-1) for a cache hit.
        force_refresh: If True, bypasses cache and forces Valyu query.
    """
    if force_refresh:
        logger.info(f"Bypassing cache for query: '{query[:50]}'")
    else:
        try:
            # Generate embedding for the query
            query_emb = await generate_embedding(query)
            
            # Map context to source type if possible
            source_filter = None
            if context in ("news", "web"):
                source_filter = context

            # Query semantic memory
            memory_hits = await ResearchMemory.semantic_search(
                embedding=query_emb,
                limit=max_results,
                min_score=min_similarity,
                source_type=source_filter,
            )

            if memory_hits:
                logger.info(f"Cache HIT: found {len(memory_hits)} semantic matches for query: '{query[:50]}'")
                return [
                    {
                        "title": r.get("title", ""),
                        "url": r.get("url", ""),
                        "content": r.get("content", ""),
                        "score": r.get("similarity", 1.0),
                        "source": r.get("source_type", "web"),
                    }
                    for r in memory_hits
                ]
            else:
                logger.debug(f"Cache MISS (no semantic match > {min_similarity}) for query: '{query[:50]}'")

        except Exception as e:
            logger.warning(f"Research memory cache lookup failed: {e}. Proceeding directly to Valyu.")

    # Cache miss or forced refresh: query Valyu search
    results = await run_valyu_search(
        query=query,
        context=context,
        max_results=max_results,
        search_type=search_type,
    )

    if results:
        # Trigger background indexing task so API response returns instantly
        asyncio.create_task(_store_results_in_background(query, results))

    return results


async def hybrid_rrf_search(
    query: str,
    limit: int = 10,
    min_score: float = 0.7,
    source_type: Optional[str] = None,
    rrf_k: int = 60,
) -> List[Dict[str, Any]]:
    """Perform a hybrid search combining pgvector semantic search and FTS keyword search.

    Uses Reciprocal Rank Fusion (RRF) to merge the ranked results.

    Args:
        query: Search query string.
        limit: Number of final results to return.
        min_score: Minimum cosine similarity score for semantic results.
        source_type: Optional filter by source category.
        rrf_k: RRF rank constant (standard default is 60).
    """
    # 1. Fetch semantic results
    semantic_results = []
    try:
        query_emb = await generate_embedding(query)
        semantic_results = await ResearchMemory.semantic_search(
            embedding=query_emb,
            limit=limit * 2,
            min_score=min_score,
            source_type=source_type,
        )
    except Exception as e:
        logger.warning(f"Semantic search failed during RRF: {e}")

    # 2. Fetch keyword (FTS) results
    keyword_results = []
    try:
        keyword_results = await ResearchMemory.keyword_search(query, limit=limit * 2)
    except Exception as e:
        logger.warning(f"Keyword search failed during RRF: {e}")

    # 3. Apply Reciprocal Rank Fusion
    # Identify items by database ID
    doc_map: Dict[int, Dict[str, Any]] = {}
    rrf_scores: Dict[int, float] = {}

    # Rank semantic results
    for rank, doc in enumerate(semantic_results):
        doc_id = doc["id"]
        doc_map[doc_id] = doc
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (rrf_k + rank + 1))

    # Rank keyword results
    for rank, doc in enumerate(keyword_results):
        doc_id = doc["id"]
        doc_map[doc_id] = doc
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (rrf_k + rank + 1))

    # Sort document IDs by RRF score descending
    sorted_doc_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)

    # 4. Format and return top results
    final_results = []
    for doc_id in sorted_doc_ids[:limit]:
        doc = doc_map[doc_id]
        final_results.append({
            "id": doc["id"],
            "query": doc.get("query", ""),
            "title": doc.get("title", ""),
            "url": doc.get("url", ""),
            "content": doc.get("content", ""),
            "source_type": doc.get("source_type", "web"),
            "rrf_score": rrf_scores[doc_id],
            "similarity": doc.get("similarity"),
            "keyword_rank": doc.get("rank"),
            "created_at": doc.get("created_at"),
        })

    return final_results
