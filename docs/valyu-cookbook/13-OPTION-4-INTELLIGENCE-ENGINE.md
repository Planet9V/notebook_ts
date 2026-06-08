# 13 — Option 4: Intelligence Engine 🔴

> Autonomous missions + self-improving prompts + CRM enrichment.
>
> **Effort**: 4-6 weeks | **Risk**: High | **Impact**: Autonomous intelligence platform

---

## Summary

Options 1-3 + the entire app becomes an autonomous research-to-output machine. Research Missions orchestrate multi-step intelligence gathering. Prompts self-improve via feedback loops. CRM customers auto-enrich with financial, SEC, and threat intelligence data.

---

## Prerequisites

- Options 1, 2, and 3 completed
- Postgres research memory operational
- DeepResearch webhooks verified
- CRM/customer data model in place

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Intelligence Engine                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Research    │    │     CRM      │    │   Feedback   │  │
│  │   Missions    │    │  Enrichment  │    │     Loop     │  │
│  │              │    │              │    │              │  │
│  │ Multi-step   │    │ Auto-enrich  │    │ Self-tuning  │  │
│  │ parallel     │    │ financial +  │    │ search       │  │
│  │ research     │    │ SEC + threat │    │ parameters   │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │          │
│         └───────────────────┼───────────────────┘          │
│                             ▼                              │
│                  ┌─────────────────────┐                   │
│                  │  Research Memory    │                   │
│                  │  (pgvector)         │                   │
│                  └─────────────────────┘                   │
│                             │                              │
│                             ▼                              │
│                  ┌─────────────────────┐                   │
│                  │  Transformation     │                   │
│                  │  Engine             │                   │
│                  │  (briefs, podcasts, │                   │
│                  │   posts, reports)   │                   │
│                  └─────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Code: Research Missions

A Research Mission is a multi-step, goal-oriented intelligence gathering operation. It runs multiple DeepResearch tasks in parallel, merges results, and auto-generates deliverables.

