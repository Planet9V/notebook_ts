'use client'

import { useState, useEffect, useMemo } from 'react'
import { useNotebook, useUpdateNotebook } from '@/lib/hooks/use-notebooks'
import { useSources, useCreateSource } from '@/lib/hooks/use-sources'
import { useNotes } from '@/lib/hooks/use-notes'
import { useNotebookChat } from '@/lib/hooks/useNotebookChat'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useTransformations } from '@/lib/hooks/use-transformations'
import { useResearchItems, useCreateResearchItem, useExecuteResearch } from '@/lib/hooks/use-research-items'
import { useProjects } from '@/lib/hooks/use-projects'
import { useUsers } from '@/lib/hooks/use-users'
import { useCustomers } from '@/lib/hooks/use-customers'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChatPanel } from '@/components/source/ChatPanel'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DollarSign,
  Building,
  Briefcase,
  FileText,
  Book,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Layers,
  CheckCircle2,
  Trash2,
  Plus,
  AlertCircle,
  Globe,
  Telescope,
  FolderKanban,
  Play,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { ENGINE_LABELS } from '@/lib/constants/research-stages'
import { toast } from 'sonner'
import { PIPELINE_COLUMNS, PipelineType } from '@/lib/constants/pipelines'

interface DealDrawerProps {
  notebookId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DealDrawer({ notebookId, open, onOpenChange }: DealDrawerProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('details')

  // Fetch the detailed notebook info
  const { data: notebook, isLoading: notebookLoading } = useNotebook(notebookId || '')
  
  // Fetch connected sources and notes for RAG chat context and listing
  const { data: sources = [], isLoading: sourcesLoading } = useSources(notebookId || undefined)
  const { data: notes = [], isLoading: notesLoading } = useNotes(notebookId || '')

  // Fetch users and active customers
  const { data: users } = useUsers()
  const { data: customers } = useCustomers()

  // GTM Research: fetch templates and linked items
  const { data: allTransformations = [] } = useTransformations()
  const gtmTemplates = useMemo(
    () => allTransformations.filter((t) => t.category === 'gtm_research'),
    [allTransformations]
  )
  const { data: researchItems = [] } = useResearchItems()
  const { data: projects = [] } = useProjects()
  const createResearch = useCreateResearchItem()
  const executeResearch = useExecuteResearch()

  // Items linked to this notebook
  const linkedResearch = useMemo(
    () => researchItems.filter((r) => r.notebook_id === notebookId && notebookId),
    [researchItems, notebookId]
  )
  const linkedProjects = useMemo(
    () => projects.filter((p) => p.notebook_id === notebookId && notebookId),
    [projects, notebookId]
  )

  // Quick Research state
  const [runningTemplateId, setRunningTemplateId] = useState<string | null>(null)

  // Update notebook mutation
  const updateNotebook = useUpdateNotebook()

  // State values for instant-edit inputs
  const [clientName, setClientName] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [description, setDescription] = useState('')
  const [prospectWebsite, setProspectWebsite] = useState('')
  const [closeDate, setCloseDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [customerId, setCustomerId] = useState('')
  
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({
    client_name: 'idle',
    estimated_value: 'idle',
    description: 'idle',
    prospect_website: 'idle',
    close_date: 'idle',
    assigned_to: 'idle',
    customer_id: 'idle',
  })

  // Contact list inputs
  const [newContactName, setNewContactName] = useState('')
  const [newContactRole, setNewContactRole] = useState('')
  const [newContactEmail, setNewContactEmail] = useState('')
  const [contactSaveStatus, setContactSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Manual scraper paste states
  const [manualScrapeText, setManualScrapeText] = useState('')
  const [submittingManualPaste, setSubmittingManualPaste] = useState(false)

  // Synchronize input states when notebook loaded
  useEffect(() => {
    if (notebook) {
      setClientName(notebook.client_name || '')
      setEstimatedValue(notebook.estimated_value?.toString() || '0')
      setDescription(notebook.description || '')
      setProspectWebsite(notebook.prospect_website || '')
      setCloseDate(notebook.close_date || '')
      setAssignedTo(notebook.assigned_to || '')
      setCustomerId(notebook.customer_id || '')
    }
  }, [notebook])

  // Automatically select all sources & notes in the RAG context
  const contextSelections = useMemo(() => {
    const sourcesSel: Record<string, 'off' | 'insights' | 'full'> = {}
    sources.forEach((s) => {
      sourcesSel[s.id] = 'full'
    })
    const notesSel: Record<string, 'off' | 'full'> = {}
    notes.forEach((n) => {
      notesSel[n.id] = 'full'
    })
    return { sources: sourcesSel, notes: notesSel }
  }, [sources, notes])

  // Hook for full RAG conversation in context of this client dossier
  const chat = useNotebookChat({
    notebookId: notebookId || '',
    sources,
    notes,
    contextSelections,
  })

  // Calculate token count and source indicators for ChatPanel
  const contextStats = useMemo(() => {
    return {
      sourcesInsights: 0,
      sourcesFull: sources.length,
      notesCount: notes.length,
      tokenCount: chat.tokenCount,
      charCount: chat.charCount,
    }
  }, [sources, notes, chat.tokenCount, chat.charCount])

  // Handle single field blur updates
  const handleFieldBlur = async (
    field: 'client_name' | 'estimated_value' | 'description' | 'prospect_website' | 'close_date'
  ) => {
    if (!notebookId || !notebook) return

    let value: any = ''
    if (field === 'client_name') {
      if (clientName === notebook.client_name) return
      value = clientName
    } else if (field === 'estimated_value') {
      const parsed = parseFloat(estimatedValue)
      if (isNaN(parsed)) return
      if (parsed === notebook.estimated_value) return
      value = parsed
    } else if (field === 'description') {
      if (description === notebook.description) return
      value = description
    } else if (field === 'prospect_website') {
      if (prospectWebsite === notebook.prospect_website) return
      value = prospectWebsite
    } else if (field === 'close_date') {
      if (closeDate === notebook.close_date) return
      value = closeDate === '' ? null : closeDate
    }

    try {
      setSaveStatus((prev) => ({ ...prev, [field]: 'saving' }))
      await updateNotebook.mutateAsync({
        id: notebookId,
        data: { [field]: value },
      })
      setSaveStatus((prev) => ({ ...prev, [field]: 'saved' }))
      toast.success(t('pipeline.toast.fieldSaved', 'Field updated successfully'))
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [field]: 'idle' }))
      }, 2000)
    } catch {
      setSaveStatus((prev) => ({ ...prev, [field]: 'idle' }))
      toast.error('Failed to save')
    }
  }

  // Handle select change updates
  const handleSelectChange = async (field: 'assigned_to' | 'customer_id', value: string) => {
    if (!notebookId || !notebook) return
    const actualValue = value === 'none' ? null : value
    const currentVal = notebook[field]
    if (currentVal === actualValue) return

    try {
      setSaveStatus((prev) => ({ ...prev, [field]: 'saving' }))
      await updateNotebook.mutateAsync({
        id: notebookId,
        data: { [field]: actualValue },
      })
      if (field === 'assigned_to') setAssignedTo(value)
      if (field === 'customer_id') setCustomerId(value)
      setSaveStatus((prev) => ({ ...prev, [field]: 'saved' }))
      toast.success(t('pipeline.toast.fieldSaved', 'Field updated successfully'))
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [field]: 'idle' }))
      }, 2000)
    } catch {
      setSaveStatus((prev) => ({ ...prev, [field]: 'idle' }))
      toast.error('Failed to save')
    }
  }

  // Contacts handlers
  const handleAddContact = async () => {
    if (!notebookId || !notebook) return
    if (!newContactName.trim()) return

    const newContact = {
      name: newContactName.trim(),
      role: newContactRole.trim(),
      email: newContactEmail.trim(),
    }

    const updatedContacts = [...(notebook.contacts || []), newContact]

    try {
      setContactSaveStatus('saving')
      await updateNotebook.mutateAsync({
        id: notebookId,
        data: { contacts: updatedContacts },
      })
      setNewContactName('')
      setNewContactRole('')
      setNewContactEmail('')
      setContactSaveStatus('saved')
      setTimeout(() => setContactSaveStatus('idle'), 2000)
      toast.success(t('pipeline.toast.contactAdded', 'Contact added successfully'))
    } catch (err) {
      console.error(err)
      setContactSaveStatus('idle')
      toast.error(t('pipeline.toast.contactAddFailed', 'Failed to add contact'))
    }
  }

  const handleRemoveContact = async (indexToRemove: number) => {
    if (!notebookId || !notebook) return

    const updatedContacts = (notebook.contacts || []).filter((_, idx) => idx !== indexToRemove)

    try {
      await updateNotebook.mutateAsync({
        id: notebookId,
        data: { contacts: updatedContacts },
      })
      toast.success(t('pipeline.toast.contactRemoved', 'Contact removed'))
    } catch (err) {
      console.error(err)
      toast.error('Failed to remove contact')
    }
  }

  const handleAddSuggestedContact = async (suggested: Record<string, string>, indexToRemove: number) => {
    if (!notebookId || !notebook) return

    const updatedContacts = [...(notebook.contacts || []), suggested]
    const updatedSuggested = (notebook.suggested_contacts || []).filter((_, idx) => idx !== indexToRemove)

    try {
      await updateNotebook.mutateAsync({
        id: notebookId,
        data: {
          contacts: updatedContacts,
          suggested_contacts: updatedSuggested,
        },
      })
      toast.success(t('pipeline.toast.suggestedContactAdded', 'Contact added to dossier'))
    } catch (err) {
      console.error(err)
      toast.error('Failed to add contact')
    }
  }

  // Manual copy-paste submit
  const createSource = useCreateSource()

  const handleManualPasteSubmit = async () => {
    if (!notebookId || !manualScrapeText.trim()) return

    try {
      setSubmittingManualPaste(true)
      await createSource.mutateAsync({
        notebooks: [notebookId],
        type: 'text',
        content: manualScrapeText,
        title: `Manual Web Scraper Paste (${new Date().toLocaleDateString()})`,
        embed: true,
        async_processing: false,
      })

      // Set crawl_failed to false since manual paste bypassed it
      await updateNotebook.mutateAsync({
        id: notebookId,
        data: { crawl_failed: false },
      })

      setManualScrapeText('')
      toast.success('Source added')
    } catch (err) {
      console.error(err)
      toast.error('Failed to parse source')
    } finally {
      setSubmittingManualPaste(false)
    }
  }

  // Handle stage dropdown updates immediately onSelect
  const handleStageChange = async (newStage: string) => {
    if (!notebookId || !notebook || newStage === notebook.stage) return

    try {
      await updateNotebook.mutateAsync({
        id: notebookId,
        data: { stage: newStage },
      })
      toast.success(t('pipeline.toast.stageUpdated', 'Pipeline stage updated'))
    } catch (err) {
      console.error(err)
      toast.error('Failed to update stage')
    }
  }

  const currentPipelineType = (notebook?.pipeline_type || 'sales') as PipelineType

  const stageOptions = useMemo(() => {
    const config = PIPELINE_COLUMNS[currentPipelineType]
    if (!config) return []
    return config.stages.map((stage) => ({
      value: stage,
      label: t(`pipeline.stage.${stage}`, config.titles[stage] || stage),
    }))
  }, [currentPipelineType, t])

  const getStageColor = (stage?: string) => {
    if (!stage) return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    const config = PIPELINE_COLUMNS[currentPipelineType]
    const colorInfo = config?.colors[stage]
    return colorInfo?.badgeClass || 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl md:max-w-3xl flex flex-col h-full p-0 overflow-hidden bg-background border-l border-sidebar-border">
        {notebookLoading ? (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : !notebook ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>{t('pipeline.dealNotFound', 'Dossier not found.')}</p>
          </div>
        ) : (
          <>
            <SheetHeader className="px-6 pt-6 pb-2 border-b-0">
              <div className="flex items-center justify-between mt-2 pr-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Client Dossier
                    </span>
                    <Badge variant="outline" className={getStageColor(notebook.stage)}>
                      {stageOptions.find((opt) => opt.value === notebook.stage)?.label || notebook.stage || 'Lead'}
                    </Badge>
                  </div>
                  <SheetTitle className="text-xl font-bold tracking-tight text-foreground truncate" title={notebook.name}>
                    {notebook.name}
                  </SheetTitle>
                </div>

                <div className="pr-4">
                  <Link href={`/notebooks/${notebook.id}`} passHref>
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2">
                      {t('pipeline.openWorkspace', 'Open Workspace')}
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </SheetHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="bg-muted/40 p-1 border border-sidebar-border rounded-lg grid grid-cols-4 max-w-lg mx-6 mb-2">
                <TabsTrigger value="details" className="text-xs py-1.5 rounded-md font-medium data-[state=active]:bg-sidebar-accent">
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  {t('pipeline.tab.details', 'Details')}
                </TabsTrigger>
                <TabsTrigger value="chat" className="text-xs py-1.5 rounded-md font-medium data-[state=active]:bg-sidebar-accent">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary animate-pulse" />
                  {t('pipeline.tab.ragChat', 'Prospect AI')}
                </TabsTrigger>
                <TabsTrigger value="quick-research" className="text-xs py-1.5 rounded-md font-medium data-[state=active]:bg-sidebar-accent">
                  <Telescope className="h-3.5 w-3.5 mr-1.5 text-sky-500" />
                  GTM Research
                </TabsTrigger>
                <TabsTrigger value="sources" className="text-xs py-1.5 rounded-md font-medium data-[state=active]:bg-sidebar-accent">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  {t('pipeline.tab.research', 'Research')}
                  {(sources.length > 0) && (
                    <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px] bg-sidebar-border text-foreground font-mono">
                      {sources.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <Separator className="mx-6 mb-2 opacity-50" />

              {/* Tab: Details */}
              <TabsContent value="details" className="flex-1 overflow-y-auto px-6 pb-6 focus-visible:outline-none">
                <div className="space-y-6 pb-6">
                  {/* Client Name Input */}
                  <div className="space-y-2 relative">
                    <Label htmlFor="client-name" className="text-sm font-semibold flex justify-between">
                      <span>{t('pipeline.field.clientName', 'Target Client Name')}</span>
                      {saveStatus.client_name === 'saving' && <span className="text-xs font-normal text-muted-foreground">Auto-saving...</span>}
                      {saveStatus.client_name === 'saved' && (
                        <span className="text-xs font-normal text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Saved
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="client-name"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        onBlur={() => handleFieldBlur('client_name')}
                        onKeyDown={(e) => e.key === 'Enter' && handleFieldBlur('client_name')}
                        placeholder={t('pipeline.field.clientNamePlaceholder', 'e.g. Lockheed Martin')}
                        className="pl-9 bg-background/50 border-sidebar-border hover:border-muted-foreground/30 focus-visible:border-primary"
                      />
                    </div>
                  </div>

                  {/* Prospect Website URL */}
                  <div className="space-y-2">
                    <Label htmlFor="prospect-website" className="text-sm font-semibold flex justify-between">
                      <span>{t('pipeline.field.prospectWebsite', 'Prospect Website URL')}</span>
                      {saveStatus.prospect_website === 'saving' && <span className="text-xs font-normal text-muted-foreground">Auto-saving...</span>}
                      {saveStatus.prospect_website === 'saved' && (
                        <span className="text-xs font-normal text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Saved
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="prospect-website"
                        value={prospectWebsite}
                        onChange={(e) => setProspectWebsite(e.target.value)}
                        onBlur={() => handleFieldBlur('prospect_website')}
                        onKeyDown={(e) => e.key === 'Enter' && handleFieldBlur('prospect_website')}
                        placeholder="e.g. https://lockheedmartin.com"
                        className="pl-9 bg-background/50 border-sidebar-border hover:border-muted-foreground/30 focus-visible:border-primary font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Value and Stage Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Deal Value Input */}
                    <div className="space-y-2">
                      <Label htmlFor="deal-value" className="text-sm font-semibold flex justify-between">
                        <span>{t('pipeline.field.value', 'Estimated Value (USD)')}</span>
                        {saveStatus.estimated_value === 'saving' && <span className="text-xs font-normal text-muted-foreground">Saving...</span>}
                        {saveStatus.estimated_value === 'saved' && (
                          <span className="text-xs font-normal text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Saved
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="deal-value"
                          type="number"
                          value={estimatedValue}
                          onChange={(e) => setEstimatedValue(e.target.value)}
                          onBlur={() => handleFieldBlur('estimated_value')}
                          onKeyDown={(e) => e.key === 'Enter' && handleFieldBlur('estimated_value')}
                          placeholder="e.g. 50000"
                          className="pl-9 bg-background/50 border-sidebar-border font-mono hover:border-muted-foreground/30 focus-visible:border-primary"
                        />
                      </div>
                    </div>

                    {/* Deal Stage Selector */}
                    <div className="space-y-2">
                      <Label htmlFor="deal-stage" className="text-sm font-semibold">
                        {t('pipeline.field.stage', 'Pipeline Stage')}
                      </Label>
                      <Select value={notebook.stage || stageOptions[0]?.value || 'lead'} onValueChange={handleStageChange}>
                        <SelectTrigger id="deal-stage" className="bg-background/50 border-sidebar-border hover:border-muted-foreground/30 focus:border-primary">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent className="border-sidebar-border">
                          {stageOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                               {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Close Date Input */}
                    <div className="space-y-2">
                      <Label htmlFor="close-date" className="text-sm font-semibold flex justify-between">
                        <span>Close Date</span>
                        {saveStatus.close_date === 'saving' && <span className="text-xs font-normal text-muted-foreground">Saving...</span>}
                        {saveStatus.close_date === 'saved' && (
                          <span className="text-xs font-normal text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Saved
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="close-date"
                          type="date"
                          value={closeDate}
                          onChange={(e) => setCloseDate(e.target.value)}
                          onBlur={() => handleFieldBlur('close_date')}
                          className="pl-9 bg-background/50 border-sidebar-border hover:border-muted-foreground/30 focus-visible:border-primary text-xs"
                        />
                      </div>
                    </div>

                    {/* Assigned User Selector */}
                    <div className="space-y-2">
                      <Label htmlFor="assigned-to" className="text-sm font-semibold flex justify-between">
                        <span>Assigned Member</span>
                        {saveStatus.assigned_to === 'saving' && <span className="text-xs font-normal text-muted-foreground">Saving...</span>}
                        {saveStatus.assigned_to === 'saved' && (
                          <span className="text-xs font-normal text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Saved
                          </span>
                        )}
                      </Label>
                      <Select value={assignedTo || 'none'} onValueChange={(v) => handleSelectChange('assigned_to', v)}>
                        <SelectTrigger id="assigned-to" className="bg-background/50 border-sidebar-border hover:border-muted-foreground/30 focus:border-primary">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent className="border-sidebar-border">
                          <SelectItem value="none">Unassigned</SelectItem>
                          {users?.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Linked Customer Selector */}
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="customer-id" className="text-sm font-semibold flex justify-between">
                        <span>Linked Customer Account</span>
                        {saveStatus.customer_id === 'saving' && <span className="text-xs font-normal text-muted-foreground">Saving...</span>}
                        {saveStatus.customer_id === 'saved' && (
                          <span className="text-xs font-normal text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Saved
                          </span>
                        )}
                      </Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select value={customerId || 'none'} onValueChange={(v) => handleSelectChange('customer_id', v)}>
                            <SelectTrigger id="customer-id" className="bg-background/50 border-sidebar-border hover:border-muted-foreground/30 focus:border-primary">
                              <SelectValue placeholder="Not linked" />
                            </SelectTrigger>
                            <SelectContent className="border-sidebar-border">
                              <SelectItem value="none">Not linked</SelectItem>
                              {customers?.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name || c.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {notebook.customer_id && (
                          <Link href={`/customers/${notebook.customer_id.replace(/^customer:/, '')}`} passHref>
                            <Button type="button" variant="outline" className="border-sidebar-border hover:bg-sidebar-accent shrink-0 text-xs font-semibold gap-1.5 h-10">
                              View Account
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Deal Description Textarea */}
                  <div className="space-y-2">
                    <Label htmlFor="deal-description" className="text-sm font-semibold flex justify-between">
                      <span>{t('pipeline.field.description', 'Prospect Profile & Goals')}</span>
                      {saveStatus.description === 'saving' && <span className="text-xs font-normal text-muted-foreground">Saving...</span>}
                      {saveStatus.description === 'saved' && (
                        <span className="text-xs font-normal text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Saved
                        </span>
                      )}
                    </Label>
                    <Textarea
                      id="deal-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={() => handleFieldBlur('description')}
                      placeholder={t('pipeline.field.descriptionPlaceholder', 'Outline the client pain points, contract terms, or security alignment gaps...')}
                      rows={4}
                      className="bg-background/50 border-sidebar-border hover:border-muted-foreground/30 focus-visible:border-primary resize-none"
                    />
                  </div>

                  {/* CRM Stakeholder Contacts Dossier */}
                  <div className="space-y-3 p-4 border border-sidebar-border rounded-xl bg-background/30 backdrop-blur-sm shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold text-foreground">CRM Stakeholder Dossier</h4>
                      </div>
                      {contactSaveStatus === 'saving' && <span className="text-[10px] text-muted-foreground">Adding...</span>}
                      {contactSaveStatus === 'saved' && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Added</span>}
                    </div>
                    
                    {/* Add Contact Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <Input
                        placeholder="Name (e.g. John Doe)"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        className="h-8 text-xs bg-background/40 border-sidebar-border"
                      />
                      <Input
                        placeholder="Role (e.g. CTO)"
                        value={newContactRole}
                        onChange={(e) => setNewContactRole(e.target.value)}
                        className="h-8 text-xs bg-background/40 border-sidebar-border"
                      />
                      <div className="flex gap-2">
                        <Input
                          placeholder="Email"
                          value={newContactEmail}
                          onChange={(e) => setNewContactEmail(e.target.value)}
                          className="h-8 text-xs bg-background/40 border-sidebar-border flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={handleAddContact}
                          className="h-8 px-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 hover:scale-105 active:scale-95 transition-transform shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Existing Contacts List */}
                    {notebook.contacts && notebook.contacts.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-2 border-t border-sidebar-border/30">
                        {notebook.contacts.map((contact, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-sidebar-border bg-background/60 dark:bg-background/40 hover:bg-sidebar-accent/50 transition-colors"
                          >
                            <div className="overflow-hidden min-w-0 pr-2">
                              <p className="text-xs font-semibold text-foreground truncate" title={contact.name}>{contact.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[120px]" title={contact.role || 'Stakeholder'}>{contact.role || 'Stakeholder'}</span>
                                {contact.email && (
                                  <>
                                    <span className="text-[8px] text-muted-foreground/30">•</span>
                                    <span className="text-[9px] text-muted-foreground/75 font-mono truncate" title={contact.email}>{contact.email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveContact(idx)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/15 transition-colors shrink-0 rounded-md"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic text-center py-4 bg-background/10 rounded-lg mt-3">
                        No stakeholders added to dossier yet.
                      </p>
                    )}

                    {/* Suggested Contacts Tray */}
                    {notebook.suggested_contacts && notebook.suggested_contacts.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-sidebar-border/30 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AI Suggested Stakeholders</p>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                          {notebook.suggested_contacts.map((suggested, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-200 text-[10px] font-medium"
                            >
                              <span className="font-semibold">{suggested.name}</span>
                              <span className="text-cyan-400/60 font-normal">({suggested.role || 'Staff'})</span>
                              <button
                                onClick={() => handleAddSuggestedContact(suggested, idx)}
                                className="hover:text-cyan-50 text-cyan-400 transition-colors font-bold text-xs"
                                title="Add to CRM Dossier"
                              >
                                ➕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Manual Web Scraper Fallback */}
                  <div className="space-y-3 p-4 border border-sidebar-border rounded-xl bg-background/30 backdrop-blur-sm">
                    {/* Warning Badge if crawler blocked */}
                    {notebook.crawl_failed && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive-foreground mb-1">
                        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-red-500 dark:text-red-400">Prospect Website Crawler Blocked</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                            B2B security crawler was blocked by Cloudflare / CAPTCHA. Paste public company specifications below to manually trigger AI prospecting synthesis.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-bold text-foreground">Manual Scraper Text Paste</h4>
                      </div>
                      {submittingManualPaste && <span className="text-xs text-muted-foreground">Parsing text...</span>}
                    </div>

                    <Textarea
                      placeholder="Paste raw copied text from company website, spec tables, or public documents here..."
                      value={manualScrapeText}
                      onChange={(e) => setManualScrapeText(e.target.value)}
                      rows={4}
                      className="bg-background/40 border-sidebar-border text-xs resize-none"
                    />

                    <Button
                      size="sm"
                      onClick={handleManualPasteSubmit}
                      disabled={submittingManualPaste || !manualScrapeText.trim()}
                      className="w-full h-8 bg-gradient-to-r from-primary to-cyan-500 hover:opacity-90 text-white font-semibold text-xs active:scale-[0.98] transition-transform"
                    >
                      {submittingManualPaste ? 'Compiling Manual Source...' : 'Parse Manual Source Text'}
                    </Button>
                  </div>

                  {/* Cross-Links: Projects & Research */}
                  <div className="space-y-3 p-4 border border-sidebar-border rounded-xl bg-background/30 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-emerald-500" />
                      <h4 className="text-sm font-bold text-foreground">Linked Projects</h4>
                      <Badge variant="outline" className="text-xs ml-auto">{linkedProjects.length}</Badge>
                    </div>
                    {linkedProjects.length > 0 ? (
                      <div className="space-y-1.5">
                        {linkedProjects.map((p) => (
                          <Link key={p.id} href="/projects">
                            <div className="flex items-center justify-between p-2 rounded-lg border border-sidebar-border/50 hover:bg-sidebar-accent/50 transition-colors text-xs">
                              <span className="font-medium text-foreground">{p.name}</span>
                              <Badge variant="outline" className="text-[10px]">{p.stage}</Badge>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No linked projects</p>
                    )}

                    <Separator className="opacity-30" />

                    <div className="flex items-center gap-2">
                      <Telescope className="h-4 w-4 text-sky-500" />
                      <h4 className="text-sm font-bold text-foreground">Linked Research</h4>
                      <Badge variant="outline" className="text-xs ml-auto">{linkedResearch.length}</Badge>
                    </div>
                    {linkedResearch.length > 0 ? (
                      <div className="space-y-1.5">
                        {linkedResearch.map((r) => (
                          <Link key={r.id} href="/research">
                            <div className="flex items-center justify-between p-2 rounded-lg border border-sidebar-border/50 hover:bg-sidebar-accent/50 transition-colors text-xs">
                              <span className="font-medium text-foreground">{r.name}</span>
                              <Badge variant="outline" className="text-[10px]">{r.stage}</Badge>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No linked research items</p>
                    )}
                  </div>

                  {/* SOW Drafting CTA Card */}
                  <Card className="bg-gradient-to-r from-primary/10 via-violet-500/5 to-background border-sidebar-border shadow-md overflow-hidden relative group">
                    <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                          B2B Proposal & SOW Draft compiler
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-md">
                          Deploy AI agents to auto-generate customized B2B Statements of Work, Security alignment proposals, and audit briefs directly in Microsoft Word format.
                        </p>
                      </div>
                      <Link href={`/notebooks/${notebook.id}`} passHref className="w-full md:w-auto">
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 group-hover:scale-105 transition-transform duration-200">
                          Launch Compiler
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab: Prospect Chat */}
              <TabsContent value="chat" className="flex-1 overflow-hidden focus-visible:outline-none flex flex-col px-6 pb-6">
                <div className="flex-1 flex flex-col overflow-hidden bg-background border border-sidebar-border rounded-xl shadow-lg">
                  {sourcesLoading || notesLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <ChatPanel
                      title={t('chat.chatWithNotebook', 'Prospect RAG Analyst')}
                      contextType="notebook"
                      messages={chat.messages}
                      isStreaming={chat.isSending}
                      contextIndicators={null}
                      onSendMessage={(message, modelOverride) => chat.sendMessage(message, modelOverride)}
                      modelOverride={chat.currentSession?.model_override ?? chat.pendingModelOverride ?? undefined}
                      onModelChange={(model) => chat.setModelOverride(model ?? null)}
                      sessions={chat.sessions}
                      currentSessionId={chat.currentSessionId}
                      onCreateSession={(title) => chat.createSession(title)}
                      onSelectSession={chat.switchSession}
                      onUpdateSession={(sessionId, title) => chat.updateSession(sessionId, { title })}
                      onDeleteSession={chat.deleteSession}
                      loadingSessions={chat.loadingSessions}
                      notebookContextStats={contextStats}
                      notebookId={notebookId || ''}
                    />
                  )}
                </div>
              </TabsContent>

              {/* Tab: Quick Research (GTM Templates) */}
              <TabsContent value="quick-research" className="flex-1 overflow-y-auto px-6 pb-6 focus-visible:outline-none">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Telescope className="h-5 w-5 text-sky-500" />
                    <h3 className="text-sm font-bold text-foreground">Quick GTM Research</h3>
                    <span className="text-xs text-muted-foreground">— Run templates with prospect context</span>
                  </div>

                  {gtmTemplates.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-sidebar-border rounded-xl">
                      <Telescope className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No GTM Research templates configured.</p>
                      <Link href="/transformations">
                        <Button variant="outline" size="sm" className="mt-3">
                          <Plus className="h-3 w-3 mr-1" />
                          Create Templates
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {gtmTemplates.map((template) => {
                        const isRunning = runningTemplateId === template.id
                        const engineLabel = ENGINE_LABELS[template.search_engine as keyof typeof ENGINE_LABELS] || template.search_engine || 'Any'
                        return (
                          <div
                            key={template.id}
                            className={`p-4 border rounded-xl transition-all bg-background/40 backdrop-blur-md ${
                              template.color_tag === 'sky' ? 'border-sky-500/30 hover:border-sky-500/60' :
                              template.color_tag === 'amber' ? 'border-amber-500/30 hover:border-amber-500/60' :
                              template.color_tag === 'violet' ? 'border-violet-500/30 hover:border-violet-500/60' :
                              template.color_tag === 'emerald' ? 'border-emerald-500/30 hover:border-emerald-500/60' :
                              'border-sidebar-border hover:border-sky-500/50'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-foreground">{template.title || template.name}</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                              </div>
                              <Badge variant="outline" className="text-[10px] shrink-0 ml-2">{engineLabel}</Badge>
                            </div>
                            <div className="bg-background/60 rounded-lg p-2 mb-3 border border-sidebar-border/30">
                              <p className="text-xs text-muted-foreground font-mono line-clamp-3">{template.prompt}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-2">
                                <Badge variant="outline" className={`text-[10px] border-${template.color_tag || 'sky'}-500/50 text-${template.color_tag || 'sky'}-500`}>
                                  {template.target_context || 'general'}
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                className="h-7 text-xs gap-1"
                                disabled={isRunning}
                                onClick={async () => {
                                  setRunningTemplateId(template.id)
                                  try {
                                    // Create a research item from this template with prospect context
                                    const query = template.prompt
                                      .replace('{company}', clientName || notebook?.name || '')
                                      .replace('{industry}', notebook?.description || '')
                                      .replace('{contacts}', (notebook?.contacts || []).map((c: Record<string, string>) => `${c.name} (${c.role})`).join(', '))
                                    const item = await createResearch.mutateAsync({
                                      name: `${template.title || template.name} — ${clientName || notebook?.name}`,
                                      query,
                                      engine: template.search_engine || 'perplexity',
                                      notebook_id: notebookId,
                                      transformation_id: template.id,
                                      is_recurring: false,
                                    })
                                    // Auto-execute
                                    if (item?.id) {
                                      await executeResearch.mutateAsync(item.id)
                                    }
                                    toast.success('Research started')
                                  } catch {
                                    toast.error('Failed to run research')
                                  } finally {
                                    setRunningTemplateId(null)
                                  }
                                }}
                              >
                                {isRunning ? (
                                  <><Loader2 className="h-3 w-3 animate-spin" /> Running...</>
                                ) : (
                                  <><Play className="h-3 w-3" /> Run Research</>
                                )}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Past Research Results */}
                  {linkedResearch.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                        <Telescope className="h-3.5 w-3.5" />
                        Past Research Results ({linkedResearch.length})
                      </h4>
                      <div className="space-y-2">
                        {linkedResearch.map((r) => (
                          <div key={r.id} className="p-3 border border-sidebar-border rounded-lg bg-background/40">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-foreground">{r.name}</span>
                              <Badge variant="outline" className="text-[10px]">{r.stage}</Badge>
                            </div>
                            {r.results_summary && (
                              <p className="text-xs text-muted-foreground line-clamp-3">{r.results_summary}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab: Client Research Sources */}
              <TabsContent value="sources" className="flex-1 overflow-y-auto px-6 focus-visible:outline-none flex flex-col pb-6">
                <ScrollArea className="flex-1 border border-sidebar-border rounded-xl bg-background/30 backdrop-blur-sm p-4">
                  {sourcesLoading || notesLoading ? (
                    <div className="flex h-48 items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  ) : sources.length === 0 && notes.length === 0 ? (
                    <div className="flex flex-col h-full items-center justify-center text-center text-muted-foreground p-8">
                      <FileText className="h-10 w-10 mb-3 opacity-30 text-primary" />
                      <p className="text-sm font-semibold">{t('pipeline.noResearch', 'No connected files or websites')}</p>
                      <p className="text-xs mt-1 max-w-sm">
                        Add research artifacts, PDFs, whitepapers, or meeting transcripts directly in the client workspace to feed the Prospect AI agent.
                      </p>
                      <Link href={`/notebooks/${notebook.id}`} passHref className="mt-4">
                        <Button variant="outline" size="sm" className="border-sidebar-border hover:bg-sidebar-accent font-medium">
                          Add Research
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4 pr-3">
                      {sources.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            Connected Sources ({sources.length})
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {sources.map((src) => (
                              <div
                                key={src.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-sidebar-border bg-background/50 hover:bg-sidebar-accent transition-colors duration-200"
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="rounded p-1.5 bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="text-xs font-semibold text-foreground truncate max-w-md">
                                      {src.title || 'Untitled Source'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(src.updated).toLocaleDateString()}
                                      </span>
                                      {src.topics && src.topics.slice(0, 2).map((topic, i) => (
                                        <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0 font-normal">
                                          {topic}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {notes.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Book className="h-3.5 w-3.5" />
                            Notebook Dossier Notes ({notes.length})
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {notes.map((note) => (
                              <div
                                key={note.id}
                                className="p-3 rounded-lg border border-sidebar-border bg-background/50 hover:bg-sidebar-accent transition-colors duration-200"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="rounded p-1.5 bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0 mt-0.5">
                                    <Book className="h-4 w-4" />
                                  </div>
                                  <div className="overflow-hidden w-full">
                                    <p className="text-xs font-semibold text-foreground truncate">
                                      {note.title || 'Untitled Note'}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                                      {note.content || 'Empty note content.'}
                                    </p>
                                    <div className="mt-2 flex items-center justify-between">
                                      <span className="text-[9px] text-muted-foreground font-mono">
                                        {new Date(note.updated).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
