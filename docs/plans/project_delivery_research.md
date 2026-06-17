# Deep Research: Project Delivery (SRE) Persona Feature Suite

This research and design specification documents the technical architecture, visual flows, data schemas, and agent instrumentation required to build the SRE/Project Delivery perspective within the Open Notebook platform.

---

## 1. UX Flows & Navigation Architecture (UX-Flow)

The SRE persona relies on high efficiency, low cognitive load, and immediate access to playbooks and compliance links. We apply **Progressive Disclosure** and a **Hub-and-Spoke** model centered around the project workspace.

### 1.1 Navigation & Screen Architecture

```
                               ┌─────────────────────────┐
                               │     Main Dashboard      │
                               │  (Perspective Selector) │
                               └─────────────────────────┘
                                            │
                                            ▼ (setPerspective('delivery'))
                               ┌─────────────────────────┐
                               │  SRE Delivery Workspace │
                               │   (Three-Column Hub)    │
                               └─────────────────────────┘
                                   /        │        \
         ┌────────────────────────┘         │         └────────────────────────┐
         ▼                                  ▼                                  ▼
┌──────────────────┐               ┌──────────────────┐               ┌──────────────────┐
│   Column 1:      │               │   Column 2:      │               │   Column 3:      │
│ Operations Tree  │               │   Tasks Kanban   │               │ Activity Stream  │
└──────────────────┘               └──────────────────┘               └──────────────────┘
    │                                  │                                  │
    ├──► Configure Cluster             ├──► Task Detail Sheet             └──► Filter Logs
    │    (Simulator Drawer)            │    (AI Research Tab)                  (Live events)
    │                                  │
    └──► Facility Context Card         └──► Playbook Sync Panel
                                            (Semantic search docs)
```

### 1.2 Interactive Relations Canvas Flow (Task-to-Spec Drag-and-Drop)

```
[Task Node] ───────────────── (User drags edge handle) ────────────────► [Note/Source Node]
     │                                                                           │
     ▼                                                                           ▼
React Flow trigger             API Validation: POST /api/entity-links            Verify node types
onConnect(params)              { in: "task:123", out: "note:456" }               Create link edge
     │                                                                           │
     └──────────────────────────────► SUCCESS ◄──────────────────────────────────┘
                                         │
                                         ▼
                              Render visual link (Indigo)
                              Log event: SRE Task linked to Spec
```

---

## 2. Visual Specification & UI Design (UI-UX-Pro-Max)

To wowed SRE users, we use a sleek, modern **Cybernetic Dark Mode** styling. This includes glassmorphism containers, smooth state transitions, and responsive layout scaling.

### 2.1 CSS Design Tokens

* **Visual Style**: Glassmorphism with backdrop filters and glowing borders.
  - Backdrop Blur: `backdrop-blur-md`
  - Border Colors: HSL based translucent boundaries.
    - Neutral Border: `rgba(255, 255, 255, 0.08)`
    - Focus/Active Border: `rgba(16, 185, 129, 0.3)` (Emerald/SRE)
  - Color Accents:
    - Primary (Emerald): `rgb(16, 185, 129)` / HSL `162, 84%, 41%`
    - Info (Indigo): `rgb(99, 102, 241)` / HSL `239, 84%, 67%`
    - Warning (Amber): `rgb(245, 158, 11)` / HSL `38, 92%, 50%`
* **Typography**:
  - Headings: `font-sans font-bold tracking-tight text-slate-100`
  - Body: `font-sans leading-relaxed text-slate-300`
  - Code/Terminal: `font-mono text-xs text-emerald-400 antialiased`
* **Lucide Icon Library Mapping**:
  - SRE Tasks: `<ClipboardCheck className="h-4 w-4 text-emerald-400" />`
  - Compliance Spec: `<FileShield className="h-4 w-4 text-indigo-400" />`
  - Terminal/Cluster: `<Terminal className="h-4 w-4 text-cyan-400" />`
  - Playbook/Wiki: `<BookOpen className="h-4 w-4 text-amber-400" />`

---

## 3. Data Engineering & DB Schema Specification (Data-Engineering)

We extend SurrealDB schemas to record task linkages, activity telemetry, and playground sessions. We avoid database schema drift by updating migration scripts atomically.

### 3.1 SurrealQL Migrations (`60.surrealql` and `60_down.surrealql`)

#### Up Migration: `60.surrealql`
```sql
-- Define schema-full relation table for Task-to-Spec linkages
DEFINE TABLE task_spec_link SCHEMAFULL;
DEFINE FIELD in ON TABLE task_spec_link TYPE record<task>;
DEFINE FIELD out ON TABLE task_spec_link TYPE record<note> | record<source>;
DEFINE FIELD created_at ON TABLE task_spec_link TYPE datetime DEFAULT time::now();
DEFINE INDEX unique_task_spec_link ON TABLE task_spec_link COLUMNS in, out UNIQUE;

-- Add index on activity actor and event type for high-performance telemetry sorting
DEFINE INDEX activity_actor_event_idx ON TABLE activity COLUMNS actor, description;
```

