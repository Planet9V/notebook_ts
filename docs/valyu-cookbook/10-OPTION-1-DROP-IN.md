# 10 — Option 1: Drop-In Replacement 🟢

> Replace 4 redundant APIs with Valyu. Minimal code changes. Maximum cost savings.
>
> **Effort**: 1-2 days | **Risk**: Low | **Impact**: -$50/mo in API costs

---

## Summary

Kill Tavily, NewsAPI, Google Scholar (SerpAPI), and DuckDuckGo. Replace with Valyu search. Keep Brave as emergency fallback. Keep our 5-step deep research, transformation system, and LangGraph pipelines unchanged.

## What Changes

| Before | After |
|--------|-------|
| Tavily for web search | `valyu.search(search_type="web")` |
| NewsAPI for news | `valyu.search(search_type="news")` |
| Google Scholar via SerpAPI | `valyu.search(search_type="proprietary", category="paper")` |
| DuckDuckGo HTML scrape | Removed |
| Perplexity for synthesis | Valyu Answer API |
| Brave as fallback | Keep as emergency fallback |

---

## Code: Unified Search Function

This single function replaces five separate API integrations. The `engine_mode` parameter maps our existing internal engine names to Valyu's search configuration, so callers don't need to change.

```python
from valyu import Valyu

async def run_valyu_search(query: str, engine_mode: str, max_results: int = 10):
    """Unified Valyu search replacing 5 separate APIs.
    
    Args:
        query: Search query string.
        engine_mode: One of "valyu", "valyu_web", "valyu_news", 
                     "valyu_academic", "valyu_financial", "valyu_sec".
        max_results: Maximum number of results to return.
    
    Returns:
        List of normalized search result dicts with title, url, 
        content, score, and source fields.
    
    Raises:
        Exception: If the Valyu API returns an error response.
    """
    valyu = Valyu(api_key=await get_api_key("valyu"))
    
    config = {
        "valyu":          {"search_type": "all"},
        "valyu_web":      {"search_type": "web"},
        "valyu_news":     {"search_type": "news"},
        "valyu_academic": {"search_type": "proprietary", "category": "paper"},
        "valyu_financial":{"search_type": "proprietary", "category": "finance"},
        "valyu_sec":      {"search_type": "proprietary", "category": "sec"},
    }.get(engine_mode, {"search_type": "all"})
    
    response = valyu.search(
        query=query,
        max_num_results=max_results,
        relevance_threshold=0.6,
        max_price=50,
        **config
    )
    
    if not response.success:
        raise Exception(f"Valyu search failed: {response.error}")
    
    return [{
        "title": r.title,
        "url": r.url,
        "content": r.content,
        "score": r.relevance_score,
        "source": f"valyu_{r.source_type}"
    } for r in response.results]
```

---

## How It Plugs In

The existing codebase dispatches searches through engine mode strings. We replace each old engine's handler with a call to `run_valyu_search`, keeping the same interface:

```python
# Before (in scheduled_search_worker.py)
if engine == "tavily":
    results = await run_tavily_search(query, max_results)
elif engine == "newsapi":
    results = await run_newsapi_search(query, max_results)
elif engine == "google_scholar":
    results = await run_serpapi_scholar(query, max_results)
elif engine == "duckduckgo":
    results = await run_duckduckgo_search(query, max_results)

# After
if engine in ("valyu", "valyu_web", "valyu_news", "valyu_academic",
              "valyu_financial", "valyu_sec"):
    results = await run_valyu_search(query, engine, max_results)
elif engine == "brave":
    results = await run_brave_search(query, max_results)  # keep as fallback
```

---

## Files Modified

| File | Change |
|------|--------|
| `requirements.txt` | Add `valyu>=1.0.0` |
| `scheduled_search_worker.py` | Replace engine dispatcher — swap Tavily/NewsAPI/SerpAPI/DDG branches with single Valyu branch |
| `pipeline_worker.py` | Replace cascading fallback — remove 4-engine waterfall, use Valyu with Brave fallback |
| `api/routers/search.py` | Update hybrid search — route `engine_mode` to Valyu config |
| `.env` | Add `VALYU_API_KEY`, remove `TAVILY_API_KEY`, `NEWSAPI_KEY`, `SERPAPI_KEY` |

---

## What Gets Removed

- **Tavily HTTP calls + API key** — `run_tavily_search()` function, `TAVILY_API_KEY` env var
- **NewsAPI HTTP calls + API key** — `run_newsapi_search()` function, `NEWSAPI_KEY` env var
- **SerpAPI (Google Scholar) HTTP calls + API key** — `run_serpapi_scholar()` function, `SERPAPI_KEY` env var
- **DuckDuckGo HTML scraping code** — `run_duckduckgo_search()` function, BeautifulSoup parsing
- **4 separate error handling paths** — Each API had its own retry logic, rate limiting, and error normalization. Valyu consolidates to one.

---

## What Stays the Same

- **5-step deep research pipeline** — Unchanged. Still runs question decomposition → search → extract → synthesize → format.
- **Transformation system** — Podcast, executive brief, LinkedIn post generation untouched.
- **LangGraph orchestration** — Graph nodes call the same interface, just a different backend.
- **Brave fallback** — Kept as emergency fallback if Valyu is down.
- **Result normalization** — `run_valyu_search` returns the same `{title, url, content, score, source}` shape as existing handlers.

---

## Migration Checklist

- [ ] Add `valyu>=1.0.0` to `requirements.txt`
- [ ] Add `VALYU_API_KEY` to `.env` and deployment secrets
- [ ] Implement `run_valyu_search()` function
- [ ] Update `scheduled_search_worker.py` dispatcher
- [ ] Update `pipeline_worker.py` fallback chain
- [ ] Update `api/routers/search.py` engine routing
- [ ] Remove Tavily, NewsAPI, SerpAPI, DuckDuckGo code
- [ ] Remove unused API keys from `.env` and secrets manager
- [ ] Run existing search tests against Valyu
- [ ] Monitor cost dashboard for 1 week

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| API keys managed | 5 (Tavily, NewsAPI, SerpAPI, DDG, Brave) | 2 (Valyu, Brave) |
| Monthly API cost | ~$80 | ~$30 |
| Error handling paths | 5 separate | 1 unified + 1 fallback |
| Lines of search code | ~400 | ~80 |
| Search latency (p50) | Varies by provider | Single provider, consistent |
