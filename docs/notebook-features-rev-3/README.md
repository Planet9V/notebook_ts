# Notebook Features Rev 3: Strategic Upgrades

Welcome to the specification directory for **Notebook Features Rev 3** (released June 8, 2026). This revision introduces architectural upgrades to Tetrel Notebook's user experience and backend automation, consolidating nineteen separate pages into unified, role-based workflows.

## Rev 3 Feature Index

1. **[Dynamic Role-Based Bento Portal](file:///Users/jimmcknney/notebook_tetrel/docs/notebook-features-rev-3/feature-1-bento-portal.md)**
   * Dynamically re-orders widgets for Sales, Delivery, Social Media, and Researcher personas.
   * Leverages `@hello-pangea/dnd` and localStorage configuration states.
2. **[Unified Workspace Split-Pane Canvas](file:///Users/jimmcknney/notebook_tetrel/docs/notebook-features-rev-3/feature-2-workspace-canvas.md)**
   * Integrates RAG search query, canvas notes, compliance checklists, and rich markdown editors.
   * Enables drag-and-drop citation footnotes with unique pgvector references.
3. **[Autonomous SRE Administrator Agent](file:///Users/jimmcknney/notebook_tetrel/docs/notebook-features-rev-3/feature-3-sre-agent.md)**
   * Monitors SurrealDB `system_log` and container statuses.
   * Auto-generates local GitHub issues, branches, code patches, and pull requests verified via pytest.
4. **[The "Loom" Topological Operations Map](file:///Users/jimmcknney/notebook_tetrel/docs/notebook-features-rev-3/feature-4-the-loom.md)**
   * Maps all customers, projects, research logs, and publisher triggers onto a zoomable 2D node graph.
   * Integrates live neon glows to signal system state and pipeline health.

---

## Technical Specifications & Standards
* **Aesthetics:** Consistent dark mode HSL styling, glassmorphism filters, and clean Outfit/Inter typography.
* **Architecture:** Docker bridge network, FastAPI async endpoints, pgvector HNSW caching, and SurrealDB relation edges.
* **Quality Gates:** 100% test coverage using pytest and Playwright E2E browser verification.
