# 16 — DeepResearch API: Comprehensive Research Reports

> Async deep research that performs multi-step analysis and generates detailed reports with citations.

DeepResearch runs tasks in the background, searching multiple sources, analyzing content,
and generating comprehensive reports. Unlike the Answer API, DeepResearch performs thorough
multi-step research that can take minutes to complete.

---

## When to Use

| Need | API |
|------|-----|
| Quick Q&A with citations | Answer API |
| Extract content from URLs | Contents API |
| In-depth multi-step research | ✅ **DeepResearch** |
| Structured data extraction from research | ✅ **DeepResearch** |
| Background report generation | ✅ **DeepResearch** |

---

## Research Modes

| Mode | Price | Best For | Max Steps |
|------|-------|----------|-----------|
| `fast` | $0.10 | Quick queries, batch processing | 10 |
| `standard` | $0.50 | Balanced research | 15 |
| `heavy` | $2.50 | Complex topics, fact verification | 15 |
| `max` | $15.00 | Exhaustive research, maximum quality | 25 |

---

## Quick Start

### Create and Wait

```python
from valyu import Valyu

valyu = Valyu()

# Create a research task
task = valyu.deepresearch.create(
    query="What are the key differences between RAG and fine-tuning for LLMs?",
    mode="standard",
)

print(f"Task created: {task.deepresearch_id}")

# Wait for completion (SDK handles polling)
result = valyu.deepresearch.wait(
    task.deepresearch_id,
    poll_interval=5,
    max_wait_time=1800,
)

if result.status == "completed":
    print(result.output)
    for source in result.sources:
        print(f"- {source.title}: {source.url}")
    print(f"Cost: ${result.cost}")
```

```typescript
import { Valyu } from 'valyu-js';

const valyu = new Valyu();

const task = await valyu.deepresearch.create({
  query: 'What are the key differences between RAG and fine-tuning for LLMs?',
  mode: 'standard',
});

const result = await valyu.deepresearch.wait(task.deepresearch_id!, {
  pollInterval: 5000,
  maxWaitTime: 1800000,
});

if (result.status === 'completed') {
  console.log(result.output);
  result.sources?.forEach(s => console.log(`- ${s.title}: ${s.url}`));
  console.log(`Cost: $${result.cost}`);
}
```

---

## Task Lifecycle

| Status | Description |
|--------|-------------|
| `queued` | Waiting to start (capacity/rate limits) |
| `running` | Actively researching |
| `completed` | Research finished |
| `failed` | Check `error` field |
| `cancelled` | Cancelled by user |
| `awaiting_input` | HITL checkpoint active |
| `paused` | HITL checkpoint timed out (respond anytime) |

---

## Output Formats

### Markdown (Default)

```python
task = valyu.deepresearch.create(
    query="Explain quantum computing advancements",
    output_formats=["markdown"],
)
```

### Markdown + PDF

```python
task = valyu.deepresearch.create(
    query="Write a report on renewable energy trends",
    output_formats=["markdown", "pdf"],
)

result = valyu.deepresearch.wait(task.deepresearch_id)
if result.pdf_url:
    print(f"PDF: {result.pdf_url}")
```

### Structured JSON

```python
task = valyu.deepresearch.create(
    query="Research competitor pricing in the SaaS market",
    output_formats=[{
        "type": "object",
        "properties": {
            "competitors": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "pricing_model": {"type": "string"},
                        "price_range": {"type": "string"},
                    },
                    "required": ["name", "pricing_model"],
                },
            },
            "market_summary": {"type": "string"},
        },
        "required": ["competitors", "market_summary"],
    }],
)
```

> [!WARNING]
> JSON Schema cannot be mixed with markdown/pdf. Use one or the other.

---

## Guiding Research and Output

Two parameters control the research process:

| Parameter | Controls |
|-----------|----------|
| `research_strategy` | **What** to search for, which sources to prioritize, methodology |
| `report_format` | **How** to present it — structure, style, length |

