# UX Design Plan: Slash Commands Autocomplete & Visual Dashboards

This document outlines the user flow, screen structure, and components for slash commands `/deep-research` and `/planning-with-files`.

## 1. Interaction Flow (Autocomplete Popover)

```
[ User types "/" in Chat Input ]
               │
               ▼
[ Render CommandPopover above input ] ───▶ Navigable via Keyboard:
               │                           - ArrowDown / ArrowUp: navigate
               │                           - Enter / Tab: select
               ▼
[ Selected Command autocomplete ]
               │
               ├─▶ "/deep-research " ──▶ User enters search query
               │
               └─▶ "/planning-with-files " ──▶ Render Subcommand options:
                                                - "init", "status", "sync"
```

## 2. Component Structures

### 2.1 PlanningDashboard (`PlanningDashboard.tsx`)
- **Container**: Glassmorphic, HSL Slate background with border outline.
- **Top Bar**: "📅 Project Roadmap" + Status Badge.
- **Progress Bar**: Styled HTML `Progress` component representing completion rate.
- **Metrics Grid**: Three cards (Done, In Progress, To Do) with colored indicator lights.
- **Notes Actions**: Icons (`FileText`, `Lightbulb`, `TrendingUp`) for opening:
  - `task_plan.md`
  - `findings.md`
  - `progress.md`
- **Dynamic Updates**: Scrollable container displaying any sync actions from backend.
- **Footer CTA**: "Sync Roadmap" button with rotating sync icon.

### 2.2 ResearchDashboard (`ResearchDashboard.tsx`)
- **Container**: Slate gradient backdrop with subtle inner shadow.
- **Title**: "🔍 Deep Research Insights" with animated research loop.
- **Content Panel**: Styled markdown summary of the compiled research report.
- **CTA Actions**: "Open Research Source" button to open the full `Source` object.

## 3. UI Styling System Tokens (Dark Mode)
- **Glass Panel**: `bg-card/40 border-border/50 backdrop-blur-md`
- **Hover Transitions**: `hover:bg-accent/30 transition-all duration-200 cursor-pointer`
- **Status Indicator Colors**:
  - Done: `#10B981` (Emerald)
  - In Progress: `#F59E0B` (Amber)
  - To Do: `#64748B` (Slate)
