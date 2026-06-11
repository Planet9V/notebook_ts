'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Mic, Square, Play, Upload, Settings, RefreshCw, AudioLines } from 'lucide-react'
import { voiceApi } from '@/lib/api/voice'
import { toast } from 'sonner'

function Switch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-cyan-500' : 'bg-slate-800'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export function VoiceRecorderCard({ onRefresh }: { onRefresh: () => void }) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [speakerName, setSpeakerName] = useState('')
  const [provider, setProvider] = useState('kokoro')
  const [isUploading, setIsUploading] = useState(false)
  
  // Quality options
  const [gainValue, setGainValue] = useState([1.0])
  const [echoCancellation, setEchoCancellation] = useState(true)
  const [noiseSuppression, setNoiseSuppression] = useState(true)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [])

  // Real-time canvas visualizer
  const startVisualizer = (stream: MediaStream) => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return

    const audioContext = new AudioContextClass()
    const analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(stream)
    
    // Apply gain control node
    const gainNode = audioContext.createGain()
    gainNode.gain.value = gainValue[0]
    
    source.connect(gainNode)
    gainNode.connect(analyser)
    
    analyser.fftSize = 256
    analyserRef.current = analyser
    audioCtxRef.current = audioContext
    sourceRef.current = source
    
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    const draw = () => {
      if (!canvasRef.current) return
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      const width = canvas.width
      const height = canvas.height
      analyser.getByteFrequencyData(dataArray)
      
      ctx.clearRect(0, 0, width, height)
      
      // Render glassmorphic wave peaks
      const barWidth = (width / bufferLength) * 1.5
      let barHeight
      let x = 0
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2
        
        const gradient = ctx.createLinearGradient(0, height, 0, 0)
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.1)')
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.7)')
        
        ctx.fillStyle = gradient
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight)
        
        x += barWidth
      }
      
      animationRef.current = requestAnimationFrame(draw)
    }
    
    draw()
  }

  const stopVisualizer = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
    }
    analyserRef.current = null
    audioCtxRef.current = null
  }

  const startRecording = async () => {
    audioChunksRef.current = []
    try {
      const constraints = {
        audio: {
          echoCancellation,
          noiseSuppression,
          autoGainControl: true
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      startVisualizer(stream)
      
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stopVisualizer()
        
        // Stop all tracks in stream
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      setAudioUrl(null)
      setAudioBlob(null)
    } catch (err) {
      console.error(err)
      toast.error('Failed to access microphone. Check browser permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleUpload = async () => {
    if (!audioBlob || !speakerName) return
    setIsUploading(true)
    try {
      await voiceApi.uploadCustomVoice(audioBlob, speakerName, provider)
      toast.success(`Custom voice "${speakerName}" registered successfully!`)
      // Reset
      setAudioBlob(null)
      setAudioUrl(null)
      setSpeakerName('')
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error uploading voice')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="relative overflow-hidden bg-slate-900/40 border-white/10 rounded-2xl shadow-xl backdrop-blur-md">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500" />
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
            <Mic className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <CardTitle className="text-base text-white">Voice Recorder & Calibration</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Record and clone custom voice profiles</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Custom Speaker Name</Label>
            <Input 
              placeholder="e.g. Jimmy McKinney" 
              value={speakerName} 
              onChange={e => setSpeakerName(e.target.value)} 
              className="bg-slate-950/60 border-white/10 text-white h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Target Clone Engine</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="bg-slate-950/60 border-white/10 h-9 text-xs">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-white/10">
                <SelectItem value="kokoro" className="text-xs">Kokoro (Local)</SelectItem>
                <SelectItem value="elevenlabs" className="text-xs">ElevenLabs (Cloned)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Audio Visualizer Canvas */}
        <div className="relative h-24 bg-slate-950/80 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center">
          <canvas ref={canvasRef} width={400} height={96} className="w-full h-full" />
          {!isRecording && !audioUrl && (
            <span className="absolute text-slate-500 font-mono text-[10px] uppercase">Microphone Idle</span>
          )}
          {isRecording && (
            <span className="absolute top-2 right-2 text-red-500 animate-pulse font-bold text-[9px] border border-red-500/20 px-1.5 py-0.5 rounded bg-red-500/10">
              REC
            </span>
          )}
        </div>

        {/* Calibration Controls */}
        <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-[10px] text-cyan-400 font-bold border-b border-white/5 pb-1 font-mono">
            <span>🎛️ AUDIO CALIBRATION CONTROLS</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-400">Echo Cancellation</Label>
              <Switch checked={echoCancellation} onCheckedChange={setEchoCancellation} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-400">Noise Suppression</Label>
              <Switch checked={noiseSuppression} onCheckedChange={setNoiseSuppression} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-slate-400 text-xs">
              <Label className="text-xs">Gain Amplification</Label>
              <span className="font-mono text-xs">{gainValue[0].toFixed(1)}x</span>
            </div>
            <Slider 
              min={0.5} 
              max={3.0} 
              step={0.1} 
              value={gainValue} 
              onValueChange={setGainValue}
              className="py-2"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2 pt-1">
          {!isRecording ? (
            <Button onClick={startRecording} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white gap-2 h-9 text-xs">
              <Mic className="h-4 w-4" /> Start Recording
            </Button>
          ) : (
            <Button onClick={stopRecording} className="flex-1 bg-red-600 hover:bg-red-500 text-white gap-2 h-9 text-xs">
              <Square className="h-4 w-4" /> Stop Recording
            </Button>
          )}

          {audioUrl && (
            <Button 
              onClick={() => {
                const audio = new Audio(audioUrl)
                audio.play()
              }} 
              variant="outline" 
              className="border-white/10 text-slate-200 h-9 text-xs"
            >
              <Play className="h-4 w-4" /> Playback
            </Button>
          )}

          <Button 
            disabled={!audioBlob || !speakerName || isUploading} 
            onClick={handleUpload} 
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 h-9 text-xs"
          >
            {isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Save Cloned Voice
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
