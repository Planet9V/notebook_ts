# 12 — Option 3: Research Platform 🟠

> Valyu DeepResearch API + Postgres/pgvector research memory.
>
> **Effort**: 2-3 weeks | **Risk**: Medium-High | **Impact**: Autonomous, persistent research

---

## Summary

Options 1-2 + replace our homegrown 5-step deep research with Valyu DeepResearch API. Add Postgres 18 + pgvector as research memory layer for 4096D Qwen3 embeddings. Research results accumulate over time, making every future search smarter by checking local memory before hitting external APIs.

---

## Prerequisites

- Options 1 and 2 completed
- Postgres 18 with pgvector extension available
- Embedding model accessible (Qwen3 4096D or equivalent)
- Webhook endpoint reachable from Valyu's servers

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Research Request                │
│         (from pipeline or scheduled job)         │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Research Memory │──── Hit? ──→ Return cached
              │   (pgvector)   │              results
              └───────┬────────┘
                      │ Miss
                      ▼
           ┌─────────────────────┐
           │  Valyu DeepResearch │
           │   (async + webhook) │
           └──────────┬──────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │  Webhook Handler    │
           │  → Embed + Store    │
           │  → Notify caller    │
           └─────────────────────┘
```

---

## Code: Valyu DeepResearch

Replace the homegrown 5-step pipeline (decompose → search → extract → synthesize → format) with a single Valyu DeepResearch call. The API handles all intermediate steps and calls back when done.

```python
async def run_deep_research_valyu(research_item: ResearchItem):
    """Launch a Valyu DeepResearch task for the given research item.
    
    This replaces our 5-step deep research pipeline:
    1. Question decomposition     → handled by DeepResearch
    2. Multi-source search        → handled by DeepResearch  
    3. Content extraction          → handled by DeepResearch
    4. Cross-source synthesis      → handled by DeepResearch
    5. Output formatting           → handled by output_format param
    
    Results arrive via webhook at /api/webhooks/valyu-research/<id>.
    
    Args:
        research_item: ResearchItem model with query, depth, and 
                       source configuration.
    """
    valyu = Valyu(api_key=await get_api_key("valyu"))
    
    # Map our depth levels to Valyu's mode parameter
    mode_map = {
        "quick":      "fast",
        "standard":   "standard",
        "deep":       "heavy",
        "exhaustive": "max",
    }
    
    task = valyu.deepresearch.create(
        query=research_item.query,
        mode=mode_map.get(research_item.depth, "standard"),
        output_format="markdown",
        search_sources=_build_sources(research_item),
        webhook_url=f"{BASE_URL}/api/webhooks/valyu-research/{research_item.id}",
    )
    
    # Track the async task
    research_item.valyu_task_id = task.deepresearch_id
    research_item.stage = "researching"
    await research_item.save()


def _build_sources(research_item: ResearchItem) -> list[str]:
    """Build Valyu source list from research item context.
    
    Maps our internal context tags to Valyu collection names 
    and built-in source identifiers.
    """
    sources = []
    
    context_to_collection = {
        "compliance":  "collection:tetrel-compliance",
        "financial":   "collection:tetrel-financial",
        "threat_intel":"collection:tetrel-threat-intel",
        "academic":    "collection:tetrel-academic",
    }
    
    if research_item.context in context_to_collection:
        sources.append(context_to_collection[research_item.context])
    
    # Always include web for breadth
    if research_item.depth in ("deep", "exhaustive"):
        sources.append("web")
    
    return sources or ["web"]  # default to web if no specific sources
```

### Webhook Handler

```python
from fastapi import APIRouter, Request

router = APIRouter()

