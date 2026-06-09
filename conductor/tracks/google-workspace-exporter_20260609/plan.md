# Implementation Plan: Styleguide Exporter & Google Workspace Connectors

**Track ID:** google-workspace-exporter_20260609
**Spec:** spec.md
**Created:** 2026-06-09
**Status:** [~] In Progress

## Phase 1: Database Schema & OAuth Credentials Form
Set up the SurrealQL credentials schema and the admin settings UI cards.

### Tasks
- [x] **Task 1.1**: Create SurrealQL migrations `37.surrealql` and `37_down.surrealql` to pre-seed default `google_workspace` credential records. Register in `async_migrate.py`.
- [x] **Task 1.2**: Update the publications settings page `frontend/src/app/(dashboard)/settings/publications/page.tsx` to display the Google Workspace configuration card (inputs for Client ID, Client Secret, Scopes, and Redirect URI).

### Verification
- [x] Verify database migrations apply cleanly (`pytest tests/test_config_api.py`).
- [x] Verify credentials settings panel renders correctly in the browser.

## Phase 2: OAuth Callback & Token Exchange
Implement the OAuth 2.0 flow callbacks, token exchanges, and key encryption.

### Tasks
- [x] **Task 2.1**: Implement the callback endpoint `GET /api/credentials/oauth/callback` in `api/routers/credentials.py` exchanging authorization codes for access and refresh tokens.
- [x] **Task 2.2**: Integrate secure encryption via server keys and Vault-path formatting to persist the refresh token inside SurrealDB.

### Verification
- [x] Mock OAuth token exchange and verify tokens are encrypted and saved without leakage in tests.

## Phase 3: Styleguide Document Compiler & Exporters
Implement branded compilers and Google Docs, Sheets, and Slides API connectors.

### Tasks
- [ ] **Task 3.1**: Refactor `compile_markdown_to_docx` in `api/routers/notebooks.py` to compile styles (fonts, colors, margins) dynamically based on active `StyleGuide` database models.
- [ ] **Task 3.2**: Implement `POST /notebooks/export/gdocs` utilizing `googleapiclient.discovery` to generate formatted Docs.
- [ ] **Task 3.3**: Implement `POST /notebooks/export/gslides` converting canvas drawings into slides shapes.
- [ ] **Task 3.4**: Implement `POST /notebooks/export/gsheets` generating structured spreadsheets for compliance scoring checklists.

### Verification
- [ ] Run integration tests `tests/test_google_workspace_exporter.py` validating that document compilation, node conversion, and sheets checklist generation complete successfully.