```python
task = valyu.deepresearch.create(
    query="Impact of GLP-1 receptor agonists on cardiovascular outcomes",
    mode="standard",
    research_strategy=(
        "Focus on Phase 3 clinical trials published after 2022. "
        "Compare semaglutide, tirzepatide, and liraglutide."
    ),
    report_format=(
        "Write a 2-page executive summary: "
        "1) Key Findings (bullet points), "
        "2) Comparison Table (drug, trial, primary endpoint, result), "
        "3) Clinical Implications (2 paragraphs). "
        "Use formal medical writing style."
    ),
)
```

> [!IMPORTANT]
> Combined length of `research_strategy` + `report_format` must not exceed **15,000 characters**.

---

## Search Configuration

### Restrict Sources

```python
task = valyu.deepresearch.create(
    query="Recent advances in quantum computing",
    search={"search_type": "proprietary"},
)

# Or target specific categories
task = valyu.deepresearch.create(
    query="Latest AI research",
    search={
        "search_type": "proprietary",
        "included_sources": ["academic", "web"],
    },
)
```

**Available source categories for DeepResearch:**
- `web` — General web search results
- `academic` — ArXiv, PubMed, BioRxiv/MedRxiv, Clinical trials, FDA, WHO, NIH, Wikipedia
- `finance` — Stock/crypto/FX prices, SEC filings, earnings, economic indicators
- `patent` — USPTO patent database
- `transportation` — UK Rail, maritime tracking
- `politics` — UK Parliament data
- `legal` — UK court judgments, legislation

### Source Biases (Soft Ranking)

```python
task = valyu.deepresearch.create(
    query="Environmental policy analysis",
    search={
        "source_biases": {
            "epa.gov": 5,      # Strong boost
            "nasa.gov": 3,     # Moderate boost
            "example.com": -4, # Strong demotion
        },
    },
)
```

### Date Filtering

```python
task = valyu.deepresearch.create(
    query="Recent AI developments",
    search={
        "start_date": "2024-01-01",
        "end_date": "2025-12-31",
    },
)
```

---

## File Attachments

Analyze documents as part of research:

```python
import base64

with open("report.pdf", "rb") as f:
    pdf_data = base64.b64encode(f.read()).decode()

task = valyu.deepresearch.create(
    query="Summarize key findings and compare with current market trends",
    mode="heavy",
    files=[{
        "data": f"data:application/pdf;base64,{pdf_data}",
        "filename": "report.pdf",
        "mediaType": "application/pdf",
        "context": "Q4 2024 financial report",
    }],
)
```

**Supported file types:**

| Type | Max Size |
|------|----------|
| PDF | 50 MB |
| PNG | 20 MB |
| JPEG | 20 MB |
| GIF | 20 MB |
| WebP | 20 MB |
| CSV | 10 MB |
| XLSX | 10 MB |
| DOCX | 10 MB |
| JSON | 10 MB |

---

## Human-in-the-Loop (HITL)

Pause research at key decision points for user review:

### Available Checkpoints

| Checkpoint | Phase | When |
|------------|-------|------|
| `planning_questions` | Pre-research | Agent asks clarifying questions |
| `plan_review` | Pre-research | User reviews research plan |
| `source_review` | Post-research | User filters sources by domain |
| `outline_review` | Post-research | User reviews report outline |

### HITL with Callback

```python
task = valyu.deepresearch.create(
    query="Analyze competitive landscape of AI chip manufacturers",
    mode="heavy",
    hitl={
        "planning_questions": True,
        "plan_review": True,
        "source_review": True,
        "outline_review": True,
    },
)

def handle_interaction(interaction):
    if interaction.type in ("plan_review", "outline_review"):
        return {"approved": True}
    elif interaction.type == "source_review":
        return {"included_domains": [], "excluded_domains": []}
    elif interaction.type == "planning_questions":
        return {
            "answers": [
                {"question": q["question"], "answer": "Use your best judgment"}
                for q in interaction.data["questions"]
            ]
        }
    return None

result = valyu.deepresearch.wait(
    task.deepresearch_id,
    on_interaction=handle_interaction,
)
print(result.output)
```