@router.post("/api/webhooks/valyu-research/{research_id}")
async def handle_research_webhook(research_id: str, request: Request):
    """Handle completed DeepResearch results from Valyu.
    
    1. Validate the webhook payload
    2. Store results in research memory (pgvector)
    3. Update the research item status
    4. Trigger downstream transformations if configured
    """
    payload = await request.json()
    
    research_item = await ResearchItem.get(research_id)
    if not research_item:
        return {"status": "not_found"}
    
    # Store raw result
    research_item.raw_result = payload.get("output", "")
    research_item.sources_used = payload.get("sources", [])
    research_item.stage = "completed"
    await research_item.save()
    
    # Embed and store in research memory
    memory = ResearchMemory()
    embedding = await generate_embedding(research_item.raw_result)
    
    await memory.store_result(
        query=research_item.query,
        result={
            "title": f"Research: {research_item.query[:100]}",
            "url": f"internal://research/{research_id}",
            "content": research_item.raw_result,
            "source_type": "deep_research",
            "relevance_score": 1.0,
        },
        embedding=embedding,
    )
    
    # Trigger transformations (podcast, brief, etc.)
    if research_item.auto_transform:
        await trigger_transformations(research_item)
    
    return {"status": "ok"}
```

### Polling Fallback

```python
async def poll_deep_research(research_item: ResearchItem, timeout: int = 300):
    """Fallback: poll for results if webhook delivery fails.
    
    Checks every 10 seconds for up to `timeout` seconds.
    Use only when webhook endpoint is unreachable.
    """
    valyu = Valyu(api_key=await get_api_key("valyu"))
    start = datetime.utcnow()
    
    while (datetime.utcnow() - start).seconds < timeout:
        status = valyu.deepresearch.status(research_item.valyu_task_id)
        
        if status.state == "completed":
            result = valyu.deepresearch.result(research_item.valyu_task_id)
            research_item.raw_result = result.output
            research_item.stage = "completed"
            await research_item.save()
            return result
        
        if status.state == "failed":
            research_item.stage = "failed"
            research_item.error = status.error
            await research_item.save()
            raise Exception(f"DeepResearch failed: {status.error}")
        
        await asyncio.sleep(10)
    
    raise TimeoutError(f"DeepResearch timed out after {timeout}s")
```

---

## Code: Postgres Research Memory

### Docker Setup

```yaml
# docker-compose.yml addition
services:
  postgres:
    image: pgvector/pgvector:pg18
    environment:
      POSTGRES_DB: tetrel_research
      POSTGRES_USER: tetrel
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tetrel"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Schema Migration

```sql
-- migrations/001_research_memory.sql

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE research_corpus (
    id              BIGSERIAL PRIMARY KEY,
    query           TEXT NOT NULL,
    title           TEXT NOT NULL,
    url             TEXT NOT NULL UNIQUE,
    content         TEXT NOT NULL,
    source_type     TEXT NOT NULL,
    relevance_score FLOAT DEFAULT 0.0,
    embedding       vector(4096),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX idx_research_corpus_embedding 
    ON research_corpus 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Partial index for source-type filtered queries
CREATE INDEX idx_research_corpus_source_type 
    ON research_corpus (source_type);

-- Full-text search index for keyword fallback
CREATE INDEX idx_research_corpus_content_fts 
    ON research_corpus 
    USING gin (to_tsvector('english', content));

-- Timestamp index for temporal queries
CREATE INDEX idx_research_corpus_created_at 
    ON research_corpus (created_at DESC);
```

### ResearchMemory Class

