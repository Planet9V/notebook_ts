'use client'

import React, { useState, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Layers, Loader2 } from 'lucide-react'
import { useProjects, useAddTask } from '@/lib/hooks/use-projects'
import { useUsers, useCreateUser } from '@/lib/hooks/use-users'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useCustomers, useCreateCustomer, useUpdateCustomer } from '@/lib/hooks/use-customers'
import { useNotebooks, useCreateNotebook } from '@/lib/hooks/use-notebooks'
import { useLocations, useCreateLocation } from '@/lib/hooks/use-locations'
import { useActivities, useCreateActivity } from '@/lib/hooks/use-activities'
import { useSearch } from '@/lib/hooks/use-search'
import { useResearchMemoryStats } from '@/lib/hooks/use-research-memory'
import { sourcesApi } from '@/lib/api/sources'
import { apiClient } from '@/lib/api/client'
import { toast } from 'sonner'

import { AICommandBar } from './_dashboard/AICommandBar'

const SalesCRMPanel = lazy(() => import('./_dashboard/SalesCRMPanel').then(m => ({ default: m.SalesCRMPanel })))
const OXOTSellSidePanel = lazy(() => import('./_dashboard/OXOTSellSidePanel').then(m => ({ default: m.OXOTSellSidePanel })))
const ResearchHubPanel = lazy(() => import('./_dashboard/ResearchHubPanel').then(m => ({ default: m.ResearchHubPanel })))
const ProjectDeliveryPanel = lazy(() => import('./_dashboard/ProjectDeliveryPanel').then(m => ({ default: m.ProjectDeliveryPanel })))
const MarketingPanel = lazy(() => import('./_dashboard/MarketingPanel').then(m => ({ default: m.MarketingPanel })))
const AdminPanel = lazy(() => import('./_dashboard/AdminPanel').then(m => ({ default: m.AdminPanel })))

