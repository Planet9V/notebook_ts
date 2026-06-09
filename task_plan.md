# Task Plan: Social Media Cron Tracker & Google Workspace Exporter Engine

This task plan details the sequential development and verification of the remaining publications features, structured under the Conductor track system.

---

## Current Track: None

---

## 📋 Conductor Track Registry

### 📊 Track 1: `social-media-tracker_20260609` (Social Media Cron Tracker & Metrics Dashboard)
- **Status:** completed
- **Overview**: Implement custom SVG reach line charts on the Publications dashboard page with dynamic channel filters.
- **Phases**:
  - Phase 1: Frontend Type Mapping & API Client (Tasks 1.1 - 1.2)
  - Phase 2: SVG Chart Layout & Channel Filter (Tasks 2.1 - 2.3)

### 📂 Track 2: `google-workspace-exporter_20260609` (Styleguide Exporter & Google Workspace Connectors)
- **Status:** not_started
- **Overview**: Implement Google Drive/Docs/Sheets/Slides connectors, OAuth consent screens, refresh token encryption via Vault-paths, and custom style guides.
- **Phases**:
  - Phase 1: Database Schema & OAuth Credentials Form (Tasks 1.1 - 1.2)
  - Phase 2: OAuth Callback & Token Exchange (Tasks 2.1 - 2.2)
  - Phase 3: Styleguide Document Compiler & Exporters (Tasks 3.1 - 3.4)

---

## 🧪 Verification Log
| Track | Phase | Verification Command | Status | Details |
|---|---|---|---|---|
| `social-media-tracker` | Phase 1 | `npx tsc --noEmit` | [ ] | Pending |
| `social-media-tracker` | Phase 2 | Manual page check & tests | [ ] | Pending |
| `google-workspace-exporter` | Phase 1 | `pytest tests/test_config_api.py` | [ ] | Pending |
| `google-workspace-exporter` | Phase 2 | `pytest tests/test_credentials_oauth.py` | [ ] | Pending |
| `google-workspace-exporter` | Phase 3 | `pytest tests/test_google_workspace_exporter.py` | [ ] | Pending |

## ⚠️ Errors Encountered & Resolution
| Error | Attempt | Resolution |
|-------|---------|------------|
| None | - | - |

---
*Update this file after every phase is completed.*
