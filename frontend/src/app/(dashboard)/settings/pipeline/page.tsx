'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  usePipelineRules,
  useCreatePipelineRule,
  useUpdatePipelineRule,
  useDeletePipelineRule,
} from '@/lib/hooks/use-pipeline'
import { useModels } from '@/lib/hooks/use-models'
import { SearchableModelSelect, type ModelOption } from '@/components/common/SearchableModelSelect'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { DataPageSkeleton } from '@/components/common/DataPageSkeleton'
import { useTranslation } from '@/lib/hooks/use-translation'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Sparkles,
  TrendingUp,
  Search,
  Globe,
  Settings,
  Plus,
  Trash2,
  Edit,
  ArrowRight,
  Info,
} from 'lucide-react'

export default function PipelineSettingsPage() {
  const { t } = useTranslation()
  const pathname = usePathname()

  const tabs = [
    { name: t('settings.tabGeneral', 'General Configuration'), href: '/settings' },
    { name: t('settings.tabApiKeys', 'API Keys & Models'), href: '/settings/api-keys' },
    { name: t('settings.tabPipeline', 'Pipeline Automations'), href: '/settings/pipeline' },
  ]

  const { data: rules, isLoading: rulesLoading } = usePipelineRules()
  const { data: models } = useModels()

  // Map models to ModelOption for SearchableModelSelect
  const languageModelOptions: ModelOption[] = useMemo(() => {
    if (!models) return []
    return models
      .filter((m) => m.type === 'language')
      .map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        context_length: m.context_length,
        pricing_prompt: m.pricing_prompt,
        pricing_completion: m.pricing_completion,
        modality: m.modality,
        description: m.description,
      }))
  }, [models])

  const createRule = useCreatePipelineRule()
  const updateRule = useUpdatePipelineRule()
  const deleteRule = useDeletePipelineRule()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null)

  // Form State
  const [stage, setStage] = useState('technical_discovery')
  const [actionType, setActionType] = useState<'crawl' | 'search'>('crawl')
  const [prompt, setPrompt] = useState('')
  const [queryTemplate, setQueryTemplate] = useState('')
  const [modelOverride, setModelOverride] = useState<string>('default')
  const [searchEngine, setSearchEngine] = useState('default')
  const [isActive, setIsActive] = useState(true)

  const handleOpenNew = () => {
    setEditingRuleId(null)
    setStage('technical_discovery')
    setActionType('crawl')
    setPrompt(
      'Extract key technical specifications, libraries, framework dependencies, and infrastructure info from this scraped content. Present it as a structured markdown SPEC sheet.'
    )
    setQueryTemplate('{client_name} main competitors and latest security news')
    setModelOverride('default')
    setSearchEngine('default')
    setIsActive(true)
    setDialogOpen(true)
  }

  const handleOpenEdit = (rule: { id: string; stage: string; action_type: 'crawl' | 'search'; prompt: string; query_template?: string | null; model_override?: string | null; search_engine?: string | null; is_active: boolean }) => {
    setEditingRuleId(rule.id)
    setStage(rule.stage)
    setActionType(rule.action_type)
    setPrompt(rule.prompt)
    setQueryTemplate(rule.query_template || '')
    setModelOverride(rule.model_override || 'default')
    setSearchEngine(rule.search_engine || 'default')
    setIsActive(rule.is_active)
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      stage,
      action_type: actionType,
      prompt,
      query_template: actionType === 'search' ? queryTemplate : '',
      model_override: modelOverride === 'default' ? null : modelOverride,
      search_engine: actionType === 'search' ? searchEngine : 'default',
      is_active: isActive,
    }

    try {
      if (editingRuleId) {
        await updateRule.mutateAsync({ id: editingRuleId, data: payload })
        toast.success('Rule updated')
      } else {
        await createRule.mutateAsync(payload)
        toast.success('Rule created')
      }
      setDialogOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Failed to save rule')
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteRuleId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteRuleId) return
    try {
      await deleteRule.mutateAsync(deleteRuleId)
      toast.success('Rule deleted')
    } catch {
      toast.error('Failed to delete rule')
    } finally {
      setDeleteRuleId(null)
    }
  }

  const stageLabels: Record<string, string> = {
    lead: 'Leads Prospecting',
    research: 'Client Research',
    technical_discovery: 'Technical Discovery',
    proposal: 'Proposal Drafts',
    won: 'Contract Won',
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="max-w-5xl space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  Pipeline Automation Rules
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure asynchronous background intelligence scripts that trigger when deals change stages.
                </p>
              </div>

              <Button onClick={handleOpenNew} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Automation Rule
              </Button>
            </div>

            {/* Sub Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-sidebar-border/20">
              {tabs.map((tab) => {
                const active = pathname === tab.href
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 -mb-[2px]",
                      active
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.name}
                  </Link>
                )
              })}
            </div>

            {/* Explanation Banner */}
            <Card className="bg-primary/5 border-primary/20 backdrop-blur-md">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="rounded-lg p-2 bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">How Pipeline Automations Work</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Whenever you move a card on the <strong>Sales Pipeline</strong> board to an automated stage, Tetrel
                    instantly fires a background worker. For crawlers, it scrapes the target prospect's website.
                    For searchers, it runs a web search query. The scraped content is fed to your selected LLM which
                    automatically drafts and saves detailedSPEC sheets or research dossiers directly inside the deal's Notebook,
                    instantly indexing them into your RAG chat.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Rules List */}
            <Card className="border-sidebar-border/40 backdrop-blur-sm bg-card/60">
              <CardHeader className="pb-3 border-b border-sidebar-border/20">
                <CardTitle>Configured Automations</CardTitle>
                <CardDescription>
                  Active rules executing triggers for stage transitions.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {rulesLoading ? (
                  <DataPageSkeleton layout="table" count={4} />
                ) : !rules || rules.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground px-4 space-y-2">
                    <Info className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="font-medium text-foreground">No automation rules configured</p>
                    <p className="text-xs max-w-md mx-auto">
                      Click "Add Automation Rule" above to create your first background sales workflow trigger.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-sidebar-border/20">
                    {rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-sidebar-accent/5 transition-colors"
                      >
                        {/* Left: Info */}
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs font-semibold py-0.5 px-2">
                              {stageLabels[rule.stage] || rule.stage}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge
                              variant="secondary"
                              className="text-xs font-medium flex items-center gap-1 py-0.5 px-2"
                            >
                              {rule.action_type === 'crawl' ? (
                                <>
                                  <Globe className="h-3 w-3 text-cyan-400" /> Web Scraper
                                </>
                              ) : (
                                <>
                                  <Search className="h-3 w-3 text-amber-400" /> AI Web Searcher
                                </>
                              )}
                            </Badge>
                            {rule.action_type === 'search' && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-medium py-0.5 px-1.5 border/20",
                                  rule.search_engine === 'valyu' && "border-primary/30 bg-primary/5 text-primary",
                                  rule.search_engine === 'perplexity' && "border-purple-500/30 bg-purple-500/5 text-purple-400",
                                  rule.search_engine === 'brave' && "border-orange-500/30 bg-orange-500/5 text-orange-400",
                                  rule.search_engine === 'duckduckgo' && "border-green-500/30 bg-green-500/5 text-green-400",
                                  (!rule.search_engine || rule.search_engine === 'default') && "border-slate-500/30 bg-slate-500/5 text-slate-400"
                                )}
                              >
                                {rule.search_engine === 'valyu' ? 'Valyu Deep Research' :
                                 rule.search_engine === 'perplexity' ? 'Perplexity Online' :
                                 rule.search_engine === 'brave' ? 'Brave Search' :
                                 rule.search_engine === 'tavily' ? 'Tavily Search' :
                                 rule.search_engine === 'newsapi' ? 'NewsAPI' :
                                 rule.search_engine === 'google_scholar' ? 'Google Scholar' :
                                 rule.search_engine === 'duckduckgo' ? 'DuckDuckGo' :
                                 'Default Search'}
                              </Badge>
                            )}
                            {!rule.is_active && (
                              <Badge variant="destructive" className="text-[10px] uppercase font-bold py-0 px-1.5">
                                Inactive
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="text-sm font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                              <span className="text-muted-foreground text-xs font-normal">Model:</span>
                              <code className="text-xs bg-sidebar-accent/30 text-sidebar-foreground px-1.5 py-0.5 rounded border border-sidebar-border/10 font-mono">
                                {rule.model_override
                                  ? models?.find((m) => m.id === rule.model_override)?.name || rule.model_override
                                  : 'System Default Chat'}
                              </code>
                            </div>

                            {rule.action_type === 'search' && rule.query_template && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <span className="font-semibold text-foreground/75">Query Template:</span>
                                <span className="font-mono bg-sidebar-accent/25 px-1.5 py-0.5 rounded border border-sidebar-border/5">
                                  {rule.query_template}
                                </span>
                              </div>
                            )}

                            <div className="text-xs text-muted-foreground line-clamp-2 max-w-3xl leading-relaxed mt-1">
                              <span className="font-semibold text-foreground/75 block md:inline md:mr-1">LLM Prompt:</span>
                              "{rule.prompt}"
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 self-end md:self-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(rule)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            aria-label="Edit automation rule"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(rule.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Delete automation rule"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Model Setup Link Reminder */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-sidebar-accent/20 border border-sidebar-border/20 rounded-lg p-3">
              <Info className="h-4 w-4 text-primary flex-shrink-0" />
              <span>
                Want to configure and purchase additional private API credentials or local model providers? Setup your custom API keys in the{' '}
                <a href="/settings/api-keys" className="text-primary hover:underline font-semibold">
                  API Keys Dashboard
                </a>
                .
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-over Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg border-sidebar-border/40 bg-card/95 backdrop-blur-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingRuleId ? 'Edit Automation Rule' : 'New Automation Rule'}</DialogTitle>
            <DialogDescription>
              Configure the trigger event, pipeline worker actions, and intelligence parameters.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 flex-1 overflow-y-auto pr-1 py-2">
            {/* Stage Trigger */}
            <div className="space-y-1.5">
              <Label htmlFor="stage">Kanban Stage Trigger</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger id="stage" className="w-full bg-sidebar/50">
                  <SelectValue placeholder="Select Trigger Stage" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(stageLabels).map(([id, label]) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Worker Type */}
            <div className="space-y-1.5">
              <Label>Automation Action Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={actionType === 'crawl' ? 'default' : 'outline'}
                  onClick={() => setActionType('crawl')}
                  className="flex items-center gap-2 h-11 justify-center"
                >
                  <Globe className="h-4 w-4" />
                  Website Crawler
                </Button>
                <Button
                  type="button"
                  variant={actionType === 'search' ? 'default' : 'outline'}
                  onClick={() => setActionType('search')}
                  className="flex items-center gap-2 h-11 justify-center"
                >
                  <Search className="h-4 w-4" />
                  AI Web Searcher
                </Button>
              </div>
            </div>

            {/* Dynamic parameters for Search */}
            {actionType === 'search' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="query_template">Search Query Template</Label>
                  <Input
                    id="query_template"
                    value={queryTemplate}
                    onChange={(e) => setQueryTemplate(e.target.value)}
                    placeholder="e.g. {client_name} tech stack products"
                    className="bg-sidebar/50"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    Use <code>{'{client_name}'}</code> as a dynamic placeholder. It will automatically populate the target deal/notebook title (e.g. "Acme Corp").
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="search_engine">Search Engine Provider</Label>
                  <Select value={searchEngine} onValueChange={setSearchEngine}>
                    <SelectTrigger id="search_engine" className="w-full bg-sidebar/50">
                      <SelectValue placeholder="Select Search Engine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Sequential Fallback</SelectItem>
                      <SelectItem value="valyu">Valyu Deep Research</SelectItem>
                      <SelectItem value="tavily">Tavily Search</SelectItem>
                      <SelectItem value="perplexity">Perplexity Online Search</SelectItem>
                      <SelectItem value="newsapi">NewsAPI (News Articles)</SelectItem>
                      <SelectItem value="google_scholar">Google Scholar (Academic)</SelectItem>
                      <SelectItem value="brave">Brave Web Search</SelectItem>
                      <SelectItem value="duckduckgo">DuckDuckGo Search (Keyless)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                    Select which primary search API provider is queried to run this agent intelligence task.
                  </p>
                </div>
              </>
            )}

            {/* Prompt Instructions */}
            <div className="space-y-1.5">
              <Label htmlFor="prompt">AI Analysis & Extraction Prompt</Label>
              <Textarea
                id="prompt"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Instruct the model how to digest the fetched content..."
                className="bg-sidebar/50 text-sm leading-relaxed"
                required
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Instruct the AI on how to summarize or synthesize technical data. This output will be automatically appended to the deal's Notebook notes.
              </p>
            </div>

            {/* Model Override */}
            <div className="space-y-1.5">
              <Label htmlFor="model_override">Intelligence Model Override</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SearchableModelSelect
                    models={languageModelOptions}
                    value={modelOverride === 'default' ? '' : modelOverride}
                    onValueChange={(val) => setModelOverride(val || 'default')}
                    placeholder="System Default Chat Model"
                    clearable={modelOverride !== 'default'}
                    groupByProvider
                    sortBy="name"
                  />
                </div>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-sidebar-border bg-sidebar/50 accent-primary text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
              />
              <Label htmlFor="is_active" className="cursor-pointer text-sm font-medium text-foreground select-none">
                Enable this automation rule (Active)
              </Label>
            </div>

            <DialogFooter className="pt-4 border-t border-sidebar-border/20 mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRule.isPending || updateRule.isPending}>
                {createRule.isPending || updateRule.isPending ? 'Saving...' : 'Save Automation Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteRuleId}
        onOpenChange={(open) => !open && setDeleteRuleId(null)}
        title="Delete Automation Rule"
        description="Are you sure you want to delete this automation rule? This cannot be undone."
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteRule.isPending}
        confirmVariant="destructive"
      />
    </AppShell>
  )
}
