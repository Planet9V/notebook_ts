'use client'

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import {
  Mic,
  MicOff,
  X,
  Volume2,
  Settings2,
  Loader2,
  Radio,
  AudioLines,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  History,
  Download,
  BookOpen,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { voiceApi, VoiceConfig, KokoroVoice } from '@/lib/api/voice'
import { AvatarPanel } from '@/components/voice/AvatarPanel'
import { useVoiceSessions } from '@/lib/hooks/use-voice-sessions'
import { apiClient } from '@/lib/api/client'
import { useVoiceProcessor, VoiceMessage } from '@/components/voice/useVoiceProcessor'
import { LiveKitRoom, RoomAudioRenderer, useRoomContext, useLocalParticipant, useRemoteParticipants, useTranscriptions } from '@livekit/components-react'

// ── Types ───────────────────────────────────────────────────────────

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface VoiceChatContext {
  /** Notebook ID for RAG-scoped queries */
  notebookId?: string
  /** Page type for context-adaptive behavior */
  pageType?: 'notebook' | 'search' | 'general'
  /** Human-readable context label */
  contextLabel?: string
  /** Optional source IDs for scoped RAG */
  sourceIds?: string[]
}

interface VoiceChatPanelProps {
  /** Optional context for page-aware behavior */
  context?: VoiceChatContext
}

interface TranscriptEntry {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
}

// ── LiveKit Controller Component ─────────────────────────────────────

interface LiveKitVoiceControllerProps {
  isMuted: boolean
  sessionId: string | null
  avatarState: 'idle' | 'listening' | 'thinking' | 'speaking'
  setAvatarState: React.Dispatch<React.SetStateAction<'idle' | 'listening' | 'thinking' | 'speaking'>>
  setTranscript: React.Dispatch<React.SetStateAction<TranscriptEntry[]>>
  setAudioLevel: React.Dispatch<React.SetStateAction<number>>
  setConnectionState: React.Dispatch<React.SetStateAction<ConnectionState>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
}

function LiveKitVoiceController({
  isMuted,
  setAvatarState,
  setTranscript,
  setAudioLevel,
  setConnectionState,
}: LiveKitVoiceControllerProps) {
  const room = useRoomContext()
  const { localParticipant } = useLocalParticipant()
  const remoteParticipants = useRemoteParticipants()
  const segments = useTranscriptions()

  // 1. Sync connection state
  useEffect(() => {
    if (room) {
      const handleStateChange = () => {
        if (room.state === 'connected') {
          setConnectionState('connected')
        } else if (room.state === 'connecting' || room.state === 'reconnecting') {
          setConnectionState('connecting')
        } else if (room.state === 'disconnected') {
          setConnectionState('disconnected')
        }
      }
      room.on('connectionStateChanged', handleStateChange)
      handleStateChange()
      return () => {
        room.off('connectionStateChanged', handleStateChange)
      }
    }
  }, [room, setConnectionState])

  // 2. Handle Mute state
  useEffect(() => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isMuted).catch((err) => {
        console.error("Failed to set mic enabled:", err)
      })
    }
  }, [isMuted, localParticipant])

  // 3. Find the voice agent remote participant
  const agentParticipant = useMemo(() => {
    return remoteParticipants.find(
      (p) =>
        p.identity.toLowerCase().includes('agent') ||
        p.identity.toLowerCase().includes('assistant') ||
        p.identity.toLowerCase().includes('voice')
    ) || remoteParticipants[0]
  }, [remoteParticipants])

  // 4. Update avatar state based on speaker activity
  const isUserSpeaking = localParticipant?.isSpeaking || false
  const isAgentSpeaking = agentParticipant?.isSpeaking || false

  useEffect(() => {
    if (isAgentSpeaking) {
      setAvatarState('speaking')
    } else if (isUserSpeaking) {
      setAvatarState('listening')
    } else {
      // Transition from listening to thinking when user stops speaking
      setAvatarState((prev) => {
        if (prev === 'listening') {
          return 'thinking'
        }
        return prev === 'thinking' ? 'thinking' : 'idle'
      })
    }
  }, [isAgentSpeaking, isUserSpeaking, setAvatarState])

  // 5. Update audio level for the avatar visualizer
  useEffect(() => {
    let animFrame: number
    const updateLevels = () => {
      if (isAgentSpeaking && agentParticipant) {
        setAudioLevel(agentParticipant.audioLevel)
      } else if (isUserSpeaking && localParticipant) {
        setAudioLevel(localParticipant.audioLevel)
      } else {
        setAudioLevel(0)
      }
      animFrame = requestAnimationFrame(updateLevels)
    }
    updateLevels()
    return () => cancelAnimationFrame(animFrame)
  }, [isAgentSpeaking, isUserSpeaking, agentParticipant, localParticipant, setAudioLevel])

  // 6. Push real-time transcription segments into the transcript
  useEffect(() => {
    if (segments.length === 0) return

    setTranscript((prev) => {
      const updated = [...prev]
      segments.forEach((seg) => {
        const id = seg.streamInfo?.id || `seg-${Date.now()}`
        const isLocal = seg.participantInfo?.identity === localParticipant?.identity
        const role = isLocal ? 'user' : ('assistant' as const)
        
        // Find existing transcription entry by id
        const existingIdx = updated.findIndex((item) => item.id === id)

        const entry: TranscriptEntry = {
          id,
          role,
          text: seg.text,
          timestamp: new Date(seg.streamInfo?.timestamp || Date.now()),
        }

        if (existingIdx !== -1) {
          // Update the text
          updated[existingIdx] = entry
        } else {
          // Append new segment
          updated.push(entry)
        }
      })
      return updated
    })
  }, [segments, localParticipant, setTranscript])

  return null
}

