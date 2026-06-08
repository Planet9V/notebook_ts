# 08 — Managing Context

> Token budgets, result lengths, and LLM context window optimization.

## The Context Problem

Every Valyu search result consumes LLM context window tokens. With 10 results at `"long"` length, you're looking at ~240k tokens — more than most model context windows. Managing this is critical for both cost and quality.

## Context Size Controls

### `results_length` Parameter

| Value | Chars/Result | Tokens/Result | 10 Results |
|-------|-------------|---------------|------------|
| `"short"` | ~25,000 | ~6,000 | ~60,000 |
| `"medium"` | ~50,000 | ~12,000 | ~120,000 |
| `"long"` | ~100,000 | ~24,000 | ~240,000 |
| `"max"` | unlimited | varies | varies |
| Custom int | exact chars | chars/4 | n * chars/4 |

### `max_num_results` Parameter

Controls how many results are returned (1-20, up to 100 with permissions).

### Combined Strategy

```python
# Light touch: Quick fact-check
light = valyu.search("...", max_num_results=3, results_length="short")
# ~18k tokens total

# Standard: Balanced research
standard = valyu.search("...", max_num_results=8, results_length="short")
# ~48k tokens total

# Deep: Comprehensive analysis
deep = valyu.search("...", max_num_results=15, results_length="medium")
# ~180k tokens total

# Maximum: Full extraction
maximum = valyu.search("...", max_num_results=20, results_length="long")
# ~480k tokens total (!)
```

## Application Context Budgets

Our application has different context needs per feature:

| Feature | Model Context | Budget | Config |
|---------|-------------|--------|--------|
| Ask Pipeline (per sub-query) | 8k-16k | Light | `results=5, length="short"` |
| Ask Pipeline (total, 5 queries) | 80k | Standard | 5 x 5 = 25 results @ short |
| Deep Research (gathering) | 128k | Deep | `results=15, length="medium"` |
| Scheduled Search (saved) | N/A (stored) | Standard | `results=8, length="short"` |
| Prospect Enrichment | 32k | Standard | `results=5, length="medium"` |
| Compliance Research | 128k | Deep | `results=10, length="medium"` |
| Pipeline Automation | 16k | Light | `results=5, length="short"` |

## Multi-Query Context Management

When running multiple searches (like our Ask pipeline), manage the total token budget:

```python
async def budget_aware_search(queries: list[str], total_budget_tokens: int = 80000):
    """Distribute token budget across multiple queries."""
    per_query_budget = total_budget_tokens // len(queries)
    results_per_query = min(per_query_budget // 6000, 10)  # 6k tokens per short result
    
    all_results = []
    for query in queries:
        response = valyu.search(
            query=query,
            max_num_results=results_per_query,
            results_length="short"
        )
        all_results.extend(response.results)
    
    return all_results
```

## `fast_mode` for Low-Latency Searches

Use `fast_mode=True` when you need quick results and can tolerate shorter content:

```python
# Interactive search suggestions (< 2 seconds)
quick = valyu.search(
    "cybersecurity compliance frameworks",
    max_num_results=3,
    fast_mode=True
)
```

Best for: search bar suggestions, real-time autocomplete, quick fact-checks.

## Context Compression Techniques

### 1. Truncate Before Sending to LLM
```python
def compress_results(results, max_chars_per_result=5000):
    return [{
        "title": r.title,
        "url": r.url,
        "content": r.content[:max_chars_per_result],
        "score": r.relevance_score
    } for r in results]
```

### 2. Filter by Relevance Score After Search
```python
def filter_results(results, min_score=0.7):
    return [r for r in results if r.relevance_score >= min_score]
```

### 3. Deduplicate Across Multiple Searches
```python
seen = set()
unique = []
for r in all_results:
    if r.url not in seen:
        seen.add(r.url)
        unique.append(r)
```

---

> **Next**: [09 — AI vs Human Searches](./09-AI-VS-HUMAN-SEARCHES.md)
