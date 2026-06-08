# Database Architecture & Data Layer Modeling

*Last Updated: June 8, 2026*

---

## 1. Hybrid Polyglot Persistence Architecture

Tetrel Notebook employs a **hybrid polyglot persistence model** that leverages the specific strengths of two distinct database technologies to optimize transactional document graphing and high-speed semantic search caching:

1.  **SurrealDB (v2):** Used for relational, document, and graph-like transactional data. It maintains user accounts, Kanban pipeline cards, notes, activity feeds, and system logs. SurrealDB’s graph modeling allows native relational edges (e.g. `person->writes->note`) and schemaless storage.
2.  **PostgreSQL (pg17 with pgvector):** Used for semantic vector search caching. PostgreSQL excels at high-dimensional vector index operations (HNSW) and standard GIN full-text indexing, providing a stable, high-speed cache layer for API search queries.

```
                           ┌───────────────────────────┐
                           │      API Data Router      │
                           └─────────────┬─────────────┘
                                         │
                  ┌──────────────────────┴──────────────────────┐
                  ▼                                             ▼
        ┌───────────────────┐                         ┌───────────────────┐
        │   SurrealDB v2    │                         │ PostgreSQL (pg17) │
        │ Document / Graph  │                         │  pgvector Cache   │
        ├───────────────────┤                         ├───────────────────┤
        │ - customer        │                         │ - research_corpus │
        │ - location        │                         │ - hnsw index      │
        │ - note            │                         │ - plain FTS index │
        │ - system_log      │                         └───────────────────┘
        │ - entity_note     │
        └───────────────────┘
```

---

## 2. SurrealDB Schemas & Graph Relations

SurrealDB migrations are stored in [open_notebook/database/migrations/](file:///Users/jimmcknney/notebook_tetrel/open_notebook/database/migrations) and executed sequentially. 

### 2.1 Transactional Document and Logging Tables
*   **`system_log` Table (Migration 45):** Modeled as `SCHEMALESS` to allow unstructured system-level logging from Loguru. It is optimized with secondary indexes on timestamp and level:
    ```sql
    DEFINE TABLE system_log SCHEMALESS;
    DEFINE INDEX idx_system_log_timestamp ON TABLE system_log COLUMNS timestamp;
    DEFINE INDEX idx_system_log_component ON TABLE system_log COLUMNS component;
    DEFINE INDEX idx_system_log_level ON TABLE system_log COLUMNS level;
    ```

### 2.2 Relational Graph Edge Table
*   **`entity_note` Edge Table (Migrations 43-44):** Links notes to target locations or customers. It is defined as a graph RELATION table:
    ```sql
    DEFINE TABLE entity_note TYPE RELATION FROM note TO location | customer;
    
    DEFINE INDEX idx_entity_note_out ON TABLE entity_note FIELDS out;
    DEFINE INDEX idx_entity_note_in ON TABLE entity_note FIELDS in;
    ```
*   **Concurrency Constraint (Migration 44):** To prevent duplicate edges when double-clicking or running parallel background tasks, a unique index is applied on both endpoints:
    ```sql
    DEFINE INDEX entity_note_unique_edge ON TABLE entity_note COLUMNS in, out UNIQUE;
    ```

---

## 3. PostgreSQL pgvector Schema

PostgreSQL serves as the fast semantic search cache. The initialization SQL is located in [postgres_init/001_research_memory.sql](file:///Users/jimmcknney/notebook_tetrel/postgres_init/001_research_memory.sql).

### 3.1 Research Corpus Table Model
```sql
CREATE TABLE IF NOT EXISTS research_corpus (
    id              BIGSERIAL PRIMARY KEY,
    query           TEXT NOT NULL,
    title           TEXT NOT NULL,
    url             TEXT DEFAULT '',
    content         TEXT NOT NULL,
    source_type     TEXT NOT NULL DEFAULT 'web',
    relevance_score FLOAT DEFAULT 0.0,
    embedding       vector(1536), -- 1536 dimensions (OpenAI / Cohere compatible)
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Indexing Strategy
To guarantee fast execution on large datasets, the table is indexed for both vector similarity and keyword search:

1.  **HNSW Vector Index:** Speeds up cosine distance queries. Configured with a connection count of 16 and construction search parameter of 64:
    ```sql
    CREATE INDEX IF NOT EXISTS idx_research_embedding 
        ON research_corpus USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    ```
2.  **Full-Text GIN Index:** Indexing the document body for fallback keyword searches using English language stemming:
    ```sql
    CREATE INDEX IF NOT EXISTS idx_research_content_fts 
        ON research_corpus USING gin (to_tsvector('english', content));
    ```
3.  **Deduplication Constraints:**
    ```sql
    -- Prevent duplicate results for standard URLs
    CREATE UNIQUE INDEX IF NOT EXISTS idx_research_query_url 
        ON research_corpus (query, url) 
        WHERE url IS NOT NULL AND url != '';

    -- Prevent duplicates for text blocks without URLs by hashing the content
    CREATE UNIQUE INDEX IF NOT EXISTS idx_research_query_content_hash 
        ON research_corpus (query, md5(content)) 
        WHERE url IS NULL OR url = '';
    ```

---

## 4. Reciprocal Rank Fusion (RRF) Hybrid Search

When retrieving results from the cache, the API performs a hybrid ranking that combines semantic search (pgvector HNSW) and keyword search (GIN Full-Text). 

The mathematical scoring is calculated using the **Reciprocal Rank Fusion (RRF)** formula:

$$RRF(d) = \frac{1}{60 + r_{semantic}(d)} + \frac{1}{60 + r_{keyword}(d)}$$

where:
*   $r_{semantic}(d)$ is the position rank of document $d$ sorted by cosine distance (`embedding <=> $1`).
*   $r_{keyword}(d)$ is the position rank of document $d$ sorted by full-text rank (`ts_rank`).
*   $60$ is the standard smoothing constant (k) which prevents low-ranked items from disproportionately affecting the score.

### SQL Implementation Example:
```sql
WITH semantic_search AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) as rank
    FROM research_corpus
    WHERE embedding IS NOT NULL AND 1 - (embedding <=> $1::vector) > $2
    LIMIT $3
),
keyword_search AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', content), plainto_tsquery('english', $4)) DESC) as rank
    FROM research_corpus
    WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $4)
    LIMIT $3
)
SELECT rc.*, 
       COALESCE(1.0 / (60 + s.rank), 0.0) + COALESCE(1.0 / (60 + k.rank), 0.0) AS rrf_score
FROM research_corpus rc
LEFT JOIN semantic_search s ON rc.id = s.id
LEFT JOIN keyword_search k ON rc.id = k.id
WHERE s.id IS NOT NULL OR k.id IS NOT NULL
ORDER BY rrf_score DESC
LIMIT $3;
```
This query ensures that cached documents matching both the semantic intent and specific search keywords bubble to the top of the search console.
