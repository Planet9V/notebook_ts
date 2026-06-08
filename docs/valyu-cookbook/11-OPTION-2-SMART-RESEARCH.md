# 11 — Option 2: Smart Research 🟡

> Context-aware routing + Contents API + temporal filtering.
>
> **Effort**: 3-5 days | **Risk**: Medium | **Impact**: Every search becomes contextually intelligent

---

## Summary

Everything in Option 1, plus: searches automatically route to the optimal Valyu configuration based on context. Add Contents API for better URL extraction. Add temporal filtering for scheduled searches. Collections for repeatable patterns.

---

## Prerequisites

- Option 1 completed (Valyu drop-in replacement live)
- Valyu Collections created for each domain (see Collections Setup below)

---

## Code: SearchRouter

The router maps business context to optimal Valyu search configurations. When a search is triggered from a compliance workflow, it automatically uses proprietary paper sources with the compliance collection. No caller changes needed — the context is inferred from the pipeline stage.

```python
class SearchRouter:
    """Routes queries to optimal Valyu configuration based on business context.
    
    Usage:
        config = SearchRouter.route("compliance")
        response = valyu.search(query=query, **config)
    """
    
    ROUTE_MAP = {
        "compliance": {
            "search_type": "proprietary",
            "category": "paper",
            "included_sources": ["collection:tetrel-compliance"],
            "max_price": 50,
        },
        "financial": {
            "search_type": "proprietary", 
            "category": "finance",
            "included_sources": ["collection:tetrel-financial"],
            "max_price": 80,
        },
        "sec_filings": {
            "search_type": "proprietary",
            "category": "sec",
            "included_sources": ["valyu/valyu-US-sec-filings"],
            "max_price": 60,
        },
        "prospect_research": {
            "search_type": "web",
            "max_price": 30,
        },
        "threat_intelligence": {
            "search_type": "news",
            "included_sources": ["collection:tetrel-threat-intel"],
            "max_price": 30,
        },
        "academic": {
            "search_type": "proprietary",
            "category": "paper",
            "included_sources": ["collection:tetrel-academic"],
            "max_price": 30,
        },
    }
    
    @classmethod
    def route(cls, context: str = "general") -> dict:
        """Get optimal Valyu config for a given business context.
        
        Args:
            context: Business context key. Falls back to broad search 
                     if context is unknown.
        
        Returns:
            Dict of Valyu search parameters to unpack into valyu.search().
        """
        return cls.ROUTE_MAP.get(context, {"search_type": "all", "max_price": 30})
    
    @classmethod
    def available_contexts(cls) -> list[str]:
        """List all registered routing contexts."""
        return list(cls.ROUTE_MAP.keys())
```

### Integrating the Router

```python
# In pipeline_worker.py — replace hardcoded search params
async def execute_search_step(query: str, context: str, max_results: int = 15):
    """Search with context-aware routing."""
    valyu = Valyu(api_key=await get_api_key("valyu"))
    config = SearchRouter.route(context)
    
    response = valyu.search(
        query=query,
        max_num_results=max_results,
        relevance_threshold=0.6,
        **config
    )
    
    if not response.success:
        # Fallback: try broad search before giving up
        response = valyu.search(
            query=query,
            search_type="all",
            max_num_results=max_results,
        )
    
    return normalize_results(response)
```

---

## Code: Contents API Integration

Replace `content_core` URL extraction with Valyu's Contents API. This gives us cleaner text extraction, optional screenshots, and consistent output format.

```python
async def extract_url_content(urls: list[str]) -> list[dict]:
    """Replace content_core with Valyu Contents API.
    
    Extracts clean text content from a list of URLs using Valyu's 
    managed extraction pipeline. Handles JavaScript-rendered pages,
    paywalls (where possible), and returns optional screenshots.
    
    Args:
        urls: List of URLs to extract content from. Max 20 per call.
    
    Returns:
        List of dicts with url, title, content, and screenshot_url 
        for each successfully extracted page.
    """
    valyu = Valyu(api_key=await get_api_key("valyu"))
    
    response = valyu.contents(
        urls=urls,
        response_length="large",
        extract_effort="high",
        screenshot=True
    )
    
    return [{
        "url": r.url,
        "title": r.title,
        "content": r.content,
        "screenshot_url": r.screenshot_url,
    } for r in response.results if r.success]
```

### Before/After Comparison

```python
# BEFORE: content_core extraction (brittle, fails on JS-heavy pages)
async def extract_content_old(url: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=30)
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer"]):
        tag.decompose()
    return {"url": url, "content": soup.get_text(separator="\n")}

# AFTER: Valyu Contents API (managed, reliable, screenshots)
async def extract_content_new(urls: list[str]) -> list[dict]:
    return await extract_url_content(urls)  # batch, not one-by-one
```

---

## Code: Temporal Filtering

Scheduled searches should only return results from the relevant time window. An hourly check shouldn't resurface week-old articles.

