# Implementation Plan: Researcher Workspace & Social Media Creator Integration

This plan details the changes required to align the console's workspaces to support the **Researcher** persona, connect research notes to creative publications, add the **Social Media Builder** to the Creative Workspace, and fix the landing page redirects.

---

## User Review Required

> [!IMPORTANT]
> - **Redirection Changes**: Visit to the root page (`http://localhost:8502/`) will now direct authenticated users to the Bento Gateway (`(dashboard)/page.tsx`) instead of `/notebooks`. Successful logins will also land on `/` by default.
> - **Research Workspace Split-Pane**: Rearranges the **Intelligence Hub** (`/search`) into a professional split-pane layout:
>   - **Left Panel (60%)**: Search query bars, configurations, and results stream.
>   - **Right Panel (40%)**: Live Note Editor scratchpad. Allows researchers to load notes, edit titles and contents, and click an inline "Append to Note" button on search hits to compile findings immediately.
> - **Social Media Builder**: A new tab in the **Creative Workspace** (`/media`) allowing users to choose a Note as context, select a marketing category (Article/Blog, LinkedIn Post, LinkedIn Article, Twitter (X) Thread, or Email Campaign), choose an active styleguide, and generate content to schedule.

---

## Open Questions
No open questions at this time. Objections from the multi-agent design review have been resolved in the design log.

---

## Proposed Changes

### [Frontend: Core Redirects]

#### [MODIFY] [use-auth.ts](file:///Users/jimmcknney/notebook_tetrel/frontend/src/lib/hooks/use-auth.ts)
- Modify `handleLogin` to push to `/` (Bento Gateway) by default instead of `/notebooks` if no previous redirect path is in storage.

#### [MODIFY] [LoginForm.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/components/auth/LoginForm.tsx)
- Modify the mount-checking redirects (lines 49 and 62) to push to `/` instead of `/notebooks`.

---

### [Frontend: Notes Hooks]

#### [MODIFY] [use-notes.ts](file:///Users/jimmcknney/notebook_tetrel/frontend/src/lib/hooks/use-notes.ts)
- Implement `useAllNotes()` hook to list all notes without notebook filtering constraint.

---

### [Frontend: Redesigned Researcher Workspace (Intelligence Hub)]

#### [MODIFY] [page.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/(dashboard)/search/page.tsx)
- Re-layout the page to a split column dashboard:
  - Add search results items with an inline **"Append to Scratchpad"** button.
  - Implement a Note editor component in the right pane:
    - Notes dropdown selector to load existing notes.
    - Title and content fields with auto-saving to SurrealDB using `useUpdateNote` and `useCreateNote`.
    - "New Note" trigger button.

---

### [Frontend: Social Media Builder (Creative Workspace)]

#### [MODIFY] [page.tsx](file:///Users/jimmcknney/notebook_tetrel/frontend/src/app/(dashboard)/media/page.tsx)
- Add a third tab to the tabs list: `social-builder` (Social Media Builder).
- Implement the Social Media Builder layout under `TabsContent`:
  - **Source Selection**: Dropdown selector of all notes (using `useAllNotes`).
  - **Output Category**: Button grid for Article/Blog, LinkedIn Post, LinkedIn Article, Twitter Thread, Email Campaign.
  - **Styleguide Selection**: Dropdown select listing active templates.
  - **AI Text Generator & Editor**: Clicking generate will compile a prompt using the note's text, query the LLM strategy, and present the draft.
  - **Scheduler Panel**: Allows the user to select dates/times, pick channels (`email`, `linkedin`, `twitter`), and persist the campaign to the calendar using `publicationsApi.schedulePost`.

---

## Verification Plan

### Automated Tests
- Verify compilation safety in the workspace:
  `cd frontend && npx tsc --noEmit`

### Manual Verification
1. Login to the console and confirm it lands on the Bento Gateway `/`.
2. Go to **Intelligence Hub** (`/search`), enter a query, load a note in the scratchpad, click **Append** on search results, and verify note is updated.
3. Go to **Creative Workspace** (`/media?tab=social-builder`), select the research note, select "LinkedIn Post", click **Generate**, edit draft, select a schedule time, click **Schedule**, and confirm it appears in the publications calendar.
