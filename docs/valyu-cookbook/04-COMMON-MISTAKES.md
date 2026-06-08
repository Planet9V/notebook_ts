# 04 — Common Mistakes to Avoid

> Anti-patterns that waste tokens, cost money, or return garbage results.

## The 10 Most Common Mistakes

### 1. Wasting Tokens with Unbounded Results

**Mistake**: Not setting `max_num_results` or `results_length`, flooding the LLM context.

```python
# ❌ BAD — returns default results with no size control
response = valyu.search("quantum computing")
```

```python
# ✅ GOOD — explicit control over context size
response = valyu.search(
    "quantum error correction surface codes",
    max_num_results=8,
    results_length="short"
)
```

**Impact**: A single search with 20 results at `"long"` length = ~480k tokens. That's 4x the context window of most models.

---

### 2. Skipping Relevance Filters

**Mistake**: Not setting `relevance_threshold`, accepting low-quality results.

```python
# ❌ BAD — default threshold 0.5 lets in marginal results
response = valyu.search("OT cybersecurity compliance")
```

```python
# ✅ GOOD — only high-relevance results
response = valyu.search(
    "OT cybersecurity IEC-62443 compliance requirements",
    relevance_threshold=0.65
)
```

**Impact**: Low-relevance results dilute the good ones and waste LLM processing tokens.

---

### 3. Ignoring Costs with No Budget Cap

**Mistake**: Not setting `max_price`, accidentally accessing expensive premium datasets.

```python
# ❌ BAD — no price control
response = valyu.search(
    "Apple earnings Q3",
    search_type="proprietary"
)
```

```python
# ✅ GOOD — explicit budget
response = valyu.search(
    "Apple quarterly earnings revenue analysis",
    search_type="proprietary",
    max_price=50.0
)
```

**Impact**: Premium datasets cost up to $50/1000 retrievals. Without `max_price`, a spike in usage can run up costs quickly.

---

### 4. Using Wrong Sources for the Domain

**Mistake**: Using `search_type="web"` for academic research, or `"proprietary"` for recent news.

```python
# ❌ BAD — web search for academic papers
response = valyu.search(
    "CRISPR gene editing clinical trials",
    search_type="web"
)
```

```python
# ✅ GOOD — proprietary for academic, with targeted sources
response = valyu.search(
    "CRISPR gene editing clinical trials safety outcomes",
    search_type="proprietary",
    included_sources=["valyu/valyu-pubmed", "valyu/valyu-US-clinical-trials"],
    max_price=30.0
)
```

---

### 5. Single-Shot Queries for Complex Research

**Mistake**: Asking one broad question when you need multiple focused searches.

```python
# ❌ BAD — too broad
response = valyu.search(
    "Tell me everything about Anthropic including competitors financials leadership recent news"
)
```

```python
# ✅ GOOD — decomposed queries
queries = [
    "Anthropic company profile leadership team funding rounds",
    "Anthropic AI competitors market positioning OpenAI Google",
    "Anthropic recent news partnerships product launches 2025-2026",
    "Anthropic SEC filings financial performance",
]
results = [valyu.search(q, max_num_results=5) for q in queries]
```

---

### 6. Using Search Operators

**Mistake**: Treating Valyu like Google with `site:`, `OR`, `AND`, quotes.

```python
# ❌ BAD — search operators don't work
response = valyu.search(
    'site:arxiv.org "transformer architecture" OR "attention mechanism"'
)
```

```python
# ✅ GOOD — natural language + parameter filtering
response = valyu.search(
    "transformer architecture attention mechanism innovations",
    included_sources=["valyu/valyu-arxiv"]
)
```

**Why**: Valyu uses semantic search, not keyword matching. Operators degrade results.

---

### 7. Not Using Temporal Filtering

**Mistake**: Getting outdated results when you need recent information.

```python
# ❌ BAD — no date filter, may return 2020 papers
response = valyu.search("COVID-19 treatment protocols")
```

```python
# ✅ GOOD — date-bounded
from datetime import datetime, timedelta
response = valyu.search(
    "COVID-19 treatment protocols clinical guidelines",
    start_date=(datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d"),
    end_date=datetime.utcnow().strftime("%Y-%m-%d")
)
```

---

### 8. Mixing `tool_call_mode` Incorrectly

**Mistake**: Using `tool_call_mode=True` when displaying results to humans, or `False` when feeding to an LLM.

| Scenario | Correct Mode |
|----------|-------------|
| LLM processes results | `True` (default) |
| User reads results in UI | `False` |
| Saving as Source in DB | `False` |

---

### 9. Not Deduplicating Across Multiple Searches

**Mistake**: Running 5 sub-queries and feeding duplicate URLs to the LLM.

```python
# ✅ GOOD — deduplicate by URL
seen_urls = set()
all_results = []
for query in sub_queries:
    response = valyu.search(query, max_num_results=5)
    for r in response.results:
        if r.url not in seen_urls:
            seen_urls.add(r.url)
            all_results.append(r)
```

---

### 10. Not Using Collections for Repeated Searches

**Mistake**: Typing out the same `included_sources` list every time.

```python
# ❌ BAD — repeated source lists
valyu.search("...", included_sources=["valyu/valyu-sec-filings", "valyu/valyu-stocks", "sec.gov"])
valyu.search("...", included_sources=["valyu/valyu-sec-filings", "valyu/valyu-stocks", "sec.gov"])
```

```python
# ✅ GOOD — use a Collection
valyu.search("...", included_sources=["collection:financial-research"])
```

See [07 — Collections](./07-COLLECTIONS.md) for setup instructions.

---

## Anti-Pattern Summary

| # | Anti-Pattern | Fix |
|---|-------------|-----|
| 1 | Unbounded results | Set `max_num_results` + `results_length` |
| 2 | No relevance filter | Set `relevance_threshold=0.6+` |
| 3 | No budget cap | Set `max_price` per use case |
| 4 | Wrong source type | Match `search_type` + `category` to domain |
| 5 | Single broad query | Decompose into focused sub-queries |
| 6 | Search operators | Use natural language + parameters |
| 7 | No date filter | Use `start_date`/`end_date` |
| 8 | Wrong tool_call_mode | `True` for LLM, `False` for humans |
| 9 | No deduplication | Track seen URLs across searches |
| 10 | Hardcoded source lists | Use Collections |

---

> **Next**: [05 — Search Parameters](./05-SEARCH-PARAMETERS.md) — Complete reference for every parameter.