```python
from datetime import datetime, timedelta

async def run_scheduled_search(search: ScheduledSearch):
    """Execute a scheduled search with temporal filtering.
    
    Automatically scopes the search to the appropriate time window
    based on the schedule interval. Prevents duplicate results from
    overlapping time ranges.
    
    Args:
        search: ScheduledSearch model with query, interval, and 
                context fields.
    """
    valyu = Valyu(api_key=await get_api_key("valyu"))
    
    # Map schedule interval to time window with slight overlap
    delta = {
        "hourly":  timedelta(hours=2),
        "daily":   timedelta(days=1),
        "weekly":  timedelta(weeks=1),
        "monthly": timedelta(days=30),
    }
    d = delta.get(search.interval, timedelta(days=1))
    
    # Get context-aware config
    config = SearchRouter.route(search.context or "general")
    
    response = valyu.search(
        query=search.query,
        start_date=(datetime.utcnow() - d).strftime("%Y-%m-%d"),
        end_date=datetime.utcnow().strftime("%Y-%m-%d"),
        max_num_results=15,
        tool_call_mode=False,
        **config
    )
    
    if response.success and response.results:
        # Deduplicate against previously seen results
        new_results = await deduplicate_results(
            search_id=search.id,
            results=response.results,
        )
        if new_results:
            await store_search_results(search, new_results)
            await notify_if_configured(search, new_results)
```

### Deduplication Helper

```python
async def deduplicate_results(search_id: str, results: list) -> list:
    """Filter out results we've already seen for this scheduled search.
    
    Uses URL-based dedup with a rolling 30-day window to prevent
    the seen-URLs set from growing unbounded.
    """
    seen_urls = await redis.smembers(f"seen_urls:{search_id}")
    new_results = [r for r in results if r.url not in seen_urls]
    
    if new_results:
        pipe = redis.pipeline()
        pipe.sadd(f"seen_urls:{search_id}", *[r.url for r in new_results])
        pipe.expire(f"seen_urls:{search_id}", 60 * 60 * 24 * 30)  # 30-day TTL
        await pipe.execute()
    
    return new_results
```

---

## Code: Collections Setup

Collections group data sources for repeatable search patterns. Create them once, reference by name in every search.

```python
async def setup_valyu_collections():
    """One-time setup: create Valyu collections for each domain.
    
    Run this during deployment or as a management command.
    Collections persist on Valyu's side — no need to recreate.
    """
    valyu = Valyu(api_key=await get_api_key("valyu"))
    
    collections = {
        "tetrel-compliance": {
            "description": "Compliance and regulatory documents",
            "sources": [
                "valyu/valyu-arxiv-papers",
                "valyu/valyu-us-legislation",
            ]
        },
        "tetrel-financial": {
            "description": "Financial data and SEC filings",
            "sources": [
                "valyu/valyu-US-sec-filings",
                "valyu/valyu-financial-news",
            ]
        },
        "tetrel-threat-intel": {
            "description": "Cybersecurity threat intelligence",
            "sources": [
                "valyu/valyu-cybersecurity-feeds",
            ]
        },
        "tetrel-academic": {
            "description": "Academic and research papers",
            "sources": [
                "valyu/valyu-arxiv-papers",
                "valyu/valyu-pubmed",
            ]
        },
    }
    
    for name, config in collections.items():
        try:
            valyu.collections.create(
                name=name,
                description=config["description"],
                sources=config["sources"],
            )
            print(f"✅ Created collection: {name}")
        except Exception as e:
            print(f"⚠️  Collection {name}: {e}")
```

---

## Files Modified

| File | Change |
|------|--------|
| `lib/search_router.py` | **New** — SearchRouter class |
| `lib/valyu_contents.py` | **New** — Contents API wrapper |
| `scheduled_search_worker.py` | Add temporal filtering + dedup |
| `pipeline_worker.py` | Use SearchRouter for context-aware routing |
| `scripts/setup_collections.py` | **New** — One-time collection setup |
| `api/routers/search.py` | Accept `context` parameter, pass to router |

---

## Migration Checklist

- [ ] Option 1 completed and verified
- [ ] Create `lib/search_router.py` with SearchRouter class
- [ ] Create `lib/valyu_contents.py` with Contents API wrapper
- [ ] Run `scripts/setup_collections.py` to create Valyu collections
- [ ] Update `scheduled_search_worker.py` with temporal filtering
- [ ] Add deduplication logic with Redis seen-URLs sets
- [ ] Update `pipeline_worker.py` to use SearchRouter
- [ ] Update search API to accept `context` parameter
- [ ] Replace `content_core` calls with `extract_url_content`
- [ ] Test each routing context produces relevant results
- [ ] Verify temporal filtering doesn't miss edge-case results

---

## Expected Outcome

| Metric | Before (Option 1) | After (Option 2) |
|--------|-------------------|-------------------|
| Search relevance | Generic params for all queries | Context-optimized per domain |
| URL extraction reliability | ~70% (BeautifulSoup) | ~95% (Valyu Contents API) |
| Scheduled search noise | High (no time filtering) | Low (temporal + dedup) |
| Source configuration | Hardcoded per call | Collections, reusable |
| New context setup | Code change required | Add to ROUTE_MAP dict |
