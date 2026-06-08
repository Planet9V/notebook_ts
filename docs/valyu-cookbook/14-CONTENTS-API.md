# 14 — Contents API: URL Content Extraction

> Turn any web page into clean, structured data for LLM consumption.

The Contents API extracts content from URLs with batch processing, AI-powered summaries,
and structured outputs. Use it to feed your research pipeline clean data instead of noisy HTML.

---

## When to Use

| Scenario | Use Contents API |
|----------|-----------------|
| Extract clean text from a source URL found via Search | ✅ |
| Scrape customer website for CRM enrichment | ✅ |
| Parse regulatory documents from URLs | ✅ |
| Batch-process 10-50 URLs | ✅ |
| Generate structured JSON from web pages | ✅ |
| Real-time streaming content | ❌ Use Answer API |

> [!NOTE]
> The Contents API complements the Search API. Typical flow: Search finds URLs → Contents extracts clean data → Your pipeline processes it.

---

## Basic Extraction

```python
from valyu import Valyu

valyu = Valyu()  # Uses VALYU_API_KEY env var

data = valyu.contents(
    urls=["https://example.com/research-paper"],
    response_length="medium",
    extract_effort="auto",
)
print(data["results"][0]["content"][:500])
```

```typescript
import { Valyu } from 'valyu-js';

const valyu = new Valyu();

const data = await valyu.contents({
  urls: ['https://example.com/research-paper'],
  responseLength: 'medium',
  extractEffort: 'auto',
});
console.log(data.results[0].content.slice(0, 500));
```

---

## Parameters Reference

### Response Length

| Length | Characters | Best For |
|--------|-----------|----------|
| `short` | 25,000 | Summaries, key points |
| `medium` | 50,000 | Articles, blog posts |
| `large` | 100,000 | Academic papers, long-form |
| `max` | Unlimited | Full document extraction |
| Custom integer | 1,000–1,000,000 | Specific requirements |

### Extract Effort

| Effort | Description |
|--------|-------------|
| `normal` | Standard speed and quality (default) |
| `high` | Better quality, slower processing |
| `auto` | Automatically selects the right level |

---

## Summary Options

The `summary` field controls AI processing of extracted content.

### Raw Content (No AI)

```python
data = valyu.contents(
    urls=["https://example.com/article"],
    extract_effort="normal",
    summary=False,
)
```

### Basic AI Summary

```python
data = valyu.contents(
    urls=["https://example.com/article"],
    extract_effort="auto",
    summary=True,
)
```

### Custom Instructions

```python
data = valyu.contents(
    urls=["https://example.com/research-paper"],
    extract_effort="auto",
    summary="Extract methodology, key findings, and practical applications in 2-3 paragraphs",
)
```

### Structured Extraction (JSON Schema)

Extract specific data points into a defined schema:

```python
data = valyu.contents(
    urls=["https://example.com/product-page"],
    extract_effort="auto",
    summary={
        "type": "object",
        "properties": {
            "product_name": {"type": "string", "description": "Name of the product"},
            "price": {"type": "number", "description": "Product price in USD"},
            "features": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 5,
                "description": "Key product features",
            },
            "availability": {
                "type": "string",
                "enum": ["in_stock", "out_of_stock", "preorder"],
            },
        },
        "required": ["product_name", "price"],
    },
)
```

> [!IMPORTANT]
> JSON Schema limits: 5,000 characters max, 3 levels deep, 20 properties per object.

---

## Screenshot Capture

Capture visual screenshots alongside content:

```python
data = valyu.contents(
    urls=["https://example.com/article"],
    extract_effort="auto",
    screenshot=True,
)
print(data["results"][0]["screenshot_url"])
```

> [!NOTE]
> Screenshots are returned as pre-signed URLs. PDF files do not support screenshots.

---

## Async Mode (Batch Processing)

For large-scale extraction (11-50 URLs) or non-blocking workflows:

