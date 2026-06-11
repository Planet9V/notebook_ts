'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/hooks/use-translation'
import { AppShell } from '@/components/layout/AppShell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
// RadioGroup removed — search now uses card-based mode selector
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Search, ChevronDown, AlertCircle, Settings, Save, MessageCircleQuestion, Wand2, Bot, Database, Layers, Globe, RotateCw, ExternalLink, ShieldCheck, Plus, FileEdit } from 'lucide-react'
import CompliancePage from '@/app/(dashboard)/compliance/page'
import { useSearch } from '@/lib/hooks/use-search'
import { useAsk } from '@/lib/hooks/use-ask'
import { useModelDefaults, useModels } from '@/lib/hooks/use-models'
import { useModalManager } from '@/lib/hooks/use-modal-manager'
import { useTransformations } from '@/lib/hooks/use-transformations'
import { useStyleguides } from '@/lib/hooks/use-styleguides'
import { useAllNotes, useCreateNote, useUpdateNote } from '@/lib/hooks/use-notes'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { StreamingResponse } from '@/components/search/StreamingResponse'
import { AdvancedModelsDialog } from '@/components/search/AdvancedModelsDialog'
import { SaveToNotebooksDialog } from '@/components/search/SaveToNotebooksDialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { useAnalytics } from '@/lib/hooks/use-analytics'

