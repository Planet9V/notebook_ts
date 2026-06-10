'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Volume2, Play, Loader2, ExternalLink, ChevronDown, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { voiceApi } from '@/lib/api/voice'
import type { VoiceConfig, VoiceSettings } from '@/lib/api/voice'
import { VoiceApiKeyField } from './VoiceApiKeyField'
import { useCredentialsByProvider } from '@/lib/hooks/use-credentials'
import { useAudioPlayback } from '../hooks/use-voice-testing'
import { useAnalytics } from '@/lib/hooks/use-analytics'

interface TTSConfigCardProps {
  config: VoiceConfig | null
  settings: VoiceSettings | null
  onRefresh: () => void
}

type TTSEngine = 'kokoro' | 'openai' | 'elevenlabs' | 'deepgram'
const KOKORO_SERVICE_NAME = 'Kokoro TTS'

const ENGINES: { id: TTSEngine; label: string; desc: string }[] = [
  { id: 'kokoro', label: 'Kokoro', desc: 'Self-hosted' },
  { id: 'openai', label: 'OpenAI', desc: 'Cloud API' },
  { id: 'elevenlabs', label: 'ElevenLabs', desc: 'Cloud API' },
  { id: 'deepgram', label: 'Deepgram', desc: 'Cloud API' },
]

