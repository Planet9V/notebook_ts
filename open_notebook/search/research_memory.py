import os

import asyncpg
from loguru import logger


class ResearchMemory:
    """Persistent research memory backed by Postgres + pgvector.

    Stores search results with embeddings for semantic retrieval.
    Acts as a cache layer: check memory before hitting external APIs.
    """

    _pool: asyncpg.Pool | None = None

    @classmethod
    async def get_pool(cls) -> asyncpg.Pool:
        """Get or create the connection pool."""
        if cls._pool is None:
            dsn = os.environ.get(
                "POSTGRES_DSN",
                "postgresql://tetrel:tetrel_dev@localhost:5433/tetrel_research",
            )
            cls._pool = await asyncpg.create_pool(dsn, min_size=2, max_size=10)
            logger.info("Research memory pool created")
        return cls._pool

    @classmethod
    async def store_result(
        cls,
        query: str,
        result: dict,
        embedding: list[float] | None = None,
    ):
        """Store a search result with optional embedding.

        Uses INSERT with ON CONFLICT DO NOTHING to avoid duplicates.
        """
        pool = await cls.get_pool()
        await pool.execute(
            """
            INSERT INTO research_corpus
                (query, title, url, content, source_type, relevance_score, embedding, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7::vector, NOW())
            ON CONFLICT DO NOTHING
            """,
            query,
            result.get("title", ""),
            result.get("url", ""),
            result.get("content", ""),
            result.get("source_type", "web"),
            result.get("relevance_score", 0.0),
            str(embedding) if embedding else None,
        )

    @classmethod
    async def semantic_search(
        cls,
        embedding: list[float],
        limit: int = 20,
        min_score: float = 0.7,
        source_type: str | None = None,
    ) -> list[dict]:
        """Find semantically similar results using cosine similarity."""
        pool = await cls.get_pool()
        if source_type:
            rows = await pool.fetch(
                """
                SELECT id, query, title, url, content, source_type,
                       1 - (embedding <=> $1::vector) AS similarity,
                       created_at
                FROM research_corpus
                WHERE source_type = $4 AND embedding IS NOT NULL
                  AND 1 - (embedding <=> $1::vector) > $2
                ORDER BY embedding <=> $1::vector
                LIMIT $3
                """,
                str(embedding),
                min_score,
                limit,
                source_type,
            )
        else:
            rows = await pool.fetch(
                """
                SELECT id, query, title, url, content, source_type,
                       1 - (embedding <=> $1::vector) AS similarity,
                       created_at
                FROM research_corpus
                WHERE embedding IS NOT NULL
                  AND 1 - (embedding <=> $1::vector) > $2
                ORDER BY embedding <=> $1::vector
                LIMIT $3
                """,
                str(embedding),
                min_score,
                limit,
            )
        return [dict(r) for r in rows]

    @classmethod
    async def keyword_search(cls, query: str, limit: int = 20) -> list[dict]:
        """Full-text keyword search fallback."""
        pool = await cls.get_pool()
        rows = await pool.fetch(
            """
            SELECT id, query, title, url, content, source_type,
                   ts_rank(
                       to_tsvector('english', content),
                       plainto_tsquery('english', $1)
                   ) AS rank,
                   created_at
            FROM research_corpus
            WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $1)
            ORDER BY rank DESC
            LIMIT $2
            """,
            query,
            limit,
        )
        return [dict(r) for r in rows]

    @classmethod
    async def browse(
        cls,
        page: int = 1,
        limit: int = 20,
        source_type: str | None = None,
    ) -> dict:
        """Browse stored research with pagination."""
        pool = await cls.get_pool()
        offset = (page - 1) * limit

        if source_type:
            rows = await pool.fetch(
                """
                SELECT id, query, title, url, content, source_type,
                       relevance_score, created_at
                FROM research_corpus
                WHERE source_type = $3
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
                """,
                limit,
                offset,
                source_type,
            )
            total = await pool.fetchval(
                "SELECT COUNT(*) FROM research_corpus WHERE source_type = $1",
                source_type,
            )
        else:
            rows = await pool.fetch(
                """
                SELECT id, query, title, url, content, source_type,
                       relevance_score, created_at
                FROM research_corpus
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
                """,
                limit,
                offset,
            )
            total = await pool.fetchval("SELECT COUNT(*) FROM research_corpus")

        return {"results": [dict(r) for r in rows], "total": total, "page": page}

    @classmethod
    async def get_stats(cls) -> dict:
        """Get memory statistics."""
        pool = await cls.get_pool()
        row = await pool.fetchrow(
            """
            SELECT
                COUNT(*) AS total_documents,
                COUNT(DISTINCT source_type) AS source_type_count,
                MIN(created_at) AS oldest,
                MAX(created_at) AS newest,
                pg_size_pretty(pg_total_relation_size('research_corpus')) AS table_size
            FROM research_corpus
            """
        )

        source_types = await pool.fetch(
            """
            SELECT source_type, COUNT(*) AS count
            FROM research_corpus
            GROUP BY source_type
            ORDER BY count DESC
            """
        )

        return {
            "total_documents": row["total_documents"],
            "source_types": {r["source_type"]: r["count"] for r in source_types},
            "oldest": row["oldest"].isoformat() if row["oldest"] else None,
            "newest": row["newest"].isoformat() if row["newest"] else None,
            "table_size": row["table_size"],
        }

    @classmethod
    async def close(cls):
        """Close the connection pool."""
        if cls._pool:
            await cls._pool.close()
            cls._pool = None