// ── Component ───────────────────────────────────────────────────────

export function VoiceChatPanel({ context }: VoiceChatPanelProps = {}) {
  // State
  const [isOpen, setIsOpen] = useState(!!context)
  const [isExpanded, setIsExpanded] = useState(true)
  const [showAvatar, setShowAvatar] = useState(true) // Default to true for premium experience
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected')
  const [isMuted, setIsMuted] = useState(false)
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig | null>(null)
  const [selectedVoice, setSelectedVoice] = useState('af_heart')
  const [voices, setVoices] = useState<KokoroVoice[]>([])
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [isListening, setIsListening] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // LiveKit WebRTC states
  const [token, setToken] = useState<string | null>(null)
  const [wsUrl, setWsUrl] = useState<string | null>(null)
  const [avatarState, setAvatarState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')

  // Voice session persistence
  const { sessions, createSession, addMessage } = useVoiceSessions(context?.notebookId)
  const [showHistory, setShowHistory] = useState(false)
  const [useNotebookContext, setUseNotebookContext] = useState(true)
  const [savingNote, setSavingNote] = useState(false)

  // Voice processing pipeline — the fallback CORE that makes chat work without WebRTC
  const voiceProcessor = useVoiceProcessor({
    voice: selectedVoice,
    notebookId: useNotebookContext ? context?.notebookId : undefined,
    onMessage: (msg: VoiceMessage) => {
      setTranscript((prev) => [
        ...prev,
        {
          id: msg.id,
          role: msg.role,
          text: msg.text,
          timestamp: msg.timestamp,
        },
      ])
      if (activeSessionId) {
        addMessage(activeSessionId, msg.role === 'user' ? 'human' : 'ai', msg.text)
      }
    },
    onError: (errMsg: string) => {
      setError(errMsg)
    },
  })

  // Refs
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  // ── Load Config ─────────────────────────────────────────────────
  useEffect(() => {
    async function loadConfig() {
      try {
        const [config, voiceList] = await Promise.all([
          voiceApi.getConfig(),
          voiceApi.listVoices(),
        ])
        setVoiceConfig(config)
        setVoices(voiceList.voices || [])
      } catch {
        // Voice services may not be running — that's OK
      }
    }
    loadConfig()
  }, [])

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  // ── Audio Level Visualization (Fallback) ─────────────────────────
  const startAudioVisualization = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    const source = ctx.createMediaStreamSource(stream)
    source.connect(analyser)
    audioContextRef.current = ctx
    analyserRef.current = analyser

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    function tick() {
      analyser.getByteFrequencyData(dataArray)
      const avg =
        dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length
      setAudioLevel(Math.min(avg / 128, 1))
      animFrameRef.current = requestAnimationFrame(tick)
    }
    tick()
  }, [])

  const stopAudioVisualization = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    audioContextRef.current?.close()
    audioContextRef.current = null
    analyserRef.current = null
    setAudioLevel(0)
  }, [])

  // ── Connect / Disconnect ────────────────────────────────────────
  const connect = useCallback(async () => {
    setConnectionState('connecting')
    setError(null)

    try {
      // Create a voice session for persistence
      const session = await createSession({
        notebook_id: context?.notebookId,
        title: context?.contextLabel
          ? `Voice: ${context.contextLabel}`
          : 'Voice Conversation',
        tts_voice: selectedVoice,
      })
      if (session) {
        setActiveSessionId(session.id)
      }

      // Get LiveKit token
      const tokenData = await voiceApi.getToken(
        'voice-chat',
        `user-${Date.now()}`,
        undefined,
        useNotebookContext ? context?.notebookId : undefined,
        session?.id || undefined
      )

      setToken(tokenData.token)
      setWsUrl(tokenData.ws_url)
      setConnectionState('connecting')
      setIsListening(true)

      // Add system message
      setTranscript((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          text: `Connecting to interactive voice assistant...`,
          timestamp: new Date(),
        },
      ])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to connect'
      setError(message)
      setConnectionState('error')
      setToken(null)
      setWsUrl(null)
      stopAudioVisualization()
    }
  }, [createSession, context, selectedVoice, useNotebookContext, stopAudioVisualization])

  const disconnect = useCallback(() => {
    // Stop microphone stream (used in fallback)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    setToken(null)
    setWsUrl(null)
    stopAudioVisualization()
    setConnectionState('disconnected')
    setIsListening(false)
    setActiveSessionId(null)
    setAvatarState('idle')
    setAudioLevel(0)
  }, [stopAudioVisualization])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // ── Toggle Mute ─────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled
      })
    }
    setIsMuted((m) => !m)
  }, [])

  // ── Floating Action Button ──────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'h-14 w-14 rounded-full',
          'bg-gradient-to-br from-cyan-500 to-blue-600',
          'text-white shadow-lg shadow-cyan-500/25',
          'flex items-center justify-center',
          'hover:scale-110 hover:shadow-xl hover:shadow-cyan-500/40',
          'active:scale-95',
          'transition-all duration-300 ease-out',
          'group'
        )}
        aria-label="Open voice chat"
      >
        <Mic className="h-6 w-6 group-hover:scale-110 transition-transform" />
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" />
      </button>
    )
  }

  // ── Panel Content Wrapper ────────────────────────────────────────
  const panelContent = (
    <>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3',
          'border-b border-sidebar-border/40',
          'bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent',
          'cursor-pointer select-none'
        )}
        onClick={() => setIsExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Radio
              className={cn(
                'h-5 w-5',
                connectionState === 'connected'
                  ? 'text-cyan-400'
                  : 'text-muted-foreground'
              )}
            />
            {connectionState === 'connected' && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          <span className="font-semibold text-sm">
            {context?.contextLabel || (context?.pageType === 'notebook' ? '📓 Notebook Voice' : 'Voice Chat')}
          </span>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0 h-4 font-mono',
              connectionState === 'connected'
                ? 'border-emerald-500/50 text-emerald-400'
                : connectionState === 'connecting'
                  ? 'border-amber-500/50 text-amber-400'
                  : connectionState === 'error'
                    ? 'border-red-500/50 text-red-400'
                    : 'border-sidebar-border text-muted-foreground'
            )}
          >
            {connectionState}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Voice settings"
            onClick={(e) => {
              e.stopPropagation()
              setShowSettings((s) => !s)
            }}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              setShowHistory((h) => !h)
            }}
            aria-label="Conversation history"
          >
            <History className="h-3.5 w-3.5" />
          </Button>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-red-400"
            aria-label="Close voice chat"
            onClick={(e) => {
              e.stopPropagation()
              disconnect()
              setIsOpen(false)
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* ── Settings Panel ──────────────────────────────────── */}
          {showSettings && (
            <div className="px-4 py-3 border-b border-sidebar-border/30 space-y-2 bg-sidebar-accent/20">
              <label className="text-xs text-muted-foreground font-medium">
                TTS Voice
              </label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger className="h-8 text-xs bg-background/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voices.length > 0
                    ? voices.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))
                    : (voiceConfig?.available_voices || []).map((v) => (
                        <SelectItem key={v} value={v}>
                          {v.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>

              {/* Service Status */}
              <div className="space-y-1 pt-1">
                <label className="text-xs text-muted-foreground font-medium">
                  Services
                </label>
                {voiceConfig?.services.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="text-muted-foreground">{s.name}</span>
                    <span
                      className={cn(
                        'font-mono',
                        s.status === 'healthy'
                          ? 'text-emerald-400'
                          : s.status === 'unhealthy'
                            ? 'text-amber-400'
                            : 'text-red-400'
                      )}
                    >
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Context Banner ─────────────────────────────────── */}
          {context?.notebookId && (
            <div className="px-4 py-2 border-b border-sidebar-border/20 bg-violet-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-violet-400 font-medium">📓 RAG Active</span>
                  <span className="text-muted-foreground">
                    {context.contextLabel || 'Notebook Context'}
                  </span>
                </div>
                <button
                  onClick={() => setUseNotebookContext(!useNotebookContext)}
                  className={cn(
                    'flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full transition-colors',
                    useNotebookContext
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'bg-sidebar-accent/20 text-muted-foreground'
                  )}
                >
                  <BookOpen className="h-2.5 w-2.5" />
                  {useNotebookContext ? 'Context ON' : 'Context OFF'}
                </button>
              </div>
            </div>
          )}

          {/* ── Session History Dropdown ─────────────────────── */}
          {showHistory && sessions.length > 0 && (
            <div className="px-4 py-2 border-b border-sidebar-border/20 bg-sidebar-accent/10 space-y-1.5 max-h-[120px] overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Previous Sessions</span>
                <span className="text-[10px] text-muted-foreground">{sessions.length}</span>
              </div>
              {sessions.map((s) => (
                <button
                  key={s.id}
                  className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-sidebar-accent/30 transition-colors flex items-center justify-between group"
                  onClick={async () => {
                    // Load session messages into transcript
                    try {
                      const { data } = await apiClient.get(`/voice/sessions/${s.id}`)
                      const messages = data.messages || []
                      setTranscript(
                        messages.map((m: { role: string; content: string; timestamp?: string }, i: number) => ({
                          id: `hist-${i}`,
                          role: m.role === 'human' ? 'user' as const : 'assistant' as const,
                          text: m.content,
                          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(s.created),
                        }))
                      )
                      setActiveSessionId(s.id)
                    } catch {
                      setError('Failed to load session history')
                    }
                    setShowHistory(false)
                  }}
                >
                  <span className="truncate text-foreground/80">{s.title}</span>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-2">
                    {new Date(s.created).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ── Avatar Display ─────────────────────────────────── */}
          {showAvatar && connectionState === 'connected' && (
            <div className="flex justify-center py-4 border-b border-sidebar-border/20">
              <AvatarPanel
                audioLevel={audioLevel}
                state={token ? avatarState : (isListening ? 'listening' : 'idle')}
                size="md"
                visible={true}
              />
            </div>
          )}

          {/* ── Transcript Area ─────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[360px]">
            {transcript.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
                <div
                  className={cn(
                    'h-16 w-16 rounded-full flex items-center justify-center',
                    'bg-gradient-to-br from-cyan-500/20 to-blue-500/20',
                    'border border-cyan-500/20'
                  )}
                >
                  <MessageSquare className="h-7 w-7 text-cyan-400/60" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Press the mic button to start a voice conversation
                </p>
                <p className="text-xs text-muted-foreground/60 text-center">
                  Powered by LiveKit + Kokoro TTS + Faster Whisper
                </p>
              </div>
            ) : (
              transcript.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'flex gap-2',
                    entry.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                      entry.role === 'user'
                        ? 'bg-cyan-500/20 text-cyan-50 border border-cyan-500/30'
                        : 'bg-sidebar-accent/40 text-foreground border border-sidebar-border/30'
                    )}
                  >
                    <p className="leading-relaxed">{entry.text}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                      {entry.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* ── Error Banner ────────────────────────────────────── */}
          {error && (
            <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* ── Transcript Actions ──────────────────────────────── */}
          {transcript.length > 0 && (
            <div className="px-4 py-1.5 flex justify-end gap-1">
              {/* Save as Note — only when notebook context is active */}
              {context?.notebookId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-muted-foreground hover:text-violet-300 gap-1"
                  disabled={savingNote}
                  onClick={async () => {
                    if (!context.notebookId || !activeSessionId) return
                    setSavingNote(true)
                    try {
                      const md = transcript
                        .map((e) => `**${e.role === 'user' ? 'You' : 'Assistant'}** (${e.timestamp.toLocaleTimeString()})\n${e.text}`)
                        .join('\n\n---\n\n')
                      await apiClient.post(
                        `/voice/sessions/${activeSessionId}/save-as-note`,
                        {
                          notebook_id: context.notebookId,
                          title: `🎙️ Voice Transcript — ${new Date().toLocaleDateString()}`,
                          content: `# Voice Transcript\n\n${md}`,
                        }
                      )
                    } catch (err) {
                      console.error('Failed to save as note:', err)
                    } finally {
                      setSavingNote(false)
                    }
                  }}
                >
                  {savingNote ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <FileText className="h-3 w-3" />
                  )}
                  Save as Note
                </Button>
              )}
              {/* Export as markdown download */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                onClick={() => {
                  const md = transcript
                    .map((e) => `**${e.role === 'user' ? 'You' : 'Assistant'}** (${e.timestamp.toLocaleTimeString()})\n${e.text}`)
                    .join('\n\n---\n\n')
                  const blob = new Blob([`# Voice Transcript\n\n${md}`], { type: 'text/markdown' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `voice-transcript-${new Date().toISOString().slice(0, 10)}.md`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <Download className="h-3 w-3" />
                Export
              </Button>
            </div>
          )}

          {/* ── Audio Level Visualizer ──────────────────────────── */}
          {connectionState === 'connected' && (
            <div className="px-4 pb-1">
              <div className="h-1.5 w-full rounded-full bg-sidebar-accent/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-75"
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Controls ───────────────────────────────────────── */}
          <div className="px-4 py-3 border-t border-sidebar-border/30 flex items-center justify-center gap-3">
            {connectionState === 'disconnected' ||
            connectionState === 'error' ? (
              <Button
                onClick={connect}
                aria-label="Connect voice assistant"
                className={cn(
                  'h-12 w-12 rounded-full p-0',
                  'bg-gradient-to-br from-cyan-500 to-blue-600',
                  'hover:from-cyan-400 hover:to-blue-500',
                  'shadow-lg shadow-cyan-500/25',
                  'transition-all duration-200'
                )}
              >
                <Mic className="h-5 w-5 text-white" />
              </Button>
            ) : connectionState === 'connecting' ? (
              <Button
                disabled
                className="h-12 w-12 rounded-full p-0 bg-amber-500/20"
              >
                <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
              </Button>
            ) : (
              <>
                {token ? (
                  <>
                    {/* Mute/Unmute Button */}
                    <Button
                      onClick={toggleMute}
                      className={cn(
                        'h-12 w-12 rounded-full p-0 transition-all duration-200',
                        isMuted
                          ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
                          : 'bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25'
                      )}
                      title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                    >
                      {isMuted ? (
                        <MicOff className="h-5 w-5" />
                      ) : (
                        <Mic className="h-5 w-5" />
                      )}
                    </Button>

                    {/* Status Badge */}
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-cyan-500/40 text-cyan-300">
                      {avatarState === 'speaking' ? '🔊 Speaking...' :
                       avatarState === 'listening' ? '🎙️ Listening...' :
                       avatarState === 'thinking' ? '🤔 Thinking...' :
                       '🟢 Live'}
                    </Badge>

                    {/* Disconnect Button */}
                    <Button
                      onClick={disconnect}
                      variant="outline"
                      className="h-10 w-10 rounded-full p-0 hover:bg-red-500/20 hover:border-red-500/50"
                      title="Disconnect"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Fallback controls */}
                    {voiceProcessor.isRecording ? (
                      <Button
                        onClick={voiceProcessor.stopRecording}
                        className={cn(
                          'h-12 w-12 rounded-full p-0',
                          'bg-red-500/80 hover:bg-red-500',
                          'shadow-lg shadow-red-500/20',
                          'transition-all duration-200',
                          'animate-pulse'
                        )}
                        title="Stop recording and process speech"
                      >
                        <MicOff className="h-5 w-5 text-white" />
                      </Button>
                    ) : voiceProcessor.step === 'idle' ? (
                      <Button
                        onClick={voiceProcessor.startRecording}
                        className={cn(
                          'h-12 w-12 rounded-full p-0',
                          'bg-gradient-to-br from-cyan-500 to-blue-600',
                          'hover:from-cyan-400 hover:to-blue-500',
                          'shadow-lg shadow-cyan-500/25',
                          'transition-all duration-200'
                        )}
                        title="Hold to speak — click again to stop"
                      >
                        <Mic className="h-5 w-5 text-white" />
                      </Button>
                    ) : (
                      <Button
                        disabled
                        className="h-12 w-12 rounded-full p-0 bg-amber-500/20"
                        title={`Processing: ${voiceProcessor.step}`}
                      >
                        <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                      </Button>
                    )}

                    {/* Processing status indicator */}
                    {voiceProcessor.step !== 'idle' && !voiceProcessor.isRecording && (
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-amber-500/40 text-amber-300 animate-pulse">
                        {voiceProcessor.step === 'transcribing' ? '📝 Transcribing...' :
                         voiceProcessor.step === 'thinking' ? '🤔 Thinking...' :
                         voiceProcessor.step === 'speaking' ? '🔊 Speaking...' :
                         voiceProcessor.step}
                      </Badge>
                    )}

                    {/* Disconnect Button */}
                    <Button
                      onClick={disconnect}
                      variant="outline"
                      className="h-10 w-10 rounded-full p-0 hover:bg-red-500/20 hover:border-red-500/50"
                      title="Disconnect"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </>
  )

  // ── Panel UI ────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden transition-all duration-300 ease-out',
        context
          ? 'w-full h-full relative'
          : [
              'fixed bottom-6 right-6 z-50',
              'w-[380px] rounded-2xl',
              'bg-background/95 backdrop-blur-xl',
              'border border-sidebar-border/60',
              'shadow-2xl shadow-black/40',
            ],
        isExpanded ? 'max-h-[600px]' : 'max-h-[72px]'
      )}
    >
      {token && wsUrl ? (
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={disconnect}
          className="flex flex-col h-full"
        >
          <LiveKitVoiceController
            isMuted={isMuted}
            sessionId={activeSessionId}
            avatarState={avatarState}
            setAvatarState={setAvatarState}
            setTranscript={setTranscript}
            setAudioLevel={setAudioLevel}
            setConnectionState={setConnectionState}
            setError={setError}
          />
          <RoomAudioRenderer />
          {panelContent}
        </LiveKitRoom>
      ) : (
        panelContent
      )}
    </div>
  )
}