```python
import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from enum import Enum

class MissionStatus(Enum):
    PENDING = "pending"
    RESEARCHING = "researching"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class ResearchMission:
    """Autonomous multi-step research operation.
    
    A mission defines a research goal, target customer, and desired
    deliverables. The engine decomposes the goal into parallel 
    research tasks, executes them, merges results, and generates
    all requested outputs.
    
    Example:
        mission = ResearchMission(
            goal="Full due diligence on Acme Corp acquisition target",
            customer_id="cust_123",
            deliverables=["executive_brief", "risk_report", "podcast_episode"],
        )
        await mission.execute()
    """
    goal: str
    customer_id: str
    deliverables: list[str]  # ["executive_brief", "podcast_episode", "linkedin_post"]
    
    id: str = field(default_factory=lambda: f"mission_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
    status: MissionStatus = MissionStatus.PENDING
    customer: Optional[object] = None
    results: list = field(default_factory=list)
    error: Optional[str] = None
    
    async def execute(self):
        """Execute the full research mission lifecycle.
        
        1. Load customer context
        2. Decompose goal into parallel research tasks
        3. Execute all tasks concurrently via DeepResearch
        4. Merge and deduplicate results
        5. Generate each requested deliverable
        6. Store everything in research memory
        """
        try:
            self.status = MissionStatus.RESEARCHING
            self.customer = await Customer.get(self.customer_id)
            
            # Step 1: Decompose into parallel research tasks
            tasks = self._decompose_research_tasks()
            
            # Step 2: Launch all tasks via Valyu DeepResearch
            valyu = Valyu(api_key=await get_api_key("valyu"))
            deep_tasks = [
                valyu.deepresearch.create(
                    query=task["query"],
                    mode=task.get("mode", "standard"),
                    search_sources=task.get("sources", ["web"]),
                    output_format="markdown",
                )
                for task in tasks
            ]
            
            # Step 3: Wait for all tasks to complete
            self.results = await asyncio.gather(*[
                valyu.deepresearch.wait(t.deepresearch_id)
                for t in deep_tasks
            ])
            
            # Step 4: Generate deliverables
            self.status = MissionStatus.GENERATING
            for deliverable in self.deliverables:
                await self.generate_deliverable(deliverable, self.results)
            
            # Step 5: Store in research memory
            await self._store_in_memory()
            
            self.status = MissionStatus.COMPLETED
            
        except Exception as e:
            self.status = MissionStatus.FAILED
            self.error = str(e)
            raise
    
    def _decompose_research_tasks(self) -> list[dict]:
        """Break the mission goal into parallel research tasks.
        
        Uses the customer context to generate targeted sub-queries.
        """
        tasks = [
            {
                "query": f"Company profile and overview for {self.customer.name}",
                "mode": "standard",
                "sources": ["collection:tetrel-financial", "web"],
            },
            {
                "query": f"Industry trends and competitive landscape for {self.customer.sector}",
                "mode": "standard",
                "sources": ["web", "collection:tetrel-academic"],
            },
            {
                "query": f"Recent news and developments for {self.customer.name}",
                "mode": "fast",
                "sources": ["web"],
            },
        ]
        
        # Add SEC filings task if US company
        if self.customer.country == "US":
            tasks.append({
                "query": f"{self.customer.name} SEC 10-K 10-Q annual report",
                "mode": "standard",
                "sources": ["valyu/valyu-US-sec-filings"],
            })
        
        # Add threat intel task if cybersecurity context
        if "security" in self.goal.lower() or "threat" in self.goal.lower():
            tasks.append({
                "query": f"{self.customer.name} cybersecurity incidents vulnerabilities",
                "mode": "heavy",
                "sources": ["collection:tetrel-threat-intel", "web"],
            })
        
        return tasks
    
    async def generate_deliverable(self, deliverable_type: str, results: list):
        """Generate a specific deliverable from research results.
        
        Routes to the appropriate transformation pipeline based on
        deliverable type.
        """
        merged_content = "\n\n---\n\n".join([
            r.output for r in results if r.output
        ])
        
        generators = {
            "executive_brief": self._generate_executive_brief,
            "risk_report": self._generate_risk_report,
            "podcast_episode": self._generate_podcast,
            "linkedin_post": self._generate_linkedin_post,
            "email_summary": self._generate_email_summary,
            "slide_deck": self._generate_slide_deck,
        }
        
        generator = generators.get(deliverable_type)
        if generator:
            await generator(merged_content)
        else:
            raise ValueError(f"Unknown deliverable type: {deliverable_type}")
    
    async def _generate_executive_brief(self, content: str):
        """Generate a 2-page executive brief from research."""
        prompt = f"""Based on the following research about {self.customer.name}, 
        generate a concise executive brief (max 2 pages) covering:
        1. Company overview and key metrics
        2. Recent developments
        3. Strategic implications
        4. Recommended actions
        
        Research:
        {content[:15000]}"""
        
        result = await llm_generate(prompt, model="gpt-4o")
        await store_deliverable(self.id, "executive_brief", result)
    
    async def _generate_risk_report(self, content: str):
        """Generate a risk assessment report."""
        prompt = f"""Analyze the following research for risk factors affecting 
        {self.customer.name}. Categorize risks as:
        - Financial risks
        - Regulatory/compliance risks
        - Cybersecurity risks
        - Market/competitive risks
        - Reputational risks
        
        Rate each risk: Low / Medium / High / Critical
        
        Research:
        {content[:15000]}"""
        
        result = await llm_generate(prompt, model="gpt-4o")
        await store_deliverable(self.id, "risk_report", result)
    
    async def _generate_podcast(self, content: str):
        """Queue a podcast episode generation from research."""
        await queue_transformation({
            "type": "podcast",
            "mission_id": self.id,
            "customer_name": self.customer.name,
            "content": content[:20000],
        })
    
    async def _generate_linkedin_post(self, content: str):
        """Generate a LinkedIn thought leadership post."""
        prompt = f"""Write a LinkedIn post (max 1300 characters) sharing a key 
        insight from this research about {self.customer.sector}. 
        Professional tone, include a call-to-action.
        
        Research:
        {content[:5000]}"""
        
        result = await llm_generate(prompt, model="gpt-4o")
        await store_deliverable(self.id, "linkedin_post", result)
    
    async def _generate_email_summary(self, content: str):
        """Generate an email-ready summary."""
        prompt = f"""Write a brief email summary (3-4 paragraphs) of the key 
        findings from this research on {self.customer.name}. 
        Include the most actionable insights.
        
        Research:
        {content[:10000]}"""
        
        result = await llm_generate(prompt, model="gpt-4o")
        await store_deliverable(self.id, "email_summary", result)
    
    async def _generate_slide_deck(self, content: str):
        """Queue a slide deck generation from research."""
        await queue_transformation({
            "type": "slide_deck",
            "mission_id": self.id,
            "customer_name": self.customer.name,
            "content": content[:20000],
        })
    
    async def _store_in_memory(self):
        """Store all mission results in research memory for future retrieval."""
        memory = await get_research_memory()
        for result in self.results:
            if result.output:
                embedding = await generate_embedding(result.output[:2000])
                await memory.store_result(
                    query=self.goal,
                    result={
                        "title": f"Mission: {self.goal[:100]}",
                        "url": f"internal://mission/{self.id}",
                        "content": result.output,
                        "source_type": "mission_research",
                        "relevance_score": 1.0,
                    },
                    embedding=embedding,
                )
```

