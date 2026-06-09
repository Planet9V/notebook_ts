import os
from typing import Any, List, Optional

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
            pool = await asyncpg.create_pool(dsn, min_size=2, max_size=10)
            await cls._init_db(pool)
            cls._pool = pool
            logger.info("Research memory pool created and initialized")
        return cls._pool

    @classmethod
    async def _init_db(cls, pool: asyncpg.Pool):
        """Initialize Postgres tables and indexes if they don't exist."""
        async with pool.acquire() as conn:
            # Create provenance table
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS provenance (
                    id              SERIAL PRIMARY KEY,
                    customer_id     VARCHAR(255) NOT NULL,
                    location_id     VARCHAR(255),
                    category        VARCHAR(255),
                    file_name       VARCHAR(255) NOT NULL,
                    file_hash       VARCHAR(64) UNIQUE NOT NULL,
                    file_data       BYTEA NOT NULL,
                    description     TEXT,
                    apa_citation    TEXT,
                    metadata        JSONB DEFAULT '{}',
                    created_at      TIMESTAMPTZ DEFAULT NOW()
                );
                """
            )
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_provenance_customer ON provenance(customer_id);")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_provenance_location ON provenance(location_id);")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_provenance_category ON provenance(category);")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_provenance_hash ON provenance(file_hash);")
            logger.info("Postgres provenance table initialized")

    @classmethod
    async def store_provenance_record(
        cls,
        customer_id: str,
        location_id: Optional[str],
        category: Optional[str],
        file_name: str,
        file_hash: str,
        file_data: bytes,
        description: Optional[str] = None,
        apa_citation: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> int:
        """Store a new provenance record and return its ID. If hash conflicts, returns the existing record's ID."""
        import json
        pool = await cls.get_pool()
        # Check conflict first
        existing_id = await pool.fetchval(
            "SELECT id FROM provenance WHERE file_hash = $1", file_hash
        )
        if existing_id:
            logger.info(f"Provenance record with hash {file_hash} already exists with ID {existing_id}")
            return existing_id

        # Insert new
        val = await pool.fetchval(
            """
            INSERT INTO provenance 
                (customer_id, location_id, category, file_name, file_hash, file_data, description, apa_citation, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING id
            """,
            customer_id,
            location_id,
            category,
            file_name,
            file_hash,
            file_data,
            description,
            apa_citation,
            json.dumps(metadata) if metadata else '{}',
        )
        logger.info(f"Stored provenance record for {file_name} with ID {val}")
        return val

    @classmethod
    async def get_provenance_by_id(cls, provenance_id: int) -> Optional[dict]:
        """Fetch provenance metadata by ID."""
        pool = await cls.get_pool()
        row = await pool.fetchrow(
            """
            SELECT id, customer_id, location_id, category, file_name, file_hash, description, apa_citation, metadata, created_at
            FROM provenance
            WHERE id = $1
            """,
            provenance_id,
        )
        if row:
            res = dict(row)
            # Parse metadata JSON
            if isinstance(res.get("metadata"), str):
                try:
                    import json
                    res["metadata"] = json.loads(res["metadata"])
                except Exception:
                    pass
            return res
        return None

    @classmethod
    async def get_provenance_data(cls, provenance_id: int) -> Optional[bytes]:
        """Fetch the original file bytes by ID."""
        pool = await cls.get_pool()
        return await pool.fetchval(
            "SELECT file_data FROM provenance WHERE id = $1",
            provenance_id,
        )

    @classmethod
    async def list_provenance(
        cls,
        customer_id: Optional[str] = None,
        location_id: Optional[str] = None,
        category: Optional[str] = None,
    ) -> list[dict]:
        """List provenance metadata with optional filters."""
        pool = await cls.get_pool()
        query = """
            SELECT id, customer_id, location_id, category, file_name, file_hash, description, apa_citation, metadata, created_at
            FROM provenance
            WHERE 1=1
        """
        params = []
        param_idx = 1

        if customer_id:
            query += f" AND customer_id = ${param_idx}"
            params.append(customer_id)
            param_idx += 1
        if location_id:
            query += f" AND location_id = ${param_idx}"
            params.append(location_id)
            param_idx += 1
        if category:
            query += f" AND category = ${param_idx}"
            params.append(category)
            param_idx += 1

        query += " ORDER BY created_at DESC"
        rows = await pool.fetch(query, *params)
        
        results = []
        for r in rows:
            res = dict(r)
            if isinstance(res.get("metadata"), str):
                try:
                    import json
                    res["metadata"] = json.loads(res["metadata"])
                except Exception:
                    pass
            results.append(res)
        return results

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
