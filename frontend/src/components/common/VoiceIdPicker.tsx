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
  engine?: string
}

const ENGINE_LABELS: Record<string, string> = {
  kokoro: 'Kokoro (Local)',
  openai: 'OpenAI TTS',
  elevenlabs: 'ElevenLabs',
  deepgram: 'Deepgram Aura',
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
  engine,
}: VoiceIdPickerProps) {
  const { t } = useTranslation()
  const { data: registry, isLoading } = useVoiceRegistry()
  const derivedId = useId()
  const selectId = id || derivedId
 
  // Map voice entries to ModelOption — id is the RAW voice id (no engine prefix)
  const voiceOptions: ModelOption[] = useMemo(() => {
    if (!registry) return []
    const options: ModelOption[] = []
    for (const ttsEngine of registry.tts_engines) {
      if (engine && ttsEngine.engine.toLowerCase() !== engine.toLowerCase()) {
        // If an explicit engine filter is set, still preserve custom voices for that engine
        const customVoices = ttsEngine.voices.filter(v => v.id.startsWith('custom_'))
        for (const voice of customVoices) {
          if (!options.some(o => o.id === voice.id)) {
            options.push({
              id: voice.id,
              name: voice.name,
              provider: 'Custom Voices',
              description: '● Local Recorded Voice',
            })
          }
        }
        continue
      }
      for (const voice of ttsEngine.voices) {
        const isCustom = voice.id.startsWith('custom_')
        options.push({
          id: voice.id,  // Raw voice ID: "af_heart" or "custom_06064ded..."
          name: voice.name,
          provider: isCustom ? 'Custom Voices' : (ENGINE_LABELS[ttsEngine.engine] || ttsEngine.engine),
          description: isCustom
            ? '● Local Recorded Voice'
            : (ttsEngine.status === 'healthy' ? '● Online' : ttsEngine.status === 'configured' ? '○ Configured' : '⚠ Not Configured'),
        })
      }
    }
    
    if (value && value.startsWith('custom_')) {
      if (!options.some(o => o.id === value)) {
        options.push({
          id: value,
          name: `Custom Recorded Voice (${value.replace('custom_', '').substring(0, 8)})`,
          provider: 'Custom Voices',
          description: '● Local Recorded Voice',
        })
      }
    }
    
    return options
  }, [registry, engine, value])

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