```python
import asyncpg
from typing import Optional

class ResearchMemory:
    """Persistent research memory backed by Postgres + pgvector.
    
    Stores search results with 4096D embeddings for semantic retrieval.
    Acts as a cache layer: check memory before hitting external APIs.
    """
    
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool
    
    @classmethod
    async def create(cls, dsn: str) -> "ResearchMemory":
        """Factory: create a ResearchMemory with a connection pool."""
        pool = await asyncpg.create_pool(dsn, min_size=2, max_size=10)
        return cls(pool)
    
    async def store_result(self, query: str, result: dict, embedding: list[float]):
        """Store a search result with its embedding.
        
        Uses UPSERT on URL to avoid duplicates. Keeps the higher
        relevance score on conflict.
        
        Args:
            query: Original search query.
            result: Dict with title, url, content, source_type, relevance_score.
            embedding: 4096-dimensional embedding vector.
        """
        await self.pool.execute("""
            INSERT INTO research_corpus (
                query, title, url, content, source_type,
                relevance_score, embedding, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7::vector(4096), NOW())
            ON CONFLICT (url) DO UPDATE SET
                relevance_score = GREATEST(research_corpus.relevance_score, $6),
                updated_at = NOW()
        """, query, result['title'], result['url'], result['content'],
            result['source_type'], result['relevance_score'], embedding)
    
    async def semantic_search(
        self, 
        embedding: list[float], 
        limit: int = 20, 
        min_score: float = 0.7,
        source_type: Optional[str] = None,
    ) -> list[dict]:
        """Find semantically similar results in research memory.
        
        Uses cosine similarity via pgvector's <=> operator.
        
        Args:
            embedding: Query embedding (4096D).
            limit: Max results to return.
            min_score: Minimum cosine similarity threshold.
            source_type: Optional filter by source type.
        
        Returns:
            List of dicts with title, url, content, similarity score.
        """
        if source_type:
            return await self.pool.fetch("""
                SELECT title, url, content, source_type,
                       1 - (embedding <=> $1::vector(4096)) AS similarity
                FROM research_corpus
                WHERE source_type = $4
                  AND 1 - (embedding <=> $1::vector(4096)) > $2
                ORDER BY embedding <=> $1::vector(4096)
                LIMIT $3
            """, embedding, min_score, limit, source_type)
        
        return await self.pool.fetch("""
            SELECT title, url, content, source_type,
                   1 - (embedding <=> $1::vector(4096)) AS similarity
            FROM research_corpus
            WHERE 1 - (embedding <=> $1::vector(4096)) > $2
            ORDER BY embedding <=> $1::vector(4096)
            LIMIT $3
        """, embedding, min_score, limit)
    
    async def hybrid_search(
        self,
        query: str,
        embedding: list[float],
        limit: int = 20,
        semantic_weight: float = 0.7,
    ) -> list[dict]:
        """Combine semantic + full-text search for best recall.
        
        Runs both searches in parallel and merges results using
        reciprocal rank fusion (RRF).
        """
        semantic_results = await self.semantic_search(embedding, limit=limit * 2)
        
        keyword_results = await self.pool.fetch("""
            SELECT title, url, content, source_type,
                   ts_rank(to_tsvector('english', content), 
                           plainto_tsquery('english', $1)) AS rank
            FROM research_corpus
            WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $1)
            ORDER BY rank DESC
            LIMIT $2
        """, query, limit * 2)
        
        return self._rrf_merge(semantic_results, keyword_results, limit, semantic_weight)
    
    def _rrf_merge(self, semantic, keyword, limit, semantic_weight):
        """Reciprocal Rank Fusion to merge two result lists."""
        scores = {}
        k = 60  # RRF constant
        
        for rank, r in enumerate(semantic):
            url = r['url']
            scores[url] = scores.get(url, {"result": dict(r), "score": 0})
            scores[url]["score"] += semantic_weight * (1 / (k + rank))
        
        for rank, r in enumerate(keyword):
            url = r['url']
            scores[url] = scores.get(url, {"result": dict(r), "score": 0})
            scores[url]["score"] += (1 - semantic_weight) * (1 / (k + rank))
        
        ranked = sorted(scores.values(), key=lambda x: x["score"], reverse=True)
        return [item["result"] for item in ranked[:limit]]
    
    async def get_stats(self) -> dict:
        """Get memory statistics for monitoring."""
        row = await self.pool.fetchrow("""
            SELECT 
                COUNT(*) as total_documents,
                COUNT(DISTINCT source_type) as source_types,
                MIN(created_at) as oldest,
                MAX(created_at) as newest,
                pg_size_pretty(pg_total_relation_size('research_corpus')) as table_size
            FROM research_corpus
        """)
        return dict(row)
```

---

## Code: Memory-First Search Pipeline

