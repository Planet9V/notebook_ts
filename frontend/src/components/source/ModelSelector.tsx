'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { useModelDefaults, useModels } from '@/lib/hooks/use-models'
import { useTranslation } from '@/lib/hooks/use-translation'
import { SearchableModelSelect, type ModelOption } from '@/components/common/SearchableModelSelect'

interface ModelSelectorProps {
  currentModel?: string
  onModelChange: (model?: string) => void
  disabled?: boolean
}

export function ModelSelector({ 
  currentModel, 
  onModelChange,
  disabled = false 
}: ModelSelectorProps) {
  const { t } = useTranslation()
  const { data: models } = useModels()
  const { data: defaults } = useModelDefaults()

  // Filter for language models and map to ModelOption
  const languageModels: ModelOption[] = useMemo(() => {
    if (!models) return []
    return models
      .filter((model) => model.type === 'language')
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
  }, [models])

  const defaultModel = useMemo(() => {
    if (!defaults?.default_chat_model) return undefined
    return languageModels.find(model => model.id === defaults.default_chat_model)
  }, [defaults?.default_chat_model, languageModels])

  // Build placeholder text showing current default
  const placeholderText = defaultModel
    ? `${t('common.default')}: ${defaultModel.name}`
    : t('models.selectModelPlaceholder')

  return (
    <div className="flex items-center gap-1">
      <SearchableModelSelect
        models={languageModels}
        value={currentModel || ''}
        onValueChange={(val) => onModelChange(val || undefined)}
        placeholder={placeholderText}
        disabled={disabled}
        clearable={!!currentModel}
        groupByProvider
        sortBy="name"
        triggerClassName="h-7 text-[11px]"
      />
      {currentModel && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onModelChange(undefined)}
          className="h-7 w-7 shrink-0"
          title={t('common.resetToDefault')}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
