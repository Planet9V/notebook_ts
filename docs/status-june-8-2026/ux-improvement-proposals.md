# UX & Business Architecture Improvement Proposals

*Last Updated: June 8, 2026*
*Author: Tetrel Product Engineering Team*

---

## 1. Executive Introduction & Strategic Positioning

This document proposes **four progressive recommendations** to bridge the gap between Tetrel Notebook's advanced backend capabilities and its user experience. 

Currently, the application contains nineteen disjointed dashboard views, leading to cognitive fatigue and frequent context switching. By applying principles of **product positioning, multi-agent coordination, and database architecture**, these proposals consolidate the interface into a unified, role-based, and highly aesthetic platform.

```
                           ┌───────────────────────────┐
                           │      UX Innovation        │
                           └─────────────┬─────────────┘
                                         │
        ┌───────────────────┬────────────┴──────┬───────────────────┐
        ▼                   ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Proposal 1    │   │ Proposal 2    │   │ Proposal 3    │   │ Proposal 4    │
│ Role-Based    │   │ Unified       │   │ Zero-UI       │   │ The "Loom"    │
│ Bento Portal  │   │ Canvas        │   │ Command Panel │   │ Topological   │
│ (Conservative)│   │ (Moderate)    │   │ (Radical)     │   │ (Very Radical)│
└───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘
```

---

## 2. Competitive Landscape & Core Personas

### 2.1 Persona Alignment & Overlaps

The system must serve four core personas who share data but execute different daily workflows:

```
                  ┌─────────────────────────────────────┐
                  │               Research              │
                  │ (Papers, Podcasts, Deep Searches)   │
                  └──────────┬───────────────────────┬──┘
                             │                       │
      ┌──────────────────────▼──────┐         ┌──────▼──────────────────────┐
      │             Sales           │         │           Delivery          │
      │ (TAM, Prospects, Pipeline)  │         │  (SOWs, Projects, Quizzes)  │
      └──────────────────────┬──────┘         └──────┬──────────────────────┘
                             │                       │
                             └───────► ┌─────────────▼──────┐
                                       │    Social Media    │
                                       │ (Scheduling, posts)│
                                       └────────────────────┘
```

1.  **Sales Persona:** Focuses on pipeline management, prospect profiling, meeting preparation, and competitor analysis. *Needs rapid access to research summaries directly connected to CRM deals.*
2.  **Delivery Persona:** Focuses on executing Statements of Work (SOWs), managing project tasks, conducting regulatory compliance audits (CSET-equivalent), and writing reports with verified citations. *Needs to link source materials and quizzes directly to active projects.*
3.  **Social Media Manager:** Focuses on extracting insights from research, drafting posts, scheduling automated campaigns across LinkedIn, Twitter/X, and Instagram, and monitoring analytics. *Needs a unified scheduler linked to the research library.*
4.  **Researcher Persona:** Focuses on deep sector dives, synthesizing documents, and creating podcasts. *Needs agent-supported correlation tools and visibility into LLM prompts.*

---

## 3. Four Recommendations for Improvement

---

### Recommendation 1: Dynamic Role-Based Bento Portal (Conservative)

*   **Concept:** Retain the current route architecture but replace the home dashboard with a **dynamic, persona-specific Bento Grid**. When a user logs in, they select their active role (Sales, Delivery, Social Media, or Researcher) via a header toggle. The Bento Grid automatically reorders, showing only the widgets relevant to that role.
*   **The Experience:**
    *   *Sales Portal:* Renders pipeline card summaries, prospect news alerts, quick search shortcuts, and prospect research metrics.
    *   *Delivery Portal:* Renders active projects list, compliance scoring widgets, task assignments, and recent SOW drafts.
    *   *Social Media Portal:* Renders a visual calendar queue, draft approval cards, and social metrics charts (custom SVG-based).
    *   *Researcher Portal:* Renders active DeepResearch tasks, podcast queue, LLM prompt debug console, and pgvector cache hit rates.
*   **Business Case (ROI):** Minimizes cognitive load by hiding administrative details from non-admin users. Reduces layout noise and keeps users focused on their immediate tasks.
*   **Technical Implementation:** Uses local storage to persist the chosen role. Next.js dynamically renders the bento layout using `@hello-pangea/dnd` for grid editing and custom Tailwind CSS classes.

---

### Recommendation 2: The Unified Workspace Canvas (Moderate)

*   **Concept:** Combine `/notebooks`, `/projects`, `/compliance`, and `/search` into a **single split-pane Workspace Canvas**. Users no longer switch pages; instead, they open a "Workspace" representing a client or project, which displays all related assets side-by-side.
*   **The Experience:**
    *   *Left Pane (Data & Research):* Multi-tabbed view displaying the React Flow canvas, uploaded source documents, active search query console, and compliance checklists.
    *   *Right Pane (Document Editor):* A rich Markdown text editor for drafting the SOW or compliance report.
    *   *Interactivity:* Drag a search result or compliance score from the left pane and drop it into the right editor. The platform automatically formats the citation, generates the footnote, and links it back to the original source in PostgreSQL.
