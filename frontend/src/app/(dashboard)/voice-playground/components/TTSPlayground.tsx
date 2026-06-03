'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Play,
  Pause,
  Download,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'
import { Slider } from '@/components/ui/slider'
import { KOKORO_VOICES } from './voices'

export function TTSPlayground() {
  const [text, setText] = useState('Welcome to the Voice AI playground. This is a sample text to test text-to-speech synthesis with different voices and speeds.')
  const [selectedVoice, setSelectedVoice] = useState('af_heart')
  const [speed, setSpeed] = useState(1.0)
  const [synthesizing, setSynthesizing] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)

  const handleSynthesize = async () => {
    if (!text.trim()) return
    setSynthesizing(true)
    setError(null)
    setAudioUrl(null)

    try {
      const response = await apiClient.post('/voice/tts/synthesize', {
        input: text.trim(),
        voice: selectedVoice,
        speed,
      }, { responseType: 'blob' })

      const url = URL.createObjectURL(response.data)
      setAudioUrl(url)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'TTS synthesis failed. Check that Kokoro TTS is running.')
    } finally {
      setSynthesizing(false)
    }
  }

  const handlePlay = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
      startVisualization()
    }
  }

  const handleDownload = () => {
    if (!audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `tts_${selectedVoice}_${Date.now()}.wav`
    a.click()
  }

  // Audio visualization
  const startVisualization = useCallback(() => {
    if (!audioRef.current || !canvasRef.current) return

    const audioContext = new AudioContext()
    const source = audioContext.createMediaElementSource(audioRef.current)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyser.connect(audioContext.destination)
    analyserRef.current = analyser

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8

        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height)
        gradient.addColorStop(0, '#06b6d4')  // cyan-500
        gradient.addColorStop(1, '#8b5cf6')  // violet-500

        ctx.fillStyle = gradient
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight)
        x += barWidth + 1
      }
    }
    draw()
  }, [])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const selectedVoiceInfo = KOKORO_VOICES.find(v => v.id === selectedVoice)

  return (
    <div className="space-y-6">
      {/* Text Input */}
      <div className="space-y-2">
        <Label htmlFor="tts-input" className="text-sm font-medium">Input Text</Label>
        <Textarea
          id="tts-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to synthesize..."
          className="min-h-[120px] resize-y bg-sidebar-accent/10 border-sidebar-border/40"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{text.length} characters</span>
          <span>~{Math.ceil(text.split(/\s+/).length / 150)} min at normal speed</span>
        </div>
      </div>

      {/* Voice Selection Grid */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Voice Selection</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {KOKORO_VOICES.map(voice => (
            <button
              key={voice.id}
              onClick={() => setSelectedVoice(voice.id)}
              className={cn(
                'p-2.5 rounded-lg border text-left transition-all duration-200',
                'hover:border-cyan-500/40 hover:bg-cyan-500/5',
                selectedVoice === voice.id
                  ? 'border-cyan-500/60 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                  : 'border-sidebar-border/30 bg-sidebar-accent/5'
              )}
            >
              <div className="text-xs font-semibold truncate">{voice.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{voice.gender} · {voice.language}</div>
            </button>
          ))}
        </div>
        {selectedVoiceInfo && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{selectedVoiceInfo.name}</span> — {selectedVoiceInfo.description}
          </p>
        )}
      </div>

      {/* Speed Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Speed</Label>
          <Badge variant="outline" className="text-xs font-mono">{speed.toFixed(1)}x</Badge>
        </div>
        <Slider
          value={[speed]}
          onValueChange={([v]) => setSpeed(v)}
          min={0.5}
          max={2.0}
          step={0.1}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0.5x Slow</span>
          <span>1.0x Normal</span>
          <span>2.0x Fast</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSynthesize}
          disabled={synthesizing || !text.trim()}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          {synthesizing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {synthesizing ? 'Synthesizing...' : 'Synthesize'}
        </Button>

        {audioUrl && (
          <>
            <Button
              variant="outline"
              onClick={handlePlay}
            >
              {playing ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {playing ? 'Pause' : 'Play'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Audio Player + Visualization */}
      {audioUrl && (
        <div className="space-y-3">
          <canvas
            ref={canvasRef}
            width={800}
            height={120}
            className="w-full h-[120px] rounded-lg bg-black/30 border border-sidebar-border/20"
          />
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        </div>
      )}
    </div>
  )
}
