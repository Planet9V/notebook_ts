'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Users,
  Shield,
  Wrench,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  ArrowUp,
  FileText,
  Database,
  Cpu,
  Globe,
  Terminal,
  Palette,
  Zap,
  Lock,
  BarChart3,
  Workflow,
  MessageSquare,
  Mic,
  FolderKanban,
  ShieldCheck,
  Bot,
  Shuffle,
  Telescope,
  LayoutDashboard,
  Hash,
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
    id: 'architecture',
    title: 'Architecture & Tech Stack',
    icon: Layers,
    color: 'violet',
    badge: 'ARCH',
    description: 'System architecture, technology choices, and infrastructure components.',
    subsections: [
      {
        id: 'arch-overview',
        title: 'System Architecture',
        content: 'The application follows a classic 3-tier architecture: a Next.js 16 frontend communicating via REST API with a FastAPI backend, backed by SurrealDB for persistence and multiple LLM providers for AI capabilities.\n\n┌─────────────────────────────────────────────────┐\n│                   FRONTEND                       │\n│  Next.js 16 · React 19 · TypeScript · Tailwind 4 │\n│  shadcn/ui · Zustand · React Query · i18next     │\n├─────────────────────────────────────────────────┤\n│                REST API (axios)                  │\n├─────────────────────────────────────────────────┤\n│                   BACKEND                        │\n│  FastAPI · Python 3.11 · Pydantic v2 · Uvicorn   │\n│  LangChain · LangGraph · Esperanto · AI-Prompter │\n├─────────────────────────────────────────────────┤\n│              DATA & AI LAYER                     │\n│  SurrealDB · OpenRouter · Ollama · Multi-LLM     │\n│  Vector Embeddings · Reranking · TTS             │\n└─────────────────────────────────────────────────┘',
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
        title: 'Database Architecture',
        content: 'SurrealDB serves as the primary data store, combining document, graph, and vector capabilities in a single database.\n\nKey characteristics:\n• Multi-model: Documents, graphs, and vectors in one DB\n• 19+ migration files tracking schema evolution\n• Repository pattern abstraction (repository.py)\n• Supports relations between entities (customer → notebooks, source → notes)\n• Vector storage for embeddings with cosine similarity search\n• Full-text search capabilities\n\nPrimary entity types: Source, Note, Notebook, Customer, Contact, Assessment, Session, Question, Answer, Credential, Pipeline, Podcast, Episode, Transformation, Styleguide, ResearchItem, Project, ScheduledSearch',
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
            ['Intelligence', 'Notebooks', '/notebooks', 'Multi-document workspaces'],
            ['Intelligence', 'Compliance Hub', '/compliance', 'CSET compliance dashboard'],
            ['Create', 'Podcasts', '/podcasts', 'AI-generated podcast management'],
            ['Manage', 'Models', '/settings/api-keys', 'API keys and model configuration'],
            ['Manage', 'Transformations', '/transformations', 'Content transformation templates'],
            ['Manage', 'Style Guides', '/settings/styleguides', 'Document style guide management'],
            ['Manage', 'Documentation', '/documentation', 'This documentation wiki'],
            ['Manage', 'Settings', '/settings', 'Application settings and pipeline config'],
            ['Manage', 'Advanced', '/advanced', 'Developer tools and diagnostics'],
          ],
        },
      },
      {
        id: 'sitemap-routes',
        title: 'Complete Route Tree',
        content: 'All application routes organized by domain area. The app uses Next.js App Router with a (dashboard) layout group.',
        table: {
          headers: ['Route', 'Page', 'Description'],
          rows: [
            ['/', 'Home', 'Redirects to default page'],
            ['/sources', 'Sources', 'Document source listing, upload, and management'],
            ['/operations', 'Operations Hub', 'Business analytics dashboard with charts and KPIs'],
            ['/customer-ledger', 'Customer Ledger', 'CRM customer listing with search, filter, sort'],
            ['/customers/[id]', 'Customer Dossier', '6-tab customer view: Profile, Contacts, Projects, Threats, Compliance, Sector Reference'],
            ['/contacts', 'Contacts Directory', 'Global contact listing across all customers'],
            ['/research', 'Research Intelligence', 'Research item management with priority and status tracking'],
            ['/projects', 'Project Delivery', 'Project tracking with milestones and deliverables'],
            ['/search', 'Ask & Search', 'Semantic search with streaming AI responses'],
            ['/notebooks', 'Notebooks', 'Multi-document workspace with AI chat panel'],
            ['/notebooks?id=X', 'Notebook Detail', 'Specific notebook with sources, notes, and chat'],
            ['/compliance', 'Compliance Hub', 'CSET compliance overview and assessment dashboard'],
            ['/podcasts', 'Podcasts', 'Podcast episode listing with player and generation'],
            ['/transformations', 'Transformations', 'Template-based content transformation with preview'],
            ['/pipeline', 'Sales Pipeline', 'Kanban board with 7 deal stages'],
            ['/settings', 'Settings', 'General application settings'],
            ['/settings/api-keys', 'Model Providers', 'API key management and default model assignments'],
            ['/settings/pipeline', 'Pipeline Settings', 'Automation rules for pipeline stages'],
            ['/settings/styleguides', 'Style Guides', 'Document style guide CRUD'],
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
            ['GET', '/api/search/history', 'Get search history'],
            ['POST', '/api/scheduled-search', 'Create scheduled/recurring search'],
            ['GET', '/api/scheduled-search', 'List scheduled searches'],
            ['DELETE', '/api/scheduled-search/{id}', 'Delete scheduled search'],
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
        title: 'Ask & Search',
        content: 'Semantic search powered by vector embeddings with AI-enhanced question answering.',
        items: [
          { label: 'Semantic Search', description: 'Vector-based search across all sources. Embedding similarity with cosine distance. Results ranked by relevance with source citations.' },
          { label: 'AI Question Answering', description: 'Ask natural language questions. Streaming AI responses synthesized from multiple sources. Advanced model selection with OpenRouter integration.' },
          { label: 'Reranking', description: 'Cross-encoder reranking for improved result quality. Supports Cohere rerank-4-pro, local Qwen3-Reranker via Ollama.' },
          { label: 'Search History', description: 'Persistent search history with timestamps. Re-run previous searches.' },
          { label: 'Scheduled Search', description: 'Create recurring searches that run on a schedule. Automated monitoring for new relevant content.' },
        ],
      },
      {
        id: 'feat-crm',
        title: 'CRM & Pipeline',
        content: 'Enterprise customer relationship management with sales pipeline tracking.',
        items: [
          { label: 'Customer Management', description: '30+ field customer profiles. Primary sector, CISA infrastructure sectors, compliance frameworks, corporate description, industry classification, customer type (prospect/client/partner/vendor), tier (enterprise/mid-market/SMB).' },
          { label: 'Customer Dossier', description: '6-tab deep-dive: Profile Stakeholders, Contacts, Associated Projects, Threat Canvas (network graph), Compliance Wizard, Sector Reference Guidelines.' },
          { label: 'Pipeline Kanban', description: '7-stage deal pipeline: Lead → Qualified → Proposal → Negotiation → Closed Won → Closed Lost → On Hold. Drag-and-drop deal movement. Deal value tracking.' },
          { label: 'Contact Management', description: 'Multi-contact per customer. Role-based contacts (C-suite, Manager, Technical, Legal). Email and phone tracking.' },
          { label: 'Import/Export', description: 'Bulk CSV/XLSX import with column mapping wizard. Preview with validation. Export to CSV/XLSX.' },
        ],
      },
      {
        id: 'feat-compliance',
        title: 'CSET Compliance Auditing',
        content: 'Full CISA Cybersecurity Evaluation Tool (CSET) implementation for regulatory compliance assessment.',
        items: [
          { label: 'Sector Mapping', description: '16 CISA infrastructure sectors with automatic framework recommendation. SECTOR_FRAMEWORK_MAP links sectors to relevant compliance standards. Color-coded sector visualization.' },
          { label: '50+ Compliance Frameworks', description: 'NERC CIP (14 standards), IEC 62443, NIST SP 800 series, CMMC, ISO 27001, PCI DSS, HIPAA, SOC 2, and more. Framework definitions with full metadata.' },
          { label: 'Assessment Wizard', description: 'Question-by-question auditing interface. YES/NO/N\\/A/ALT answer options. Purdue level classification. Evidence attachment and comments.' },
          { label: 'Milestone Tracking', description: 'Multiple audit sessions per assessment. Carry-forward answers between sessions. Session status tracking (Active → Completed).' },
          { label: 'Gap Analysis Reports', description: 'Automated compliance scoring. Category coverage index. Radar spider visualization. Prioritized remediation roadmap. Trend analysis across sessions.' },
          { label: 'Dynamic Sector Reference', description: 'Sector-specific guidelines and directives. Auto-generated from mapped CISA sectors. Framework pills showing assignment status.' },
        ],
      },
      {
        id: 'feat-podcasts',
        title: 'Podcast Generation',
        content: 'AI-powered podcast creation from document sources.',
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
        title: 'Custom Hooks (32)',
        content: 'Custom React hooks organized by domain, providing data fetching, state management, and UI utilities.',
        table: {
          headers: ['Hook', 'Purpose'],
          rows: [
            ['useModels', 'Fetch OpenRouter + Ollama models with caching and filtering'],
            ['useCredentials', 'Manage API provider credentials (CRUD)'],
            ['useCustomers', 'Customer CRUD operations with React Query'],
            ['useContacts', 'Contact management per customer'],
            ['usePipeline', 'Pipeline deal management and stage transitions'],
            ['useNotebooks', 'Notebook CRUD and source linking'],
            ['useNotes', 'Note CRUD within notebooks'],
            ['useSources', 'Source management, upload, and processing'],
            ['useNotebookChat', 'Streaming notebook chat with LangGraph'],
            ['useSourceChat', 'Streaming source-level AI chat'],
            ['useAsk', 'Search query execution with streaming AI answers'],
            ['useSearch', 'Search utilities and history management'],
            ['usePodcasts', 'Podcast and episode management'],
            ['useTransformations', 'Transformation template CRUD and execution'],
            ['useProjects', 'Project management operations'],
            ['useResearchItems', 'Research item tracking and prioritization'],
            ['useScheduledSearch', 'Scheduled search CRUD'],
            ['useImport', 'Bulk import wizard state machine'],
            ['useStyleguides', 'Style guide management'],
            ['useSettings', 'Application settings read/write'],
            ['useAuth', 'Authentication state and logout'],
            ['useInsights', 'Source insight generation'],
            ['useCreateDialogs', 'Dialog state for create actions'],
            ['useModalManager', 'Global modal state coordination'],
            ['useNavigation', 'Programmatic navigation helpers'],
            ['useMediaQuery', 'Responsive breakpoint detection'],
            ['useToast', 'Toast notification helpers'],
            ['useTranslation', 'i18n translation access'],
            ['useVersionCheck', 'Application version polling'],
            ['useDebounce (lib)', 'Input debouncing utility'],
          ],
        },
      },
      {
        id: 'comp-stores',
        title: 'State Management (Zustand)',
        content: 'Lightweight global state management using Zustand stores.',
        items: [
          { label: 'sidebar-store', description: 'Controls sidebar collapsed/expanded state. Persisted across sessions.' },
          { label: 'TanStack Query', description: 'Server state management for all API data. Automatic caching, refetching, and invalidation. Query client configured with sensible defaults.' },
          { label: 'React Context (minimal)', description: 'ModalProvider for global modal coordination. QueryProvider for React Query client. I18n provider for translations.' },
        ],
      },
      {
        id: 'comp-api-clients',
        title: 'API Client Modules (23)',
        content: 'Type-safe API client modules organized by domain. All use the central Axios client with base URL configuration and error interceptors.',
        table: {
          headers: ['Module', 'Endpoints Covered'],
          rows: [
            ['client.ts', 'Base Axios instance, interceptors, auth headers'],
            ['sources.ts', 'Source CRUD, upload, reprocessing'],
            ['notebooks.ts', 'Notebook CRUD, source linking'],
            ['notes.ts', 'Note CRUD'],
            ['chat.ts', 'Notebook chat streaming'],
            ['source-chat.ts', 'Source-level chat streaming'],
            ['search.ts', 'Search query, history, ask'],
            ['customers.ts', 'Customer CRUD, import/export'],
            ['contacts.ts', 'Contact CRUD'],
            ['pipeline.ts', 'Pipeline stage management'],
            ['models.ts', 'Model catalog, OpenRouter sync'],
            ['credentials.ts', 'Provider API key management'],
            ['podcasts.ts', 'Podcast and episode management'],
            ['embedding.ts', 'Embedding status and rebuild'],
            ['transformations.ts', 'Template CRUD and execution'],
            ['settings.ts', 'Application settings'],
            ['projects.ts', 'Project management'],
            ['research-items.ts', 'Research item tracking'],
            ['scheduled-search.ts', 'Scheduled search management'],
            ['styleguides.ts', 'Style guide CRUD'],
            ['insights.ts', 'Source insight generation'],
            ['query-client.ts', 'React Query client configuration'],
          ],
        },
      },
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
        code: `# 1. Clone and install backend
git clone <repository-url>
cd notebook_tetrel
pip install -e ".[dev]"

# 2. Start SurrealDB
surreal start --log info --user root --pass root \\
  file:data/surreal.db

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 4. Start backend API
uvicorn api.main:app --reload --port 8502

# 5. Install and start frontend
cd frontend
npm install
npm run dev  # Starts at localhost:3000

# 6. (Optional) Start Ollama for local models
ollama serve
ollama pull llama3.2
ollama pull dengcao/Qwen3-Reranker-4B:Q4_K_M`,
      },
      {
        id: 'dev-structure',
        title: 'Project Structure',
        content: 'The monorepo contains the Python backend and Next.js frontend in a single repository.',
        code: `notebook_tetrel/
├── api/                    # FastAPI backend
│   ├── main.py             # App entry, router registration, CORS
│   ├── models.py           # Pydantic request/response models
│   └── routers/            # 32 API router modules
│       ├── sources.py      # Source CRUD and file upload
│       ├── notebooks.py    # Notebook management
│       ├── chat.py         # Streaming AI chat
│       ├── search.py       # Semantic search
│       ├── customers.py    # CRM customers
│       ├── assessments.py  # Compliance assessments
│       ├── models.py       # AI model management
│       └── ...             # 25 more routers
├── open_notebook/          # Domain layer
│   ├── database/
│   │   ├── repository.py   # SurrealDB abstraction
│   │   └── migrations/     # 19+ schema migrations
│   ├── domain/             # Business entities
│   └── config/             # Application configuration
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/(dashboard)/ # 15+ page routes
│   │   ├── components/      # 18 component directories
│   │   ├── lib/
│   │   │   ├── api/         # 23 API client modules
│   │   │   ├── hooks/       # 32 custom hooks
│   │   │   ├── stores/      # Zustand stores
│   │   │   ├── types/       # TypeScript type definitions
│   │   │   └── locales/     # i18n translation files
│   │   └── styles/          # Global CSS
│   └── public/              # Static assets
├── scripts/                 # Migration and utility scripts
├── pyproject.toml           # Python project config
└── CLAUDE.md                # AI coding guidelines`,
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
  const totalEndpoints = DOCUMENTATION.find(s => s.id === 'api')?.subsections.reduce((sum, sub) => sum + (sub.table?.rows.length || 0), 0) || 0
  const totalHooks = 32
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
