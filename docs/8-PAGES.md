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
Advanced (/advanced) (`/projects`)
  * **Operations** (`/operations`)
  * **Containers** (`/settings/containers`)
  * **Config** (`/settings`)
* 🎙️ **Marketing Studio Mindset**
  * **Media Hub** (`/media`)
  * **Podcasts** (`/podcasts`)
  * **Voice Desk** (`/voice-playground`)
  * **Pub Tracker** (`/publications`)
* ⚙️ **System Administrator Mindset**
  * **Logs Stream** (`/settings/logs`)
  * **API Keys** (`/settings/api-keys`)
  * **Pipelines** (`/settings/pipeline`)
  * **Styleguides** (`/settings/styleguides`)
  * **Voice System** (`/settings/voice`)
  * **Transforms** (`/transformations`)
  * **Docs Wiki** (`/documentation`)
  * **Advanced** (`/advanced`)

---

## 3. Unified Backup & Restore System

The platform includes a robust, secure, and fully integrated Backup & Restore utility to ensure business continuity and quick system state replication.

### Under the Hood: ZIP Archive Contents
Each backup is packaged as a standard ZIP file saved inside the `./data/backups/` directory. The zip contains:
1. `db_backup.surrealql` — A complete export of all SurrealDB schema configurations and table records, generated programmatically using the SurrealDB `/export` HTTP endpoint.
2. `uploads/` — The entire contents of the local uploaded source files directory (`./data/uploads/`), preserving all original PDF, DOCX, TXT, and audio sources.
3. `checkpoints.sqlite` — The SQLite database containing LangGraph execution checkpoints (`./data/sqlite-db/checkpoints.sqlite`).

*Note: Vector database embeddings cached in PostgreSQL (`ResearchMemory`) are omitted from the archive to keep the package compact. They can be dynamically rebuilt at any time via the UI.*

### Database Tables Schema (SurrealDB)
Two strict schemafull tables are added in migration `49.surrealql` to manage backups:

```surrealql
-- backup table stores metadata for created backups
DEFINE TABLE backup SCHEMAFULL;
DEFINE FIELD filename ON TABLE backup TYPE string;
DEFINE FIELD file_path ON TABLE backup TYPE string;
DEFINE FIELD size ON TABLE backup TYPE int;
DEFINE FIELD backup_type ON TABLE backup TYPE string; -- 'manual' | 'scheduled'
DEFINE FIELD created_at ON TABLE backup TYPE datetime DEFAULT time::now();

-- backup_schedule table tracks configured cron jobs
DEFINE TABLE backup_schedule SCHEMAFULL;
DEFINE FIELD name ON TABLE backup_schedule TYPE string;
DEFINE FIELD cron_expression ON TABLE backup_schedule TYPE string;
DEFINE FIELD enabled ON TABLE backup_schedule TYPE bool DEFAULT true;
DEFINE FIELD last_run_at ON TABLE backup_schedule TYPE option<datetime> DEFAULT NONE;
DEFINE FIELD created_at ON TABLE backup_schedule TYPE datetime DEFAULT time::now();
```

### Automated Cron Scheduler
A lightweight background loop runs check intervals every 60 seconds inside the API process. It parses standard 5-field cron expressions configured in the `backup_schedule` table and automatically triggers a backup if the job is due.

### How to Perform Backup Operations

#### A. Creating a Backup
1. Navigate to the **Advanced** page from the sidebar Settings or the Dashboard cockpit.
2. Under the **Backup & Restore Manager** card, click **Create Backup Now**.
3. A manual snapshot task runs immediately, and a new backup entry appears in the history table.
4. Click the **Download** icon next to any backup to download the ZIP file.

#### B. Restoring from History
1. In the **Backup History** table, click the **Restore** (circular arrow) icon next to the desired backup entry.
2. Confirm the destructive warning dialog indicating that current active SurrealDB tables and uploaded source files will be dropped and overwritten.
3. The system drops existing tables, calls the SurrealDB `/import` endpoint, and extracts uploads files from the ZIP.

#### C. Restoring from a File Upload
1. Under the **Backup & Restore Manager** card, drag and drop a previously downloaded backup ZIP file into the drag zone, or click to browse.
2. Confirm the database overwrite warning dialog to restore the system state from the uploaded file.
