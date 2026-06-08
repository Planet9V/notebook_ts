# 02 — Prompting Guide

> Write better search queries to get more relevant results from Valyu.
>
> Source: [docs.valyu.ai/search/prompting](https://docs.valyu.ai/search/prompting)

## System Prompt Configuration

Add this to any AI agent's system prompt that calls Valyu:

```text
Valyu Search searches web content, research papers, financial data, and proprietary datasets in real time.
When querying the Valyu API:
- Use focused, specific queries
- Include domain-specific terms and technical keywords
- Specify source types when needed (e.g., "academic papers", "SEC filings")
- Split complex research into multiple targeted queries
- Be precise about time ranges when relevant
- Do not use search operators (e.g., site:, OR, AND, quotes). Use natural keyword queries instead
```

> **CRITICAL**: Do NOT use search operators in queries (`site:`, `OR`, `AND`, quotes). Valyu uses semantic search, not keyword matching. Operators that work on Google will degrade Valyu results.

## What Makes a Good Query

| Component | What It Does | Example |
|-----------|-------------|--------|
| **Intent** | The specific knowledge you need | "LLM transformer efficiency optimizations" |
| **Source Type** | Which data sources to prioritize | "{author} {document name}" |
| **Constraints** | Filters that improve relevance | "production-ready solutions" |
| **Time Range** | Period results should cover | "2024-2025", "after 2023" |

## Query Length Rule

Queries work best **under 400 characters**. Short, focused phrasing beats long prompts.

### ❌ Too long (450+ characters):
```
I need comprehensive information about the latest developments in artificial intelligence and machine learning technologies, particularly focusing on large language models, their training methodologies, performance benchmarks, computational requirements, and how they compare to previous generations of AI systems in terms of accuracy and efficiency
```

### ✅ Better (under 400 characters):
```
LLM training methodologies performance benchmarks computational requirements vs previous AI systems
```

## Split Complex Queries

Instead of one broad query:
```json
{"query": "Tell me everything about company ABC including competitors, financials, recent news, and industry trends"}
```

Use focused queries:
```json
{"query": "Company ABC main competitors market share analysis"}
{"query": "ABC Corp quarterly revenue growth 2024"}
{"query": "ABC recent acquisitions strategic partnerships"}
{"query": "Industry trends affecting ABC business model"}
```

## Common Mistakes

### Being Too Vague
- ❌ "AI research"
- ✅ "transformer attention mechanism computational complexity analysis"

### Not Specifying Source Type
- ❌ "Stock data"
- ✅ "Apple quarterly earnings financial statements SEC filings"

### Asking for Too Much
- ❌ "Everything about quantum computing"
- ✅ "quantum error correction surface codes implementation"

### Mixing Multiple Topics
- ❌ "Explain causes of high inflation rates, and also tell me about cryptocurrency market trends"
- ✅ "Federal Reserve interest rate policy impact on inflation 2023-2024"

### Using Too Many Words
- ❌ "Explain concepts on how bioinformatics works by helix"
- ✅ "DNA helix structure bioinformatics sequence analysis"

## Quick Reference Table

| Weak Query | Better Query |
|-----------|-------------|
| "Find information about machine learning" | "production RAG benchmarks enterprise deployment technical whitepapers 2023" |
| "Cancer research" | "CAR-T cell therapy B-cell lymphoma phase III outcomes FDA briefing documents 2023" |
| "Recent studies on psychology" | "CBT efficacy treatment-resistant adolescent depression meta-analysis peer-reviewed journals 2020-2024" |
| "Database optimization" | "PostgreSQL time-series query tuning indexing partitioning official documentation benchmarks" |

## Using Search Parameters with Prompts

Combine good queries with Valyu's search parameters:

```python
response = valyu.search(
    "GPT-4 vs GPT-3 architectural innovations: training efficiency, inference optimisation, and benchmark comparisons",
    search_type="proprietary",
    max_num_results=10,
    relevance_threshold=0.6,
    included_sources=["valyu/valyu-arxiv"],
    max_price=50.0,
    category="machine learning",
    start_date="2024-01-01",
    end_date="2024-12-31"
)
```

```typescript
const response = await valyu.search(
  "GPT-4 vs GPT-3 architectural innovations",
  {
    searchType: "proprietary",
    maxNumResults: 10,
    relevanceThreshold: 0.6,
    includedSources: ["valyu/valyu-arxiv"],
    maxPrice: 50.0,
    category: "machine learning",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
  }
);
```

> Include the key details in your query text, then use parameters as hard filters.

## Application-Specific Query Templates

### Prospect Research
```python
query = f"{company_name} cybersecurity posture OT ICS infrastructure assessment"
```

### Compliance Research
```python
query = f"NIST CSF IEC-62443 {sector} compliance requirements implementation guide"
```

### Threat Intelligence
```python
query = f"{industry} SCADA PLC vulnerability CVE advisory {current_year}"
```

### Financial Due Diligence
```python
query = f"{company_name} SEC 10-K annual report revenue growth analysis"
```

## Things to Avoid in Our Application

1. **Wasting tokens**: Keep prompts focused on what the LLM actually needs
2. **Vague queries**: Define technical terms and expand acronyms
3. **Skipping filters**: Always use relevance thresholds and source controls
4. **Ignoring costs**: Balance `max_price` with the quality needed
5. **Wrong source assumptions**: Popular sources aren't always the best — "Attention is All You Need" is foundational but not great for understanding modern LLMs

---

> **Next**: [03 — Tips & Tricks](./03-TIPS-AND-TRICKS.md) — Multi-step workflows, budget tiers, and advanced patterns.
