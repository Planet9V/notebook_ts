# Multi-Agent Brainstorming: Research-to-Creation Workflow

This document details the multi-agent design review for integrating the Researcher persona, rearranging the Intelligence Hub, connecting Research Notes to the Creative Workspace, and adding the Social Media Builder.

---

## 1. Design Proposals & Personas

### Researcher Workflow:
1. **Explore & Query**: The Researcher enters the **Intelligence Hub** (`/search`), selects their research mode (Local KB vector vs. Hybrid), and executes a query.
2. **Collect & Capture**: The query returns chunks/documents. The Researcher needs an immediate, intuitive way to **save this intelligence into a Note**. 
3. **Connect & Transfer**: When navigating to the **Creative Workspace** (`/media`), the user can load the recently created note and use it as context to generate creative content.

### Creative Workspace: Social Media Builder
In addition to the Podcast Builder, we introduce a **Social Media Builder** tab with these content categories:
- Articles & Blogs
- LinkedIn Posts & LinkedIn Articles
- Twitter (X) Threads
- Email Campaigns

---

## 2. Simulated Multi-Agent Review

### Primary Designer (Lead)
> **Proposal**: Let's modify the Intelligence Hub search results pane to add an inline "Save to Note" button next to every search hit. When clicked, it opens a sidebar/dialog to select an existing Note (or create a new one) and appends the search chunk/synthesis to it.
> In the Creative Workspace (`/media`), we add a "Social Media Builder" tab. It contains a dropdown to select any Note from the user's database. When a note is selected, the AI generates the chosen content type (e.g. LinkedIn post, Blog, Email) using the note as context. We'll use the existing Styleguides API to format the output.

### Skeptic / Challenger
> **Objection**: How do we manage state? If a Researcher is editing a note in the Notebooks workspace, and then goes to the Media page, how do they find it? 
> Also, if we copy massive search chunks into a single note, it might hit SurrealDB record limits or context window overflow during generation.
> We must ensure notes have a searchable title, a preview, and clear metadata (last updated) in the selection dropdown on the Media page so the user doesn't import the wrong note.

### Constraint Guardian
> **Objection**: Let's keep SurrealDB schemas intact. We should reuse the existing `notes` table and `publications` table. 
> Do not write custom migration scripts unless we are using the existing `publicationsApi` structure. Let's make sure the new social media campaigns are stored in the database as standard publication entries with a `publication_type` or `channel` field (like `podcast`, `blog`, `linkedin`, `twitter`, `email`).
> Let's verify if `publicationsApi` already supports these channels in the type definitions.

### User Advocate
> **Objection**: Having search results completely disconnected from notebooks makes research feel disjointed.
> Rearrange the Intelligence Hub: instead of a full-screen search bar and list, split the interface into:
> - **Left Column**: Active search queries & engine configs.
> - **Right Column**: Live "Scratchpad Note" editor. The Researcher can search on the left, and immediately drag/click search results to insert them into the active note on the right without switching pages or opening popups.
> This makes the workspace extremely intuitive for a Researcher!

### Arbiter (Resolution)
> **Approved Decisions**:
> 1. **Intelligence Hub Layout**: Split the Intelligence Hub `/search` page into a 2-column layout when an active query is run (60% Search & Results, 40% Active Note Scratchpad). This allows the Researcher to curate search findings directly into their active research note in real-time.
> 2. **Creative Workspace Integration**: The new Social Media Builder tab in `/media` will allow selecting any Note from the database. It will load the note's text as the prompt's context.
> 3. **Social Media Builder Categories**: Support Blog/Article, LinkedIn Post, LinkedIn Article, Twitter (X) Thread, and Email Campaign.
> 4. **Login Redirection**: Modify both `LoginForm.tsx` and `use-auth.ts` to redirect directly to `/` (Bento Gateway) instead of `/notebooks`.

---

## 3. Decision Log

| Decision ID | Decision | Objections Addressed | Rationale |
|-------------|----------|----------------------|-----------|
| DEC-01 | Rearrange `/search` to split-pane (Search + Note Editor) | User Advocate: Avoid popup friction | Lets researchers edit notes side-by-side with semantic search. |
| DEC-02 | Add Social Media Builder tab to `/media` | Primary Designer: Extend creative options | Connects research to marketing channels (LinkedIn, Twitter, Blogs). |
| DEC-03 | Store campaigns in `publications` table | Constraint Guardian: Avoid SurrealDB migrations | Promotes database portability by reusing existing schemas. |
| DEC-04 | Redirect to `/` on login | User feedback: Landing page promised | Makes the Bento Control Desk the true entry gateway. |
