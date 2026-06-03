'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { TransformationCard } from './TransformationCard'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Wand2 } from 'lucide-react'
import { Transformation } from '@/lib/types/transformations'
import { TransformationEditorDialog } from './TransformationEditorDialog'
import { useTranslation } from '@/lib/hooks/use-translation'

interface TransformationsListProps {
  transformations: Transformation[] | undefined
  isLoading: boolean
  onPlayground?: (transformation: Transformation) => void
}

export function TransformationsList({ transformations, isLoading, onPlayground }: TransformationsListProps) {
  const { t } = useTranslation()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTransformation, setEditingTransformation] = useState<Transformation | undefined>()

  const handleOpenEditor = (trans?: Transformation) => {
    setEditingTransformation(trans)
    setEditorOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-40 rounded bg-slate-700/40 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
              <div className="h-6 w-20 rounded-full bg-slate-700/25 animate-pulse" />
            </div>
            <div className="h-3 w-64 rounded bg-slate-700/20 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-7 w-24 rounded bg-slate-700/15 animate-pulse" />
              <div className="h-7 w-20 rounded bg-slate-700/15 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!transformations || transformations.length === 0) {
    return (
      <EmptyState
        icon={Wand2}
        title={t('transformations.noTransformations')}
        description={t('transformations.createOne')}
        action={
          <Button onClick={() => handleOpenEditor()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('transformations.createNew')}
          </Button>
        }
      />
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{t('transformations.listTitle')}</h2>
          <Button onClick={() => handleOpenEditor()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('transformations.createNew')}
          </Button>
        </div>

        <div className="space-y-4">
          {transformations.map((transformation) => (
            <TransformationCard
              key={transformation.id}
              transformation={transformation}
              onPlayground={onPlayground ? () => onPlayground(transformation) : undefined}
              onEdit={() => handleOpenEditor(transformation)}
            />
          ))}
        </div>
      </div>

      <TransformationEditorDialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) {
            setEditingTransformation(undefined)
          }
        }}
        transformation={editingTransformation}
      />
    </>
  )
}