#### Down Migration: `60_down.surrealql`
```sql
REMOVE TABLE task_spec_link;
REMOVE INDEX activity_actor_event_idx ON TABLE activity;
```

### 3.2 Backend API Contracts & Pydantic Models

```python
# api/models.py or api/routers/tasks.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class TaskSpecLinkRequest(BaseModel):
    task_id: str = Field(..., description="ID of the SRE Task")
    spec_id: str = Field(..., description="ID of the Note or Source spec")

class TaskSpecLinkResponse(BaseModel):
    id: str
    task_id: str
    spec_id: str
    created_at: str

class ClusterSimulationRequest(BaseModel):
    facility_id: str = Field(..., description="Facility target for deployment simulation")
    command: str = Field(..., description="Simulated CLI command execution")

class ClusterSimulationResponse(BaseModel):
    status: str = Field("success", description="Status of the simulator execution")
    output: str = Field(..., description="Command output stream")
    logs: List[Dict[str, Any]] = Field(default_factory=list, description="Simulated log history")
```

---

## 4. Autonomous Agent Loop & Safety Sandboxing (Autonomous-Agent-Patterns)

The AI Task Research panel utilizes a specialized multi-model agent execution pattern with safety controls and human-in-the-loop validation.

```
                  ┌─────────────────────────────────────┐
                  │        Agent Execution Loop         │
                  └─────────────────────────────────────┘
                                     │
                                     ▼
                      Query parsing (Gemini Flash)
                                     │
                                     ▼
                     Safety check (Is command safe?)
                      - YES: Execute tool call
                      - NO: Prompt for human approval
                                     │
                                     ▼
                     Observation (Retrieve results)
                                     │
                                     ▼
                    Synthesis (Gemini Pro/Thinking)
```

### 4.1 Safety Permission Config (varlock & AI Defence)

To secure SRE operations, we enforce permission rules:
- **Low Risk (Auto-approve)**: Vector searches, local playbook retrieval.
- **Medium Risk (Verify once per session)**: Appending AI research contents directly to compliance specifications.
- **High Risk (Always require explicit user confirmation)**: Simulating cluster deployments or triggering background worker commands.

---

## 5. Analytics & Experimentation Design (Data-Driven Feature)

We define a clear A/B testing strategy to measure the conversion rate of tasks marked as completed, task-to-spec link usage, and SRE task resolution speeds.

### 5.1 Business Hypothesis Development (RICE Framework)

| Hypothesis | Success Metric | Expected Impact | RICE Score |
|---|---|---|---|
| **Task-to-Spec Canvas Links**: Linking compliance notes directly to task cards reduces verification errors. | % tasks linked to specs, compliance quiz scores | +25% audit compliance scores | **R:3 I:3 C:85% E:3** = 230 |
| **Playbook Sync Panel**: Contextual playbook lookups directly in the task view reduces task resolution time. | Mean Time to Resolve (MTTR) tasks | -15% task duration in `in_progress` | **R:4 I:2 C:90% E:4** = 180 |

### 5.2 Event Instrumentation Schema (Amplitude/Segment Taxonomy)

```json
{
  "event_name": "sre_task_spec_linked",
  "properties": {
    "task_id": "task:n4d8s79w23",
    "project_id": "project:abcde12345",
    "spec_id": "note:sh78ws2983",
    "spec_type": "note",
    "linked_via": "canvas_drag"
  }
}
```

```json
{
  "event_name": "sre_simulation_executed",
  "properties": {
    "facility_id": "location:facility_north",
    "command": "kubectl get pods",
    "elapsed_ms": 350,
    "status": "success"
  }
}
```

---

## 6. Implementation Checklist & Phase Roadmap (Planning-with-Files)

We outline the deployment roadmap into 5 sequential, test-driven phases:

```
[Phase 1: DB & APIs] ──► [Phase 2: Canvas Integration] ──► [Phase 3: SRE Tab Panels] ──► [Phase 4: CLI Simulator] ──► [Phase 5: Tests]
```

- **[ ] Phase 1: DB Setup & API Router Updates**
  - Implement `60.surrealql` migrations.
  - Add `task_spec_link` endpoints in `api/routers/tasks.py`.
  - Update `api/routers/activities.py` to auto-emit logs on task status transition.
- **[ ] Phase 2: React Flow Canvas Interactions**
  - Update `EntityGraphNode` in `RelationsGraph.tsx` to render Tasks and Specs.
  - Implement task-to-spec connection handling inside `onConnect`.
- **[ ] Phase 3: Playbook Sync & AI Research Sheet**
  - Build the slide-over panel for Task details.
  - Integrate semantic similarity query against Playbook notes.
  - Build the SSE-stream based Task AI Research tab.
- **[ ] Phase 4: Cluster Configuration Simulator Component**
  - Create the mock CLI React terminal container with retro styles.
  - Code standard commands: `help`, `deploy`, `status`, `logs`.
- **[ ] Phase 5: Verification & End-to-End Tests**
  - Write backend tests inside `tests/test_sre_features.py`.
  - Run Playwright test script verifying drag-and-drop and simulation states.
