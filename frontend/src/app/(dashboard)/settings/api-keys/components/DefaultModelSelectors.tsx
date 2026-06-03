'use client'

import { useState, useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchableModelSelect } from '@/components/common/SearchableModelSelect'
import { Label } from '@/components/ui/label'
import {
  Plug,
  Loader2,
  AlertCircle,
  Wand2,
} from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useUpdateModelDefaults, useAutoAssignDefaults, useTestModel } from '@/lib/hooks/use-models'
import { Model, ModelDefaults } from '@/lib/types/models'
import { ModelTestResultDialog } from '@/components/settings'
import { EmbeddingModelChangeDialog } from '@/components/settings/EmbeddingModelChangeDialog'
import { ModelType } from '../constants'

export interface DefaultModelSelectorsProps {
  models: Model[]
  defaults: ModelDefaults
}

// =============================================================================
// Default Models Section
// =============================================================================

export function DefaultModelSelectors({
  models,
  defaults,
}: DefaultModelSelectorsProps) {
  const { t } = useTranslation()
  const updateDefaults = useUpdateModelDefaults()
  const autoAssign = useAutoAssignDefaults()
  const { testModel, isPending: isTestPending, testingModelId, testResult, testedModelName, clearResult } = useTestModel()
  const { setValue, watch } = useForm<ModelDefaults>({ defaultValues: defaults })
  const generatedId = useId()

  const [showEmbeddingDialog, setShowEmbeddingDialog] = useState(false)
  const [pendingEmbeddingChange, setPendingEmbeddingChange] = useState<{
    key: keyof ModelDefaults; value: string; oldModelId?: string; newModelId?: string
  } | null>(null)
  const [rerankerEnabledByDefault, setRerankerEnabledByDefault] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('default_reranker_enabled') === 'true'
      setRerankerEnabledByDefault(saved)
    }
  }, [])

  const handleRerankerToggle = (checked: boolean) => {
    setRerankerEnabledByDefault(checked)
    if (typeof window !== 'undefined') {
      localStorage.setItem('default_reranker_enabled', String(checked))
    }
  }

  useEffect(() => {
    if (defaults) {
      Object.entries(defaults).forEach(([key, value]) => {
        setValue(key as keyof ModelDefaults, value)
      })
    }
  }, [defaults, setValue])

  interface DefaultConfig {
    key: keyof ModelDefaults
    label: string
    description: string
    modelType: ModelType
    required?: boolean
    id: string
  }

  const primaryConfigs: DefaultConfig[] = [
    { key: 'default_chat_model', label: t('models.chatModelLabel'), description: t('models.chatModelDesc'), modelType: 'language', required: true, id: `${generatedId}-chat` },
    { key: 'default_embedding_model', label: t('models.embeddingModelLabel'), description: t('models.embeddingModelDesc'), modelType: 'embedding', required: true, id: `${generatedId}-embed` },
    { key: 'default_text_to_speech_model', label: t('models.ttsModelLabel'), description: t('models.ttsModelDesc'), modelType: 'text_to_speech', id: `${generatedId}-tts` },
    { key: 'default_speech_to_text_model', label: t('models.sttModelLabel'), description: t('models.sttModelDesc'), modelType: 'speech_to_text', id: `${generatedId}-stt` },
  ]

  const advancedConfigs: DefaultConfig[] = [
    { key: 'default_transformation_model', label: t('models.transformationModelLabel'), description: t('models.transformationModelDesc'), modelType: 'language', required: true, id: `${generatedId}-transform` },
    { key: 'default_tools_model', label: t('models.toolsModelLabel'), description: t('models.toolsModelDesc'), modelType: 'language', id: `${generatedId}-tools` },
    { key: 'large_context_model', label: t('models.largeContextModelLabel'), description: t('models.largeContextModelDesc'), modelType: 'language', id: `${generatedId}-large` },
    { key: 'default_reranker_model', label: 'Reranker Model', description: 'Dedicated reranking model to re-score and reorder search results for improved relevance (e.g. Qwen3-Reranker, Cohere Rerank).', modelType: 'reranking', id: `${generatedId}-reranker` },
  ]

  const defaultConfigs = [...primaryConfigs, ...advancedConfigs]

  const handleChange = (key: keyof ModelDefaults, value: string) => {
    if (key === 'default_embedding_model') {
      const current = defaults[key]
      if (current && current !== value) {
        setPendingEmbeddingChange({ key, value, oldModelId: current, newModelId: value })
        setShowEmbeddingDialog(true)
        return
      }
    }
    updateDefaults.mutate({ [key]: value || null })
  }

  const handleConfirmEmbeddingChange = () => {
    if (pendingEmbeddingChange) {
      updateDefaults.mutate({ [pendingEmbeddingChange.key]: pendingEmbeddingChange.value || null })
      setPendingEmbeddingChange(null)
    }
  }

  const getModelsForType = (type: ModelType) => models.filter(m => m.type === type)

  const missingRequired = defaultConfigs
    .filter(c => {
      if (!c.required) return false
      const value = defaults[c.key]
      if (!value) return true
      return !models.filter(m => m.type === c.modelType).some(m => m.id === value)
    })
    .map(c => c.label)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('models.defaultAssignments')}</CardTitle>
        <CardDescription>{t('models.defaultAssignmentsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {missingRequired.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{t('models.missingRequiredModels').replace('{models}', missingRequired.join(', '))}</span>
              <Button
                variant="outline" size="sm"
                onClick={() => autoAssign.mutate()}
                disabled={autoAssign.isPending}
                className="shrink-0 gap-1.5"
              >
                {autoAssign.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                {autoAssign.isPending ? t('models.autoAssigning') : t('models.autoAssign')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Primary models: Chat, Embedding, TTS, STT */}
        <div className="grid gap-4 sm:grid-cols-2">
          {primaryConfigs.map(config => {
            const available = getModelsForType(config.modelType)
            const currentValue = watch(config.key) || undefined
            const isValid = currentValue && available.some(m => m.id === currentValue)
            const selectedModel = currentValue ? models.find(m => m.id === currentValue) : null
            const isThisTesting = testingModelId === currentValue

            return (
              <div key={config.key} className="space-y-1.5">
                <Label htmlFor={config.id} className="text-xs font-medium">
                  {config.label}
                  {config.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1">
                    <SearchableModelSelect
                      models={available}
                      value={currentValue}
                      onValueChange={(v) => handleChange(config.key, v)}
                      placeholder={
                        config.required && !isValid && available.length > 0
                          ? t('models.requiredModelPlaceholder')
                          : t('models.selectModelPlaceholder')
                      }
                      emptyText="No models available"
                      clearable={!config.required}
                      triggerClassName={config.required && !isValid && available.length > 0 ? 'border-destructive' : ''}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    disabled={!selectedModel || isTestPending}
                    onClick={() => selectedModel && testModel(selectedModel.id, selectedModel.name)}
                    title={selectedModel ? `Test ${selectedModel.name}` : 'Select a model first'}
                  >
                    {isThisTesting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plug className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Advanced models: Transformation, Tools, Large Context, Reranker */}
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground mb-3">{t('navigation.advanced')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
              {advancedConfigs.map(config => {
                const available = getModelsForType(config.modelType)
                const currentValue = watch(config.key) || undefined
                const isValid = currentValue && available.some(m => m.id === currentValue)
                const selectedModel = currentValue ? models.find(m => m.id === currentValue) : null
                const isThisTesting = testingModelId === currentValue

                return (
                  <div key={config.key} className="space-y-1.5">
                    <Label htmlFor={config.id} className="text-xs font-medium">
                      {config.label}
                      {config.required && <span className="text-destructive ml-0.5">*</span>}
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1">
                        <SearchableModelSelect
                          models={available}
                          value={currentValue}
                          onValueChange={(v) => handleChange(config.key, v)}
                          placeholder={
                            config.required && !isValid && available.length > 0
                              ? t('models.requiredModelPlaceholder')
                              : t('models.selectModelPlaceholder')
                          }
                          emptyText="No models available"
                          clearable={!config.required}
                          triggerClassName={config.required && !isValid && available.length > 0 ? 'border-destructive' : ''}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        disabled={!selectedModel || isTestPending}
                        onClick={() => selectedModel && testModel(selectedModel.id, selectedModel.name)}
                        title={selectedModel ? `Test ${selectedModel.name}` : 'Select a model first'}
                      >
                        {isThisTesting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plug className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{config.description}</p>
                    {config.key === 'default_reranker_model' && (
                      <div className="mt-2.5 flex items-center justify-between rounded-lg border border-white/5 bg-slate-950/40 p-2.5 backdrop-blur-sm">
                        <div className="space-y-0.5 pr-4">
                          <Label htmlFor="toggle-reranker-default" className="text-xs font-semibold text-slate-200 cursor-pointer">
                            Enable Reranking by Default
                          </Label>
                          <p className="text-[10px] text-muted-foreground leading-normal">
                            Automatically turn on deep semantic reranking for all new search queries.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input 
                            type="checkbox" 
                            id="toggle-reranker-default"
                            className="sr-only peer"
                            checked={rerankerEnabledByDefault}
                            onChange={(e) => handleRerankerToggle(e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-950"></div>
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
        </div>
      </CardContent>

      <ModelTestResultDialog
        open={!!testResult}
        onOpenChange={() => clearResult()}
        result={testResult}
        modelName={testedModelName}
      />

      <EmbeddingModelChangeDialog
        open={showEmbeddingDialog}
        onOpenChange={(open) => { if (!open) { setPendingEmbeddingChange(null); setShowEmbeddingDialog(false) } }}
        onConfirm={handleConfirmEmbeddingChange}
        oldModelName={pendingEmbeddingChange?.oldModelId ? models.find(m => m.id === pendingEmbeddingChange.oldModelId)?.name : undefined}
        newModelName={pendingEmbeddingChange?.newModelId ? models.find(m => m.id === pendingEmbeddingChange.newModelId)?.name : undefined}
      />
    </Card>
  )
}
