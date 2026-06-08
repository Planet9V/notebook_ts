# Rev 3 Feature 4: The "Loom" Topological Operations Map

*Document Status: Draft Spec (June 8, 2026)*

---

## 1. Overview

The **"Loom" Topological Operations Map** is a visual workspace that represents all company assets, deals, projects, research logs, and content channels as interconnected nodes in a zoomable, 2D vector workspace. It replaces fragmented tables and boards with a single live visual interface.

```
       [Research Topic: Rare Earth]
                     │
                     ▼
             [Podcast Draft]
                     │
                     ▼
             [Kokoro Synthesis] ──(glows blue)
                     │
                     ▼
             [Spotify Publisher] ──(glows green)
```

---

## 2. Interactive Node Graph Architecture

The Loom represents different business entities as distinct nodes:

### 2.1 Node Types
*   **Target Prospect Node:** Represents a company in the pipeline. Contains quick metrics on deal size, company size, and days since last contact.
*   **Research Brief Node:** Represents an active deep dive topic. Shows status (polling, synthesizing, complete) and source count.
*   **Compliance Matrix Node:** Represents a facility audit. Displays the circular scoring badge and active threat flow paths.
*   **Publisher Trigger Node:** Represents a publication channel (e.g. LinkedIn, Twitter/X, Email SMTP server).

### 2.2 Connection Flows
Relationships are represented by visual vectors:
*   *Task Assignment:* Connect a team member node to a project node.
*   *Content Generation:* Connect a research brief node to a social channel node. The platform automatically extracts highlights, drafts copy, and puts it in the publisher queue.

---

## 3. Real-Time Status Animation (Neon Glowing Borders)

To keep the platform feeling "alive", nodes animate their borders using dynamic CSS classes:

*   **Pulse Blue (Active Processing):** Indicates a background agent is working on the node (e.g., DeepResearch is polling or Kokoro TTS is compiling audio).
*   **Glow Green (Healthy / Complete):** The node is in a successful state (e.g., SOW document is signed, compliance score is $> 90\%$, or container is healthy).
*   **Pulse Red (Blocked / Error):** The node requires immediate attention (e.g., a deadline has passed, a compliance score is failing, or an SRE agent has opened a configuration issue).

This provides administrators and team members with an instantaneous visual health report of the entire business ledger.
