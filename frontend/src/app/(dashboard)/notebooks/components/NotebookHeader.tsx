'use client'

import { useState } from 'react'
import { NotebookResponse } from '@/lib/types/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Archive, ArchiveRestore, Trash2, Briefcase, BookOpen } from 'lucide-react'
import { useUpdateNotebook } from '@/lib/hooks/use-notebooks'
import { NotebookDeleteDialog } from './NotebookDeleteDialog'
import { formatDistanceToNow } from 'date-fns'
import { getDateLocale } from '@/lib/utils/date-locale'
import { InlineEdit } from '@/components/common/InlineEdit'
import { useTranslation } from '@/lib/hooks/use-translation'
import { toast } from 'sonner'

interface NotebookHeaderProps {
  notebook: NotebookResponse
  isB2BMode?: boolean
  onToggleB2BMode?: () => void
}

export function NotebookHeader({ notebook, isB2BMode, onToggleB2BMode }: NotebookHeaderProps) {
  const { t, language } = useTranslation()
  const dfLocale = getDateLocale(language)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const updateNotebook = useUpdateNotebook()

  const handleUpdateName = async (name: string) => {
    if (!name || name === notebook.name) return
    try {
      await updateNotebook.mutateAsync({
        id: notebook.id,
        data: { name }
      })
    } catch {
      toast.error('Failed to rename notebook')
    }
  }

  const handleUpdateDescription = async (description: string) => {
    if (description === notebook.description) return
    try {
      await updateNotebook.mutateAsync({
        id: notebook.id,
        data: { description: description || undefined }
      })
    } catch {
      toast.error('Failed to update description')
    }
  }

  const handleArchiveToggle = () => {
    updateNotebook.mutate({
      id: notebook.id,
      data: { archived: !notebook.archived }
    })
  }

  return (
    <>
      <div className="border-b pb-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <InlineEdit
                id="notebook-name"
                name="notebook-name"
                value={notebook.name}
                onSave={handleUpdateName}
                className="text-2xl font-bold"
                inputClassName="text-2xl font-bold"
                placeholder={t('notebooks.namePlaceholder')}
              />
              {notebook.archived && (
                <Badge variant="secondary">{t('notebooks.archived')}</Badge>
              )}
            </div>
            <div className="flex gap-2">
              {onToggleB2BMode && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onToggleB2BMode}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white border-0 shadow-sm transition-all duration-200"
                >
                  {isB2BMode ? (
                    <>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Research Notebook
                    </>
                  ) : (
                    <>
                      <Briefcase className="h-4 w-4 mr-2" />
                      B2B Proposal Workspace
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchiveToggle}
              >
                {notebook.archived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    {t('notebooks.unarchive')}
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    {t('notebooks.archive')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </Button>
            </div>
          </div>
          
          <InlineEdit
            id="notebook-description"
            name="notebook-description"
            value={notebook.description || ''}
            onSave={handleUpdateDescription}
            className="text-muted-foreground"
            inputClassName="text-muted-foreground"
            placeholder={t('notebooks.addDescription')}
            multiline
            emptyText={t('notebooks.addDescription')}
          />
          
          <div className="text-sm text-muted-foreground">
            {t('common.created').replace('{time}', formatDistanceToNow(new Date(notebook.created), { addSuffix: true, locale: dfLocale }))} • 
            {t('common.updated').replace('{time}', formatDistanceToNow(new Date(notebook.updated), { addSuffix: true, locale: dfLocale }))}
          </div>
        </div>
      </div>

      <NotebookDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        notebookId={notebook.id}
        notebookName={notebook.name}
        redirectAfterDelete
      />
    </>
  )
}