```python
# Submit async job — returns immediately with a job_id
job = valyu.contents(
    urls=[
        "https://example.com/page1",
        "https://example.com/page2",
        # ... up to 50 URLs
    ],
    async_mode=True,
    webhook_url="https://your-app.com/webhooks/valyu",  # optional
)

print(f"Job ID: {job['job_id']}")

# Option 1: Block until complete (SDK handles polling)
result = valyu.wait_for_contents_job(
    job["job_id"],
    poll_interval=5,
    max_wait_time=3600,
    on_progress=lambda s: print(f"  {s['status']} — batch {s.get('current_batch', '?')}/{s.get('total_batches', '?')}"),
)

# Option 2: Auto-poll on submit
result = valyu.contents(
    urls=["https://example.com/page1", "https://example.com/page2"],
    async_mode=True,
    wait=True,
)

for r in result["results"]:
    print(f"{r['title']}: {r['length']} characters")
print(f"Total cost: ${result['actual_cost_dollars']}")
```

### Job Lifecycle

| Status | Description |
|--------|-------------|
| `pending` | Job created, not yet started |
| `processing` | URLs being processed in batches of 5 |
| `completed` | All URLs processed successfully |
| `partial` | Finished with some URL failures |
| `failed` | All URLs failed |

> [!WARNING]
> Async mode is **required** for more than 10 URLs. The `webhook_secret` is only returned in the initial 202 response — store it immediately.

### Webhook Verification

```python
import hmac
import hashlib

def verify_webhook(payload: bytes, signature_header: str, timestamp_header: str, webhook_secret: str) -> bool:
    signed_payload = f"{timestamp_header}.{payload.decode('utf-8')}"
    expected = hmac.new(
        webhook_secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    received = signature_header.removeprefix("sha256=")
    return hmac.compare_digest(expected, received)
```

---

## Pricing

| Detail | Value |
|--------|-------|
| Max URLs (sync) | 10 |
| Max URLs (async) | 50 |
| Batch size | 5 URLs per batch |
| Timeout per URL (sync) | 25 seconds |
| Timeout per URL (async) | 120 seconds |
| Base pricing | $0.001 per URL |
| AI features (summary/schema) | +$0.001 per URL |
| Job expiry (TTL) | 7 days |

---

## Application Examples

### Research: Extract Academic Paper Data

```python
data = valyu.contents(
    urls=["https://arxiv.org/abs/2301.00001"],
    response_length="max",
    extract_effort="high",
    summary={
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "abstract": {"type": "string"},
            "methodology": {"type": "string"},
            "key_findings": {"type": "array", "items": {"type": "string"}},
            "limitations": {"type": "string"},
        },
        "required": ["title"],
    },
)
```

### CRM: Customer Website Enrichment

```python
data = valyu.contents(
    urls=["https://customer-website.com/about"],
    extract_effort="auto",
    summary={
        "type": "object",
        "properties": {
            "company_name": {"type": "string"},
            "industry": {"type": "string"},
            "employee_count": {"type": "string"},
            "headquarters": {"type": "string"},
            "key_products": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
        },
        "required": ["company_name"],
    },
)
```

### Compliance: Regulatory Document Extraction

```python
data = valyu.contents(
    urls=[
        "https://regulator.gov/policy-updates",
        "https://regulator.gov/compliance-guidelines",
    ],
    response_length="large",
    extract_effort="high",
    summary="Extract all compliance requirements, effective dates, and penalty structures",
)
```

---

## Response Format

```json
{
  "success": true,
  "tx_id": "tx_12345678-1234-1234-1234-123456789abc",
  "results": [
    {
      "url": "https://example.com/article",
      "title": "AI Breakthrough in NLP",
      "content": "Clean markdown content...",
      "length": 45000,
      "source_type": "web",
      "screenshot_url": null
    }
  ],
  "actual_cost_dollars": 0.002
}
```

---

## See Also

- [Search API Parameters](./05-SEARCH-PARAMETERS.md) — Find URLs to extract
- [Answer API](./15-ANSWER-API.md) — Get AI-synthesized answers instead of raw content
- [Prompting Guide](./02-PROMPTING-GUIDE.md) — Write effective custom summary instructions
