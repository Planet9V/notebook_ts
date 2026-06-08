# 07 — Collections

> Create reusable source bundles for your searches.
>
> Source: [docs.valyu.ai/search/filtering/collections](https://docs.valyu.ai/search/filtering/collections)

> **NOTE**: Collections are in **beta**. Create and manage them at [platform.valyu.ai/user/collections](https://platform.valyu.ai/user/collections).

## What Collections Do

- **Save source combinations** — Bundle frequently-used domains and datasets
- **Simplify API calls** — Reference multiple sources with a single name
- **Share with your team** — All org members can use your collections
- **Generate with AI** — Let AI suggest sources based on your research needs

## Creating a Collection

1. Go to [Collections](https://platform.valyu.ai/user/collections)
2. Click **Create Collection**
3. Add sources (Valyu datasets, domains, or URLs)
4. Save with a memorable name

Or use **Generate with AI** to automatically suggest relevant sources.

## Using Collections in Code

Reference collections with the `collection:` prefix in `included_sources`:

### Python
```python
from valyu import Valyu

valyu = Valyu()
response = valyu.search(
    query="latest quarterly earnings reports",
    included_sources=["collection:tetrel-financial"]
)
```

### TypeScript
```typescript
import { Valyu } from 'valyu-js';

const valyu = new Valyu();
const response = await valyu.search(
  'latest quarterly earnings reports',
  { includedSources: ['collection:tetrel-financial'] }
);
```

## Combining Collections and Sources

Mix collections with individual sources:

```python
response = valyu.search(
    query="biotech company clinical trial results",
    included_sources=[
        "collection:tetrel-compliance",   # Saved collection
        "github.com",                      # Additional domain
        "valyu/valyu-patents"               # Additional dataset
    ]
)
```

## Our Application Collections

### `tetrel-compliance`
| Source | Purpose |
|--------|--------|
| `valyu/valyu-arxiv` | Security research papers |
| `valyu/valyu-pubmed` | Health/safety compliance |
| `nist.gov` | NIST CSF, SP 800 series |
| `cisa.gov` | CISA advisories, CSET |
| `iec.ch` | IEC 62443, IEC 61508 |

### `tetrel-financial`
| Source | Purpose |
|--------|--------|
| `valyu/valyu-US-sec-filings` | 10-K, 10-Q, 8-K analysis |
| `valyu/valyu-stocks` | Real-time stock prices |
| `valyu/valyu-earnings-US` | Quarterly earnings |
| `sec.gov` | Direct SEC access |
| `treasury.gov` | Treasury data |

### `tetrel-threat-intel`
| Source | Purpose |
|--------|--------|
| `cve.org` | CVE database |
| `nvd.nist.gov` | National vulnerability database |
| `us-cert.cisa.gov` | ICS-CERT advisories |
| `bleepingcomputer.com` | Security news |
| `therecord.media` | Cybersecurity journalism |

### `tetrel-academic`
| Source | Purpose |
|--------|--------|
| `valyu/valyu-arxiv` | CS/Math/Physics preprints |
| `valyu/valyu-pubmed` | Biomedical literature |
| `valyu/valyu-biorxiv` | Life sciences preprints |
| `scholar.google.com` | Broad academic search |

## Integration with Improvement Options

### Option 1 (Drop-In)
Collections simplify the engine replacement — instead of mapping engine names to source lists, each engine mode maps to a collection.

### Option 2 (Smart Research)
The `SearchRouter` class references collections by context:
```python
ROUTE_MAP = {
    "compliance": {"included_sources": ["collection:tetrel-compliance"]},
    "financial":  {"included_sources": ["collection:tetrel-financial"]},
    "threat":     {"included_sources": ["collection:tetrel-threat-intel"]},
}
```

### Option 3 (Research Platform)
Valyu DeepResearch API accepts `search_sources` which supports collections:
```python
task = valyu.deepresearch.create(
    query="...",
    search_sources=["collection:tetrel-compliance"]
)
```

### Option 4 (Intelligence Engine)
Autonomous missions auto-select collections based on research context.

## Error Handling

If a collection doesn't exist:
```json
{
  "success": true,
  "warnings": ["Collection 'unknown-collection' not found"],
  "results": [...]
}
```

The search continues with other valid sources.

## Best Practices

1. **Use descriptive names**: `tetrel-compliance`, `tetrel-financial`, not `my-collection-1`
2. **Keep collections focused**: Multiple small collections > one catch-all
3. **Document your collections**: Add descriptions for team members
4. **Review periodically**: Update as new datasets become available

---

> **Next**: [08 — Managing Context](./08-MANAGING-CONTEXT.md) — Token budgets and LLM context window optimization.
