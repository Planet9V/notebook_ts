# 06 — Specialized Datasets

> Academic, financial, medical, and patent datasets — Valyu's competitive advantage.

Valyu offers datasets beyond standard web search. Browse them at [platform.valyu.ai/data-sources](https://platform.valyu.ai/data-sources).

## Dataset Categories

### Research & Academic

| Dataset ID | Description | Records | Cost |
|-----------|-------------|---------|------|
| `valyu/valyu-arxiv` | Physics, CS, math, quant finance preprints | 2.5M+ | ~$0.50/1k |
| `valyu/valyu-pubmed` | Biomedical and life sciences literature | 37M+ | ~$0.50/1k |
| `valyu/valyu-biorxiv` | Life sciences preprints | varies | ~$0.50/1k |
| `valyu/valyu-medrxiv` | Health and clinical research preprints | varies | ~$0.50/1k |

```python
# Academic paper search
response = valyu.search(
    "CRISPR gene editing clinical trials safety outcomes",
    search_type="proprietary",
    included_sources=["valyu/valyu-pubmed", "valyu/valyu-US-clinical-trials"],
    category="paper",
    max_price=30.0
)
```

### Healthcare & Life Sciences

| Dataset ID | Description | Cost |
|-----------|-------------|------|
| `valyu/valyu-US-clinical-trials` | ClinicalTrials.gov study data (500K+) | ~$0.50/1k |
| `valyu/valyu-drug-labels` | FDA-approved medication labeling (DailyMed) | ~$0.50/1k |
| `valyu/valyu-chembl` | Bioactive molecules, drug-like properties (2.5M+) | varies |
| `valyu/valyu-pubchem` | Chemical compounds, molecular structures | varies |

```python
# Clinical trials research
response = valyu.search(
    "Phase III immunotherapy NSCLC progression-free survival",
    search_type="proprietary",
    included_sources=[
        "valyu/valyu-US-clinical-trials",
        "valyu/valyu-pubmed",
        "valyu/valyu-drug-labels"
    ],
    category="bio",
    max_price=30.0
)
```

### Financial & Market Data

| Source | Details | Cost |
|--------|---------|------|
| `valyu/valyu-US-sec-filings` | SEC 10-K, 10-Q, 8-K, 13F, 13D/13G (3M+) | ~$8.00/1k |
| `valyu/valyu-stocks` | Real-time stock prices (75+ exchanges) | ~$8.00/1k |
| `valyu/valyu-earnings-US` | Quarterly earnings reports | ~$8.00/1k |
| Real-time market data | Crypto, forex, ETFs, commodities | ~$8.00/1k |
| Economic indicators | FRED, BLS, World Bank | varies |

```python
# SEC filings search
response = valyu.search(
    "Tesla Q3 2024 earnings revenue breakdown",
    search_type="proprietary",
    included_sources=["valyu/valyu-US-sec-filings", "valyu/valyu-earnings-US"],
    category="sec",
    max_price=60.0
)
```

### Patents

| Dataset ID | Description | Records |
|-----------|-------------|--------|
| `valyu/valyu-patents` | USPTO utility, design, and plant patents | 8M+ |

```python
# Patent search
response = valyu.search(
    "autonomous vehicle LiDAR sensor fusion patent claims",
    search_type="proprietary",
    included_sources=["valyu/valyu-patents"],
    category="patent",
    max_price=30.0
)
```

## Application-Specific Dataset Mapping

Our application features should use these datasets:

| Feature | Primary Datasets | Category |
|---------|-----------------|----------|
| Compliance/CSET Research | `valyu/valyu-arxiv`, `valyu/valyu-pubmed` | `paper` |
| Prospect Financial Analysis | `valyu/valyu-US-sec-filings`, `valyu/valyu-earnings-US` | `sec`, `finance` |
| Threat Intelligence | Web search + `start_date` filtering | `news` |
| Industry Research | `valyu/valyu-arxiv` + web | `research` |
| Competitive Analysis | Web + `valyu/valyu-US-sec-filings` | `web`, `sec` |
| Patent Landscape | `valyu/valyu-patents` | `patent` |
| Drug/Device Compliance | `valyu/valyu-drug-labels`, `valyu/valyu-US-clinical-trials` | `bio` |

## Recommended Collections

Pre-build these Collections on [platform.valyu.ai](https://platform.valyu.ai/user/collections):

### `tetrel-compliance`
- `valyu/valyu-arxiv`
- `valyu/valyu-pubmed`
- `nist.gov`
- `cisa.gov`
- `iec.ch`

### `tetrel-financial`
- `valyu/valyu-US-sec-filings`
- `valyu/valyu-stocks`
- `valyu/valyu-earnings-US`
- `sec.gov`
- `treasury.gov`

### `tetrel-threat-intel`
- `cve.org`
- `nvd.nist.gov`
- `us-cert.cisa.gov`
- `bleepingcomputer.com`
- `therecord.media`

---

> **Next**: [07 — Collections](./07-COLLECTIONS.md) — Creating and using reusable source bundles.
