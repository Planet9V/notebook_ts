# Reference Notes: Documentation Page Structure & Discrepancies

This document serves as a reference to ensure continuity between the orchestrator, agents, and subagents when updating the application documentation page.

---

## 1. Documentation Page Structure Overview (`DOCUMENTATION` Array)

The documentation page at `frontend/src/app/(dashboard)/documentation/page.tsx` stores documentation content statically in a hierarchical array of `DocSection` objects.

### Current Sections
1. **Overview & PRD (`overview`):** Purpose, User Personas, Product Requirements Summary.
2. **Architecture & Tech Stack (`architecture`):** System Architecture diagram, Backend Stack (table), Frontend Stack (table), AI & LLM Integration, Database Architecture.
3. **Site Map & Navigation (`sitemap`):** Sidebar Navigation Structure (table), Complete Route Tree (table).
4. **API Reference (`api`):** API tables for Sources, Notebooks, Chat, Search, CRM, Compliance, Models, and Content.
5. **Features & Use Cases (`features`):** Details on Source Management, Notebooks, Ask & Search, CRM & Pipeline, CSET Compliance Auditing, Podcast Generation, Content Transformations.
6. **Component Library (`components`):** Component Directories (table), Custom Hooks (table), State Management (Zustand), API Client Modules (table).
7. **Developer Guide (`developer`):** Development Setup code block, Project Structure tree, Coding Standards list, Environment Variables (table).
8. **Auditor Reference (`auditor`):** Security Architecture, Compliance Coverage, Data Flow, API Credentials.

---

## 2. Identified Discrepancies & Audit Findings

We evaluated the `page.tsx` static content against the actual codebase files, directories, and schemas. Below are the discrepancies:

### A. General System Metrics
* **Database Migrations count:**
  * *Documented:* "19+ migration files tracking schema evolution" (Architecture section).
  * *Codebase:* There are **38 schema migration files** (latest is `38.surrealql` / version 38).
* **Backend API Router count:**
  * *Documented:* "32 API router modules" (Project Structure tree).
  * *Codebase:* There are **43 handler/router files** under `api/routers/` (excluding `__init__.py`).

### B. Custom Hooks
* *Documented:* "Custom Hooks (32)" in text, with 30 rows in the hooks table.
* *Codebase:* There are **36 active custom hooks** in `frontend/src/lib/hooks/` (excluding tests & `CLAUDE.md`).
* **Missing Hooks:**
  1. `useActivities` (`use-activities.ts`)
  2. `useAgents` (`use-agents.ts`)
  3. `useBreadcrumbLabel` (`use-breadcrumb-label.ts`)
  4. `useSkills` (`use-skills.ts`)
  5. `useUsers` (`use-users.ts`)
  6. `useVoiceRegistry` (`use-voice-registry.ts`)
  7. `useVoiceSessions` (`use-voice-sessions.ts`)

### C. API Client Modules
* *Documented:* "API Client Modules (23)" in text, with 22 rows in the API clients table.
* *Codebase:* There are **28 active API client modules** in `frontend/src/lib/api/` (excluding `CLAUDE.md`).
* **Missing Modules:**
  1. `activities.ts`
  2. `agents.ts`
  3. `publications.ts`
  4. `skills.ts`
  5. `users.ts`
  6. `voice.ts`

### D. Route Tree & Navigation
* *Documented:* Lists 19 routes in `sitemap-routes` and 15 items in `sitemap-navigation`.
* *Codebase:* Missing several pages and settings directories.
* **Missing Routes in Docs:**
  * `/publications` (Main Dashboard page for publication management)
  * `/voice-playground` (Voice RAG playground route)
  * `/settings/containers` (Docker container observatory settings page)
  * `/settings/publications` (Schedules & SMTP settings page)
  * `/settings/voice` (Voice configurations settings page)

### E. API Reference Endpoints
* **Activities API:**
  * *Documented:* Not listed in `api-crm`.
  * *Codebase:* Exposes:
    * `GET /api/activities` (List activities for a customer)
    * `POST /api/activities` (Create a new activity event)
    * `GET /api/activities/types` (Return valid activity types)
* **Publications API:**
  * *Documented:* Not listed in `api-content`.
  * *Codebase:* Exposes:
    * `GET /api/publications/settings` (Fetch SMTP/publication settings)
    * `POST /api/publications/settings` (Save SMTP settings)
    * `POST /api/publications/settings/test` (Pre-flight SMTP check)
    * `POST /api/publications/schedule` (Schedule a post)
    * `PUT /api/publications/schedule/{post_id}` (Update scheduled post)
    * `DELETE /api/publications/schedule/{post_id}` (Delete/cancel post)
    * `GET /api/publications/calendar` (Retrieve posts by date range)
    * `GET /api/publications/metrics` (Fetch aggregated analytics)
    * `GET /api/publications/metrics/history` (Retrieve snapshots for charts)
    * `POST /api/publications/metrics/track-due` (Trigger manual metrics refresh)
* **Path Discrepancies:**
  * The docs list `/customers/{id}` (should be `/api/customers/{customer_id}`)
  * The docs list `/api/contacts/{id}` (should be `/api/contacts/{contact_id}`)