const OPENAI_VOICES = ['alloy', 'ash', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer']
const OPENAI_MODELS = ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd']
const ELEVENLABS_MODELS = ['eleven_v3', 'eleven_flash_v2_5', 'eleven_turbo_v2_5', 'eleven_multilingual_v2']
const DEEPGRAM_TTS_VOICES = [
  { id: 'aura-2-thalia-en', name: 'Thalia', desc: 'Female, warm' },
  { id: 'aura-2-andromeda-en', name: 'Andromeda', desc: 'Female, bright' },
  { id: 'aura-2-arcas-en', name: 'Arcas', desc: 'Male, confident' },
  { id: 'aura-2-helios-en', name: 'Helios', desc: 'Male, clear' },
  { id: 'aura-2-luna-en', name: 'Luna', desc: 'Female, soothing' },
  { id: 'aura-2-orion-en', name: 'Orion', desc: 'Male, authoritative' },
  { id: 'aura-2-perseus-en', name: 'Perseus', desc: 'Male, friendly' },
  { id: 'aura-2-stella-en', name: 'Stella', desc: 'Female, professional' },
]

export function TTSConfigCard({ config, settings, onRefresh }: TTSConfigCardProps) {
  const { trackEvent } = useAnalytics()
  const [engine, setEngine] = useState<TTSEngine>('kokoro')
  const [selectedVoice, setSelectedVoice] = useState('af_heart')
  const [speed, setSpeed] = useState([1.0])
  const [testText, setTestText] = useState('Welcome to Tetrel Security voice services.')

  // OpenAI fields
  const [openaiVoice, setOpenaiVoice] = useState('alloy')
  const [openaiModel, setOpenaiModel] = useState('tts-1')
  const [openaiSpeed, setOpenaiSpeed] = useState([1.0])

  // ElevenLabs fields
  const [elVoiceId, setElVoiceId] = useState('')
  const [elModel, setElModel] = useState('eleven_v3')
  const [elStability, setElStability] = useState([0.5])
  const [elSimilarity, setElSimilarity] = useState([0.75])

  // Deepgram fields
  const [dgVoice, setDgVoice] = useState('aura-2-thalia-en')

  // Single audio playback lifecycle (replaces 4 duplicate handlers + 4 isPlaying states)
  const audio = useAudioPlayback()

  // Hydrate local state from backend-persisted settings on load
  useEffect(() => {
    if (!settings) return
    if (settings.tts_engine) setEngine(settings.tts_engine as TTSEngine)
    if (settings.kokoro_default_voice) setSelectedVoice(settings.kokoro_default_voice)
    if (settings.kokoro_default_speed) setSpeed([settings.kokoro_default_speed])
    if (settings.openai_tts_voice) setOpenaiVoice(settings.openai_tts_voice)
    if (settings.openai_tts_model) setOpenaiModel(settings.openai_tts_model)
    if (settings.openai_tts_speed) setOpenaiSpeed([settings.openai_tts_speed])
    if (settings.elevenlabs_voice_id) setElVoiceId(settings.elevenlabs_voice_id)
    if (settings.elevenlabs_model_id) setElModel(settings.elevenlabs_model_id)
    if (settings.elevenlabs_stability !== undefined) setElStability([settings.elevenlabs_stability])
    if (settings.elevenlabs_similarity_boost !== undefined) setElSimilarity([settings.elevenlabs_similarity_boost])
    if (settings.deepgram_tts_voice) setDgVoice(settings.deepgram_tts_voice)
  }, [settings])

  const ttsService = config?.services.find((s) => s.name === KOKORO_SERVICE_NAME)
  const isHealthy = ttsService?.status === 'healthy'

  // Check credential status for the active cloud engine
  const cloudProvider = engine !== 'kokoro' ? engine : undefined
  const { data: cloudCreds } = useCredentialsByProvider(cloudProvider ?? '')
  const hasCloudKey = (cloudCreds ?? []).some(c => c.has_api_key)

  const saveSettings = useCallback(async (overrides: Record<string, unknown> = {}) => {
    try {
      const settings = {
        tts_engine: engine,
        kokoro_default_voice: selectedVoice,
        kokoro_default_speed: speed[0],
        openai_tts_voice: openaiVoice,
        openai_tts_model: openaiModel,
        openai_tts_speed: openaiSpeed[0],
        elevenlabs_voice_id: elVoiceId,
        elevenlabs_model_id: elModel,
        elevenlabs_stability: elStability[0],
        elevenlabs_similarity_boost: elSimilarity[0],
        deepgram_tts_voice: dgVoice,
        ...overrides,
      }
      await voiceApi.updateSettings(settings)
      toast.success('Voice settings saved')
      onRefresh()
    } catch (error) {
      console.error('Failed to save TTS settings:', error)
      toast.error('Failed to save settings')
    }
  }, [engine, selectedVoice, speed, openaiVoice, openaiModel, openaiSpeed, elVoiceId, elModel, elStability, elSimilarity, dgVoice, onRefresh])

  const [isPreflighting, setIsPreflighting] = useState<string | null>(null)

  const handleEngineChange = useCallback(async (targetEngine: TTSEngine) => {
    setIsPreflighting(targetEngine)
    try {
      const check = await voiceApi.preflight(targetEngine)
      if (check.status === 'healthy') {
        setEngine(targetEngine)
        await saveSettings({ tts_engine: targetEngine })
      } else {
        toast.error(`Engine pre-flight check failed: ${check.details || 'Service is not configured or offline'}`)
      }
    } catch (err) {
      console.error('Pre-flight check error:', err)
      toast.error('Pre-flight check failed to execute')
    } finally {
      setIsPreflighting(null)
    }
  }, [saveSettings])

  // Single parameterized test handler — replaces 4 duplicate functions
  const handleTestEngine = useCallback(async (engineId: string, synthOptions: Record<string, unknown>) => {
    try {
      trackEvent('audio_generated', {
        profile: synthOptions.voice || synthOptions.voiceId || synthOptions.model || 'default',
        text_length: testText.length,
        engine: engineId,
        ...synthOptions,
      })
      const blob = await voiceApi.synthesize(testText, synthOptions)
      await audio.play(engineId, blob)
    } catch (error) {
      console.error(`${engineId} TTS test failed:`, error)
      toast.error(`TTS test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      audio.stop()
    }
  }, [testText, audio, trackEvent])

  const handleTestTrigger = () => {
    if (engine === 'kokoro') {
      handleTestEngine('kokoro', { engine: 'kokoro', voice: selectedVoice, format: 'mp3', speed: speed[0] })
    } else if (engine === 'openai') {
      handleTestEngine('openai', { engine: 'openai', voice: openaiVoice, model: openaiModel, speed: openaiSpeed[0] })
    } else if (engine === 'elevenlabs') {
      handleTestEngine('elevenlabs', { engine: 'elevenlabs', voiceId: elVoiceId || undefined, modelId: elModel, stability: elStability[0], similarityBoost: elSimilarity[0] })
    } else if (engine === 'deepgram') {
      handleTestEngine('deepgram', { engine: 'deepgram', model: dgVoice })
    }
  }

  const isTestingActive = audio.isPlaying('kokoro') || audio.isPlaying('openai') || audio.isPlaying('elevenlabs') || audio.isPlaying('deepgram')

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center">
              <Volume2 className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base">Text-to-Speech</CardTitle>
              <CardDescription className="text-xs">
                Multi-engine TTS synthesis
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            role="status"
            aria-live="polite"
            className={cn(
              'text-[11px] font-mono',
              engine === 'kokoro' && isHealthy
                ? 'border-emerald-500/40 text-emerald-400'
                : engine !== 'kokoro' && hasCloudKey
                  ? 'border-emerald-500/40 text-emerald-400'
                  : engine !== 'kokoro'
                    ? 'border-amber-500/40 text-amber-400'
                    : 'border-red-500/40 text-red-400'
            )}
          >
            {engine === 'kokoro'
              ? (isHealthy ? 'Ready' : 'Offline')
              : hasCloudKey
                ? 'Configured'
                : 'Not Configured'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Engine Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">TTS Engine</Label>
          <div className="flex gap-1.5" role="radiogroup" aria-label="TTS Engine">
            {ENGINES.map(e => (
              <button
                key={e.id}
                role="radio"
                disabled={isPreflighting !== null}
                aria-checked={engine === e.id}
                onClick={() => handleEngineChange(e.id)}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded-md border text-xs transition-all text-center cursor-pointer',
                  engine === e.id
                    ? 'border-violet-500/50 bg-violet-500/10 text-violet-400'
                    : 'border-sidebar-border/30 bg-sidebar-accent/5 text-muted-foreground hover:border-sidebar-border/50',
                  isPreflighting !== null && 'opacity-60 cursor-not-allowed'
                )}
              >
                <div className="font-medium flex items-center justify-center gap-1">
                  {isPreflighting === e.id && <Loader2 className="h-3 w-3 animate-spin text-violet-400" />}
                  {e.label}
                </div>
                <div className="text-[9px] text-muted-foreground">{e.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Active Profile Indicator */}
        <div className="rounded-lg bg-slate-950/30 border border-white/5 p-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider text-[10px]">Active Profile</span>
          <Badge variant="outline" className="font-mono text-xs text-violet-400 border-violet-500/20 bg-violet-500/5">
            {engine === 'kokoro' ? selectedVoice : engine === 'openai' ? `${openaiVoice} (${openaiModel})` : engine === 'elevenlabs' ? `${elVoiceId || 'default'} (${elModel})` : dgVoice}
          </Badge>
        </div>

        {/* Collapsible Advanced Configuration */}
        <details className="group border border-sidebar-border/30 rounded-xl p-3.5 bg-sidebar-accent/5">
          <summary className="text-xs font-semibold cursor-pointer select-none text-muted-foreground hover:text-foreground list-none flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono uppercase tracking-wider text-[10px]">
              <Settings className="h-3.5 w-3.5" /> Engine Settings
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3.5 space-y-4 pt-3.5 border-t border-sidebar-border/20">
            {/* ── Kokoro Engine Settings ── */}
            {engine === 'kokoro' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Service URL</Label>
                  <Input
                    value={config?.kokoro_tts_url || 'http://kokoro-tts:8880'}
                    readOnly
                    className="h-8 text-xs font-mono bg-sidebar-accent/20"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Set via <code className="bg-sidebar-accent/30 px-1 rounded">KOKORO_TTS_URL</code> env var
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Default Voice</Label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(config?.available_voices || [
                        'af_heart', 'af_bella', 'af_nicole', 'af_sarah', 'af_sky',
                        'am_adam', 'am_michael', 'bf_emma', 'bf_isabella', 'bm_george', 'bm_lewis',
                      ]).map((v) => (
                        <SelectItem key={v} value={v}>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-xs">{v}</span>
                            <span className="text-muted-foreground text-[10px]">
                              {v.startsWith('af_') ? 'American Female' : v.startsWith('am_') ? 'American Male' : v.startsWith('bf_') ? 'British Female' : 'British Male'}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Speed</Label>
                    <span className="text-xs font-mono text-muted-foreground">{speed[0].toFixed(1)}x</span>
                  </div>
                  <Slider value={speed} onValueChange={setSpeed} min={0.5} max={2.0} step={0.1} className="w-full animate-none" aria-label="Kokoro speech speed" />
                  <div className="flex justify-between text-[10px] text-muted-foreground/50">
                    <span>0.5x</span><span>1.0x</span><span>2.0x</span>
                  </div>
                </div>

                <div className="pt-1">
                  <a href="https://github.com/remsky/Kokoro-FastAPI" target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                    Kokoro FastAPI Docs <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </>
            )}

            {/* ── OpenAI TTS Settings ── */}
            {engine === 'openai' && (
              <>
                <VoiceApiKeyField
                  provider="openai"
                  providerLabel="OpenAI"
                  modalities={['text_to_speech', 'speech_to_text', 'language']}
                  docsUrl="https://platform.openai.com/docs/guides/text-to-speech"
                  docsLabel="OpenAI TTS Docs"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Voice</Label>
                    <Select value={openaiVoice} onValueChange={setOpenaiVoice}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OPENAI_VOICES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Model</Label>
                    <Select value={openaiModel} onValueChange={setOpenaiModel}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OPENAI_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Speed</Label>
                    <span className="text-xs font-mono text-muted-foreground">{openaiSpeed[0].toFixed(1)}x</span>
                  </div>
                  <Slider value={openaiSpeed} onValueChange={setOpenaiSpeed} min={0.25} max={4.0} step={0.25} className="w-full animate-none" aria-label="OpenAI speech speed" />
                  <div className="flex justify-between text-[10px] text-muted-foreground/50">
                    <span>0.25x</span><span>1.0x</span><span>4.0x</span>
                  </div>
                </div>

                <div className="pt-1">
                  <a href="https://platform.openai.com/docs/guides/text-to-speech" target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                    OpenAI TTS Docs <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </>
            )}

            {/* ── ElevenLabs Settings ── */}
            {engine === 'elevenlabs' && (
              <>
                <VoiceApiKeyField
                  provider="elevenlabs"
                  providerLabel="ElevenLabs"
                  modalities={['text_to_speech']}
                  docsUrl="https://elevenlabs.io/docs"
                  docsLabel="ElevenLabs Docs"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Voice ID</Label>
                    <Input value={elVoiceId} onChange={e => setElVoiceId(e.target.value)} placeholder="Voice ID..." className="h-8 text-xs font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Model</Label>
                    <Select value={elModel} onValueChange={setElModel}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ELEVENLABS_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Stability</Label>
                      <span className="text-xs font-mono text-muted-foreground">{elStability[0].toFixed(2)}</span>
                    </div>
                    <Slider value={elStability} onValueChange={setElStability} min={0} max={1} step={0.05} className="w-full animate-none" aria-label="Voice stability" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Similarity</Label>
                      <span className="text-xs font-mono text-muted-foreground">{elSimilarity[0].toFixed(2)}</span>
                    </div>
                    <Slider value={elSimilarity} onValueChange={setElSimilarity} min={0} max={1} step={0.05} className="w-full animate-none" aria-label="Similarity boost" />
                  </div>
                </div>

                <div className="pt-1">
                  <a href="https://elevenlabs.io/docs" target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                    ElevenLabs Docs <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </>
            )}

            {/* ── Deepgram TTS Settings ── */}
            {engine === 'deepgram' && (
              <>
                <VoiceApiKeyField
                  provider="deepgram"
                  providerLabel="Deepgram"
                  modalities={['text_to_speech', 'speech_to_text']}
                  docsUrl="https://developers.deepgram.com/docs/tts-models"
                  docsLabel="Deepgram TTS Docs"
                />

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Voice</Label>
                  <Select value={dgVoice} onValueChange={setDgVoice}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEEPGRAM_TTS_VOICES.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          <div className="flex flex-col">
                            <span className="text-xs">{v.name}</span>
                            <span className="text-[10px] text-muted-foreground">{v.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Model</Label>
                  <Input value="aura-2" readOnly className="h-8 text-xs font-mono bg-sidebar-accent/20" />
                  <p className="text-[10px] text-muted-foreground">
                    Deepgram Aura-2 — latest TTS model with natural prosody
                  </p>
                </div>

                <div className="pt-1">
                  <a href="https://developers.deepgram.com/docs/tts-models" target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                    Deepgram TTS Docs <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </>
            )}
          </div>
        </details>

        {/* Test Voice Section */}
        <div className="space-y-1.5 border-t border-sidebar-border/20 pt-4">
          <Label className="text-xs text-muted-foreground">Test Text</Label>
          <div className="flex gap-2">
            <Input value={testText} onChange={(e) => setTestText(e.target.value)} className="h-8 text-xs flex-1" placeholder="Type text to synthesize..." />
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
              onClick={handleTestTrigger}
              disabled={(engine === 'kokoro' && !isHealthy) || (engine !== 'kokoro' && !hasCloudKey) || isTestingActive || !testText}
              aria-label={isTestingActive ? 'Synthesizing speech' : 'Test voice synthesis'}
            >
              {isTestingActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              <span>Test Audio</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
