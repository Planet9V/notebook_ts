'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Transformation } from '@/lib/types/transformations'
import { useCreateTransformation, useUpdateTransformation, useDeleteTransformation } from '@/lib/hooks/use-transformations'
import {
  Plus,
  Pencil,
  Trash2,
  Play,
  Telescope,
  Globe,
  Users,
  Building2,
  Wrench,
  Loader2,
} from 'lucide-react'
import {
  SEARCH_ENGINES,
  ENGINE_LABELS,
} from '@/lib/constants/research-stages'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

const TARGET_CONTEXT_META: Record<string, { label: string; icon: typeof Globe; description: string; color: string }> = {
  market: {
    label: 'Market Research',
    icon: Globe,
    description: 'Industry trends, market sizing, competitor landscape',
    color: 'sky',
  },
  presales: {
    label: 'Pre-Sales Briefing',
    icon: Users,
    description: 'Meeting prep, contact backgrounds, stakeholder mapping',
    color: 'amber',
  },
  org_gtm: {
    label: 'Organization GTM',
    icon: Building2,
    description: 'Org structure, physical locations, industry context',
    color: 'violet',
  },
  tech_gtm: {
    label: 'Tech GTM',
    icon: Wrench,
    description: 'Facilities, technologies, suppliers, tech stack',
    color: 'emerald',
  },
}

interface GtmResearchTemplatesProps {
  templates?: Transformation[]
  isLoading: boolean
  onPlayground: (t: Transformation) => void
}

