# Original User Request

## Initial Request — 2026-06-04T21:53:39Z

Add a "Deep Research" interactive option to the "New Research" card/dialog and implement an asynchronous, step-by-step Gemini Deep Research emulation workflow on the backend for multi-engine research queries, including event recording, status polling, and robust error/timeout handling.

Working directory: /Users/jimmcknney/notebook_tetrel
Integrity mode: development

## Requirements

### R1. Deep Research Option in Frontend
* Add a "Deep Research" toggle or checkbox to the "New Research" and "Edit Research" configuration dialogs inside [frontend/src/app/(dashboard)/research/page.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/(dashboard)/research/page.tsx).
* Provide a brief user-facing explanation in the UI describing the process (1. Clarify, 2. Plan, 3. Gather, 4. Synthesize, 5. Report).
* Ensure the Kanban card shows a special status or progress indicator when a research task is executing under the "Deep Research" flow.

### R2. Backend Deep Research Process Emulation
* Implement an asynchronous, step-by-step research execution workflow mimicking the Gemini Deep Research process inside the API routers/workers:
  1. **Clarify the task**: Restate the user's query and goals as a concrete research objective.
  2. **Plan the research**: Break the objective into a multi-point research plan of smaller sub-questions/tasks.
  3. **Search and gather**: Concurrently search across selected search engines (Perplexity, Tavily, Exa, etc.) to collect evidence.
  4. **Reason and synthesize**: Compare sources, check conflicts, extract key themes, and discard low-quality data.
  5. **Produce and refine the report**: Generate a structured markdown report complete with traceable citations.
* The backend execution logic must be flexible, logging intermediate stage transition events (`clarifying`, `planning`, `gathering`, `synthesizing`, `reporting`) to SurrealDB so the frontend can retrieve the current status.
* Implement robust timeout controls (handling up to 8 minutes of execution) and recovery mechanisms if a search engine fails or times out.

### R3. Multi-Engine Inter-weaving
* If the user selects multiple search engines (e.g. Perplexity and Tavily), the "Gather" phase must intelligently inter-weave queries to both engines and merge the findings.

## Acceptance Criteria

### Frontend UI Criteria
- [ ] The "New Research" dialog contains a "Deep Research" toggle with a descriptive tool-tip or helper text explaining the 5-step process.
- [ ] The Kanban card under the "Researching" or "Analyzing" columns displays the active Deep Research stage (e.g. "Planning research...", "Gathering sources...") based on backend events.
- [ ] The results inside the "Review & Enhance" card display the full synthesized report with markdown and citations.

### Backend Execution Criteria
- [ ] The backend defines a new flag/field `is_deep_research` on the `ResearchItem` model.
- [ ] The research execution worker branches when `is_deep_research` is True and runs the 5-step process.
- [ ] The backend records transition events during execution to a log or state field on the research item.
- [ ] Execution survives engine timeouts and logs/handles errors gracefully, completing with whatever information was successfully retrieved.

### Verification Suite
- [ ] A new test suite is created under `tests/test_deep_research.py` verifying that:
  - Triggering a Deep Research item transitions through the 5 states.
  - Failures in one engine do not crash the entire process.
  - The final output contains markdown text and citation annotations.

## Follow-up — 2026-06-04T23:52:49Z

Refactor the Operations dashboard on `/pipeline` to act as a unified "Operations Center". Integrate the newer "Research Intelligence" and "Project Delivery" dashboards directly inline under a single workspace selector dropdown, clean up obsolete pipeline paths, and consolidate the sidebar navigation to simplify the user interface.

Working directory: /Users/jimmcknney/notebook_tetrel
Integrity mode: development

## Requirements

### R1. Unified Workspace Switching in Pipeline Page
* Refactor the dropdown selector on [frontend/src/app/(dashboard)/pipeline/page.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/(dashboard)/pipeline/page.tsx) to support four operational workspaces:
  1. **Sales CRM** (`sales`): Mounts the original notebooks Kanban board, data table, and monthly calendar views.
  2. **Research Hub** (`research`): Mounts the newer research workflow from [frontend/src/app/(dashboard)/research/page.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/(dashboard)/research/page.tsx) inline (complete with stats, filters, custom research Kanban columns, creation dialog, and edit/review drawer).
  3. **Project Delivery** (`projects`): Mounts the projects workflow from [frontend/src/app/(dashboard)/projects/page.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/(dashboard)/projects/page.tsx) inline (complete with stats, filters, project Kanban columns, and creation dialog).
  4. **Publication Queue** (`publication`): Mounts the original publication notebooks Kanban board, list, and calendar views.
