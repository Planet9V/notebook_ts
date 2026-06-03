'use client'

import { useId, useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { SearchableModelSelect, type ModelOption } from '@/components/common/SearchableModelSelect'
import { useVoiceRegistry } from '@/lib/hooks/use-voice-registry'
import { useTranslation } from '@/lib/hooks/use-translation'

interface VoiceModelSelectorProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
}

const ENGINE_LABELS: Record<string, string> = {
  kokoro: 'Kokoro (Local)',
  openai: 'OpenAI TTS',
  elevenlabs: 'ElevenLabs',
}

export function VoiceModelSelector({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  clearable = false,
}: VoiceModelSelectorProps) {
  const { t } = useTranslation()
  const { data: registry, isLoading } = useVoiceRegistry()
  const derivedId = useId()
  const selectId = id || derivedId

  const voiceModels: ModelOption[] = useMemo(() => {
    if (!registry) return []
    const models: ModelOption[] = []
    for (const engine of registry.tts_engines) {
      if (engine.status === 'not_configured') continue
      for (const voice of engine.voices) {
        models.push({
          id: `${engine.engine}:${voice.id}`,
          name: voice.name,
          provider: ENGINE_LABELS[engine.engine] || engine.engine,
          description: engine.status === 'healthy' ? '● Online' : '○ Configured',
        })
      }
    }
    return models
  }, [registry])

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
        models={voiceModels}
        value={value}
        onValueChange={onChange}
        placeholder={placeholder || 'Select a voice'}
        emptyText="No voice engines configured"
        disabled={disabled}
        clearable={clearable}
        groupByProvider
        sortBy="name"
      />
    </div>
  )
}
