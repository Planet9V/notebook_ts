# Rev 3 Feature 1: Dynamic Role-Based Bento Portal

*Document Status: Draft Spec (June 8, 2026)*

---

## 1. Overview

The **Dynamic Role-Based Bento Portal** addresses the cognitive fatigue of navigating 19 separate dashboards by providing a single, highly interactive home panel that adapts to the active user's role: **Sales, Delivery, Social Media Manager, or Researcher**.

```
┌──────────────────────────────────────────────────────────────────┐
│                      Dashboard Header Toggle                     │
│    [ Sales ]      [ Delivery ]      [ Social Media ]      [ Research ]   │
└──────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────┐ ┌──────────────────────────────┐
│                                 │ │                              │
│         Bento Widget 1          │ │        Bento Widget 2        │
│        (Context Metrics)        │ │      (Active Tasks list)     │
│                                 │ │                              │
└─────────────────────────────────┘ └──────────────────────────────┘
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                          Bento Widget 3                          │
│                         (Pipeline Kanban)                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Capabilities & Layout Configurations

The active portal dynamically queries different endpoints and renders specialized widget clusters:

### 2.1 The Sales Portal
*   **Kanban Board Widget:** Compact drag-and-drop deal tracking cards with glowing borders reflecting deal value and inactivity days.
*   **Prospect Intelligence Grid:** Displays real-time updates and news about target companies, retrieved via background Brave/Valyu pipelines.
*   **Quick Meeting Brief:** A widget that scans upcoming calendars, matches attendees to stored contact records, and displays a 3-bullet AI briefing on their background, company news, and potential pain points.

### 2.2 The Delivery Portal
*   **Project Status Table:** Interactive list of active SOWs, deliverables, due dates, and assigned team members.
*   **Compliance Score Tracker:** Interactive circular dials representing CSET scoring categories (e.g. Asset Management, Cybersecurity Posture).
*   **Workprogram checklist:** A list of action items required for the current project phase, with dynamic progress bars.

### 2.3 The Social Media Portal
*   **Content Calendar Grid:** A visual drag-and-drop scheduling grid showing scheduled posts for LinkedIn, Twitter/X, and email newsletters.
*   **Marketing Analytics Chart:** Custom SVG line graphs displaying engagement metrics, click-through rates, and follower growth trends.
*   **Draft Approval Deck:** Slides displaying generated copy and visual card assets waiting for admin approval before going live.

### 2.4 The Researcher Portal
*   **DeepResearch Manager:** Console to monitor background Valyu search loops. Shows queries, depth parameters, and search status.
*   **Podcast Synthesizer:** Mini control deck to write episode outlines, configure Kokoro TTS voice channels, and run audio builds.
*   **pgvector Cache Hit Panel:** Renders data graphs of local PostgreSQL vector lookup success rates, helping identify cache performance trends.

---

## 3. Frontend & Database Integration

*   **State Management:** The chosen persona is stored in the client-side Zustand store and persisted in `localStorage`. 
*   **Grid Customization:** Users can toggle "Edit Layout" mode to resize or swap widgets using `@hello-pangea/dnd`. The custom grid layout coordinates are stored in SurrealDB under the `user_config` record.
*   **Performance:** Offscreen widgets use CSS `content-visibility: auto` to prevent unnecessary DOM rendering calculations, keeping Interaction to Next Paint (INP) latency below **50ms**.
