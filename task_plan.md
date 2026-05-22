# Task Plan: Deep Integration of Sales Prospecting Automation Engine with Sources & RAG

## Goal
Enable deep integration of stage-triggered sales prospecting automation in Tetrel Notebook so that crawler and search results are created as first-class `Source` records in SurrealDB, automatically vectorized and chunked via the async command pipeline to immediately expand RAG chat context, alongside the structured LLM-generated intelligence `Note`.

## Current Phase
Phase 2: Design & Planning

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand user intent (create Sources for crawled/searched data, automate prospect research at each stage, keep it highly flexible for custom prompts and models)
- [x] Review current implementation (PipelineRule domain models, FastAPI background worker tasks, API rules endpoints, Next.js Settings UI, tests)
- [x] Identify gap: Crawler and searcher in `pipeline_worker.py` only save LLM summaries as `Note` records, losing the raw crawled webpage and search results from the `Source` list and from the SurrealDB vector database used by the RAG chat sessions.
- [x] Document discoveries in `findings.md`
- **Status:** complete

### Phase 2: Design & Planning
- [/] Define the exact integration mechanism:
  - For `crawl` rules: Save raw text scraped from the prospect's public website as a new `Source` in the database, add it to the notebook, and trigger asynchronous vectorization via `source.vectorize()`.
  - For `search` rules: Save the compiled search results (titles, snippets, URLs) as a new `Source` in the database, add it to the notebook, and trigger asynchronous vectorization via `source.vectorize()`.
  - In both cases: Feed the compiled text/insights into the specified LLM (using chosen prompt & model override) to generate the structured intelligence `Note`, save it, and add it to the notebook (triggering `embed_note`).
- [/] Update `findings.md` with technical design and model/prompt configurations.
- **Status:** in_progress

### Phase 3: Implementation
- [x] Modify `open_notebook/domain/pipeline_worker.py` to implement the dual `Source` and `Note` creation pathway. (Already implemented in pipeline_worker.py)
- [ ] Patch `Source` and `Asset` in `tests/test_pipeline.py` inside `test_run_pipeline_automation_crawl` to prevent hit to SurrealDB.
- [ ] Add assertions to `test_run_pipeline_automation_crawl` verifying `Source` creation, save, and vectorization.
- [ ] Add a new test `test_run_pipeline_automation_search` to verify `Source` creation, search query execution, and note generation for web search pipeline rules.
- - **Status:** in_progress

### Phase 4: Testing & Verification
- [ ] Run backend tests using `pytest tests/test_pipeline.py` and ensure they pass successfully.
- [ ] Run frontend/backend build/linters to ensure compile correctness.
- - **Status:** pending

### Phase 5: Handoff & Delivery
- [ ] Update `progress.md` with the final logs and session validation.
- [ ] Summarize changes and hand over the refined system to the user.
- - **Status:** pending

## Key Questions
1. **Should the raw crawler / searcher data be saved as first-class `Source` records?**
   - *Yes*, this makes crawled webpages and search snippets searchable by the notebook's RAG chat, making the chatbot vastly more intelligent.
2. **How do we link the newly created `Source` to the notebook?**
   - By calling `await source.add_to_notebook(notebook_id)`, which inserts a `reference` edge between `source` and `notebook`.
3. **How do we trigger vectorization on the new `Source`?**
   - By calling `await source.vectorize()`, which schedules the background `embed_source` command in the SurrealDB command pipeline.

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Dual-creation pathway (`Source` + `Note`) | Storing the raw scraped webpage / web search results as a `Source` ensures complete RAG context coverage, while storing the refined analysis as a `Note` provides immediate reading value for the sales representative. |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `socket.gaierror: [Errno 8] nodename nor servname provided` | 1 | Unit tests hit real database connections because `Source` and `Asset` were not patched in `test_run_pipeline_automation_crawl`. Patch both classes to mock out database operations. |
