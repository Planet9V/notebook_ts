'use client'

import React, { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useProjects, useAddTask, useUpdateTask, useCreateProject } from '@/lib/hooks/use-projects'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/lib/hooks/use-users'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
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
  Folder,
  FolderOpen,
  Check,
  Edit2,
  Network,
  Send,
} from 'lucide-react'

// Define the 7 mockup types
type MockupType = 'gateway' | 'perspective' | 'customizable' | 'topological' | 'cockpit' | 'agent-swarm' | 'enhanced-perspective'

export default function MockupsPage() {
  const [activeMockup, setActiveMockup] = useState<MockupType>('gateway')

  // State for Mockup 2 (Perspective Selector)
  const [perspective, setPerspective] = useState<'sales' | 'research' | 'delivery' | 'marketing'>('sales')

  // State for Mockup 7 (Enhanced Perspective Selector)
  const [enhancedPerspective, setEnhancedPerspective] = useState<'sales' | 'research' | 'delivery' | 'marketing' | 'admin'>('sales')

  // Live Database Queries & Mutations for Option 7
  const queryClient = useQueryClient()
  const { data: projectsList = [], refetch: refetchProjects } = useProjects()
  const { data: usersList = [], refetch: refetchUsers } = useUsers()

  const addTaskMutation = useAddTask()
  const updateTaskMutation = useUpdateTask()
  const createProjectMutation = useCreateProject()

  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()

  // Selected project (default to the first project in database)
  const activeDbProject = projectsList[0]
  
  // Selected user filter
  const [userFilter, setUserFilter] = useState<string>('all')

  // State for user CRUD dialog
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('')

  // State for adding task form
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('medium')

  const handleSeedProject = () => {
    createProjectMutation.mutate({
      name: 'NIST CSF v2 Compliance Alignment',
      description: 'Compliance alignment project for ACME Corp facilities.',
      stage: 'in_progress',
      status: 'active',
      priority: 'high',
      project_type: 'compliance'
    }, {
      onSuccess: (newProj) => {
        // Add sample tasks
        addTaskMutation.mutate({
          projectId: newProj.id,
          data: { title: 'Isolate SCADA protocol ports', assigned_to: 'SRE Agent Alpha', priority: 'High', status: 'in_progress' }
        }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
          }
        })
        addTaskMutation.mutate({
          projectId: newProj.id,
          data: { title: 'Seed CISA validation framework questions', assigned_to: 'SRE Agent Beta', priority: 'Medium', status: 'done' }
        }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
          }
        })
        addTaskMutation.mutate({
          projectId: newProj.id,
          data: { title: 'Audit PostgreSQL pgvector memory usage', assigned_to: 'Unassigned', priority: 'Low', status: 'todo' }
        }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
          }
        })
        toast.success('Sample project and tasks seeded!')
      }
    })
  }
  
  // Sales CRM Mindset State
  const [salesCampaigns] = useState([
    { id: 'camp-s1', name: 'NIST CSF v2 Awareness Outreach', channel: 'LinkedIn', targetAccount: 'Acme Security Corp', status: 'Running', leadsGenerated: 12 },
    { id: 'camp-s2', name: 'SCADA Segments Security Webinar', channel: 'Email', targetAccount: 'Apex Networks', status: 'Planned', leadsGenerated: 0 },
    { id: 'camp-s3', name: 'Federal Threat Intel Feed Promo', channel: 'X/Twitter', targetAccount: 'Global Logistics', status: 'Running', leadsGenerated: 8 },
  ])

  // Research Mindset State
  const [researchSearchQuery, setResearchSearchQuery] = useState('')
  const [researchSearchResults, setResearchSearchResults] = useState<any[]>([])
  const [selectedResearchDoc, setSelectedResearchDoc] = useState<any>(null)
  const [activeCitationPopover, setActiveCitationPopover] = useState<string | null>(null)
  const [researchDocsList, setResearchDocsList] = useState([
    { id: 'doc-1', name: 'nist_sp_800_82_rev3.pdf', size: '2.4 MB', type: 'PDF', addedBy: 'Researcher Agent', date: '2026-06-03', textPreview: 'Industrial Control Systems (ICS) security policies require logical segment isolation, cryptographic boundaries, and offline simulation logs...' },
    { id: 'doc-2', name: 'cisa_scada_hardening_guidelines.pdf', size: '1.5 MB', type: 'PDF', addedBy: 'Data Agent', date: '2026-06-04', textPreview: 'Hardening SCADA networks involves disabling unused protocol ports, setting up pgvector similarity caching, and auditing supervisor logs hourly...' },
    { id: 'doc-3', name: 'nist_csf_v2_core.pdf', size: '3.1 MB', type: 'PDF', addedBy: 'SRE Agent', date: '2026-06-05', textPreview: 'The NIST Cybersecurity Framework Version 2.0 covers six core functions: Govern, Identify, Protect, Detect, Respond, and Recover...' }
  ])

  // Delivery Mindset State
  const [deliveryNestedTree, setDeliveryNestedTree] = useState({
    name: 'ACME Operations Portfolio',
    isOpen: true,
    projects: [
      {
        id: 'proj-d1',
        name: 'NIST CSF v2 Compliance Alignment',
        isOpen: true,
        facilities: [
          { id: 'fac-1', name: 'Texas Petrochemical Refining Plant', SREConfig: 'Cluster: tx-ref-01 | Nodes: 20 | RBAC: Enforced', complianceScore: '92%', docName: 'nist_csf_v2_core.pdf' },
          { id: 'fac-2', name: 'Ohio Nuclear Generation Station', SREConfig: 'Cluster: oh-gen-02 | Nodes: 30 | RBAC: Multi-Factor', complianceScore: '87%', docName: 'cisa_scada_hardening_guidelines.pdf' },
        ]
      },
      {
        id: 'proj-d2',
        name: 'SCADA Network Insulation',
        isOpen: false,
        facilities: [
          { id: 'fac-3', name: 'California Solar Distribution Grid', SREConfig: 'Cluster: ca-solar-04 | Nodes: 12 | RBAC: Basic', complianceScore: '94%', docName: 'nist_sp_800_82_rev3.pdf' }
        ]
      }
    ]
  })
  
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('fac-1')
  const [deliveryTasksList, setDeliveryTasksList] = useState([
    { id: 'task-d1', name: 'Isolate SCADA protocol ports', stage: 'In Progress', dueDate: '2026-06-15', assignee: 'SRE Agent Alpha', priority: 'High' },
    { id: 'task-d2', name: 'Seed CISA validation framework questions', stage: 'Done', dueDate: '2026-06-08', assignee: 'SRE Agent Beta', priority: 'Medium' },
    { id: 'task-d3', name: 'Audit PostgreSQL pgvector memory usage', stage: 'Todo', dueDate: '2026-06-20', assignee: 'System Agent', priority: 'Low' },
    { id: 'task-d4', name: 'Verify backup failover recovery script', stage: 'In Review', dueDate: '2026-06-12', assignee: 'SRE Agent Alpha', priority: 'High' }
  ])
  const [deliveryTasksView, setDeliveryTasksView] = useState<'kanban' | 'table'>('kanban')

  // Marketing Mindset State
  const [marketingAudioScript, setMarketingAudioScript] = useState('NIST CSF v2 updates include Govern and Recover functions.')
  const [selectedMarketingVoice, setSelectedMarketingVoice] = useState('v1')
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [isAudioGenerated, setIsAudioGenerated] = useState(false)
  const [socialSchedulerPosts, setSocialSchedulerPosts] = useState([
    { id: 'sch-1', platform: 'LinkedIn', title: 'NIST CSF v2 Compliance Audit takeaways', date: '2026-06-12 09:00', status: 'Active' },
    { id: 'sch-2', platform: 'X/Twitter', title: 'Securing SCADA networks under NIST SP 800-82 Rev 3', date: '2026-06-13 14:00', status: 'Queued' },
    { id: 'sch-3', platform: 'Blog', title: 'Deep dive: How vector databases accelerate threat intelligence', date: '2026-06-15 10:00', status: 'Queued' },
    { id: 'sch-4', platform: 'LinkedIn', title: 'Why pgvector hybrid search outperforms simple keyword queries', date: '2026-06-10 08:30', status: 'Published' },
  ])

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

  // State for Mockup 5 (Unified Operations Cockpit)
  const [cockpitTab, setCockpitTab] = useState<'sales' | 'research' | 'delivery' | 'marketing' | 'admin'>('sales')

  // Mock Sales CRM State
  const [deals, setDeals] = useState([
    { id: 'deal-1', name: 'Acme Security Upgrade', stage: 'Negotiation', value: 80000, company: 'Acme Security Corp' },
    { id: 'deal-2', name: 'Apex Infrastructure Audit', stage: 'Proposal', value: 120000, company: 'Apex Networks' },
    { id: 'deal-3', name: 'Cyber Sentinel Assessment', stage: 'Qualification', value: 40000, company: 'Cyber Sentinel' },
    { id: 'deal-4', name: 'Global Threat Intel Feed', stage: 'Closed', value: 50000, company: 'Global Logistics' },
  ])
  const [newDealName, setNewDealName] = useState('')
  const [newDealValue, setNewDealValue] = useState('')
  const [newDealCompany, setNewDealCompany] = useState('')

  const advanceDeal = (id: string) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== id) return d
      const stages = ['Qualification', 'Proposal', 'Negotiation', 'Closed']
      const currentIdx = stages.indexOf(d.stage)
      const nextIdx = (currentIdx + 1) % stages.length
      return { ...d, stage: stages[nextIdx] }
    }))
  }

  const deleteDeal = (id: string) => {
    setDeals(prev => prev.filter(d => d.id !== id))
  }

  const addMockDeal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDealName || !newDealValue) return
    const val = parseInt(newDealValue) || 0
    const newD = {
      id: `deal-${Date.now()}`,
      name: newDealName,
      stage: 'Qualification',
      value: val,
      company: newDealCompany || 'Unknown Inc.'
    }
    setDeals(prev => [...prev, newD])
    setNewDealName('')
    setNewDealValue('')
    setNewDealCompany('')
  }

  // Mock Research Hub State
  const [researchFolders, setResearchFolders] = useState([
    {
      id: 'folder-1',
      name: 'NIST Standards & Frameworks',
      isOpen: true,
      files: [
        { id: 'file-1', name: 'nist_sp_800_53_rev5.pdf', size: '4.8 MB', type: 'PDF', dateAdded: '2026-06-01' },
        { id: 'file-2', name: 'nist_csf_v2_guide.pdf', size: '1.8 MB', type: 'PDF', dateAdded: '2026-06-02' },
        { id: 'file-3', name: 'nist_sp_800_82_rev3.pdf', size: '2.4 MB', type: 'PDF', dateAdded: '2026-06-03' },
      ]
    },
    {
      id: 'folder-2',
      name: 'Internal Compliance Audits',
      isOpen: false,
      files: [
        { id: 'file-4', name: 'acme_scada_audit_v1.txt', size: '124 KB', type: 'TXT', dateAdded: '2026-06-05' },
        { id: 'file-5', name: 'apex_insulation_check.log', size: '45 KB', type: 'LOG', dateAdded: '2026-06-07' },
      ]
    }
  ])
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const toggleFolder = (folderId: string) => {
    setResearchFolders(prev => prev.map(f => f.id === folderId ? { ...f, isOpen: !f.isOpen } : f))
  }

  const renameFile = (fileId: string, newName: string) => {
    if (!newName.trim()) return
    setResearchFolders(prev => prev.map(f => ({
      ...f,
      files: f.files.map(file => file.id === fileId ? { ...file, name: newName } : file)
    })))
    setRenamingFileId(null)
    setRenameValue('')
  }

  // Mock Delivery Matrix State
  const [deliveryLayout, setDeliveryLayout] = useState<'table' | 'kanban'>('table')
  const [deliveries, setDeliveries] = useState([
    { id: 'del-1', client: 'Acme Security Corp', project: 'NIST CSF v2 Alignment', progress: 70, status: 'In Progress', manager: 'SRE Agent Alpha' },
    { id: 'del-2', client: 'Apex Networks', project: 'SCADA Segment Insulation', progress: 40, status: 'In Progress', manager: 'SRE Agent Beta' },
    { id: 'del-3', client: 'Cyber Sentinel', project: 'Cloud Vulnerability Remediation', progress: 100, status: 'Completed', manager: 'System Agent' },
  ])

  // Mock Marketing Studio State
  const [campaigns, setCampaigns] = useState([
    { id: 'camp-1', title: 'NIST CSF v2 Compliance Campaign', status: 'Active', platform: 'LinkedIn', scheduledTime: '2026-06-12 09:00' },
    { id: 'camp-2', title: 'SCADA Security Threats Podcast Ep 4', status: 'Queued', platform: 'Blog', scheduledTime: '2026-06-15 14:00' },
  ])
  const [showPostGenerator, setShowPostGenerator] = useState(false)
  const [marketingPlatform, setMarketingPlatform] = useState<'LinkedIn' | 'X/Twitter' | 'Blog'>('LinkedIn')
  const [marketingSourceText, setMarketingSourceText] = useState('NIST SP 800-82 standard details secure industrial control systems (ICS).')
  const [generatedPost, setGeneratedPost] = useState('')
  const [isGeneratingPost, setIsGeneratingPost] = useState(false)

  const generatePostText = () => {
    setIsGeneratingPost(true)
    setTimeout(() => {
      setIsGeneratingPost(false)
      const dateStr = new Date().toLocaleDateString()
      if (marketingPlatform === 'LinkedIn') {
        setGeneratedPost(`📊 Compliance Update (${dateStr}): Analyzing the latest NIST SP 800-82 rev3 guidelines. Takeaways for securing ICS/SCADA:\n1. Insulation of critical segments\n2. Mandatory microservice security gates.\n#Cybersecurity #NIST #OTSecurity`)
      } else if (marketingPlatform === 'X/Twitter') {
        setGeneratedPost(`🔒 Securing ICS/SCADA under NIST SP 800-82 Rev 3 thread:\n1/ Segment insulation is key.\n2/ Rebuild threat intelligence indices with pgvector vector-search caches.\n3/ Run audits hourly in your devops dashboard. 🚀`)
      } else {
        setGeneratedPost(`# Deep Dive: NIST SP 800-82 Rev 3 and OT Security\n\nIndustrial Control Systems (ICS) require robust security policies. By deploying isolated microservices and utilizing vector-based similarity index search, enterprise networks can proactively defend against SCADA segment intrusion...`)
      }
    }, 1000)
  }

  const addCampaign = () => {
    if (!generatedPost) return
    const newCamp = {
      id: `camp-${Date.now()}`,
      title: generatedPost.slice(0, 40) + '...',
      status: 'Queued' as const,
      platform: marketingPlatform,
      scheduledTime: new Date(Date.now() + 86400000).toLocaleString()
    }
    setCampaigns(prev => [...prev, newCamp])
    setShowPostGenerator(false)
    setGeneratedPost('')
  }

  // Mock Admin Panel / Container states
  const [containers, setContainers] = useState([
    { id: 'cont-surreal', name: 'surrealdb', status: 'running', port: 8000 },
    { id: 'cont-postgres', name: 'postgres', status: 'running', port: 5433 },
    { id: 'cont-opennotebook', name: 'open_notebook', status: 'running', port: 8502 },
    { id: 'cont-kokoro', name: 'kokoro-tts', status: 'running', port: 8880 },
  ])
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false)
  const [rebuildProgress, setRebuildProgress] = useState(0)

  const toggleContainer = (id: string) => {
    setContainers(prev => prev.map(c => {
      if (c.id !== id) return c
      return { ...c, status: c.status === 'running' ? 'stopped' : 'running' }
    }))
  }

  const rebuildPgvectorIndex = () => {
    setIsRebuildingIndex(true)
    setRebuildProgress(0)
    const interval = setInterval(() => {
      setRebuildProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          setTimeout(() => setIsRebuildingIndex(false), 500)
          return 100
        }
        return p + 20
      })
    }, 200)
  }

  // State for Mockup 6 (Agent-Centric Swarm)
  const [selectedAgent, setSelectedAgent] = useState<'CRM' | 'Research' | 'SRE' | 'Media'>('Research')
  const [agentStatuses, setAgentStatuses] = useState<Record<string, 'idle' | 'thinking' | 'executing' | 'paused'>>({
    CRM: 'idle',
    Research: 'executing',
    SRE: 'thinking',
    Media: 'paused',
  })

  // Simulated Agent Logs
  const agentThoughts = {
    CRM: [
      'Checking customer profiles table in SurrealDB...',
      'Identified 2 pipeline records nearing decision milestone.',
      'Triggered notification rule: Email warning to lead manager.',
    ],
    Research: [
      'Initiating vector similarity query in pgvector...',
      'Matching query "NIST ICS insulation recommendations" (cosine sim: 0.91)',
      'Extracted 3 relevant citations from SP 800-82 doc.',
      'Asynchronously writing synthesis file "ICS_insulation_guide.md" to directory.',
    ],
    SRE: [
      'Checking Docker daemon network metrics...',
      'Container "kokoro-tts" CPU usage spikes to 82% during segment compile.',
      'Compacted wav temp files from /tmp/podcast_compile/ to prevent disk exhaustion.',
    ],
    Media: [
      'Listening for new episode creation queue...',
      'Retrieved Outline structure: 4 segments mapped.',
      'Spawning background audio generation worker for Speaker 1 (ElevenLabs).',
    ]
  }

  const agentTools = {
    CRM: ['surreal_query', 'send_message', 'list_contacts'],
    Research: ['memory_search', 'read_file', 'write_to_file', 'graphify_query'],
    SRE: ['docker_status', 'system_logs', 'manage_task'],
    Media: ['voice_synthesis', 'concat_audio', 'perplexity_search'],
  }

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

  const handleMoveTask = (taskIndex: number, currentStatus: string) => {
    if (!activeDbProject) return
    const stages = ['todo', 'in_progress', 'in_review', 'done']
    const normalizedStatus = (currentStatus || 'todo').toLowerCase().replace(' ', '_')
    const nextStatus = stages[(stages.indexOf(normalizedStatus) + 1) % stages.length]
    
    updateTaskMutation.mutate({
      projectId: activeDbProject.id,
      taskIndex,
      data: { status: nextStatus }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        toast.success('Task stage updated')
      }
    })
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
            <Button
              variant={activeMockup === 'cockpit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveMockup('cockpit')
                setAiResponse(null)
              }}
              className="font-mono text-xs h-8 uppercase text-slate-300"
            >
              5. Cockpit
            </Button>
            <Button
              variant={activeMockup === 'agent-swarm' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveMockup('agent-swarm')
                setAiResponse(null)
              }}
              className="font-mono text-xs h-8 uppercase text-slate-300"
            >
              6. Swarm
            </Button>
            <Button
              variant={activeMockup === 'enhanced-perspective' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveMockup('enhanced-perspective')
                setAiResponse(null)
              }}
              className="font-mono text-xs h-8 uppercase text-cyan-400 border-cyan-500/20"
            >
              7. Perspective+
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

        {/* ==================== MOCKUP 5: UNIFIED OPERATIONS COCKPIT ==================== */}
        {activeMockup === 'cockpit' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-mono uppercase tracking-tight text-slate-200">5. Unified Operations Cockpit</h2>
              <p className="text-xs text-muted-foreground">Manage Sales CRM, Research, Delivery progress, and Admin settings inside a unified portal layout.</p>
            </div>

            {/* Navigation tabs inside the cockpit */}
            <div className="flex border-b border-white/10 bg-slate-900/40 rounded-t-xl overflow-hidden">
              <button
                onClick={() => setCockpitTab('sales')}
                className={`flex-1 py-3 px-4 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                  cockpitTab === 'sales' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="h-4 w-4" /> Sales CRM
              </button>
              <button
                onClick={() => setCockpitTab('research')}
                className={`flex-1 py-3 px-4 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                  cockpitTab === 'research' ? 'bg-sky-500/10 text-sky-400 border-b-2 border-sky-500' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Folder className="h-4 w-4" /> Research Hub
              </button>
              <button
                onClick={() => setCockpitTab('delivery')}
                className={`flex-1 py-3 px-4 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                  cockpitTab === 'delivery' ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="h-4 w-4" /> Delivery Matrix
              </button>
              <button
                onClick={() => setCockpitTab('marketing')}
                className={`flex-1 py-3 px-4 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                  cockpitTab === 'marketing' ? 'bg-violet-500/10 text-violet-400 border-b-2 border-violet-500' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mic className="h-4 w-4" /> Marketing Studio
              </button>
              <button
                onClick={() => setCockpitTab('admin')}
                className={`flex-1 py-3 px-4 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                  cockpitTab === 'admin' ? 'bg-slate-800 text-slate-100 border-b-2 border-slate-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Settings className="h-4 w-4" /> Admin Panel
              </button>
            </div>

            {/* Cockpit Sub-Tab Content rendering */}
            <div className="p-6 rounded-b-2xl border-x border-b border-white/10 bg-slate-900/20 min-h-[400px]">
              
              {/* Sales CRM Sub-tab */}
              {cockpitTab === 'sales' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-bold font-mono text-cyan-400 uppercase">Sales CRM Kanban</h3>
                      <p className="text-[10px] text-muted-foreground">Click a deal card to advance it through stages Qualification {'->'} Proposal {'->'} Negotiation {'->'} Closed.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase text-muted-foreground font-mono block">Total Pipeline Forecast</span>
                      <strong className="text-lg font-mono text-emerald-400">${deals.reduce((sum, d) => sum + d.value, 0).toLocaleString()}</strong>
                    </div>
                  </div>

                  {/* Kanban Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {['Qualification', 'Proposal', 'Negotiation', 'Closed'].map(stage => {
                      const stageDeals = deals.filter(d => d.stage === stage)
                      return (
                        <div key={stage} className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-3 min-h-[220px]">
                          <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                            <span className="text-[10px] font-bold font-mono text-slate-300 uppercase">{stage}</span>
                            <Badge className="bg-slate-800 text-slate-300 text-[9px] font-mono">{stageDeals.length}</Badge>
                          </div>

                          <div className="space-y-2.5">
                            {stageDeals.map(deal => (
                              <div 
                                key={deal.id}
                                className="p-3 bg-slate-900/60 border border-white/10 hover:border-cyan-500/30 rounded-lg space-y-2 relative group cursor-pointer transition-all"
                                onClick={() => advanceDeal(deal.id)}
                              >
                                <div className="text-[11px] font-bold text-slate-200 truncate">{deal.name}</div>
                                <div className="flex justify-between items-center text-[10px] font-mono">
                                  <span className="text-slate-400 truncate max-w-[100px]">{deal.company}</span>
                                  <span className="text-cyan-400 font-bold">${deal.value.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center pt-1 border-t border-white/5 text-[8.5px] text-slate-500 font-mono">
                                  <span>Click to advance</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteDeal(deal.id)
                                    }}
                                    className="text-red-400 hover:text-red-300 flex items-center"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Add deal form */}
                  <form onSubmit={addMockDeal} className="p-4 bg-slate-950/40 rounded-xl border border-white/5 max-w-2xl space-y-3">
                    <h4 className="text-[11px] font-bold font-mono text-slate-300 uppercase">Create New Deal</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input 
                        placeholder="Deal name (e.g. Audit)"
                        value={newDealName}
                        onChange={(e) => setNewDealName(e.target.value)}
                        className="bg-slate-900 border-white/10 text-xs h-8 rounded-lg"
                      />
                      <Input 
                        placeholder="Deal value ($)"
                        value={newDealValue}
                        onChange={(e) => setNewDealValue(e.target.value)}
                        className="bg-slate-900 border-white/10 text-xs h-8 rounded-lg"
                      />
                      <Input 
                        placeholder="Company name"
                        value={newDealCompany}
                        onChange={(e) => setNewDealCompany(e.target.value)}
                        className="bg-slate-900 border-white/10 text-xs h-8 rounded-lg"
                      />
                    </div>
                    <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase h-8 px-3 rounded-lg">
                      Add Deal
                    </Button>
                  </form>
                </div>
              )}

              {/* Research Hub Sub-tab */}
              {cockpitTab === 'research' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-sky-400 uppercase">Interactive Research Folders</h3>
                    <p className="text-[10px] text-muted-foreground">Browse knowledge assets, check folder sizes, and rename documents inline.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Folders List */}
                    <div className="md:col-span-2 space-y-3">
                      {researchFolders.map(folder => (
                        <div key={folder.id} className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/40">
                          <button
                            onClick={() => toggleFolder(folder.id)}
                            className="w-full flex items-center justify-between p-3.5 bg-slate-900/60 font-mono text-xs text-slate-200 hover:bg-slate-900"
                          >
                            <span className="flex items-center gap-2">
                              {folder.isOpen ? <FolderOpen className="h-4 w-4 text-sky-400" /> : <Folder className="h-4 w-4 text-sky-400" />}
                              <strong>{folder.name}</strong>
                            </span>
                            <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono">{folder.files.length} items</Badge>
                          </button>

                          {folder.isOpen && (
                            <div className="p-3 border-t border-white/5 space-y-2">
                              {folder.files.map(file => (
                                <div key={file.id} className="p-2.5 bg-slate-900/40 border border-white/5 rounded-lg flex items-center justify-between gap-4">
                                  {renamingFileId === file.id ? (
                                    <div className="flex-1 flex gap-2">
                                      <Input 
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        className="bg-slate-950 border-white/10 text-xs h-7 py-1"
                                      />
                                      <Button 
                                        size="sm" 
                                        onClick={() => renameFile(file.id, renameValue)}
                                        className="h-7 bg-emerald-500 hover:bg-emerald-600 text-slate-950"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[11.5px] font-bold text-slate-200 truncate flex items-center gap-1.5">
                                        📄 {file.name}
                                      </div>
                                      <div className="flex gap-2 text-[9px] text-slate-500 font-mono mt-0.5">
                                        <span>Size: {file.size}</span>
                                        <span>•</span>
                                        <span>Added: {file.dateAdded}</span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {renamingFileId !== file.id && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => {
                                        setRenamingFileId(file.id)
                                        setRenameValue(file.name)
                                      }}
                                      className="h-7 w-7 text-sky-400 hover:text-sky-300"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Quick Stats Sidebar */}
                    <div className="space-y-4">
                      <Card className="bg-slate-900/40 border-white/10 rounded-xl shadow-xl">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs font-mono uppercase text-sky-400">pgvector Knowledge Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-[10px] font-mono text-slate-300">
                          <div className="flex justify-between">
                            <span>Ingested Corpora:</span> <span className="text-slate-100 font-bold">2 Folders</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Files:</span> <span className="text-slate-100 font-bold">5 Items</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Indexed Nodes:</span> <span className="text-sky-400 font-bold">11,941</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Relationships:</span> <span className="text-sky-400 font-bold">15,672</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Matrix Sub-tab */}
              {cockpitTab === 'delivery' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-bold font-mono text-emerald-400 uppercase">Delivery Tracker Matrix</h3>
                      <p className="text-[10px] text-muted-foreground">Monitor client project deliveries, task execution flow and assigned managers.</p>
                    </div>
                    <div className="flex gap-1.5 p-1 bg-slate-950/60 border border-white/10 rounded-lg">
                      <Button
                        size="sm"
                        variant={deliveryLayout === 'table' ? 'default' : 'ghost'}
                        onClick={() => setDeliveryLayout('table')}
                        className="text-[9px] font-mono uppercase h-6 rounded-md px-2"
                      >
                        Table
                      </Button>
                      <Button
                        size="sm"
                        variant={deliveryLayout === 'kanban' ? 'default' : 'ghost'}
                        onClick={() => setDeliveryLayout('kanban')}
                        className="text-[9px] font-mono uppercase h-6 rounded-md px-2"
                      >
                        Kanban Progress
                      </Button>
                    </div>
                  </div>

                  {deliveryLayout === 'table' ? (
                    <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/40">
                      <table className="w-full text-left font-mono text-xs">
                        <thead>
                          <tr className="bg-slate-900/60 border-b border-white/10 text-slate-400">
                            <th className="p-3">Client</th>
                            <th className="p-3">Project</th>
                            <th className="p-3">SRE Manager</th>
                            <th className="p-3">Progress</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {deliveries.map(del => (
                            <tr key={del.id} className="hover:bg-slate-900/30">
                              <td className="p-3 font-bold text-slate-200">{del.client}</td>
                              <td className="p-3 text-slate-300">{del.project}</td>
                              <td className="p-3 text-emerald-400">{del.manager}</td>
                              <td className="p-3 w-1/4">
                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-400">{del.progress}%</span>
                                  <Progress value={del.progress} className="h-1 bg-slate-900" />
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge className={
                                  del.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                }>
                                  {del.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {deliveries.map(del => (
                        <div key={del.id} className="p-4 bg-slate-950/40 border border-white/10 rounded-xl space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-mono">Assigned: {del.manager}</span>
                            <Badge className={
                              del.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'
                            }>
                              {del.status}
                            </Badge>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-100">{del.project}</h4>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{del.client}</p>
                          </div>
                          <div className="space-y-1 pt-2">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span>Milestone Progress</span>
                              <span className="text-emerald-400 font-bold">{del.progress}%</span>
                            </div>
                            <Progress value={del.progress} className="h-1.5 bg-slate-900" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Marketing Studio Sub-tab */}
              {cockpitTab === 'marketing' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-bold font-mono text-violet-400 uppercase">Marketing Studio Campaigns</h3>
                      <p className="text-[10px] text-muted-foreground">Simulate generating, queueing and scheduling AI-assisted copy from compliance corpus research.</p>
                    </div>
                    <Button 
                      onClick={() => setShowPostGenerator(true)}
                      className="bg-violet-500 hover:bg-violet-600 text-slate-950 font-bold font-mono text-xs uppercase h-9 px-3 rounded-lg"
                    >
                      <Sparkles className="h-4 w-4 mr-1.5" /> AI Post Generator
                    </Button>
                  </div>

                  {/* Post Generator Simulator Modal overlay */}
                  {showPostGenerator && (
                    <div className="p-4 bg-slate-950/80 border border-violet-500/20 rounded-xl space-y-4 max-w-2xl">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <h4 className="text-xs font-bold font-mono text-violet-400 uppercase">Post Copilot Sandbox</h4>
                        <button onClick={() => setShowPostGenerator(false)} className="text-slate-500 hover:text-slate-300">✖</button>
                      </div>

                      <div className="space-y-3">
                        {/* Select Platform */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400 uppercase">Platform Target</label>
                          <div className="flex gap-2">
                            {(['LinkedIn', 'X/Twitter', 'Blog'] as const).map(plat => (
                              <Button
                                key={plat}
                                size="sm"
                                variant={marketingPlatform === plat ? 'default' : 'outline'}
                                onClick={() => setMarketingPlatform(plat)}
                                className="h-7 text-[9px] uppercase font-mono px-2"
                              >
                                {plat}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Source Context */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-400 uppercase">Corpus Context input</label>
                          <textarea 
                            value={marketingSourceText}
                            onChange={(e) => setMarketingSourceText(e.target.value)}
                            rows={2}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-500"
                          />
                        </div>

                        <Button 
                          onClick={generatePostText} 
                          disabled={isGeneratingPost}
                          className="w-full bg-violet-600 hover:bg-violet-500 text-slate-100 font-mono text-xs uppercase h-8"
                        >
                          {isGeneratingPost ? 'Synthesizing with LLM...' : 'Generate Copy'}
                        </Button>

                        {generatedPost && (
                          <div className="p-3 bg-violet-950/20 border border-violet-500/25 rounded-lg space-y-2">
                            <label className="text-[9px] font-mono text-violet-300 uppercase block">Generated Draft Output</label>
                            <div className="text-xs font-sans text-slate-300 whitespace-pre-wrap leading-relaxed">{generatedPost}</div>
                            <Button 
                              onClick={addCampaign}
                              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold font-mono text-[10px] uppercase h-7 mt-2"
                            >
                              Add to Campaign Queue
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Campaign List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold font-mono text-slate-300 uppercase">Active Campaigns & Schedule Queue</h4>
                    <div className="space-y-2.5">
                      {campaigns.map(camp => (
                        <div key={camp.id} className="p-3 bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between gap-4 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-violet-500/20 text-violet-400 text-[8.5px] border border-violet-500/25 uppercase">{camp.platform}</Badge>
                            <span className="text-slate-200 font-bold truncate max-w-[280px] sm:max-w-[450px]">{camp.title}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] text-slate-500">{camp.scheduledTime}</span>
                            <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px]">{camp.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Panel Sub-tab */}
              {cockpitTab === 'admin' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="border-b border-white/5 pb-3">
                    <h3 className="text-sm font-bold font-mono text-slate-200 uppercase">System Telemetry & Controls</h3>
                    <p className="text-[10px] text-muted-foreground">Observe database containers and index health status triggers.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Docker Containers toggles */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold font-mono text-slate-300 uppercase">Docker Compose Status</h4>
                      <div className="space-y-2">
                        {containers.map(cont => (
                          <div key={cont.id} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl flex items-center justify-between font-mono text-xs">
                            <div className="flex items-center gap-2">
                              <Server className="h-4 w-4 text-cyan-400" />
                              <div>
                                <span className="font-bold text-slate-200">{cont.name}</span>
                                <span className="text-[9.5px] text-slate-500 block">Port: {cont.port}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={
                                cont.status === 'running' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }>
                                {cont.status.toUpperCase()}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleContainer(cont.id)}
                                className="h-7 text-[8.5px] font-mono uppercase border-white/10"
                              >
                                {cont.status === 'running' ? 'Stop' : 'Start'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* pgvector Index admin */}
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl space-y-3">
                        <h4 className="text-xs font-bold font-mono text-slate-300 uppercase">pgvector Semantic Cache Index</h4>
                        <div className="space-y-1.5 font-mono text-[10px] text-slate-400">
                          <div>Database: <strong className="text-slate-200">postgres:pg17</strong></div>
                          <div>Total Embedded Segments: <strong className="text-slate-200">10,225</strong></div>
                          <div>Re-ranking Algorithm: <strong className="text-slate-200">RRF (Reciprocal Rank Fusion)</strong></div>
                        </div>

                        {isRebuildingIndex ? (
                          <div className="space-y-1.5 pt-2 font-mono">
                            <div className="flex justify-between text-[10px]">
                              <span>Rebuilding HNSW cosine index...</span>
                              <span>{rebuildProgress}%</span>
                            </div>
                            <Progress value={rebuildProgress} className="h-1.5 bg-slate-900" />
                          </div>
                        ) : (
                          <Button
                            onClick={rebuildPgvectorIndex}
                            className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-xs uppercase h-8 mt-2"
                          >
                            Rebuild Similarity Index
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ==================== MOCKUP 6: AGENT-CENTRIC COLLABORATIVE SWARM ==================== */}
        {activeMockup === 'agent-swarm' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-mono uppercase tracking-tight text-slate-200">6. Agent-Centric Swarm Workspace</h2>
              <p className="text-xs text-muted-foreground">Observe and manage active AI agents working collaboratively. Tap agent nodes to override or inspect thoughts stream.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Agent Nodes Visual SVG Graph */}
              <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-900/40 p-6 flex flex-col justify-between min-h-[420px] shadow-xl relative overflow-hidden">
                <div className="absolute top-3 left-3 flex items-center gap-1.5 font-mono text-[9px] text-slate-400 uppercase tracking-widest">
                  <Network className="h-3.5 w-3.5 text-cyan-400 animate-pulse" /> Active Swarm Network Linkages
                </div>

                <div className="flex-1 flex items-center justify-center pt-6">
                  <svg viewBox="0 0 600 300" className="w-full max-w-[500px] h-[250px]">
                    {/* SVG styling */}
                    <style>{`
                      @keyframes flowline {
                        to { stroke-dashoffset: -20; }
                      }
                      .swarm-line {
                        stroke-dasharray: 5 4;
                        animation: flowline 1.5s linear infinite;
                      }
                    `}</style>

                    {/* Orchestration linkages lines */}
                    <line x1="80" y1="150" x2="250" y2="60" stroke="#0ea5e9" strokeWidth="1.5" className="swarm-line" />
                    <line x1="250" y1="60" x2="420" y2="150" stroke="#8b5cf6" strokeWidth="1.5" className="swarm-line" />
                    <line x1="250" y1="240" x2="80" y2="150" stroke="#10b981" strokeWidth="1.5" className="swarm-line" />
                    <line x1="420" y1="150" x2="250" y2="240" stroke="#f59e0b" strokeWidth="1.5" className="swarm-line" />

                    {/* CRM Agent (Left) */}
                    <g onClick={() => setSelectedAgent('CRM')} className="cursor-pointer group">
                      <circle cx="80" cy="150" r="28" fill={selectedAgent === 'CRM' ? '#0ea5e9' : '#1e293b'} fillOpacity="0.2" stroke={selectedAgent === 'CRM' ? '#0ea5e9' : '#334155'} strokeWidth={selectedAgent === 'CRM' ? '2.5' : '1.5'} className={selectedAgent === 'CRM' ? 'drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]' : ''} />
                      <circle cx="80" cy="150" r="5" fill="#0ea5e9" />
                      <text x="80" y="195" fill="#0ea5e9" fontSize="8.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">CRM AGENT</text>
                    </g>

                    {/* Research Agent (Top Center) */}
                    <g onClick={() => setSelectedAgent('Research')} className="cursor-pointer group">
                      <circle cx="250" cy="60" r="28" fill={selectedAgent === 'Research' ? '#0ea5e9' : '#1e293b'} fillOpacity="0.2" stroke={selectedAgent === 'Research' ? '#0ea5e9' : '#334155'} strokeWidth={selectedAgent === 'Research' ? '2.5' : '1.5'} className={selectedAgent === 'Research' ? 'drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]' : ''} />
                      <circle cx="250" cy="60" r="5" fill="#0ea5e9" />
                      <text x="250" y="105" fill="#0ea5e9" fontSize="8.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">RESEARCH AGENT</text>
                    </g>

                    {/* SRE Agent (Bottom Center) */}
                    <g onClick={() => setSelectedAgent('SRE')} className="cursor-pointer group">
                      <circle cx="250" cy="240" r="28" fill={selectedAgent === 'SRE' ? '#10b981' : '#1e293b'} fillOpacity="0.2" stroke={selectedAgent === 'SRE' ? '#10b981' : '#334155'} strokeWidth={selectedAgent === 'SRE' ? '2.5' : '1.5'} className={selectedAgent === 'SRE' ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''} />
                      <circle cx="250" cy="240" r="5" fill="#10b981" />
                      <text x="250" y="285" fill="#10b981" fontSize="8.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">SRE AGENT</text>
                    </g>

                    {/* Media Agent (Right) */}
                    <g onClick={() => setSelectedAgent('Media')} className="cursor-pointer group">
                      <circle cx="420" cy="150" r="28" fill={selectedAgent === 'Media' ? '#8b5cf6' : '#1e293b'} fillOpacity="0.2" stroke={selectedAgent === 'Media' ? '#8b5cf6' : '#334155'} strokeWidth={selectedAgent === 'Media' ? '2.5' : '1.5'} className={selectedAgent === 'Media' ? 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : ''} />
                      <circle cx="420" cy="150" r="5" fill="#8b5cf6" />
                      <text x="420" y="195" fill="#8b5cf6" fontSize="8.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">MEDIA AGENT</text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Agent Console / Thoughts Stream Inspector panel */}
              <div className="space-y-6">
                <div className="tetrel-glass p-5 rounded-2xl border border-white/10 bg-slate-900/40 flex flex-col justify-between min-h-[420px]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block font-mono">Agent Terminal</span>
                      <Badge className="bg-slate-800 text-slate-300 text-[8.5px] uppercase font-mono">
                        {selectedAgent} Agent
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10.5px] font-mono text-slate-400">
                        Status: <strong className="text-emerald-400 font-bold uppercase">{agentStatuses[selectedAgent]}</strong>
                      </div>
                    </div>

                    {/* Thought steps stream */}
                    <div className="space-y-2">
                      <label className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider block">Live Thought Stream</label>
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 font-mono text-[10.5px] text-slate-300 space-y-1.5 min-h-[120px] max-h-[160px] overflow-y-auto leading-relaxed">
                        {agentThoughts[selectedAgent].map((thought, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="text-cyan-500 font-bold shrink-0">›</span>
                            <span>{thought}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tools badges */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider block">Executed Tools</label>
                      <div className="flex flex-wrap gap-1.5">
                        {agentTools[selectedAgent].map(tool => (
                          <Badge key={tool} variant="outline" className="border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[8.5px] font-mono">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Manual Override controls */}
                  <div className="space-y-2 border-t border-white/5 pt-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setAgentStatuses(prev => ({ ...prev, [selectedAgent]: prev[selectedAgent] === 'paused' ? 'idle' : 'paused' }))}
                        className="text-[9px] font-mono uppercase h-8 border-white/10"
                      >
                        {agentStatuses[selectedAgent] === 'paused' ? 'Resume Agent' : 'Pause Agent'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setAgentStatuses(prev => ({ ...prev, [selectedAgent]: 'thinking' }))
                          setTimeout(() => {
                            setAgentStatuses(prev => ({ ...prev, [selectedAgent]: 'executing' }))
                          }, 1000)
                        }}
                        className="text-[9px] font-mono uppercase h-8 text-cyan-400 border-cyan-500/20"
                      >
                        Force Restart
                      </Button>
                    </div>
                    
                    <div className="relative">
                      <Input
                        placeholder="Inject manual directive prompt..."
                        className="bg-slate-950/80 border-white/10 text-[10px] font-mono h-8 rounded-lg pl-3 pr-10"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setAgentStatuses(prev => ({ ...prev, [selectedAgent]: 'thinking' }))
                            setTimeout(() => {
                              setAgentStatuses(prev => ({ ...prev, [selectedAgent]: 'executing' }))
                            }, 1200)
                            const target = e.target as HTMLInputElement
                            target.value = ''
                          }
                        }}
                      />
                      <Send className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================== MOCKUP 7: ENHANCED PERSPECTIVE SELECTOR (PERSPECTIVE+) ==================== */}
        {activeMockup === 'enhanced-perspective' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-mono uppercase tracking-tight text-slate-200">7. Mindset Switcher Dashboard (Perspective+)</h2>
              <p className="text-xs text-muted-foreground">An interactive, bento-styled workspace that shifts dynamic widgets, communication logs, and campaign integrations depending on the active mindset.</p>
            </div>

            {/* Mindset Switcher tabs */}
            <div className="flex flex-col gap-2 p-2 bg-slate-900/60 border border-white/10 rounded-2xl max-w-3xl shadow-xl">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 px-3 pt-1 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-cyan-400 animate-pulse" /> Select Mindset Perspective:
              </span>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
                {(['sales', 'research', 'delivery', 'marketing', 'admin'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={enhancedPerspective === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setEnhancedPerspective(mode)}
                    className={`font-mono text-[10.5px] uppercase h-9 rounded-xl transition-all ${
                      enhancedPerspective === mode 
                        ? 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {mode === 'sales' && 'Sales CRM'}
                    {mode === 'research' && 'Research Hub'}
                    {mode === 'delivery' && 'Project Delivery'}
                    {mode === 'marketing' && 'Marketing'}
                    {mode === 'admin' && 'Administrator'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Main Bento Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Dynamic Mindset Center (Columns 1-3) */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* Sales CRM Mindset */}
                {enhancedPerspective === 'sales' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                    {/* Card 1: Funnel & Campaigns Linkage */}
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl flex flex-col justify-between p-5 min-h-[380px]">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                            <TrendingUp className="h-4 w-4" /> Sales Funnel & Campaigns
                          </span>
                          <Badge className="bg-cyan-500/10 text-cyan-400 text-[9px] border border-cyan-500/20 font-mono font-bold">Conversion: 34.5%</Badge>
                        </div>
                        
                        {/* Funnel Visualizer */}
                        <div className="space-y-2">
                          <label className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider block">CRM Conversion Funnel</label>
                          <div className="space-y-2">
                            {[
                              { stage: 'Leads Ingested', count: 124, pct: 100, color: 'bg-cyan-500/90' },
                              { stage: 'Qualified (Compliance Passed)', count: 98, pct: 79, color: 'bg-cyan-500/70' },
                              { stage: 'Proposals / Notebooks Sent', count: 48, pct: 38, color: 'bg-cyan-500/50' },
                              { stage: 'Negotiation / Milestones Set', count: 24, pct: 19, color: 'bg-cyan-500/30' },
                              { stage: 'Closed Won (Deals Inflight)', count: 12, pct: 9.6, color: 'bg-emerald-500/40' },
                            ].map((s, idx) => (
                              <div key={idx} className="space-y-1 font-mono text-[10px]">
                                <div className="flex justify-between text-[9px] text-slate-300">
                                  <span>{s.stage} ({s.count})</span>
                                  <span className="font-bold">{s.pct}%</span>
                                </div>
                                <div className="h-2 bg-slate-950/60 rounded-full overflow-hidden">
                                  <div className={`h-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Campaigns Linkage list */}
                        <div className="space-y-2 pt-2 border-t border-white/5">
                          <label className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider block">Active Marketing Campaigns Linked</label>
                          <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                            {salesCampaigns.map(camp => (
                              <div key={camp.id} className="p-2 bg-slate-950/40 rounded border border-white/5 flex items-center justify-between text-[10px] font-mono">
                                <span className="text-slate-300 font-bold truncate max-w-[140px]">{camp.name}</span>
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-slate-800 text-slate-400 text-[8.5px] uppercase">{camp.channel}</Badge>
                                  <span className="text-emerald-400 font-bold">+{camp.leadsGenerated} leads</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Card 2: CRM Accounts & Compliance Ledger */}
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Users className="h-4 w-4" /> Active Accounts & Compliance
                          </span>
                          <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono">3 Accounts</Badge>
                        </div>

                        <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                          {[
                            { 
                              id: 'acc-1', 
                              name: 'Acme Security Corp', 
                              dealVal: '$80,000', 
                              prospectStatus: 'Negotiation', 
                              compliance: 'Verified',
                              contacts: [
                                { name: 'Sarah Connor', role: 'IT Sec Director', email: 'sconnor@acmesecurity.com' },
                                { name: 'Marcus Wright', role: 'SRE Lead (Client)', email: 'mwright@acmesecurity.com' }
                              ],
                              overrideReason: ''
                            },
                            { 
                              id: 'acc-2', 
                              name: 'Apex Networks', 
                              dealVal: '$120,000', 
                              prospectStatus: 'Proposal', 
                              compliance: 'Pending',
                              contacts: [
                                { name: 'Bruce Banner', role: 'CISO', email: 'bbanner@apexnet.com' }
                              ],
                              overrideReason: ''
                            },
                            { 
                              id: 'acc-3', 
                              name: 'Global Logistics', 
                              dealVal: '$50,000', 
                              prospectStatus: 'Closed Won', 
                              compliance: 'Failed',
                              contacts: [
                                { name: 'Tony Stark', role: 'CTO', email: 'tstark@globallogistics.com' }
                              ],
                              overrideReason: 'Requires manual override: Foreign jurisdiction regulatory hold (EU GDPR compliance review)'
                            }
                          ].map((acc) => (
                            <div key={acc.id} className="p-3 bg-slate-950/40 rounded-xl border border-white/5 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-100">{acc.name}</span>
                                <span className="text-cyan-400 font-mono font-bold text-xs">{acc.dealVal}</span>
                              </div>
                              
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-slate-400">Stage: <strong className="text-slate-200">{acc.prospectStatus}</strong></span>
                                
                                {/* Compliance check pill */}
                                <div className="flex items-center gap-1.5">
                                  {acc.compliance === 'Verified' && (
                                    <span className="flex items-center gap-1 text-emerald-400 font-bold animate-[pulse_2s_infinite]">
                                      <span className="text-xs">✓</span> Verified
                                    </span>
                                  )}
                                  {acc.compliance === 'Pending' && (
                                    <span className="flex items-center gap-1 text-amber-400 font-bold animate-pulse">
                                      <span className="text-[10px] w-2 h-2 rounded-full bg-amber-400 shrink-0" /> Pending
                                    </span>
                                  )}
                                  {acc.compliance === 'Failed' && (
                                    <span className="flex items-center gap-1 text-red-500 font-bold">
                                      <span className="text-xs">✗</span> Blocked
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Contacts List */}
                              <div className="pl-2.5 border-l border-white/5 space-y-1 py-0.5">
                                {acc.contacts.map((c, cIdx) => (
                                  <div key={cIdx} className="text-[9.5px] font-mono text-slate-400 flex items-center gap-1">
                                    <span className="text-slate-300">{c.name}</span> ({c.role}) • <span className="text-slate-500 truncate max-w-[120px]">{c.email}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Failed compliance reason */}
                              {acc.compliance === 'Failed' && (
                                <div className="mt-1 p-2 bg-red-950/15 border border-red-500/20 text-red-400 rounded text-[9px] font-mono space-y-1.5 leading-relaxed">
                                  <div><strong>Compliance Block:</strong> {acc.overrideReason}</div>
                                  <Button size="sm" variant="outline" className="h-6 text-[8.5px] uppercase text-red-400 border-red-500/20 bg-red-950/20 hover:bg-red-950/30">
                                    Apply Audit Override
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Research Hub Mindset */}
                {enhancedPerspective === 'research' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                    {/* Card 1: Pristine Search & Citation Inspector */}
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between relative overflow-hidden">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Search className="h-4 w-4" /> Semantic Research Engine
                          </span>
                          <Badge className="bg-sky-500/10 text-sky-400 text-[9px] border border-sky-500/20 font-mono">HNSW Cosine</Badge>
                        </div>

                        {/* Query bar */}
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                value={researchSearchQuery}
                                onChange={(e) => setResearchSearchQuery(e.target.value)}
                                placeholder="Search corpus (e.g. NIST ICS insulation)..."
                                className="pl-9 bg-slate-950/80 border-white/10 text-xs font-mono h-8 rounded-lg"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setResearchSearchResults([
                                      { 
                                        id: 'chunk-1',
                                        text: 'NIST SP 800-82 Rev 3 outlines strict security controls for Industrial Control Systems (ICS). A primary defense is logical segment insulation [1], which isolates critical controller interfaces from the corporate network.',
                                        score: 0.91,
                                        source: 'nist_sp_800_82_rev3.pdf'
                                      },
                                      {
                                        id: 'chunk-2',
                                        text: 'According to CISA SCADA Hardening Guidelines [2], configuring pgvector HNSW similarity thresholds dynamically prevents out-of-distribution (OOD) query latency spikes during high-load security audits.',
                                        score: 0.84,
                                        source: 'cisa_scada_hardening_guidelines.pdf'
                                      }
                                    ])
                                  }
                                }}
                              />
                            </div>
                            <Button 
                              size="sm"
                              onClick={() => {
                                setResearchSearchResults([
                                  { 
                                    id: 'chunk-1',
                                    text: 'NIST SP 800-82 Rev 3 outlines strict security controls for Industrial Control Systems (ICS). A primary defense is logical segment insulation [1], which isolates critical controller interfaces from the corporate network.',
                                    score: 0.91,
                                    source: 'nist_sp_800_82_rev3.pdf'
                                  },
                                  {
                                    id: 'chunk-2',
                                    text: 'According to CISA SCADA Hardening Guidelines [2], configuring pgvector HNSW similarity thresholds dynamically prevents out-of-distribution (OOD) query latency spikes during high-load security audits.',
                                    score: 0.84,
                                    source: 'cisa_scada_hardening_guidelines.pdf'
                                  }
                                ])
                              }}
                              className="h-8 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold font-mono text-xs uppercase"
                            >
                              Search
                            </Button>
                          </div>

                          {/* Engine selector */}
                          <div className="flex items-center gap-4 text-[10px] font-mono">
                            <span className="text-slate-400">Search Engine Mode:</span>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="radio" name="search_engine_mode_enhanced" defaultChecked />
                              <span className="text-sky-400 font-bold">Local KB</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="radio" name="search_engine_mode_enhanced" />
                              <span className="text-slate-400">Hybrid Search (RRF)</span>
                            </label>
                          </div>
                        </div>

                        {/* Results with citation Popover triggers */}
                        <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                          {researchSearchResults.length > 0 ? (
                            researchSearchResults.map((res) => (
                              <div key={res.id} className="p-3 bg-slate-950/40 rounded-xl border border-white/5 space-y-2 text-[11px] leading-relaxed">
                                <div className="flex justify-between items-center text-[9px] font-mono">
                                  <span className="text-sky-400 truncate max-w-[150px] font-bold">📄 {res.source}</span>
                                  <span className="text-emerald-400 font-bold">Score: {res.score}</span>
                                </div>
                                <div className="text-slate-200">
                                  {res.id === 'chunk-1' ? (
                                    <>
                                      NIST SP 800-82 Rev 3 outlines strict security controls for Industrial Control Systems (ICS). A primary defense is logical segment insulation{' '}
                                      <button 
                                        onClick={() => setActiveCitationPopover(activeCitationPopover === 'cit-1' ? null : 'cit-1')}
                                        className="text-sky-400 hover:text-sky-300 font-bold hover:underline"
                                      >
                                        [1]
                                      </button>
                                      , which isolates critical controller interfaces from the corporate network.
                                    </>
                                  ) : (
                                    <>
                                      According to CISA SCADA Hardening Guidelines{' '}
                                      <button 
                                        onClick={() => setActiveCitationPopover(activeCitationPopover === 'cit-2' ? null : 'cit-2')}
                                        className="text-sky-400 hover:text-sky-300 font-bold hover:underline"
                                      >
                                        [2]
                                      </button>
                                      , configuring pgvector HNSW similarity thresholds dynamically prevents out-of-distribution (OOD) query latency spikes during high-load security audits.
                                    </>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-slate-500 text-[10.5px] font-mono uppercase border border-dashed border-white/5 rounded-xl">
                              Type query & press enter to return citations
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Popover overlay for Citations */}
                      {activeCitationPopover && (
                        <div className="absolute inset-x-4 bottom-4 p-4 bg-slate-950 border border-sky-500/30 rounded-xl space-y-2 shadow-2xl z-30 animate-in slide-in-from-bottom-2 duration-200">
                          <div className="flex justify-between items-center border-b border-white/5 pb-1 text-[9px] font-mono">
                            <span className="text-sky-400 font-bold">Citation Inspector</span>
                            <button onClick={() => setActiveCitationPopover(null)} className="text-slate-500 hover:text-slate-300">✖</button>
                          </div>
                          {activeCitationPopover === 'cit-1' ? (
                            <div className="space-y-1">
                              <h5 className="text-[11px] font-bold text-slate-100">NIST SP 800-82 Rev 3: Guide to Industrial Control Systems (ICS) Security</h5>
                              <div className="text-[9.5px] text-slate-400 font-mono">Authors: Stouffer, Lightman, Scarfone • Citations: 412</div>
                              <p className="text-[10px] text-slate-300 italic">"Logical segment insulation isolates critical process-control assets by creating strict firewall rules and air-gap proxies."</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <h5 className="text-[11px] font-bold text-slate-100">CISA SCADA Network Hardening Practices</h5>
                              <div className="text-[9.5px] text-slate-400 font-mono">Authors: CISA Threat Analysis Team • Citations: 128</div>
                              <p className="text-[10px] text-slate-300 italic">"pgvector indexes with HNSW configurations require dynamic threshold adjustments to match local KB context."</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>

                    {/* Card 2: Complete Document Management Panel */}
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Folder className="h-4 w-4" /> Corpus Document Management
                          </span>
                          <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono">{researchDocsList.length} Files</Badge>
                        </div>

                        {/* Document tree view */}
                        <div className="space-y-2">
                          <label className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider block">Document Tree (Provenances & Extracted Mks)</label>
                          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                            {researchDocsList.map(doc => (
                              <div 
                                key={doc.id} 
                                className={`p-2.5 rounded-lg border text-[10.5px] font-mono cursor-pointer transition-all ${
                                  selectedResearchDoc?.id === doc.id 
                                    ? 'bg-sky-500/10 border-sky-500/30' 
                                    : 'bg-slate-950/40 border-white/5 hover:border-white/10'
                                }`}
                                onClick={() => setSelectedResearchDoc(doc)}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-200 font-bold truncate max-w-[160px]">📄 {doc.name}</span>
                                  <span className="text-slate-500 text-[8.5px]">{doc.size}</span>
                                </div>
                                <div className="flex justify-between text-[8px] text-slate-500 mt-1">
                                  <span>Author: {doc.addedBy}</span>
                                  <span>Date: {doc.date}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Document actions & Preview */}
                        {selectedResearchDoc ? (
                          <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2 animate-in fade-in duration-200">
                            <div className="flex justify-between items-center border-b border-white/5 pb-1 text-[9.5px] font-mono">
                              <span className="text-sky-400 font-bold uppercase">Extracted Markdown (Preview)</span>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    const newName = prompt('Enter new document name:', selectedResearchDoc.name)
                                    if (newName) {
                                      setResearchDocsList(prev => prev.map(d => d.id === selectedResearchDoc.id ? { ...d, name: newName } : d))
                                      setSelectedResearchDoc({ ...selectedResearchDoc, name: newName })
                                    }
                                  }}
                                  className="text-sky-400 hover:text-sky-300 text-[8.5px] uppercase"
                                >
                                  Rename
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirm('Delete document from postgres storage?')) {
                                      setResearchDocsList(prev => prev.filter(d => d.id !== selectedResearchDoc.id))
                                      setSelectedResearchDoc(null)
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300 text-[8.5px] uppercase"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-300 leading-relaxed max-h-[80px] overflow-y-auto italic font-sans">
                              "{selectedResearchDoc.textPreview}"
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-slate-950/20 rounded-xl border border-dashed border-white/5 text-center text-slate-500 text-[9px] font-mono uppercase">
                            Select a document above to rename, delete or view extracted markdown
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                )}

                {/* Project Delivery Mindset */}
                {enhancedPerspective === 'delivery' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                    {/* Column 1: Organization & Facility Hierarchy */}
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Layers className="h-4 w-4" /> Operations Portfolio Tree
                          </span>
                          <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono">Nest: Org-Proj-Fac</Badge>
                        </div>

                        {/* Tree View showing nested master organization, projects and facilities */}
                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 text-[11px] font-mono">
                          <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                            <FolderOpen className="h-4 w-4 text-emerald-400" /> ACME Corp (Master Organization)
                          </div>
                          
                          <div className="pl-4 space-y-2 border-l border-white/10 ml-2">
                            {deliveryNestedTree.projects.map(proj => (
                              <div key={proj.id} className="space-y-1">
                                <button 
                                  onClick={() => {
                                    setDeliveryNestedTree(prev => ({
                                      ...prev,
                                      projects: prev.projects.map(p => p.id === proj.id ? { ...p, isOpen: !p.isOpen } : p)
                                    }))
                                  }}
                                  className="flex items-center gap-1 text-slate-200 hover:text-emerald-400 text-[10.5px]"
                                >
                                  <span className="text-[9px] text-slate-500">{proj.isOpen ? '▼' : '▶'}</span>
                                  <span>📂 {proj.name}</span>
                                </button>

                                {proj.isOpen && (
                                  <div className="pl-4 space-y-1 border-l border-white/5 ml-1.5">
                                    {proj.facilities.map(fac => (
                                      <button
                                        key={fac.id}
                                        onClick={() => setSelectedFacilityId(fac.id)}
                                        className={`w-full text-left p-1.5 rounded truncate text-[10px] flex justify-between items-center transition-colors ${
                                          selectedFacilityId === fac.id 
                                            ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20' 
                                            : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                      >
                                        <span className="truncate">🏢 {fac.name}</span>
                                        <Badge className="bg-slate-900 text-slate-400 text-[8px] font-mono scale-90">{fac.complianceScore}</Badge>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Selected Facility Details Card */}
                        {(() => {
                          const allFacs = deliveryNestedTree.projects.flatMap(p => p.facilities)
                          const fac = allFacs.find(f => f.id === selectedFacilityId)
                          if (!fac) return null
                          return (
                            <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2 animate-in fade-in duration-200">
                              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                                🏢 Facility Details: {fac.name.split(' ')[0]}
                              </div>
                              <div className="space-y-1.5 font-mono text-[9px] text-slate-300">
                                <div className="text-slate-400">SRE Config: <span className="text-slate-200 font-bold">{fac.SREConfig}</span></div>
                                <div className="text-slate-400">Compliance Audit: <span className="text-emerald-400 font-bold">{fac.complianceScore} Passed</span></div>
                                <div className="text-slate-400 truncate">Linked Document: <span className="text-cyan-400 hover:underline cursor-pointer">📄 {fac.docName}</span></div>
                              </div>
                              <Button size="sm" variant="outline" className="h-6 w-full text-[8.5px] uppercase border-white/10 hover:bg-slate-900 text-slate-300 mt-1">
                                Configure Facility Cluster
                              </Button>
                            </div>
                          )
                        })()}
                      </div>
                    </Card>

                    {/* Column 2: Kanban tasks list & milestones */}
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Project Tasks & Milestones
                          </span>
                          
                          {projectsList.length > 0 && (
                            <div className="flex items-center gap-2">
                              {/* User Filter Dropdown */}
                              <select
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                                className="bg-slate-950/80 border border-white/10 text-[9px] font-mono rounded-md px-2 py-0.5 text-slate-300 focus:outline-none focus:border-emerald-500/50"
                              >
                                <option value="all">All Users</option>
                                <option value="unassigned">Unassigned</option>
                                {usersList.map((u: any) => {
                                  const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username
                                  return (
                                    <option key={u.id} value={name}>
                                      {name}
                                    </option>
                                  )
                                })}
                              </select>

                              {/* Manage Users Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsUserModalOpen(true)}
                                className="border-white/10 hover:bg-slate-900 text-[8px] font-mono h-5 px-1.5 uppercase rounded-md text-slate-300"
                              >
                                Users
                              </Button>

                              <div className="flex gap-1 p-0.5 bg-slate-950/60 border border-white/10 rounded-lg">
                                <Button
                                  size="sm"
                                  variant={deliveryTasksView === 'kanban' ? 'default' : 'ghost'}
                                  onClick={() => setDeliveryTasksView('kanban')}
                                  className="text-[8px] font-mono h-5 px-1.5 uppercase rounded-md"
                                >
                                  Kanban
                                </Button>
                                <Button
                                  size="sm"
                                  variant={deliveryTasksView === 'table' ? 'default' : 'ghost'}
                                  onClick={() => setDeliveryTasksView('table')}
                                  className="text-[8px] font-mono h-5 px-1.5 uppercase rounded-md"
                                >
                                  Table
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {projectsList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 border border-dashed border-white/10 rounded-2xl bg-slate-950/40 p-6">
                            <span className="text-xs text-muted-foreground font-mono">NO ACTIVE PROJECTS FOUND</span>
                            <Button 
                              onClick={handleSeedProject}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs uppercase"
                            >
                              Seed Default Project & Tasks
                            </Button>
                          </div>
                        ) : (
                          <>
                            {deliveryTasksView === 'kanban' ? (
                              <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
                                {[
                                  { id: 'todo', label: 'Todo' },
                                  { id: 'in_progress', label: 'In Progress' },
                                  { id: 'in_review', label: 'In Review' },
                                  { id: 'done', label: 'Done' }
                                ].map(col => {
                                  const dbTasks = activeDbProject?.tasks || []
                                  const filteredTasks = dbTasks.filter((t: any) => {
                                    if (userFilter === 'all') return true
                                    if (userFilter === 'unassigned') return !t.assigned_to || t.assigned_to === 'Unassigned'
                                    return t.assigned_to === userFilter
                                  })
                                  const tasks = filteredTasks.filter((t: any) => {
                                    const s = (t.status || 'todo').toLowerCase().replace(' ', '_')
                                    return s === col.id
                                  })
                                  
                                  return (
                                    <div key={col.id} className="p-2 bg-slate-950/60 rounded-xl border border-white/5 space-y-1.5 min-h-[110px]">
                                      <div className="text-[8.5px] font-bold font-mono text-slate-300 uppercase border-b border-white/5 pb-1 flex justify-between">
                                        <span>{col.label}</span>
                                        <span className="text-slate-500">({tasks.length})</span>
                                      </div>
                                      <div className="space-y-1">
                                        {tasks.map((t: any) => {
                                          const taskIndex = activeDbProject.tasks.findIndex((item: any) => item.title === t.title)
                                          
                                          return (
                                            <div 
                                              key={t.title || t.name} 
                                              onClick={() => handleMoveTask(taskIndex, t.status)}
                                              className="p-1.5 bg-slate-900/60 border border-white/10 hover:border-emerald-500/30 rounded cursor-pointer transition-all space-y-1 text-[9px] font-mono"
                                            >
                                              <div className="font-bold text-slate-200 truncate leading-tight">{t.title || t.name}</div>
                                              <div className="flex justify-between text-[8px] text-slate-500">
                                                <span>{t.assigned_to || 'Unassigned'}</span>
                                                <span className="text-emerald-400 font-bold">{t.priority || 'Medium'}</span>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/40 max-h-[220px] overflow-y-auto">
                                <table className="w-full text-left font-mono text-[10px]">
                                  <thead>
                                    <tr className="bg-slate-900/60 border-b border-white/10 text-slate-400">
                                      <th className="p-2">Task</th>
                                      <th className="p-2">Assignee</th>
                                      <th className="p-2">Priority</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {(activeDbProject?.tasks || []).map((t: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-slate-900/30 text-slate-300">
                                        <td className="p-2 truncate max-w-[100px] font-bold">{t.title || t.name}</td>
                                        <td className="p-2 text-emerald-400">{t.assigned_to || 'Unassigned'}</td>
                                        <td className="p-2">{t.priority || 'Medium'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Add Task Trigger */}
                            <div className="flex justify-end pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsAddTaskOpen(true)}
                                className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[8.5px] font-mono h-6 uppercase hover:bg-emerald-500/15"
                              >
                                + Add Task
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </Card>

                    {/* Column 3: Communication logs and SRE managers Contacts */}
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Clock className="h-4 w-4" /> Activity & Communications
                          </span>
                          <Badge className="bg-emerald-500/10 text-emerald-400 text-[9px] border border-emerald-500/20 font-mono">Live Logs</Badge>
                        </div>

                        {/* Live email/slack logs */}
                        <div className="space-y-2 font-mono text-[9px]">
                          <label className="text-[8.5px] text-slate-400 uppercase tracking-wider block">Communication Stream</label>
                          <div className="p-2.5 bg-slate-950/80 border border-white/5 rounded-xl space-y-1.5 max-h-[140px] overflow-y-auto leading-relaxed text-slate-400">
                            <div><span className="text-slate-500">[17:02]</span> <strong className="text-slate-200">Email:</strong> Sarah Connor Approved SCADA insulation blueprints for Facility 1.</div>
                            <div><span className="text-slate-500">[16:45]</span> <strong className="text-emerald-400">Slack:</strong> SRE Agent Alpha successfully verified backup configuration on Facility 2.</div>
                            <div><span className="text-slate-500">[15:10]</span> <strong className="text-slate-200">Email:</strong> CISO Bruce Banner requested audit log download link for compliance validation.</div>
                          </div>
                        </div>

                        {/* Contacts Directory */}
                        <div className="space-y-1.5 border-t border-white/5 pt-3">
                          <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider block">Stakeholder contacts</label>
                          <div className="space-y-1">
                            {[
                              { name: 'SRE Agent Alpha', role: 'Assigned Lead', email: 'alpha@tetrel.io' },
                              { name: 'SRE Agent Beta', role: 'Backup Support', email: 'beta@tetrel.io' },
                              { name: 'Marcus Wright', role: 'Client Contact', email: 'mwright@acmesecurity.com' }
                            ].map((cnt, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[9px] font-mono p-1 bg-slate-950/40 rounded border border-white/5">
                                <span className="text-slate-300 font-bold">{cnt.name}</span>
                                <span className="text-slate-500">{cnt.role}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Marketing Studio Mindset */}
                {enhancedPerspective === 'marketing' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                    {/* Card 1: Social Media Scheduler Queue & Campaign Analytics */}
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Mic className="h-4 w-4" /> Social Scheduler & Campaigns
                          </span>
                          <Badge className="bg-violet-500/10 text-violet-400 text-[9px] border border-violet-500/20 font-mono font-bold">Linked to Sales</Badge>
                        </div>

                        {/* Campaign Analytics */}
                        <div className="grid grid-cols-3 gap-2 font-mono text-center">
                          <div className="p-2 bg-slate-950/60 rounded-lg border border-white/5">
                            <span className="text-[8.5px] text-slate-500 block">LINKEDIN</span>
                            <span className="text-sm font-bold text-violet-400">{socialSchedulerPosts.filter(p => p.platform === 'LinkedIn').length} posts</span>
                          </div>
                          <div className="p-2 bg-slate-950/60 rounded-lg border border-white/5">
                            <span className="text-[8.5px] text-slate-500 block">X/TWITTER</span>
                            <span className="text-sm font-bold text-violet-400">{socialSchedulerPosts.filter(p => p.platform === 'X/Twitter').length} posts</span>
                          </div>
                          <div className="p-2 bg-slate-950/60 rounded-lg border border-white/5">
                            <span className="text-[8.5px] text-slate-500 block">BLOGS</span>
                            <span className="text-sm font-bold text-violet-400">{socialSchedulerPosts.filter(p => p.platform === 'Blog').length} posts</span>
                          </div>
                        </div>

                        {/* Visual Queue Timeline */}
                        <div className="space-y-2">
                          <label className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider block">Visual Schedule Timeline</label>
                          <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
                            {socialSchedulerPosts.map(post => (
                              <div key={post.id} className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5 flex items-center justify-between gap-3 text-[10px] font-mono">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Badge className="bg-violet-500/20 text-violet-400 text-[8px] uppercase">{post.platform}</Badge>
                                  <span className="text-slate-200 font-bold truncate max-w-[160px]">{post.title}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[8.5px] text-slate-500">{post.date.split(' ')[0]}</span>
                                  <Badge className={
                                    post.status === 'Published' 
                                      ? 'bg-emerald-500/20 text-emerald-400 text-[8.5px] border border-emerald-500/30' 
                                      : post.status === 'Active' 
                                        ? 'bg-cyan-500/20 text-cyan-400 text-[8.5px] border border-cyan-500/30 animate-pulse'
                                        : 'bg-slate-800 text-slate-400 text-[8.5px]'
                                  }>
                                    {post.status.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Card 2: Voice Generator Sandbox & Campaign ROI linkages */}
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4" /> AI Voice & Media Sandbox
                          </span>
                          <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono">ElevenLabs / Kokoro</Badge>
                        </div>

                        {/* Script Editor & Voice Actor Portraits */}
                        <div className="space-y-2">
                          <label className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider block">Script Input</label>
                          <textarea
                            value={marketingAudioScript}
                            onChange={(e) => setMarketingAudioScript(e.target.value)}
                            rows={2}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-500"
                            placeholder="Write script for voice synthesis..."
                          />
                        </div>

                        {/* Voice actor selection */}
                        <div className="space-y-2">
                          <label className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider block">Voice Actor (Speaker profile)</label>
                          <div className="flex gap-3 items-center justify-center">
                            {[
                              { id: 'v1', name: 'Adam (ElevenLabs)', init: 'A', color: 'bg-violet-600' },
                              { id: 'v2', name: 'Bella (Kokoro)', init: 'B', color: 'bg-cyan-600' },
                              { id: 'v3', name: 'Charlie (Kokoro)', init: 'C', color: 'bg-emerald-600' },
                            ].map(voice => (
                              <button 
                                key={voice.id}
                                onClick={() => setSelectedMarketingVoice(voice.id)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-slate-100 font-bold border transition-all ${
                                  selectedMarketingVoice === voice.id 
                                    ? 'border-violet-400 scale-115 ring-2 ring-violet-500/20' 
                                    : 'border-white/10 opacity-70 hover:opacity-100'
                                } ${voice.color}`}
                              >
                                {voice.init}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Generate audio / wave animation */}
                        <div className="space-y-2">
                          {isGeneratingAudio ? (
                            <div className="flex items-center justify-center gap-1.5 h-8 bg-slate-950/60 rounded-lg border border-violet-500/20">
                              <div className="w-1.5 bg-violet-400 rounded-full h-2 animate-[pulse_0.8s_infinite_100ms]" />
                              <div className="w-1.5 bg-violet-400 rounded-full h-4 animate-[pulse_0.8s_infinite_200ms]" />
                              <div className="w-1.5 bg-violet-300 rounded-full h-3 animate-[pulse_0.8s_infinite_300ms]" />
                              <div className="w-1.5 bg-violet-400 rounded-full h-5 animate-[pulse_0.8s_infinite_400ms]" />
                              <span className="text-[9px] font-mono text-violet-400 uppercase ml-2">Rendering Audio File...</span>
                            </div>
                          ) : (
                            <Button
                              onClick={() => {
                                setIsGeneratingAudio(true)
                                setTimeout(() => {
                                  setIsGeneratingAudio(false)
                                  setIsAudioGenerated(true)
                                }, 1500)
                              }}
                              className="w-full h-8 bg-violet-500 hover:bg-violet-600 text-slate-950 font-bold font-mono text-xs uppercase rounded-lg"
                            >
                              Generate Podcast Audio
                            </Button>
                          )}

                          {isAudioGenerated && !isGeneratingAudio && (
                            <div className="p-2.5 bg-slate-950/60 border border-white/5 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                              <div className="flex justify-between items-center text-[9px] font-mono">
                                <span className="text-violet-400 font-bold">Generated Podcast Output (Waveform)</span>
                                <span className="text-slate-500">Duration: 1:45</span>
                              </div>
                              
                              <div className="flex items-center justify-center gap-1 h-6 pt-1">
                                {[4, 8, 12, 16, 10, 6, 8, 14, 18, 12, 6, 4, 10, 16, 20, 14, 8, 4].map((h, i) => (
                                  <div key={i} className="w-1 bg-violet-400 rounded-full" style={{ height: `${h}px` }} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Administrator Mindset */}
                {enhancedPerspective === 'admin' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                    {/* Card 1: Docker Compose Status */}
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Server className="h-4 w-4 text-cyan-400 animate-pulse" /> Docker Compose Services
                          </span>
                          <Badge className="bg-cyan-500/10 text-cyan-400 text-[9px] border border-cyan-500/20 font-mono font-bold">Containers Active</Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider block">Container Status Dashboard</label>
                          <div className="grid grid-cols-1 gap-2">
                            {containers.map(cont => (
                              <div key={cont.id} className="p-2.5 bg-slate-950/40 border border-white/5 rounded-xl flex items-center justify-between font-mono text-[10px]">
                                <div>
                                  <span className="font-bold text-slate-200 block truncate max-w-[120px]">{cont.name}</span>
                                  <span className="text-[8.5px] text-slate-500 block">Port: {cont.port}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge className={`text-[8px] scale-90 ${
                                    cont.status === 'running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  }`}>
                                    {cont.status.toUpperCase()}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleContainer(cont.id)}
                                    className="h-6 text-[8px] font-mono px-1.5 border-white/10 uppercase"
                                  >
                                    {cont.status === 'running' ? 'Stop' : 'Start'}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Card 2: pgvector Index telemetry */}
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Database className="h-4 w-4" /> pgvector Similarity Telemetry
                          </span>
                          <Badge className="bg-cyan-500/10 text-cyan-400 text-[9px] border border-cyan-500/20 font-mono font-bold">HNSW Index</Badge>
                        </div>

                        <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-2.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Index Metrics</span>
                          <div className="grid grid-cols-2 gap-4 font-mono text-[9.5px] text-slate-400">
                            <div>
                              <div>Model: <strong className="text-slate-200">text-embedding-3-small</strong></div>
                              <div>Dims: <strong className="text-slate-200">1536</strong></div>
                            </div>
                            <div>
                              <div>RAM: <strong className="text-slate-200">14.2 MB</strong></div>
                              <div>Cache: <strong className="text-emerald-400 font-bold">92.4%</strong></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {isRebuildingIndex ? (
                          <div className="space-y-1.5 font-mono">
                            <div className="flex justify-between text-[9px]">
                              <span>Rebuilding similarity index...</span>
                              <span>{rebuildProgress}%</span>
                            </div>
                            <Progress value={rebuildProgress} className="h-1 bg-slate-900" />
                          </div>
                        ) : (
                          <Button
                            onClick={rebuildPgvectorIndex}
                            className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-[10px] uppercase h-8 mt-1"
                          >
                            Rebuild Similarity Index
                          </Button>
                        )}
                      </div>
                    </Card>
                  </div>
                )}

              </div>

              {/* Mindset Assistant Sidebar (Right Column) */}
              <div className="space-y-6">
                <div className="tetrel-glass p-5 rounded-2xl border border-white/10 bg-slate-900/40 flex flex-col justify-between min-h-[300px]">
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block font-mono border-b border-white/5 pb-1">Mindset Assistant</span>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                      {enhancedPerspective === 'sales' && 'Active prompts focus on deal values, conversion metrics, marketing campaign alignment, and account KYC checks.'}
                      {enhancedPerspective === 'research' && 'Active prompts target Local vs Hybrid queries, document hierarchy renaming/deleting, and popover citations.'}
                      {enhancedPerspective === 'delivery' && 'Active prompts focus on Organization-to-Facility project portfolios, SRE contact details, SRE task Kanban updates, and live communication logs.'}
                      {enhancedPerspective === 'marketing' && 'Active prompts target podcast script audio rendering, channel analytics (LinkedIn, X, Blogs), scheduling queues, and campaign-sales linkages.'}
                      {enhancedPerspective === 'admin' && 'Active prompts focus on system health monitoring, Docker Compose lifecycle management, and vector database similarity optimization.'}
                    </p>

                    <div className="space-y-1.5 pt-2">
                      <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-wider block">Suggested Actions:</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (enhancedPerspective === 'sales') setAiCommand('Calculate pipeline conversion funnel')
                          if (enhancedPerspective === 'research') setAiCommand('Query document tree metadata')
                          if (enhancedPerspective === 'delivery') setAiCommand('Trace ACME Texas plant SRE config')
                          if (enhancedPerspective === 'marketing') setAiCommand('Schedule upcoming LinkedIn post')
                          if (enhancedPerspective === 'admin') setAiCommand('Restart all backend containers')
                        }}
                        className="w-full text-left p-2 rounded bg-slate-950/60 hover:bg-slate-950 border border-white/5 text-[10px] font-mono text-slate-300 transition-colors"
                      >
                        {enhancedPerspective === 'sales' && 'Calculate pipeline conversion funnel'}
                        {enhancedPerspective === 'research' && 'Query document tree metadata'}
                        {enhancedPerspective === 'delivery' && 'Trace ACME Texas plant SRE config'}
                        {enhancedPerspective === 'marketing' && 'Schedule upcoming LinkedIn post'}
                        {enhancedPerspective === 'admin' && 'Restart all backend containers'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Option 7 Modals */}
        <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
          <DialogContent className="bg-slate-950 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-emerald-400 font-mono uppercase text-sm">Add Project Task</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Create a new task for the active project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 text-xs font-mono">
              <div className="space-y-1">
                <Label className="text-slate-300">Task Title</Label>
                <Input
                  placeholder="e.g. Validate backup scripts"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="bg-slate-900 border-white/10 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-300">Assignee</Label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-md p-2 text-xs text-white"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {usersList.map((u: any) => {
                      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username
                      return <option key={u.id} value={fullName}>{fullName}</option>
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300">Priority</Label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-md p-2 text-xs text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddTaskOpen(false)} className="text-xs">Cancel</Button>
              <Button
                onClick={() => {
                  if (!newTaskTitle) return
                  if (!activeDbProject) {
                    toast.error('No active project found in database')
                    return
                  }
                  addTaskMutation.mutate({
                    projectId: activeDbProject.id,
                    data: {
                      title: newTaskTitle,
                      assigned_to: newTaskAssignee || 'Unassigned',
                      priority: newTaskPriority,
                      status: 'todo'
                    }
                  }, {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: ['projects'] })
                      setNewTaskTitle('')
                      setNewTaskAssignee('')
                      setNewTaskPriority('medium')
                      setIsAddTaskOpen(false)
                      toast.success('Task added successfully')
                    }
                  })
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
              >
                Add Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
          <DialogContent className="bg-slate-950 border-white/10 text-white max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-emerald-400 font-mono uppercase text-sm">User Directory & CRUD Manager</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Add, remove, or modify users in SurrealDB.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-2 text-xs font-mono">
              {/* User Create Form */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
                <span className="text-[10px] text-cyan-400 font-bold block">➕ CREATE NEW USER</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-400">Username</Label>
                    <Input
                      placeholder="jdoe"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="bg-slate-950 border-white/10 h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400">Email</Label>
                    <Input
                      placeholder="john@tetrel.ai"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="bg-slate-950 border-white/10 h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-slate-400">First Name</Label>
                    <Input
                      placeholder="John"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      className="bg-slate-950 border-white/10 h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400">Last Name</Label>
                    <Input
                      placeholder="Doe"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      className="bg-slate-950 border-white/10 h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400">Role</Label>
                    <Input
                      placeholder="SRE Manager"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="bg-slate-950 border-white/10 h-8 text-xs"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (!newUsername) return
                    createUserMutation.mutate({
                      username: newUsername,
                      first_name: newFirstName,
                      last_name: newLastName,
                      email: newEmail,
                      role: newRole
                    }, {
                      onSuccess: () => {
                        setNewUsername('')
                        setNewFirstName('')
                        setNewLastName('')
                        setNewEmail('')
                        setNewRole('')
                        toast.success('User created successfully')
                      }
                    })
                  }}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8"
                >
                  Create User
                </Button>
              </div>

              {/* Users List */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Active System Users</span>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                  {usersList.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/50 text-center py-4">No users in database.</p>
                  ) : (
                    usersList.map((u: any) => (
                      <div key={u.id} className="flex justify-between items-center p-2.5 bg-slate-900 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                        <div>
                          <span className="font-bold text-white text-xs">
                            {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {u.role || 'User'} ({u.email || 'No email'})
                          </span>
                        </div>
                        <Button
                          onClick={() => {
                            deleteUserMutation.mutate(u.id, {
                              onSuccess: () => {
                                toast.success('User deleted successfully')
                              }
                            })
                          }}
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2 text-[10px]"
                        >
                          Delete
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUserModalOpen(false)} className="text-xs">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
      </div>
    </AppShell>
  )
}