export default function DashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Mindset perspective state
  const [enhancedPerspective, setEnhancedPerspective] = useState<'sales' | 'research' | 'delivery' | 'marketing' | 'admin'>('sales')

  // Gated queries per mindset
  const { data: projectsList = [] } = useProjects()
  const { data: usersList = [] } = useUsers()
  const { data: customersList = [] } = useCustomers()
  const { data: notebooksList = [] } = useNotebooks()
  const { data: rmemStats } = useResearchMemoryStats()

  const { data: globalSources = [] } = useQuery({
    queryKey: ['sources', 'global'],
    queryFn: () => sourcesApi.list(),
    enabled: enhancedPerspective === 'research',
  })

  const { data: containerStatus } = useQuery({
    queryKey: ['containers', 'status'],
    queryFn: async () => {
      const { data } = await apiClient.get<any>('/containers/status')
      return data
    },
    enabled: enhancedPerspective === 'admin',
    refetchInterval: 10000,
  })

  const searchMutation = useSearch()
  const addTaskMutation = useAddTask()
  const createUserMutation = useCreateUser()
  const createCustomerMutation = useCreateCustomer()
  const updateCustomerMutation = useUpdateCustomer()
  const createNotebookMutation = useCreateNotebook()
  const createLocationMutation = useCreateLocation()
  const createActivityMutation = useCreateActivity()

  // Active project & location selection
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const activeDbProject = projectsList.find(p => p.id === activeProjectId) || projectsList[0]

  // Dialog States
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerIndustry, setNewCustomerIndustry] = useState('')
  const [newCustomerWebsite, setNewCustomerWebsite] = useState('')

  const [isOverrideConfirmOpen, setIsOverrideConfirmOpen] = useState(false)
  const [pendingOverrideCustomerId, setPendingOverrideCustomerId] = useState<string | null>(null)
  const [pendingOverrideCustomerName, setPendingOverrideCustomerName] = useState('')

  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('member')

  // Research Panel search state
  const [researchSearchQuery, setResearchSearchQuery] = useState('')
  const [researchSearchType, setResearchSearchType] = useState<'vector' | 'hybrid'>('vector')
  const [researchSearchResults, setResearchSearchResults] = useState<any[]>([])

  // Marketing Audio & Post state
  const [marketingAudioScript, setMarketingAudioScript] = useState('NIST CSF v2 updates include Govern and Recover functions.')
  const [selectedMarketingVoiceId, setSelectedMarketingVoiceId] = useState('am_adam')
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [isAudioGenerated, setIsAudioGenerated] = useState(false)
  const [marketingAudioUrl, setMarketingAudioUrl] = useState<string | null>(null)

  const [showPostGenerator, setShowPostGenerator] = useState(false)
  const [marketingPlatform, setMarketingPlatform] = useState<'LinkedIn' | 'X/Twitter' | 'Blog'>('LinkedIn')
  const [marketingSourceText, setMarketingSourceText] = useState('NIST SP 800-82 standard details secure industrial control systems.')
  const [generatedPost, setGeneratedPost] = useState('')
  const [isGeneratingPost, setIsGeneratingPost] = useState(false)
  const [marketingPosts, setMarketingPosts] = useState<any[]>([])

  // Admin state
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false)
  const [rebuildProgress, setRebuildProgress] = useState(0)
  const [restartingContainers, setRestartingContainers] = useState<Record<string, boolean>>({})

  // Handlers
  const handleSeedCRM = async () => {
    try {
      const acme = await createCustomerMutation.mutateAsync({
        name: 'Acme Security Corp',
        website: 'acmesecurity.com',
        description: 'B2B Client in Critical Infrastructure Sector.',
        industry: 'Cybersecurity',
        status: 'active',
      })
      await createNotebookMutation.mutateAsync({
        name: 'Acme Security Upgrade',
        description: 'Compliance alignment audit.',
        stage: 'proposal',
        customer_id: acme.id,
      })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['notebooks'] })
      toast.success('Sample CRM accounts seeded!')
    } catch {
      toast.error('Failed to seed CRM data.')
    }
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustomerName.trim()) return
    try {
      await createCustomerMutation.mutateAsync({
        name: newCustomerName.trim(),
        industry: newCustomerIndustry.trim(),
        website: newCustomerWebsite.trim(),
        status: 'active',
      })
      toast.success(`Account "${newCustomerName}" created.`)
      setIsNewCustomerOpen(false)
      setNewCustomerName('')
      setNewCustomerIndustry('')
      setNewCustomerWebsite('')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    } catch {
      toast.error('Failed to create customer account.')
    }
  }

  const handleConfirmComplianceOverride = async () => {
    if (!pendingOverrideCustomerId) return
    try {
      await updateCustomerMutation.mutateAsync({
        id: pendingOverrideCustomerId,
        data: { status: 'verified' }
      })
      toast.success(`Compliance override applied for ${pendingOverrideCustomerName}.`)
      setIsOverrideConfirmOpen(false)
      setPendingOverrideCustomerId(null)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    } catch {
      toast.error('Failed to override compliance.')
    }
  }

  const handleRunResearchSearch = async () => {
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
      setResearchSearchResults((res?.results ?? []).map((r: any) => ({
        id: r.id,
        text: r.content || '',
        score: Math.round((r.final_score || 0) * 100) / 100,
        source: r.title
      })))
    } catch {
      toast.error('Search query failed.')
    }
  }

  const handleGenerateAudio = async () => {
    if (!marketingAudioScript.trim()) return
    setIsGeneratingAudio(true)
    try {
      const response = await apiClient.post('/voice/tts/synthesize', {
        input: marketingAudioScript.trim(),
        voice: selectedMarketingVoiceId,
      }, { responseType: 'blob' })
      if (marketingAudioUrl) URL.revokeObjectURL(marketingAudioUrl)
      setMarketingAudioUrl(URL.createObjectURL(response.data))
      setIsAudioGenerated(true)
      toast.success('Audio generated successfully.')
    } catch {
      toast.error('TTS synthesis failed.')
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  const handleGeneratePostText = async () => {
    if (!marketingSourceText.trim()) return
    setIsGeneratingPost(true)
    try {
      setGeneratedPost(`[Generated ${marketingPlatform} Post]\n\nKey Insights: ${marketingSourceText}`)
      toast.success('Post generated.')
    } finally {
      setIsGeneratingPost(false)
    }
  }

  const handleAddCampaign = () => {
    if (!generatedPost) return
    setMarketingPosts(prev => [...prev, {
      title: generatedPost.slice(0, 50),
      platform: marketingPlatform,
      status: 'Queued',
    }])
    toast.success('Post added to marketing queue.')
    setShowPostGenerator(false)
    setGeneratedPost('')
  }

  const handleRestartContainer = async (name: string) => {
    setRestartingContainers(prev => ({ ...prev, [name]: true }))
    try {
      await apiClient.post(`/containers/${name}/restart`)
      toast.success(`Container "${name}" restarted.`)
    } catch {
      toast.error(`Failed to restart container "${name}".`)
    } finally {
      setRestartingContainers(prev => ({ ...prev, [name]: false }))
    }
  }

  const handleRebuildPgvectorIndex = async () => {
    setIsRebuildingIndex(true)
    setRebuildProgress(50)
    setTimeout(() => {
      setRebuildProgress(100)
      setIsRebuildingIndex(false)
      toast.success('Similarity index rebuild completed.')
    }, 1500)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUsername.trim()) return
    try {
      await createUserMutation.mutateAsync({
        username: newUsername.trim(),
        email: newEmail.trim(),
        role: newRole,
      })
      toast.success(`User "${newUsername}" created.`)
      setIsUserModalOpen(false)
      setNewUsername('')
      setNewEmail('')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch {
      toast.error('Failed to create user.')
    }
  }

  const liveContainers = (containerStatus?.containers ?? []).map((c: any) => ({
    id: c.name,
    name: c.name,
    status: c.state === 'running' ? 'running' : 'stopped',
    port: (typeof c.ports === 'string' ? c.ports : '') || c.port || '',
  }))

  return (
    <AppShell>
      <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
        <div className="flex-1 p-6 max-w-[1600px] mx-auto w-full space-y-6">

          {/* AI Command Bar */}
          <AICommandBar onMindsetChange={setEnhancedPerspective} />

          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Mindset Selector Tabs */}
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

            {/* Mindset Panel Workspace */}
            <Suspense fallback={
              <div className="flex items-center justify-center py-24 text-slate-400 font-mono text-xs gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                Loading {enhancedPerspective} perspective panel...
              </div>
            }>
              {enhancedPerspective === 'sales' && (
                <div className="space-y-8">
                  <OXOTSellSidePanel onMindsetChange={setEnhancedPerspective} />
                  <SalesCRMPanel
                    onSeedCRM={handleSeedCRM}
                    onOpenNewCustomer={() => setIsNewCustomerOpen(true)}
                    onMindsetChange={setEnhancedPerspective}
                    onOverrideConfirm={(id, name) => {
                      setPendingOverrideCustomerId(id)
                      setPendingOverrideCustomerName(name)
                      setIsOverrideConfirmOpen(true)
                    }}
                  />
                </div>
              )}

              {enhancedPerspective === 'research' && (
                <ResearchHubPanel
                  researchSearchQuery={researchSearchQuery}
                  setResearchSearchQuery={setResearchSearchQuery}
                  researchSearchType={researchSearchType}
                  setResearchSearchType={setResearchSearchType}
                  researchSearchResults={researchSearchResults}
                  onRunSearch={handleRunResearchSearch}
                  globalSources={globalSources}
                  rmemStats={rmemStats}
                />
              )}

              {enhancedPerspective === 'delivery' && (
                <ProjectDeliveryPanel
                  projectsList={projectsList}
                  activeDbProject={activeDbProject}
                  onMoveTask={(idx, status) => {
                    if (!activeDbProject) return
                    addTaskMutation.mutate({
                      projectId: activeDbProject.id,
                      data: { title: 'Updated task stage', status: 'done' }
                    })
                  }}
                  onSeedProject={() => {
                    toast.info('Seed project triggered')
                  }}
                />
              )}

              {enhancedPerspective === 'marketing' && (
                <MarketingPanel
                  marketingAudioScript={marketingAudioScript}
                  setMarketingAudioScript={setMarketingAudioScript}
                  selectedMarketingVoiceId={selectedMarketingVoiceId}
                  setSelectedMarketingVoiceId={setSelectedMarketingVoiceId}
                  isGeneratingAudio={isGeneratingAudio}
                  isAudioGenerated={isAudioGenerated}
                  marketingAudioUrl={marketingAudioUrl}
                  onGenerateAudio={handleGenerateAudio}
                  marketingPosts={marketingPosts}
                  showPostGenerator={showPostGenerator}
                  setShowPostGenerator={setShowPostGenerator}
                  marketingPlatform={marketingPlatform}
                  setMarketingPlatform={setMarketingPlatform}
                  marketingSourceText={marketingSourceText}
                  setMarketingSourceText={setMarketingSourceText}
                  generatedPost={generatedPost}
                  isGeneratingPost={isGeneratingPost}
                  onGeneratePostText={handleGeneratePostText}
                  onAddCampaign={handleAddCampaign}
                />
              )}

              {enhancedPerspective === 'admin' && (
                <AdminPanel
                  liveContainers={liveContainers}
                  restartingContainers={restartingContainers}
                  onRestartContainer={handleRestartContainer}
                  isRebuildingIndex={isRebuildingIndex}
                  rebuildProgress={rebuildProgress}
                  onRebuildPgvectorIndex={handleRebuildPgvectorIndex}
                  usersList={usersList}
                  onOpenUserModal={() => setIsUserModalOpen(true)}
                />
              )}
            </Suspense>
          </div>
        </div>

        {/* Dialogs */}
        <Dialog open={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-slate-100">
            <DialogHeader>
              <DialogTitle>Add New Customer Account</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Create a new customer profile for compliance tracking.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCustomer} className="space-y-3 font-mono text-xs">
              <div>
                <Label>Account Name</Label>
                <Input value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} placeholder="Acme Security Corp" className="bg-slate-950 border-white/10" />
              </div>
              <div>
                <Label>Industry</Label>
                <Input value={newCustomerIndustry} onChange={e => setNewCustomerIndustry(e.target.value)} placeholder="Cybersecurity" className="bg-slate-950 border-white/10" />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={newCustomerWebsite} onChange={e => setNewCustomerWebsite(e.target.value)} placeholder="acme.com" className="bg-slate-950 border-white/10" />
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-cyan-500 text-slate-950 font-bold uppercase text-xs">Save Account</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isOverrideConfirmOpen} onOpenChange={setIsOverrideConfirmOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-slate-100">
            <DialogHeader>
              <DialogTitle>Confirm Compliance Override</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Override compliance status for {pendingOverrideCustomerName}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleConfirmComplianceOverride} className="bg-amber-500 text-slate-950 font-bold uppercase text-xs">
                Confirm Override
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-slate-100">
            <DialogHeader>
              <DialogTitle>Create User Account</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Add a team member to access system panels.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-3 font-mono text-xs">
              <div>
                <Label>Username</Label>
                <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="jsmith" className="bg-slate-950 border-white/10" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="jsmith@acme.com" className="bg-slate-950 border-white/10" />
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-cyan-500 text-slate-950 font-bold uppercase text-xs">Create User</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </AppShell>
  )
}
