# 18 — Datasources Catalog: Complete Reference

> Full catalog of 36+ data sources available through the Valyu API.

This page provides a complete reference of every data source accessible via Valyu's
`search`, `answer`, and `deepresearch` APIs. Use source identifiers in `included_sources`
or `excluded_sources` to control where your queries search.

---

## How to Use This Catalog

### In Search API

```python
response = valyu.search(
    query="your query",
    search_type="proprietary",
    included_sources=["valyu/valyu-pubmed", "valyu/valyu-arxiv"],
)
```

### In Answer API

```python
answer = valyu.answer(
    query="your question",
    included_sources=["valyu/valyu-sec", "valyu/valyu-fred"],
)
```

### In DeepResearch API

DeepResearch uses **category names** instead of individual source IDs:

```python
task = valyu.deepresearch.create(
    query="your research topic",
    search={"included_sources": ["academic", "finance"]},
)
```

### Discover Programmatically

```python
# List all available sources
sources = valyu.datasources.list()
for s in sources:
    print(f"{s['id']}: {s['name']} ({s['category']})")

# List available categories
categories = valyu.datasources.categories()
```

---

## Academic & Research

| Source ID | Database | Content | Coverage |
|-----------|----------|---------|----------|
| `valyu/valyu-arxiv` | arXiv | Preprints in physics, math, CS, biology, finance, economics | 2.4M+ papers |
| `valyu/valyu-pubmed` | PubMed / MEDLINE | Biomedical literature, life sciences | 35M+ citations |
| `valyu/valyu-biorxiv` | bioRxiv | Biology preprints (neuroscience, genomics, etc.) | 300K+ preprints |
| `valyu/valyu-medrxiv` | medRxiv | Health and medical preprints | 80K+ preprints |
| `valyu/valyu-wikipedia` | Wikipedia | Encyclopedia articles | Full English Wikipedia |

**DeepResearch category:** `academic`

---

## Healthcare & Life Sciences

| Source ID | Database | Content | Coverage |
|-----------|----------|---------|----------|
| `valyu/valyu-clinical-trials` | ClinicalTrials.gov | Clinical study registry | 480K+ studies |
| `valyu/valyu-drug-labels` | DailyMed / FDA | Official FDA drug labeling | 140K+ labels |
| `valyu/valyu-chembl` | ChEMBL | Bioactive molecules, assay data | 2.4M+ compounds |
| `valyu/valyu-pubchem` | PubChem | Chemical structures, bioassays | 110M+ compounds |
| `valyu/valyu-drugbank` | DrugBank | Drug and target database | 16K+ drug entries |
| `valyu/valyu-open-targets` | Open Targets | Target-disease associations | Genome-wide associations |

**DeepResearch category:** included in `academic`

---

## Financial & Economic

### Market Data

| Source ID | Database | Content | Coverage |
|-----------|----------|---------|----------|
| `valyu/valyu-stocks` | Stock Prices | Real-time and historical equity prices | Global markets |
| `valyu/valyu-crypto` | Crypto Prices | Cryptocurrency price data | Major exchanges |
| `valyu/valyu-forex` | FX Rates | Foreign exchange rates | Major currency pairs |
| `valyu/valyu-etfs` | ETF Data | Exchange-traded fund prices and info | US/EU ETFs |
| `valyu/valyu-funds` | Fund Data | Mutual fund and fund data | Major funds |
| `valyu/valyu-commodities` | Commodities | Commodity prices (oil, gold, etc.) | Major commodities |

### Corporate Filings

| Source ID | Database | Content | Coverage |
|-----------|----------|---------|----------|
| `valyu/valyu-sec` | SEC EDGAR | SEC filings (10-K, 10-Q, 8-K, 13F) | All public companies |
| `valyu/valyu-earnings-US` | Earnings Data | Quarterly earnings reports | US public companies |
| `valyu/valyu-balance-sheet-US` | Balance Sheets | Corporate balance sheet data | US public companies |
| `valyu/valyu-income-statement-US` | Income Statements | Revenue, expenses, profit data | US public companies |
| `valyu/valyu-cash-flow-US` | Cash Flow Statements | Operating, investing, financing flows | US public companies |
| `valyu/valyu-dividends-US` | Dividend Data | Dividend history and yields | US public companies |
| `valyu/valyu-insider-transactions-US` | Insider Transactions | SEC Form 4 insider trading data | US public companies |

### Economic Indicators

