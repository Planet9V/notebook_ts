'use client'

import { useState, useRef } from 'react'
import {
  Mic,
  Square,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'
import { KOKORO_VOICES } from './voices'

export function RoundTripPlayground() {
  const [step, setStep] = useState<'idle' | 'recording' | 'transcribing' | 'synthesizing' | 'complete'>('idle')
  const [transcript, setTranscript] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [voice, setVoice] = useState('af_heart')
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleStart = async () => {
    setStep('recording')
    setError(null)
    setTranscript('')
    setAudioUrl(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

        // Step 2: Transcribe
        setStep('transcribing')
        try {
          const formData = new FormData()
          formData.append('file', blob, 'recording.webm')
          formData.append('language', 'en')
          const { data } = await apiClient.post('/voice/stt/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          const text = data.text || data.transcript || ''
          setTranscript(text)

          if (!text.trim()) {
            setError('No speech detected. Try again.')
            setStep('idle')
            return
          }

          // Step 3: Synthesize
          setStep('synthesizing')
          const ttsResponse = await apiClient.post('/voice/tts/synthesize', {
            input: text.trim(),
            voice,
            speed: 1.0,
          }, { responseType: 'blob' })

          const url = URL.createObjectURL(ttsResponse.data)
          setAudioUrl(url)
          setStep('complete')

          // Auto-play
          setTimeout(() => {
            audioRef.current?.play()
          }, 200)
        } catch (err: any) {
          setError(err?.response?.data?.detail || 'Round-trip failed. Check that both TTS and STT services are running.')
          setStep('idle')
        }
      }

      mediaRecorder.start()
    } catch {
      setError('Microphone access denied.')
      setStep('idle')
    }
  }

  const handleStop = () => {
    if (mediaRecorderRef.current && step === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  const stepLabels = {
    idle: 'Ready',
    recording: '🎙️ Recording...',
    transcribing: '📝 Transcribing...',
    synthesizing: '🔊 Synthesizing...',
    complete: '✅ Complete',
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4 py-6">
        <p className="text-muted-foreground text-sm">
          Speak → Transcribe → Re-Synthesize. Test the full voice pipeline end-to-end.
        </p>

        {/* Voice selector */}
        <Select value={voice} onValueChange={setVoice}>
          <SelectTrigger className="w-48 mx-auto bg-sidebar-accent/10 border-sidebar-border/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KOKORO_VOICES.map(v => (
              <SelectItem key={v.id} value={v.id}>{v.name} ({v.gender})</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Badge
          variant="outline"
          className={cn(
            'text-sm px-4 py-1.5',
            step === 'complete' ? 'border-emerald-500/50 text-emerald-400' :
            step !== 'idle' ? 'border-cyan-500/50 text-cyan-400' :
            'border-sidebar-border/50'
          )}
        >
          {stepLabels[step]}
        </Badge>

        {/* Big action button */}
        <div>
          {step === 'idle' || step === 'complete' ? (
            <Button
              size="lg"
              className="bg-cyan-600 hover:bg-cyan-700 h-14 px-8 text-lg"
              onClick={handleStart}
            >
              <Mic className="h-5 w-5 mr-2" />
              Start Round-Trip
            </Button>
          ) : step === 'recording' ? (
            <Button
              size="lg"
              variant="destructive"
              className="h-14 px-8 text-lg"
              onClick={handleStop}
            >
              <Square className="h-5 w-5 mr-2" />
              Stop Recording
            </Button>
          ) : (
            <Button size="lg" disabled className="h-14 px-8 text-lg">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {transcript && (
        <Card className="bg-sidebar-accent/10 border-sidebar-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detected Speech</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{transcript}</p>
          </CardContent>
        </Card>
      )}

      {audioUrl && (
        <div className="flex items-center justify-center">
          <audio ref={audioRef} src={audioUrl} controls className="w-full max-w-md" />
        </div>
      )}
    </div>
  )
}
