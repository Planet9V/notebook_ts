CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS research_corpus (
    id              BIGSERIAL PRIMARY KEY,
    query           TEXT NOT NULL,
    title           TEXT NOT NULL,
    url             TEXT DEFAULT '',
    content         TEXT NOT NULL,
    source_type     TEXT NOT NULL DEFAULT 'web',
    relevance_score FLOAT DEFAULT 0.0,
    embedding       vector(1536),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_embedding 
    ON research_corpus USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_research_source_type 
    ON research_corpus (source_type);

CREATE INDEX IF NOT EXISTS idx_research_content_fts 
    ON research_corpus 
    USING gin (to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_research_created_at 
    ON research_corpus (created_at DESC);

-- Unique index on query and URL for non-empty URLs to prevent duplicate search results
CREATE UNIQUE INDEX IF NOT EXISTS idx_research_query_url 
    ON research_corpus (query, url) 
    WHERE url IS NOT NULL AND url != '';

-- Unique index on query and content hash for empty-url sources to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_research_query_content_hash 
    ON research_corpus (query, md5(content)) 
    WHERE url IS NULL OR url = '';