* Ensure the page title and subtitle dynamically update to match the active workspace.
* Keep the main page header layout (title, subtitle, select dropdown, view modes, and refresh buttons) uniform and aligned across all four tabs.

### R2. Clean up Navigation & Obsolete Routes
* Consolidate the sidebar menu in [frontend/src/components/layout/AppSidebar.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/components/layout/AppSidebar.tsx):
  * Remove the standalone "Research Intelligence" and "Project Delivery" items from the Operations section.
  * Keep the "Pipeline" sidebar item and rename it to "Operations Workspace" or "Operations Center".
* To prevent broken links or bookmarked errors, refactor the page files [frontend/src/app/(dashboard)/research/page.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/(dashboard)/research/page.tsx) and [frontend/src/app/(dashboard)/projects/page.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/(dashboard)/projects/page.tsx) to redirect client-side to `/pipeline?tab=research` and `/pipeline?tab=projects` respectively.

### R3. Safe Backward Compatibility & Schema Stability
* Ensure that the old `research` pipeline columns configuration in [frontend/src/lib/constants/pipelines.ts](file:///Users/jimmcknney/notebook_tetrel/frontend/src/lib/constants/pipelines.ts) is cleanly bypassed or isolated so that existing notebook records with `pipeline_type` set to `research` do not crash the app.
* Ensure data-fetching is decoupled: the pipeline page should fetch notebooks for Sales and Publications, research items for Research Hub, and projects for Project Delivery, without mixing data models.

## Acceptance Criteria

### Workspace Selector & Inline Views
- [ ] Toggling the workspace select dropdown in `/pipeline` updates the visual workspace panel immediately without full-page reloads.
- [ ] When "Research Hub" is selected, the page renders the full Research Intelligence dashboard, including the research item Kanban columns (Queued, Researching, Analyzing, Review & Enhance, Completed), stats grid, and "New Research" creation dialog.
- [ ] When "Project Delivery" is selected, the page renders the Project Delivery dashboard, including the project Kanban columns (Planning, Kickoff, In Progress, Review, Delivered), stats grid, and "New Project" dialog.
- [ ] When "Sales CRM" or "Publication Queue" is selected, the page renders the original notebooks Kanban Board / Data Table / Monthly Calendar correctly.
- [ ] The header (title, subtitle, selector dropdown) has a consistent layout and alignment across all four workspaces.

### Sidebar Navigation & Redirection
- [ ] The sidebar navigation has no separate links for "Research Intelligence" and "Project Delivery" under the Operations section.
- [ ] Navigating directly to `/research` or `/projects` redirects the browser to `/pipeline?tab=research` or `/pipeline?tab=projects` and automatically mounts the correct workspace panel.

### Execution Safety
- [ ] The codebase builds successfully without TypeScript compilation errors.
- [ ] Old research pipeline components are removed or bypassed, and no broken imports are introduced.

## Follow-up — 2026-06-05T09:40:32Z

Enhance the Bento-Grid Customer Dossier View at `frontend/src/app/(dashboard)/customers/[id]/bento/page.tsx` to include an interactive layout editor, neon glow indicators for critical security/deal indicators, and a global dashboard search filter.

Working directory: /Users/jimmcknney/notebook_tetrel
Integrity mode: development

## Requirements

### R1. Dashboard Header Control Center & Toggles
* Add a search input field (`🔍 Filter console...`) and a toggle button (`⚙️ Edit Grid Layout`) next to the "Switch to Classic View" button in the bento page header.
* Clicking the `⚙️ Edit Grid Layout` toggle enters/exits layout configuration mode.

### R2. Neon-Glow Status Border System
* Style the Bento cards (`CFATS Posture`, `B2B Deal Pipeline`, `Risk & Warnings`) with dynamic 1px glowing neon borders and subtle shadows that reflect their status:
  * **Risk & Warnings Card**: Pulses with a neon-orange glow (`shadow-[0_0_15px_rgba(249,115,22,0.2)]`) if `activeThreatCount > 0`, otherwise soft emerald green.
  * **CFATS / Compliance Card**: Soft cyan glow, turning orange if any facility audit average compliance score is below 50%.
  * **B2B Pipeline Card**: Soft cyan/slate glow.
* All glow transitions must be smooth (`transition-shadow duration-500 ease-in-out`).

### R3. Global Search & Highlight Filtering
* Implement interactive filtering on the Overview Console using the search input field.
* As the user types:
  * Highlight any matching text in-place (e.g. within lists, tables, card texts).
  * If a Bento card has *no* matching content, smoothly dim the card to `opacity-40` to maintain layout structure without hiding it entirely.
* Debounce input by 100ms and sanitize inputs to prevent regex/XSS rendering issues.

### R4. Persistent Drag-and-Drop Layouts
* When `Edit Grid Layout` is active, overlay a drag-handle indicator on each Bento card.
* Allow the user to drag and reorder the Bento cards on the grid.
* Save the layout positions dynamically to `localStorage` per `customerId`.
* Add a "Reset Layout" button in edit mode. Ensure default layout is rendered during SSR hydration to prevent flash-of-unstyled-content (FOUC).

## Acceptance Criteria

### Interactive UI & Controls
- [ ] Toggling the "Edit Grid Layout" button enables visual drag handles on the bento cards.
- [ ] Dragging and rearranging cards updates the layout order. Reloading the page retains the user's custom layout.
- [ ] Clicking "Reset Layout" restores the default layout structure.
- [ ] Typing in the search bar dims non-matching bento cards to 40% opacity.
- [ ] Matching search terms are highlighted with a cyan highlight overlay.

### Visual Styling
- [ ] The "Risk & Warnings" card border/glow correctly changes color depending on `activeThreatCount` (orange if > 0, emerald if 0).
- [ ] The visual glow effects are clean, subtle, and fit the modern cyberpunk-style dark ledger aesthetic.
- [ ] The layout remains responsive on tablet and mobile screens, disabling drag-and-drop on mobile devices to prevent interaction conflicts.

### Execution Safety
- [ ] The codebase builds successfully without TypeScript or hydration mismatch errors.

## Follow-up — 2026-06-05T15:35:33Z

Review, debug, and implement the necessary background tasks and integration endpoints to ensure the content calendar scheduling, social media posting (LinkedIn, Twitter, email), and research/podcast scheduling systems work end-to-end.

Working directory: /Users/jimmcknney/notebook_tetrel
Integrity mode: development

## Requirements

### R1. Social Media & Email Publishing Execution Worker
* Implement or repair the background task/worker that finds `queued` scheduled posts whose `scheduled_time` is in the past and publishes them.
* For **email**: Send the email using the configured SMTP settings in `email_setting`. In sandbox mode (when SMTP host is empty or dummy), log a warning and mark the post as `published`.
* For **LinkedIn** & **Twitter**: Perform publishing using credentials in the database (or mock-publish in sandbox mode if credentials start with `"sandbox"` or are missing), transitioning status from `queued` to `published` (or `failed` if an error occurs).
* Expose a manual trigger endpoint (`POST /api/publications/publish-due`) to run the publishing worker immediately.

### R2. Background Scheduling & Cron Orchestration
* Integrate background worker tasks for publications, scheduled searches, and podcast episodes so they run automatically on the server:
  * Scheduled posts: Run every 1 minute to check for due publications.
  * Scheduled searches: Run every 5 minutes to execute due searches.
  * Podcast schedules: Run every 5 minutes to trigger scheduled episode generations.
* Ensure these schedulers start automatically with the API server (e.g., using `asyncio` background tasks inside the FastAPI lifespan handler in `api/main.py`).

### R3. Calendar & Frontend Integration
* Verify and fix the Publications Content Calendar in the frontend so that scheduled posts, campaigns, and metrics are displayed correctly.
* Ensure clicking "Publish Now" or triggering a manual sync updates status changes immediately in the UI.

## Acceptance Criteria

### Social Media & Email Publishing
- [ ] Due queued posts are successfully published (marked as `published`) and metrics increments are tracked by the background worker.
- [ ] Sending a manual trigger request to `POST /api/publications/publish-due` immediately publishes all due posts.
- [ ] Email posts actually attempt to connect to SMTP when credentials are valid, or log a sandbox message when in mock/sandbox mode.

### Schedulers & Background Tasks
- [ ] Schedulers for publications, searches, and podcasts are initialized inside FastAPI's startup lifespan.
- [ ] A scheduled search is executed automatically when its next run time is reached, and the results are successfully saved to the linked notebook.
- [ ] Schedulers do not block the main API event loop.

### Test Coverage & Safety
- [ ] The codebase compiles successfully without TypeScript or python runtime errors.
- [ ] The pytest test suite passes successfully.

