'use client'

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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mic2, Mic, ExternalLink, Zap, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useState, useCallback, useEffect } from 'react'
import { voiceApi } from '@/lib/api/voice'
import type { VoiceConfig, VoiceSettings } from '@/lib/api/voice'
import { VoiceApiKeyField } from './VoiceApiKeyField'
import { STTTestResult } from './STTTestResult'
import { useCredentialsByProvider } from '@/lib/hooks/use-credentials'
import { useServiceHealthTest } from '../hooks/use-voice-testing'

interface STTConfigCardProps {
  config: VoiceConfig | null
  settings: VoiceSettings | null
  onRefresh: () => void
}

type STTEngine = 'whisper' | 'openai' | 'deepgram'
const WHISPER_SERVICE_NAME = 'Faster Whisper STT'

const ENGINES: { id: STTEngine; label: string; desc: string }[] = [
  { id: 'whisper', label: 'Faster Whisper', desc: 'Self-hosted' },
  { id: 'openai', label: 'OpenAI', desc: 'Cloud API' },
  { id: 'deepgram', label: 'Deepgram', desc: 'Cloud API' },
]

const WHISPER_MODELS = [
  { id: 'Systran/faster-whisper-large-v3', name: 'Large V3', desc: 'Highest accuracy (default)' },
  { id: 'Systran/faster-whisper-large-v3-turbo', name: 'Large V3 Turbo', desc: 'Fastest large model (needs HF token)' },
  { id: 'Systran/faster-whisper-medium', name: 'Medium', desc: 'Good accuracy, faster' },
  { id: 'Systran/faster-whisper-small', name: 'Small', desc: 'Fast, lower accuracy' },
  { id: 'Systran/faster-whisper-base', name: 'Base', desc: 'Fastest, lowest accuracy' },
]

const COMPUTE_TYPES = [
  { id: 'int8', name: 'INT8', desc: 'CPU optimized (recommended)' },
  { id: 'float16', name: 'FP16', desc: 'GPU optimized' },
  { id: 'float32', name: 'FP32', desc: 'Highest precision' },
  { id: 'int8_float16', name: 'INT8+FP16', desc: 'Mixed precision' },
]

const DEEPGRAM_MODELS = [
  { id: 'nova-3', name: 'Nova 3', desc: 'Latest, highest accuracy' },
  { id: 'nova-2', name: 'Nova 2', desc: 'Proven, high accuracy' },
  { id: 'nova-2-general', name: 'Nova 2 General', desc: 'General purpose' },
  { id: 'nova-2-meeting', name: 'Nova 2 Meeting', desc: 'Meeting audio' },
  { id: 'nova-2-phonecall', name: 'Nova 2 Phone', desc: 'Phone calls' },
]

const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Spanish' },
  { id: 'fr', name: 'French' },
  { id: 'de', name: 'German' },
  { id: 'it', name: 'Italian' },
  { id: 'pt', name: 'Portuguese' },
  { id: 'ja', name: 'Japanese' },
  { id: 'zh', name: 'Chinese' },
  { id: 'ko', name: 'Korean' },
  { id: 'auto', name: 'Auto-detect' },
]

