'use client'

import { useId, useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { SearchableModelSelect, type ModelOption } from '@/components/common/SearchableModelSelect'
import { useVoiceRegistry } from '@/lib/hooks/use-voice-registry'
import { useTranslation } from '@/lib/hooks/use-translation'

interface VoiceIdPickerProps {
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

/**
 * Picks a raw voice ID (e.g. "af_heart") from all configured TTS engines.
 * Unlike VoiceModelSelector, this does NOT prefix with the engine name.
 * Use for speaker-level voice_id fields that store just the voice identifier.
 */
export function VoiceIdPicker({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  clearable = false,
}: VoiceIdPickerProps) {
  const { t } = useTranslation()
  const { data: registry, isLoading } = useVoiceRegistry()
  const derivedId = useId()
  const selectId = id || derivedId

  // Map voice entries to ModelOption — id is the RAW voice id (no engine prefix)
  const voiceOptions: ModelOption[] = useMemo(() => {
    if (!registry) return []
    const options: ModelOption[] = []
    for (const engine of registry.tts_engines) {
      if (engine.status === 'not_configured') continue
      for (const voice of engine.voices) {
        options.push({
          id: voice.id,  // Raw voice ID: "af_heart", NOT "kokoro:af_heart"
          name: voice.name,
          provider: ENGINE_LABELS[engine.engine] || engine.engine,
          description: engine.status === 'healthy' ? '● Online' : '○ Configured',
        })
      }
    }
    return options
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
        models={voiceOptions}
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
