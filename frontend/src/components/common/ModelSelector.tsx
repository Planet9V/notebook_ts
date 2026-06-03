'use client'

import { useId, useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { useModels } from '@/lib/hooks/use-models'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { SearchableModelSelect, type ModelOption } from '@/components/common/SearchableModelSelect'
import { useTranslation } from '@/lib/hooks/use-translation'

interface ModelSelectorProps {
  id?: string
  name?: string
  label?: string
  modelType: 'language' | 'embedding' | 'speech_to_text' | 'text_to_speech' | 'reranker'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** If true, show a clear button */
  clearable?: boolean
}

export function ModelSelector({
  id,
  name,
  label,
  modelType,
  value,
  onChange,
  placeholder,
  disabled = false,
  clearable = false,
}: ModelSelectorProps) {
  const { t } = useTranslation()
  const { data: models, isLoading } = useModels()
  const derivedId = useId()
  const selectId = id || derivedId

  // Filter models by type and map to ModelOption interface
  const filteredModels: ModelOption[] = useMemo(() => {
    if (!models) return []
    return models
      .filter((model) => model.type === modelType)
      .map((model) => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        context_length: model.context_length,
        pricing_prompt: model.pricing_prompt,
        pricing_completion: model.pricing_completion,
        modality: model.modality,
        description: model.description,
      }))
  }, [models, modelType])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {label && <Label htmlFor={selectId}>{label}</Label>}
        <div className="flex items-center gap-2 h-9 px-3 border rounded-md">
          <LoadingSpinner size="sm" />
          <span className="text-xs text-muted-foreground">{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={selectId}>{label}</Label>}
      <SearchableModelSelect
        models={filteredModels}
        value={value}
        onValueChange={onChange}
        placeholder={placeholder || t('settings.embeddingOptionPlaceholder')}
        emptyText={t('common.noResults')}
        disabled={disabled}
        clearable={clearable}
        groupByProvider
        sortBy="name"
      />
    </div>
  )
}
