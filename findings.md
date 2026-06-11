# Findings - 7 Perspectives (Perspective+) Wiring & Interactive Elements

This findings document analyzes each interactive component, link, button, and data display within the **7. Mindset Switcher Dashboard (Perspective+)** tab in the mockups page, matching it to the live SurrealDB and FastAPI endpoints.

---

## 1. Sales CRM Perspective

| Element / Widget | Interactive Component | Action / Event | Target Endpoint / Database Query | Current State |
| :--- | :--- | :--- | :--- | :--- |
| **Seed CRM Trigger** | "Seed CRM Accounts & Deals" Button | `onClick={handleSeedCRM}` | POST `/api/customers` (multiple)<br>POST `/api/notebooks` (multiple) | Fully wired (inserts ACME, Apex, Global Logistics) |
| **Sales Funnel Metrics** | Bento metrics cards & conversion bars | Computed in frontend | `notebooksList` from `useNotebooks()` & `customersList` from `useCustomers()` | Fully wired |
| **Campaigns Linkage** | "Active Marketing Campaigns" ledger list | Maps `notebooksList` | Sourced from `notebook` table in SurrealDB | Fully wired |
| **Accounts Ledger** | "Active Accounts & Compliance" card list | Maps `customersList` | Sourced from `customer` table in SurrealDB | Fully wired |
| **Audit Override** | "Apply Audit Override" button (Blocked items) | `onClick` triggers mutation | `useUpdateCustomer()` -> PUT `/api/customers/{id}` (sets status to `'active'`) | Fully wired |

---

## 2. Research Hub Perspective

| Element / Widget | Interactive Component | Action / Event | Target Endpoint / Database Query | Current State |
| :--- | :--- | :--- | :--- | :--- |
| **Search Box** | Semantic Search Query input | `onChange`, `onKeyDown` | Bound to `researchSearchQuery` state | Fully wired |
| **Search Button** | "Search" Button | `onClick={handleResearchSearch}` | POST `/api/search` with `{ query, type: 'vector', limit: 5 }` | Fully wired |
| **Search Mode Toggle**| "Local KB" vs "Hybrid Search (RRF)" Radios | `onChange` selection | POST `/api/search` parameter `{ type: 'vector' \| 'hybrid' }` | **Missing / Unwired** (radios are static and do not update search type) |
| **Citation Inspector** | `[Inspect Citation]` Link on search results | `onClick` opens popover | Local react state lookup from `researchSearchResults` | Fully wired |
| **Document tree** | "Corpus Document Management" card list | `onClick` selects document | `globalSources` from `sourcesApi.list()` (GET `/api/sources`) | Fully wired |
| **Document Rename** | "Rename" button in Selected Doc card | Prompt + `updateSourceMutation` | PUT `/api/sources/{id}` (updates title) | Fully wired |
| **Document Delete** | "Delete" button in Selected Doc card | Confirm + `deleteSourceMutation` | DELETE `/api/sources/{id}` | Fully wired |

---

## 3. Project Delivery Perspective

| Element / Widget | Interactive Component | Action / Event | Target Endpoint / Database Query | Current State |
| :--- | :--- | :--- | :--- | :--- |
| **Portfolio Tree** | Org/Project/Facility list | `onClick` expands/selects node | Currently maps to local static state `deliveryNestedTree` | **Static Mock** |
| **Facility Info Card** | Details card under tree | Selected node displays config | Reads from static `facilities` list | **Static Mock** |
| **Seed Project & Locs** | "Seed Default Project & Tasks" button | `onClick={handleSeedProject}` | POST `/api/projects` (creates compliance project & tasks) | Semi-wired (needs location/facility seeding) |
| **User Filter** | "All Users" / "Unassigned" select dropdown | `onChange` updates filter | `usersList` from `useUsers()` (GET `/api/users`) | Fully wired |
| **Manage Users** | "Users" button | Opens Directory Dialog | Dialog has User CRUD forms | Fully wired |
| **Create User Form** | Form fields + "Create User" button | Form inputs + `onClick` | POST `/api/users` via `createUserMutation` | Fully wired |
| **Delete User Trigger** | "Delete" button next to system users | `onClick` | DELETE `/api/users/{id}` via `deleteUserMutation` | Fully wired |
| **Kanban View** | Kanban columns (Todo, In Progress, etc.) | Maps filtered project tasks | Sourced from `activeDbProject.tasks` | Fully wired |
| **Move Task State** | Click Task Card | `onClick` triggers state update | `updateTaskMutation` -> PUT `/api/projects/{projectId}/tasks/{taskIndex}` | Fully wired |
| **Add Task Form** | Dialog + "Add Task" button | Form inputs + `onClick` | POST `/api/projects/{projectId}/tasks` via `addTaskMutation` | Fully wired |
| **Activity Stream** | "Activity & Communications" log card | Lists email / slack logs | Hardcoded static messages in list | **Static Mock** |

---

## 4. Marketing Studio Perspective

