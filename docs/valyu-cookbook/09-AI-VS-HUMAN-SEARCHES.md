# 09 — AI vs Human Searches

> When to use `tool_call_mode=True` vs `False`, and how output differs.

## What `tool_call_mode` Does

Valyu optimizes results differently depending on who's reading them:

| Mode | Optimized For | Content Style |
|------|-------------|---------------|
| `tool_call_mode=True` (default) | LLM/AI processing | Longer, more detailed, structured for extraction |
| `tool_call_mode=False` | Human reading | Shorter, cleaner, more readable summaries |

## When to Use Each

### `tool_call_mode=True` (AI Agent Mode)

Use when an LLM will process the results:

```python
# Ask pipeline — LLM synthesizes answers
response = valyu.search(
    "quantum error correction surface codes LDPC performance benchmarks",
    tool_call_mode=True,  # Default
)
```

**Best for:**
- Ask pipeline (`ask.py`) — LLM processes results
- Deep research workflow — LLM synthesizes findings
- Pipeline automation — LLM generates intelligence notes
- Transformation execution — LLM applies templates
- Chat with sources — LLM answers questions

### `tool_call_mode=False` (Human Mode)

Use when a human will read the results directly:

```python
# Search page — user scans results
response = valyu.search(
    "quantum computing error correction methods",
    tool_call_mode=False,
)
```

**Best for:**
- Search page results list
- Scheduled search saved as Source
- Notebook search suggestions
- Research item preview
- Source ingestion (saved for human review)

## Application Feature Map

| Feature | Mode | Reason |
|---------|------|--------|
| `/search` endpoint (hybrid search) | `True` | LLM reranking processes results |
| `/search/ask` endpoint | `True` | LangGraph Ask pipeline |
| `/search/research` (hybrid engine) | `True` | LLM synthesis |
| Scheduled search worker | `False` | Saved as human-readable Source |
| Pipeline worker (crawl + search) | `True` | LLM generates intelligence |
| Deep research gathering | `True` | LLM synthesizes report |
| Operations Hub search | `False` | User-facing results |
| Notebook search | `True` for LLM-assisted, `False` for direct display |

## Code Pattern

```python
async def search_with_mode(query: str, for_llm: bool = True):
    """Unified search with correct mode selection."""
    response = valyu.search(
        query=query,
        tool_call_mode=for_llm,
        # AI mode: more results, longer content
        max_num_results=10 if for_llm else 5,
        results_length="short" if for_llm else "short",
    )
    return response
```

## Impact on Our Application

Switching `tool_call_mode` appropriately can:
- **Reduce token usage by 30-40%** for human-facing searches (shorter content)
- **Improve LLM accuracy** for AI-processed searches (richer context)
- **Better user experience** in the search UI (cleaner summaries)

---

> **Next**: [10 — Option 1: Drop-In Replacement](./10-OPTION-1-DROP-IN.md) — The simplest integration approach.