export function STTConfigCard({ config, settings, onRefresh }: STTConfigCardProps) {
  const [engine, setEngine] = useState<STTEngine>('whisper')
  const [selectedModel, setSelectedModel] = useState('Systran/faster-whisper-large-v3')
  const [computeType, setComputeType] = useState('int8')
  const [isTestingSTT, setIsTestingSTT] = useState(false)
  const [sttTestResult, setSTTTestResult] = useState('')

  // Health check — replaces duplicate handleTestConnection
  const healthTest = useServiceHealthTest(WHISPER_SERVICE_NAME)

  // OpenAI fields
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-transcribe')
  const [openaiLanguage, setOpenaiLanguage] = useState('en')

  // Deepgram fields
  const [dgModel, setDgModel] = useState('nova-3')
  const [dgLanguage, setDgLanguage] = useState('en')
  const [dgSmartFormat, setDgSmartFormat] = useState(true)
  const [dgPunctuate, setDgPunctuate] = useState(true)
  const [dgDiarize, setDgDiarize] = useState(false)

  // Hydrate local state from backend-persisted settings on load
  useEffect(() => {
    if (!settings) return
    if (settings.stt_engine) setEngine(settings.stt_engine as STTEngine)
    if (settings.whisper_model) setSelectedModel(settings.whisper_model)
    if (settings.whisper_compute_type) setComputeType(settings.whisper_compute_type)
    if (settings.openai_stt_model) setOpenaiModel(settings.openai_stt_model)
    if (settings.openai_stt_language) setOpenaiLanguage(settings.openai_stt_language)
    if (settings.deepgram_stt_model) setDgModel(settings.deepgram_stt_model)
    if (settings.deepgram_stt_language) setDgLanguage(settings.deepgram_stt_language)
    if (settings.deepgram_smart_format !== undefined) setDgSmartFormat(settings.deepgram_smart_format)
    if (settings.deepgram_punctuate !== undefined) setDgPunctuate(settings.deepgram_punctuate)
    if (settings.deepgram_diarize !== undefined) setDgDiarize(settings.deepgram_diarize)
  }, [settings])

  const sttService = config?.services.find((s) => s.name === WHISPER_SERVICE_NAME)
  const isHealthy = sttService?.status === 'healthy'

  // Check credential status for the active cloud engine
  const cloudProvider = engine !== 'whisper' ? engine : undefined
  const { data: cloudCreds } = useCredentialsByProvider(cloudProvider ?? '')
  const hasCloudKey = (cloudCreds ?? []).some(c => c.has_api_key)

  const saveSettings = useCallback(async (overrides: Record<string, unknown> = {}) => {
    try {
      const settings = {
        stt_engine: engine,
        whisper_model: selectedModel,
        whisper_compute_type: computeType,
        openai_stt_model: openaiModel,
        openai_stt_language: openaiLanguage,
        deepgram_stt_model: dgModel,
        deepgram_stt_language: dgLanguage,
        deepgram_smart_format: dgSmartFormat,
        deepgram_punctuate: dgPunctuate,
        deepgram_diarize: dgDiarize,
        ...overrides,
      }
      await voiceApi.updateSettings(settings)
      toast.success('STT settings saved')
      onRefresh()
    } catch (error) {
      console.error('Failed to save STT settings:', error)
      toast.error('Failed to save STT settings')
    }
  }, [engine, selectedModel, computeType, openaiModel, openaiLanguage, dgModel, dgLanguage, dgSmartFormat, dgPunctuate, dgDiarize, onRefresh])

  const handleTestSTT = async (engineType: 'openai' | 'deepgram', model: string, language: string) => {
    setIsTestingSTT(true)
    setSTTTestResult('Recording for 3 seconds...')
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.start()
      await new Promise((resolve) => setTimeout(resolve, 3000))
      // Register onstop BEFORE calling stop to prevent race condition
      const stopped = new Promise<void>((resolve) => { mediaRecorder.onstop = () => resolve() })
      mediaRecorder.stop()
      stream.getTracks().forEach(track => track.stop())
      await stopped
      const blob = new Blob(chunks, { type: 'audio/webm' })
      setSTTTestResult('Transcribing...')
      const result = await voiceApi.transcribe(blob, { engine: engineType, model, language })
      setSTTTestResult(result.text || '(no text detected)')
    } catch (error) {
      console.error('STT test failed:', error)
      const errMsg = error instanceof Error ? error.message : 'Unknown error'
      setSTTTestResult(`Error: ${errMsg}`)
      toast.error(`Transcription failed: ${errMsg}`)
      // Clean up media stream on error
      stream?.getTracks().forEach(t => t.stop())
    } finally {
      setIsTestingSTT(false)
    }
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
              <Mic2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Speech-to-Text</CardTitle>
              <CardDescription className="text-xs">
                Multi-engine transcription
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            role="status"
            aria-live="polite"
            className={cn(
              'text-[11px] font-mono',
              engine === 'whisper' && isHealthy
                ? 'border-emerald-500/40 text-emerald-400'
                : engine !== 'whisper' && hasCloudKey
                  ? 'border-emerald-500/40 text-emerald-400'
                  : engine !== 'whisper'
                    ? 'border-amber-500/40 text-amber-400'
                    : 'border-red-500/40 text-red-400'
            )}
          >
            {engine === 'whisper'
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
          <Label className="text-xs text-muted-foreground">STT Engine</Label>
          <div className="flex gap-1.5" role="radiogroup" aria-label="STT Engine">
            {ENGINES.map(e => (
              <button
                key={e.id}
                role="radio"
                aria-checked={engine === e.id}
                onClick={() => { setEngine(e.id); saveSettings({ stt_engine: e.id }) }}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded-md border text-xs transition-all text-center',
                  engine === e.id
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-sidebar-border/30 bg-sidebar-accent/5 text-muted-foreground hover:border-sidebar-border/50'
                )}
              >
                <div className="font-medium">{e.label}</div>
                <div className="text-[9px] text-muted-foreground">{e.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Faster Whisper ── */}
        {engine === 'whisper' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Service URL</Label>
              <Input value={config?.whisper_stt_url || 'http://whisper-stt:8000'} readOnly className="h-8 text-xs font-mono bg-sidebar-accent/20" />
              <p className="text-[10px] text-muted-foreground">
                Set via <code className="bg-sidebar-accent/30 px-1 rounded">WHISPER_STT_URL</code> env var
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WHISPER_MODELS.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex flex-col">
                          <span className="text-xs">{m.name}</span>
                          <span className="text-[10px] text-muted-foreground">{m.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Set via <code className="bg-sidebar-accent/30 px-1 rounded">WHISPER__MODEL</code>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Compute Type</Label>
                <Select value={computeType} onValueChange={setComputeType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPUTE_TYPES.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex flex-col">
                          <span className="text-xs">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground">{c.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Set via <code className="bg-sidebar-accent/30 px-1 rounded">WHISPER__COMPUTE_TYPE</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={healthTest.test} disabled={healthTest.testing}>
                <Zap className={cn('h-3 w-3 mr-1', healthTest.testing && 'animate-pulse')} />
                {healthTest.testing ? 'Testing...' : 'Test Connection'}
              </Button>
              {healthTest.result && (
                <span className={cn('text-[11px] font-mono', healthTest.result === 'success' ? 'text-emerald-400' : 'text-red-400')}>
                  {healthTest.result === 'success' ? '✓ Connected' : '✗ Connection failed'}
                </span>
              )}
              <a href="https://github.com/fedirz/faster-whisper-server" target="_blank" rel="noopener noreferrer" className="ml-auto text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                Docs <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </>
        )}

        {/* ── OpenAI Whisper API ── */}
        {engine === 'openai' && (
          <>
            <VoiceApiKeyField
              provider="openai"
              providerLabel="OpenAI"
              modalities={['text_to_speech', 'speech_to_text', 'language']}
              docsUrl="https://platform.openai.com/docs/guides/speech-to-text"
              docsLabel="OpenAI STT Docs"
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Model</Label>
                <Select value={openaiModel} onValueChange={setOpenaiModel}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-transcribe">
                      <div className="flex flex-col">
                        <span className="text-xs">gpt-4o-transcribe</span>
                        <span className="text-[10px] text-muted-foreground">Highest accuracy</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="gpt-4o-mini-transcribe">
                      <div className="flex flex-col">
                        <span className="text-xs">gpt-4o-mini-transcribe</span>
                        <span className="text-[10px] text-muted-foreground">Cost-efficient</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="whisper-1">
                      <div className="flex flex-col">
                        <span className="text-xs">whisper-1</span>
                        <span className="text-[10px] text-muted-foreground">Legacy model</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Language</Label>
                <Select value={openaiLanguage} onValueChange={setOpenaiLanguage}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Test Transcription */}
            <div className="space-y-2 pt-3 border-t border-sidebar-border/20">
              <Button
                onClick={() => handleTestSTT('openai', openaiModel, openaiLanguage)}
                disabled={isTestingSTT || !hasCloudKey}
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1.5"
              >
                {isTestingSTT ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Testing...</>
                ) : (
                  <><Mic className="h-3 w-3" /> Test Transcription (3s)</>
                )}
              </Button>
              <STTTestResult result={sttTestResult} />
            </div>

            <div className="pt-1">
              <a href="https://platform.openai.com/docs/guides/speech-to-text" target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                OpenAI STT Docs <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </>
        )}

        {/* ── Deepgram ── */}
        {engine === 'deepgram' && (
          <>
            <VoiceApiKeyField
              provider="deepgram"
              providerLabel="Deepgram"
              modalities={['text_to_speech', 'speech_to_text']}
              docsUrl="https://developers.deepgram.com/docs/stt-models"
              docsLabel="Deepgram STT Docs"
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Model</Label>
                <Select value={dgModel} onValueChange={setDgModel}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEEPGRAM_MODELS.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex flex-col">
                          <span className="text-xs">{m.name}</span>
                          <span className="text-[10px] text-muted-foreground">{m.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Language</Label>
                <Select value={dgLanguage} onValueChange={setDgLanguage}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-2.5">
              <Label className="text-xs text-muted-foreground">Features</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={dgSmartFormat} onCheckedChange={(v) => setDgSmartFormat(!!v)} />
                  Smart Format
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={dgPunctuate} onCheckedChange={(v) => setDgPunctuate(!!v)} />
                  Punctuate
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={dgDiarize} onCheckedChange={(v) => setDgDiarize(!!v)} />
                  Diarize
                </label>
              </div>
            </div>

            {/* Test Transcription */}
            <div className="space-y-2 pt-3 border-t border-sidebar-border/20">
              <Button
                onClick={() => handleTestSTT('deepgram', dgModel, dgLanguage)}
                disabled={isTestingSTT || !hasCloudKey}
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1.5"
              >
                {isTestingSTT ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Testing...</>
                ) : (
                  <><Mic className="h-3 w-3" /> Test Transcription (3s)</>
                )}
              </Button>
              <STTTestResult result={sttTestResult} />
            </div>

            <div className="pt-1">
              <a href="https://developers.deepgram.com/docs" target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                Deepgram Docs <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