### HITL Status Values

| Status | Meaning |
|--------|---------|
| `awaiting_input` | Checkpoint active, fast resume on response |
| `paused` | Checkpoint timed out (5 min), respond anytime to resume |

> [!TIP]
> HITL works best with `heavy` or `max` modes where research is substantial enough to benefit from human guidance.

---

## Batch Processing

Run multiple research tasks in parallel:

```python
# Create a batch
batch = valyu.deepresearch.batches.create(
    mode="standard",
    output_formats=["markdown"],
)

# Add tasks
valyu.deepresearch.batches.add_tasks(
    batch.id,
    tasks=[
        {"query": "Market analysis for Company A"},
        {"query": "Market analysis for Company B"},
        {"query": "Market analysis for Company C"},
    ],
)

# Monitor
status = valyu.deepresearch.batches.status(batch.id)
print(f"Status: {status.status}")
print(f"Tasks: {status.completed_tasks}/{status.total_tasks}")
```

> [!NOTE]
> HITL is **not available** for batch requests.

---

## Application Examples

### Customer Due Diligence

```python
task = valyu.deepresearch.create(
    query=f"Comprehensive due diligence on {customer_name}",
    mode="heavy",
    research_strategy=(
        "Search SEC filings, news, patent databases, and litigation records. "
        "Focus on financial health, regulatory compliance, IP portfolio, and risk factors."
    ),
    report_format=(
        "Structure as: Executive Summary, Financial Overview, "
        "Regulatory & Compliance, IP Portfolio, Risk Assessment, Recommendations"
    ),
    search={
        "included_sources": ["finance", "legal", "patent", "web"],
        "start_date": "2022-01-01",
    },
)
```

### Competitive Landscape

```python
task = valyu.deepresearch.create(
    query="Competitive landscape of cloud compliance management platforms",
    mode="heavy",
    output_formats=[{
        "type": "object",
        "properties": {
            "competitors": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "market_share": {"type": "string"},
                        "key_features": {"type": "array", "items": {"type": "string"}},
                        "pricing": {"type": "string"},
                        "strengths": {"type": "array", "items": {"type": "string"}},
                        "weaknesses": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["name"],
                },
            },
            "market_trends": {"type": "array", "items": {"type": "string"}},
            "opportunity_gaps": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["competitors"],
    }],
)
```

### Regulatory Research

```python
task = valyu.deepresearch.create(
    query="Current FDA cybersecurity requirements for medical devices",
    mode="standard",
    search={
        "included_sources": ["academic", "web"],
        "source_biases": {
            "fda.gov": 5,
            "nist.gov": 4,
        },
        "start_date": "2023-01-01",
    },
    output_formats=["markdown", "pdf"],
)
```

---

## Task Management

```python
# Cancel a running task
valyu.deepresearch.cancel(task_id)

# Delete a completed task
valyu.deepresearch.delete(task_id)

# List all tasks
tasks = valyu.deepresearch.list()

# Toggle public access
valyu.deepresearch.toggle_public(task_id)

# Add follow-up instructions to a running task
valyu.deepresearch.update(task_id, instructions="Also investigate patent filings")
```

---

## See Also

- [Answer API](./15-ANSWER-API.md) — Quick Q&A without the async overhead
- [Contents API](./14-CONTENTS-API.md) — Extract data from specific URLs
- [Scientific Search](./17-SCIENTIFIC-SEARCH.md) — Domain-specific source patterns
- [Search Parameters](./05-SEARCH-PARAMETERS.md) — Advanced source filtering
