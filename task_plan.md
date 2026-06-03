# Task Plan: Social Media Cron Tracker & Google Workspace Exporter Engine

This task plan details the sequential development and verification of **Sub-Plan A (Social Media Cron Tracker & Metrics Dashboard)** and **Sub-Plan B (Styleguide Exporter & Google Workspace Connectors)**. 

Both phases strictly adhere to the **Karpathy Rules** (readable, robust, non-stubbed code with zero mock bypasses in production paths) and guarantee that **all configuration parameters** (SMTP credentials, OAuth Client IDs, secrets, redirect URIs, and scopes) can be fully managed via the web-based Admin interface.

---

## Goal
Implement background social media engagement metrics tracking, timeseries Reach charts, and robust Google Workspace exporters (Docs, Sheets, Slides) linked to dynamic client style guides, fully configurable via the web-based settings panels.

## Current Phase
Phase 1: Sub-Plan A Frontend Reach Charts

---

## 📋 Execution Checklist

### 📊 Sub-Plan A: Social Media Cron Tracker & Metrics Dashboard (Remaining)
- **Status:** in_progress

#### Task A.4: Update Publications page frontend with reach graphs
- [ ] Add `getMetricsHistory` API call in [publications.ts](file:///Users/jimmcknney/notebook_tetrel/frontend/src/lib/api/publications.ts) fetching from `GET /api/publications/metrics/history`.
- [ ] Add `PublicationMetricsHistoryEntry` model to [publications.ts](file:///Users/jimmcknney/notebook_tetrel/frontend/src/lib/types/publications.ts).
- [ ] Add an SVG-based timeseries reach line chart on the Publications Dashboard [page.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/%28dashboard%29/publications/page.tsx) rendering historical views, clicks, and interactions over time.
- [ ] Add a channel-based select filter (All, LinkedIn, Twitter, Email) to dynamically filter timeseries data.
- [ ] Verify type-safety with `npx tsc --noEmit` and run the application.

---

### 📂 Sub-Plan B: Styleguide Exporter & Google Workspace Connectors
- **Status:** pending

#### Task B.1: Create database migrations for Google OAuth credentials structure
- [ ] Create SurrealQL migration `37.surrealql` to pre-seed default `google_workspace` credential record template if not exists.
- [ ] Create SurrealQL rollback `37_down.surrealql`.
- [ ] Register migration 37 in `open_notebook/database/async_migrate.py`.
- [ ] Run pytest suite to verify migrations apply cleanly.

#### Task B.2: Google Workspace credentials settings forms
- [ ] Modify [page.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/%28dashboard%29/settings/publications/page.tsx) to add a card for **Google Workspace & Drive Exporters Configuration**:
  - Inputs for: Client ID, Client Secret, Redirect URI (showing default backend URL), Scopes.
  - Displays linked status (Linked with Google Account [Email] or Not Connected).
  - Button to initialize authorization flow.
- [ ] Add backend endpoints in [publications.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/publications.py) or `credentials.py` to get/update Google OAuth client configurations in `credential:google_docs` table.

#### Task B.3: Implement Google OAuth authentication redirect flow callback
- [ ] Add callback handler `GET /api/credentials/oauth/callback` in [credentials.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/credentials.py).
- [ ] Exchange authorization code for access and refresh tokens.
- [ ] Encrypt and persist tokens into `credential:google_docs`.
- [ ] Return a simple success template indicating successful account linking.

#### Task B.4: Implement branded DOCX/PDF style guide compiler
- [ ] Update `compile_markdown_to_docx` in [notebooks.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/notebooks.py) to load dynamic styles (fonts, primary/secondary colors, margins, logos) from the chosen `StyleGuide` database model.
- [ ] Support custom font families, colored headers, custom margins, and logos.

#### Task B.5: Implement Google Docs SOW exporter
- [ ] Refactor `POST /notebooks/export/gdocs` in [notebooks.py](file:///Users/jimmcknney/notebook_tetrel/api/routers/notebooks.py) to authenticate via stored Google credentials.
- [ ] Use `googleapiclient.discovery` to dynamically construct, write, and format document headers, sections, and tables natively in Google Docs.
- [ ] Automatically upload to the user's Google Drive and return the document edit URL.

#### Task B.6: Implement Google Slides and Sheets connectors
- [ ] Add `POST /notebooks/export/gslides` creating presentations from network drawing assets (converting nodes/edges from canvas to slide shapes).
- [ ] Add `POST /notebooks/export/gsheets` compiling CSET compliance quiz checklist answers into spreadsheets.
- [ ] Wire both exporters in the [B2BDraftingWorkspace.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/%28dashboard%29/notebooks/components/B2BDraftingWorkspace.tsx) dropdown menu.

#### Task B.7: Automated integration tests for Google Workspace
- [ ] Create `tests/test_google_workspace_exporter.py` verifying full token exchange, styleguide doc generation, and file uploads.
- [ ] Run the complete test suite.

---

## 🧪 Verification Log
| Task | Method | Status | Details |
|------|--------|--------|---------|
| Task A.1 - A.3 | `pytest tests/test_publications_tracker.py` | [x] | Passed 100% |
| Task A.4 | `npx tsc --noEmit` & page navigation | [ ] | Pending |
| Task B.1 | `pytest tests/test_config_api.py` | [ ] | Pending |
| Task B.3 - B.6 | `pytest tests/test_google_workspace_exporter.py` | [ ] | Pending |

## ⚠️ Errors Encountered & Resolution
| Error | Attempt | Resolution |
|-------|---------|------------|
| None | - | - |

---
*Update this file after every phase is completed.*
