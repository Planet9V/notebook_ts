'use client'

import { useState, useRef } from 'react'
import {
  Mic,
  Square,
  Loader2,
  AudioWaveform,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'

export function STTPlayground() {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState('en')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const handleStartRecording = async () => {
    setError(null)
    setTranscript('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorder.start()
      setRecording(true)
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access in your browser settings.')
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const handleTranscribe = async () => {
    if (!audioBlob) return
    setTranscribing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
      formData.append('language', language)

      const { data } = await apiClient.post('/voice/stt/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setTranscript(data.text || data.transcript || '')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Transcription failed. Check that Whisper STT is running.')
    } finally {
      setTranscribing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Language</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-48 bg-sidebar-accent/10 border-sidebar-border/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="fr">French</SelectItem>
            <SelectItem value="de">German</SelectItem>
            <SelectItem value="it">Italian</SelectItem>
            <SelectItem value="pt">Portuguese</SelectItem>
            <SelectItem value="ja">Japanese</SelectItem>
            <SelectItem value="zh">Chinese</SelectItem>
            <SelectItem value="ko">Korean</SelectItem>
            <SelectItem value="auto">Auto-detect</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recording Controls */}
      <div className="flex flex-col items-center gap-6 py-8">
        <div
          className={cn(
            'h-32 w-32 rounded-full flex items-center justify-center transition-all duration-300',
            'border-2 cursor-pointer',
            recording
              ? 'border-red-500 bg-red-500/10 animate-pulse shadow-lg shadow-red-500/20'
              : 'border-sidebar-border/40 bg-sidebar-accent/10 hover:border-cyan-500/40 hover:bg-cyan-500/5'
          )}
          onClick={recording ? handleStopRecording : handleStartRecording}
        >
          {recording ? (
            <Square className="h-10 w-10 text-red-400" />
          ) : (
            <Mic className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {recording ? 'Recording... Click to stop' : 'Click the microphone to start recording'}
        </p>
      </div>

      {/* Transcribe Button */}
      {audioBlob && !recording && (
        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={handleTranscribe}
            disabled={transcribing}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {transcribing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AudioWaveform className="h-4 w-4 mr-2" />
            )}
            {transcribing ? 'Transcribing...' : 'Transcribe'}
          </Button>
          <Button
            variant="outline"
            onClick={() => { setAudioBlob(null); setTranscript('') }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Transcript Output */}
      {transcript && (
        <Card className="bg-sidebar-accent/10 border-sidebar-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
