# Findings & Decisions: Social Media Cron Tracker & Google Workspace Exporter

This document tracks configuration variables, technical findings, and design decisions for **Sub-Plan A** and **Sub-Plan B**.

---

## 1. Google Workspace Variables & Configuration
The system allows admins to manage all environment-level and integration-level variables dynamically via the Web Admin panel. These variables are stored in the `credential:google_docs` record in the database:

| Configuration Variable | Database Property | UI Control Element | Description |
|------------------------|-------------------|---------------------|-------------|
| Client ID | `client_id` | Input field | Google API Console OAuth 2.0 client credential identifier. |
| Client Secret | `client_secret` | Password/Text field | Google API Console OAuth 2.0 secret (stored encrypted). |
| Redirect URI | `redirect_uri` | Read-only input | OAuth redirect callback handler (default: `/api/credentials/oauth/callback`). |
| Authorized Scopes | `scopes` | Select / Multi-checkbox | Authorized scopes (e.g. `documents`, `spreadsheets`, `presentations`, `drive.file`). |
| Refresh Token | `refresh_token` | Status message | Stored OAuth refresh token used to request new access tokens. |

---

## 2. Technical Findings

### 2.1 Publications Performance Charts (Task A.4)
- **Status**: Backend timeseries metrics endpoints `GET /api/publications/metrics/history` and manual tracking trigger `POST /api/publications/metrics/track-due` are fully functional and pass all integration tests.
- **Frontend Charting**: Since there is no Recharts or Tremor library in `package.json`, we will render a custom, highly styled SVG line/bar graph inside `frontend/src/app/(dashboard)/publications/page.tsx`.
- **SVG Styling Details**: We will use smooth gradients (fade-in areas), precise path coordinate calculations, and grid lines. The chart will support a channel filter ("All Channels", "LinkedIn", "Twitter", "Email") to toggle timeseries visibility.

### 2.2 Google OAuth Authentication Flow (Tasks B.2 - B.3)
1. **Consent Screen Redirect**: The frontend initiates authorization by redirecting to Google's consent screen. Client ID and Scopes are retrieved dynamically from `credential:google_docs`.
2. **Callback Handler**: Google redirects the browser to `GET /api/credentials/oauth/callback?code=...`.
3. **Token Exchange**: The backend exchanges the code for access and refresh tokens using `httpx.post("https://oauth2.googleapis.com/token", data=...)`.
4. **Encryption**: The refresh token is encrypted using the server's master key (`OPEN_NOTEBOOK_ENCRYPTION_KEY`) before saving in SurrealDB, matching the existing `api_key` encryption model in `Credential._prepare_save_data`.

### 2.3 Styleguide DOCX Compiler (Task B.4)
- **Current State**: `compile_markdown_to_docx` in `api/routers/notebooks.py` uses hardcoded Calibri fonts and `#ef4444` colors.
- **Styleguide Mapping**: We will update the compiler to load the chosen `StyleGuide` record. It will dynamically apply the style guide's fields:
  - Font Families (`title_font`, `body_font`)
  - Typography Sizes (`title_size`, `heading_size`, etc.)
  - Color Brand Schemes (`primary_color`, `secondary_color`, `accent_color`)
  - Page margins (`margin_top`, `margin_bottom`, `margin_left`, `margin_right`)

### 2.4 Google Docs, Slides & Sheets Exporters (Tasks B.5 - B.6)
- **Google Docs Exporter (`POST /notebooks/export/gdocs`)**: Exchanges the refresh token for a fresh access token, uses `googleapiclient.discovery` to build a Docs document, and formats sections and tables natively.
- **Google Slides Exporter (`POST /notebooks/export/gslides`)**: Fetches all `asset` records linked to the notebook (which are the drawn nodes from the React Flow canvas) and draws matching boxes, labels, and text on a new slides deck.
- **Google Sheets Exporter (`POST /notebooks/export/gsheets`)**: Compiles all assessment/quiz scorecard responses for the notebook and dumps them into a structured checklist spreadsheet.

---

## 3. Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Custom SVG Line Chart | Avoids adding third-party library bloat and possible dependency version clashes (Next.js 16/React 19 compatibility). |
| Secure Callback Route | Re-uses the existing `/api/credentials` encryption framework for OAuth tokens to prevent sensitive secrets from leaking. |
| Google Client Library | Leverages the official Google Client python libraries to ensure robust API calls and minimize custom request logic. |

---
*Update this file after any discovery is made.*