### Mission API Endpoint

```python
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class MissionRequest(BaseModel):
    goal: str
    customer_id: str
    deliverables: list[str] = ["executive_brief"]

@router.post("/api/missions")
async def create_mission(req: MissionRequest):
    """Create and launch a new research mission.
    
    The mission runs asynchronously. Poll the status endpoint
    or configure webhooks for completion notification.
    """
    mission = ResearchMission(
        goal=req.goal,
        customer_id=req.customer_id,
        deliverables=req.deliverables,
    )
    
    # Launch async — don't await completion
    asyncio.create_task(mission.execute())
    
    return {
        "mission_id": mission.id,
        "status": mission.status.value,
        "deliverables": mission.deliverables,
    }

@router.get("/api/missions/{mission_id}")
async def get_mission_status(mission_id: str):
    """Check mission status and retrieve completed deliverables."""
    mission = await MissionStore.get(mission_id)
    return {
        "mission_id": mission.id,
        "status": mission.status.value,
        "deliverables": await get_deliverables(mission.id),
        "error": mission.error,
    }
```

---

## Code: Auto CRM Enrichment

Automatically enrich customer records with financial data, SEC filings, and threat intelligence. Runs on a schedule or triggered by new customer creation.

```python
async def auto_enrich_customer(customer_id: str):
    """Automatically enrich a customer record with external intelligence.
    
    Runs three parallel Valyu searches:
    1. Financial data (revenue, earnings, market cap)
    2. SEC filings (10-K, 10-Q, proxy statements)
    3. Threat intelligence (breaches, vulnerabilities, incidents)
    
    Results are stored both in the CRM and in research memory
    for cross-customer intelligence.
    
    Args:
        customer_id: CRM customer ID to enrich.
    """
    customer = await Customer.get(customer_id)
    valyu = Valyu(api_key=await get_api_key("valyu"))
    
    # Run all enrichment searches in parallel
    financial_task = valyu.search(
        query=f"{customer.name} revenue earnings market cap financial performance",
        search_type="proprietary",
        category="finance",
        max_num_results=10,
        max_price=80,
    )
    
    sec_task = valyu.search(
        query=f"{customer.name} SEC 10-K 10-Q annual report proxy statement",
        search_type="proprietary",
        category="sec",
        max_num_results=10,
        max_price=60,
    )
    
    news_task = valyu.search(
        query=f"{customer.name} cybersecurity breach vulnerability incident",
        search_type="news",
        start_date=(datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d"),
        max_num_results=15,
        max_price=30,
    )
    
    # Await all results
    financial, sec, news = financial_task, sec_task, news_task
    
    # Store enrichment data
    await store_enrichment(customer, "financial", financial)
    await store_enrichment(customer, "sec_filings", sec)
    await store_enrichment(customer, "threat_intel", news)
    
    # Update customer record with summary
    customer.enrichment_status = "completed"
    customer.last_enriched = datetime.utcnow()
    customer.financial_summary = await summarize_financial(financial)
    customer.threat_level = await assess_threat_level(news)
    await customer.save()


async def store_enrichment(customer, category: str, search_response):
    """Store enrichment results in both CRM and research memory.
    
    Each enrichment category gets stored as a structured record
    linked to the customer, plus individual results go into
    research memory for cross-customer retrieval.
    """
    if not search_response.success:
        return
    
    # Store in CRM enrichment table
    await Enrichment.create(
        customer_id=customer.id,
        category=category,
        results=[{
            "title": r.title,
            "url": r.url,
            "content": r.content[:5000],  # truncate for CRM storage
            "relevance_score": r.relevance_score,
            "retrieved_at": datetime.utcnow().isoformat(),
        } for r in search_response.results],
    )
    
    # Also store in research memory for semantic retrieval
    memory = await get_research_memory()
    for r in search_response.results:
        embedding = await generate_embedding(r.content[:2000])
        await memory.store_result(
            query=f"{customer.name} {category}",
            result={
                "title": r.title,
                "url": r.url,
                "content": r.content,
                "source_type": f"enrichment_{category}",
                "relevance_score": r.relevance_score,
            },
            embedding=embedding,
        )


async def summarize_financial(search_response) -> str:
    """Generate a one-paragraph financial summary from search results."""
    if not search_response.success or not search_response.results:
        return "No financial data available."
    
    combined = "\n".join([r.content[:2000] for r in search_response.results[:5]])
    return await llm_generate(
        f"Summarize the following financial data in one paragraph:\n{combined}",
        model="gpt-4o-mini",
        max_tokens=200,
    )


async def assess_threat_level(search_response) -> str:
    """Assess customer's cybersecurity threat level from news."""
    if not search_response.success or not search_response.results:
        return "low"
    
    combined = "\n".join([r.content[:1000] for r in search_response.results[:5]])
    assessment = await llm_generate(
        f"""Based on these recent cybersecurity news items, rate the threat 
        level as one of: low, medium, high, critical. Respond with only 
        the rating.\n\n{combined}""",
        model="gpt-4o-mini",
        max_tokens=10,
    )
    return assessment.strip().lower()
```