| Element / Widget | Interactive Component | Action / Event | Target Endpoint / Database Query | Current State |
| :--- | :--- | :--- | :--- | :--- |
| **Scheduler Timeline** | "Visual Schedule Timeline" card list | Lists platform posts | Sourced from static `socialSchedulerPosts` array | **Static Mock** |
| **Timeline Analytics** | LinkedIn, X/Twitter, Blog post counts | Sourced from timeline array | Sourced from static scheduler posts count | **Static Mock** |
| **Script Editor** | "Script Input" Textarea | `onChange` value | Bound to `marketingAudioScript` state | Fully wired |
| **Voice Actors Selection**| Button group for Adam, Bella, Charlie | `onClick` selects voice | Maps `v1` -> `am_adam`, `v2` -> `af_bella`, `v3` -> `am_michael` | Fully wired |
| **Audio Generator** | "Generate Podcast Audio" Button | `onClick` renders audio | Calls static setTimeout | **Static Mock** |
| **HTML5 Audio Player** | Live wave play widget | HTML5 Audio Control | Renders static wave visualization height bars | **Static Mock** (no audio tag / file play) |

---

## 5. Administrator Perspective

| Element / Widget | Interactive Component | Action / Event | Target Endpoint / Database Query | Current State |
| :--- | :--- | :--- | :--- | :--- |
| **Docker Containers** | "Docker Compose Services" list card | Renders container status | `containerStatus` query (GET `/api/containers/status`) | Fully wired |
| **Container Lifecycle** | "Start" / "Stop" button in Docker list | `onClick` restart service | Sourced from local static state toggles | **Static Mock** (does not call real restart API) |
| **pgvector Telemetry** | "pgvector Similarity Telemetry" details card | Static text stats | Sourced from hardcoded metadata | **Static Mock** |
| **Similarity Rebuild** | "Rebuild Similarity Index" Button | `onClick` triggers rebuild | Calls static setTimeout progress bar | **Static Mock** (does not call POST `/api/rebuild`) |

---

## Technical Wiring Gap Analysis & Solutions

### Gap 1: Search mode toggles (Local KB vs Hybrid RRF)
* **Problem**: The radio buttons for Local vs Hybrid search mode have no `onChange` handler to update the actual search payload `type`.
* **Solution**: Add `const [searchType, setSearchType] = useState<'vector' | 'hybrid'>('vector')` state. Bind it to the radio buttons and pass `type: searchType` to the `searchMutation.mutateAsync` call.

### Gap 2: Operations Portfolio Tree & Facility Details Card
* **Problem**: Sourced from `deliveryNestedTree` state instead of active database projects and locations.
* **Solution**: 
  1. Import `useLocations` from `@/lib/hooks/use-locations`.
  2. Map `projectsList` to the tree nodes.
  3. Map location records from `useLocations()` matching `location.customer_id === proj.customer_id` (or `location.customer_id === acc.id`) as facility nodes under the corresponding project.
  4. In `handleSeedProject` and `handleSeedCRM`, seed real location records using `useCreateLocation` (e.g. Texas Petrochemical for ACME Security, Apex Networks Location, etc.).
  5. Dynamically load the selected facility card details using the `useLocation(selectedFacilityId)` query hook.

### Gap 3: Project Activity Stream
* **Problem**: Lists static hardcoded email/slack messages.
* **Solution**:
  1. Import `useActivities` from `@/lib/hooks/use-activities`.
  2. Retrieve activity records for the active customer `useActivities(activeDbProject?.customer_id)`.
  3. Seed sample timeline logs (e.g. email approvals, SRE verification alerts) during `handleSeedCRM` using `apiClient.post('/activities', ...)`.
  4. Render these dynamic database logs in the card list.

### Gap 4: Marketing Studio Queue Timeline & Analytics
* **Problem**: Lists static campaigns from `socialSchedulerPosts`.
* **Solution**: 
  1. Query `scheduledEpisodes` from `useScheduledEpisodes()`.
  2. Map the scheduler timeline to display scheduled podcast episodes.
  3. Display counts dynamically in the platform analytics cards (LinkedIn, X, Blogs) based on scheduled episode metadata.

### Gap 5: AI Voice Generator & Playback
* **Problem**: The "Generate Podcast Audio" button does not call the backend, and there is no real audio player.
* **Solution**:
  1. Map selected voice IDs to real Kokoro presets: `v1` -> `am_adam`, `v2` -> `af_bella`, `v3` -> `am_michael`.
  2. Trigger a POST request to `/api/voice/tts/synthesize` with `input: marketingAudioScript` and `voice: selectedVoice`.
  3. Specify `responseType: 'blob'` in the Axios request to retrieve binary audio stream.
  4. Convert the response blob into an object URL `const url = URL.createObjectURL(response.data)`.
  5. Render an HTML5 `<audio src={audioUrl} controls className="w-full mt-2" />` player for live playback.

### Gap 6: Container Lifecycle (Start / Stop Restarts)
* **Problem**: Container toggle button triggers local static state modification instead of calling container restart API.
* **Solution**:
  1. Wire the button to make a POST request to `/api/containers/{name}/restart` via `apiClient`.
  2. Show a confirmation modal warning the user about potential connection drops.

### Gap 7: pgvector Index Rebuilder
* **Problem**: The rebuild button triggers a mock setTimeout instead of calling `/api/rebuild`.
* **Solution**:
  1. Trigger POST `/api/rebuild` to start the indexing background task and retrieve `command_id`.
  2. Set up a polling query or query interval to hit GET `/api/rebuild/{command_id}/status` until status is completed.
  3. Update the `Progress` bar with the live percentage from the backend.