export function GtmResearchTemplates({ templates, isLoading, onPlayground }: GtmResearchTemplatesProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<Partial<Transformation> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const createMutation = useCreateTransformation()
  const updateMutation = useUpdateTransformation()
  const deleteMutation = useDeleteTransformation()

  const handleCreate = () => {
    setIsNew(true)
    setEditTemplate({
      name: '',
      title: '',
      description: '',
      prompt: '',
      apply_default: false,
      category: 'gtm_research',
      search_engine: 'perplexity',
      color_tag: 'sky',
      target_context: 'market',
    })
    setEditOpen(true)
  }

  const handleEdit = (t: Transformation) => {
    setIsNew(false)
    setEditTemplate({ ...t })
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!editTemplate) return
    try {
      if (isNew) {
        await createMutation.mutateAsync({
          name: editTemplate.name || '',
          title: editTemplate.title || '',
          description: editTemplate.description || '',
          prompt: editTemplate.prompt || '',
          apply_default: editTemplate.apply_default || false,
          category: 'gtm_research',
          search_engine: editTemplate.search_engine,
          search_model_id: editTemplate.search_model_id,
          color_tag: editTemplate.color_tag,
          target_context: editTemplate.target_context,
        })
        toast.success('Template created')
      } else if (editTemplate.id) {
        await updateMutation.mutateAsync({
          id: editTemplate.id,
          data: {
            name: editTemplate.name,
            title: editTemplate.title,
            description: editTemplate.description,
            prompt: editTemplate.prompt,
            apply_default: editTemplate.apply_default,
            category: 'gtm_research',
            search_engine: editTemplate.search_engine,
            search_model_id: editTemplate.search_model_id,
            color_tag: editTemplate.color_tag,
            target_context: editTemplate.target_context,
          },
        })
        toast.success('Template updated')
      }
      setEditOpen(false)
      setEditTemplate(null)
    } catch {
      toast.error('Failed to save template')
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      await deleteMutation.mutateAsync(deleteId)
      toast.success('Template deleted')
    } catch {
      toast.error('Failed to delete template')
    } finally {
      setDeleteId(null)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  // Group templates by target_context
  const grouped = Object.entries(TARGET_CONTEXT_META).map(([key, meta]) => ({
    key,
    meta,
    items: templates?.filter((t) => t.target_context === key) || [],
  }))
  const uncategorized = templates?.filter(
    (t) => !t.target_context || !TARGET_CONTEXT_META[t.target_context]
  ) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Telescope className="h-5 w-5 text-sky-500" />
            GTM Research Templates
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Editable prompt templates for Go-to-Market research, assignable to deal drawer workflows
          </p>
        </div>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      </div>

      {/* Templates by context */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-background/40 border border-sidebar-border rounded-lg p-4 h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ key, meta, items }) => {
            const Icon = meta.icon
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`h-4 w-4 text-${meta.color}-500`} />
                  <h3 className="text-sm font-medium text-foreground">{meta.label}</h3>
                  <span className="text-xs text-muted-foreground">— {meta.description}</span>
                  <Badge variant="outline" className="text-xs ml-auto">{items.length}</Badge>
                </div>
                {items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        meta={meta}
                        onEdit={() => handleEdit(template)}
                        onDelete={() => handleDelete(template.id)}
                        onPlayground={() => onPlayground(template)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-4 border border-dashed border-sidebar-border rounded-lg">
                    No templates yet.{' '}
                    <button
                      className="text-sky-500 hover:underline"
                      onClick={() => {
                        setIsNew(true)
                        setEditTemplate({
                          name: '',
                          title: '',
                          description: '',
                          prompt: '',
                          apply_default: false,
                          category: 'gtm_research',
                          search_engine: 'perplexity',
                          color_tag: meta.color,
                          target_context: key,
                        })
                        setEditOpen(true)
                      }}
                    >
                      Create one
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {uncategorized.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Uncategorized</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {uncategorized.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    meta={{ label: '', icon: Telescope, description: '', color: 'slate' }}
                    onEdit={() => handleEdit(template)}
                    onDelete={() => handleDelete(template.id)}
                    onPlayground={() => onPlayground(template)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit/Create dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isNew ? 'Create GTM Research Template' : 'Edit GTM Research Template'}
            </DialogTitle>
          </DialogHeader>
          {editTemplate && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name (internal key)</Label>
                  <Input
                    value={editTemplate.name || ''}
                    onChange={(e) => setEditTemplate({ ...editTemplate, name: e.target.value })}
                    placeholder="e.g., market_research_deep"
                  />
                </div>
                <div>
                  <Label>Title (display)</Label>
                  <Input
                    value={editTemplate.title || ''}
                    onChange={(e) => setEditTemplate({ ...editTemplate, title: e.target.value })}
                    placeholder="e.g., Deep Market Research"
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={editTemplate.description || ''}
                  onChange={(e) => setEditTemplate({ ...editTemplate, description: e.target.value })}
                  placeholder="What this template does..."
                />
              </div>
              <div>
                <Label>Prompt</Label>
                <Textarea
                  value={editTemplate.prompt || ''}
                  onChange={(e) => setEditTemplate({ ...editTemplate, prompt: e.target.value })}
                  rows={8}
                  placeholder="Research prompt template. Use {company}, {industry}, {contacts} as variables..."
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Context Type</Label>
                  <Select
                    value={editTemplate.target_context || 'market'}
                    onValueChange={(v) => setEditTemplate({ ...editTemplate, target_context: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TARGET_CONTEXT_META).map(([k, m]) => (
                        <SelectItem key={k} value={k}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Default Engine</Label>
                  <Select
                    value={editTemplate.search_engine || 'perplexity'}
                    onValueChange={(v) => setEditTemplate({ ...editTemplate, search_engine: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEARCH_ENGINES.map((e) => (
                        <SelectItem key={e} value={e}>{ENGINE_LABELS[e]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Color Tag</Label>
                  <Select
                    value={editTemplate.color_tag || 'sky'}
                    onValueChange={(v) => setEditTemplate({ ...editTemplate, color_tag: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sky">Sky Blue</SelectItem>
                      <SelectItem value="amber">Amber</SelectItem>
                      <SelectItem value="violet">Violet</SelectItem>
                      <SelectItem value="emerald">Emerald</SelectItem>
                      <SelectItem value="rose">Rose</SelectItem>
                      <SelectItem value="cyan">Cyan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {isNew ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Template"
        description="Are you sure you want to delete this GTM Research template? This cannot be undone."
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
        confirmVariant="destructive"
      />
    </div>
  )
}

function TemplateCard({
  template,
  meta,
  onEdit,
  onDelete,
  onPlayground,
}: {
  template: Transformation
  meta: { label: string; icon: typeof Globe; description: string; color: string }
  onEdit: () => void
  onDelete: () => void
  onPlayground: () => void
}) {
  const engineLabel = ENGINE_LABELS[template.search_engine as keyof typeof ENGINE_LABELS] || template.search_engine || 'Any'

  return (
    <div className={`bg-background/40 backdrop-blur-md border rounded-lg p-4 hover:shadow-md transition-all group border-${template.color_tag || meta.color}-500/30 hover:border-${template.color_tag || meta.color}-500/60`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground text-sm truncate" title={template.title || template.name}>{template.title || template.name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{template.description}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onPlayground}>
            <Play className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-500" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-3 mb-3 font-mono">{template.prompt}</p>

      <div className="flex items-center gap-2 pt-2 border-t border-sidebar-border/50">
        <Badge variant="outline" className={`text-xs border-${template.color_tag || meta.color}-500/50 text-${template.color_tag || meta.color}-500`}>
          {template.color_tag || meta.color}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {engineLabel}
        </Badge>
      </div>
    </div>
  )
}
