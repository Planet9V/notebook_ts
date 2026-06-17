# Task Plan: SRE Project Delivery Persona Feature Suite

## Goal
Implement a premium, state-of-the-art feature suite for the Project Delivery (SRE) Persona in the workspace, including:
1. Task-to-Spec Canvas Edges on Relations Graph.
2. Playbook Context Sync Panel inside task views.
3. Automated SRE Activity Logging on task moves.
4. Cluster Configuration Simulator CLI inside tree views.
5. Task-Level AI Research Panel with SSE event streaming.

## Current Phase
Phase 0: Architecture & Research (Complete)

## Phases

### Phase 1: Database Migration & Schema Setup
- [ ] Create SurrealDB migrations `60.surrealql` and `60_down.surrealql` defining `task_spec_link` table.
- [ ] Register migration in `open_notebook/database/async_migrate.py`.
- [ ] Execute migration runner to create table and verify schema.
- **Status:** pending

### Phase 2: Backend API Endpoints
- [ ] Define Pydantic models for `task_spec_link` in `api/models.py`.
- [ ] Build Link/Unlink router endpoints in `api/routers/tasks.py`.
- [ ] Update `update_task` route to log SRE activity state transitions automatically to the `activity` table.
- [ ] Create simulator router endpoint to process basic mock commands.
- **Status:** pending

### Phase 3: Relations Canvas Integration
- [ ] Update `RelationsGraph.tsx` to query and display Task nodes alongside Note/Source spec nodes.
- [ ] Implement visual connection drawing within `onConnect` to link tasks to specs (persisting to database).
- [ ] Render custom badges/icons on edges for tasks linked to compliance criteria.
- **Status:** pending

### Phase 4: SRE Perspective Workspace Panels
- [ ] Create sliding Drawer/Sheet for task detail inspection.
- [ ] Build Playbook Context Sync panel that queries local knowledge bases for notes containing `tag:playbook`.
- [ ] Implement Task-Level AI Research panel inside task details with streaming SSE updates.
- **Status:** pending

### Phase 5: Cluster Configuration Simulator Component
- [ ] Design glassmorphic retro CLI console container.
- [ ] Program response streams for simulated commands: `help`, `deploy`, `status`, `logs`.
- [ ] Log successful deployments directly to the live activity stream.
- **Status:** pending

### Phase 6: Automated Testing & Verification
- [ ] Write integration test cases in `tests/test_sre_features.py` for task spec linkage.
- [ ] Conduct end-to-end type safety checks (`npx tsc --noEmit`).
- [ ] Write Playwright validation scripts to capture screenshots and confirm visual flows.
- **Status:** pending

## Key Questions
1. Should tasks linked to critical compliance standards display blinking indicator lights or special border glows on the canvas? (Yes, we can apply an overlay pulse animation).
2. What are the limits on simulation command history size? (We will cap local terminal buffer size to 100 entries).

## Decisions Made
| Decision | Rationale |
|---|---|
| Use `task_spec_link` table | Normalizes the task-to-spec graph relations in SurrealDB rather than loading tags. |
| Stream AI research results via SSE | Avoids long-polling and provides instantaneous user feedback during deep analysis. |
| Use client-side React code for the terminal | Extremely lightweight, highly customizable, and requires no docker execution shell access. |
