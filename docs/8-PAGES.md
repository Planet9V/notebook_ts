Based on the Next.js routing structure and sidebar/landing layouts, here is the complete layout of the site tree, compared with the pages accessible via menus and navigation interfaces.

1. Complete Site Tree (File Routes in frontend/src/app)
The application defines the following page routes in the repository structure:

Authentication Area ((auth))
/login — User Authentication Page
Core Dashboard Area ((dashboard))
/ — Landing Page (7 Perspectives / Perspective+ Dashboard)
/operations — Operations Hub Dashboard
/search — Intelligence / Semantic Search Hub
/sources — Ingested Sources Document List
/media — Creative Media & Publication Workspace
/settings — Settings Control Panel (General configs)
/settings/api-keys — API Credentials Manager
/settings/containers — Docker Compose Services Status Console
/settings/logs — Realtime System Logs Viewer
/settings/pipeline — NLP and Transformations Pipeline Settings
/settings/publications — Distribution channels
/settings/styleguides — Brand tone style guides
/settings/voice — Kokoro TTS & Whisper STT voice engine settings
/pipeline — CRM deals & pipelines visualizer
/customer-ledger — Customer Accounts Balance Ledger
/customers — Customer Organizations Directory
/contacts — Contact Directory for CRM Customers
/notebooks — Research & Generation Workspace Notebooks
/compliance — CISA & CFATS security compliance audits
/research-memory — PostgreSQL pgvector index structure stats
/projects — Project Tasks & Kanban Boards
/publications — Social post queue scheduler & tracker
/podcasts — Podcast audio segment profile config
/voice-playground — Bidirectional Voice AI webrtc sandbox
/transformations — NLP transformations builder
/documentation — Developer documentation Wiki
/advanced — Advanced system troubleshooting
/mockups — Legacy Mockup playground page (Redirects client-side to /)
/research — Legacy Research page (Redirects client-side to /operations?tab=research)

2. Pages Showing Up in Menus & Application Views
The accessible pages are organized across two main navigation systems: the Persistent App Sidebar and the Root Dashboard (7 Perspectives).

A. Persistent App Sidebar (Left Navigation Menu)
🗂️ Collect
Sources (/sources)
⚙️ Operations
Operations Hub (/operations)
🔭 Intelligence
Intelligence Hub (/search)
Research Hub (/operations?tab=research)
🎙️ Creative
Creative Media Workspace (/media)
🛠️ Settings
Settings Control Panel (/settings)

B. Landing Page Navigation Cockpit (7 Perspectives)
The landing page contains quick-link matrices mapped directly to respective mindsets:

📈 Sales CRM Mindset
Pipeline (/pipeline)
Ledger (/customer-ledger)
Customers (/customers)
Contacts (/contacts)
🔍 Research Hub Mindset
Search (/search)
Notebooks (/notebooks)
Audits (/compliance)
pgvector (/research-memory)
⚡ Project Delivery Mindset
Projects (/projects)
Operations (/operations)
Containers (/settings/containers)
Config (/settings)
🎙️ Marketing Studio Mindset
Media Hub (/media)
Podcasts (/podcasts)
Voice Desk (/voice-playground)
Pub Tracker (/publications)
⚙️ System Administrator Mindset
Logs Stream (/settings/logs)
API Keys (/settings/api-keys)
Pipelines (/settings/pipeline)
Styleguides (/settings/styleguides)
Voice System (/settings/voice)
Transforms (/transformations)
Docs Wiki (/documentation)
Advanced (/advanced)