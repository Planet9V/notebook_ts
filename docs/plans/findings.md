# Findings & Decisions: SRE Project Delivery Persona Feature Suite

## Requirements
- SRE/Project Delivery perspective visual enhancement (three-column layout).
- Persistent task-to-spec canvas edges.
- Read-only playbook sync lookup panel.
- Automatic activity audit logging on status moves.
- Interactive terminal simulation inside facility details.
- Localized AI research query stream on task level.

## Research Findings
- The `entity_link` table connects notebooks, notes, and sources, but task connections require specialized validation rules to avoid cluttering standard notebook relationships. Defining a dedicated `task_spec_link` table is cleaner and isolates SRE domain links.
- SSE streams are already implemented for notebooks chat in `api/routers/chat.py`. We can import and adapt the streaming connection utilities for task-level AI research queries.
- Lucide icons (`ClipboardCheck`, `FileShield`, `Terminal`, `BookOpen`) are already present in the workspace's imports and can be reused to keep icon packs unified.
- The `useAsk` prompt structure can handle custom research prompts such as "Find NIST SP 800-53 requirements for...".

## Technical Decisions
| Decision | Rationale |
|---|---|
| Use `task_spec_link` relation table | Graph relationships between task nodes and compliance specifications are best isolated from entity-entity connections. |
| Build React-based terminal emulator | Simplifies frontend deployment without importing external npm libraries like `xterm.js` which might require bundler changes and polyfills. |
| Stream AI research results via SSE | Leverages the codebase's existing streaming pipeline infrastructure. |

## Verification Plan
- Run backend pytest:
  ```bash
  .venv/bin/pytest tests/test_sre_features.py
  ```
- Run frontend type check:
  ```bash
  cd frontend && npx tsc --noEmit
  ```
- Run Playwright test script:
  ```bash
  python3 scripts/verify_sre_simulator.py
  ```
