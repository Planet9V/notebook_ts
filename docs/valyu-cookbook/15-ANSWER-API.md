# 15 — Answer API: AI-Powered Answers with Citations

> Get AI-generated answers backed by real-time search — not just raw results.

The Answer API searches across web, academic, and financial sources, then uses AI to
generate a readable, cited response. You get an **answer** instead of a list of links.

---

## When to Use

| Scenario | Use Answer API |
|----------|---------------|
| Quick compliance Q&A with citations | ✅ |
| Customer due diligence summary | ✅ |
| Financial analysis with structured output | ✅ |
| Real-time market intelligence | ✅ |
| Streaming answers in a chat UI | ✅ |
| Extracting data from specific URLs | ❌ Use Contents API |
| Multi-step research reports | ❌ Use DeepResearch API |

> [!TIP]
> The Answer API is ideal for single-question, single-answer flows. For multi-step research,
> use [DeepResearch](./16-DEEPRESEARCH-API.md). For raw URL extraction, use [Contents](./14-CONTENTS-API.md).

---

## Basic Usage

```python
from valyu import Valyu

valyu = Valyu()  # Uses VALYU_API_KEY env var

data = valyu.answer(
    query="latest developments in quantum computing",
)
print(data["contents"])
```

```typescript
import { Valyu } from 'valyu-js';

const valyu = new Valyu();

const data = await valyu.answer({
  query: 'latest developments in quantum computing',
});
console.log(data.contents);
```

---

## Search Types

| Type | Sources | Best For |
|------|---------|----------|
| `all` | Web + proprietary (default) | Comprehensive coverage |
| `web` | Web only | Current events, general topics |
| `proprietary` | Academic, financial, premium | Research, technical analysis |
| `news` | News articles only | Recent events |

```python
data = valyu.answer(
    query="CRISPR therapeutic applications",
    search_type="proprietary",  # Academic + financial sources only
)
```

---

## Fast Mode

Lower latency by prioritizing web and financial sources:

```python
data = valyu.answer(
    query="current market trends in tech stocks",
    fast_mode=True,
    data_max_price=30.0,
)
```

---

## Custom Instructions

Guide the AI's output style and focus:

```python
data = valyu.answer(
    query="climate change research",
    system_instructions=(
        "Focus on practical applications and commercial impact. "
        "Summarize key findings as bullet points."
    ),
)
```

---

## Streaming

Receive the answer progressively as it's generated:

```python
for chunk in valyu.answer("What is machine learning?", streaming=True):
    if chunk.type == "search_results":
        print(f"Found {len(chunk.search_results)} sources")
    elif chunk.type == "content":
        if chunk.content:
            print(chunk.content, end="", flush=True)
    elif chunk.type == "metadata":
        print(f"\nCost: ${chunk.cost.total_deduction_dollars:.4f}")
    elif chunk.type == "done":
        print("\n[Complete]")
    elif chunk.type == "error":
        print(f"Error: {chunk.error}")
```

```typescript
const stream = await valyu.answer('What is machine learning?', { streaming: true });

for await (const chunk of stream) {
  if (chunk.type === 'search_results') {
    console.log(`Found ${chunk.search_results?.length} sources`);
  } else if (chunk.type === 'content') {
    if (chunk.content) process.stdout.write(chunk.content);
  } else if (chunk.type === 'metadata') {
    console.log(`\nCost: $${chunk.cost?.total_deduction_dollars.toFixed(4)}`);
  } else if (chunk.type === 'done') {
    console.log('\n[Complete]');
  }
}
```

### Stream Chunk Types

| Type | Description |
|------|-------------|
| `search_results` | Sources found (streamed first, before answer) |
| `content` | Partial answer text chunk |
| `metadata` | Final metadata with costs and token usage |
| `done` | Stream completed |
| `error` | An error occurred |

---

## Structured Output

Get responses in a specific JSON format using JSON Schema:

```python
data = valyu.answer(
    query="top tech companies financial performance 2024",
    structured_output={
        "type": "object",
        "properties": {
            "companies": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "revenue": {"type": "string"},
                        "growth_rate": {"type": "string"},
                        "key_metrics": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["name", "revenue"],
                },
            },
            "market_summary": {"type": "string"},
            "analysis_date": {"type": "string"},
        },
        "required": ["companies", "market_summary"],
    },
)
# data["contents"] is now a parsed JSON object, not a string
print(data["contents"]["companies"][0]["name"])
```

---

## Source Filtering

Control which sources are searched:

```python
# Academic-only answer
data = valyu.answer(
    query="artificial intelligence research trends",
    included_sources=[
        "valyu/valyu-arxiv",
        "valyu/valyu-pubmed",
        "valyu/valyu-biorxiv",
    ],
)

# Exclude specific domains
data = valyu.answer(
    query="Next.js best practices",
    included_sources=[
        "https://nextjs.org/docs",
        "https://github.com/vercel/next.js",
        "vercel.com/blog",
    ],
)
```

**Source specification formats:**
- **Domains**: `"example.com"` — includes/excludes the whole domain
- **Paths**: `"https://example.com/blog"` — targets a specific section
- **Datasets**: `"valyu/valyu-arxiv"` — uses Valyu's proprietary datasets

---

## Date Filtering

Limit results to specific time periods:

```python
data = valyu.answer(
    query="cryptocurrency market analysis",
    start_date="2024-01-01",
    end_date="2024-12-31",
    country_code="US",
)
```

---

## Response Format

### Text Response (Default)

```json
{
  "success": true,
  "tx_id": "tx_12345678-1234-1234-1234-123456789abc",
  "data_type": "unstructured",
  "original_query": "latest developments in quantum computing",
  "contents": "Based on the latest research, quantum computing made significant progress...",
  "search_results": [
    {
      "title": "IBM Unveils 1000-Qubit Quantum Processor",
      "url": "https://example.com/ibm-quantum",
      "snippet": "IBM announced breakthrough...",
      "source": "web",
      "date": "2024-03-15",
      "length": 2500
    }
  ],
  "ai_usage": {
    "input_tokens": 1250,
    "output_tokens": 420
  },
  "cost": {
    "total_deduction_dollars": 0.027,
    "search_deduction_dollars": 0.015,
    "ai_deduction_dollars": 0.012
  }
}
```

### Response Fields

| Field | Description |
|-------|-------------|
| `contents` | AI-generated answer (text or JSON object) |
| `data_type` | `"unstructured"` (text) or `"structured"` (JSON) |
| `search_results` | Search results the AI used |
| `search_metadata` | Search transaction details |
| `ai_usage` | Input/output token counts |
| `cost` | Cost breakdown (search + AI) |

---

## Application Examples

### Compliance Q&A

```json
{
  "query": "What are the current SEC requirements for ESG reporting?",
  "system_instructions": "Cite specific regulations and effective dates. Focus on requirements for publicly traded companies.",
  "search_type": "all",
  "included_sources": ["valyu/valyu-sec-filings", "sec.gov"],
  "data_max_price": 40.0
}
```

### Financial Due Diligence

```json
{
  "query": "Analyze Anthropic's competitive position and funding history",
  "structured_output": {
    "type": "object",
    "properties": {
      "company_name": {"type": "string"},
      "total_funding": {"type": "string"},
      "key_investors": {"type": "array", "items": {"type": "string"}},
      "competitive_advantages": {"type": "array", "items": {"type": "string"}},
      "risk_factors": {"type": "array", "items": {"type": "string"}},
      "market_position": {"type": "string"}
    },
    "required": ["company_name", "market_position"]
  }
}
```

### Technical Research

```json
{
  "query": "machine learning interpretability methods 2024",
  "system_instructions": "Provide a technical overview. Include key papers and practical applications.",
  "search_type": "proprietary",
  "included_sources": ["valyu/valyu-arxiv", "valyu/valyu-pubmed"],
  "data_max_price": 40.0
}
```

---

## Error Handling

```python
try:
    data = valyu.answer(query="quantum computing applications")
    if data.get("success"):
        print(data["contents"])
    else:
        print(f"Failed: {data.get('error', 'Unknown error')}")
except Exception as e:
    print(f"Request failed: {e}")
```

---

## Best Practices

1. **Be specific** — Detailed queries produce better answers
2. **Set `data_max_price`** — Control search data costs
3. **Filter sources** — Focus on authoritative sources for your domain
4. **Use custom instructions** — Guide the AI for your use case
5. **Use `fast_mode`** for latency-sensitive applications
6. **Track both costs** — Search and AI are billed separately

---

## See Also

- [Contents API](./14-CONTENTS-API.md) — Extract raw content from specific URLs
- [DeepResearch API](./16-DEEPRESEARCH-API.md) — Multi-step research reports
- [Search Parameters](./05-SEARCH-PARAMETERS.md) — Advanced filtering options
- [Prompting Guide](./02-PROMPTING-GUIDE.md) — Write effective queries