export default function SearchPage({
  embedded = false,
  controlledTab,
  onTabChange,
}: {
  embedded?: boolean
  controlledTab?: 'ask' | 'search' | 'compliance'
  onTabChange?: (tab: 'ask' | 'search' | 'compliance') => void
} = {}) {
  const { t } = useTranslation()
  const { trackEvent } = useAnalytics()
  // URL params
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  const urlQuery = searchParams?.get('q') || ''
  const rawMode = searchParams?.get('mode')
  const urlTab = searchParams?.get('tab')
  const activeTabFromUrl = ['ask', 'search', 'compliance'].includes(urlTab || '')
    ? (urlTab as 'ask' | 'search' | 'compliance')
    : (rawMode === 'search' ? 'search' : 'ask')

  const urlMode = rawMode === 'search' ? 'search' : 'ask'

  // Tab state (controlled)
  const [activeTab, setActiveTab] = useState<'ask' | 'search' | 'compliance'>(activeTabFromUrl)

  const handleTabChange = (val: string) => {
    trackEvent('workspace_tab_changed', { workspace: 'intelligence', tab_name: val })
    const targetTab = val as 'ask' | 'search' | 'compliance'
    if (onTabChange) {
      onTabChange(targetTab)
    } else {
      setActiveTab(targetTab)
      if (!embedded) {
        const params = new URLSearchParams(window.location.search)
        params.set('tab', val)
        router.replace(`${pathname}?${params.toString()}`)
      }
    }
  }

  // Search state
  const [searchQuery, setSearchQuery] = useState(urlMode === 'search' ? urlQuery : '')
  const [searchType, setSearchType] = useState<'vector' | 'hybrid'>('vector')
  const [searchSources, setSearchSources] = useState(true)
  const [searchNotes, setSearchNotes] = useState(true)
  const [searchConfigs, setSearchConfigs] = useState({
    vector: { limit: 50, minimumScore: 0.2, reranker: false },
    hybrid: { limit: 50, minimumScore: 0.2, reranker: false },
  })
  const [showConfig, setShowConfig] = useState(false)

  // Ask state
  const [askQuestion, setAskQuestion] = useState(urlMode === 'ask' ? urlQuery : '')

  // Advanced models dialog
  const [showAdvancedModels, setShowAdvancedModels] = useState(false)
  const [customModels, setCustomModels] = useState<{
    strategy: string
    answer: string
    finalAnswer: string
  } | null>(null)

  // Save to notebooks dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Hooks
  const searchMutation = useSearch()
  const ask = useAsk()
  const { data: modelDefaults, isLoading: modelsLoading } = useModelDefaults()
  const { data: availableModels } = useModels()
  const { openModal } = useModalManager()

  // Research Note Scratchpad States & Mutations
  const { data: notesList = [], refetch: refetchNotes } = useAllNotes()
  const createNoteMutation = useCreateNote()
  const updateNoteMutation = useUpdateNote()

  const [activeNoteId, setActiveNoteId] = useState<string>('')
  const [activeNoteTitle, setActiveNoteTitle] = useState('')
  const [activeNoteContent, setActiveNoteContent] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  // Load selected note content into scratchpad
  useEffect(() => {
    if (activeNoteId && activeNoteId !== 'new') {
      const selected = notesList.find((n) => n.id === activeNoteId)
      if (selected) {
        setActiveNoteTitle(selected.title || '')
        setActiveNoteContent(selected.content || '')
      }
    } else if (activeNoteId === 'new') {
      // Keep editor empty or with default template
    }
  }, [activeNoteId, notesList])

  const handleSaveNote = async () => {
    if (!activeNoteTitle.trim()) return
    setIsSavingNote(true)
    try {
      if (activeNoteId && activeNoteId !== 'new') {
        await updateNoteMutation.mutateAsync({
          id: activeNoteId,
          data: { title: activeNoteTitle, content: activeNoteContent }
        })
      } else {
        const newNote = await createNoteMutation.mutateAsync({
          title: activeNoteTitle,
          content: activeNoteContent,
          note_type: 'human'
        })
        if (newNote && newNote.id) {
          setActiveNoteId(newNote.id)
        }
      }
      refetchNotes()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleCreateNewNote = () => {
    setActiveNoteId('new')
    setActiveNoteTitle(`Research Scratchpad - ${new Date().toLocaleDateString()}`)
    setActiveNoteContent('')
  }

  const handleAppendToNote = async (title: string, matches: string[], origin: string) => {
    const snippets = matches.map(m => `* ${m}`).join('\n')
    const formattedText = `\n\n### Findings: ${title} (${origin})\n${snippets}`
    
    let currentTitle = activeNoteTitle
    let currentContent = activeNoteContent + formattedText
    
    // Auto-save/create
    if (!activeNoteId || activeNoteId === 'new') {
      const generatedTitle = currentTitle || `Research Scratchpad - ${new Date().toLocaleDateString()}`
      setActiveNoteTitle(generatedTitle)
      setActiveNoteContent(currentContent)
      
      const newNote = await createNoteMutation.mutateAsync({
        title: generatedTitle,
        content: currentContent,
        note_type: 'human'
      })
      if (newNote && newNote.id) {
        setActiveNoteId(newNote.id)
      }
    } else {
      setActiveNoteContent(currentContent)
      await updateNoteMutation.mutateAsync({
        id: activeNoteId,
        data: { title: currentTitle, content: currentContent }
      })
    }
    refetchNotes()
  }

  const [engine, setEngine] = useState<'local' | 'hybrid' | 'perplexity'>('local')
  const [selectedTransformationId, setSelectedTransformationId] = useState<string>('')
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [customPrompt, setCustomPrompt] = useState<string>('')
  const [outputFormatting, setOutputFormatting] = useState<string>('')
  const [selectedStyleguideId, setSelectedStyleguideId] = useState<string>('')

  const { data: transformations = [] } = useTransformations()
  const { data: styleguides = [] } = useStyleguides()

  const modelNameById = useMemo(() => {
    if (!availableModels) {
      return new Map<string, string>()
    }
    return new Map(availableModels.map((model) => [model.id, model.name]))
  }, [availableModels])

  const perplexityModels = useMemo(() => {
    if (!availableModels) return []
    return availableModels.filter((m) => m.provider === 'perplexity')
  }, [availableModels])

  const resolveModelName = (id?: string | null) => {
    if (!id) return t('searchPage.notSet')
    return modelNameById.get(id) ?? id
  }

  const hasEmbeddingModel = !!modelDefaults?.default_embedding_model

  // Track if we've already auto-triggered from URL params
  const hasAutoTriggeredRef = useRef(false)
  const lastUrlParamsRef = useRef({ q: '', mode: '' })

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return

    const currentConfig = searchConfigs[searchType]
    trackEvent('search_submitted', {
      query_length: searchQuery.length,
      mode: 'search',
      search_type: searchType,
      limit: currentConfig.limit,
      reranker: currentConfig.reranker,
    })
    searchMutation.mutate({
      query: searchQuery,
      type: searchType,
      limit: currentConfig.limit,
      search_sources: searchSources,
      search_notes: searchNotes,
      minimum_score: currentConfig.minimumScore,
      reranker: currentConfig.reranker,
    })
  }, [searchQuery, searchType, searchSources, searchNotes, searchConfigs, searchMutation, trackEvent])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleAsk = useCallback(() => {
    if (!askQuestion.trim()) return

    trackEvent('search_submitted', {
      query_length: askQuestion.length,
      mode: 'ask',
      engine,
      has_custom_prompt: !!customPrompt,
    })

    if (engine === 'local') {
      if (!modelDefaults?.default_chat_model) return
      const models = customModels || {
        strategy: modelDefaults.default_chat_model,
        answer: modelDefaults.default_chat_model,
        finalAnswer: modelDefaults.default_chat_model
      }
      ask.sendAsk(askQuestion, models)
    } else {
      ask.sendResearch(
        askQuestion,
        engine,
        selectedTransformationId && selectedTransformationId !== 'none' ? selectedTransformationId : undefined,
        selectedModelId && selectedModelId !== 'default' ? selectedModelId : undefined,
        customPrompt || undefined,
        outputFormatting || undefined,
        selectedStyleguideId && selectedStyleguideId !== 'none' ? selectedStyleguideId : undefined
      )
    }
  }, [askQuestion, engine, modelDefaults, customModels, selectedTransformationId, selectedModelId, customPrompt, outputFormatting, selectedStyleguideId, ask, trackEvent])

  // Auto-trigger search/ask when arriving with URL params
  useEffect(() => {
    // Skip if already triggered or no query
    if (hasAutoTriggeredRef.current || !urlQuery) return

    // Wait for models to load before triggering ask
    if (urlMode === 'ask' && modelsLoading) return

    if (urlMode === 'search') {
      handleSearch()
      hasAutoTriggeredRef.current = true
    } else if (urlMode === 'ask' && modelDefaults?.default_chat_model) {
      handleAsk()
      hasAutoTriggeredRef.current = true
    }
  }, [urlQuery, urlMode, modelsLoading, modelDefaults, handleSearch, handleAsk])

  // Load default search settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('search_configs')
      if (saved) {
        try {
          setSearchConfigs(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to parse search configs from localStorage', e)
        }
      } else {
        const oldReranker = localStorage.getItem('default_reranker_enabled') === 'true'
        if (oldReranker) {
          setSearchConfigs({
            vector: { limit: 50, minimumScore: 0.2, reranker: true },
            hybrid: { limit: 50, minimumScore: 0.2, reranker: true },
          })
        }
      }
    }
  }, [])

  const updateSearchConfig = (type: 'vector' | 'hybrid', key: string, value: any) => {
    setSearchConfigs((prev) => {
      const updated = {
        ...prev,
        [type]: {
          ...prev[type],
          [key]: value,
        },
      }
      localStorage.setItem('search_configs', JSON.stringify(updated))
      return updated
    })
  }

  // Handle URL param changes while on page (e.g., from command palette again)
  useEffect(() => {
    const currentQ = searchParams?.get('q') || ''
    const rawCurrentMode = searchParams?.get('mode')
    const currentMode = rawCurrentMode === 'search' ? 'search' : 'ask'

    // Check if URL params have changed
    if (currentQ !== lastUrlParamsRef.current.q || currentMode !== lastUrlParamsRef.current.mode) {
      lastUrlParamsRef.current = { q: currentQ, mode: currentMode }

      if (currentQ) {
        // Update state based on mode
        if (currentMode === 'search') {
          setSearchQuery(currentQ)
          setActiveTab('search')
          // Reset trigger flag so we auto-trigger with new params
          hasAutoTriggeredRef.current = false
        } else {
          setAskQuestion(currentQ)
          setActiveTab('ask')
          hasAutoTriggeredRef.current = false
        }
      }
    }
  }, [searchParams])

  const renderScratchpad = () => (
    <Card className="border border-white/5 bg-slate-950/20 rounded-2xl flex flex-col h-full">
      <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <FileEdit className="h-5 w-5 text-cyan-400" />
          <CardTitle className="text-sm font-bold uppercase tracking-wider font-mono">Researcher Scratchpad</CardTitle>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreateNewNote}
          disabled={createNoteMutation.isPending}
          className="h-8 text-xs font-mono border-white/10 hover:bg-white/5"
        >
          <Plus className="h-3 w-3 mr-1" />
          New Note
        </Button>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col space-y-4 flex-1">
        {/* Dropdown to select note */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold font-mono tracking-wider text-muted-foreground">Select Active Note</label>
          <Select value={activeNoteId} onValueChange={setActiveNoteId}>
            <SelectTrigger className="w-full text-xs h-9 bg-slate-900/40 border-white/5">
              <SelectValue placeholder="-- Select Note --" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-white/10 text-xs">
              <SelectItem value="new" disabled>New Scratchpad Note</SelectItem>
              {notesList.map((note) => (
                <SelectItem key={note.id} value={note.id || ''}>
                  {note.title || 'Untitled Note'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Note Title Input */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold font-mono tracking-wider text-muted-foreground">Note Title</label>
          <Input
            type="text"
            placeholder="Research Summary Title"
            value={activeNoteTitle}
            onChange={(e) => setActiveNoteTitle(e.target.value)}
            className="text-xs h-9 bg-slate-900/40 border-white/5 font-mono text-white"
          />
        </div>

        {/* Note Content Textarea */}
        <div className="space-y-1 flex-1 flex flex-col">
          <label className="text-[10px] uppercase font-bold font-mono tracking-wider text-muted-foreground">Note Body (Markdown)</label>
          <Textarea
            placeholder="Compile findings here. Type manually, edit, or click 'Append' on search results to append content automatically."
            value={activeNoteContent}
            onChange={(e) => setActiveNoteContent(e.target.value)}
            className="text-xs bg-slate-900/40 border-white/5 font-mono resize-none min-h-[300px] text-white flex-1"
          />
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSaveNote}
          disabled={isSavingNote || !activeNoteTitle.trim()}
          className="w-full h-9 text-xs font-mono uppercase bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold"
        >
          {isSavingNote ? (
            <>
              <LoadingSpinner size="sm" className="mr-2 text-slate-950" />
              Saving Note...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Note
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )

  const tabValue = controlledTab || activeTab

  const content = (
    <Tabs value={tabValue} onValueChange={handleTabChange} className="w-full space-y-6">
      {!embedded && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('searchPage.chooseAMode')}</p>
          <TabsList aria-label={t('common.accessibility.searchKB')} className="w-full max-w-2xl grid grid-cols-3 bg-slate-900/60 p-1 border border-white/5 rounded-xl">
            <TabsTrigger value="ask">
              <MessageCircleQuestion className="h-4 w-4" />
              {t('searchPage.askBeta')}
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="h-4 w-4" />
              {t('searchPage.search')}
            </TabsTrigger>
            <TabsTrigger value="compliance">
              <ShieldCheck className="h-4 w-4" />
              <span>Compliance Hub</span>
            </TabsTrigger>
          </TabsList>
        </div>
      )}

      <TabsContent value="ask" className={cn(embedded ? "mt-0" : "mt-6")}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('searchPage.askYourKb')}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t('searchPage.askYourKbDesc')}
                    </p>
                  </CardHeader>
              <CardContent className="space-y-6">
                {/* Search Engine Mode Selector */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Research Intelligence Mode</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Local KB RAG */}
                    <button
                      type="button"
                      onClick={() => setEngine('local')}
                      disabled={ask.isStreaming}
                      className={cn(
                        "relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-300 backdrop-blur-md shadow-sm",
                        engine === 'local'
                          ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/30"
                          : "border-border/40 bg-background/50 hover:bg-accent/40"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center gap-1.5">
                          <Database className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-foreground">Local KB RAG</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/20 text-primary">vector</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Search and synthesize from your local knowledge base using vector search.
                      </p>
                    </button>

                    {/* Hybrid Multi-Engine */}
                    <button
                      type="button"
                      onClick={() => setEngine('hybrid')}
                      disabled={ask.isStreaming}
                      className={cn(
                        "relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-300 backdrop-blur-md shadow-sm",
                        engine === 'hybrid'
                          ? "border-violet-500 bg-violet-500/10 shadow-md ring-1 ring-violet-500/30"
                          : "border-border/40 bg-background/50 hover:bg-accent/40"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-violet-500" />
                          <span className="text-sm font-semibold text-foreground">Hybrid Multi-Engine</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-violet-500/20 text-violet-600 dark:text-violet-400">combined</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Local KB + Perplexity + Valyu combined with deduplication and synthesis.
                      </p>
                    </button>

                    {/* Perplexity Online */}
                    <button
                      type="button"
                      onClick={() => setEngine('perplexity')}
                      disabled={ask.isStreaming}
                      className={cn(
                        "relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-300 backdrop-blur-md shadow-sm",
                        engine === 'perplexity'
                          ? "border-purple-500 bg-purple-500/10 shadow-md ring-1 ring-purple-500/30"
                          : "border-border/40 bg-background/50 hover:bg-accent/40"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-4 w-4 text-purple-500" />
                          <span className="text-sm font-semibold text-foreground">Perplexity Online</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-purple-500/20 text-purple-450 dark:text-purple-400">online</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Query Perplexity Online directly for up-to-date web intelligence.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Question Input */}
                <div className="space-y-2">
                  <Label htmlFor="ask-question">{t('searchPage.question')}</Label>
                  <Textarea
                    id="ask-question"
                    name="ask-question"
                    placeholder={t('searchPage.enterQuestionPlaceholder')}
                    value={askQuestion}
                    onChange={(e) => setAskQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      // Submit on Cmd/Ctrl+Enter
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !ask.isStreaming && askQuestion.trim()) {
                        e.preventDefault()
                        handleAsk()
                      }
                    }}
                    disabled={ask.isStreaming}
                    rows={3}
                    aria-label={t('common.accessibility.enterQuestion')}
                  />
                  <p className="text-xs text-muted-foreground">{t('searchPage.pressToSubmit')}</p>
                </div>

                {/* Customizations / Configurations Panel (Follows transparency & config guidelines) */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Research Configuration & Guidelines
                    </Label>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono">
                      Active: {engine === 'local' ? 'Local KB Defaults' : `${engine.toUpperCase()} Live`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Transformation Template Selector */}
                    <div className="space-y-2">
                      <Label htmlFor="transformation-select" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Wand2 className="h-3.5 w-3.5 text-primary" />
                        Search Transformation Template
                      </Label>
                      <Select
                        value={selectedTransformationId}
                        onValueChange={setSelectedTransformationId}
                        disabled={ask.isStreaming}
                      >
                        <SelectTrigger id="transformation-select">
                          <SelectValue placeholder="None (Standard Synthesis)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (Standard Synthesis)</SelectItem>
                          {transformations.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Guide final analysis synthesis with custom business rules, personas, or prospect research.
                      </p>
                    </div>

                    {/* Custom Prompt Guidelines */}
                    <div className="space-y-2">
                        <Label htmlFor="custom-prompt-input" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <Settings className="h-3.5 w-3.5 text-sky-500" />
                          Custom Prompt Guidelines
                        </Label>
                        <Input
                          id="custom-prompt-input"
                          placeholder={engine === 'local' ? 'Unavailable for Local KB' : 'e.g. Focus on regulatory frameworks...'}
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          disabled={ask.isStreaming || engine === 'local'}
                          className="h-10 text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Inject query-specific constraints to guide searching and summarizing.
                        </p>
                      </div>
                  </div>

                  {/* Output Formatting & Style Guide */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    {/* Output Formatting */}
                    <div className="space-y-2">
                      <Label htmlFor="output-formatting" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Settings className="h-3.5 w-3.5 text-amber-500" />
                        Output Formatting
                      </Label>
                      <Textarea
                        id="output-formatting"
                        placeholder="Describe the output format: e.g. Executive summary with bullet points, followed by detailed analysis with section headers..."
                        value={outputFormatting}
                        onChange={(e) => setOutputFormatting(e.target.value)}
                        disabled={ask.isStreaming}
                        rows={3}
                        className="text-xs font-mono resize-none"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Instructions for the Long-Context agent to format and QA the final output.
                      </p>
                    </div>

                    {/* Style Guide Selector */}
                    <div className="space-y-2">
                      <Label htmlFor="styleguide-select" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Wand2 className="h-3.5 w-3.5 text-pink-500" />
                        Style Guide
                      </Label>
                      <Select
                        value={selectedStyleguideId}
                        onValueChange={setSelectedStyleguideId}
                        disabled={ask.isStreaming}
                      >
                        <SelectTrigger id="styleguide-select">
                          <SelectValue placeholder="None (Default Formatting)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (Default Formatting)</SelectItem>
                          {styleguides.map((sg) => (
                            <SelectItem key={sg.id} value={sg.id}>
                              {sg.name} — {sg.guide_type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Apply typography, colors, and layout rules to the final document.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Models Display for Local KB */}
                {engine === 'local' && (
                  !hasEmbeddingModel ? (
                    <div className="flex items-center gap-2 p-3 text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 rounded-md">
                      <AlertCircle className="h-4 w-4" />
                      <span>{t('searchPage.noEmbeddingModel')}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                          {customModels ? t('searchPage.usingCustomModels') : t('searchPage.usingDefaultModels')}
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAdvancedModels(true)}
                          disabled={ask.isStreaming}
                          className="h-auto py-1 px-2"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          {t('searchPage.advanced')}
                        </Button>
                      </div>
                      <div className="flex gap-2 text-xs flex-wrap">
                        <Badge variant="secondary">
                          {t('searchPage.strategy')}: {resolveModelName(customModels?.strategy || modelDefaults?.default_chat_model)}
                        </Badge>
                        <Badge variant="secondary">
                          {t('searchPage.answer')}: {resolveModelName(customModels?.answer || modelDefaults?.default_chat_model)}
                        </Badge>
                        <Badge variant="secondary">
                          {t('searchPage.final')}: {resolveModelName(customModels?.finalAnswer || modelDefaults?.default_chat_model)}
                        </Badge>
                      </div>
                    </div>
                  )
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    onClick={handleAsk}
                    disabled={ask.isStreaming || !askQuestion.trim()}
                    className="w-full"
                  >
                    {ask.isStreaming ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        {t('searchPage.processing')}
                      </>
                    ) : (
                      engine === 'local' ? t('searchPage.ask') : 'Begin Research'
                    )}
                  </Button>

                  {ask.finalAnswer && (
                    <Button
                      variant="outline"
                      onClick={() => setShowSaveDialog(true)}
                      className="w-full"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {t('searchPage.saveToNotebooks')}
                    </Button>
                  )}
                </div>

                {/* Streaming Response */}
                <StreamingResponse
                  isStreaming={ask.isStreaming}
                  strategy={ask.strategy}
                  answers={ask.answers}
                  finalAnswer={ask.finalAnswer}
                  sources={ask.sources}
                  status={ask.status}
                />

                {/* Advanced Models Dialog */}
                <AdvancedModelsDialog
                  open={showAdvancedModels}
                  onOpenChange={setShowAdvancedModels}
                  defaultModels={{
                    strategy: customModels?.strategy || modelDefaults?.default_chat_model || '',
                    answer: customModels?.answer || modelDefaults?.default_chat_model || '',
                    finalAnswer: customModels?.finalAnswer || modelDefaults?.default_chat_model || ''
                  }}
                  onSave={setCustomModels}
                />

                {/* Save to Notebooks Dialog */}
                {ask.finalAnswer && (
                  <SaveToNotebooksDialog
                    open={showSaveDialog}
                    onOpenChange={setShowSaveDialog}
                    question={askQuestion}
                    answer={ask.finalAnswer}
                  />
                )}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2 h-full">
            {renderScratchpad()}
          </div>
        </div>
      </TabsContent>

          <TabsContent value="search" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('searchPage.search')}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t('searchPage.searchDesc')}
                    </p>
                  </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Input */}
                <div className="space-y-2">
                  <Label htmlFor="search-query" className="sr-only">
                    {t('searchPage.search')}
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="search-query"
                      name="search-query"
                      placeholder={t('searchPage.enterSearchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={searchMutation.isPending}
                      className="flex-1"
                      aria-label={t('common.accessibility.enterSearch')}
                      autoComplete="off"
                    />
                    <Button
                      onClick={handleSearch}
                      disabled={searchMutation.isPending || !searchQuery.trim()}
                      aria-label={t('common.accessibility.searchKBBtn')}
                      className="w-full sm:w-auto"
                    >
                      {searchMutation.isPending ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      {t('searchPage.search')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('searchPage.pressToSearch')}</p>
                </div>

                {/* Search Mode Selector */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search Mode</Label>
                  {!hasEmbeddingModel && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
                      <AlertCircle className="h-4 w-4" />
                      <span>{t('searchPage.vectorSearchWarning')}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Vector Search */}
                    <button
                      type="button"
                      onClick={() => setSearchType('vector')}
                      disabled={searchMutation.isPending || !hasEmbeddingModel}
                      className={cn(
                        "relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-300 backdrop-blur-md shadow-sm",
                        searchType === 'vector'
                          ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/30"
                          : "border-border/40 bg-background/50 hover:bg-accent/40"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center gap-1.5">
                          <Database className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-foreground">Vector Search</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/20 text-primary">local</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Semantic search across your local knowledge base using embeddings.
                      </p>
                    </button>

                    {/* Hybrid Search */}
                    <button
                      type="button"
                      onClick={() => setSearchType('hybrid')}
                      disabled={searchMutation.isPending || !hasEmbeddingModel}
                      className={cn(
                        "relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-300 backdrop-blur-md shadow-sm",
                        searchType === 'hybrid'
                          ? "border-violet-500 bg-violet-500/10 shadow-md ring-1 ring-violet-500/30"
                          : "border-border/40 bg-background/50 hover:bg-accent/40"
                      )}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-violet-500" />
                          <span className="text-sm font-semibold text-foreground">Hybrid Search</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-violet-500/20 text-violet-600 dark:text-violet-400">local + valyu</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Local KB vector search combined with Valyu external research.
                      </p>
                    </button>
                  </div>
                </div>

                 {/* Options Row */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-4 w-full">
                    {/* Search Locations */}
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          id="sources"
                          name="sources"
                          checked={searchSources}
                          onCheckedChange={(checked) => setSearchSources(checked as boolean)}
                          disabled={searchMutation.isPending}
                        />
                        {t('searchPage.searchSources')}
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          id="notes"
                          name="notes"
                          checked={searchNotes}
                          onCheckedChange={(checked) => setSearchNotes(checked as boolean)}
                          disabled={searchMutation.isPending}
                        />
                        {t('searchPage.searchNotes')}
                      </label>
                    </div>

                    {/* Search Settings Toggle */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowConfig(!showConfig)}
                      disabled={searchMutation.isPending}
                      className={cn(
                        "flex items-center gap-1.5 text-xs ml-auto border-border/40 bg-background/50 text-muted-foreground hover:bg-accent/40 font-medium",
                        showConfig && "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 shadow-sm"
                      )}
                    >
                      <Settings className={cn("h-3.5 w-3.5", showConfig && "text-primary animate-spin")} style={{ animationDuration: '6s' }} />
                      Search Settings
                    </Button>
                  </div>

                  {/* Settings Sliders Panel */}
                  {showConfig && (
                    <div className="w-full p-4 rounded-xl border border-border/40 bg-sidebar-accent/10 backdrop-blur-md grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Limit Slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold font-mono tracking-wider uppercase text-muted-foreground">Max Results</Label>
                          <span className="text-xs font-mono font-semibold text-primary">{searchConfigs[searchType].limit}</span>
                        </div>
                        <Slider
                          value={[searchConfigs[searchType].limit]}
                          onValueChange={(val) => updateSearchConfig(searchType, 'limit', val[0])}
                          min={5}
                          max={200}
                          step={5}
                          disabled={searchMutation.isPending}
                        />
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Maximum number of matches to retrieve from indexing.
                        </p>
                      </div>

                      {/* Min Score Slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold font-mono tracking-wider uppercase text-muted-foreground">Min Relevance Score</Label>
                          <span className="text-xs font-mono font-semibold text-primary">{searchConfigs[searchType].minimumScore.toFixed(2)}</span>
                        </div>
                        <Slider
                          value={[searchConfigs[searchType].minimumScore]}
                          onValueChange={(val) => updateSearchConfig(searchType, 'minimumScore', val[0])}
                          min={0.0}
                          max={1.0}
                          step={0.05}
                          disabled={searchMutation.isPending}
                        />
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Filter out results with similarity scores below this threshold.
                        </p>
                      </div>

                      {/* Reranker Toggle */}
                      <div className="flex flex-col justify-between space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="reranker-toggle" className="text-xs font-bold font-mono tracking-wider uppercase text-muted-foreground">LLM Reranking</Label>
                          <Checkbox
                            id="reranker-toggle"
                            checked={searchConfigs[searchType].reranker}
                            onCheckedChange={(checked) => updateSearchConfig(searchType, 'reranker', checked as boolean)}
                            disabled={searchMutation.isPending}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Apply secondary LLM relevance scoring to re-sort results.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {searchMutation.data && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">
                        {t('searchPage.resultsFound').replace('{count}', searchMutation.data.total_count.toString())}
                      </h3>
                      <div className="flex items-center gap-2">
                        {searchConfigs[searchType].reranker && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400">
                            <RotateCw className="h-3 w-3 mr-1" />
                            Reranked
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {searchMutation.data.search_type === 'hybrid' ? 'Hybrid' : 'Vector'}
                        </Badge>
                      </div>
                    </div>

                    {searchMutation.data.results.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                          {t('searchPage.noResultsFor').replace('{query}', searchQuery)}
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {searchMutation.data.results.map((result, index) => {
                          const isValyu = result.source_origin === 'Valyu'
                          const isClickable = !isValyu && result.parent_id

                          // Parse type from parent_id (only for local results)
                          let modalType: 'source' | 'note' | 'insight' = 'source'
                          let recordId = ''
                          if (result.parent_id) {
                            const [type, id] = result.parent_id.split(':')
                            modalType = type === 'source_insight' ? 'insight' : type as 'source' | 'note' | 'insight'
                            recordId = id
                          }

                          return (
                          <Card key={index} className="card-hover">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Source Origin Badge */}
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px] py-0 px-1.5 shrink-0",
                                        isValyu
                                          ? "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5"
                                          : "border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/5"
                                      )}
                                    >
                                      {isValyu ? (
                                        <><Globe className="h-3 w-3 mr-0.5" />Valyu</>
                                      ) : (
                                        <><Database className="h-3 w-3 mr-0.5" />Local KB</>
                                      )}
                                    </Badge>

                                    {/* Title - clickable for local, link for Valyu */}
                                    {isClickable ? (
                                      <button
                                        onClick={() => openModal(modalType, recordId)}
                                        className="text-primary hover:underline font-medium text-sm"
                                      >
                                        {result.title}
                                      </button>
                                    ) : isValyu && result.url ? (
                                      <a
                                        href={result.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline font-medium text-sm flex items-center gap-1"
                                      >
                                        {result.title}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      <span className="font-medium text-sm text-foreground">{result.title}</span>
                                    )}

                                    {/* Score & Append button */}
                                    <div className="flex items-center gap-2 ml-auto shrink-0">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleAppendToNote(result.title, result.matches || [], isValyu ? 'Valyu' : 'Local KB')}
                                        className="h-7 px-2 text-[10px] font-mono border-white/10 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/20 text-muted-foreground animate-pulse"
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Append
                                      </Button>
                                      <Badge variant="secondary" className="tabular-nums font-mono text-xs">
                                        {result.final_score.toFixed(2)}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {result.matches && result.matches.length > 0 && (
                                <Collapsible className="mt-3">
                                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                                    <ChevronDown className="h-4 w-4" />
                                    {t('searchPage.matches').replace('{count}', result.matches.length.toString())}
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-2 space-y-1">
                                    {result.matches.map((match, i) => (
                                      <div key={i} className={cn(
                                        "text-sm pl-6 py-1 border-l-2",
                                        isValyu ? "border-blue-500/30" : "border-primary/30"
                                      )}>
                                        {match}
                                      </div>
                                    ))}
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </CardContent>
                          </Card>
                        )})}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2 h-full">
            {renderScratchpad()}
          </div>
        </div>
      </TabsContent>
      <TabsContent value="compliance" className={cn(embedded ? "mt-0" : "mt-6")}>
        <CompliancePage embedded={true} />
      </TabsContent>
    </Tabs>
  )

  if (embedded) {
    return content
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 pb-20">
          <h1 className="text-2xl font-semibold tracking-tight mb-4 md:mb-6">{t('searchPage.askAndSearch')}</h1>
          {content}
        </div>
      </div>
    </AppShell>
  )
}
