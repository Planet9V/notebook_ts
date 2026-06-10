'use client'

import React, { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
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
  Plus,
  Play,
  RotateCcw,
  Maximize2,
  ListFilter,
  Volume2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Move,
} from 'lucide-react'

// Define the 4 mockup types
type MockupType = 'gateway' | 'perspective' | 'customizable' | 'topological'

export default function MockupsPage() {
  const [activeMockup, setActiveMockup] = useState<MockupType>('gateway')

  // State for Mockup 2 (Perspective Selector)
  const [perspective, setPerspective] = useState<'sales' | 'research' | 'delivery' | 'marketing'>('sales')

  // State for Mockup 3 (Customizable Bento)
  const [layout, setLayout] = useState<string[]>([
    'analytics',
    'quick-ai',
    'status-live',
    'data-stream',
    'focus-doc',
  ])
  const [isEditing, setIsEditing] = useState(false)

  // State for Mockup 4 (Topological Graph Node Selection)
  const [selectedNode, setSelectedNode] = useState<{
    id: string
    label: string
    type: string
    status: string
    details: string
    metrics?: string
  } | null>({
    id: 'node-cust-1',
    label: 'Acme Security Corp',
    type: 'Customer',
    status: 'Active',
    details: 'B2B Client in Critical Infrastructure Sector. Standard framework: NIST CSF v2.',
    metrics: 'Active Projects: 2 | Pipeline Value: $145,000 | Compliance Score: 87.2%'
  })

  // Simulated AI Command State
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
        setAiResponse('Routing you to the Sales CRM. Pre-populating pipeline forecast analysis: $240,000 expected in Q3.')
        if (activeMockup === 'perspective') setPerspective('sales')
      } else if (cmd.includes('research') || cmd.includes('search') || cmd.includes('notes')) {
        setAiResponse('Searching compliance repository. Found 4 references regarding NIST SP 800-82. Synthesizing briefing doc.')
        if (activeMockup === 'perspective') setPerspective('research')
      } else if (cmd.includes('container') || cmd.includes('sre') || cmd.includes('logs')) {
        setAiResponse('Querying Docker API. All 6 microservices running stably. Average container CPU load: 14.2%.')
        if (activeMockup === 'perspective') setPerspective('delivery')
      } else if (cmd.includes('podcast') || cmd.includes('audio') || cmd.includes('marketing')) {
        setAiResponse('Preparing podcast generation layout. Elevating segment intro/outro audio concatenate pipeline.')
        if (activeMockup === 'perspective') setPerspective('marketing')
      } else {
        setAiResponse('Intent analyzed. Fetching context across pgvector database and Merged Skills index...')
      }
    }, 1200)
  }

  // Helper to reorder layout (simulating drag and drop)
  const moveCard = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= layout.length) return
    const updated = [...layout]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setLayout(updated)
  }

  return (
    <AppShell>
      <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
        {/* Mockup Toolbar */}
      <div className="border-b border-white/10 bg-slate-900/60 p-4 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              <h1 className="text-lg font-bold font-mono tracking-wider uppercase">
                Bento Layout prototypes
              </h1>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Compare visual architectures for the single-user universal dashboard gateway
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mr-1">Select View:</span>
            <Button
              variant={activeMockup === 'gateway' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveMockup('gateway')
                setAiResponse(null)
              }}
              className="font-mono text-xs h-8 uppercase"
            >
              1. Gateway
            </Button>
            <Button
              variant={activeMockup === 'perspective' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveMockup('perspective')
                setAiResponse(null)
              }}
              className="font-mono text-xs h-8 uppercase"
            >
              2. Perspective
            </Button>
            <Button
              variant={activeMockup === 'customizable' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveMockup('customizable')
                setAiResponse(null)
              }}
              className="font-mono text-xs h-8 uppercase"
            >
              3. Customizable
            </Button>
            <Button
              variant={activeMockup === 'topological' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveMockup('topological')
                setAiResponse(null)
              }}
              className="font-mono text-xs h-8 uppercase"
            >
              4. Topological
            </Button>
          </div>
        </div>
      </div>

      {/* Mockup Work Area */}
      <div className="flex-1 p-6 max-w-[1600px] mx-auto w-full space-y-6">
        
        {/* Simulated AI Assistant Bar */}
        <div className="tetrel-glass p-4 rounded-2xl border border-white/10 bg-slate-900/30">
          <form onSubmit={handleRunAiCommand} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={aiCommand}
                onChange={(e) => setAiCommand(e.target.value)}
                placeholder="Ask the built-in AI assistant... (e.g. 'show container logs', 'review sales forecast', 'search NIST standard')"
                className="pl-11 bg-slate-950/80 border-white/10 text-xs font-mono h-10 rounded-xl"
              />
            </div>
            <Button type="submit" disabled={aiProcessing} className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase h-10 px-4 rounded-xl shrink-0">
              {aiProcessing ? 'Processing...' : 'Run Query'}
            </Button>
          </form>

          {aiResponse && (
            <div className="mt-3 p-3 bg-cyan-950/20 border border-cyan-500/20 text-cyan-300 rounded-xl font-mono text-xs flex gap-2 items-start animate-in fade-in duration-300">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
              <div>
                <span className="font-bold text-cyan-200">AI Co-pilot:</span> {aiResponse}
              </div>
            </div>
          )}
        </div>

        {/* ==================== MOCKUP 1: THE BENTO GATEWAY ==================== */}
        {activeMockup === 'gateway' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-mono uppercase tracking-tight text-slate-200">1. Universal Bento Gateway (Conservative)</h2>
              <p className="text-xs text-muted-foreground">Four visual bento entry cards presenting key live stats, plus direct gateway buttons. Zero layout complexity, optimized for immediate start.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Sales CRM Card */}
              <div className="group relative rounded-2xl border border-white/10 bg-slate-900/40 p-6 flex flex-col justify-between hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300 min-h-[300px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-cyan-500/0 opacity-60" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 font-mono text-[9px] uppercase tracking-wider">Sales CRM</Badge>
                  </div>
                  <div className="space-y-1 pt-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Active Forecast</span>
                    <div className="text-2xl font-bold font-mono tracking-tight text-slate-100">$240,000</div>
                    <span className="text-[9.5px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> 4 Deals in Negotiation
                    </span>
                  </div>
                  {/* Mini pipeline stages visualization */}
                  <div className="flex gap-1 pt-2">
                    <div className="h-1.5 flex-1 bg-cyan-500 rounded-sm opacity-90" title="Qualification: Done" />
                    <div className="h-1.5 flex-1 bg-cyan-500 rounded-sm opacity-60 animate-pulse" title="Proposal: Active" />
                    <div className="h-1.5 flex-1 bg-slate-800 rounded-sm" title="Negotiation" />
                    <div className="h-1.5 flex-1 bg-slate-800 rounded-sm" title="Closed" />
                  </div>
                </div>
                <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase h-9 tracking-wider mt-4">
                  Open CRM <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>

              {/* Deep Research Card */}
              <div className="group relative rounded-2xl border border-white/10 bg-slate-900/40 p-6 flex flex-col justify-between hover:border-sky-500/30 hover:shadow-[0_0_20px_rgba(14,165,233,0.15)] transition-all duration-300 min-h-[300px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500 to-sky-500/0 opacity-60" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Search className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="border-sky-500/20 bg-sky-500/5 text-sky-400 font-mono text-[9px] uppercase tracking-wider">Research Hub</Badge>
                  </div>
                  <div className="space-y-1 pt-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Corpus Database</span>
                    <div className="text-2xl font-bold font-mono tracking-tight text-slate-100">86 Sources</div>
                    <span className="text-[9.5px] text-sky-400 font-mono flex items-center gap-1">
                      <Database className="h-3 w-3" /> 10,225 nodes parsed
                    </span>
                  </div>
                  {/* Recent ingested sources */}
                  <div className="space-y-1 pt-2 font-mono text-[8px] text-muted-foreground border-t border-white/5">
                    <div className="truncate flex items-center gap-1">📄 <span className="text-slate-300 truncate">nist_sp_800_82_rev3.pdf</span></div>
                    <div className="truncate flex items-center gap-1">📄 <span className="text-slate-300 truncate">cset_questions.sql</span></div>
                  </div>
                </div>
                <Button className="w-full bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold font-mono text-xs uppercase h-9 tracking-wider mt-4">
                  Deep Dive <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>

              {/* Project Delivery Card */}
              <div className="group relative rounded-2xl border border-white/10 bg-slate-900/40 p-6 flex flex-col justify-between hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300 min-h-[300px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-500/0 opacity-60" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Activity className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-mono text-[9px] uppercase tracking-wider">Project Delivery</Badge>
                  </div>
                  <div className="space-y-1 pt-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Active Projects</span>
                    <div className="text-2xl font-bold font-mono tracking-tight text-slate-100">6 Projects</div>
                    <span className="text-[9.5px] text-emerald-400 font-mono flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> SRE Agents Active (Healthy)
                    </span>
                  </div>
                  {/* Milestones status */}
                  <div className="space-y-1 pt-2 font-mono text-[8px] text-muted-foreground border-t border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="truncate max-w-[120px]">Acme SCADA</span>
                      <span className="text-emerald-400">70%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="truncate max-w-[120px]">Threat Assessment</span>
                      <span className="text-emerald-400">40%</span>
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold font-mono text-xs uppercase h-9 tracking-wider mt-4">
                  Deployments <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>

              {/* Creative Media Card */}
              <div className="group relative rounded-2xl border border-white/10 bg-slate-900/40 p-6 flex flex-col justify-between hover:border-violet-500/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300 min-h-[300px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-violet-500/0 opacity-60" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      <Mic className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="border-violet-500/20 bg-violet-500/5 text-violet-400 font-mono text-[9px] uppercase tracking-wider">Creative Studio</Badge>
                  </div>
                  <div className="space-y-1 pt-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Pending Release</span>
                    <div className="text-2xl font-bold font-mono tracking-tight text-slate-100">3 Posts Due</div>
                    <span className="text-[9.5px] text-violet-400 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Podcast Episode queued
                    </span>
                  </div>
                  {/* Animating Waveform representation */}
                  <div className="flex items-center justify-center gap-1 h-5 pt-1">
                    <div className="w-1 bg-violet-500 rounded-full h-2 animate-[pulse_0.8s_infinite_100ms]" />
                    <div className="w-1 bg-violet-500 rounded-full h-4 animate-[pulse_0.8s_infinite_200ms]" />
                    <div className="w-1 bg-violet-400 rounded-full h-3 animate-[pulse_0.8s_infinite_300ms]" />
                    <div className="w-1 bg-violet-500 rounded-full h-5 animate-[pulse_0.8s_infinite_400ms]" />
                    <div className="w-1 bg-violet-500 rounded-full h-2 animate-[pulse_0.8s_infinite_500ms]" />
                  </div>
                </div>
                <Button className="w-full bg-violet-500 hover:bg-violet-600 text-slate-950 font-bold font-mono text-xs uppercase h-9 tracking-wider mt-4">
                  Content Room <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>

            </div>

            {/* Smaller Bottom Admin Card */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-4 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2 bg-slate-800 border border-white/5 text-slate-300">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider">System Administration Panel</h4>
                  <p className="text-[10px] text-muted-foreground">Observe containers, audit logs, vector index rebuilds, and skill configurations</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-8 border-white/10 hover:bg-slate-800 text-[10px] font-mono uppercase">
                Launch Panel
              </Button>
            </div>
          </div>
        )}

        {/* ==================== MOCKUP 2: THE PERSPECTIVE DASHBOARD ==================== */}
        {activeMockup === 'perspective' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-mono uppercase tracking-tight text-slate-200">2. Perspective Selector Dashboard (Moderate)</h2>
              <p className="text-xs text-muted-foreground">Select an active perspective context. The dashboard bento widgets and general settings transform to match the selected focus.</p>
            </div>

            {/* Perspective Controller */}
            <div className="flex flex-col gap-2 p-1.5 bg-slate-900/60 border border-white/10 rounded-2xl max-w-xl">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground px-3 pt-1">Active Mindset Switch:</span>
              <div className="grid grid-cols-4 gap-1">
                {(['sales', 'research', 'delivery', 'marketing'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={perspective === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPerspective(mode)}
                    className="font-mono text-[10px] uppercase h-8 rounded-xl"
                  >
                    {mode === 'sales' && 'Sales CRM'}
                    {mode === 'research' && 'Research'}
                    {mode === 'delivery' && 'Delivery'}
                    {mode === 'marketing' && 'Marketing'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Dynamically Populated Bento Widgets Grid */}
              <div className="lg:col-span-3 space-y-6">
                {perspective === 'sales' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono uppercase text-cyan-400">Deal Pipeline Forecast</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-3xl font-extrabold font-mono text-slate-100">$240,000</div>
                        <div className="space-y-2 font-mono text-[10px]">
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span>Proposal Stage:</span> <span className="text-cyan-400 font-bold">$120,000</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span>Negotiation Stage:</span> <span className="text-cyan-400 font-bold">$80,000</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span>Qualification Stage:</span> <span className="text-slate-400 font-bold">$40,000</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono uppercase text-cyan-400">Recent Customer Activity</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-[11px] font-mono">
                        <div className="p-2 bg-slate-950/40 rounded border border-white/5 flex justify-between items-center">
                          <span>Acme Security Corp</span>
                          <Badge className="bg-cyan-500 text-slate-950 text-[8px] font-bold">CLIENT</Badge>
                        </div>
                        <div className="p-2 bg-slate-950/40 rounded border border-white/5 flex justify-between items-center">
                          <span>Apex Networks</span>
                          <Badge className="bg-cyan-500/20 text-cyan-400 text-[8px] border border-cyan-500/30">PROSPECT</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {perspective === 'research' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono uppercase text-sky-400">Knowledge Base Stats</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 font-mono text-[10px]">
                        <div className="text-3xl font-extrabold text-slate-100">86 Files Ingested</div>
                        <div className="flex justify-between">
                          <span>PDF Documents:</span> <span className="font-bold text-slate-200">42</span>
                        </div>
                        <div className="flex justify-between">
                          <span>HTML/URLs:</span> <span className="font-bold text-slate-200">28</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Plain Text/Memos:</span> <span className="font-bold text-slate-200">16</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono uppercase text-sky-400">Recurring Queries</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-[11px] font-mono">
                        <div className="p-2 bg-slate-950/40 rounded border border-white/5 flex justify-between items-center">
                          <span>NIST Compliance updates</span>
                          <Badge variant="outline" className="border-sky-500/30 text-sky-400 text-[8px]">DAILY</Badge>
                        </div>
                        <div className="p-2 bg-slate-950/40 rounded border border-white/5 flex justify-between items-center">
                          <span>Competitor analysis scan</span>
                          <Badge variant="outline" className="border-slate-700 text-slate-400 text-[8px]">WEEKLY</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {perspective === 'delivery' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono uppercase text-emerald-400">SRE Container Telemetry</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 font-mono text-[10px]">
                        <div className="flex items-center justify-between p-2 bg-slate-950/40 rounded border border-white/5">
                          <span className="flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-emerald-400" /> SurrealDB v2</span>
                          <Badge className="bg-emerald-500/20 text-emerald-400 text-[8px]">HEALTHY</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-950/40 rounded border border-white/5">
                          <span className="flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-emerald-400" /> PostgreSQL 17</span>
                          <Badge className="bg-emerald-500/20 text-emerald-400 text-[8px]">HEALTHY</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono uppercase text-emerald-400">Delivery Milestones</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 font-mono text-[10px]">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Acme Security Integration</span> <span>70%</span>
                          </div>
                          <Progress value={70} className="h-1.5 bg-slate-950" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>SCADA Threat Assessment</span> <span>40%</span>
                          </div>
                          <Progress value={40} className="h-1.5 bg-slate-950" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {perspective === 'marketing' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono uppercase text-violet-400">Scheduled Social Media</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 font-mono text-[10px]">
                        <div className="p-2 bg-slate-950/40 rounded border border-white/5 flex justify-between items-center">
                          <span>Draft: Threat report analysis podcast release</span>
                          <Badge className="bg-amber-500/20 text-amber-400 text-[8px] border border-amber-500/30">DRAFT</Badge>
                        </div>
                        <div className="p-2 bg-slate-950/40 rounded border border-white/5 flex justify-between items-center">
                          <span>LinkedIn post on NIST CSF v2 changes</span>
                          <Badge className="bg-cyan-500/20 text-cyan-400 text-[8px] border border-cyan-500/30">QUEUED</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-mono uppercase text-violet-400">Voice Synthesis Engine</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 font-mono text-[10px]">
                        <div className="flex justify-between items-center">
                          <span>Local Engine (Kokoro CPU):</span>
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[8px]">ACTIVE</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Whisper STT Server:</span>
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[8px]">ONLINE</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Dynamically Tailed Logs Stream (High Fidelity Admin integration) */}
                <div className="mt-6 p-4 rounded-xl border border-white/5 bg-slate-950/80 font-mono text-[10px] space-y-2 shadow-inner">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-cyan-400 animate-pulse" /> Telemetry Stream (Persona: {perspective.toUpperCase()})
                    </span>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[8px] uppercase animate-pulse">Live</Badge>
                  </div>
                  <div className="space-y-1 text-slate-400 font-mono leading-relaxed h-[80px] overflow-y-auto">
                    {perspective === 'sales' && (
                      <>
                        <div className="text-slate-500">[21:14:02] <span className="text-cyan-400">DB_QUERY</span> SELECT * FROM customer WHERE status = 'active' ORDER BY updated DESC LIMIT 5 (2.4ms)</div>
                        <div className="text-slate-500">[21:14:03] <span className="text-emerald-400">LEDGER_CALC</span> Rolled up pipeline value: 4 deals found, total value = $240,000</div>
                        <div className="text-slate-500">[21:14:05] <span className="text-cyan-400">API_GET</span> /api/pipeline/stages (200 OK)</div>
                      </>
                    )}
                    {perspective === 'research' && (
                      <>
                        <div className="text-slate-500">[21:14:02] <span className="text-cyan-400">VECTOR_MATCH</span> Query: "NIST SP 800-82" {'->'} HNSW cache lookup (0.89 similarity score)</div>
                        <div className="text-slate-500">[21:14:03] <span className="text-sky-400">CACHE_HIT</span> Returned 3 matching cached items from postgres.research_corpus</div>
                        <div className="text-slate-500">[21:14:04] <span className="text-cyan-400">DB_QUERY</span> SELECT count(*) FROM source WHERE type = 'pdf' (1.1ms)</div>
                      </>
                    )}
                    {perspective === 'delivery' && (
                      <>
                        <div className="text-slate-500">[21:14:02] <span className="text-emerald-400">SRE_AGENT</span> Polling docker compose container status...</div>
                        <div className="text-slate-500">[21:14:03] <span className="text-slate-500">CONTAINER</span> surrealdb: UP (8000), postgres: UP (5433), open_notebook: UP (8502)</div>
                        <div className="text-slate-500">[21:14:05] <span className="text-emerald-400">HEALTH_CHECK</span> SRE audit complete. 6/6 containers healthy. No faults detected.</div>
                      </>
                    )}
                    {perspective === 'marketing' && (
                      <>
                        <div className="text-slate-500">[21:14:02] <span className="text-violet-400">KOKORO_FASTAPI</span> Concatenate request received for 3 audio segments</div>
                        <div className="text-slate-500">[21:14:03] <span className="text-slate-500">FFMPEG</span> Transcoding segment_1.wav into stereo 44100Hz...</div>
                        <div className="text-slate-500">[21:14:05] <span className="text-violet-400">TTS_DONE</span> Combined MP3 written successfully (3.4MB)</div>
                      </>
                    )}
                  </div>
                </div>

              </div>

              {/* Sidebar Context AI Panel */}
              <div className="space-y-6">
                <div className="tetrel-glass p-5 rounded-2xl border border-white/10 bg-slate-900/40 flex flex-col justify-between min-h-[300px]">
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block font-mono border-b border-white/5 pb-1">Mindset Assistant</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {perspective === 'sales' && 'Active prompts focus on deal values, contact role assignments, and ledger rollups.'}
                      {perspective === 'research' && 'Active prompts target document query indexing, citation extraction, and pgvector stats.'}
                      {perspective === 'delivery' && 'Active prompts focus on Docker container statuses, SRE logs, and tasks milestones.'}
                      {perspective === 'marketing' && 'Active prompts target podcast speech generation, social media copywriting, and schedule queueing.'}
                    </p>

                    <div className="space-y-1.5 pt-2">
                      <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-wider block">Suggested Questions:</span>
                      <button
                        type="button"
                        onClick={() => setAiCommand(perspective === 'sales' ? 'Show active deals' : perspective === 'research' ? 'Search NIST SP 800-82' : perspective === 'delivery' ? 'Get container health status' : 'Draft a post about NIST CSF')}
                        className="w-full text-left p-2 rounded bg-slate-950/60 hover:bg-slate-950 border border-white/5 text-[10px] font-mono text-slate-300 transition-colors"
                      >
                        {perspective === 'sales' && 'Show active deals'}
                        {perspective === 'research' && 'Search NIST SP 800-82'}
                        {perspective === 'delivery' && 'Get container health status'}
                        {perspective === 'marketing' && 'Draft a post about NIST CSF'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================== MOCKUP 3: THE CUSTOMIZABLE BENTO ==================== */}
        {activeMockup === 'customizable' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-mono uppercase tracking-tight text-slate-200">3. Drag-and-Drop Cockpit Dashboard (Advanced)</h2>
                <Button
                  variant={isEditing ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="font-mono text-xs uppercase h-8"
                >
                  {isEditing ? 'Lock Layout' : 'Edit Layout (Shift Cards)'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Allows the single user to customize the dashboard structure by rearranging cards. Persisted locally via `localStorage` (simulated below).</p>
            </div>

            {/* Grid Layout Canvas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {layout.map((cardId, index) => {
                return (
                  <div key={cardId} className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-300 min-h-[180px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
                    isEditing ? 'border-dashed border-cyan-500/60 bg-cyan-950/5' : 'border-white/10 bg-slate-900/40 hover:border-white/20'
                  }`}>
                    
                    {/* Edit controls overlay */}
                    {isEditing && (
                      <div className="absolute top-2.5 right-2.5 z-20 flex gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-6 w-6 border-white/20 bg-slate-950/80 text-cyan-400 hover:text-cyan-300"
                          onClick={() => moveCard(index, 'up')}
                          disabled={index === 0}
                          title="Move Up"
                        >
                          ▲
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-6 w-6 border-white/20 bg-slate-950/80 text-cyan-400 hover:text-cyan-300"
                          onClick={() => moveCard(index, 'down')}
                          disabled={index === layout.length - 1}
                          title="Move Down"
                        >
                          ▼
                        </Button>
                      </div>
                    )}

                    {/* Card Content Renderers */}
                    {cardId === 'analytics' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> CRM Forecast</span>
                          <Badge variant="outline" className="border-slate-800 text-slate-400 text-[8px] uppercase">Widget</Badge>
                        </div>
                        <div className="space-y-1">
                          <span className="text-2xl font-bold font-mono tracking-tight">$240,000</span>
                          <p className="text-[10px] text-muted-foreground">Deal pipeline value in negotiation</p>
                        </div>
                      </div>
                    )}

                    {cardId === 'quick-ai' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> AI Operations</span>
                          <Badge variant="outline" className="border-slate-800 text-slate-400 text-[8px] uppercase">Widget</Badge>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-xs font-semibold block text-slate-300">Quick AI Actions</span>
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-6 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[8px] font-mono border border-white/5">Auto-Refine Draft</Button>
                            <Button size="sm" className="h-6 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[8px] font-mono border border-white/5">Voice Command</Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {cardId === 'status-live' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5"><Activity className="h-4 w-4" /> SRE Telemetry</span>
                          <Badge variant="outline" className="border-slate-800 text-slate-400 text-[8px] uppercase">Widget</Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span>Docker containers:</span>
                            <span className="text-emerald-400 font-bold">6 HEALTHY</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-mono mt-1">
                            <span>Avg cpu load:</span>
                            <span className="text-slate-300 font-bold">14.2%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {cardId === 'data-stream' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5"><Database className="h-4 w-4" /> Vector Search</span>
                          <Badge variant="outline" className="border-slate-800 text-slate-400 text-[8px] uppercase">Widget</Badge>
                        </div>
                        <div className="space-y-1">
                          <span className="text-2xl font-bold font-mono tracking-tight">10,225 Nodes</span>
                          <p className="text-[10px] text-muted-foreground">Knowledge graph linkages mapped</p>
                        </div>
                      </div>
                    )}

                    {cardId === 'focus-doc' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5"><Layers className="h-4 w-4" /> Publication Tracker</span>
                          <Badge variant="outline" className="border-slate-800 text-slate-400 text-[8px] uppercase">Widget</Badge>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-300 truncate block">NIST compliance podcast prep</span>
                          <p className="text-[10.5px] text-muted-foreground mt-0.5">Concatenate intro/outro audio segments pending</p>
                        </div>
                      </div>
                    )}

                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ==================== MOCKUP 4: THE TOPOLOGICAL GRAPH ==================== */}
        {activeMockup === 'topological' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-mono uppercase tracking-tight text-slate-200">4. Loom-Centric Topological Dashboard (Aggressive)</h2>
              <p className="text-xs text-muted-foreground">Interactive SVG network map of system entities (Customers, Projects, Sources, Social Posts, Containers). Click nodes to open context details.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* SVG Graph Canvas */}
              <div className="lg:col-span-3 border border-white/10 bg-slate-950 rounded-2xl h-[450px] relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                
                {/* Network Graph Vector */}
                <svg className="w-full h-full max-w-[800px] max-h-[400px]" viewBox="0 0 800 400">
                  <style>{`
                    @keyframes flow {
                      to {
                        stroke-dashoffset: -20;
                      }
                    }
                    .flow-line {
                      stroke-dasharray: 6 4;
                      animation: flow 2s linear infinite;
                    }
                  `}</style>

                  {/* Connections */}
                  <line x1="80" y1="200" x2="200" y2="200" stroke="#06b6d4" strokeWidth="1.5" className="flow-line" />
                  <line x1="200" y1="200" x2="350" y2="90" stroke="#0ea5e9" strokeWidth="1.5" className="flow-line" />
                  <line x1="200" y1="200" x2="350" y2="200" stroke="#0ea5e9" strokeWidth="1.5" className="flow-line" />
                  <line x1="200" y1="200" x2="350" y2="310" stroke="#10b981" strokeWidth="2" className="flow-line" />
                  <line x1="350" y1="200" x2="350" y2="90" stroke="#0ea5e9" strokeWidth="1.5" />
                  <line x1="350" y1="90" x2="500" y2="90" stroke="#8b5cf6" strokeWidth="1.5" className="flow-line" />
                  <line x1="350" y1="310" x2="500" y2="310" stroke="#10b981" strokeWidth="1.5" className="flow-line" />
                  <line x1="500" y1="90" x2="680" y2="200" stroke="#f59e0b" strokeWidth="1.5" className="flow-line" />
                  <line x1="500" y1="310" x2="680" y2="200" stroke="#f59e0b" strokeWidth="1.5" className="flow-line" />

                  {/* Node 6: SurrealDB */}
                  <g 
                    onClick={() => setSelectedNode({
                      id: 'node-db-surreal',
                      label: 'SurrealDB v2',
                      type: 'Database (RocksDB)',
                      status: 'Healthy',
                      details: 'Primary multi-model database holding client details, schemas, and credentials.',
                      metrics: 'Uptime: 23 hours | Connections: 14 active | Storage: RocksDB engine'
                    })}
                    className="cursor-pointer group"
                  >
                    <circle cx="80" cy="200" r="18" fill="#06b6d4" fillOpacity="0.15" stroke="#06b6d4" strokeWidth="1.5" />
                    <circle cx="80" cy="200" r="4" fill="#06b6d4" />
                    <text x="80" y="230" fill="#06b6d4" fontSize="8" fontFamily="monospace" textAnchor="middle">SURREALDB</text>
                  </g>

                  {/* Node 1: Customer */}
                  <g 
                    onClick={() => setSelectedNode({
                      id: 'node-cust-1',
                      label: 'Acme Security Corp',
                      type: 'Customer Profile',
                      status: 'Active',
                      details: 'B2B Client in Critical Infrastructure Sector. Standard framework: NIST CSF v2.',
                      metrics: 'Active Projects: 2 | Pipeline Value: $145,000 | Compliance Score: 87.2%'
                    })}
                    className="cursor-pointer group"
                  >
                    <circle cx="200" cy="200" r="26" fill="#0891b2" fillOpacity="0.15" stroke="#06b6d4" strokeWidth="2" />
                    <circle cx="200" cy="200" r="6" fill="#06b6d4" />
                    <text x="200" y="240" fill="#06b6d4" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">ACME CORP</text>
                  </g>

                  {/* Node 7: pgvector Cache */}
                  <g 
                    onClick={() => setSelectedNode({
                      id: 'node-db-postgres',
                      label: 'PostgreSQL Vector Cache',
                      type: 'Database (pgvector)',
                      status: 'Healthy',
                      details: 'Stores research embeddings for hybrid reciprocal rank fusion semantic cache queries.',
                      metrics: 'Total vectors: 10,225 | Index type: HNSW cosine | Latency: 4ms'
                    })}
                    className="cursor-pointer group"
                  >
                    <circle cx="350" cy="200" r="18" fill="#0ea5e9" fillOpacity="0.15" stroke="#0ea5e9" strokeWidth="1.5" />
                    <circle cx="350" cy="200" r="4" fill="#0ea5e9" />
                    <text x="350" y="230" fill="#0ea5e9" fontSize="8" fontFamily="monospace" textAnchor="middle">PGVECTOR</text>
                  </g>

                  {/* Node 2: Proposal Document */}
                  <g 
                    onClick={() => setSelectedNode({
                      id: 'node-prop-1',
                      label: 'NIST CSF Gap Analysis Proposal',
                      type: 'Proposal / Notebook',
                      status: 'Under Review',
                      details: 'Linked to Acme Security Corp. Drafted using deep research sources from NIST repository.',
                      metrics: 'Estimated Value: $45,000 | Note count: 12 | Sources linked: 3'
                    })}
                    className="cursor-pointer group"
                  >
                    <circle cx="350" cy="90" r="22" fill="#0284c7" fillOpacity="0.15" stroke="#0ea5e9" strokeWidth="2" />
                    <circle cx="350" cy="90" r="5" fill="#0ea5e9" />
                    <text x="350" y="125" fill="#0ea5e9" fontSize="9" fontFamily="monospace" textAnchor="middle">GAP PROPOSAL</text>
                  </g>

                  {/* Node 3: Project SCADA Integration */}
                  <g 
                    onClick={() => setSelectedNode({
                      id: 'node-proj-1',
                      label: 'Acme Core SCADA Integration',
                      type: 'Project Delivery',
                      status: 'In Progress',
                      details: 'Topological network mapping and secure segment insulation project.',
                      metrics: 'Tasks: 8/12 completed | Health: Stable | Start: 2026-06-01'
                    })}
                    className="cursor-pointer group"
                  >
                    <circle cx="350" cy="310" r="22" fill="#059669" fillOpacity="0.15" stroke="#10b981" strokeWidth="2" />
                    <circle cx="350" cy="310" r="5" fill="#10b981" />
                    <text x="350" y="345" fill="#10b981" fontSize="9" fontFamily="monospace" textAnchor="middle">SCADA INTEGRATION</text>
                  </g>

                  {/* Node 8: OpenRouter LLM Gateway */}
                  <g 
                    onClick={() => setSelectedNode({
                      id: 'node-ai-openrouter',
                      label: 'OpenRouter Multi-LLM API',
                      type: 'AI Model Gateway',
                      status: 'Connected',
                      details: 'Cloud API route to GPT-4o and Claude 3.5. Handles complex compliance parsing.',
                      metrics: 'Provider: OpenRouter | Sync frequency: Daily | Default: gemini-3.5-pro'
                    })}
                    className="cursor-pointer group"
                  >
                    <circle cx="500" cy="90" r="18" fill="#8b5cf6" fillOpacity="0.15" stroke="#8b5cf6" strokeWidth="1.5" />
                    <circle cx="500" cy="90" r="4" fill="#8b5cf6" />
                    <text x="500" y="120" fill="#8b5cf6" fontSize="8" fontFamily="monospace" textAnchor="middle">OPENROUTER</text>
                  </g>

                  {/* Node 4: WebRTC Voice Server */}
                  <g 
                    onClick={() => setSelectedNode({
                      id: 'node-voice-1',
                      label: 'Kokoro Voice AI Agent',
                      type: 'Docker Container / Server',
                      status: 'Online',
                      details: 'Container Service active. Provides real-time Text-To-Speech capabilities.',
                      metrics: 'Port: 8880 | Deployment: Local CPU | Average latency: 45ms'
                    })}
                    className="cursor-pointer group"
                  >
                    <circle cx="500" cy="310" r="22" fill="#059669" fillOpacity="0.15" stroke="#10b981" strokeWidth="2" />
                    <circle cx="500" cy="310" r="5" fill="#10b981" />
                    <text x="500" y="345" fill="#10b981" fontSize="9" fontFamily="monospace" textAnchor="middle">VOICE_AI (8880)</text>
                  </g>

                  {/* Node 5: Social Media Post */}
                  <g 
                    onClick={() => setSelectedNode({
                      id: 'node-social-1',
                      label: 'LinkedIn: NIST CSF Compliance Milestone',
                      type: 'Social / Marketing',
                      status: 'Draft',
                      details: 'Drafted social post detailing the security roadmap results.',
                      metrics: 'Status: Queued | Platform: LinkedIn | Due: 2026-06-12'
                    })}
                    className="cursor-pointer group"
                  >
                    <circle cx="680" cy="200" r="22" fill="#d97706" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="2" />
                    <circle cx="680" cy="200" r="5" fill="#f59e0b" />
                    <text x="680" y="235" fill="#f59e0b" fontSize="9" fontFamily="monospace" textAnchor="middle">LINKEDIN POST</text>
                  </g>
                </svg>
              </div>

              {/* Node Inspector Drawer */}
              <div className="space-y-6">
                {selectedNode ? (
                  <div className="tetrel-glass p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/40 flex flex-col justify-between min-h-[300px] animate-in slide-in-from-right-2 duration-300">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block font-mono">Entity Inspector</span>
                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[8px] uppercase">{selectedNode.type}</Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold font-mono text-slate-100">{selectedNode.label}</h4>
                        <span className="text-[10.5px] text-muted-foreground font-mono">Status: <strong className="text-emerald-400">{selectedNode.status}</strong></span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{selectedNode.details}</p>

                      {selectedNode.metrics && (
                        <div className="p-2.5 bg-slate-950/60 rounded border border-white/5 font-mono text-[9px] text-cyan-300 leading-normal">
                          {selectedNode.metrics}
                        </div>
                      )}
                    </div>

                    <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase h-8 mt-4">
                      Open Workspace
                    </Button>
                  </div>
                ) : (
                  <div className="tetrel-glass p-5 rounded-2xl border border-white/10 bg-slate-900/40 flex items-center justify-center min-h-[300px]">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase text-center">Click a node on the map to inspect relationships</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
      </div>
    </AppShell>
  )
}
