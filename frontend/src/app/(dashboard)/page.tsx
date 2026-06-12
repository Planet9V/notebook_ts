'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useProjects, useAddTask, useUpdateTask, useCreateProject } from '@/lib/hooks/use-projects'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/lib/hooks/use-users'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCustomers, useCreateCustomer, useUpdateCustomer } from '@/lib/hooks/use-customers'
import { useNotebooks, useCreateNotebook } from '@/lib/hooks/use-notebooks'
import { useUpdateSource, useDeleteSource } from '@/lib/hooks/use-sources'
import { useLocations, useCreateLocation, useLocation } from '@/lib/hooks/use-locations'
import { useActivities, useCreateActivity } from '@/lib/hooks/use-activities'
import { useSearch } from '@/lib/hooks/use-search'
import { useScheduledEpisodes } from '@/lib/hooks/use-podcasts'
import { sourcesApi } from '@/lib/api/sources'
import { apiClient } from '@/lib/api/client'
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
  Loader2,
} from 'lucide-react'

export default function MockupsPage() {


  // State for Mockup 7 (Enhanced Perspective Selector)
  const [enhancedPerspective, setEnhancedPerspective] = useState<'sales' | 'research' | 'delivery' | 'marketing' | 'admin'>('sales')

  // Live Database Queries & Mutations for Option 7
  const queryClient = useQueryClient()
  const { data: projectsList = [], refetch: refetchProjects } = useProjects()
  const { data: usersList = [], refetch: refetchUsers } = useUsers()

  const { data: customersList = [] } = useCustomers()
  const { data: notebooksList = [] } = useNotebooks()
  const { data: scheduledEpisodes = [] } = useScheduledEpisodes()

  const { data: globalSources = [], refetch: refetchGlobalSources } = useQuery({
    queryKey: ['sources', 'global'],
    queryFn: () => sourcesApi.list(),
  })

  const searchMutation = useSearch()

  const addTaskMutation = useAddTask()
  const updateTaskMutation = useUpdateTask()
  const createProjectMutation = useCreateProject()

  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()

  const createCustomerMutation = useCreateCustomer()
  const updateCustomerMutation = useUpdateCustomer()
  const createNotebookMutation = useCreateNotebook()

  const updateSourceMutation = useUpdateSource()
  const deleteSourceMutation = useDeleteSource()

  const { data: locationsList = [], refetch: refetchLocations } = useLocations()
  const createLocationMutation = useCreateLocation()
  const { data: activitiesList = [], refetch: refetchActivities } = useActivities(projectsList[0]?.customer_id || customersList[0]?.id)
  const createActivityMutation = useCreateActivity()

  const { data: containerStatus, refetch: refetchContainers } = useQuery({
    queryKey: ['containers', 'status'],
    queryFn: async () => {
      const { data } = await apiClient.get<any>('/containers/status')
      return data
    },
    refetchInterval: 10000,
  })

  // Selected project (default to the first project in database)
  const activeDbProject = projectsList[0]
  
  // Selected user filter
  const [userFilter, setUserFilter] = useState<string>('all')

  // Dynamic CRM calculations
  const totalLeads = customersList.length
  const qualifiedCount = customersList.filter((c: any) => c.status === 'active' || c.status === 'verified').length
  const getStageCount = (stage: string) => notebooksList.filter((n: any) => n.stage?.toLowerCase() === stage.toLowerCase()).length
  
  const propCount = getStageCount('proposal')
  const negCount = getStageCount('negotiation')
  const closedCount = getStageCount('closed')

  const leadsPct = totalLeads > 0 ? 100 : 0
  const qualifiedPct = totalLeads > 0 ? Math.round((qualifiedCount / totalLeads) * 100) : 0
  const proposalsPct = totalLeads > 0 ? Math.round((propCount / totalLeads) * 100) : 0
  const negPct = totalLeads > 0 ? Math.round((negCount / totalLeads) * 100) : 0
  const closedPct = totalLeads > 0 ? Math.round((closedCount / totalLeads) * 100) : 0

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
    const defaultCustId = customersList[0]?.id || null
    createProjectMutation.mutate({
      name: 'NIST CSF v2 Compliance Alignment',
      description: 'Compliance alignment project for ACME Corp facilities.',
      stage: 'in_progress',
      status: 'active',
      priority: 'high',
      project_type: 'compliance',
      customer_id: defaultCustId
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

  const handleSeedCRM = async () => {
    try {
      const acme = await createCustomerMutation.mutateAsync({
        name: 'Acme Security Corp',
        website: 'acmesecurity.com',
        description: 'B2B Client in Critical Infrastructure Sector. Standard framework: NIST CSF v2.',
        industry: 'Cybersecurity',
        primary_sector: 'Critical Infrastructure',
        status: 'active',
        contacts: [
          { name: 'Sarah Connor', role: 'IT Sec Director', email: 'sconnor@acmesecurity.com' },
          { name: 'Marcus Wright', role: 'SRE Lead (Client)', email: 'mwright@acmesecurity.com' }
        ]
      })

      const apex = await createCustomerMutation.mutateAsync({
        name: 'Apex Networks',
        website: 'apexnet.com',
        description: 'Telecommunications provider aligning with SCADA Network Insulation framework.',
        industry: 'Telecommunications',
        primary_sector: 'Communications',
        status: 'pending',
        contacts: [
          { name: 'Bruce Banner', role: 'CISO', email: 'bbanner@apexnet.com' }
        ]
      })

      const globalLog = await createCustomerMutation.mutateAsync({
        name: 'Global Logistics',
        website: 'globallogistics.com',
        description: 'Logistics provider requiring manual audit override due to foreign GDPR hold.',
        industry: 'Logistics',
        primary_sector: 'Transportation',
        status: 'inactive',
        contacts: [
          { name: 'Tony Stark', role: 'CTO', email: 'tstark@globallogistics.com' }
        ]
      })

      // Seed linked notebooks (Deals)
      await createNotebookMutation.mutateAsync({
        name: 'Acme Security Upgrade',
        description: 'Compliance alignment and network security audit.',
        stage: 'negotiation',
        estimated_value: 80000,
        customer_id: acme.id,
        client_name: 'Acme Security Corp'
      })

      await createNotebookMutation.mutateAsync({
        name: 'Apex Infrastructure Audit',
        description: 'SCADA network insulation review.',
        stage: 'proposal',
        estimated_value: 120000,
        customer_id: apex.id,
        client_name: 'Apex Networks'
      })

      await createNotebookMutation.mutateAsync({
        name: 'Global Threat Intel Feed',
        description: 'Enterprise intelligence integration.',
        stage: 'closed',
        estimated_value: 50000,
        customer_id: globalLog.id,
        client_name: 'Global Logistics'
      })

      // Seed locations (Facilities)
      await createLocationMutation.mutateAsync({
        customer_id: acme.id,
        facility_name: 'Texas Petrochemical Refining Plant',
        facility_type: 'Refinery',
        description: 'Cluster: tx-ref-01 | Nodes: 20 | RBAC: Enforced'
      })

      await createLocationMutation.mutateAsync({
        customer_id: acme.id,
        facility_name: 'Ohio Nuclear Generation Station',
        facility_type: 'Nuclear Plant',
        description: 'Cluster: oh-gen-02 | Nodes: 30 | RBAC: Multi-Factor'
      })

      await createLocationMutation.mutateAsync({
        customer_id: apex.id,
        facility_name: 'California Solar Distribution Grid',
        facility_type: 'Solar Grid',
        description: 'Cluster: ca-solar-04 | Nodes: 12 | RBAC: Basic'
      })

      // Seed timeline activities
      await createActivityMutation.mutateAsync({
        customer_id: acme.id,
        activity_type: 'custom',
        description: 'Sarah Connor Approved SCADA insulation blueprints for Facility 1.',
        actor: 'Sarah Connor'
      })

      await createActivityMutation.mutateAsync({
        customer_id: acme.id,
        activity_type: 'custom',
        description: 'SRE Agent Alpha successfully verified backup configuration on Facility 2.',
        actor: 'SRE Agent Alpha'
      })

      await createActivityMutation.mutateAsync({
        customer_id: apex.id,
        activity_type: 'custom',
        description: 'CISO Bruce Banner requested audit log download link for compliance validation.',
        actor: 'Bruce Banner'
      })

      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['notebooks'] })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      toast.success('Sample CRM accounts and deals seeded successfully!')
    } catch (err) {
      toast.error('Failed to seed CRM data.')
    }
  }

  const handleResearchSearch = async () => {
    if (!researchSearchQuery.trim()) return
    try {
      const res = await searchMutation.mutateAsync({
        query: researchSearchQuery,
        type: researchSearchType,
        limit: 5,
        search_sources: true,
        search_notes: true,
        minimum_score: 0.0,
      })
      setResearchSearchResults(res.results.map((r: any) => ({
        id: r.id,
        text: r.content || '',
        score: Math.round((r.final_score || 0) * 100) / 100,
        source: r.title
      })))
    } catch (err) {
      toast.error('Search query failed')
    }
  }
  
  // Sales CRM Mindset State
  const [salesCampaigns] = useState([
    { id: 'camp-s1', name: 'NIST CSF v2 Awareness Outreach', channel: 'LinkedIn', targetAccount: 'Acme Security Corp', status: 'Running', leadsGenerated: 12 },
    { id: 'camp-s2', name: 'SCADA Segments Security Webinar', channel: 'Email', targetAccount: 'Apex Networks', status: 'Planned', leadsGenerated: 0 },
    { id: 'camp-s3', name: 'Federal Threat Intel Feed Promo', channel: 'X/Twitter', targetAccount: 'Global Logistics', status: 'Running', leadsGenerated: 8 },
  ])

  // Research Mindset State
  const [researchSearchQuery, setResearchSearchQuery] = useState('')
  const [researchSearchType, setResearchSearchType] = useState<'vector' | 'hybrid'>('vector')
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
  
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('')
  const { data: activeLocation } = useLocation(selectedFacilityId, !!selectedFacilityId)

  useEffect(() => {
    if (locationsList.length > 0 && !selectedFacilityId) {
      setSelectedFacilityId(locationsList[0].id)
    }
  }, [locationsList, selectedFacilityId])
  const [deliveryTasksList, setDeliveryTasksList] = useState([
    { id: 'task-d1', name: 'Isolate SCADA protocol ports', stage: 'In Progress', dueDate: '2026-06-15', assignee: 'SRE Agent Alpha', priority: 'High' },
    { id: 'task-d2', name: 'Seed CISA validation framework questions', stage: 'Done', dueDate: '2026-06-08', assignee: 'SRE Agent Beta', priority: 'Medium' },
    { id: 'task-d3', name: 'Audit PostgreSQL pgvector memory usage', stage: 'Todo', dueDate: '2026-06-20', assignee: 'System Agent', priority: 'Low' },
    { id: 'task-d4', name: 'Verify backup failover recovery script', stage: 'In Review', dueDate: '2026-06-12', assignee: 'SRE Agent Alpha', priority: 'High' }
  ])
  const [deliveryTasksView, setDeliveryTasksView] = useState<'kanban' | 'table'>('kanban')
  const [openProjectIds, setOpenProjectIds] = useState<Record<string, boolean>>({})

  // Marketing Mindset State
  const [marketingAudioScript, setMarketingAudioScript] = useState('NIST CSF v2 updates include Govern and Recover functions.')
  const [selectedMarketingVoice, setSelectedMarketingVoice] = useState('v1')
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [isAudioGenerated, setIsAudioGenerated] = useState(false)
  const [marketingAudioUrl, setMarketingAudioUrl] = useState<string | null>(null)
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
  const [restartingContainers, setRestartingContainers] = useState<Record<string, boolean>>({})
  const rebuildIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Memoized live container status mapping
  const liveContainers = useMemo(() => {
    if (!containerStatus?.containers) {
      return containers
    }
    return containers.map((mc) => {
      const live = containerStatus.containers.find((c: any) => c.name === mc.name)
      return {
        ...mc,
        status: live ? (live.state === 'running' ? 'running' : 'stopped') : mc.status
      }
    })
  }, [containerStatus, containers])

  // Memoized live scheduled marketing episodes + static scheduler posts
  const marketingPosts = useMemo(() => {
    const dbPosts = scheduledEpisodes.map((ep: any) => ({
      id: ep.id,
      platform: ep.platform || 'Podcast',
      title: ep.title,
      date: ep.scheduled_time || ep.created || '2026-06-12 09:00',
      status: ep.status || 'Queued'
    }))
    return [...dbPosts, ...socialSchedulerPosts]
  }, [scheduledEpisodes, socialSchedulerPosts])

  const handleRestartContainer = async (name: string) => {
    const confirmed = window.confirm(`WARNING: Restarting the container "${name}" will cause temporary service interruption. Proceed?`)
    if (!confirmed) return

    setRestartingContainers(prev => ({ ...prev, [name]: true }))
    try {
      await apiClient.post(`/containers/${name}/restart`)
      toast.success(`Container "${name}" successfully restarted.`)
      refetchContainers()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || `Failed to restart container "${name}".`)
    } finally {
      setRestartingContainers(prev => ({ ...prev, [name]: false }))
    }
  }

  const handleGenerateMarketingAudio = async () => {
    if (!marketingAudioScript.trim()) return
    setIsGeneratingAudio(true)
    setIsAudioGenerated(false)

    try {
      const voicePreset = selectedMarketingVoice === 'v2' ? 'af_bella' : selectedMarketingVoice === 'v3' ? 'am_michael' : 'am_adam'
      const response = await apiClient.post('/voice/tts/synthesize', {
        input: marketingAudioScript.trim(),
        voice: voicePreset,
      }, { responseType: 'blob' })

      if (marketingAudioUrl) {
        URL.revokeObjectURL(marketingAudioUrl)
      }
      const url = URL.createObjectURL(response.data)
      setMarketingAudioUrl(url)
      setIsAudioGenerated(true)
      toast.success('Podcast audio generated successfully.')
    } catch (err: any) {
      console.error(err)
      toast.error('TTS synthesis failed. Make sure Kokoro TTS is running.')
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  const rebuildPgvectorIndex = async () => {
    setIsRebuildingIndex(true)
    setRebuildProgress(0)
    try {
      const response = await apiClient.post<any>('/rebuild', {
        mode: 'existing',
        include_sources: true,
        include_notes: true,
        include_insights: true
      })
      const cmdId = response.data?.command_id
      if (!cmdId) {
        throw new Error('No command ID returned')
      }

      toast.info('Rebuild operation started.')

      rebuildIntervalRef.current = setInterval(async () => {
        try {
          const statusResp = await apiClient.get<any>(`/rebuild/${cmdId}/status`)
          const statusData = statusResp.data
          const pct = statusData?.progress?.percentage ?? 0
          setRebuildProgress(pct)

          if (statusData?.status === 'completed') {
            if (rebuildIntervalRef.current) clearInterval(rebuildIntervalRef.current)
            toast.success('Similarity index rebuilt successfully!')
            setIsRebuildingIndex(false)
          } else if (statusData?.status === 'failed') {
            if (rebuildIntervalRef.current) clearInterval(rebuildIntervalRef.current)
            toast.error(statusData?.error_message || 'Rebuild operation failed.')
            setIsRebuildingIndex(false)
          }
        } catch (pollErr) {
          console.error('Failed to poll rebuild status:', pollErr)
        }
      }, 1000)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to start rebuild operation.')
      setIsRebuildingIndex(false)
    }
  }

  // Cleanup effect for timers and dynamic URLs
  useEffect(() => {
    return () => {
      if (rebuildIntervalRef.current) {
        clearInterval(rebuildIntervalRef.current)
      }
      if (marketingAudioUrl) {
        URL.revokeObjectURL(marketingAudioUrl)
      }
    }
  }, [marketingAudioUrl])

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
        setAiResponse('Routing you to Sales CRM. Pre-populating pipeline forecast analysis...')
        setEnhancedPerspective('sales')
      } else if (cmd.includes('research') || cmd.includes('search') || cmd.includes('notes') || cmd.includes('nist')) {
        setAiResponse('Searching compliance repository. Synthesizing briefing across indexed sources...')
        setEnhancedPerspective('research')
      } else if (cmd.includes('container') || cmd.includes('sre') || cmd.includes('logs') || cmd.includes('project')) {
        setAiResponse('Querying project delivery view. All microservices running stably.')
        setEnhancedPerspective('delivery')
      } else if (cmd.includes('podcast') || cmd.includes('audio') || cmd.includes('marketing') || cmd.includes('campaign')) {
        setAiResponse('Switching to Marketing view. Campaign pipeline loaded.')
        setEnhancedPerspective('marketing')
      } else if (cmd.includes('admin') || cmd.includes('user') || cmd.includes('config') || cmd.includes('settings')) {
        setAiResponse('Opening Administrator view. System configuration ready.')
        setEnhancedPerspective('admin')
      } else {
        setAiResponse('Searching across all mindsets... Fetching context from pgvector index.')
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
                placeholder="Ask anything — search sources, query pipeline, switch mindset, run compliance checks..."
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

          <div className="space-y-6 animate-in fade-in duration-500">

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
                      {customersList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 p-6 h-full my-auto">
                          <AlertTriangle className="h-8 w-8 text-cyan-400 animate-pulse" />
                          <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">CRM Database is Empty</span>
                          <Button 
                            onClick={handleSeedCRM}
                            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-[10px] uppercase h-8 px-4 rounded-lg"
                          >
                            Seed CRM Accounts & Deals
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                              <TrendingUp className="h-4 w-4" /> Sales Funnel & Campaigns
                            </span>
                            <Badge className="bg-cyan-500/10 text-cyan-400 text-[9px] border border-cyan-500/20 font-mono font-bold">
                              Conversion: {totalLeads > 0 ? ((closedCount / totalLeads) * 100).toFixed(1) : '0.0'}%
                            </Badge>
                          </div>
                          
                          {/* Funnel Visualizer */}
                          <div className="space-y-2">
                            <label className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider block">CRM Conversion Funnel</label>
                            <div className="space-y-2">
                              {[
                                { stage: 'Leads Ingested', count: totalLeads, pct: leadsPct, color: 'bg-cyan-500/90' },
                                { stage: 'Qualified (Compliance Passed)', count: qualifiedCount, pct: qualifiedPct, color: 'bg-cyan-500/70' },
                                { stage: 'Proposals / Notebooks Sent', count: propCount, pct: proposalsPct, color: 'bg-cyan-500/50' },
                                { stage: 'Negotiation / Milestones Set', count: negCount, pct: negPct, color: 'bg-cyan-500/30' },
                                { stage: 'Closed Won (Deals Inflight)', count: closedCount, pct: closedPct, color: 'bg-emerald-500/40' },
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
                              {notebooksList.map(notebook => (
                                <div key={notebook.id} className="p-2 bg-slate-950/40 rounded border border-white/5 flex items-center justify-between text-[10px] font-mono">
                                  <span className="text-slate-300 font-bold truncate max-w-[140px]">{notebook.name}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-slate-800 text-slate-400 text-[8.5px] uppercase">{notebook.stage || 'prospect'}</Badge>
                                    <span className="text-emerald-400 font-bold">${(notebook.estimated_value || 0).toLocaleString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* Card 2: CRM Accounts & Compliance Ledger */}
                    <Card className="bg-slate-900/40 border-white/10 rounded-2xl shadow-xl p-5 min-h-[380px] flex flex-col justify-between">
                      {customersList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 p-6 h-full my-auto">
                          <AlertTriangle className="h-8 w-8 text-cyan-400 animate-pulse" />
                          <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">CRM Ledger is Empty</span>
                          <Button 
                            onClick={handleSeedCRM}
                            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold font-mono text-[10px] uppercase h-8 px-4 rounded-lg"
                          >
                            Seed CRM Accounts & Deals
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4 h-full flex flex-col justify-between">
                          <div className="space-y-4 w-full">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Users className="h-4 w-4" /> Active Accounts & Compliance
                              </span>
                              <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono">{customersList.length} Accounts</Badge>
                            </div>

                            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                              {customersList.map((acc: any) => {
                                const dealVal = (acc.total_value || acc.annual_revenue || 0)
                                const complianceState = (acc.status === 'active' || acc.status === 'verified') ? 'Verified' : acc.status === 'pending' ? 'Pending' : 'Failed'
                                return (
                                  <div key={acc.id} className="p-3 bg-slate-950/40 rounded-xl border border-white/5 space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs font-bold text-slate-100">{acc.name}</span>
                                      <span className="text-cyan-400 font-mono font-bold text-xs">${dealVal.toLocaleString()}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                      <span className="text-slate-400">Stage: <strong className="text-slate-200">{acc.status || 'Active'}</strong></span>
                                      
                                      {/* Compliance check pill */}
                                      <div className="flex items-center gap-1.5">
                                        {complianceState === 'Verified' && (
                                          <span className="flex items-center gap-1 text-emerald-400 font-bold animate-[pulse_2s_infinite]">
                                            <span className="text-xs">✓</span> Verified
                                          </span>
                                        )}
                                        {complianceState === 'Pending' && (
                                          <span className="flex items-center gap-1 text-amber-400 font-bold animate-pulse">
                                            <span className="text-[10px] w-2 h-2 rounded-full bg-amber-400 shrink-0" /> Pending
                                          </span>
                                        )}
                                        {complianceState === 'Failed' && (
                                          <span className="flex items-center gap-1 text-red-500 font-bold">
                                            <span className="text-xs">✗</span> Blocked
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Contacts List */}
                                    {acc.contacts && acc.contacts.length > 0 ? (
                                      <div className="pl-2.5 border-l border-white/5 space-y-1 py-0.5">
                                        {acc.contacts.map((c: any, cIdx: number) => (
                                          <div key={cIdx} className="text-[9.5px] font-mono text-slate-400 flex items-center gap-1">
                                            <span className="text-slate-300">{c.name || c.first_name || ''} {c.last_name || ''}</span> ({c.role || c.title || 'Contact'}) • <span className="text-slate-500 truncate max-w-[120px]">{c.email}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="pl-2.5 border-l border-white/5 py-0.5 text-[9.5px] font-mono text-slate-400">
                                        No contacts listed
                                      </div>
                                    )}

                                    {/* Failed compliance reason / Override */}
                                    {complianceState === 'Failed' && (
                                      <div className="mt-1 p-2 bg-red-950/15 border border-red-500/20 text-red-400 rounded text-[9px] font-mono space-y-1.5 leading-relaxed">
                                        <div><strong>Compliance Block:</strong> Requires manual override: Foreign jurisdiction regulatory hold (EU GDPR compliance review)</div>
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={() => {
                                            updateCustomerMutation.mutate({
                                              id: acc.id,
                                              data: { status: 'active' }
                                            }, {
                                              onSuccess: () => {
                                                queryClient.invalidateQueries({ queryKey: ['customers'] })
                                                toast.success(`Override applied: ${acc.name} compliance status updated!`)
                                              }
                                            })
                                          }}
                                          className="h-6 text-[8.5px] uppercase text-red-400 border-red-500/20 bg-red-950/20 hover:bg-red-950/30"
                                        >
                                          Apply Audit Override
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}
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
                                    handleResearchSearch()
                                  }
                                }}
                              />
                            </div>
                            <Button 
                              size="sm"
                              onClick={handleResearchSearch}
                              className="h-8 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold font-mono text-xs uppercase"
                            >
                              Search
                            </Button>
                          </div>

                          {/* Engine selector */}
                          <div className="flex items-center gap-4 text-[10px] font-mono">
                            <span className="text-slate-400">Search Engine Mode:</span>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="radio" 
                                name="search_engine_mode_enhanced" 
                                checked={researchSearchType === 'vector'} 
                                onChange={() => setResearchSearchType('vector')} 
                              />
                              <span className="text-sky-400 font-bold">Local KB</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="radio" 
                                name="search_engine_mode_enhanced" 
                                checked={researchSearchType === 'hybrid'} 
                                onChange={() => setResearchSearchType('hybrid')} 
                              />
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
                                  {res.text.slice(0, 180)}...{' '}
                                  <button 
                                    onClick={() => setActiveCitationPopover(activeCitationPopover === res.id ? null : res.id)}
                                    className="text-sky-400 hover:text-sky-300 font-bold hover:underline"
                                  >
                                    [Inspect Citation]
                                  </button>
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
                          {(() => {
                            const activeRes = researchSearchResults.find(r => r.id === activeCitationPopover)
                            if (!activeRes) return <div className="text-[10px] text-slate-400">No citation details found.</div>
                            return (
                              <div className="space-y-1">
                                <h5 className="text-[11px] font-bold text-slate-100">{activeRes.source}</h5>
                                <div className="text-[9.5px] text-slate-400 font-mono">Cosine Similarity: {activeRes.score}</div>
                                <p className="text-[10px] text-slate-300 italic">"{activeRes.text}"</p>
                              </div>
                            )
                          })()}
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
                          <Badge className="bg-slate-800 text-slate-400 text-[9px] font-mono">{globalSources.length} Files</Badge>
                        </div>

                        {/* Document tree view */}
                        <div className="space-y-2">
                          <label className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider block">Document Tree (Provenances & Extracted Mks)</label>
                          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                            {globalSources.map((doc: any) => (
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
                                  <span className="text-slate-200 font-bold truncate max-w-[160px]">📄 {doc.title || 'Untitled Source'}</span>
                                  <span className="text-slate-500 text-[8.5px]">{doc.embedded_chunks || 0} chunks</span>
                                </div>
                                <div className="flex justify-between text-[8px] text-slate-500 mt-1">
                                  <span>Status: {doc.embedded ? 'Embedded' : 'Processing'}</span>
                                  <span>Updated: {new Date(doc.updated || doc.created).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Document actions & Preview */}
                        {selectedResearchDoc ? (
                          <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2 animate-in fade-in duration-200">
                            <div className="flex justify-between items-center border-b border-white/5 pb-1 text-[9.5px] font-mono">
                              <span className="text-sky-400 font-bold uppercase">Source Details</span>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    const newName = prompt('Enter new document name:', selectedResearchDoc.title || '')
                                    if (newName) {
                                      updateSourceMutation.mutate({ id: selectedResearchDoc.id, data: { title: newName } }, {
                                        onSuccess: () => {
                                          refetchGlobalSources()
                                          setSelectedResearchDoc((prev: any) => prev ? { ...prev, title: newName } : null)
                                        }
                                      })
                                    }
                                  }}
                                  className="text-sky-400 hover:text-sky-300 text-[8.5px] uppercase"
                                >
                                  Rename
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirm('Delete document from postgres storage?')) {
                                      deleteSourceMutation.mutate(selectedResearchDoc.id, {
                                        onSuccess: () => {
                                          refetchGlobalSources()
                                          setSelectedResearchDoc(null)
                                        }
                                      })
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300 text-[8.5px] uppercase"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-300 leading-relaxed max-h-[80px] overflow-y-auto italic font-sans">
                              {selectedResearchDoc.asset?.file_path || 'No local file path details available.'}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-slate-950/20 rounded-xl border border-dashed border-white/5 text-center text-slate-500 text-[9px] font-mono uppercase">
                            Select a document above to rename, delete or view extracted metadata
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
                            {projectsList.map(proj => {
                              const isOpen = !!openProjectIds[proj.id]
                              const projLocations = locationsList.filter(loc => loc.customer_id === proj.customer_id)
                              
                              return (
                                <div key={proj.id} className="space-y-1">
                                  <button 
                                    onClick={() => {
                                      setOpenProjectIds(prev => ({ ...prev, [proj.id]: !prev[proj.id] }))
                                    }}
                                    className="flex items-center gap-1 text-slate-200 hover:text-emerald-400 text-[10.5px]"
                                  >
                                    <span className="text-[9px] text-slate-500">{isOpen ? '▼' : '▶'}</span>
                                    <span>📂 {proj.name}</span>
                                  </button>

                                  {isOpen && (
                                    <div className="pl-4 space-y-1 border-l border-white/5 ml-1.5">
                                      {projLocations.length > 0 ? (
                                        projLocations.map(loc => (
                                          <button
                                            key={loc.id}
                                            onClick={() => setSelectedFacilityId(loc.id)}
                                            className={`w-full text-left p-1.5 rounded truncate text-[10px] flex justify-between items-center transition-colors ${
                                              selectedFacilityId === loc.id 
                                                ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20' 
                                                : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                          >
                                            <span className="truncate">🏢 {loc.facility_name}</span>
                                            <Badge className="bg-slate-900 text-slate-400 text-[8px] font-mono scale-90">{loc.facility_type || 'General'}</Badge>
                                          </button>
                                        ))
                                      ) : (
                                        <span className="text-[9px] text-slate-500 italic pl-1">No linked facilities</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            {projectsList.length === 0 && (
                              <span className="text-[10px] text-slate-500 italic">No projects active</span>
                            )}
                          </div>
                        </div>

                        {/* Selected Facility Details Card */}
                        {(() => {
                          if (!selectedFacilityId) return null
                          if (activeLocation) {
                            return (
                              <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-2 animate-in fade-in duration-200">
                                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                                  🏢 Facility Details: {activeLocation.facility_name.split(' ')[0]}
                                </div>
                                <div className="space-y-1.5 font-mono text-[9px] text-slate-300">
                                  <div className="text-slate-400">SRE Config: <span className="text-slate-200 font-bold">{activeLocation.description || 'Cluster: default | Nodes: 10'}</span></div>
                                  <div className="text-slate-400">Compliance Audit: <span className="text-emerald-400 font-bold">{activeLocation.facility_type || 'General'} Status</span></div>
                                  <div className="text-slate-400 truncate">Address: <span className="text-cyan-400">{activeLocation.address || 'Unspecified'}</span></div>
                                </div>
                                <Button size="sm" variant="outline" className="h-6 w-full text-[8.5px] uppercase border-white/10 hover:bg-slate-900 text-slate-300 mt-1">
                                  Configure Facility Cluster
                                </Button>
                              </div>
                            )
                          }
                          return null
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
                            {activitiesList.length > 0 ? (
                              activitiesList.map((act: any) => {
                                const timeStr = act.created ? new Date(act.created).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '00:00'
                                return (
                                  <div key={act.id}>
                                    <span className="text-slate-500">[{timeStr}]</span>{' '}
                                    <strong className="text-emerald-400">{act.actor || 'System'}:</strong>{' '}
                                    <span className="text-slate-200">{act.description}</span>
                                  </div>
                                )
                              })
                            ) : (
                              <>
                                <div><span className="text-slate-500">[17:02]</span> <strong className="text-slate-200">Email:</strong> Sarah Connor Approved SCADA insulation blueprints for Facility 1.</div>
                                <div><span className="text-slate-500">[16:45]</span> <strong className="text-emerald-400">Slack:</strong> SRE Agent Alpha successfully verified backup configuration on Facility 2.</div>
                                <div><span className="text-slate-500">[15:10]</span> <strong className="text-slate-200">Email:</strong> CISO Bruce Banner requested audit log download link for compliance validation.</div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Contacts Directory */}
                        <div className="space-y-1.5 border-t border-white/5 pt-3">
                          <label className="text-[8.5px] font-mono text-slate-400 uppercase tracking-wider block">Stakeholder contacts</label>
                          <div className="space-y-1">
                            {(() => {
                              const activeProjectCustomer = customersList.find((c: any) => c.id === activeDbProject?.customer_id)
                              const contacts = activeProjectCustomer?.contacts || []
                              if (contacts.length === 0) {
                                return (
                                  <div className="text-[9px] font-mono text-slate-500 italic p-1">No contacts seeded</div>
                                )
                              }
                              return contacts.map((cnt: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-[9px] font-mono p-1 bg-slate-950/40 rounded border border-white/5">
                                  <span className="text-slate-300 font-bold">{cnt.name}</span>
                                  <span className="text-slate-500">{cnt.role || 'Contact'}</span>
                                </div>
                              ))
                            })()}
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
                            <span className="text-sm font-bold text-violet-400">{marketingPosts.filter((p: any) => p.platform === 'LinkedIn').length} posts</span>
                          </div>
                          <div className="p-2 bg-slate-950/60 rounded-lg border border-white/5">
                            <span className="text-[8.5px] text-slate-500 block">X/TWITTER</span>
                            <span className="text-sm font-bold text-violet-400">{marketingPosts.filter((p: any) => p.platform === 'X/Twitter').length} posts</span>
                          </div>
                          <div className="p-2 bg-slate-950/60 rounded-lg border border-white/5">
                            <span className="text-[8.5px] text-slate-500 block">BLOGS</span>
                            <span className="text-sm font-bold text-violet-400">{marketingPosts.filter((p: any) => p.platform === 'Blog').length} posts</span>
                          </div>
                        </div>

                        {/* Visual Queue Timeline */}
                        <div className="space-y-2">
                          <label className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider block">Visual Schedule Timeline</label>
                          <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
                            {marketingPosts.map((post: any) => (
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
                                      : post.status === 'Active' || post.status === 'running'
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
                              onClick={handleGenerateMarketingAudio}
                              className="w-full h-8 bg-violet-500 hover:bg-violet-600 text-slate-950 font-bold font-mono text-xs uppercase rounded-lg"
                            >
                              Generate Podcast Audio
                            </Button>
                          )}

                          {isAudioGenerated && !isGeneratingAudio && marketingAudioUrl && (
                            <div className="p-2.5 bg-slate-950/60 border border-white/5 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                              <div className="flex justify-between items-center text-[9.5px] font-mono">
                                <span className="text-violet-400 font-bold">Generated Podcast Output (Kokoro)</span>
                                <span className="text-slate-500">Ready</span>
                              </div>
                              
                              <audio src={marketingAudioUrl} controls className="w-full h-8 mt-1" />
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
                            {liveContainers.map((cont: any) => (
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
                                    onClick={() => handleRestartContainer(cont.name)}
                                    disabled={restartingContainers[cont.name]}
                                    className="h-6 text-[8px] font-mono px-1.5 border-white/10 uppercase"
                                  >
                                    {restartingContainers[cont.name] ? (
                                      <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                                    ) : (
                                      'Restart'
                                    )}
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

        {/* Modals */}
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
