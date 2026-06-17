'use client'

import { Controller, useForm, useWatch } from 'react-hook-form'
import { useEffect, useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCreateNote, useUpdateNote, useNote, useTags, useCreateTag, useLinkTag, useUnlinkTag, useNoteTags, useNotes } from '@/lib/hooks/use-notes'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useLocations } from '@/lib/hooks/use-locations'
import { useEntityLinks, useDeleteEntityLink } from '@/lib/hooks/use-entity-links'
import { useSources } from '@/lib/hooks/use-sources'
import { useAsk } from '@/lib/hooks/use-ask'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { QUERY_KEYS } from '@/lib/api/query-client'
import { BlockEditor } from '@/components/ui/block-editor'
import { SplitEditor } from '@/components/ui/split-editor'
import { InlineEdit } from '@/components/common/InlineEdit'
import { cn } from "@/lib/utils"
import { useTranslation } from '@/lib/hooks/use-translation'
import { toast } from 'sonner'
import { Building, MapPin, Sparkles, Plus, X, Link2, Search, Edit2, Trash2, Tag as TagIcon } from 'lucide-react'

const createNoteSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
})

type CreateNoteFormData = z.infer<typeof createNoteSchema>

interface NoteEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notebookId: string
  note?: {
    id: string
    title: string | null
    content: string | null
    content_format?: 'markdown' | 'block'
    content_markdown_backup?: string | null
    note_type?: string | null
    customer_id?: string | null
    location_id?: string | null
  }
}

