# 03 — Tips & Tricks

> Multi-step workflows, AI vs Human searches, budget tiers, and context management.
>
> Source: [docs.valyu.ai/search/tips-and-tricks](https://docs.valyu.ai/search/tips-and-tricks)

## Multi-Step Search Workflows

For complex research tasks, break your search into multiple steps rather than relying on a single query. This works especially well for technical domains like cybersecurity, compliance, finance, and medicine.

### Python Pattern
```python
async def research_agent(query: str):
    """Multi-step search workflow."""
    # Step 1: Break down the query into focused searches
    sub_queries = decompose_query(query)

    results = {}
    for i, sub_query in enumerate(sub_queries):
        # Step 2: Adjust strategy based on what you've found
        strategy = adapt_strategy(sub_query, results)

        search_result = valyu.search(
            query=sub_query,
            included_sources=strategy.sources,
            max_price=strategy.budget,
            relevance_threshold=0.65
        )
        results[f"step_{i}"] = search_result

        # Step 3: Fill in any gaps
        gaps = identify_knowledge_gaps(search_result, query)
        if gaps:
            gap_result = valyu.search(
                query=gaps[0].refined_query,
                included_sources=gaps[0].target_sources,
                max_price=50.0
            )
            results[f"gap_fill_{i}"] = gap_result

    # Step 4: Combine everything
    return synthesize_multi_source_findings(results)
```

### TypeScript Pattern
```typescript
async function researchAgent(query: string) {
    const subQueries = decomposeQuery(query);
    const results: Record<string, any> = {};

    for (let i = 0; i < subQueries.length; i++) {
        const strategy = adaptStrategy(subQueries[i], results);

        const searchResult = await valyu.search(subQueries[i], {
            includedSources: strategy.sources,
            maxPrice: strategy.budget,
            relevanceThreshold: 0.65
        });
        results[`step_${i}`] = searchResult;

        const gaps = identifyKnowledgeGaps(searchResult, query);
        if (gaps?.length > 0) {
            const gapResult = await valyu.search(gaps[0].refinedQuery, {
                includedSources: gaps[0].targetSources,
                maxPrice: 50.0
            });
            results[`gap_fill_${i}`] = gapResult;
        }
    }

    return synthesizeMultiSourceFindings(results);
}
```

### Our Application Pattern
Our `ask.py` LangGraph pipeline already does this with the `agent → provide_answer × N → write_final_answer` pattern. The strategy node decomposes queries into sub-searches. With Valyu, each sub-search should use targeted `included_sources` and `search_type` based on the query context.

## AI vs Human Searches

Valyu is optimized for AI agents by default. The `tool_call_mode` parameter controls this:

### For AI Agents (Default)
```python
# Optimized for LLMs — longer, more detailed content
response = valyu.search(
    "quantum error correction surface codes LDPC performance benchmarks",
    tool_call_mode=True,  # Default
)
```

### For Human-Facing Searches
```python
# Better for human readability — shorter, cleaner summaries
response = valyu.search(
    "quantum computing error correction methods",
    tool_call_mode=False,
)
```

### When to Use Each in Our App

| Feature | `tool_call_mode` | Reason |
|---------|-----------------|--------|
| Ask pipeline (`ask.py`) | `True` (default) | LLM processes results |
| Deep research workflow | `True` | LLM synthesizes findings |
| Pipeline automation (prospect) | `True` | LLM generates intelligence notes |
| Search page (user-facing results) | `False` | User reads results directly |
| Scheduled search results | `False` | Saved as human-readable Source |
| Notebook search suggestions | `False` | User scans for relevance |

## Budget Tiers

Not getting enough results? Increase `max_price`:

```python
search_configs = [
    {"max_price": 20.0, "use_case": "Quick fact-checking"},
    {"max_price": 50.0, "use_case": "Standard research"},
    {"max_price": 100.0, "use_case": "Comprehensive analysis"},
]
```

| Budget | What You Get |
|--------|-------------|
| **$20 CPM** | Basic web + academic content |
| **$50 CPM** | Full web + most research databases + financial data |
| **$100 CPM** | Premium sources + financial data + specialized datasets |

### Our Application Budget Map

| Feature | Recommended Budget | Reason |
|---------|-------------------|--------|
| Quick search (Ask) | $20-30 | Fast fact-checking |
| Scheduled search | $30-50 | Regular monitoring |
| Deep research | $50-100 | Comprehensive analysis |
| Prospect enrichment | $50-80 | Company + financial + news |
| Compliance research | $50-100 | Academic + regulatory |
| SEC/Financial analysis | $80-100 | Premium financial datasets |

## Managing Context Size

Control how much data goes into the LLM's context window:

```python
# Smaller context — fast, cheap
lightweight = valyu.search(
    "transformer architecture innovations",
    max_num_results=3,
    results_length="short",
    max_price=50.0
)

# Larger context — thorough, expensive
comprehensive = valyu.search(
    "transformer architecture innovations",
    max_num_results=15,
    results_length="max",
    max_price=100.0
)
```

### Token Estimates

| Length | Chars per Result | Tokens per Result | 10 Results |
|--------|-----------------|-------------------|------------|
| `short` | ~25k | ~6k | ~60k tokens |
| `medium` | ~50k | ~12k | ~120k tokens |
| `long` | ~100k | ~24k | ~240k tokens |
| `max` | unlimited | varies | varies |

> **Rule of thumb**: 4 characters ≈ 1 token

### Our Application Context Strategy

| Feature | `max_num_results` | `results_length` | Reason |
|---------|------------------|-------------------|--------|
| Ask pipeline | 10 | `short` | Multiple sub-queries, need room for all |
| Deep research | 15 | `medium` | Comprehensive but fits 32k window |
| Scheduled search | 8 | `short` | Saved as Source, needs to be scannable |
| Prospect crawl | 5 | `long` | Deep extraction of company info |
| Compliance | 10 | `medium` | Balance depth and breadth |

> **Start with `max_num_results=10` and `results_length="short"`**, then adjust based on your needs.

---

> **Next**: [04 — Common Mistakes](./04-COMMON-MISTAKES.md) — Anti-patterns that waste tokens and money.
