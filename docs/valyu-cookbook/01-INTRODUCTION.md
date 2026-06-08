# 01 — Introduction & API Overview

> What Valyu is, what it replaces in our stack, and the full API surface area.

## What Is Valyu?

Valyu is a unified search API that searches across web content, 36+ proprietary datasets (academic, financial, medical, patent), and specialized sources through a single endpoint. It provides 4 core APIs:

| API | Endpoint | Purpose |
|-----|----------|--------|
| **Search** | `POST /v1/search` | Search web + proprietary sources with filtering |
| **Answer** | `POST /v1/answer` | AI-generated answers with inline citations |
| **Contents** | `POST /v1/contents` | Extract clean markdown from 1-50 URLs |
| **DeepResearch** | `POST /v1/deepresearch` | Async multi-step research (5min → 3hr) |

## What Valyu Replaces

Our application previously used 6 separate search APIs with different response formats, error handling, and rate limiting. Valyu consolidates all of them:

| Previous API | What It Did | Valyu Equivalent |
|-------------|-------------|------------------|
| Tavily | Web search | `search_type="web"` |
| NewsAPI | News articles | `search_type="news"` |
| Google Scholar (SerpAPI) | Academic papers | `search_type="proprietary"` + `category="paper"` |
| Perplexity (sonar) | AI-synthesized answers | Answer API |
| DuckDuckGo (HTML scrape) | Free fallback | No longer needed |
| Brave Search | General web fallback | Keep as emergency fallback |

### Cost Impact

- **Before**: 6 API keys, 6 billing accounts, 6 rate limit strategies
- **After**: 1 API key, 1 billing account, unified rate limiting
- **Estimated savings**: ~$50/month in API costs

## API Key

Environment variable: `VALYU_API_KEY`

Set in Docker via `docker-compose.yml`:
```yaml
environment:
  VALYU_API_KEY: ${VALYU_API_KEY}
```

Or via the Credential table (encrypted at rest) in the application's Settings > API Keys page.

## SDK Installation

### Python (Backend — Docker)
```bash
# Add to requirements.txt
valyu>=1.0.0
```

### TypeScript (Frontend — optional)
```bash
npm install valyu-js
```

## Authentication

```python
from valyu import Valyu

# Auto-reads VALYU_API_KEY from environment
valyu = Valyu()

# Or explicit
valyu = Valyu(api_key="val_...")
```

```typescript
import { Valyu } from 'valyu-js';

const valyu = new Valyu(); // reads VALYU_API_KEY
// or
const valyu = new Valyu('val_...');
```

## Rate Limits & Pricing

| Tier | Rate Limit |
|------|------------|
| Standard | 100 requests/minute |
| Enterprise | Custom |

| Source Type | Cost (per 1,000 retrievals) |
|------------|----------------------------|
| Open databases (arXiv, Wikipedia, PubMed) | ~$0.50 |
| Web search | ~$1.50 |
| Financial & market data | ~$8.00 |
| Proprietary databases | ~$30-50 |
| DeepResearch tasks | $0.10-$15 per task |

Use the `max_price` parameter to cap spending per query.

## Framework Integrations

| Framework | Package | Key Class |
|-----------|---------|----------|
| LangChain | `langchain-valyu` | `ValyuRetriever`, `ValyuSearchTool` |
| Vercel AI SDK | `@valyu/ai-sdk` | Streaming tools |
| LlamaIndex | Via LlamaHub | `ValyuToolSpec` |

## Key Links

- [Full Documentation Index](https://docs.valyu.ai/llms.txt)
- [API Reference (OpenAPI)](https://docs.valyu.ai/api-reference/openapi.json)
- [Python SDK Docs](https://docs.valyu.ai/sdk/python-sdk)
- [TypeScript SDK Docs](https://docs.valyu.ai/sdk/typescript-sdk)
- [Cookbook (GitHub)](https://github.com/valyuAI/cookbook)
- [Data Sources Browser](https://platform.valyu.ai/data-sources)

---

> **Next**: [02 — Prompting Guide](./02-PROMPTING-GUIDE.md) — How to write queries that return the best results.
