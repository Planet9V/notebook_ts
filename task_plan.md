# Task Plan - 7 Perspectives (Perspective+) Live Integration

## Goal
Fully wire the **7. Mindset Switcher Dashboard (Perspective+)** in the mockups page to the live backend APIs and database tables, replacing all static mockup states and fake lists with real interactive widgets.

## Peer-Review Architecture Decisions (Multi-Agent Brainstorming)
* **Primary Designer**: Wire all 5 tabs using React query hooks, API client calls, and SurrealDB repository methods.
* **Skeptic / Challenger**: 
  - *Risk*: If the voice generation backend is offline, the client page may hang. *Mitigation*: Render explicit error toasts if TTS API fails.
  - *Risk*: Restarting containers dynamically might cause short connection outages. *Mitigation*: Prompt the user with a warning dialog before executing container restarts.
  - *Risk*: A lack of seeded database records makes the dashboard look empty. *Mitigation*: Seed locations/facilities, tasks, and activity logs during the CRM and Project seeding processes.
* **Constraint Guardian**: Clean up TTS audio Blob URLs on voice generation and page unmount to prevent browser memory leaks; poll rebuilding index status and container states with standard debounces.
* **User Advocate**: Provide an HTML5 `<audio>` player widget for immediate TTS audio verification. Display a live percentage progress bar during pgvector rebuild commands.
* **Arbiter**: APPROVED with the condition that all TypeScript type checks must pass and a CRM seed function must be provided.

---

## Detailed Perspectives Wiring Checklist

### 1. Sales CRM Perspective
- [x] **CRM Funnel Metrics**: Calculate stage counts and conversion percentages dynamically based on the stages of notebooks in `notebooksList` and customer statuses in `customersList`.
- [x] **Active Accounts Ledger**: Map the list to `customersList` from `useCustomers()` instead of the local static array.
- [x] **Compliance Status Actions**: Wire the "Apply Audit Override" button to trigger `useUpdateCustomer` and update the status to `'active'` in SurrealDB.
- [x] **Campaigns Linkage List**: Map to real notebooks representing active campaigns/deals.
- [x] **CRM Seeding**: Update `handleSeedCRM` to seed default customers and linked notebooks to SurrealDB.

### 2. Research Hub Perspective
- [x] **Semantic Search Input**: Wire search input and button to call `searchMutation.mutateAsync` (triggering POST `/api/search`).
- [x] **Search Engine Mode Selector**:
  - [x] Add `searchType` state (`'vector' | 'hybrid'`).
  - [x] Bind "Local KB" and "Hybrid Search (RRF)" radio buttons to `searchType` state.
  - [x] Update `handleResearchSearch` to pass the correct search type to the `/api/search` request.
- [x] **Search Results**: Render dynamic results with matching snippets and HNSW similarity scores.
- [x] **Citation Inspector Popovers**: Load citation detail text dynamically from the active search result record.
- [x] **Document Management Tree**: Map document list to `globalSources` from `sourcesApi.list()`.
- [x] **Document Rename**: Connect to `useUpdateSource` mutation to persist file title updates.
- [x] **Document Delete**: Connect to `useDeleteSource` mutation to delete documents from the database.

### 3. Project Delivery Perspective
- [x] **Locations Seeding**:
  - [x] Update `handleSeedCRM` to seed default locations (Texas Petrochemical, Ohio Nuclear, California Solar Grid) in the database.
  - [x] Update `handleSeedProject` to link the seeded project to the Acme Security customer (`acme.id`).
- [x] **Operations Portfolio Tree**:
  - [x] Import `useLocations` from `@/lib/hooks/use-locations`.
  - [x] Map the tree dynamically to `projectsList`.
  - [x] For each project, fetch and list linked facilities (locations) from `useLocations()` by matching `location.customer_id === proj.customer_id`.
- [x] **Facility Details Card**:
  - [x] On facility selection, query details via `useLocation(selectedLocationId)` or look up the location details from the queried locations list.
  - [x] Render location name, description, address, and facility type dynamically.
- [x] **Kanban / Table Views**: Toggle tasks list sourced from real tasks in `activeDbProject.tasks`.
- [x] **User Assignee Directory**: Fetch real users via `useUsers()` for assignees in the Add Task form.
- [x] **Activity & Communications Stream**:
  - [x] Import `useActivities` from `@/lib/hooks/use-activities`.
  - [x] Fetch timeline activities via `useActivities(activeDbProject?.customer_id || customersList[0]?.id)`.
  - [x] Seed default activities (e.g. email approvals, SRE verification alerts) during CRM seeding.
  - [x] Render dynamic database logs in the Activity Log card.

### 4. Marketing Studio Perspective
- [x] **Visual Schedule Timeline & Analytics**:
  - [x] Map the scheduler timeline to display scheduled podcast episodes from `useScheduledEpisodes()`.
  - [x] Calculate platform counts (LinkedIn, X, Blogs) dynamically based on scheduled episode metadata.
- [x] **AI Voice Generator**:
  - [x] Wire the prompt textarea and Kokoro voice presets (`am_adam`, `af_bella`, `am_michael`) to make a POST request to `/api/voice/tts/synthesize` with the script text and selected voice actor profile.
  - [x] Retrieve the binary MP3 stream as a Blob.
- [x] **Browser Playback**:
  - [x] Convert the binary Blob response to an object URL using `URL.createObjectURL(blob)`.
  - [x] Render a live HTML5 `<audio src={url} controls className="w-full mt-2" />` player for browser audio playback.
  - [x] Clean up the generated Blob URL on new voice synthesis or component unmount to prevent memory leaks.

### 5. Administrator Perspective
- [x] **Docker Containers List**: Query `GET /api/containers/status` via `useQuery` with 10s refetch interval.
- [x] **Container Restart**:
  - [x] Add warning confirmation dialog check for container restarts.
  - [x] Bind container toggle restart buttons to POST `/api/containers/{name}/restart`.
- [x] **pgvector Index Rebuilder**:
  - [x] Wire "Rebuild Similarity Index" button to hit POST `/api/rebuild`.
  - [x] Retrieve `command_id` and poll status `/api/rebuild/{command_id}/status` to display a live percentage progress bar.

---

## Phases of Execution

### Phase 1: Planning & Checklist Design
- [x] Create comprehensive checklist and findings documents under `/planning-with-files` guidelines.

### Phase 2: Seeding & Selections (CRM, Research & Delivery)
- [x] Update seeding function to include Locations/Facilities and Activity logs.
- [x] Wire the search type selector in Research Hub.
- [x] Wire the portfolio tree, details card, and activity stream in Project Delivery.

### Phase 3: Marketing & Admin Wiring
- [x] Wire Marketing Studio timeline, voice synthesis, and browser playback.
- [x] Wire Administrator container restarts and similarity index rebuild status polling.

### Phase 4: Verification
- [x] Run type checks: `cd frontend && npx tsc --noEmit`.
- [x] Run backend tests.
- [x] Run frontend Vitest tests.
- [x] Create Taskmaster orchestrator (`scripts/taskmaster.py`).