### Scheduled Enrichment

```python
async def scheduled_enrichment_job():
    """Run enrichment for customers that need updating.
    
    Triggered by cron. Enriches customers that:
    - Have never been enriched, OR
    - Were last enriched more than 30 days ago
    
    Rate-limited to 10 customers per run to control API costs.
    """
    stale_customers = await Customer.filter(
        Q(last_enriched__isnull=True) | 
        Q(last_enriched__lt=datetime.utcnow() - timedelta(days=30))
    ).order_by("last_enriched").limit(10)
    
    for customer in stale_customers:
        try:
            await auto_enrich_customer(customer.id)
            await asyncio.sleep(2)  # rate limiting courtesy
        except Exception as e:
            logger.error(f"Enrichment failed for {customer.name}: {e}")
            continue
```

---

## Code: Self-Improving Prompts

Research quality improves automatically based on user feedback. Low-rated results trigger parameter adjustments.

### Feedback Schema

```sql
-- migrations/003_research_feedback.sql

CREATE TABLE research_feedback (
    id              BIGSERIAL PRIMARY KEY,
    research_id     TEXT NOT NULL,
    mission_id      TEXT,
    context         TEXT,
    rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    notes           TEXT,
    search_params   JSONB,    -- snapshot of params used
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_context ON research_feedback (context);
CREATE INDEX idx_feedback_rating ON research_feedback (rating);
CREATE INDEX idx_feedback_created ON research_feedback (created_at DESC);

CREATE TABLE search_defaults (
    context         TEXT PRIMARY KEY,
    max_num_results INTEGER DEFAULT 15,
    mode            TEXT DEFAULT 'standard',
    max_price       INTEGER DEFAULT 50,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_reason  TEXT
);
```

