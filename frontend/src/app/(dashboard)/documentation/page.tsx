'use client'

import { useState, useMemo, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  BookOpen,
  Code,
  Layers,
  Map,
  Server,
  Shield,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  Terminal,
  Zap,
} from 'lucide-react'

// ─── DOCUMENTATION DATA ─────────────────────────────────────────────────────

interface DocSection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  badge: string
  description: string
  subsections: DocSubsection[]
}

interface DocSubsection {
  id: string
  title: string
  content: string
  items?: DocItem[]
  table?: { headers: string[]; rows: string[][] }
  code?: string
}

interface DocItem {
  label: string
  description: string
  badge?: string
  badgeColor?: string
}

const DOCUMENTATION: DocSection[] = [
  {
    id: 'overview',
    title: 'Overview & PRD',
    icon: BookOpen,
    color: 'cyan',
    badge: 'OVERVIEW',
    description: 'Application purpose, mission, stakeholders, and product requirements.',
    subsections: [
      {
        id: 'overview-purpose',
        title: 'Application Purpose',
        content: 'Tetrel Security (Open Notebook v1.8.5) is an AI-powered research, compliance, and business intelligence platform. Originally inspired by Google NotebookLM, it has evolved into a comprehensive enterprise tool that combines document ingestion, semantic search, AI-assisted analysis, CRM pipeline management, regulatory compliance auditing (CISA CSET), and podcast generation into a unified dark-mode workspace.',
      },
      {
        id: 'overview-personas',
        title: 'User Personas',
        content: 'The platform serves three primary audiences, each with distinct needs and workflows.',
        items: [
          { label: 'End Users (Analysts & Researchers)', description: 'Upload sources, create notebooks, search across documents, generate insights and podcasts. Primary workflows: source ingestion → notebook analysis → AI chat → export findings.', badge: 'PRIMARY', badgeColor: 'cyan' },
          { label: 'Developers (Engineers & Integrators)', description: 'Extend the platform, build integrations, configure AI models. Need API documentation, architecture understanding, and contribution guidelines.', badge: 'TECHNICAL', badgeColor: 'violet' },
          { label: 'Auditors (Compliance & Security)', description: 'Run CSET compliance assessments, map CISA infrastructure sectors, audit regulatory frameworks, generate gap reports. Need compliance coverage data and audit trail documentation.', badge: 'COMPLIANCE', badgeColor: 'emerald' },
        ],
      },
      {
        id: 'overview-prd',
        title: 'Product Requirements Summary',
        content: 'Core product requirements driving the platform architecture and feature set.',
        items: [
          { label: 'Multi-Source Intelligence', description: 'Ingest PDFs, URLs, YouTube videos, text files, and raw text. Extract content, generate embeddings, enable semantic search across all sources.' },
          { label: 'AI-Powered Analysis', description: 'Multi-model LLM integration (OpenRouter 300+ models, Ollama local models). Chat with documents, generate insights, transform content.' },
          { label: 'Enterprise CRM', description: 'Customer management with 30+ fields, pipeline kanban (7 stages), contact management, deal tracking, import/export.' },
          { label: 'Regulatory Compliance', description: 'CISA CSET question-based auditing wizard, 16 infrastructure sector mapping, 50+ compliance frameworks, automated gap analysis and remediation reporting.' },
          { label: 'Content Generation', description: 'AI podcast creation with speaker profiles, transformation templates, B2B drafting workspace with multi-agent routing.' },
          { label: 'Internationalization', description: 'Full i18n support with en/pt-BR/es/fr/de/ja/ko/zh locales, RTL-ready.' },
        ],
      },
    ],
  },
  {
    id: 'notebook-rev-3',
    title: 'Notebook Features Rev 3',
    icon: Zap,
    color: 'rose',
    badge: 'REV 3',
    description: 'Autonomous agents, dynamic bento roles, workspace canvas, and live topological node maps.',
    subsections: [
      {
        id: 'rev3-overview',
        title: 'Rev 3 Overview',
        content: 'Released on June 8, 2026, Notebook Features Rev 3 introduces dynamic role-based dashboards, a split-pane Workspace Canvas with drag-and-drop citation pipeline, an Autonomous SRE Admin Agent, and the live "Loom" Topological Operations node map.',
      },
      {
        id: 'rev3-bento',
        title: '1. Dynamic Bento Grid',
        content: 'Provides custom widgets tailored to Sales, Delivery, Social Media, and Researcher personas, persisted in localStorage and manageable via drag-and-drop customization.',
      },
      {
        id: 'rev3-canvas',
        title: '2. Unified Workspace Canvas',
        content: 'Consolidates document analysis, search results, and compliance scoring on the left, with print-ready Rich Markdown SOW editors on the right, supporting citation provenance via drag-and-drop.',
      },
      {
        id: 'rev3-sre',
        title: '3. Autonomous SRE Agent',
        content: 'Runs a background container health poller that reads logs, registers GitHub issues, creates configuration patch branches, opens pull requests, and runs tests asynchronously.',
      },
      {
        id: 'rev3-loom',
        title: '4. The Loom Topological Map',
        content: 'Maps pipeline cards, research topics, compliance matrices, and social media scheduler tasks onto a zoomable 2D node graph with visual neon glows (blue for processing, green for healthy/done, red for error/blocked).',
      },
    ],
  },
  {
    id: 'architecture',
    title: 'Architecture & Tech Stack',
    icon: Layers,
    color: 'violet',
    badge: 'ARCH',
    description: 'System architecture, technology choices, and database schema layout.',
    subsections: [
      {
        id: 'arch-overview',
        title: 'System Architecture',
        content: 'The application follows a classic 3-tier architecture: a Next.js 16 frontend communicating via REST API with a FastAPI backend, backed by SurrealDB for persistence and multiple LLM providers for AI capabilities.\n\n┌─────────────────────────────────────────────────┐\n│                   FRONTEND                       │\n│  Next.js 16 · React 19 · TypeScript · Tailwind 4 │\n│  shadcn/ui · Zustand · React Query · i18next     │\n├─────────────────────────────────────────────────┤\n│                REST API (axios)                  │\n├─────────────────────────────────────────────────┤\n│                   BACKEND                        │\n│  FastAPI · Python 3.11 · Pydantic v2 · Uvicorn   │\n│  LangChain · LangGraph · Esperanto · AI-Prompter │\n├─────────────────────────────────────────────────┤\n│                DATA & AI LAYER                   │\n│  SurrealDB · OpenRouter · Ollama · Multi-LLM     │\n│  Vector Embeddings · Reranking · TTS             │\n└─────────────────────────────────────────────────┘',
      },
      {
        id: 'arch-backend',
        title: 'Backend Stack',
        content: 'Python-based backend with FastAPI for HTTP serving and LangChain for LLM orchestration.',
        table: {
          headers: ['Technology', 'Version', 'Purpose'],
          rows: [
            ['Python', '3.11+', 'Runtime language'],
            ['FastAPI', '≥0.104.0', 'HTTP API framework with auto-docs'],
            ['Pydantic', '≥2.9.2', 'Data validation and serialization'],
            ['Uvicorn', '≥0.24.0', 'ASGI server'],
            ['SurrealDB', '≥1.0.4', 'Multi-model database (document + graph)'],
            ['LangChain', '≥1.2.0', 'LLM orchestration framework'],
            ['LangGraph', '≥1.0.5', 'Stateful agent workflows'],
            ['Esperanto', '≥2.20.0', 'Unified LLM provider abstraction'],
            ['content-core', '≥1.14.1', 'Document parsing and extraction'],
            ['ai-prompter', '≥0.4', 'Prompt template management'],
            ['podcast-creator', '≥0.12.0', 'Audio podcast generation'],
            ['tiktoken', '≥0.12.0', 'Token counting for LLMs'],
            ['numpy', '≥2.4.1', 'Numerical operations for embeddings'],
            ['httpx', '≥0.27.0', 'Async HTTP client with SOCKS proxy support'],
            ['Loguru', '≥0.7.2', 'Structured logging'],
            ['valyu', '≥1.0.0', 'Unified enterprise search engine SDK'],
            ['asyncpg', '≥0.30.0', 'Asynchronous PostgreSQL client library'],
          ],
        },
      },
      {
        id: 'arch-frontend',
        title: 'Frontend Stack',
        content: 'Modern React-based frontend with server-side rendering and a comprehensive UI component library.',
        table: {
          headers: ['Technology', 'Version', 'Purpose'],
          rows: [
            ['Next.js', '16.x', 'React meta-framework (App Router)'],
            ['React', '19.x', 'UI library'],
            ['TypeScript', '5.x', 'Type-safe JavaScript'],
            ['Tailwind CSS', '4.x', 'Utility-first CSS framework'],
            ['shadcn/ui (Radix)', 'Multiple', '15+ accessible UI primitives'],
            ['Zustand', '5.x', 'Lightweight state management'],
            ['TanStack Query', '5.x', 'Server state management & caching'],
            ['TanStack Table', '8.x', 'Headless data table engine'],
            ['React Hook Form + Zod', '7.x / 4.x', 'Form management and validation'],
            ['Axios', '1.x', 'HTTP client for API communication'],
            ['lucide-react', '0.525+', 'Icon library (500+ icons)'],
            ['react-markdown', '10.x', 'Markdown rendering with GFM'],
            ['Monaco Editor', '4.x', 'Code editing (transformation templates)'],
            ['@hello-pangea/dnd', '18.x', 'Drag-and-drop (pipeline kanban)'],
            ['@xyflow/react', '12.x', 'Node-based graph visualization'],
            ['i18next', '25.x', 'Internationalization (8 locales)'],
            ['sonner', '2.x', 'Toast notifications'],
            ['cmdk', '1.x', 'Command palette (⌘K)'],
            ['next-themes', '0.4.x', 'Dark/light mode switching'],
            ['date-fns', '4.x', 'Date formatting and manipulation'],
          ],
        },
      },
      {
        id: 'arch-ai',
        title: 'AI & LLM Integration',
        content: 'The platform integrates with multiple LLM providers through a unified abstraction layer.',
        items: [
          { label: 'OpenRouter (300+ Models)', description: 'Primary cloud LLM provider. Full model catalog synced daily to local DB. Supports chat, embedding, reranking, vision, and audio modalities. Models include GPT-4o, Claude 3.5, Gemini, DeepSeek, Llama, Mistral, and more.', badge: 'CLOUD', badgeColor: 'cyan' },
          { label: 'Ollama (Local Models)', description: 'Self-hosted model inference. Supports chat models (Llama, Qwen, Phi) and specialized models like Qwen3-Reranker-4B for reranking. Zero-cost, full privacy.', badge: 'LOCAL', badgeColor: 'emerald' },
          { label: 'LangChain Providers', description: 'Direct integrations via langchain-openai, langchain-anthropic, langchain-ollama, langchain-google-genai, langchain-groq, langchain-mistralai, langchain-deepseek.', badge: 'SDK', badgeColor: 'violet' },
          { label: 'Embedding Pipeline', description: 'Vector embedding generation for semantic search. Supports multiple embedding models via OpenRouter and Ollama. Stored in SurrealDB with cosine similarity search.', badge: 'VECTOR', badgeColor: 'amber' },
          { label: 'Reranking Pipeline', description: 'Cross-encoder reranking for search result quality. Supports Cohere rerank-4-pro, Bytedance seedance-2.0 (OpenRouter), and Qwen3-Reranker-4B (Ollama local).', badge: 'RERANK', badgeColor: 'rose' },
        ],
      },
      {
        id: 'arch-database',
        title: 'Database Architecture & Schema Layout',
        content: 'The database layer utilizes SurrealDB (version >= 1.0.4) as its primary datastore, leveraging its support for relational graphs, schemafull/schemaless tables, and document storage.\n\n' +
                 '### Repository Architecture\n' +
                 'The repository layer is defined in `open_notebook/database/repository.py` and manages connection pooling and generic query execution:\n' +
                 '• Connection Context Manager (`db_connection`): Configures connection pooling using the official python `AsyncSurreal` client, and dynamically sets namespaces, credentials, and databases (SURREAL_URL, SURREAL_USER, SURREAL_PASSWORD, SURREAL_NAMESPACE, SURREAL_DATABASE).\n' +
                 '• Generic CRUD wrappers: Exposes `repo_query` for arbitrary SurrealQL scripts, `repo_create` for insertions, `repo_update` for MERGE updates, `repo_relate` for graph edge creation, `repo_upsert` for idempotent adjustments, and `repo_delete` for removals.\n\n' +
                 '### Migrations\n' +
                 'Migrations are managed in `open_notebook/database/migrations/`. The database evolution is tracked through 42 sequentially numbered migration scripts, each accompanied by a `*_down.surrealql` rollback script, totaling 84 migration files.\n\n' +
                 '### Table Schema Classifications\n' +
                 'The system manages a total of 42 unique tables divided into three classifications:\n\n' +
                 '1. SCHEMAFULL Tables (25 tables) - Strict schema constraints are enforced:\n' +
                 '   `activity`, `agent_config`, `agent_execution`, `agent_log`, `asset`, `asset_edge`, `contact`, `credential`, `email_setting`, `episode`, `episode_profile`, `location`, `note`, `notebook`, `publication_metrics_history`, `scheduled_search`, `scheduled_post`, `skill_registry`, `source`, `source_embedding`, `source_insight`, `speaker_profile`, `sync_status`, `transformation`, `voice_settings`.\n\n' +
                 '2. SCHEMALESS Tables (14 tables) - Flexible JSON structures without validation constraints:\n' +
                 '   `assessment`, `assessment_answer`, `assessment_session`, `chat_session`, `customer`, `customer_project`, `customer_research`, `file_audit_log`, `organization`, `podcast_config`, `project`, `project_research`, `research_item`, `scheduled_episode`.\n\n' +
                 '3. Graph Relation (TYPE RELATION) Tables (3 tables) - Specialized SurrealDB graph edges linking nodes:\n' +
                 '   `artifact` (links `note` to `notebook`),\n' +
                 '   `reference` (links `source` to `notebook`),\n' +
                 '   `refers_to` (links `chat_session` to `notebook | source`).\n\n' +
                 '### Data Seeding\n' +
                 'Compliance frameworks and auditing questions are dynamically created during the seed ingestion process:\n' +
                 '• Seeding Entrypoint: `scripts/cset_ingest_seed.py`\n' +
                 '• Source Material: `data/cset_seeds/cset_questions.sql`\n' +
                 '• Seeded Items:\n' +
                 '  - 2 Regulations: `IEC_62443` (Industrial Communication Networks) and `NIST_SP_800_82` (Guide to ICS Security).\n' +
                 '  - 6 Questions: `Q1` to `Q4` map to `IEC_62443` (standard codes `SR 5.1` to `SR 5.4`); `Q5` to `Q6` map to `NIST_SP_800_82` (standard codes `Section 6.2.3` and `Section 6.2.4`).\n\n' +
                 '### Postgres + pgvector Caching Database\n' +
                 'The application leverages a secondary PostgreSQL instance (pgvector/pgvector:pg17) to power the semantic caching layer (`ResearchMemory`):\n' +
                 '• Connection DSN: Configured via environment variable `POSTGRES_DSN` with asyncpg connection pooling (`min_size=2`, `max_size=10`).\n' +
                 '• Table Schema: The `research_corpus` table stores cached search query results: `id`, `query`, `title`, `url`, `content`, `source_type`, `relevance_score`, `embedding` (vector(1536)), `metadata`, `created_at`, `updated_at`.\n' +
                 '• Indices: Equipped with an HNSW cosine similarity index `idx_research_embedding` for semantic matching, a Gin index `idx_research_content_fts` on content for Full-Text Search (FTS) queries, and unique constraints `idx_research_query_url` (query + url) and `idx_research_query_content_hash` (query + content md5 hash) to prevent duplicate cached search entries.'
      },
    ],
  },
  {
    id: 'sitemap',
    title: 'Site Map & Navigation',
    icon: Map,
    color: 'emerald',
    badge: 'NAV',
    description: 'Complete routing tree, navigation structure, and page hierarchy.',
    subsections: [
      {
        id: 'sitemap-navigation',
        title: 'Sidebar Navigation Structure',
        content: 'The application uses a collapsible sidebar organized into 5 functional groups.',
        table: {
          headers: ['Group', 'Menu Item', 'Route', 'Purpose'],
          rows: [
            ['Collect', 'Sources', '/sources', 'Upload and manage document sources'],
            ['Operations', 'Operations Hub', '/operations', 'Dashboard with analytics and KPIs'],
            ['Operations', 'Customer Ledger', '/customer-ledger', 'CRM customer listing with filters'],
            ['Operations', 'Research Intelligence', '/research', 'Research item management'],
            ['Operations', 'Project Delivery', '/projects', 'Project tracking and delivery'],
            ['Intelligence', 'Ask & Search', '/search', 'Semantic search with AI chat'],
            ['Intelligence', 'Research Memory', '/research-memory', 'Browse and search semantic research cache'],
            ['Intelligence', 'Notebooks', '/notebooks', 'Multi-document workspaces'],
            ['Intelligence', 'Compliance Hub', '/compliance', 'CSET compliance dashboard'],
            ['Intelligence', 'Voice Lab', '/voice-playground', 'Real-time audio chat playground and testing sandbox'],
            ['Create', 'Podcasts', '/podcasts', 'AI-generated podcast management'],
            ['Manage', 'Models', '/settings/api-keys', 'API keys and model configuration'],
            ['Manage', 'Transformations', '/transformations', 'Content transformation templates'],
            ['Manage', 'Style Guides', '/settings/styleguides', 'Document style guide management'],
            ['Manage', 'Voice AI', '/settings/voice', 'Speech synthesis (TTS) speaker profile configuration'],
            ['Manage', 'Containers', '/settings/containers', 'Background docker/process health monitor and restarting utilities'],
            ['Manage', 'Documentation', '/documentation', 'This documentation wiki'],
            ['Manage', 'Settings', '/settings', 'Application settings and pipeline config'],
            ['Manage', 'Advanced', '/advanced', 'Developer tools and diagnostics'],
          ],
        },
      },
      {
        id: 'sitemap-routes',
        title: 'Complete Route Tree & Layout Structure',
        content: 'The frontend features exactly 32 page files (`page.tsx`) defined in the `frontend/src/app` directory.\n\n' +
                 '### Next.js App Router Structure & Layout Groups:\n' +
                 '• Root Layout (`src/app/layout.tsx`): Establishes global HTML, font configurations, and injects global context providers (QueryClient, Toaster).\n' +
                 '• Route Groups: The application partitions routes into structural groups such as `(auth)` (login screen) and `(dashboard)` (authenticated features).\n' +
                 '• Dashboard Layout (`src/app/(dashboard)/layout.tsx`): Implements an authentication guard (`useAuth`) that redirects unauthenticated users to `/login`. It also initializes modal contexts and wraps child components in the global AppShell.\n\n' +
                 '### AppShell & Sidebar Collapsibility:\n' +
                 '• App Shell (`src/components/layout/AppShell.tsx`): Sets up the core layout framework, rendering collapsible sidebar, breadcrumbs navigation, and setup warning banners.\n' +
                 '• App Sidebar (`src/components/layout/AppSidebar.tsx`): Organizes menus into functional groups (Collect, Operations, Intelligence, Create, Manage). Collapsibility state is managed globally by the Zustand `sidebar-store` (`isCollapsed` on desktop, `isMobileOpen` for mobile drawer) and saved to local storage.',
        table: {
          headers: ['Route', 'Page', 'Description'],
          rows: [
            ['/', 'Home', 'Redirects to default dashboard page'],
            ['/login', 'Login', 'Authentication access panel'],
            ['/sources', 'Sources', 'Document source listing, upload, and management'],
            ['/operations', 'Operations Hub', 'Business analytics dashboard with charts and KPIs'],
            ['/customer-ledger', 'Customer Ledger', 'CRM customer listing with search, filter, sort'],
            ['/customers/[id]', 'Customer Dossier', '6-tab customer view: Profile, Contacts, Projects, Threats, Compliance, Sector Reference'],
            ['/contacts', 'Contacts Directory', 'Global contact listing across all customers'],
            ['/research', 'Research Intelligence', 'Research item management with priority and status tracking'],
            ['/projects', 'Project Delivery', 'Project tracking with milestones and deliverables'],
            ['/search', 'Ask & Search', 'Semantic search with streaming AI responses'],
            ['/research-memory', 'Research Memory', 'Audit log and semantic cache dashboard for query/results history'],
            ['/notebooks', 'Notebooks', 'Multi-document workspace with AI chat panel'],
            ['/notebooks/[id]', 'Notebook Detail', 'Specific notebook with sources, notes, and chat'],
            ['/compliance', 'Compliance Hub', 'CSET compliance overview and assessment dashboard'],
            ['/voice-playground', 'Voice Lab', 'Real-time audio chat playground and testing sandbox'],
            ['/podcasts', 'Podcasts', 'Podcast episode listing with player and generation'],
            ['/transformations', 'Transformations', 'Template-based content transformation with preview'],
            ['/pipeline', 'Sales Pipeline', 'Kanban board with 7 deal stages'],
            ['/settings', 'Settings', 'General application settings'],
            ['/settings/api-keys', 'Model Providers', 'API key management and default model assignments'],
            ['/settings/pipeline', 'Pipeline Settings', 'Automation rules for pipeline stages'],
            ['/settings/styleguides', 'Style Guides', 'Document style guide CRUD'],
            ['/settings/voice', 'Voice AI', 'Configure speech generation voices and settings'],
            ['/settings/containers', 'Containers', 'Background docker/process health monitor and restarting utilities'],
            ['/documentation', 'Documentation', 'This comprehensive wiki'],
            ['/advanced', 'Advanced', 'Developer tools, DB management, diagnostics'],
          ],
        },
      },
    ],
  },
  {
    id: 'api',
    title: 'API Reference',
    icon: Server,
    color: 'amber',
    badge: 'API',
    description: 'Complete REST API endpoint documentation organized by domain.',
    subsections: [
      {
        id: 'api-overview',
        title: 'FastAPI Backend Endpoints Overview',
        content: 'The platform API is built using FastAPI (Python 3.11) with a total of 272 registered endpoints. The endpoints are modularly grouped by router files under `api/routers/`. Below is the complete endpoint count and responsibility breakdown per router file:',
        table: {
          headers: ['Router File', 'Route Count', 'Primary Responsibility / Exemplary Endpoints'],
          rows: [
            ['api/routers/notebooks.py', '20', 'Drawing canvas notebook management, node/edge validation (POST /api/graph/validate), export routes (POST /api/notebooks/export/*).'],
            ['api/routers/models.py', '14', 'Model registries, auto-assignment of default models, sync, provider configuration.'],
            ['api/routers/credentials.py', '14', 'Cloud credentials management, OAuth flows, and environment migration utilities.'],
            ['api/routers/research_items.py', '14', 'Background research tasks, deep research triggering, item approvals.'],
            ['api/routers/voice.py', '14', 'Voice configuration, text-to-speech (TTS) preflight, audio transcribing (STT).'],
            ['api/routers/sources.py', '12', 'Document source ingestion, full-text storage, and direct file download routing.'],
            ['api/routers/podcasts.py', '12', 'Podcast episode creation, background generation, and execution scheduling.'],
            ['api/routers/agents.py', '11', 'LLM agent definitions, custom prompts, and background pipeline runs.'],
            ['api/routers/publications.py', '11', 'Scheduled posts publishing calendar, marketing metrics collection.'],
            ['api/routers/assessments.py', '10', 'Compliance assessments, auditing sessions, CSET reporting, and rollup analytics.'],
            ['api/routers/projects.py', '9', 'Project management, task tracking, and linking research items to active projects.'],
            ['api/routers/transformations.py', '8', 'Content prompt templates, transformation pipelines, and execution engines.'],
            ['api/routers/scheduled_search.py', '8', 'Automated recurring query scheduling and background search execution.'],
            ['api/routers/chat.py', '7', 'General LLM assistant sessions, message threads, and notebook context building.'],
            ['api/routers/contacts.py', '6', 'Customer stakeholder contacts list and contact updates.'],
            ['api/routers/locations.py', '6', 'Facility locations definition, CRUD, and customer scoping.'],
            ['api/routers/episode_profiles.py', '6', 'Speaker profiles, audio metadata, and duplicating podcast outlines.'],
            ['api/routers/speaker_profiles.py', '6', 'Voice synthesizer speaker configs, duplication, and metadata querying.'],
            ['api/routers/source_chat.py', '6', 'Vector-augmented chat sessions scoping to individual source documents.'],
            ['api/routers/voice_sessions.py', '6', 'Web-socket or message-based real-time voice sessions, note creation.'],
            ['api/routers/customers.py', '5', 'Customer profile registry, metadata adjustments.'],
            ['api/routers/search.py', '5', 'Multi-modal semantic research search, document comparison.'],
            ['api/routers/research_memory.py', '3', 'Research semantic cache querying, browse logs, and statistics.'],
            ['api/routers/notes.py', '5', 'Note entity definitions, content updating, and notebook associations.'],
            ['api/routers/commands.py', '5', 'Dynamic task execution, command registry debugging.'],
            ['api/routers/pipeline.py', '5', 'Scanning status checking, compliance pipelines, automation rules.'],
            ['api/routers/styleguides.py', '5', 'Styleguide templates for podcast/transcript text rendering.'],
            ['api/routers/skills.py', '5', 'Extensible agent skill registry CRUD.'],
            ['api/routers/import_export.py', '4', 'CSV/JSON data bulk importer/exporter utilities.'],
            ['api/routers/containers.py', '4', 'Background process container health monitor, restarts, logs.'],
            ['api/routers/activities.py', '3', 'Unified timeline activities listing, manual log insertions.'],
            ['api/routers/insights.py', '3', 'Extracted document insights viewing and note conversion.'],
            ['api/routers/organizations.py', '2', 'Shared tenant organization boundaries.'],
            ['api/routers/auth.py', '2', 'Basic user profile and active auth session validators.'],
            ['api/routers/regulations.py', '2', 'Regulation and framework query tools.'],
            ['api/routers/embedding_rebuild.py', '2', 'Chunk re-indexing commands.'],
            ['api/routers/settings.py', '2', 'System configurations management.'],
            ['api/routers/voice_rag.py', '2', 'RAG-based real-time audio chat controllers.'],
            ['api/main.py', '2', 'Root endpoint and raw server health route.'],
            ['api/routers/config.py', '1', 'Global frontend config mappings injector.'],
            ['api/routers/embedding.py', '1', 'Single-shot vector embedding calculation endpoint.'],
            ['api/routers/context.py', '1', 'Context compiling for LLM prompting.'],
            ['api/routers/languages.py', '1', 'Supported translation languages enumerations.'],
            ['api/routers/platform.py', '1', 'Operating system platform indicators.'],
            ['api/routers/mcp.py', '1', 'Enabled Model Context Protocol (MCP) server statuses.']
          ]
        }
      },
      {
        id: 'api-sources',
        title: 'Sources API',
        content: 'Endpoints for managing document sources — the primary data ingestion layer.',
        table: {
          headers: ['Method', 'Path', 'Purpose'],
          rows: [
            ['GET', '/api/sources', 'List all sources with optional filtering'],
            ['POST', '/api/sources', 'Create new source (text, URL, file upload)'],
            ['GET', '/api/sources/{id}', 'Get source details with parsed content'],
            ['PUT', '/api/sources/{id}', 'Update source metadata'],
            ['DELETE', '/api/sources/{id}', 'Delete source and associated data'],
            ['POST', '/api/sources/{id}/reprocess', 'Re-parse and re-embed source'],
            ['POST', '/api/sources/upload', 'Upload file source (PDF, DOCX, etc.)'],
            ['POST', '/api/sources/upload_url', 'Ingest source from URL or YouTube'],
          ],
        },
      },
      {
        id: 'api-notebooks',
        title: 'Notebooks & Notes API',
        content: 'Manage multi-document workspaces and their notes.',
        table: {
          headers: ['Method', 'Path', 'Purpose'],
          rows: [
            ['GET', '/api/notebooks', 'List all notebooks'],
            ['POST', '/api/notebooks', 'Create new notebook'],
            ['GET', '/api/notebooks/{id}', 'Get notebook with sources and notes'],
            ['PUT', '/api/notebooks/{id}', 'Update notebook metadata'],
            ['DELETE', '/api/notebooks/{id}', 'Delete notebook'],
            ['POST', '/api/notebooks/{id}/sources', 'Link source to notebook'],
            ['DELETE', '/api/notebooks/{id}/sources/{sid}', 'Unlink source from notebook'],
            ['GET', '/api/notes', 'List notes (filterable by notebook)'],
            ['POST', '/api/notes', 'Create new note'],
            ['PUT', '/api/notes/{id}', 'Update note content'],
            ['DELETE', '/api/notes/{id}', 'Delete note'],
          ],
        },
      },
      {
        id: 'api-chat',
        title: 'Chat & AI API',
        content: 'Streaming AI chat for notebooks and sources.',
        table: {
          headers: ['Method', 'Path', 'Purpose'],
          rows: [
            ['POST', '/api/chat', 'Streaming notebook chat (SSE)'],
            ['POST', '/api/source-chat', 'Streaming source-level chat (SSE)'],
            ['GET', '/api/chat/sessions', 'List chat sessions'],
            ['DELETE', '/api/chat/sessions/{id}', 'Delete chat session'],
            ['POST', '/api/context', 'Get RAG context for a query'],
          ],
        },
      },
      {
        id: 'api-search',
        title: 'Search API',
        content: 'Semantic search with embedding lookup, reranking, and AI-powered answers.',
        table: {
          headers: ['Method', 'Path', 'Purpose'],
          rows: [
            ['POST', '/api/search', 'Execute semantic search query'],
            ['POST', '/api/search/ask', 'AI-powered question answering with streaming'],
            ['POST', '/api/search/research', 'Perform streaming research using Local KB, Perplexity, or Hybrid'],
            ['GET', '/api/search/history', 'Get search history'],
            ['POST', '/api/scheduled-search', 'Create scheduled/recurring search'],
            ['GET', '/api/scheduled-search', 'List scheduled searches'],
            ['DELETE', '/api/scheduled-search/{id}', 'Delete scheduled search'],
          ],
        },
      },
      {
        id: 'api-research-memory',
        title: 'Research Memory API',
        content: 'Endpoints to query, browse, and monitor the persistent pgvector-based research semantic cache.',
        table: {
          headers: ['Method', 'Path', 'Purpose'],
          rows: [
            ['GET', '/api/research-memory/stats', 'Get cache storage size and document distribution statistics'],
            ['POST', '/api/research-memory/search', 'Execute full-text keyword search across cached research corpus'],
            ['GET', '/api/research-memory/browse', 'Browse paginated history of cached search query results'],
          ],
        },
      },
      {
        id: 'api-crm',
        title: 'CRM API (Customers, Contacts, Pipeline)',
        content: 'Enterprise customer relationship management endpoints.',
        table: {
          headers: ['Method', 'Path', 'Purpose'],
          rows: [
            ['GET', '/api/customers', 'List customers with filtering'],
            ['POST', '/api/customers', 'Create new customer'],
            ['GET', '/customers/{id}', 'Get customer details'],
            ['PUT', '/customers/{id}', 'Update customer (sectors, frameworks)'],
            ['DELETE', '/customers/{id}', 'Delete customer'],
            ['GET', '/api/contacts', 'List all contacts'],
            ['POST', '/api/contacts', 'Create contact'],
            ['PUT', '/api/contacts/{id}', 'Update contact'],
            ['DELETE', '/api/contacts/{id}', 'Delete contact'],
            ['GET', '/api/pipeline', 'Get pipeline stages and deals'],
            ['PUT', '/api/pipeline/{id}', 'Update deal stage/value'],
            ['POST', '/api/import/preview', 'Preview CSV/XLSX import mapping'],
            ['POST', '/api/import/execute', 'Execute bulk import'],
            ['GET', '/api/export/customers', 'Export customers to CSV/XLSX'],
          ],
        },
      },
      {
        id: 'api-compliance',
        title: 'Compliance & Assessment API',
        content: 'CISA CSET compliance auditing, assessments, sessions, and reporting.',
        table: {
          headers: ['Method', 'Path', 'Purpose'],
          rows: [
            ['GET', '/api/assessments', 'List assessments (filter by customer)'],
            ['POST', '/api/assessments', 'Create assessment for framework'],
            ['GET', '/api/assessments/{id}', 'Get assessment details'],
            ['GET', '/api/assessments/{id}/sessions', 'List audit sessions'],
            ['POST', '/api/assessments/{id}/sessions', 'Create new audit session'],
            ['GET', '/api/assessments/{id}/trends', 'Get compliance trend data'],
            ['GET', '/api/sessions/{id}/questions', 'Get session questions'],
            ['PUT', '/api/sessions/{id}/questions/{qid}', 'Save answer for question'],
            ['POST', '/api/sessions/{id}/complete', 'Complete and score session'],
            ['GET', '/api/sessions/{id}/report', 'Generate gap analysis report'],
            ['GET', '/api/regulations', 'List available CSET regulations'],
          ],
        },
      },
      {
        id: 'api-models',
        title: 'Models & Configuration API',
        content: 'AI model management, provider credentials, and system configuration.',
        table: {
          headers: ['Method', 'Path', 'Purpose'],
          rows: [
            ['GET', '/api/models', 'List all available models (OpenRouter + Ollama)'],
            ['GET', '/api/models/openrouter', 'Fetch/sync OpenRouter model catalog'],
            ['GET', '/api/models/ollama', 'List locally available Ollama models'],
            ['GET', '/api/credentials', 'List API provider credentials'],
            ['POST', '/api/credentials', 'Add/update provider API key'],
            ['DELETE', '/api/credentials/{id}', 'Remove provider credential'],
            ['GET', '/api/settings', 'Get application settings'],
            ['PUT', '/api/settings', 'Update application settings'],
            ['GET', '/api/config', 'Get system configuration'],
            ['GET', '/api/embedding/status', 'Get embedding index status'],
            ['POST', '/api/embedding/rebuild', 'Rebuild embedding index'],
            ['GET', '/api/languages', 'List available UI languages'],
          ],
        },
      },
      {
        id: 'api-content',
        title: 'Content Creation API',
        content: 'Podcasts, transformations, research items, and project management.',
        table: {
          headers: ['Method', 'Path', 'Purpose'],
          rows: [
            ['GET', '/api/podcasts', 'List all podcasts'],
            ['POST', '/api/podcasts', 'Create new podcast'],
            ['GET', '/api/podcasts/{id}', 'Get podcast with episodes'],
            ['POST', '/api/podcasts/{id}/generate', 'Generate podcast audio'],
            ['GET', '/api/episode-profiles', 'List episode profiles'],
            ['GET', '/api/speaker-profiles', 'List speaker profiles'],
            ['GET', '/api/transformations', 'List transformation templates'],
            ['POST', '/api/transformations', 'Create transformation template'],
            ['POST', '/api/transformations/{id}/execute', 'Execute transformation'],
            ['GET', '/api/research-items', 'List research items'],
            ['POST', '/api/research-items', 'Create research item'],
            ['GET', '/api/projects', 'List projects'],
            ['POST', '/api/projects', 'Create project'],
            ['GET', '/api/styleguides', 'List style guides'],
            ['POST', '/api/styleguides', 'Create style guide'],
          ],
        },
      },
    ],
  },
  {
    id: 'features',
    title: 'Features & Use Cases',
    icon: Zap,
    color: 'rose',
    badge: 'FEATURES',
    description: 'Detailed feature documentation with user workflows and use cases.',
    subsections: [
      {
        id: 'feat-sources',
        title: 'Source Management',
        content: 'The source management system is the foundation of the platform. Sources are documents, URLs, or files that serve as the knowledge base for all downstream AI operations.',
        items: [
          { label: 'Upload & Ingest', description: 'Drag-and-drop PDF, DOCX, TXT files. Paste URLs including YouTube videos. Raw text input. Automatic content extraction and parsing via content-core library.' },
          { label: 'Content Processing', description: 'Automatic chunking, embedding generation, and vector storage. Configurable embedding models (OpenRouter or Ollama). Reprocessing capability for updated content.' },
          { label: 'Source Insights', description: 'AI-generated summaries, key topics extraction, named entity recognition. Configurable insight generation models.' },
          { label: 'Source Chat', description: 'Context-aware AI chat against individual sources. Streaming responses with source citations. Model selection per-chat session.' },
        ],
      },
      {
        id: 'feat-notebooks',
        title: 'Notebooks',
        content: 'Notebooks are multi-source workspaces for collaborative research and analysis.',
        items: [
          { label: 'Multi-Source Workspace', description: 'Link multiple sources to a single notebook workspace. Sources provide context for all AI operations within the notebook.' },
          { label: 'Note Taking', description: 'Create, edit, and organize notes within notebooks. Markdown support with rich formatting.' },
          { label: 'AI Chat Panel', description: 'Chat with your notebook using all linked sources as context. RAG-based retrieval with configurable models. Session management for conversation history.' },
          { label: 'B2B Drafting Workspace', description: 'Specialized workspace for business document drafting. Multi-agent routing with cost tracking. Template-based document generation.' },
          { label: 'Customer Linking', description: 'Associate notebooks with CRM customers for pipeline integration. Track deal values and proposal status.' },
        ],
      },
      {
        id: 'feat-search',
        title: 'Ask & Search (Research Intelligence)',
        content: 'Semantic search and deep research powered by the unified Valyu Research Platform, persistent pgvector-based semantic caching, and hybrid Reciprocal Rank Fusion.\n\n' +
                 '### 1. Unified Search & Context Routing\n' +
                 'The search API (`api/routers/search.py` and `open_notebook/search/valyu_search.py`) replaces deprecated multi-engine search cascades with the unified Valyu SDK, offering direct, optimized access to proprietary data sources. It supports context-aware routing which maps business domains to Valyu search parameters:\n' +
                 '• `compliance`: Targets proprietary databases (search_type=\'proprietary\') restricting results to `sec_filings` and `legal` sources.\n' +
                 '• `academic`: Searches proprietary databases (search_type=\'proprietary\') filtering for `arxiv`, `pubmed`, and `semantic_scholar`.\n' +
                 '• `financial`: Restricts queries to `fred`, `bls`, and `sec_filings`.\n' +
                 '• `biomedical`: Restricts queries to `pubmed` and `clinicaltrials`.\n' +
                 '• `news`: Queries current news feeds (search_type=\'news\').\n' +
                 '• `web`: Queries the full web index (search_type=\'all\').\n' +
                 '• Brave Fallback: If the Valyu API is unreachable or returns an error, the system automatically falls back to Brave Search using direct HTTP client connections.\n\n' +
                 '### 2. Memory-First Semantic Caching\n' +
                 'To minimize external API dependency, costs, and request latencies, a memory-first caching layer (`open_notebook/search/memory_first_search.py`) intercepts all search queries:\n' +
                 '• Cache Lookup: The user query is vectorized via the active embedding model, and the PostgreSQL pgvector cache (`research_corpus` table) is queried using cosine similarity (1 - (embedding <=> query_vector)).\n' +
                 '• Cache Hit: If similar query results are found with a cosine similarity score ≥ 0.85, they are returned instantly without invoking the Valyu API.\n' +
                 '• Cache Miss: If no similar results exist, a query is routed to the Valyu Search API. The raw results are returned to the client immediately while a background task (`asyncio.create_task`) asynchronously vectorizes and stores them in Postgres using `INSERT INTO ... ON CONFLICT DO NOTHING` (guided by unique constraints on query/url and query/content-hash).\n\n' +
                 '### 3. Reciprocal Rank Fusion (RRF) Hybrid Search\n' +
                 'The platform implements a hybrid search merging strategy (`hybrid_rrf_search`) to combine vector search and traditional keyword matching:\n' +
                 '• Semantic Retrieval: Cosine similarity-based search via pgvector HNSW index.\n' +
                 '• Lexical Retrieval: Traditional English full-text search (FTS) using PostgreSQL GIN indexing (`to_tsvector` / `plainto_tsquery`) to catch exact nomenclature, codes, and numbers.\n' +
                 '• RRF Formula: Merges the two ranked lists by assigning a combined score based on ranks: RRF(d) = 1/(60 + rank_semantic(d)) + 1/(60 + rank_keyword(d)). The documents are then sorted by this final fusion score, ensuring highly relevant exact-match and concept-match results.\n\n' +
                 '### 4. Asynchronous Valyu DeepResearch Workflow\n' +
                 'For intensive, long-running research, the system runs an asynchronous DeepResearch background pipeline (`open_notebook/search/deep_research.py`):\n' +
                 '• Task Creation: Creating a research task maps user-friendly depth configurations to Valyu SDK execution modes: `quick` → `fast`, `standard` → `standard`, `deep` → `heavy`, and `exhaustive` → `max`.\n' +
                 '• Non-Blocking Polling: FastAPI spawns the research thread and monitors task completion asynchronously via a status polling loop (polling every 10 seconds with a 10-minute timeout limit).\n' +
                 '• Progress Broadcasting: The backend updates the research item\'s status (`ri.deep_research_state`) and appends event logs (`ri.deep_research_events`) during execution. The frontend displays these events in a real-time progress drawer.\n' +
                 '• Caching & Note Conversion: Once completed, the final markdown report is automatically vectorized and saved in the Postgres `ResearchMemory` cache using a special URI prefix (`valyu://deep_research/{id}`) and `deep_research` source type. It is then saved to SurrealDB as a Note and attached to the target notebook.',
        items: [
          { label: 'Valyu Search Integration', description: 'Replaces legacy multi-engine APIs with unified SDK searches. Employs context-aware parameters and automated Brave Search fallback routing.' },
          { label: 'pgvector Semantic Cache', description: 'Checks local Postgres research memory using vector cosine similarity. Saves search costs and reduces latency with background caching workers.' },
          { label: 'RRF Hybrid Search', description: 'Blends pgvector semantic results and Postgres FTS keyword results using Reciprocal Rank Fusion (k=60) for maximum query recall.' },
          { label: 'Asynchronous DeepResearch', description: 'Launches non-blocking background tasks with progress tracking, status event logging, and automatic caching of completed long-form report documents.' },
          { label: 'Scheduled Searches', description: 'Periodically runs scheduled queries against Valyu or Brave search engines, saving new results as sources or notes directly into notebooks.' },
        ],
      },
      {
        id: 'feat-crm',
        title: 'CRM & Sales Pipeline Subsystem',
        content: 'Enterprise customer relationship management with sales pipeline tracking and automated transition rules.\n\n' +
                 '### 1. Three Pipelines & Mapped Stages\n' +
                 'The system manages customer and task progression across three distinct workflows defined in `pipelines.ts`:\n' +
                 '• Sales Pipeline (`sales`): 7 stages representing the deal lifecycle: `bulk_import` (Import Staging), `data_enrichment` (Data Enrichment), `lead` (Leads Prospecting), `research` (Client Research), `technical_discovery` (Technical Discovery), `proposal` (Proposal Drafts), and `won` (Contract Won).\n' +
                 '• Research Pipeline (`research`): 5 stages tracking research tasks: `queued` (Queued Research), `researching` (Researching), `analyzing` (Analyzing), `completed` (Completed), and `archived` (Archived).\n' +
                 '• Publication Queue (`publication`): 6 stages for editing calendar items: `concept` (Concept Outline), `refinement` (Draft Refinement), `publication_type` (Publication Type), `review` (Editorial Review), `publish` (Published Docs), and `track` (Post Analytics).\n\n' +
                 '### 2. Kanban Configuration & Colors\n' +
                 'The Kanban board uses color codes mapped to progress: columns are styled with custom color badges defined in frontend constants. Dragging cards between columns triggers updates to the notebook endpoint `/api/notebooks/{notebook_id}` to synchronize stages.\n\n' +
                 '### 3. Backend Transition Validation Rules\n' +
                 'Notebook stage transitions are validated on updates in `api/routers/notebooks.py`. Transitioning items past initial stages requires assignee and date configurations, along with resource and compliance gates:\n' +
                 '• **Sales Pipeline**: Transitioning to non-lead stages (`research`, `technical_discovery`, `proposal`, `won`) validates that the deal has an assignee (`assigned_to`) and a target close date (`close_date`). Transitioning to `proposal` or `won` requires at least one source document or research note. Transitioning to `won` (if a customer is linked) requires that a compliance assessment has been completed and locked.\n' +
                 '• **Research Pipeline**: Transitioning to non-queued stages (`researching`, `analyzing`, `completed`, `archived`) requires an assignee (`assigned_to`) and a target completion date (`close_date`). Transitioning to `completed` (if a customer is linked) requires that a compliance quiz session has been completed and locked.\n' +
                 '• **Publication Queue**: Transitioning to non-concept stages (`refinement`, `publication_type`, `review`, `publish`, `track`) requires an assignee (`assigned_to`) and a scheduled date (`close_date`). Transitioning to `publish` (if a customer is linked) requires that a compliance assessment has been completed and locked.\n\n' +
                 '### 4. Contact & Location Ownership Constraints\n' +
                 'The system models relationships using a parent-child structure in SurrealDB:\n' +
                 '• Mappings: `Customer` is the parent; `Contact` (people) and `Location` (facilities) are children. A contact links to a customer (`customer_id`) and multiple locations (`location_ids` array).\n' +
                 '• Ownership Constraints: To prevent cross-tenant data corruption or unauthorized links, the API enforces that every location in a contact\'s `location_ids` array must have a `customer_id` matching the contact\'s `customer_id`. Any mismatch returns an HTTP `400 Bad Request` validation error.',
        items: [
          { label: 'Customer Management', description: '30+ field customer profiles. Primary sector, CISA infrastructure sectors, compliance frameworks, corporate description, industry classification, customer type (prospect/client/partner/vendor), tier (enterprise/mid-market/SMB).' },
          { label: 'Customer Dossier', description: '6-tab deep-dive: Profile Stakeholders, Contacts, Associated Projects, Threat Canvas (network graph), Compliance Wizard, Sector Reference Guidelines.' },
          { label: 'Pipeline Kanban', description: '7-stage deal pipeline: Import Staging → Data Enrichment → Leads Prospecting → Client Research → Technical Discovery → Proposal Drafts → Contract Won. Drag-and-drop deal movement. Deal value tracking.' },
          { label: 'Contact Management', description: 'Multi-contact per customer. Role-based contacts (C-suite, Manager, Technical, Legal). Email and phone tracking.' },
          { label: 'Import/Export', description: 'Bulk CSV/XLSX import with column mapping wizard. Preview with validation. Export to CSV/XLSX.' },
        ],
      },
      {
        id: 'feat-compliance',
        title: 'CSET Compliance Auditing',
        content: 'Full CISA Cybersecurity Evaluation Tool (CSET) implementation for regulatory compliance assessment.\n\n' +
                 '### 1. 16 Critical Infrastructure Sectors Mapping\n' +
                 'The system maps client profiles to CISA-defined critical infrastructure sectors. The 16 sectors plus a default Cross-Sector fallback include:\n' +
                 'Chemical, Commercial Facilities, Communications, Critical Manufacturing, Dams, Defense Industrial Base, Emergency Services, Energy, Financial Services, Food and Agriculture, Government Facilities, Healthcare and Public Health, Information Technology, Nuclear Reactors, Materials, and Waste, Transportation Systems, Water and Wastewater Systems, and Cross-Sector.\n' +
                 'The system maps each sector to recommended frameworks via `SECTOR_FRAMEWORK_MAP` (e.g. mapping `Energy` to NERC CIP, `IEC_62443_3_3`, and `NIST_800_82`).\n\n' +
                 '### 2. Dynamic "No Exclusion" Asset-Audit Linkage Logic\n' +
                 'In the CSET Components framework (ID `"regulation:Components"`), questions are dynamically excluded (forced to `"NA"`) if their associated asset types are missing from the drawing canvas notebook diagram.\n' +
                 'Exact Execution Flow:\n' +
                 '1. Asset Retrieval: `get_active_cset_prefixes_for_session` resolves the customer ID linked to the active session. It queries the `asset` table for all drawing canvas objects linked to the notebook: `SELECT type FROM asset WHERE notebook_id = $nb_id`.\n' +
                 '2. Normalizing & Prefix Resolution: Each asset\'s `type` is normalized (lowercase, symbols removed) and mapped to standard CSET components using `CSET_COMPONENT_MAPPING`. For example: `switch` maps to prefixes like `["Switch", "VLAN Switch", "Router"]`, while `firewall` maps to `["Firewall", "VPN", "IDS", "IPS"]`.\n' +
                 '3. Filtering: In `get_session_questions`, the questions are evaluated sequentially. If a question\'s `standard_code` prefix does not match any prefix corresponding to the active canvas assets, the answer is dynamically forced to `"NA"`. (The prefix `"Comp"` is always active for general component items).\n\n' +
                 '### 3. Scoring Rollup & Compliance Formulas\n' +
                 '1. Individual Session Scores:\n' +
                 '   • Compliance Score Formula:\n' +
                 '     Compliance Score = ((Yes Count + Alt Count) / (Total Questions - NA Count)) * 100\n' +
                 '   • Completion Percentage Formula:\n' +
                 '     Completion Percentage = (Answered Count / Total Questions) * 100\n' +
                 '     (where Answered Count includes any answer other than the default Unanswered "U")\n' +
                 '   • Locking Snapshot Behavior: When a session is finalized (via `POST /api/sessions/{session_id}/complete`), these scores and category breakdowns are saved as a static, read-only JSON object `compliance_snapshot` in the `assessment_session` document.\n\n' +
                 '2. Cross-Facility Aggregation (Rollup):\n' +
                 '   Under `GET /api/customers/{customer_id}/compliance-rollup`, the system aggregates scores across all locations:\n' +
                 '   - Queries all assessments for the customer, mapping assessments without location ID to "Organization-Wide".\n' +
                 '   - Obtains the latest session for each location. In-progress sessions are computed dynamically, while completed sessions use the static `compliance_snapshot`.\n' +
                 '   - Computes framework-level metrics by averaging scores across all assessed locations:\n' +
                 '     Average Compliance Score = sum(Facility Compliance Scores) / Total Assessed Facilities\n' +
                 '     Average Completion Percentage = sum(Facility Completion Percentages) / Total Assessed Facilities\n\n' +
                 '### 4. Prioritized Recommendations Gating & Purdue Levels\n' +
                 'Actionable recommendations are compiled from failed or unanswered questions ("N" or "U") and prioritized by Purdue Levels:\n' +
                 '• Critical (Priority Order 1): Purdue Levels 1 & 2 (kinetic boundary and field device controls).\n' +
                 '• High (Priority Order 2): Purdue Level 3 (Operations Control, DMZ, and supervision).\n' +
                 '• Medium (Priority Order 3): Other Purdue Levels (enterprise and external connections).\n' +
                 'Recommendations are sorted first by priority order, then alphabetically by standard code (`x["order"]`, `x["standard_code"]`).',
        items: [
          { label: 'Sector Mapping', description: '16 CISA infrastructure sectors with automatic framework recommendation. SECTOR_FRAMEWORK_MAP links sectors to relevant compliance standards. Color-coded sector visualization.' },
          { label: '50+ Compliance Frameworks', description: 'NERC CIP (14 standards), IEC 62443, NIST SP 800 series, CMMC, ISO 27001, PCI DSS, HIPAA, SOC 2, and more. Framework definitions with full metadata.' },
          { label: 'Assessment Wizard', description: 'Question-by-question auditing interface. YES/NO/N\/A/ALT answer options. Purdue level classification. Evidence attachment and comments.' },
          { label: 'Milestone Tracking', description: 'Multiple audit sessions per assessment. Carry-forward answers between sessions. Session status tracking (Active → Completed).' },
          { label: 'Gap Analysis Reports', description: 'Automated compliance scoring. Category coverage index. Radar spider visualization. Prioritized remediation roadmap. Trend analysis across sessions.' },
          { label: 'Dynamic Sector Reference', description: 'Sector-specific guidelines and directives. Auto-generated from mapped CISA sectors. Framework pills showing assignment status.' },
        ],
      },
      {
        id: 'feat-telemetry',
        title: 'Activity Telemetry Subsystem',
        content: 'The activity telemetry subsystem tracks all significant actions, logs events to SurrealDB, and streams them on a unified timeline.\n\n' +
                 '### Database Schema for `activity`\n' +
                 'The system stores telemetry logs in a SCHEMAFULL `activity` table with the following properties:\n' +
                 '• `customer_id` (string): Scopes telemetry to a specific customer profile.\n' +
                 '• `activity_type` (string): Category tag for validation.\n' +
                 '• `description` (string): Human-readable event details.\n' +
                 '• `metadata` (option<object>): Custom JSON payload (e.g. `{"notebook_id": "..."}`).\n' +
                 '• `actor` (string, default "system"): Entity that triggered the event.\n' +
                 '• `created`/`updated` (option<datetime>): Event timestamps.\n' +
                 'Indexes are defined on `customer_id`, `activity_type`, and `created` to optimize query performance.\n\n' +
                 '### Dynamic Event Emission & Try-Except Gating\n' +
                 'Events are emitted asynchronously via `emit_activity` in `api/routers/activity_emitter.py` using a fire-and-forget pattern:\n' +
                 '• The telemetry logging write is entirely wrapped in a `try-except` block.\n' +
                 '• Database errors or connection timeouts are caught, logged as warnings (`logger.warning`), and suppressed.\n' +
                 '• This try-except block ensures that telemetry logging failures never interrupt primary database transactions (like saving notebooks or notes).\n\n' +
                 '### Unified Timeline API\n' +
                 'The timeline endpoint `GET /api/activities` (in `api/routers/activities.py`):\n' +
                 '• Filters events by `customer_id` and optionally by `activity_type`.\n' +
                 '• Returns results sorted chronologically (`ORDER BY created DESC`).\n' +
                 '• Implements pagination via `limit` (default 50) and `offset` query parameters.\n\n' +
                 '### 14 Standardized Event Types\n' +
                 'Telemetry events are validated against the following 14 types:\n' +
                 '1. `notebook_created`: New diagram canvas created.\n' +
                 '2. `note_added`: Note added to a workspace.\n' +
                 '3. `source_added`: Document uploaded.\n' +
                 '4. `stage_changed`: Sales or scanning stage changed.\n' +
                 '5. `contact_added`: New stakeholder contact added.\n' +
                 '6. `contact_updated`: Stakeholder details modified.\n' +
                 '7. `deal_updated`: Notebook estimated value changed.\n' +
                 '8. `assessment_started`: Compliance framework audit started.\n' +
                 '9. `assessment_completed`: Compliance session finalized and locked.\n' +
                 '10. `pipeline_moved`: Automation rule triggered.\n' +
                 '11. `customer_updated`: Dossier parameters updated.\n' +
                 '12. `email_sent`: Client notification sent.\n' +
                 '13. `meeting_logged`: Consultation meeting logged.\n' +
                 '14. `custom`: Catch-all type for miscellaneous activities.'
      },
      {
        id: 'feat-podcasts',
        title: 'Podcast Generation Subsystem',
        content: 'Generate B2B audio podcasts from document sources using advanced multi-speaker profiles, diverse TTS engines, and safety controls.\n\n' +
                 '### 1. Speaker & Episode Profiles Structure\n' +
                 '• Speaker Profile (`SpeakerProfile`): Contains name, description, global voice model link, and 1 to 4 speakers. Each speaker configuration requires: `name`, `voice_id` (ElevenLabs voice ID hash or Kokoro voice name), `backstory`, and `personality`. Custom voice model overrides can be applied per-speaker.\n' +
                 '• Episode Profile (`EpisodeProfile`): Defines name, description, mapped speaker configuration, outline and transcript generating LLMs, BCP 47 language locale code (e.g. `en-US`), default briefing template, and segment counts (between 3 and 20).\n\n' +
                 '### 2. Four TTS Engines & Kokoro Protocol Mapping\n' +
                 'The audio synthesis backend integrates with 4 TTS engine APIs:\n' +
                 '1. Kokoro TTS: High-speed local open-source synthesizer running on port 8880. If provider is set to `"kokoro"`, the backend automatically redirects the request to an OpenAI-compatible `/v1/audio/speech` endpoint mapped to the local Kokoro container.\n' +
                 '2. OpenAI TTS: Standard cloud synthesis using `tts-1` / `tts-1-hd` via `https://api.openai.com/v1/audio/speech`.\n' +
                 '3. ElevenLabs TTS: High-fidelity voice cloning via `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`.\n' +
                 '4. Deepgram TTS: Low-latency voice synthesis via `https://api.deepgram.com/v1/speak` aura models.\n\n' +
                 '### 3. Backend Diagnostics & Preflight Checks\n' +
                 'The `/api/voice/preflight` diagnostics endpoint checks connections and keys before initiating long synthesis tasks:\n' +
                 '• Kokoro: Pings `KOKORO_TTS_URL/health`.\n' +
                 '• OpenAI: Queries the models list at `https://api.openai.com/v1/models` using the API key.\n' +
                 '• ElevenLabs: Queries active voices at `https://api.elevenlabs.io/v1/voices`.\n' +
                 '• Deepgram: Pings project metadata at `https://api.deepgram.com/v1/projects`.\n' +
                 'Response latencies are measured, and raw API error outputs are sanitized to avoid key leakages in logs.\n\n' +
                 '### 4. SurrealDB Link Conversions & Job Isolation\n' +
                 '• Link Conversions: To prevent SurrealDB syntax errors where empty strings break record-link attributes, the system automatically converts empty strings `""` to `None` for option record links (`voice_model`, `outline_llm`, `transcript_llm`) before database persistence.\n' +
                 '• Job Isolation and Cleanup: During podcast command setups, the background task loads all profiles in batch. To prevent validation failures from incomplete or outdated profiles, the backend checks credentials for all configurations and silently removes invalid ones from the dictionary passed to the generation worker, ensuring isolated execution.\n\n' +
                 '### 5. Audio Compilation Safety & Path Traversal Protections\n' +
                 '• Directory Isolation: The compiler generates audio segments in an isolated, UUID4-based directory under the paths root: `{DATA_FOLDER}/podcasts/episodes/{uuid4()}/` to prevent collisions.\n' +
                 '• Path Traversal Prevention: The download router (`/api/podcasts/episodes/{episode_id}/audio`) resolves absolute paths of requested files and verifies they remain strictly within the `{DATA_FOLDER}/podcasts/episodes/` root directory. Attempting traversal using parent operators (like `..`) triggers an HTTP `403 Forbidden` or `400 Bad Request` error.',
        items: [
          { label: 'Episode Profiles', description: 'Configure episode structure: format, duration, topics. Link to source documents for content extraction.' },
          { label: 'Speaker Profiles', description: 'Define speakers with voice characteristics, speaking style, and personality. Multi-speaker support for conversational podcasts.' },
          { label: 'Audio Generation', description: 'AI-generated audio using text-to-speech. Multiple voice options. Configurable speech patterns and pacing.' },
          { label: 'Episode Management', description: 'Episode listing with playback. Download generated audio. Episode metadata and description.' },
        ],
      },
      {
        id: 'feat-transformations',
        title: 'Content Transformations',
        content: 'Template-based content transformation with AI assistance.',
        items: [
          { label: 'Transformation Templates', description: 'Create reusable content transformation templates. Jinja2-style template syntax. Variables and conditionals support.' },
          { label: 'Playground', description: 'Live transformation preview. Input sources → AI processing → formatted output. Model selection for transformation quality.' },
          { label: 'Template Library', description: 'Save and reuse transformation templates across sessions. Version tracking and template sharing.' },
        ],
      },
    ],
  },
  {
    id: 'components',
    title: 'Component Library',
    icon: Code,
    color: 'sky',
    badge: 'CODE',
    description: 'Frontend component architecture, custom hooks, and state management.',
    subsections: [
      {
        id: 'comp-directories',
        title: 'Component Directories',
        content: 'The component library is organized into 18 directories by domain and function.',
        table: {
          headers: ['Directory', 'Components', 'Purpose'],
          rows: [
            ['ui/', '30+ primitives', 'shadcn/ui base components (Button, Card, Dialog, Select, etc.)'],
            ['layout/', 'AppShell, AppSidebar, SetupBanner', 'Application shell and navigation'],
            ['common/', 'ModelSelector, SearchableModelSelect, ThemeToggle, CommandPalette', 'Shared cross-feature components'],
            ['search/', 'AdvancedModelsDialog, StreamingResponse, SearchResults', 'Search-related UI'],
            ['source/', 'ChatPanel, SessionManager, ModelSelector, SourceInsightDialog', 'Source interaction components'],
            ['sources/', 'SourceList, SourceCard, SourceDialog', 'Source listing and management'],
            ['notebooks/', 'NotebookList, ChatColumn, B2BDraftingWorkspace', 'Notebook workspace components'],
            ['customers/', 'CustomerForm, CustomerCard', 'Customer CRUD components'],
            ['contacts/', 'ContactForm, ContactsPanel', 'Contact management components'],
            ['data-table/', 'DataTable, ColumnHeader, Pagination, Toolbar, RowActions', 'Generic data table system'],
            ['import/', 'ImportWizard', '4-step CSV/XLSX import wizard'],
            ['podcasts/', 'EpisodeProfileFormDialog, SpeakerProfileFormDialog', 'Podcast configuration forms'],
            ['settings/', 'ProviderCard, ModelTestButton', 'Settings page components'],
            ['scheduled-search/', 'ScheduledSearchList', 'Recurring search management'],
            ['columns/', 'Column definitions', 'Data table column configurations'],
            ['errors/', 'ErrorBoundary, ErrorPage', 'Error handling components'],
            ['providers/', 'ModalProvider, QueryProvider', 'React context providers'],
            ['auth/', 'LoginForm', 'Authentication UI'],
          ],
        },
      },
      {
        id: 'comp-hooks',
        title: 'Custom Hooks (41)',
        content: 'The frontend codebase defines exactly 41 custom React hooks (40 in the core `frontend/src/lib/hooks/` folder and 1 localized within the voice settings page) to coordinate state, data fetching, and layouts.',
        table: {
          headers: ['Hook Name', 'Target File', 'Purpose & Responsibility'],
          rows: [
            ['useAuth', 'hooks/use-auth.ts', 'Integrates with useAuthStore to guard routes, redirect users post-login, and handle session expiration.'],
            ['useNotebookChat', 'hooks/useNotebookChat.ts', 'Orchestrates notebook-level chat sessions. Retrieves history, and manages Server-Sent Events (SSE) message streaming with context parsing.'],
            ['useSourceChat', 'hooks/useSourceChat.ts', 'Manages chat session state and messaging constrained to the context of a single document source.'],
            ['useAsk', 'hooks/use-ask.ts', 'Interfaces with the search API endpoint (/api/search/ask) for Q&A queries.'],
            ['useSearch', 'hooks/use-search.ts', 'Executes and manages history for semantic vector searches.'],
            ['useInsights', 'hooks/use-insights.ts', 'Orchestrates dynamic AI analysis generation for uploaded documents.'],
            ['useModalManager', 'hooks/use-modal-manager.ts', 'Synchronizes open detail modals with Next.js URL parameters (?modal=source&id=xyz) for shareable views.'],
            ['useBreadcrumbs', 'hooks/use-breadcrumbs.ts', 'Triggers dynamic header breadcrumb title updates as pages mount/unmount.'],
            ['useNotebookColumns', 'hooks/use-notebook-columns.ts', 'Coordinates multi-column widths and visibility settings in the notebook workspace.'],
            ['useCustomers', 'hooks/use-customers.ts', 'React Query wrapper handling CRM customer queries, cache invalidations, and mutations.'],
            ['useModels', 'hooks/use-models.ts', 'Fetches available language models and embedding providers from OpenRouter and Ollama configurations.'],
            ['useCredentials', 'hooks/use-credentials.ts', 'Handles CRUD operations for API keys.'],
            ['useVoiceSessions', 'hooks/use-voice-sessions.ts', 'Manages live WebRTC audio stream connections for voice assistant features.']
          ],
        },
      },
      {
        id: 'comp-stores',
        title: 'State Management (Zustand & React Query)',
        content: 'The platform manages global UI configurations, themes, and user authentication using 6 distinct Zustand stores defined under `frontend/src/lib/stores/`:\n\n' +
                 '1. `auth-store.ts` (Authentication State)\n' +
                 '   - State: `user` (profile metadata), `accessToken` (JWT), `refreshToken` (JWT), and login status.\n' +
                 '   - Persistence Key: `auth-storage` in `localStorage`.\n' +
                 '   - Usage: Authorizes outgoing API calls by injecting JWT headers; evaluated by the auth guard to handle logins and redirections.\n\n' +
                 '2. `sidebar-store.ts` (Layout Collapse State)\n' +
                 '   - State: `isCollapsed` (desktop sidebar toggle) and `isMobileOpen` (mobile drawer sidebar toggle).\n' +
                 '   - Persistence Key: `sidebar-storage` in `localStorage`.\n' +
                 '   - Usage: Adjusts main layout padding and sidebar sizing in the AppShell component.\n\n' +
                 '3. `theme-store.ts` (Theme Selection)\n' +
                 '   - State: `theme` (\'light\' | \'dark\' | \'system\').\n' +
                 '   - Persistence Key: `theme-storage` in `localStorage`.\n' +
                 '   - Usage: Controls UI styling by toggling the `class="dark"` attribute on the `<html>` root node.\n\n' +
                 '4. `breadcrumb-store.ts` (Breadcrumb Navigation)\n' +
                 '   - State: `items` (array of navigation label and link pairs).\n' +
                 '   - Persistence Key: Memory-only (unpersisted).\n' +
                 '   - Usage: Modifies the top dashboard header title path dynamically based on active page mount lifecycle.\n\n' +
                 '5. `navigation-store.ts` (Navigation Stack History)\n' +
                 '   - State: `history` (list of traversed paths) and active views tracker.\n' +
                 '   - Persistence Key: Memory-only (unpersisted).\n' +
                 '   - Usage: Powers custom back-navigation and coordinates modal-driven sub-routes.\n\n' +
                 '6. `notebook-columns-store.ts` (Workspace Layout Configuration)\n' +
                 '   - State: Dynamic panel widths, visibility flags, and display order for notebook columns.\n' +
                 '   - Persistence Key: Memory-only.\n' +
                 '   - Usage: Saves columns layout configurations dynamically during dragging/resizing within notebooks detail page.',
        items: [
          { label: 'sidebar-store', description: 'Controls sidebar collapsed/expanded state. Persisted across sessions.' },
          { label: 'TanStack Query', description: 'Server state management for all API data. Automatic caching, refetching, and invalidation. Query client configured with sensible defaults.' },
          { label: 'React Context (minimal)', description: 'ModalProvider for global modal coordination. QueryProvider for React Query client. I18n provider for translations.' },
        ],
      },
      {
        id: 'comp-api-clients',
        title: 'API Client Modules (30)',
        content: 'The frontend includes exactly 30 API files in `frontend/src/lib/api/` (consisting of 27 resource-specific API modules, 1 base Axios configuration, 1 query-client helper, and 1 developer reference file). All endpoints communicate via a central client.\n\n' +
                 '### Base Configuration (`client.ts`):\n' +
                 '• Auto-Inject JWT: An request interceptor automatically extracts the JWT token from the `auth-storage` localStorage and attaches it as an `Authorization: Bearer <token>` header.\n' +
                 '• Timeout: Configured with a 10-minute timeout (`600000ms`) to accommodate heavy background requests such as vector embedding calculation, semantic reranking, and text-to-speech generation.\n' +
                 '• 401 Error Handler Interceptor: On encountering an HTTP `401 Unauthorized` response, the client automatically triggers `clearAuth()` on the auth store to wipe the expired session and immediately redirects the user to `/login`.',
        table: {
          headers: ['Module', 'Endpoints Covered', 'Role in the Platform'],
          rows: [
            ['client.ts', 'Base Axios instance setup', 'Attaches authorization headers, manages request timeouts, and intercepts 401 errors.'],
            ['sources.ts', '/sources/upload, /sources/', 'Orchestrates document source ingestion, metadata updates, and content deletion.'],
            ['chat.ts', '/chat/sessions, /chat/messages', 'Fetches conversation histories and updates notebook chat configurations.'],
            ['source-chat.ts', '/source-chat/sessions', 'Coordinates conversations constrained to a single document context.'],
            ['search.ts', '/search/query, /search/ask, /search/research', 'Handles semantic searches, streaming question answering, and deep research.'],
            ['research-memory.ts', '/research-memory/stats, /research-memory/search, /research-memory/browse', 'Interfaces with PostgreSQL pgvector query audit logs and cache stats.'],
            ['credentials.ts', '/credentials/', 'Manages database CRUD operations for third-party API keys.'],
            ['models.ts', '/models/', 'Queries and synchronizes the list of cloud/local text-generation and embedding models.'],
            ['podcasts.ts', '/podcasts/generate', 'Coordinates speech generation jobs and podcast metadata updates.'],
            ['pipeline.ts', '/pipeline/stages', 'Controls CRM sales pipeline stages and deal state transitions.'],
            ['voice.ts', '/voice/session, /voice/auth', 'Obtains WebRTC session tokens and handles real-time call states.'],
            ['transformations.ts', '/transformations/apply', 'Triggers document conversions using transformation templates.']
          ],
        },
      },
      {
        id: 'comp-citations',
        title: 'Citations & Interactive Code References',
        content: 'The platform implements a robust inline reference citation system and is designing an interactive code citations framework.\n\n' +
                 '### 1. Existing Citation Parsing & Modal Linking\n' +
                 '• Parsing: Inline tags such as `[source:abc123]` or `[note:xyz]` in chat answers and search summaries are parsed by regular expressions (`source-references.tsx`).\n' +
                 '• Markdown link parsing: The helper `convertReferencesToMarkdownLinks` transforms reference tags to markdown hash links: `[source:abc123](#ref-source-abc123)` prior to passing the text to ReactMarkdown.\n' +
                 '• Component Rendering: For plain text citation rendering, the helper `convertSourceReferences` parses the tags and wraps them in custom button components with click event handlers calling `onReferenceClick(type, id)`.\n' +
                 '• ReactMarkdown Interception: Link elements starting with `#ref-` are intercepted. Instead of standard page navigation, their click events are captured to trigger `openModal(type, id)` via the `useModalManager` hook.\n' +
                 '• Modal Launching: `useModalManager` updates the URL search query (e.g. `?modal=source&id=abc123`), prompting the parent shell to display the relevant document source or note.\n\n' +
                 '### 2. Clickable Code Citations Protocol\n' +
                 'To enable interactive code auditing directly from documentation wiki pages, the platform establishes the `code:` protocol:\n' +
                 '• Custom URI Schema:\n' +
                 '  - File links use `code:filePath` (e.g. `code:frontend/src/lib/stores/auth-store.ts`).\n' +
                 '  - Line-specific links append hash offsets: `code:filePath#Lline` (e.g. `code:frontend/src/lib/stores/auth-store.ts#L12`).\n' +
                 '• Citation Component Rendering:\n' +
                 '  The application uses a custom anchor parser `createCodeCitationLinkComponent` passed to `<ReactMarkdown>`. Any links matching the `code:` schema are rendered as custom terminal badges (incorporating a `Terminal` icon and a dark-mode border/background) rather than standard anchor links.\n' +
                 '• URL Query Integration:\n' +
                 '  Clicking a code citation badge updates the active URL query parameters using the `useModalManager` hook: `?modal=code&id=frontend/src/lib/stores/auth-store.ts:12`.\n' +
                 '• Backend Developer Code-Preview Endpoint:\n' +
                 '  A secure read-only router in the FastAPI backend (`/api/developer/code-preview?path={filePath}`) maps paths against the dynamically resolved project root. It prevents directory traversal using path resolution checks (throwing a `403 Forbidden` if the resolved path exits the safe root) and returns raw file contents.\n' +
                 '• Frontend Code Viewer Modal:\n' +
                 '  Renders the file inside a dark-themed syntax highlighter, automatically scrolling to and highlighting the cited line. In local development, an "Open in IDE" button generates a `vscode://file/{absolutePath}:{line}` deep link to launch the file directly in the developer\'s editor.'
      }
    ],
  },
  {
    id: 'developer',
    title: 'Developer Guide',
    icon: Terminal,
    color: 'lime',
    badge: 'DEV',
    description: 'Setup instructions, development workflow, coding standards, and contribution guidelines.',
    subsections: [
      {
        id: 'dev-setup',
        title: 'Development Setup',
        content: 'Prerequisites: Python 3.11+, Node.js 20+, SurrealDB, and optionally Ollama for local models.',
        code: `# 1. Clone and install backend\ngit clone <repository-url>\ncd notebook_tetrel\npip install -e ".[dev]"\n\n# 2. Start SurrealDB\nsurreal start --log info --user root --pass root \\\n  file:data/surreal.db\n\n# 3. Configure environment\ncp .env.example .env\n# Edit .env with your API keys\n\n# 4. Start backend API\nuvicorn api.main:app --reload --port 8502\n\n# 5. Install and start frontend\ncd frontend\nnpm install\nnpm run dev  # Starts at localhost:3000\n\n# 6. (Optional) Start Ollama for local models\nollama serve\nollama pull Llama3.2\nollama pull dengcao/Qwen3-Reranker-4B:Q4_K_M`,
      },
      {
        id: 'dev-structure',
        title: 'Project Structure',
        content: 'The monorepo contains the Python backend and Next.js frontend in a single repository.',
        code: `notebook_tetrel/\n├── api/                    # FastAPI backend\n│   ├── main.py             # App entry, router registration, CORS\n│   ├── models.py           # Pydantic request/response models\n│   └── routers/            # 32 API router modules\n│       ├── sources.py      # Source CRUD and file upload\n│       ├── notebooks.py    # Notebook management\n│       ├── chat.py         # Streaming AI chat\n│       ├── search.py       # Semantic search\n│       ├── customers.py    # CRM customers\n│       ├── assessments.py  # Compliance assessments\n│       ├── models.py       # AI model management\n│       └── ...             # 25 more routers\n├── open_notebook/          # Domain layer\n│   ├── database/\n│   │   ├── repository.py   # SurrealDB abstraction\n│   │   └── migrations/     # 42 migrations (84 files total)\n│   ├── domain/             # Business entities\n│   └── config/             # Application configuration\n├── frontend/               # Next.js frontend\n│   ├── src/\n│   │   ├── app/(dashboard)/ # 32 page routes\n│   │   ├── components/      # 18 component directories\n│   │   ├── lib/\n│   │   │   ├── api/         # 30 API client modules\n│   │   │   ├── hooks/       # 40 custom hooks\n│   │   │   ├── stores/      # Zustand stores\n│   │   │   ├── types/       # TypeScript type definitions\n│   │   │   └── locales/     # i18n translation files\n│   │   └── styles/          # Global CSS\n│   └── public/              # Static assets\n├── scripts/                 # Migration and utility scripts\n├── pyproject.toml           # Python project config\n└── CLAUDE.md                # AI coding guidelines`,
      },
      {
        id: 'dev-standards',
        title: 'Coding Standards',
        content: 'Development guidelines from the project\'s CLAUDE.md and established patterns.',
        items: [
          { label: 'Think Before Coding', description: 'State assumptions explicitly. If multiple interpretations exist, present them. Push back when warranted.' },
          { label: 'Simplicity First', description: 'Minimum code that solves the problem. No speculative features. No abstractions for single-use code. If 200 lines could be 50, rewrite it.' },
          { label: 'Surgical Changes', description: 'Touch only what you must. Don\'t "improve" adjacent code. Match existing style. Remove only YOUR orphaned imports.' },
          { label: 'Goal-Driven Execution', description: 'Define success criteria. Transform tasks into verifiable goals. Loop until verified.' },
          { label: 'TypeScript Strict', description: 'All frontend code must pass `npx tsc --noEmit` with zero errors. Use proper typing, avoid `any` where possible.' },
          { label: 'Component Pattern', description: '\'use client\' directive on all interactive components. Hooks for data fetching, components for rendering. shadcn/ui primitives for consistency.' },
        ],
      },
      {
        id: 'dev-env',
        title: 'Environment Variables',
        content: 'Key environment variables for configuring the application.',
        table: {
          headers: ['Variable', 'Purpose', 'Required'],
          rows: [
            ['OPENROUTER_API_KEY', 'OpenRouter API access for 300+ cloud models', 'Recommended'],
            ['OPENAI_API_KEY', 'Direct OpenAI API access', 'Optional'],
            ['ANTHROPIC_API_KEY', 'Direct Anthropic API access', 'Optional'],
            ['SURREAL_URL', 'SurrealDB connection URL', 'Yes'],
            ['SURREAL_USER', 'SurrealDB username', 'Yes'],
            ['SURREAL_PASS', 'SurrealDB password', 'Yes'],
            ['SURREAL_NS', 'SurrealDB namespace', 'Yes'],
            ['SURREAL_DB', 'SurrealDB database name', 'Yes'],
            ['OLLAMA_BASE_URL', 'Ollama server URL for local models', 'Optional'],
            ['ELEVENLABS_API_KEY', 'ElevenLabs TTS for podcast generation', 'Optional'],
            ['MAPBOX_TOKEN', 'Mapbox for geolocation features', 'Optional'],
          ],
        },
      },
    ],
  },
  {
    id: 'auditor',
    title: 'Auditor Reference',
    icon: Shield,
    color: 'red',
    badge: 'AUDIT',
    description: 'Security architecture, authentication, data flows, and compliance coverage for auditors.',
    subsections: [
      {
        id: 'audit-security',
        title: 'Security Architecture',
        content: 'Security considerations and patterns implemented across the application.',
        items: [
          { label: 'Authentication', description: 'API key-based authentication via request headers. Session management for chat conversations. No user registration — single-tenant deployment model.' },
          { label: 'API Credential Management', description: 'Encrypted storage of third-party API keys (OpenRouter, OpenAI, Anthropic, etc.) in SurrealDB. Keys are never exposed in frontend responses — only key existence is communicated.' },
          { label: 'CORS Configuration', description: 'Configurable CORS origins in FastAPI. Default allows localhost for development. Production deployments should restrict to specific domains.' },
          { label: 'Input Validation', description: 'Pydantic v2 models validate all API request bodies. File upload size limits enforced (10MB default). Content-type validation for uploads.' },
          { label: 'Data Isolation', description: 'Single-tenant architecture — each deployment is an isolated instance. No cross-tenant data access possible. SurrealDB namespace/database isolation.' },
        ],
      },
      {
        id: 'audit-compliance-coverage',
        title: 'Compliance Framework Coverage',
        content: 'The platform supports 50+ compliance frameworks across 16 CISA infrastructure sectors.',
        table: {
          headers: ['Sector', 'Frameworks', 'Count'],
          rows: [
            ['Energy', 'NERC CIP-002 through CIP-014, IEC 62443, NIST 800-82, IEEE 1686, API 1164', '19'],
            ['Defense Industrial Base', 'NIST 800-171/172, CMMC L1-L3, CNSSI 1253', '8'],
            ['Financial Services', 'PCI DSS, SOC 2, SWIFT CSCF, CRI Profile, ISO 27001', '8'],
            ['Water & Wastewater', 'AWWA G430, EPA Water, AWWA M19, NIST 800-82', '6'],
            ['Information Technology', 'NIST CSF, CIS Controls, ISO 27001, SOC 2, CSA CCM', '8'],
            ['Healthcare', 'HIPAA Security, NIST CSF, CIS Controls', '5'],
            ['Transportation', 'TSA Pipeline, TSA Rail, FAA Airport, DO-326A', '8'],
            ['Nuclear', 'NRC RG 5.71, IAEA NSS 17', '5'],
            ['Cross-Sector', 'CISA CPG, NIST CSF, CIS Controls, ISO 27001', '4'],
          ],
        },
      },
      {
        id: 'audit-data-flow',
        title: 'Data Flow Architecture',
        content: 'How data moves through the system from ingestion to analysis.\n\n1. SOURCE INGESTION\n   User uploads document → FastAPI receives file → content-core extracts text → Text chunked into segments → Embedding model generates vectors → Vectors stored in SurrealDB\n\n2. SEARCH PIPELINE\n   User enters query → Query embedded → Cosine similarity search in SurrealDB → Results optionally reranked → AI model generates synthesis → Streaming response to frontend\n\n3. CHAT PIPELINE\n   User sends message → RAG context retrieved from linked sources → Context + message sent to LLM → Streaming response via SSE → Chat history persisted\n\n4. COMPLIANCE PIPELINE\n   Customer assigned sectors → Sectors mapped to frameworks (SECTOR_FRAMEWORK_MAP) → Assessments created per framework → Audit sessions with questions → Answers scored → Gap report generated',
      },
      {
        id: 'audit-api-creds',
        title: 'API Provider Credentials',
        content: 'The platform manages credentials for 30+ third-party service providers.',
        items: [
          { label: 'Language Model Providers', description: 'OpenRouter, OpenAI, Anthropic, Google AI, Groq, Mistral, DeepSeek, Ollama — for AI chat, embedding, and reranking.', badge: 'LLM', badgeColor: 'cyan' },
          { label: 'Voice & Audio', description: 'ElevenLabs — for podcast text-to-speech generation.', badge: 'VOICE', badgeColor: 'violet' },
          { label: 'Geolocation', description: 'Mapbox — for location-based features and mapping.', badge: 'GEO', badgeColor: 'emerald' },
          { label: 'Embedding & Reranking', description: 'Dedicated embedding model providers and cross-encoder reranking services.', badge: 'VECTOR', badgeColor: 'amber' },
        ],
      },
    ],
  },
]

