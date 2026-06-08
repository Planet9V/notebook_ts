# 05 — Search Parameters Reference

> Every parameter, every option, with code snippets for our application.

## Search API Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | `str` | **Required** | The search query string (keep under 400 chars) |
| `search_type` | `str` | `"all"` | Controls source scope — see below |
| `max_num_results` | `int` | `10` | Number of results (1-20; up to 100 with permissions) |
| `included_sources` | `list[str]` | `None` | Specific domains/URLs/dataset IDs/collections to include |
| `excluded_sources` | `list[str]` | `None` | Domains/URLs to exclude from results |
| `start_date` | `str` | `None` | Filter start date (`YYYY-MM-DD`) |
| `end_date` | `str` | `None` | Filter end date (`YYYY-MM-DD`) |
| `relevance_threshold` | `float` | `0.5` | Minimum relevance score (0.0-1.0) |
| `category` | `str` | `None` | Category filter — see below |
| `country_code` | `str` | `None` | Country filter (e.g., `"US"`, `"GB"`) |
| `max_price` | `int` | `30` | Maximum CPM (cost per 1000 queries) in dollars |
| `fast_mode` | `bool` | `False` | Faster results with shorter content |
| `tool_call_mode` | `bool` | `True` | Optimize for AI (True) or human readability (False) |
| `results_length` | `str` | varies | `"short"` \| `"medium"` \| `"long"` \| `"max"` |

## `search_type` Options

| Value | Description | Use When |
|-------|-------------|----------|
| `"all"` | **(Default)** Web + proprietary sources | General research, mixed needs |
| `"web"` | General web content only | News, current events, company info |
| `"proprietary"` | Academic, financial, medical, premium only | Deep research, compliance, due diligence |
| `"news"` | News articles only | Threat intelligence, current events |

## `category` Options

| Category | Best For |
|----------|----------|
| `"web"` | General internet |
| `"paper"` | Academic papers (arXiv, PubMed) |
| `"finance"` | Financial data, earnings, stocks |
| `"sec"` | SEC filings (10-K, 10-Q, 8-K) |
| `"bio"` | Biomedical, clinical trials |
| `"patent"` | USPTO patents |
| `"economics"` | Economic indicators |
| `"news"` | News articles |
| `"markets"` | Real-time market data |
| `"research"` | General research papers |

## Complete Python Example

```python
from valyu import Valyu
from datetime import datetime, timedelta

valyu = Valyu()

# Full-featured search call
response = valyu.search(
    query="IEC-62443 OT cybersecurity compliance requirements industrial control systems",
    search_type="proprietary",
    max_num_results=10,
    included_sources=["valyu/valyu-arxiv", "valyu/valyu-pubmed"],
    excluded_sources=["reddit.com"],
    start_date="2024-01-01",
    end_date=datetime.utcnow().strftime("%Y-%m-%d"),
    relevance_threshold=0.65,
    category="paper",
    max_price=50,
    fast_mode=False,
    tool_call_mode=True,
    results_length="short",
)

if response.success:
    for r in response.results:
        print(f"[{r.relevance_score:.2f}] {r.title}")
        print(f"  URL: {r.url}")
        print(f"  Type: {r.source_type}")
        print(f"  Content: {r.content[:200]}...")
else:
    print(f"Search failed: {response.error}")
```

## Complete TypeScript Example

```typescript
import { Valyu } from 'valyu-js';

const valyu = new Valyu();

const response = await valyu.search(
  'IEC-62443 OT cybersecurity compliance requirements',
  {
    searchType: 'proprietary',
    maxNumResults: 10,
    includedSources: ['valyu/valyu-arxiv'],
    excludedSources: ['reddit.com'],
    startDate: '2024-01-01',
    endDate: new Date().toISOString().split('T')[0],
    relevanceThreshold: 0.65,
    category: 'paper',
    maxPrice: 50,
    fastMode: false,
    toolCallMode: true,
    resultsLength: 'short',
  }
);

if (response.success) {
  response.results.forEach(r => {
    console.log(`[${r.relevanceScore.toFixed(2)}] ${r.title}`);
    console.log(`  URL: ${r.url}`);
  });
}
```

## Answer API Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | `string` | **Required.** The question or research task |
| `search_type` | `enum` | `all` (default), `web`, `proprietary`, `news` |
| `included_sources` | `list[str]` | Specific sources to search |
| `excluded_sources` | `list[str]` | Sources to filter out |
| `fastMode` | `boolean` | Lower-latency responses |
| `systemInstructions` | `string` | Custom instructions for AI output format |
| `max_num_results` | `int` | Number of source results to ground answer on |

```python
answer = valyu.answer(
    query="What are the latest NIST CSF 2.0 changes?",
    search_type="proprietary",
    systemInstructions="Provide a structured answer with numbered findings and inline citations.",
    max_num_results=15
)
```

## Contents API Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `urls` | `list` | **Required.** 1-50 URLs to extract |
| `response_length` | `enum/int` | `"short"` (25k), `"medium"` (50k), `"large"` (100k), `"max"`, or custom int |
| `extract_effort` | `enum` | `"normal"`, `"high"`, `"auto"` |
| `screenshot` | `bool` | Capture visual screenshot |

```python
content = valyu.contents(
    urls=["https://example.com/report"],
    response_length="large",
    extract_effort="high",
    screenshot=True
)
```

## DeepResearch API Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | `str` | **Required.** The research question |
| `mode` | `str` | `"fast"` (~5min), `"standard"` (~20min), `"heavy"` (~90min), `"max"` (~180min) |
| `output_format` | `str` | `"markdown"`, `"pdf"`, `"json"` |
| `json_schema` | `dict` | JSON Schema for structured output |
| `search_sources` | `list` | Restrict to specific sources |
| `webhook_url` | `str` | Callback URL for completion |
| `files` | `list` | Up to 10 files (100MB total) |

```python
task = valyu.deepresearch.create(
    query="Comprehensive analysis of IEC-62443 compliance gaps in energy sector OT networks",
    mode="standard",
    output_format="markdown",
    search_sources=["valyu/valyu-arxiv", "valyu/valyu-pubmed"]
)

result = valyu.deepresearch.wait(task.deepresearch_id, poll_interval=5)
print(result.output)  # Full markdown report
```

## Response Format

```json
{
  "success": true,
  "tx_id": "tx_2e41e0af-...",
  "query": "Your query",
  "results": [
    {
      "title": "Result Title",
      "url": "https://...",
      "content": "Cleaned text...",
      "relevance_score": 0.95,
      "source_type": "web",
      "success": true
    }
  ]
}
```

---

> **Next**: [06 — Specialized Datasets](./06-SPECIALIZED-DATASETS.md) — Targeting academic, financial, and medical sources.