*   **Business Case (ROI):** Eliminates 90% of navigation clicks during document creation. Dramatically speeds up report generation for engineers and analysts.
*   **Technical Implementation:** Uses Next.js split-pane layouts. Integrates Zustand to sync state between the research pane and the markdown editor, guaranteeing that citations carry unique database IDs.

---

### Recommendation 3: Zero-UI Agent Command Console (Radical)

*   **Concept:** Move away from standard navigation menus in favor of a **natural language interface**. The landing screen is a clean, minimal search bar with a floating WebRTC voice assistant badge, surrounded by a subtle, glowing glassmorphic background.
*   **The Experience:**
    *   The user types or speaks: *"Register a new lead for Acme Corp, run a competitor analysis, and draft an SOW based on our standard compliance template."*
    *   The backend parser decomposes the command into a sequential agent plan.
    *   The UI dynamically "assembles" only the relevant widgets (a mini pipeline card, a progress bar for the research, and a document preview window) on the screen. Once the task is complete, the widgets fade away, returning the screen to its minimal state.
*   **Business Case (ROI):** Dramatically simplifies the user interface, removing the need for training. It leverages the under-300ms WebRTC voice pipeline to allow hands-free CRM updates.
*   **Technical Implementation:** Utilizes a FastAPI parser to map natural language intents to specific API routers. The frontend uses Framer Motion to animate the entry and exit of dynamic bento cards.

---

### Recommendation 4: The "Loom" Topological Operations Map (Very Radical)

*   **Concept:** Model the entire business operations ledger as an **interactive topological graph map**. Instead of lists, tables, and Kanban boards, all customers, projects, research topics, and social posts are rendered as nodes on a zoomable, draggable 2D map.
*   **The Experience:**
    *   *Visual Flow:* A research paper node has connections pointing to a podcast node and a social draft node. A customer node is connected to active project nodes.
    *   *Interactive Operations:* To assign a task, drag a team member node and drop it onto a project node. To draft a social post about a research paper, drag the paper node onto the LinkedIn publisher node.
    *   *Visual Indicators:* Active nodes glow using neon borders to indicate status (e.g. green for healthy running, red for blocked, blue for research in progress).
*   **Business Case (ROI):** Provides a visual, bird's-eye view of the entire organization's pipelines, tasks, and assets, making bottlenecks instantly visible.
*   **Technical Implementation:** Re-purposes the React Flow canvas as the primary application wrapper. Nodes are rendered as custom React components containing mini-charts and text inputs.

---

## 4. Architectural Summary

| Dimension | Option 1: Bento Portal | Option 2: Workspace Canvas | Option 3: Zero-UI Console | Option 4: The Loom Map |
| :--- | :--- | :--- | :--- | :--- |
| **UX Complexity** | Low (familiar dashboard) | Medium (split pane) | Minimalist (voice/search) | High (visual node map) |
| **Cognitive Load** | Reduced by 50% | Reduced by 75% | Near Zero | Consolidated visually |
| **Implementation Risk** | Extremely Low | Low | Medium (command parsing) | High (rendering complexity) |
| **Aesthetic Impact** | High (clean grids) | High (split layout) | Stunning (minimal glass) | Mind-blowing (live nodes) |

---

## 5. Client vs. Admin Segregation & Autonomous SRE Agent

To ensure security while maintaining observability, the system separates client-facing features from administrative functions:

```
 ┌────────────────────────────────────────────────────────┐
 │                   Next.js Web Client                   │
 ├───────────────────────────┬────────────────────────────┤
 │    Client Workspaces      │     Admin Control Panel    │
 │   - Pipeline Board        │    - API Key Configs       │
 │   - Notebook Canvas       │    - supervisord Status    │
 │   - Compliance Quizzes    │    - LLM Prompt Editor     │
 │   - Document Exporting    │    - system_log Viewer     │
 └───────────────────────────┴────────────────────────────┘
```

*   **Client Aspect:** Restricted to notebooks, search, compliance quiz wizards, pipelines, and document exporting. Under no circumstances can client organizations access host container configurations, master API keys, or raw system logs.
*   **Admin Aspect:** Full access to Docker container states, prompt overrides, master database schemas, and integration credentials.

### The Autonomous SRE Administrator Agent
To bridge the gap between complex backend systems and minimal administrative overhead, the platform implements an **Autonomous SRE / Admin Agent**:

1.  **Continuous Monitoring:** The SRE agent polls the local SurrealDB `system_log` table and executes health checks on the Docker network.
2.  **Diagnostics & Issue Creation:** If a container crashes, an API key expires, or a WebRTC connection fails, the agent writes a diagnostic report and opens a local GitHub Issue.
3.  **Automatic Pull Requests:** The agent checks out a branch, implements the necessary configuration fix, and opens a Pull Request (PR) containing the solution.
4.  **Verification Loop:** The agent triggers the local test suite (`pytest` and Playwright) to verify the fix. Once the tests pass, it notifies the administrator via the operations dashboard with a single-click "Merge and Deploy" button, complying with the **Karpathy Rules** of simplicity and readability.
