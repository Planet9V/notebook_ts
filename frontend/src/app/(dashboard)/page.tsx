'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  TrendingUp,
  Search,
  Activity,
  Mic,
  ArrowRight,
  Settings,
  Users,
  Clock,
  Sparkles,
  Database,
  ShieldCheck,
  Server,
  Layers,
  ChevronRight,
  CheckCircle2,
  FileText,
  Volume2,
  ArrowUpRight,
  Play,
  ActivitySquare,
} from 'lucide-react'

export default function DashboardPage() {
  // Simulated AI assistant states
  const [aiCommand, setAiCommand] = useState('')
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiResponse, setAiResponse] = useState<string | null>(null)

  const handleRunAiCommand = (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiCommand.trim()) return

    setAiProcessing(true)
    setAiResponse(null)

    setTimeout(() => {
      setAiProcessing(false)
      const cmd = aiCommand.toLowerCase()
      if (cmd.includes('sales') || cmd.includes('pipeline') || cmd.includes('deal')) {
        setAiResponse('Routing request. Pre-populating Q3 pipeline forecast analysis ($240,000) for Acme Security Corp.')
      } else if (cmd.includes('research') || cmd.includes('search') || cmd.includes('notes')) {
        setAiResponse('Searching pgvector compliance indices. Found 4 references to NIST SP 800-82. Initializing notebook draft.')
      } else if (cmd.includes('container') || cmd.includes('sre') || cmd.includes('logs')) {
        setAiResponse('Querying Docker daemon status... SurrealDB: Active (8000), PostgreSQL: Active (5433). average CPU: 14.2%.')
      } else if (cmd.includes('podcast') || cmd.includes('audio') || cmd.includes('marketing')) {
        setAiResponse('Loading voice synthesis queue. 3 segment assets concatenate pipeline loaded.')
      } else {
        setAiResponse('Intent analyzed. Scanning pgvector semantic cache and merged skills registry...')
      }
    }, 1200)
  }

  return (
    <AppShell>
      <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
        <div className="flex-1 p-6 max-w-[1600px] mx-auto w-full space-y-6">
          
          {/* Header */}
          <div className="space-y-1 pb-2 border-b border-white/5">
            <h1 className="text-2xl font-bold font-mono tracking-tight uppercase text-slate-100">
              Universal Control Desk
            </h1>
            <p className="text-xs text-slate-400">
              Unified entry cockpit for Tetrel operations. Click any card or sub-action below to launch its workspace.
            </p>
          </div>

          {/* AI Co-pilot Console */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <form onSubmit={handleRunAiCommand} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={aiCommand}
                  onChange={(e) => setAiCommand(e.target.value)}
                  placeholder="Ask the operations co-pilot... (e.g. 'check container logs', 'forecast deals', 'search NIST SP 800-82')"
                  className="pl-11 bg-slate-950/80 border-white/10 text-xs font-mono h-10 rounded-xl focus-visible:ring-cyan-500"
                />
              </div>
              <Button type="submit" disabled={aiProcessing} className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase h-10 px-4 rounded-xl shrink-0">
                {aiProcessing ? 'Analyzing...' : 'Run Query'}
              </Button>
            </form>

            {aiResponse && (
              <div className="mt-3 p-3 bg-cyan-950/10 border border-cyan-500/20 text-cyan-300 rounded-xl font-mono text-xs flex gap-2 items-start animate-in fade-in duration-300">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
                <div>
                  <span className="font-bold text-cyan-200">System Response:</span> {aiResponse}
                </div>
              </div>
            )}
          </div>

          {/* Main Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* CARD 1: SALES CRM */}
            <div className="group relative rounded-2xl border border-white/10 bg-slate-900/40 p-6 flex flex-col justify-between hover:border-cyan-500/40 hover:shadow-[0_0_25px_rgba(6,182,212,0.12)] transition-all duration-300 min-h-[340px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] active:scale-[0.99] cursor-pointer">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-cyan-500/0 opacity-60" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 font-mono text-[9px] uppercase tracking-wider">Sales CRM</Badge>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Active Pipeline Forecast</span>
                  <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-100">$240,000</div>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> 4 Deals Negotiating
                  </span>
                </div>

                {/* Pipeline Stages Mini Indicator */}
                <div className="flex gap-1 pt-1">
                  <div className="h-1.5 flex-1 bg-cyan-500 rounded-sm opacity-90 transition-all duration-300 group-hover:scale-y-110" title="Qualification: Completed" />
                  <div className="h-1.5 flex-1 bg-cyan-500 rounded-sm opacity-60 animate-pulse" title="Proposal: Active" />
                  <div className="h-1.5 flex-1 bg-slate-800 rounded-sm transition-colors duration-300 group-hover:bg-slate-700" title="Negotiation" />
                  <div className="h-1.5 flex-1 bg-slate-800 rounded-sm" title="Closed Won" />
                </div>

                {/* Subpage Links */}
                <div className="pt-2 space-y-1.5 border-t border-white/5">
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">CRM Workspaces</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Link href="/pipeline" className="text-[10.5px] font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-cyan-500" /> Pipeline
                    </Link>
                    <Link href="/customer-ledger" className="text-[10.5px] font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-cyan-500" /> Ledger
                    </Link>
                    <Link href="/customers" className="text-[10.5px] font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-cyan-500" /> Customers
                    </Link>
                    <Link href="/contacts" className="text-[10.5px] font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-cyan-500" /> Contacts
                    </Link>
                  </div>
                </div>
              </div>

              <Link href="/operations" className="mt-4">
                <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase h-9 tracking-wider flex items-center justify-center gap-1">
                  Open CRM <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {/* CARD 2: RESEARCH HUB */}
            <div className="group relative rounded-2xl border border-white/10 bg-slate-900/40 p-6 flex flex-col justify-between hover:border-sky-500/40 hover:shadow-[0_0_25px_rgba(14,165,233,0.12)] transition-all duration-300 min-h-[340px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] active:scale-[0.99] cursor-pointer">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500 to-sky-500/0 opacity-60" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Search className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-sky-500/20 bg-sky-500/5 text-sky-400 font-mono text-[9px] uppercase tracking-wider">Research Hub</Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Corpus Indexed</span>
                  <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-100">86 Sources</div>
                  <span className="text-[10px] text-sky-400 font-mono flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5" /> 10,225 Vector Nodes
                  </span>
                </div>

                {/* Simulated Recent Ingested Files List */}
                <div className="space-y-1.5 pt-1.5 font-mono text-[9px] text-slate-400 border-t border-white/5">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Recent Sources</span>
                  <div className="space-y-1">
                    <Link href="/sources" className="truncate flex items-center gap-1 hover:text-sky-400 transition-colors">
                      <FileText className="h-3 w-3 text-sky-500 shrink-0" />
                      <span className="truncate text-slate-300">nist_sp_800_82_rev3.pdf</span>
                    </Link>
                    <Link href="/sources" className="truncate flex items-center gap-1 hover:text-sky-400 transition-colors">
                      <FileText className="h-3 w-3 text-sky-500 shrink-0" />
                      <span className="truncate text-slate-300">cset_compliance_questions.sql</span>
                    </Link>
                  </div>
                </div>

                {/* Subpage Links */}
                <div className="pt-2 space-y-1.5 border-t border-white/5">
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Intelligence</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Link href="/search" className="text-[10.5px] font-mono text-slate-400 hover:text-sky-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-sky-500" /> Search
                    </Link>
                    <Link href="/notebooks" className="text-[10.5px] font-mono text-slate-400 hover:text-sky-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-sky-500" /> Notebooks
                    </Link>
                    <Link href="/compliance" className="text-[10.5px] font-mono text-slate-400 hover:text-sky-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-sky-500" /> Audits
                    </Link>
                    <Link href="/research-memory" className="text-[10.5px] font-mono text-slate-400 hover:text-sky-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-sky-500" /> pgvector
                    </Link>
                  </div>
                </div>
              </div>

              <Link href="/search" className="mt-4">
                <Button className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold font-mono text-xs uppercase h-9 tracking-wider flex items-center justify-center gap-1">
                  Deep Dive <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {/* CARD 3: PROJECT DELIVERY */}
            <div className="group relative rounded-2xl border border-white/10 bg-slate-900/40 p-6 flex flex-col justify-between hover:border-emerald-500/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.12)] transition-all duration-300 min-h-[340px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] active:scale-[0.99] cursor-pointer">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-500/0 opacity-60" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Activity className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-mono text-[9px] uppercase tracking-wider">Project Delivery</Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Active Integrations</span>
                  <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-100">6 Projects</div>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> SRE Agents Active
                  </span>
                </div>

                {/* SRE container states */}
                <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Container Health</span>
                  <div className="flex flex-col gap-1 font-mono text-[9px]">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1"><Server className="h-2.5 w-2.5 text-emerald-500" /> SurrealDB v2</span>
                      <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping" /> <strong className="text-emerald-400 text-[8px]">ACTIVE</strong></span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1"><Server className="h-2.5 w-2.5 text-emerald-500" /> PostgreSQL 17</span>
                      <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping" /> <strong className="text-emerald-400 text-[8px]">ACTIVE</strong></span>
                    </div>
                  </div>
                </div>

                {/* Subpage Links */}
                <div className="pt-2 space-y-1.5 border-t border-white/5">
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Deployments</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Link href="/projects" className="text-[10.5px] font-mono text-slate-400 hover:text-emerald-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-emerald-500" /> Projects
                    </Link>
                    <Link href="/operations" className="text-[10.5px] font-mono text-slate-400 hover:text-emerald-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-emerald-500" /> Operations
                    </Link>
                    <Link href="/settings/containers" className="text-[10.5px] font-mono text-slate-400 hover:text-emerald-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-emerald-500" /> Containers
                    </Link>
                    <Link href="/settings" className="text-[10.5px] font-mono text-slate-400 hover:text-emerald-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-emerald-500" /> Config
                    </Link>
                  </div>
                </div>
              </div>

              <Link href="/operations" className="mt-4">
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold font-mono text-xs uppercase h-9 tracking-wider flex items-center justify-center gap-1">
                  Deployments <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {/* CARD 4: CREATIVE STUDIO */}
            <div className="group relative rounded-2xl border border-white/10 bg-slate-900/40 p-6 flex flex-col justify-between hover:border-violet-500/40 hover:shadow-[0_0_25px_rgba(139,92,246,0.12)] transition-all duration-300 min-h-[340px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] active:scale-[0.99] cursor-pointer">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-violet-500/0 opacity-60" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    <Mic className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-violet-500/20 bg-violet-500/5 text-violet-400 font-mono text-[9px] uppercase tracking-wider">Creative Studio</Badge>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Scheduled Queue</span>
                  <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-100">3 Posts Due</div>
                  <span className="text-[10px] text-violet-400 font-mono flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Podcast concatenated
                  </span>
                </div>

                {/* Animated Waveform visualization */}
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Voice Synthesis Engine</span>
                  <div className="flex items-center gap-1 h-6 pt-1">
                    <div className="w-1 bg-violet-500 rounded-full h-2 animate-[pulse_0.8s_infinite_100ms] group-hover:bg-violet-400" />
                    <div className="w-1 bg-violet-500 rounded-full h-4 animate-[pulse_0.8s_infinite_200ms] group-hover:bg-violet-300" />
                    <div className="w-1 bg-violet-400 rounded-full h-3 animate-[pulse_0.8s_infinite_300ms] group-hover:bg-violet-200" />
                    <div className="w-1 bg-violet-500 rounded-full h-5 animate-[pulse_0.8s_infinite_400ms] group-hover:bg-violet-300" />
                    <div className="w-1 bg-violet-500 rounded-full h-2 animate-[pulse_0.8s_infinite_500ms] group-hover:bg-violet-400" />
                  </div>
                </div>

                {/* Subpage Links */}
                <div className="pt-2 space-y-1.5 border-t border-white/5">
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Publications</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Link href="/media" className="text-[10.5px] font-mono text-slate-400 hover:text-violet-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-violet-500" /> Media Hub
                    </Link>
                    <Link href="/podcasts" className="text-[10.5px] font-mono text-slate-400 hover:text-violet-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-violet-500" /> Podcasts
                    </Link>
                    <Link href="/voice-playground" className="text-[10.5px] font-mono text-slate-400 hover:text-violet-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-violet-500" /> Voice Desk
                    </Link>
                    <Link href="/publications" className="text-[10.5px] font-mono text-slate-400 hover:text-violet-400 flex items-center gap-0.5 transition-colors">
                      <ChevronRight className="h-3 w-3 text-violet-500" /> Pub Tracker
                    </Link>
                  </div>
                </div>
              </div>

              <Link href="/media" className="mt-4">
                <Button className="w-full bg-violet-500 hover:bg-violet-600 text-slate-950 font-bold font-mono text-xs uppercase h-9 tracking-wider flex items-center justify-center gap-1">
                  Content Room <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

          </div>

          {/* Bottom Card: System Administration Portal */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-slate-800/80 transition-colors">
            <div className="flex items-center gap-4">
              <div className="rounded-xl p-3 bg-slate-950 border border-white/5 text-slate-400">
                <Settings className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">System Administration & Configurations</h4>
                <p className="text-[10px] text-slate-400">
                  Global controls, Docker containers logs, skill definitions, vector index structures, and system audit logs.
                </p>
              </div>
            </div>

            {/* Quick Admin Actions Grid */}
            <div className="flex-1 max-w-2xl">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
                <Link href="/settings/logs" className="p-2 rounded border border-white/5 bg-slate-950/40 hover:border-cyan-500/20 hover:text-cyan-400 flex items-center justify-between transition-all">
                  <span>Logs Stream</span> <ArrowUpRight className="h-3 w-3 text-slate-600 group-hover:text-cyan-500" />
                </Link>
                <Link href="/settings/api-keys" className="p-2 rounded border border-white/5 bg-slate-950/40 hover:border-cyan-500/20 hover:text-cyan-400 flex items-center justify-between transition-all">
                  <span>API Keys</span> <ArrowUpRight className="h-3 w-3 text-slate-600 group-hover:text-cyan-500" />
                </Link>
                <Link href="/settings/pipeline" className="p-2 rounded border border-white/5 bg-slate-950/40 hover:border-cyan-500/20 hover:text-cyan-400 flex items-center justify-between transition-all">
                  <span>Pipelines</span> <ArrowUpRight className="h-3 w-3 text-slate-600 group-hover:text-cyan-500" />
                </Link>
                <Link href="/settings/styleguides" className="p-2 rounded border border-white/5 bg-slate-950/40 hover:border-cyan-500/20 hover:text-cyan-400 flex items-center justify-between transition-all">
                  <span>Styleguides</span> <ArrowUpRight className="h-3 w-3 text-slate-600 group-hover:text-cyan-500" />
                </Link>
                <Link href="/settings/voice" className="p-2 rounded border border-white/5 bg-slate-950/40 hover:border-cyan-500/20 hover:text-cyan-400 flex items-center justify-between transition-all">
                  <span>Voice System</span> <ArrowUpRight className="h-3 w-3 text-slate-600 group-hover:text-cyan-500" />
                </Link>
                <Link href="/transformations" className="p-2 rounded border border-white/5 bg-slate-950/40 hover:border-cyan-500/20 hover:text-cyan-400 flex items-center justify-between transition-all">
                  <span>Transforms</span> <ArrowUpRight className="h-3 w-3 text-slate-600 group-hover:text-cyan-500" />
                </Link>
                <Link href="/documentation" className="p-2 rounded border border-white/5 bg-slate-950/40 hover:border-cyan-500/20 hover:text-cyan-400 flex items-center justify-between transition-all">
                  <span>Docs Wiki</span> <ArrowUpRight className="h-3 w-3 text-slate-600 group-hover:text-cyan-500" />
                </Link>
                <Link href="/advanced" className="p-2 rounded border border-white/5 bg-slate-950/40 hover:border-cyan-500/20 hover:text-cyan-400 flex items-center justify-between transition-all">
                  <span>Advanced</span> <ArrowUpRight className="h-3 w-3 text-slate-600 group-hover:text-cyan-500" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  )
}