| Source ID | Database | Content | Coverage |
|-----------|----------|---------|----------|
| `valyu/valyu-fred` | FRED | Federal Reserve Economic Data | 800K+ time series |
| `valyu/valyu-bls` | BLS | Bureau of Labor Statistics | US labor market data |

**DeepResearch category:** `finance`

---

## Legal & Government

| Source ID | Database | Content | Coverage |
|-----------|----------|---------|----------|
| `valyu/valyu-patents` | USPTO | Patent filings and grants | US patents |
| `valyu/valyu-uk-parliament` | UK Parliament | Parliamentary proceedings, Hansard | UK government |
| `valyu/valyu-uk-court-judgments` | UK Courts | Court judgments and decisions | UK judiciary |
| `valyu/valyu-uk-legislation` | UK Legislation | Acts and statutory instruments | UK law |

**DeepResearch categories:** `patent`, `legal`, `politics`

---

## Transportation & Logistics

| Source ID | Database | Content | Coverage |
|-----------|----------|---------|----------|
| `valyu/valyu-uk-rail` | UK Rail | Train schedules, disruptions | UK railway network |
| `valyu/valyu-maritime` | Maritime AIS | Vessel tracking, port data | Global shipping |

**DeepResearch category:** `transportation`

---

## Web & News

| Source ID | Database | Content | Coverage |
|-----------|----------|---------|----------|
| (web search) | Web | General web search results | Global internet |
| (news search) | News | News articles from major outlets | Global news |

Access via `search_type="web"` or `search_type="news"` rather than source IDs.

**DeepResearch category:** `web`

---

## DeepResearch Category Mapping

When using the DeepResearch API, use these category names instead of individual source IDs:

| Category | Included Sources |
|----------|-----------------|
| `web` | General web search |
| `academic` | arXiv, PubMed, bioRxiv, medRxiv, clinical trials, FDA, WHO, NIH, Wikipedia |
| `finance` | Stocks, crypto, FX, ETFs, funds, commodities, SEC filings, earnings, economic data |
| `patent` | USPTO patents |
| `transportation` | UK Rail, maritime tracking |
| `politics` | UK Parliament data |
| `legal` | UK court judgments, UK legislation |

```python
# DeepResearch with multiple categories
task = valyu.deepresearch.create(
    query="Pharmaceutical patent landscape for mRNA technologies",
    search={"included_sources": ["academic", "patent"]},
)
```

---

## Source Selection Guide

### By Use Case

| Use Case | Recommended Sources |
|----------|-------------------|
| Drug development research | `chembl` + `drugbank` + `clinical-trials` + `open-targets` |
| Literature review | `pubmed` + `arxiv` + `biorxiv` + `medrxiv` |
| Competitive intelligence | `sec` + `patents` + web search |
| Financial due diligence | `sec` + `earnings-US` + `balance-sheet-US` + `fred` |
| Regulatory compliance | `drug-labels` + `clinical-trials` + web search |
| Market analysis | `stocks` + `etfs` + `fred` + `bls` |
| IP landscape | `patents` + `arxiv` |
| Clinical safety | `drug-labels` + `clinical-trials` + `pubmed` |

### By Query Type

| Query Type | Use `search_type` | Use `included_sources` |
|-----------|-------------------|----------------------|
| General knowledge | `all` | (none needed) |
| Academic only | `proprietary` | Academic source IDs |
| Financial only | `proprietary` | Financial source IDs |
| Current events | `news` | (none needed) |
| Mixed academic + web | `all` | Academic source IDs |

---

## Pricing by Source

| Source Category | Price per Result |
|----------------|-----------------|
| Web search | ~$0.001 |
| Academic (arXiv, PubMed) | ~$0.002 |
| Financial (SEC, FRED) | ~$0.003 |
| Premium (DrugBank, ChEMBL) | ~$0.005 |

> [!NOTE]
> Actual pricing varies by plan. Use `data_max_price` to set hard budget caps per query.
> Check [platform.valyu.ai](https://platform.valyu.ai) for current pricing.

---

## See Also

- [Scientific Search](./17-SCIENTIFIC-SEARCH.md) — Domain-specific routing patterns
- [Search Parameters](./05-SEARCH-PARAMETERS.md) — Advanced filtering with these sources
- [Collections](./07-COLLECTIONS.md) — Create reusable source collections
- [Specialized Datasets](./06-SPECIALIZED-DATASETS.md) — Overview of dataset categories
