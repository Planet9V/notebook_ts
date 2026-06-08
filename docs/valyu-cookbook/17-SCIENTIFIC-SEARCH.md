# 17 — Scientific Search: Domain-Specific Research Patterns

> Route scientific queries to the right specialized databases for high-signal results.

Valyu provides access to 13+ scientific databases via a single API. Instead of searching
"all" sources, restrict `included_sources` to domain-specific datasets for dramatically
better precision and relevance.

---

## The Scientific Skills Pattern

The [scientific-skills](https://github.com/yorkeccak/scientific-skills) repository codifies
a proven pattern: each scientific domain gets a **dedicated search skill** that routes to the
correct Valyu source identifiers. This cookbook page documents those patterns for direct use
in your codebase.

---

## Source Routing Table

### Individual Sources

| Domain | Valyu Source ID | Database | Content |
|--------|----------------|----------|---------|
| Biomedical Literature | `valyu/valyu-pubmed` | PubMed | 35M+ citations, full-text articles |
| Physics/CS/Math | `valyu/valyu-arxiv` | arXiv | Preprints across STEM |
| Biology Preprints | `valyu/valyu-biorxiv` | bioRxiv | Biology preprints, neuroscience, genomics |
| Medical Preprints | `valyu/valyu-medrxiv` | medRxiv | Health/medical preprints |
| Bioactive Molecules | `valyu/valyu-chembl` | ChEMBL | Drug-like compounds, bioactivity data |
| Drug Information | `valyu/valyu-drugbank` | DrugBank | Drugs, targets, pharmacology |
| Clinical Studies | `valyu/valyu-clinical-trials` | ClinicalTrials.gov | Clinical trial registry |
| FDA Drug Labels | `valyu/valyu-drug-labels` | DailyMed | Official FDA labeling |
| Drug Targets | `valyu/valyu-open-targets` | Open Targets | Target-disease associations |
| Chemical Compounds | `valyu/valyu-pubchem` | PubChem | Chemical structures, bioassays |
| Patents | `valyu/valyu-patents` | USPTO | Patent filings worldwide |
| Financial Filings | `valyu/valyu-sec` | SEC EDGAR | 10-K, 10-Q, 8-K, 13F |
| Economic Data | `valyu/valyu-fred` | FRED | Federal Reserve economic data |

### Aggregated Bundles

| Bundle | Sources | Best For |
|--------|---------|----------|
| **Literature** | pubmed + arxiv + biorxiv + medrxiv | General scientific lit reviews |
| **Biomedical** | pubmed + biorxiv + medrxiv + clinical-trials + drug-labels | Medical/clinical research |
| **Drug Discovery** | chembl + drugbank + drug-labels + open-targets | Drug development workflows |
| **Financial** | sec + fred + bls + stocks + earnings | Financial analysis |

---

## Python Implementation

### Scientific Search Router

```python
from valyu import Valyu
from typing import Optional

valyu = Valyu()

# Source bundles — reusable across your app
SCIENTIFIC_BUNDLES = {
    "literature": [
        "valyu/valyu-pubmed",
        "valyu/valyu-arxiv",
        "valyu/valyu-biorxiv",
        "valyu/valyu-medrxiv",
    ],
    "biomedical": [
        "valyu/valyu-pubmed",
        "valyu/valyu-biorxiv",
        "valyu/valyu-medrxiv",
        "valyu/valyu-clinical-trials",
        "valyu/valyu-drug-labels",
    ],
    "drug_discovery": [
        "valyu/valyu-chembl",
        "valyu/valyu-drugbank",
        "valyu/valyu-drug-labels",
        "valyu/valyu-open-targets",
    ],
    "chemistry": [
        "valyu/valyu-pubchem",
        "valyu/valyu-chembl",
    ],
    "clinical": [
        "valyu/valyu-clinical-trials",
        "valyu/valyu-drug-labels",
        "valyu/valyu-pubmed",
    ],
    "financial": [
        "valyu/valyu-sec",
        "valyu/valyu-fred",
        "valyu/valyu-bls",
    ],
}

def scientific_search(
    query: str,
    bundle: str = "literature",
    max_results: int = 10,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """Route a scientific query to the appropriate Valyu sources."""
    sources = SCIENTIFIC_BUNDLES.get(bundle)
    if not sources:
        raise ValueError(f"Unknown bundle: {bundle}. Choose from: {list(SCIENTIFIC_BUNDLES.keys())}")

    params = {
        "query": query,
        "search_type": "proprietary",
        "included_sources": sources,
        "max_num_results": max_results,
    }
    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date

    return valyu.search(**params)
```

### Usage Examples

```python
# Cancer biology literature review
results = scientific_search(
    "TP53 tumor suppression mechanisms in breast cancer",
    bundle="literature",
    max_results=20,
)

# Drug interaction check
results = scientific_search(
    "metformin drug interactions cytochrome P450",
    bundle="drug_discovery",
)

# Find active clinical trials
results = scientific_search(
    "GLP-1 receptor agonist phase 3 trials obesity",
    bundle="clinical",
    start_date="2024-01-01",
)

# Financial regulatory research
results = scientific_search(
    "SEC cybersecurity disclosure requirements",
    bundle="financial",
)
```

---

## TypeScript Implementation

```typescript
import { Valyu } from 'valyu-js';

const valyu = new Valyu();

const SCIENTIFIC_BUNDLES: Record<string, string[]> = {
  literature: [
    'valyu/valyu-pubmed',
    'valyu/valyu-arxiv',
    'valyu/valyu-biorxiv',
    'valyu/valyu-medrxiv',
  ],
  biomedical: [
    'valyu/valyu-pubmed',
    'valyu/valyu-biorxiv',
    'valyu/valyu-medrxiv',
    'valyu/valyu-clinical-trials',
    'valyu/valyu-drug-labels',
  ],
  drugDiscovery: [
    'valyu/valyu-chembl',
    'valyu/valyu-drugbank',
    'valyu/valyu-drug-labels',
    'valyu/valyu-open-targets',
  ],
  chemistry: [
    'valyu/valyu-pubchem',
    'valyu/valyu-chembl',
  ],
  clinical: [
    'valyu/valyu-clinical-trials',
    'valyu/valyu-drug-labels',
    'valyu/valyu-pubmed',
  ],
  financial: [
    'valyu/valyu-sec',
    'valyu/valyu-fred',
    'valyu/valyu-bls',
  ],
};

async function scientificSearch(
  query: string,
  bundle: keyof typeof SCIENTIFIC_BUNDLES = 'literature',
  maxResults = 10,
  options?: { startDate?: string; endDate?: string },
) {
  const sources = SCIENTIFIC_BUNDLES[bundle];
  if (!sources) throw new Error(`Unknown bundle: ${bundle}`);

  return valyu.search(query, {
    search_type: 'proprietary',
    included_sources: sources,
    max_num_results: maxResults,
    ...(options?.startDate && { start_date: options.startDate }),
    ...(options?.endDate && { end_date: options.endDate }),
  });
}
```

---

## Single-Source Search Patterns

When you know exactly which database to target:

### PubMed — Biomedical Literature

```python
response = valyu.search(
    query="CRISPR-Cas9 off-target effects mitigation strategies",
    search_type="proprietary",
    included_sources=["valyu/valyu-pubmed"],
    max_num_results=20,
)
```

### arXiv — CS/Physics/Math Preprints

```python
response = valyu.search(
    query="transformer architecture attention mechanism efficiency",
    search_type="proprietary",
    included_sources=["valyu/valyu-arxiv"],
    max_num_results=15,
)
```

### ChEMBL — Bioactive Molecules

```python
response = valyu.search(
    query="EGFR inhibitor selectivity profiles kinase assays",
    search_type="proprietary",
    included_sources=["valyu/valyu-chembl"],
    max_num_results=10,
)
```

### DrugBank — Drug Information

```python
response = valyu.search(
    query="metformin mechanism of action AMPK pathway",
    search_type="proprietary",
    included_sources=["valyu/valyu-drugbank"],
    max_num_results=10,
)
```

### Clinical Trials

```python
response = valyu.search(
    query="checkpoint inhibitor combination immunotherapy phase 3",
    search_type="proprietary",
    included_sources=["valyu/valyu-clinical-trials"],
    max_num_results=15,
)
```

### FDA Drug Labels

```python
response = valyu.search(
    query="warfarin drug interactions contraindications black box warnings",
    search_type="proprietary",
    included_sources=["valyu/valyu-drug-labels"],
    max_num_results=10,
)
```

### Open Targets — Disease Associations

```python
response = valyu.search(
    query="BRCA1 cancer associations genetic evidence drug targets",
    search_type="proprietary",
    included_sources=["valyu/valyu-open-targets"],
    max_num_results=10,
)
```

### Patents

```python
response = valyu.search(
    query="CRISPR delivery vectors lipid nanoparticle patent",
    search_type="proprietary",
    included_sources=["valyu/valyu-patents"],
    max_num_results=15,
)
```

---

## Combining with Answer API

Use the Answer API with scientific source restrictions for cited answers:

```python
answer = valyu.answer(
    query="What are the latest FDA-approved treatments for type 2 diabetes?",
    search_type="proprietary",
    included_sources=[
        "valyu/valyu-pubmed",
        "valyu/valyu-clinical-trials",
        "valyu/valyu-drug-labels",
    ],
    system_instructions=(
        "Provide a clinician-level summary. Include drug names, "
        "mechanisms of action, and approval dates."
    ),
)
```

---

## Combining with DeepResearch API

Run comprehensive scientific research as a background task:

```python
task = valyu.deepresearch.create(
    query="Comprehensive review of mRNA vaccine technology advances since 2020",
    mode="heavy",
    search={
        "search_type": "proprietary",
        "included_sources": ["academic"],
        "start_date": "2020-01-01",
    },
    research_strategy=(
        "Focus on peer-reviewed publications in PubMed and bioRxiv. "
        "Cover lipid nanoparticle delivery, mRNA stability improvements, "
        "and new therapeutic applications beyond COVID-19."
    ),
    report_format=(
        "Structure as: Introduction, Technology Overview, "
        "Key Advances (by year), Clinical Pipeline, Future Directions. "
        "Include a summary table of major clinical trials."
    ),
)
```

---

## Query Writing for Scientific Sources

> [!IMPORTANT]
> Scientific databases respond best to domain-specific terminology. Generic language returns generic results.

### Good Queries

```
✅ "TP53 tumor suppression mechanisms apoptosis pathway"
✅ "EGFR inhibitor selectivity profiles kinase panel"
✅ "GLP-1 receptor agonist cardiovascular outcomes MACE"
✅ "CRISPR-Cas9 off-target effects whole-genome sequencing"
```

### Bad Queries

```
❌ "Tell me about cancer genes"
❌ "Drug stuff for diabetes"
❌ "What is the heart medicine"
❌ "Chemistry things"
```

### Query Patterns by Domain

| Domain | Include in Query |
|--------|-----------------|
| Biomedical | Gene names, pathways, MeSH terms |
| Chemistry | IUPAC names, compound IDs, structural descriptors |
| Clinical | Phase (1-4), indication, endpoint type |
| Drug Discovery | Target protein, assay type, selectivity |
| Financial | Ticker symbols, filing type (10-K, 10-Q), metric names |

---

## See Also

- [Datasources Catalog](./18-DATASOURCES-CATALOG.md) — Full list of 36+ data sources
- [Search Parameters](./05-SEARCH-PARAMETERS.md) — Advanced filtering
- [Prompting Guide](./02-PROMPTING-GUIDE.md) — General query writing
- [Answer API](./15-ANSWER-API.md) — Get cited answers from scientific sources
- [DeepResearch API](./16-DEEPRESEARCH-API.md) — Multi-step research reports
