# Findings & Decisions

## Requirements
- **Deep Integration with Sources**: Scrapes/searches must be saved as first-class `Source` records in SurrealDB, linked to the target notebook, and immediately vectorized (`source.vectorize()`) to expand the RAG chatbot's context.
- **Structured Note Generation**: Process scraped/searched context through the designated LLM (using the rule's specific prompt, query template, and model override) to generate a premium prospecting note/report (e.g. Technical SPEC sheet, Competitor sheet, Location sheet) saved as a `Note` of type `"ai"`.
- **Kanban Board & Visual Indicators**: The pipeline triggers asynchronously on stage transitions (moving deal cards). Pulse visual badges (`🔍 Researching...`) on cards while background crawlers/searchers run.
- **Highly Flexible Custom Prompts and Models**: Rules can override models and define custom templates and prompts for different pipeline stages (e.g. pre-sales prep, business news search, technical spec crawl).

## Research Findings
- The pipeline execution logic is contained in `open_notebook/domain/pipeline_worker.py`.
- Currently, the worker does the following:
  - Finds matching pipeline rules for the new stage.
  - Increment the `ACTIVE_SCANS[notebook_id]` counter (so the frontend Kanban board knows it is scanning).
  - Crawls URL using BeautifulSoup or queries Brave/Tavily/DuckDuckGo.
  - Summarizes the results using an LLM.
  - Saves the summary as a `Note` record and calls `await note.add_to_notebook(notebook_id)`.
  - Decrements the active scans count.
- Crucially, it **does not** create a `Source` record for the raw scraped webpage or search query. This means the RAG chat has no access to the complete text of the scraped page or search context, only to the compiled note.
- In `open_notebook/domain/notebook.py`, the `Source` class has a `vectorize()` method which submits an async `embed_source` background job in SurrealDB, and an `add_to_notebook(notebook_id)` method which links the source to the notebook via a `reference` edge.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Create `Source` for `crawl` | When a website is scraped, create a `Source` with `title=f"Scraped Webpage: {source_url}"` and `full_text=clean_text`, with `Asset(url=source_url)`. Link it to the notebook and run `await source.vectorize()`. |
| Create `Source` for `search` | When a web search is run, compile the top results into a formatted text block and create a `Source` with `title=f"Web Search: {query}"` and `full_text=search_context`. Link it to the notebook and run `await source.vectorize()`. |
| LLM summary generation | Continue passing the crawled text or search context to the LLM as before to populate a rich markdown summary `Note`. This note itself gets embedded via `embed_note` during its `.save()`, ensuring both the raw data and the high-level summary are fully vectorized. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| `socket.gaierror` during crawl test | The newly added `Source` and `Asset` model instantiation and `.save()` operations in `pipeline_worker.py` were not patched in `tests/test_pipeline.py`. This caused the unit test to attempt connecting to a real SurrealDB instance at the `surrealdb` hostname, resulting in network errors. Resolve this by patching `Source` and `Asset` in `tests/test_pipeline.py`. |

## Resources
- Domain classes: `open_notebook/domain/notebook.py`
- Pipeline worker: `open_notebook/domain/pipeline_worker.py`
- Pipeline rules router: `api/routers/pipeline.py`
- Pipeline tests: `tests/test_pipeline.py`

## CSET OT Network Canvas Integration
- **Interactive drawing canvas**: Built a gorgeous, responsive React Flow drawing canvas at `/notebooks` inside the B2B workspace. Mapped standard Purdue model swimlanes (Level 4, Level 3, Level 1-2) with visual backgrounds.
- **ELKjs Manhattan Routing**: Integrated ELKjs for obstacle-aware, right-angled Manhattan orthogonal line routing to avoid overlaps and mimic industrial standards.
- **FastAPI NetworkX Audits**: Connected the canvas to real-time backend zone validation using NetworkX. Direct zone bypasses (e.g. L1 to L4 without a firewall) trigger pulsating threat paths and dynamically flag compliance sidebar alerts.
- **Local Dev Server Status**: Cleanly started all services in local dev mode (`make start-all`):
  - **SurrealDB**: Running in Docker at port `8000`.
  - **API Backend**: Running at `http://localhost:5055`.
  - **Background Worker**: Running and listening to database command queues.
  - **Next.js Frontend**: Running via dev server at `http://localhost:3000`.

*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*