### Feedback Loop Implementation

```python
class ResearchFeedbackLoop:
    """Self-improving research parameters based on user feedback.
    
    Tracks research quality ratings per context. When average quality
    drops below threshold, automatically adjusts search parameters
    to improve results. When quality is consistently high, relaxes
    parameters to save costs.
    
    Thresholds:
    - avg < 3.5: Increase depth (more results, heavier mode)
    - avg > 4.5: Decrease depth (fewer results, lighter mode)
    - avg 3.5-4.5: No change (sweet spot)
    """
    
    def __init__(self, pg_pool):
        self.pg = pg_pool
    
    async def record_feedback(self, research_id: str, rating: int, notes: str,
                               context: str = "general", search_params: dict = None):
        """Record user feedback for a research result.
        
        Args:
            research_id: ID of the research item being rated.
            rating: 1-5 quality rating.
            notes: Free-text feedback.
            context: Business context (compliance, financial, etc.)
            search_params: Snapshot of search parameters used.
        """
        await self.pg.execute("""
            INSERT INTO research_feedback 
                (research_id, context, rating, notes, search_params, created_at)
            VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
        """, research_id, context, rating, notes, 
            json.dumps(search_params) if search_params else None)
        
        # Check if we need to adjust defaults
        avg = await self.get_avg_rating_by_context(context)
        await self._maybe_adjust_defaults(context, avg)
    
    async def get_avg_rating_by_context(self, context: str, 
                                         window_days: int = 30) -> float:
        """Get average rating for a context over the last N days."""
        row = await self.pg.fetchrow("""
            SELECT AVG(rating)::float as avg_rating, COUNT(*) as count
            FROM research_feedback
            WHERE context = $1
              AND created_at > NOW() - INTERVAL '%s days'
        """ % window_days, context)
        
        return row['avg_rating'] if row['avg_rating'] else 3.5  # neutral default
    
    async def _maybe_adjust_defaults(self, context: str, avg_rating: float):
        """Adjust search defaults based on feedback trends.
        
        Only adjusts if we have enough feedback (>= 5 ratings in window).
        Changes are logged with reason for audit trail.
        """
        count = await self.pg.fetchval("""
            SELECT COUNT(*) FROM research_feedback
            WHERE context = $1 AND created_at > NOW() - INTERVAL '30 days'
        """, context)
        
        if count < 5:
            return  # not enough data to adjust
        
        current = await self.get_defaults(context)
        
        if avg_rating < 3.5:
            # Quality too low — increase depth
            new_defaults = {
                "max_num_results": min(current.get("max_num_results", 15) + 5, 30),
                "mode": self._upgrade_mode(current.get("mode", "standard")),
                "max_price": min(current.get("max_price", 50) + 20, 150),
            }
            reason = f"Avg rating {avg_rating:.1f} < 3.5, increasing depth"
            
        elif avg_rating > 4.5:
            # Quality consistently high — reduce costs
            new_defaults = {
                "max_num_results": max(current.get("max_num_results", 15) - 5, 5),
                "mode": self._downgrade_mode(current.get("mode", "standard")),
                "max_price": max(current.get("max_price", 50) - 10, 20),
            }
            reason = f"Avg rating {avg_rating:.1f} > 4.5, optimizing costs"
            
        else:
            return  # sweet spot, no change
        
        await self.update_defaults(context, new_defaults, reason)
    
    async def get_defaults(self, context: str) -> dict:
        """Get current search defaults for a context."""
        row = await self.pg.fetchrow("""
            SELECT max_num_results, mode, max_price
            FROM search_defaults WHERE context = $1
        """, context)
        
        if row:
            return dict(row)
        return {"max_num_results": 15, "mode": "standard", "max_price": 50}
    
    async def update_defaults(self, context: str, defaults: dict, reason: str):
        """Update search defaults for a context with audit logging."""
        await self.pg.execute("""
            INSERT INTO search_defaults (context, max_num_results, mode, max_price, 
                                          updated_at, updated_reason)
            VALUES ($1, $2, $3, $4, NOW(), $5)
            ON CONFLICT (context) DO UPDATE SET
                max_num_results = $2, mode = $3, max_price = $4,
                updated_at = NOW(), updated_reason = $5
        """, context, defaults["max_num_results"], defaults["mode"],
            defaults["max_price"], reason)
        
        logger.info(f"Updated search defaults for '{context}': {defaults} — {reason}")
    
    @staticmethod
    def _upgrade_mode(current: str) -> str:
        modes = ["fast", "standard", "heavy", "max"]
        idx = modes.index(current) if current in modes else 1
        return modes[min(idx + 1, len(modes) - 1)]
    
    @staticmethod
    def _downgrade_mode(current: str) -> str:
        modes = ["fast", "standard", "heavy", "max"]
        idx = modes.index(current) if current in modes else 1
        return modes[max(idx - 1, 0)]
```

