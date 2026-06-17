'use client'

import { Controller, useForm, useWatch } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCreateNote, useUpdateNote, useNote } from '@/lib/hooks/use-notes'
import { QUERY_KEYS } from '@/lib/api/query-client'
import { BlockEditor } from '@/components/ui/block-editor'
import { SplitEditor } from '@/components/ui/split-editor'
import { InlineEdit } from '@/components/common/InlineEdit'
import { cn } from "@/lib/utils"
import { useTranslation } from '@/lib/hooks/use-translation'
import { toast } from 'sonner'

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

  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
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
      return
    }

    const source = fetchedNote ?? note
    const title = source?.title ?? ''
    const content = source?.content ?? ''
    const format = source?.content_format ?? 'block'

    reset({ title, content })
    setContentFormat(format)
  }, [open, note, fetchedNote, reset])

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
        await createNote.mutateAsync({
          title: data.title || undefined,
          content: data.content,
          note_type: 'human',
          notebook_id: notebookId,
          content_format: contentFormat,
        })
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
          "sm:max-w-4xl w-full max-h-[90vh] overflow-hidden p-0 bg-background/95 backdrop-blur-xl border border-border/40 shadow-2xl transition-all duration-300",
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
              {/* Note Header Info and Format Selector */}
              <div className="border-b px-6 py-4 flex items-center justify-between gap-4 bg-muted/10">
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

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">Format:</span>
                  <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/40">
                    <button
                      type="button"
                      onClick={() => setContentFormat('block')}
                      className={cn(
                        'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer text-muted-foreground',
                        contentFormat === 'block' && 'bg-background text-foreground shadow-xs'
                      )}
                    >
                      Block Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentFormat('markdown')}
                      className={cn(
                        'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer text-muted-foreground',
                        contentFormat === 'markdown' && 'bg-background text-foreground shadow-xs'
                      )}
                    >
                      Markdown Split
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor Workspace */}
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
            </>
          )}

          {/* Footer Controls */}
          <div className="border-t px-6 py-4 flex justify-end gap-2 bg-muted/10">
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