// ─── UTILITY FUNCTIONS ──────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { border: string; bg: string; text: string; glow: string; badge: string }> = {
  cyan: { border: 'border-cyan-500/20', bg: 'bg-cyan-500/5', text: 'text-cyan-400', glow: 'from-cyan-500/30', badge: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' },
  violet: { border: 'border-violet-500/20', bg: 'bg-violet-500/5', text: 'text-violet-400', glow: 'from-violet-500/30', badge: 'bg-violet-500/10 border-violet-500/20 text-violet-400' },
  emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', text: 'text-emerald-400', glow: 'from-emerald-500/30', badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  amber: { border: 'border-amber-500/20', bg: 'bg-amber-500/5', text: 'text-amber-400', glow: 'from-amber-500/30', badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  rose: { border: 'border-rose-500/20', bg: 'bg-rose-500/5', text: 'text-rose-400', glow: 'from-rose-500/30', badge: 'bg-rose-500/10 border-rose-500/20 text-rose-400' },
  sky: { border: 'border-sky-500/20', bg: 'bg-sky-500/5', text: 'text-sky-400', glow: 'from-sky-500/30', badge: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
  lime: { border: 'border-lime-500/20', bg: 'bg-lime-500/5', text: 'text-lime-400', glow: 'from-lime-500/30', badge: 'bg-lime-500/10 border-lime-500/20 text-lime-400' },
  red: { border: 'border-red-500/20', bg: 'bg-red-500/5', text: 'text-red-400', glow: 'from-red-500/30', badge: 'bg-red-500/10 border-red-500/20 text-red-400' },
}

// ─── PAGE COMPONENT ─────────────────────────────────────────────────────────

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<string>('overview')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']))
  const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(new Set())
  const contentRef = useRef<HTMLDivElement>(null)

  // Search filtering
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return DOCUMENTATION
    const q = searchQuery.toLowerCase()
    return DOCUMENTATION.map(section => {
      const sectionMatch = section.title.toLowerCase().includes(q) || section.description.toLowerCase().includes(q)
      const filteredSubs = section.subsections.filter(sub => {
        const subMatch = sub.title.toLowerCase().includes(q) || sub.content.toLowerCase().includes(q)
        const itemMatch = sub.items?.some(i => i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
        const tableMatch = sub.table?.rows.some(r => r.some(c => c.toLowerCase().includes(q)))
        return subMatch || itemMatch || tableMatch
      })
      if (sectionMatch || filteredSubs.length > 0) {
        return { ...section, subsections: filteredSubs.length > 0 ? filteredSubs : section.subsections }
      }
      return null
    }).filter(Boolean) as DocSection[]
  }, [searchQuery])

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    setExpandedSections(prev => new Set([...prev, sectionId]))
    const el = document.getElementById(`doc-${sectionId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  const toggleSubsection = (subId: string) => {
    setExpandedSubsections(prev => {
      const next = new Set(prev)
      if (next.has(subId)) next.delete(subId)
      else next.add(subId)
      return next
    })
  }

  // Stats
  const totalEndpoints = 272
  const totalHooks = 40
  const totalComponents = 18

  return (
    <AppShell>
      <div className="flex-1 flex min-h-0 overflow-hidden bg-background">

        {/* ─── LEFT: Table of Contents ──────────────────────────────── */}
        <aside className="w-72 shrink-0 border-r border-white/5 bg-slate-950/40 backdrop-blur-md overflow-y-auto hidden lg:block">
          <div className="p-4 border-b border-white/5 bg-slate-950/60 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-cyan-400" />
              <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-200">Documentation</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs font-mono text-slate-200 placeholder:text-muted-foreground/40 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {filteredSections.map(section => {
              const colors = COLOR_MAP[section.color]
              const isActive = activeSection === section.id
              const isExpanded = expandedSections.has(section.id)
              return (
                <div key={section.id}>
                  <button
                    onClick={() => { scrollToSection(section.id); toggleSection(section.id) }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all group ${
                      isActive ? `${colors.bg} ${colors.border} border` : 'hover:bg-slate-900/40'
                    }`}
                  >
                    {isExpanded ? (
                      <ChevronDown className={`h-3 w-3 shrink-0 ${isActive ? colors.text : 'text-muted-foreground/40'}`} />
                    ) : (
                      <ChevronRight className={`h-3 w-3 shrink-0 ${isActive ? colors.text : 'text-muted-foreground/40'}`} />
                    )}
                    <section.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? colors.text : 'text-muted-foreground/60 group-hover:text-slate-300'}`} />
                    <span className={`text-[11px] font-mono font-bold truncate ${isActive ? 'text-slate-100' : 'text-muted-foreground group-hover:text-slate-300'}`}>
                      {section.title}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-0.5 border-l border-white/5 pl-3">
                      {section.subsections.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setActiveSection(section.id)
                            const el = document.getElementById(`doc-${sub.id}`)
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }}
                          className="w-full text-left px-2 py-1.5 text-[10px] font-mono text-muted-foreground/70 hover:text-slate-300 hover:bg-slate-900/30 rounded transition-all truncate"
                        >
                          {sub.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Stats footer */}
          <div className="p-4 border-t border-white/5 mt-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-950/40 rounded border border-white/5">
                <p className="text-xs font-bold text-cyan-400 font-mono">{totalEndpoints}</p>
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Endpoints</p>
              </div>
              <div className="p-2 bg-slate-950/40 rounded border border-white/5">
                <p className="text-xs font-bold text-violet-400 font-mono">{totalHooks}</p>
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Hooks</p>
              </div>
              <div className="p-2 bg-slate-950/40 rounded border border-white/5">
                <p className="text-xs font-bold text-emerald-400 font-mono">{totalComponents}</p>
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Modules</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ─── MAIN: Content Area ──────────────────────────────────── */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          {/* Hero Header */}
          <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md border-b border-white/5 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-100">Tetrel Security — Documentation Wiki</h1>
                  <p className="text-[10px] text-muted-foreground font-mono">Open Notebook v1.8.5 • {DOCUMENTATION.length} sections • {DOCUMENTATION.reduce((s, d) => s + d.subsections.length, 0)} articles</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[8px] font-mono border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
                  100% Coverage
                </Badge>
                <Badge variant="outline" className="text-[8px] font-mono border-cyan-500/20 bg-cyan-500/5 text-cyan-400">
                  v1.8.5
                </Badge>
              </div>
            </div>

            {/* Mobile Search */}
            <div className="lg:hidden mt-3 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs font-mono text-slate-200 placeholder:text-muted-foreground/40 focus:outline-none focus:border-cyan-500/40 transition-all"
              />
            </div>
          </div>

          <div className="p-6 max-w-5xl mx-auto space-y-8">

            {/* Section Index Cards (when no search) */}
            {!searchQuery && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {DOCUMENTATION.map((section, idx) => {
                  const colors = COLOR_MAP[section.color]
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`p-3 rounded-xl border ${colors.border} ${colors.bg} text-left group hover:scale-[1.02] transition-all relative overflow-hidden`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${colors.glow} via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity`} />
                      <div className="flex items-center gap-2 mb-1.5">
                        <section.icon className={`h-4 w-4 ${colors.text}`} />
                        <Badge variant="outline" className={`text-[7px] font-mono ${colors.badge}`}>{section.badge}</Badge>
                      </div>
                      <p className="text-[11px] font-bold font-mono text-slate-200 mb-1">{section.title}</p>
                      <p className="text-[9px] text-muted-foreground/70 line-clamp-2 font-sans">{section.description}</p>
                      <p className="text-[8px] text-muted-foreground/50 mt-1.5 font-mono">{section.subsections.length} articles</p>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Rendered Sections */}
            {filteredSections.map(section => {
              const colors = COLOR_MAP[section.color]
              return (
                <div key={section.id} id={`doc-${section.id}`} className="scroll-mt-20">
                  {/* Section Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`h-8 w-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                      <section.icon className={`h-4 w-4 ${colors.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold font-mono uppercase tracking-wider text-slate-100">{section.title}</h2>
                        <Badge variant="outline" className={`text-[7px] font-mono ${colors.badge}`}>{section.badge}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-sans">{section.description}</p>
                    </div>
                  </div>

                  {/* Subsections */}
                  <div className="space-y-4">
                    {section.subsections.map(sub => {
                      const isExpanded = expandedSubsections.has(sub.id)
                      return (
                        <Card key={sub.id} id={`doc-${sub.id}`} className={`shadow-lg border-white/5 bg-slate-900/40 backdrop-blur-md overflow-hidden relative scroll-mt-20`}>
                          <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${colors.glow} via-transparent to-transparent opacity-40`} />
                          <CardHeader
                            className="pb-2 border-b border-white/5 bg-slate-950/20 cursor-pointer select-none"
                            onClick={() => toggleSubsection(sub.id)}
                          >
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                {sub.title}
                              </CardTitle>
                              <div className="flex items-center gap-1.5">
                                {sub.table && <Badge variant="outline" className="text-[7px] border-white/10 bg-slate-900/40 text-muted-foreground/60 font-mono">{sub.table.rows.length} rows</Badge>}
                                {sub.items && <Badge variant="outline" className="text-[7px] border-white/10 bg-slate-900/40 text-muted-foreground/60 font-mono">{sub.items.length} items</Badge>}
                                {sub.code && <Badge variant="outline" className="text-[7px] border-white/10 bg-slate-900/40 text-muted-foreground/60 font-mono">CODE</Badge>}
                              </div>
                            </div>
                          </CardHeader>

                          {(isExpanded || !expandedSubsections.size) && (
                            <CardContent className="p-4 space-y-4 animate-in fade-in duration-200">
                              {/* Content text */}
                              <div className="text-[11px] text-muted-foreground/80 font-sans leading-relaxed whitespace-pre-line">
                                {sub.content}
                              </div>

                              {/* Items list */}
                              {sub.items && (
                                <div className="space-y-2.5">
                                  {sub.items.map((item, i) => (
                                    <div key={i} className={`p-3 border ${colors.border} bg-slate-950/30 rounded-lg relative overflow-hidden group hover:bg-slate-950/50 transition-all`}>
                                      <div className={`absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b ${colors.glow} to-transparent`} />
                                      <div className="pl-2 space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[11px] font-bold text-slate-200 font-mono">{item.label}</span>
                                          {item.badge && (
                                            <Badge variant="outline" className={`text-[7px] font-mono ${COLOR_MAP[item.badgeColor || 'cyan'].badge}`}>
                                              {item.badge}
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground/70 font-sans leading-relaxed">{item.description}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Table */}
                              {sub.table && (
                                <div className="overflow-x-auto rounded-lg border border-white/5">
                                  <table className="w-full text-left border-collapse text-xs font-mono">
                                    <thead>
                                      <tr className="border-b border-white/5 bg-slate-950/40 text-muted-foreground uppercase text-[9px] tracking-wider font-semibold">
                                        {sub.table.headers.map((h, i) => (
                                          <th key={i} className="p-2.5">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-slate-300">
                                      {sub.table.rows.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-800/10 transition-all">
                                          {row.map((cell, j) => (
                                            <td key={j} className={`p-2.5 text-[10px] ${j === 0 ? 'font-bold text-slate-200' : 'text-muted-foreground/80'}`}>
                                              {cell}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Code block */}
                              {sub.code && (
                                <div className="rounded-lg border border-white/5 bg-slate-950/60 overflow-hidden">
                                  <div className="px-3 py-1.5 border-b border-white/5 bg-slate-950/40 flex items-center gap-2">
                                    <Terminal className="h-3 w-3 text-muted-foreground/50" />
                                    <span className="text-[8px] font-mono text-muted-foreground/50 uppercase tracking-widest">Terminal</span>
                                  </div>
                                  <pre className="p-4 text-[10px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
                                    <code>{sub.code}</code>
                                  </pre>
                                </div>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      )
                    })}
                  </div>

                  <Separator className="bg-white/5 mt-8" />
                </div>
              )
            })}

            {/* No Results */}
            {filteredSections.length === 0 && searchQuery && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <Search className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm font-bold font-mono text-muted-foreground uppercase tracking-wider">No matching documentation</p>
                <p className="text-xs text-muted-foreground/60">Try a different search term or browse the sections.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-mono"
                >
                  Clear Search
                </Button>
              </div>
            )}

            {/* Back to top */}
            <div className="flex justify-center py-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-[10px] font-mono text-muted-foreground/50 hover:text-cyan-400 uppercase tracking-wider gap-1.5"
              >
                <ArrowUp className="h-3 w-3" />
                Back to Top
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