### Feedback API Endpoint

```python
from pydantic import BaseModel, Field

class FeedbackRequest(BaseModel):
    research_id: str
    rating: int = Field(ge=1, le=5)
    notes: str = ""
    context: str = "general"

@router.post("/api/research/{research_id}/feedback")
async def submit_feedback(research_id: str, req: FeedbackRequest):
    """Submit quality feedback for a research result.
    
    This feeds the self-improving loop. Ratings influence future
    search parameters for the given context.
    """
    loop = ResearchFeedbackLoop(pg_pool)
    
    # Get the search params that were used (for audit)
    research = await ResearchItem.get(research_id)
    search_params = research.search_params if research else None
    
    await loop.record_feedback(
        research_id=research_id,
        rating=req.rating,
        notes=req.notes,
        context=req.context,
        search_params=search_params,
    )
    
    return {"status": "recorded", "research_id": research_id}
```

### Integrating Feedback Defaults into SearchRouter

```python
class AdaptiveSearchRouter(SearchRouter):
    """SearchRouter that applies learned defaults from feedback loop.
    
    Extends the base router by overlaying feedback-driven parameter
    adjustments on top of static route configurations.
    """
    
    @classmethod
    async def route(cls, context: str = "general", pg_pool=None) -> dict:
        """Get config with feedback-adjusted defaults."""
        base_config = super().route(context)
        
        if pg_pool:
            loop = ResearchFeedbackLoop(pg_pool)
            learned = await loop.get_defaults(context)
            
            # Overlay learned defaults (feedback wins over static config)
            base_config["max_num_results"] = learned.get(
                "max_num_results", base_config.get("max_num_results", 15)
            )
            if "max_price" in learned:
                base_config["max_price"] = learned["max_price"]
        
        return base_config
```

---

## Code: Intelligence Dashboard

Monitor the entire intelligence engine from a single endpoint.