export function NoteEditorDialog({ open, onOpenChange, notebookId, note }: NoteEditorDialogProps) {
  const { t } = useTranslation()
  const createNote = useCreateNote()
  const updateNote = useUpdateNote()
  const queryClient = useQueryClient()
  const isEditing = Boolean(note)

  // Ensure note ID has 'note:' prefix for API calls
  const noteIdWithPrefix = note?.id
    ? (note.id.includes(':') ? note.id : `note:${note.id}`)
    : ''

  const { data: fetchedNote, isLoading: noteLoading } = useNote(noteIdWithPrefix, { enabled: open && !!note?.id })
  const isSaving = isEditing ? updateNote.isPending : createNote.isPending

  const [contentFormat, setContentFormat] = useState<'markdown' | 'block'>('block')
  const [pendingTags, setPendingTags] = useState<string[]>([])
  const { data: allTags } = useTags()
  const createTag = useCreateTag()
  const linkTag = useLinkTag()
  const unlinkTag = useUnlinkTag()
  const { data: fetchedNoteTags } = useNoteTags(noteIdWithPrefix)

  const { data: customers } = useCustomers()
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const { data: locations } = useLocations(selectedCustomerId || undefined)
  const [selectedLocationId, setSelectedLocationId] = useState('')

  const [selectedTagIdToLink, setSelectedTagIdToLink] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [newTagCategory, setNewTagCategory] = useState('sales')

  const { data: allLinks } = useEntityLinks(notebookId)
  const deleteLink = useDeleteEntityLink(notebookId)
  const { data: allNotes } = useNotes(notebookId)
  const { data: allSources } = useSources(notebookId)

  const [researchQuery, setResearchQuery] = useState('')
  const [activeResearchEngine, setActiveResearchEngine] = useState<'local' | 'perplexity' | 'hybrid'>('local')
  const { isStreaming, status, answers, finalAnswer, sendResearch, reset: resetResearch } = useAsk()

  const handleLinkExistingTag = async () => {
    if (!selectedTagIdToLink) return
    try {
      if (isEditing && noteIdWithPrefix) {
        await linkTag.mutateAsync({ noteId: noteIdWithPrefix, tagId: selectedTagIdToLink })
      } else {
        setPendingTags(prev => [...new Set([...prev, selectedTagIdToLink])])
      }
      setSelectedTagIdToLink('')
      toast.success('Tag linked')
    } catch {
      toast.error('Failed to link tag')
    }
  }

  const handleCreateAndLinkTag = async () => {
    if (!newTagName.trim()) return
    try {
      const created = await createTag.mutateAsync({ name: newTagName, category_type: newTagCategory })
      if (created && created.id) {
        if (isEditing && noteIdWithPrefix) {
          await linkTag.mutateAsync({ noteId: noteIdWithPrefix, tagId: created.id })
        } else {
          setPendingTags(prev => [...new Set([...prev, created.id])])
        }
        setNewTagName('')
        toast.success('Tag created and linked')
      }
    } catch {
      toast.error('Failed to create tag')
    }
  }

  const handleRunResearch = async (engine: 'local' | 'perplexity' | 'hybrid') => {
    if (!researchQuery.trim()) {
      toast.error('Please enter a query')
      return
    }
    await sendResearch(researchQuery, engine)
  }

  const connectedLinks = useMemo(() => {
    if (!allLinks || !noteIdWithPrefix) return []
    return allLinks.filter(link => link.in === noteIdWithPrefix || link.out === noteIdWithPrefix)
  }, [allLinks, noteIdWithPrefix])

  const relatedEntities = useMemo(() => {
    return connectedLinks.map(link => {
      const targetId = link.in === noteIdWithPrefix ? link.out : link.in
      
      const matchedNote = allNotes?.find(n => n.id === targetId)
      const matchedSource = allSources?.find(s => s.id === targetId)
      
      let label = targetId
      let type = 'unknown'
      
      if (matchedNote) {
        label = matchedNote.title || 'Untitled Note'
        type = 'Note'
      } else if (matchedSource) {
        label = matchedSource.title || 'Untitled Source'
        type = 'Source'
      } else if (targetId.startsWith('customer:')) {
        label = 'Parent Customer'
        type = 'Customer'
      } else if (targetId.startsWith('location:')) {
        label = 'Facility Location'
        type = 'Location'
      }
      
      return {
        linkId: link.id,
        targetId,
        label,
        type
      }
    })
  }, [connectedLinks, allNotes, allSources, noteIdWithPrefix])

  const handleTemplateSelect = async (category: string) => {
    const categoryMap: Record<string, { name: string; type: string }> = {
      sales: { name: 'Sales Service', type: 'sales' },
      marketing: { name: 'Marketing Campaign', type: 'marketing' },
      delivery: { name: 'Project Delivery', type: 'delivery' },
      research: { name: 'Research Finding', type: 'research' },
    }
    const mapping = categoryMap[category]
    if (!mapping) return

    try {
      let tag = allTags?.find(t => t.name === mapping.name)
      if (!tag) {
        tag = await createTag.mutateAsync({ name: mapping.name, category_type: mapping.type })
      }

      if (tag && tag.id) {
        if (isEditing && noteIdWithPrefix) {
          await linkTag.mutateAsync({ noteId: noteIdWithPrefix, tagId: tag.id })
        } else {
          setPendingTags(prev => [...new Set([...prev, tag!.id])])
        }
      }
    } catch (err) {
      console.error('Failed to link template tag:', err)
    }
  }

  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
    getValues,
  } = useForm<CreateNoteFormData>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  })
  const watchTitle = useWatch({ control, name: 'title' })
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false)

  useEffect(() => {
    if (!open) {
      reset({ title: '', content: '' })
      setContentFormat('block')
      setPendingTags([])
      setSelectedCustomerId('')
      setSelectedLocationId('')
      setResearchQuery('')
      resetResearch()
      return
    }

    const source = fetchedNote ?? note
    const title = source?.title ?? ''
    const content = source?.content ?? ''
    const format = source?.content_format ?? 'block'

    reset({ title, content })
    setContentFormat(format)
    setSelectedCustomerId(source?.customer_id ?? '')
    setSelectedLocationId(source?.location_id ?? '')
    setResearchQuery(title)
  }, [open, note, fetchedNote, reset, resetResearch])

  useEffect(() => {
    if (!isStreaming && finalAnswer) {
      const currentContent = getValues('content') || ''
      const engineLabel = activeResearchEngine === 'local' ? 'Local KB' : activeResearchEngine === 'perplexity' ? 'Web Search' : 'Hybrid RAG'
      const markdownHeader = `\n\n### AI Research: ${researchQuery} (${engineLabel})\n`
      setValue('content', currentContent + markdownHeader + finalAnswer)
      toast.success('Research findings appended to note')
      resetResearch()
    }
  }, [isStreaming, finalAnswer, activeResearchEngine, researchQuery, setValue, getValues, resetResearch])

  useEffect(() => {
    if (!open) return

    const observer = new MutationObserver(() => {
      setIsEditorFullscreen(!!document.querySelector('.w-md-editor-fullscreen'))
    })
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [open])

  const onSubmit = async (data: CreateNoteFormData) => {
    try {
      if (note) {
        await updateNote.mutateAsync({
          id: noteIdWithPrefix,
          data: {
            title: data.title || undefined,
            content: data.content,
            content_format: contentFormat,
            customer_id: selectedCustomerId || "",
            location_id: selectedLocationId || "",
          },
        })
        if (notebookId) {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notes(notebookId) })
        }
        toast.success('Note saved')
      } else {
        if (!notebookId) {
          console.error('Cannot create note without notebook_id')
          return
        }
        const newNote = await createNote.mutateAsync({
          title: data.title || undefined,
          content: data.content,
          note_type: 'human',
          notebook_id: notebookId,
          content_format: contentFormat,
          customer_id: selectedCustomerId || undefined,
          location_id: selectedLocationId || undefined,
        })
        if (newNote && newNote.id && pendingTags.length > 0) {
          const newNoteId = newNote.id.includes(':') ? newNote.id : `note:${newNote.id}`
          for (const tagId of pendingTags) {
            await linkTag.mutateAsync({ noteId: newNoteId, tagId })
          }
        }
        toast.success('Note created')
      }
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to save note')
    }
  }

  const handleClose = () => {
    reset()
    setIsEditorFullscreen(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
          "sm:max-w-4xl w-full max-h-[90vh] overflow-hidden p-0 bg-background/95 backdrop-blur-xl border border-border/40 shadow-2xl transition-all duration-300 flex flex-col",
          isEditorFullscreen && "!max-w-screen !max-h-screen border-none w-screen h-screen"
      )}>
        <DialogTitle className="sr-only">
          {isEditing ? t('sources.editNote') : t('sources.createNote')}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col min-w-0">
          {isEditing && noteLoading ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <span className="text-sm text-muted-foreground">{t('common.loading')}</span>
            </div>
          ) : (
            <>
              {/* Note Header Info */}
              <div className="border-b px-6 py-4 flex items-center justify-between gap-4 bg-muted/10 shrink-0">
                <div className="flex-1 min-w-0">
                  <InlineEdit
                    id="note-title"
                    name="title"
                    value={watchTitle ?? ''}
                    onSave={(value) => setValue('title', value || '')}
                    placeholder={t('sources.addTitle')}
                    emptyText={t('sources.untitledNote')}
                    className="text-xl font-semibold bg-transparent border-0 focus-visible:ring-0 p-0"
                    inputClassName="text-xl font-semibold"
                  />
                </div>
              </div>

              {/* Redesigned Tabbed Area */}
              <Tabs defaultValue="edit" className="flex-1 flex flex-col min-h-0 min-w-0">
                <div className="border-b px-6 py-2 flex items-center justify-between gap-4 bg-muted/5 shrink-0">
                  <TabsList className="bg-muted/40 p-0.5 rounded-lg border border-border/40">
                    <TabsTrigger value="edit" className="px-3.5 py-1 text-xs cursor-pointer flex items-center gap-1.5 data-[state=active]:bg-background">
                      <Edit2 className="w-3.5 h-3.5" />
                      Content Editor
                    </TabsTrigger>
                    <TabsTrigger value="attributes" className="px-3.5 py-1 text-xs cursor-pointer flex items-center gap-1.5 data-[state=active]:bg-background">
                      <TagIcon className="w-3.5 h-3.5" />
                      Attributes
                    </TabsTrigger>
                    <TabsTrigger value="research" className="px-3.5 py-1 text-xs cursor-pointer flex items-center gap-1.5 data-[state=active]:bg-background">
                      <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                      AI Research
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="edit" className="m-0 p-0 border-0 outline-none shadow-none">
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <span className="text-muted-foreground font-medium">Format:</span>
                      <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/40">
                        <button
                          type="button"
                          onClick={() => setContentFormat('block')}
                          className={cn(
                            'px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors cursor-pointer text-muted-foreground',
                            contentFormat === 'block' && 'bg-background text-foreground shadow-xs'
                          )}
                        >
                          Block Editor
                        </button>
                        <button
                          type="button"
                          onClick={() => setContentFormat('markdown')}
                          className={cn(
                            'px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors cursor-pointer text-muted-foreground',
                            contentFormat === 'markdown' && 'bg-background text-foreground shadow-xs'
                          )}
                        >
                          Markdown
                        </button>
                      </div>
                    </div>
                  </TabsContent>
                </div>

                {/* Tab content 1: Editor workspace */}
                <TabsContent value="edit" className="flex-1 overflow-y-auto min-h-0 focus-visible:outline-none m-0 p-0">
                  <div className={cn(
                      "flex-1 overflow-y-auto min-h-0",
                      !isEditorFullscreen && "px-6 py-4")
                  }>
                    <Controller
                      control={control}
                      name="content"
                      render={({ field }) => (
                        contentFormat === 'block' ? (
                          <BlockEditor
                            key={`${note?.id ?? 'new'}-block`}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t('sources.writeNotePlaceholder')}
                            height={400}
                            onTemplateSelect={handleTemplateSelect}
                          />
                        ) : (
                          <SplitEditor
                            key={`${note?.id ?? 'new'}-md`}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t('sources.writeNotePlaceholder')}
                            height={400}
                          />
                        )
                      )}
                    />
                    {errors.content && (
                      <p className="text-sm text-red-600 mt-1 px-1">{errors.content.message}</p>
                    )}
                  </div>
                </TabsContent>

                {/* Tab content 2: Attributes workspace */}
                <TabsContent value="attributes" className="flex-1 overflow-y-auto min-h-0 p-6 focus-visible:outline-none m-0 flex flex-col gap-6">
                  {/* Customer and Location Selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 select-none">
                        <Building className="w-3.5 h-3.5 text-amber-500" /> Associated Customer
                      </label>
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => {
                          setSelectedCustomerId(e.target.value)
                          setSelectedLocationId('') // Clear location when customer changes
                        }}
                        className="w-full h-10 px-3 rounded-lg border border-border/60 bg-background/50 hover:bg-background transition-colors focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                      >
                        <option value="">No Customer Associated</option>
                        {customers?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 select-none">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" /> Associated Facility / Location
                      </label>
                      <select
                        value={selectedLocationId}
                        onChange={(e) => setSelectedLocationId(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-border/60 bg-background/50 hover:bg-background transition-colors focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                      >
                        <option value="">No Facility Associated</option>
                        {locations?.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.facility_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tags Section */}
                  <div className="space-y-3 border-t pt-5 shrink-0">
                    <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 select-none">
                      <TagIcon className="w-3.5 h-3.5 text-violet-500" /> Note Tags & Categories
                    </h3>
                    
                    {/* Current Tags list */}
                    <div className="flex flex-wrap gap-1.5 min-h-6">
                      {((isEditing ? fetchedNoteTags : pendingTags) ?? []).length === 0 ? (
                        <span className="text-xs text-muted-foreground italic select-none">No tags associated with this note.</span>
                      ) : (
                        ((isEditing ? fetchedNoteTags : pendingTags) ?? []).map((tagIdOrObj) => {
                          const tagObj = typeof tagIdOrObj === 'string' 
                            ? allTags?.find(t => t.id === tagIdOrObj)
                            : tagIdOrObj;
                          
                          if (!tagObj) return null;
                          
                          return (
                            <span
                              key={tagObj.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 border border-primary/20 text-primary transition-all duration-200"
                            >
                              {tagObj.name}
                              <button
                                type="button"
                                onClick={async () => {
                                  if (isEditing && noteIdWithPrefix) {
                                    await unlinkTag.mutateAsync({ noteId: noteIdWithPrefix, tagId: tagObj.id })
                                  } else {
                                    setPendingTags(prev => prev.filter(id => id !== tagObj.id))
                                  }
                                  toast.success('Tag unlinked')
                                }}
                                className="hover:text-red-500 transition-colors focus:outline-none shrink-0 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )
                        })
                      )}
                    </div>

                    {/* Manage tags controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <span className="text-[10px] text-muted-foreground font-semibold select-none">Link Existing Tag</span>
                          <select
                            value={selectedTagIdToLink}
                            onChange={(e) => setSelectedTagIdToLink(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-border/60 bg-background/50 hover:bg-background transition-colors text-xs"
                          >
                            <option value="">Select a tag...</option>
                            {allTags?.filter(t => {
                              const currentIds = (isEditing ? fetchedNoteTags : pendingTags)?.map(x => typeof x === 'string' ? x : x.id) || [];
                              return !currentIds.includes(t.id);
                            }).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        <Button type="button" variant="secondary" onClick={handleLinkExistingTag} className="h-9 px-3 cursor-pointer shrink-0">
                          Link
                        </Button>
                      </div>

                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <span className="text-[10px] text-muted-foreground font-semibold select-none">Create & Link New Tag</span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newTagName}
                              onChange={(e) => setNewTagName(e.target.value)}
                              placeholder="Tag name..."
                              className="flex-1 h-9 px-3 rounded-lg border border-border/60 bg-background/50 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                            <select
                              value={newTagCategory}
                              onChange={(e) => setNewTagCategory(e.target.value)}
                              className="h-9 px-2 rounded-lg border border-border/60 bg-background/50 text-[10px]"
                            >
                              <option value="sales">Sales</option>
                              <option value="marketing">Marketing</option>
                              <option value="delivery">Delivery</option>
                              <option value="research">Research</option>
                            </select>
                          </div>
                        </div>
                        <Button type="button" variant="secondary" onClick={handleCreateAndLinkTag} className="h-9 px-3 cursor-pointer shrink-0">
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Related Canvas Connections list */}
                  {isEditing && (
                    <div className="space-y-3 border-t pt-5 flex-1 flex flex-col min-h-[150px]">
                      <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 select-none shrink-0">
                        <Link2 className="w-3.5 h-3.5 text-cyan-500" /> Related Canvas Connections
                      </h3>
                      
                      <div className="flex-1 overflow-y-auto border border-border/40 rounded-lg bg-muted/5 min-h-[100px]">
                        {relatedEntities.length === 0 ? (
                          <div className="px-4 py-3 text-xs text-muted-foreground italic select-none">
                            No canvas connections established. Drag connections in the canvas view to link other items.
                          </div>
                        ) : (
                          <div className="divide-y divide-border/20">
                            {relatedEntities.map((entity) => (
                              <div key={entity.linkId} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/10 transition-colors">
                                <div className="min-w-0 flex-1 pr-4">
                                  <p className="text-xs font-semibold text-foreground truncate">{entity.label}</p>
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5 select-none">{entity.type}</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer shrink-0"
                                  onClick={() => {
                                    deleteLink.mutate(entity.linkId)
                                    toast.success('Connection deleted')
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Tab content 3: AI Research workspace */}
                <TabsContent value="research" className="flex-1 overflow-y-auto min-h-0 p-6 focus-visible:outline-none m-0 flex flex-col gap-4">
                  {/* Console prompt query input */}
                  <div className="space-y-2 shrink-0">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 select-none">
                      <Search className="w-3.5 h-3.5 text-primary" /> Research Question or Topic
                    </label>
                    <input
                      type="text"
                      value={researchQuery}
                      onChange={(e) => setResearchQuery(e.target.value)}
                      placeholder="Type a research question..."
                      className="w-full h-10 px-3 rounded-lg border border-border/60 bg-background/50 focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                    />
                  </div>

                  {/* Engine sub-tabs */}
                  <div className="flex flex-col flex-1 min-h-[220px] border border-border/40 rounded-xl overflow-hidden bg-muted/10 shadow-inner">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/40 shrink-0">
                      <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/30">
                        {(['local', 'perplexity', 'hybrid'] as const).map((eng) => (
                          <button
                            key={eng}
                            type="button"
                            onClick={() => setActiveResearchEngine(eng)}
                            className={cn(
                              'px-3 py-1 text-[10px] font-semibold rounded-md transition-all duration-150 cursor-pointer text-muted-foreground',
                              activeResearchEngine === eng && 'bg-background text-foreground shadow-xs border border-border/10'
                            )}
                          >
                            {eng === 'local' ? 'Local KB' : eng === 'perplexity' ? 'Web Search' : 'Hybrid RAG'}
                          </button>
                        ))}
                      </div>
                      
                      <Button
                        type="button"
                        disabled={isStreaming}
                        onClick={() => handleRunResearch(activeResearchEngine)}
                        className="h-7 px-3 text-[10px] cursor-pointer bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-700 hover:to-indigo-600 text-white font-semibold border-0 flex items-center gap-1"
                      >
                        {isStreaming ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-violet-200 animate-pulse" />
                            Run Research & Append
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Console/terminal streaming view */}
                    <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed bg-black/40 text-muted-foreground select-text min-h-[150px]">
                      {isStreaming ? (
                        <div className="space-y-3">
                          {status && (
                            <div className="text-cyan-400 flex items-center gap-1.5 animate-pulse">
                              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                              <span>{status}</span>
                            </div>
                          )}
                          {answers.length > 0 && (
                            <div className="text-foreground whitespace-pre-wrap leading-relaxed">
                              {answers.join('')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-center text-muted-foreground/60 italic p-6 select-none">
                          Select a research engine above and click "Run Research & Append". Query results will automatically append as markdown headers to the end of the note content.
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}

          {/* Footer Controls */}
          <div className="border-t px-6 py-4 flex justify-end gap-2 bg-muted/10 shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSaving || (isEditing && noteLoading)}
            >
              {isSaving
                ? isEditing ? `${t('common.saving')}...` : `${t('common.creating')}...`
                : isEditing
                  ? t('sources.saveNote')
                  : t('sources.createNoteBtn')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
