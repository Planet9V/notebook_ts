# Findings & Decisions: Social Media Cron Tracker & Google Workspace Exporter

This document tracks technical findings, design decisions, and architectural specifications for the remaining development tracks.

---

## 1. Architectural Decisions (Backend Architect & AI Agent Alignment)

### 1.1 Secure Credentials & Token Management
*   **Decoupled Secret Storage**: All Google OAuth credentials (e.g. `client_secret` and `refresh_token`) will not be stored in clear text or encrypted text directly in the database. Instead, they will write reference paths to HashiCorp Vault (e.g. `secret/data/google_workspace#refresh_token`) to prevent persistent storage database compromises.
*   **Token Refresh & Rotation**: The backend service will exchange the refresh token for a fresh access token prior to executing any export pipeline. Access tokens will have a maximum lifetime of 3600 seconds.

### 1.2 AI Agent Tool Call Integration
To allow autonomous AI agents to run exporters and tracking triggers cleanly:
*   **Well-documented Schemas**: Register all routes as valid tool specifications inside the `skill_registry` table in SurrealDB, providing explicit parameter descriptions and example payloads.
*   **Silent Failures Guard**: If a Google API call fails, the exporter must not crash the thread. It must return a structured JSON response specifying the error details and recovery hints so that the invoking agent can self-heal or request manual intervention.

---

## 2. Frontend & UX Specifications (Frontend Developer, UI/UX Pro Max, UX Audit)

### 2.1 Custom SVG Reach Graphs (WCAG AA Compliant)
*   **Aesthetics (Steve Jobs Approved)**: Rendered in Next.js 15 Client Components using custom inline SVGs. Custom themes will use high-end color palettes (Cyan/Teal gradients on dark slate backgrounds) with interactive path tooltips.
*   **Accessibility**:
    *   **Color Contrast**: The timeseries line graph colors must maintain at least a `4.5:1` contrast ratio against the slate background.
    *   **Focus Rings**: Navigating through the metrics timeseries graph nodes via keyboard must show visible, high-contrast cyan focus outlines (`focus:ring-2 focus:ring-cyan-500`).
    *   **Non-Color Indicators**: Line paths will use distinct stroke-dasharrays (dashed, dotted, solid) so that colorblind users can differentiate between Views, Clicks, and Interactions.
    *   **Screen Reader Support**: Provide an alternate HTML table representation (`role="table"`) containing the raw metrics values for screen reader compatibility.

### 2.2 touch & Reachability
*   **Touch Targets**: All filtering dropdowns, selectors, and calendar cells must maintain a minimum touch target size of `44x44px` on mobile viewports.
*   **Reachability**: Position the primary channel toggle dropdowns within easy reach of the thumb on mobile screens (reach-friendly bottom sheets or middle-grid placements).
*   **User Control**: Implement a confirmation step prior to initiating OAuth redirects, giving users the freedom to cancel the flow before leaving the page.

---

## 3. Conductor Integration & Verification

All development tasks follow the strict TDD rules configured in the `workflow.md`:
*   **TDD Execution**: Every task begins by writing a failing test in `tests/test_publications_tracker.py` or `tests/test_google_workspace_exporter.py` before any application code is added.
*   **Verification Gate**: After all tasks in a phase are complete, type-safety is validated using `npx tsc --noEmit` and all automated tests are run before obtaining approval to continue.