```python
@router.get("/api/intelligence/dashboard")
async def intelligence_dashboard():
    """Get a snapshot of the intelligence engine's health and activity."""
    memory = await get_research_memory()
    feedback_loop = ResearchFeedbackLoop(pg_pool)
    
    memory_stats = await memory.get_stats()
    
    active_missions = await MissionStore.count(status="researching")
    completed_today = await MissionStore.count(
        status="completed",
        completed_after=datetime.utcnow().replace(hour=0, minute=0),
    )
    
    enrichment_stats = await pg_pool.fetchrow("""
        SELECT 
            COUNT(DISTINCT customer_id) as enriched_customers,
            COUNT(*) as total_enrichments,
            MAX(created_at) as last_enrichment
        FROM enrichments
    """)
    
    feedback_stats = await pg_pool.fetchrow("""
        SELECT 
            COUNT(*) as total_feedback,
            AVG(rating)::float as avg_rating,
            COUNT(*) FILTER (WHERE rating >= 4) as positive,
            COUNT(*) FILTER (WHERE rating <= 2) as negative
        FROM research_feedback
        WHERE created_at > NOW() - INTERVAL '30 days'
    """)
    
    return {
        "memory": memory_stats,
        "missions": {
            "active": active_missions,
            "completed_today": completed_today,
        },
        "enrichment": dict(enrichment_stats) if enrichment_stats else {},
        "feedback": dict(feedback_stats) if feedback_stats else {},
        "contexts": {
            ctx: await feedback_loop.get_defaults(ctx)
            for ctx in SearchRouter.available_contexts()
        },
    }
```

---

## Files Modified

| File | Change |
|------|--------|
| `models/mission.py` | **New** — ResearchMission dataclass + MissionStore |
| `lib/mission_engine.py` | **New** — Mission execution engine |
| `lib/crm_enrichment.py` | **New** — Auto-enrichment functions |
| `lib/feedback_loop.py` | **New** — ResearchFeedbackLoop class |
| `lib/search_router.py` | Extend with AdaptiveSearchRouter |
| `migrations/002_missions.sql` | **New** — Mission + deliverable tables |
| `migrations/003_research_feedback.sql` | **New** — Feedback + defaults tables |
| `migrations/004_enrichments.sql` | **New** — CRM enrichment tables |
| `api/routers/missions.py` | **New** — Mission CRUD endpoints |
| `api/routers/feedback.py` | **New** — Feedback submission endpoint |
| `api/routers/intelligence.py` | **New** — Dashboard endpoint |
| `workers/enrichment_worker.py` | **New** — Scheduled enrichment cron |
| `pipeline_worker.py` | Use AdaptiveSearchRouter |

---

## Migration Checklist

- [ ] Options 1, 2, and 3 completed
- [ ] Run migrations 002, 003, 004
- [ ] Implement ResearchMission class and execution engine
- [ ] Implement Mission API endpoints
- [ ] Implement auto CRM enrichment functions
- [ ] Set up enrichment cron job (daily, 10 customers/run)
- [ ] Implement ResearchFeedbackLoop
- [ ] Implement feedback API endpoint
- [ ] Implement AdaptiveSearchRouter
- [ ] Implement intelligence dashboard endpoint
- [ ] Add deliverable generators (brief, report, podcast, etc.)
- [ ] Test mission lifecycle end-to-end
- [ ] Test feedback loop adjusts parameters correctly
- [ ] Test enrichment data appears in CRM
- [ ] Monitor API costs during initial rollout
- [ ] Set up alerting for mission failures

---

## Expected Outcome

| Metric | Before (Option 3) | After (Option 4) |
|--------|-------------------|-------------------|
| Research automation | Manual trigger per query | Autonomous missions |
| CRM intelligence | Static customer data | Auto-enriched every 30 days |
| Search tuning | Manual parameter tweaking | Self-improving via feedback |
| Output types | Single format per request | Multi-deliverable missions |
| Cross-customer intelligence | None | Shared research memory |
| Operational visibility | Logs only | Intelligence dashboard |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| API costs spiral | `max_price` caps on every search, enrichment rate limiting (10/run) |
| Feedback loop oscillation | Minimum 5 ratings before adjusting, 30-day rolling window |
| Mission timeouts | DeepResearch polling fallback, per-task timeout of 5 minutes |
| CRM data staleness | 30-day enrichment cycle, manual re-enrich button |
| Deliverable quality | Human review step before publishing, quality gate on feedback |
