# Task Plan - Bento Gateway Implementation

## Goal
Implement the Bento Gateway (Option 1) as the default authenticated landing page (`/`) of the Tetrel Security console. Enhance it with micro-interactions, rich dynamics, and fully functional quick-links to all workspaces.

## Phase 1: Setup & Pre-requisites
- [x] Load relevant skills (`using-superpowers`, `planning-with-files`, `ui-ux-pro-max`, `cc-skill-frontend-patterns`, `design-taste-frontend`).
- [x] Create task planning files in the project root.
- [x] Analyze sidebar navigation routes.

## Phase 2: Route Restructuring
- [x] Confirm `src/app/(dashboard)/page.tsx` is the target landing page route.
- [x] Delete `src/app/page.tsx` so root `/` resolves directly to `(dashboard)/page.tsx` (the Bento Gateway under authenticated shell layout).

## Phase 3: Coding the Bento Gateway (`src/app/(dashboard)/page.tsx`)
- [x] Import standard layout shell `AppShell` and UI components.
- [x] Implement the interactive AI Assistant command bar with simulated intent parsing.
- [x] Build the 4 primary Bento Cards with advanced hover states and dynamic visuals:
  - **Sales CRM & Pipeline**: Render mini pipeline indicators, forecast metrics, and quick-links: `/pipeline`, `/customer-ledger`, `/customers`, `/contacts`.
  - **Deep Research & Intelligence**: Ingested count, node link count, document shortcuts, and quick-links: `/search`, `/notebooks`, `/compliance`, `/research-memory`.
  - **Project Operations & Delivery**: Telemetry icons, postgres/surrealdb status checks, and quick-links: `/projects`, `/operations`, `/settings/containers`.
  - **Creative Studio & Publications**: Queued status, animated CSS waveforms, and quick-links: `/media`, `/podcasts`, `/voice-playground`, `/publications`.
- [x] Build the System Administration & Config Panel card spanning full-width at the bottom with quick-links to all system/admin subpages.
- [x] Enforce visual density 8, monospace numbers, and slate/cyan palette.

## Phase 4: Build Verification
- [x] Run `npx tsc --noEmit` locally in `frontend` folder to guarantee TypeScript builds successfully.
- [x] Rebuild container: `docker compose up -d --build open_notebook` to compile the new route.
- [x] Verify accessibility of `/` (Bento Gateway).