Check local memory before hitting Valyu APIs. This reduces costs and latency for repeated or similar queries.

```python
async def memory_first_search(
    query: str,
    context: str = "general",
    max_results: int = 15,
    memory_threshold: float = 0.8,
) -> list[dict]:
    """Search local memory first, fall back to Valyu if insufficient.
    
    Strategy:
    1. Embed the query
    2. Check research memory for high-similarity results
    3. If enough high-quality results exist, return them
    4. Otherwise, search Valyu and store new results in memory
    
    Args:
        query: Search query.
        context: Business context for routing.
        max_results: Target number of results.
        memory_threshold: Min similarity to consider a memory hit.
    """
    memory = await get_research_memory()
    embedding = await generate_embedding(query)
    
    # Step 1: Check memory
    cached = await memory.semantic_search(
        embedding=embedding,
        limit=max_results,
        min_score=memory_threshold,
    )
    
    if len(cached) >= max_results * 0.7:  # 70% fill rate = good enough
        return [dict(r) for r in cached]
    
    # Step 2: Search Valyu for fresh results
    config = SearchRouter.route(context)
    valyu = Valyu(api_key=await get_api_key("valyu"))
    
    response = valyu.search(
        query=query,
        max_num_results=max_results,
        relevance_threshold=0.6,
        **config
    )
    
    # Step 3: Store new results in memory
    if response.success:
        for r in response.results:
            result_embedding = await generate_embedding(r.content[:2000])
            await memory.store_result(
                query=query,
                result={
                    "title": r.title,
                    "url": r.url,
                    "content": r.content,
                    "source_type": r.source_type,
                    "relevance_score": r.relevance_score,
                },
                embedding=result_embedding,
            )
    
    # Step 4: Merge cached + fresh, deduplicated
    fresh = [{
        "title": r.title, "url": r.url, "content": r.content,
        "source_type": r.source_type, "similarity": r.relevance_score,
    } for r in (response.results if response.success else [])]
    
    all_results = {r["url"]: r for r in [*[dict(c) for c in cached], *fresh]}
    return list(all_results.values())[:max_results]
```

---

## Files Modified

| File | Change |
|------|--------|
| `docker-compose.yml` | Add Postgres 18 + pgvector service |
| `migrations/001_research_memory.sql` | **New** — Schema + indexes |
| `lib/research_memory.py` | **New** — ResearchMemory class |
| `lib/deep_research_valyu.py` | **New** — DeepResearch launcher + webhook handler |
| `pipeline_worker.py` | Replace 5-step pipeline with DeepResearch + memory-first search |
| `api/webhooks/valyu.py` | **New** — Webhook endpoint for DeepResearch callbacks |
| `api/routers/search.py` | Add memory-first search option |

---

## Migration Checklist

- [ ] Options 1 and 2 completed
- [ ] Deploy Postgres 18 + pgvector (docker-compose or managed)
- [ ] Run schema migration `001_research_memory.sql`
- [ ] Implement ResearchMemory class
- [ ] Implement DeepResearch launcher function
- [ ] Set up webhook endpoint and verify Valyu can reach it
- [ ] Implement polling fallback for webhook failures
- [ ] Implement memory-first search pipeline
- [ ] Set up embedding generation (Qwen3 4096D)
- [ ] Migrate existing research results into memory (backfill)
- [ ] Test DeepResearch with each depth level
- [ ] Monitor memory table growth and index performance
- [ ] Set up memory stats dashboard

---

## Expected Outcome

| Metric | Before (Option 2) | After (Option 3) |
|--------|-------------------|-------------------|
| Deep research pipeline | 5 custom steps, fragile | Single API call + webhook |
| Research persistence | None (ephemeral) | pgvector, accumulates over time |
| Repeat query cost | Full API cost every time | Free if in memory |
| Research latency (cached) | 10-30s | <500ms |
| Research latency (fresh) | 10-30s | 30-120s (deeper, but better quality) |
| Cross-query learning | None | Semantic similarity surfaces related past research |
