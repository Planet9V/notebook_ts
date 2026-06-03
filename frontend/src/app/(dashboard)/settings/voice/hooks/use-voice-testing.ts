'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { voiceApi } from '@/lib/api/voice'

// ── useAudioPlayback ──────────────────────────────────────────────────
// Manages a single HTMLAudioElement lifecycle: play, stop, cleanup.
// Prevents audio object leaks on rapid clicks and cleans up on unmount.

interface AudioPlaybackState {
  /** Engine ID currently playing, or null */
  playingEngine: string | null
  /** Play a synthesized audio blob for a given engine */
  play: (engineId: string, blob: Blob) => Promise<void>
  /** Stop current playback and release resources */
  stop: () => void
  /** Check if a specific engine is currently playing */
  isPlaying: (engineId: string) => boolean
}

export function useAudioPlayback(): AudioPlaybackState {
  const audioRef = useRef<{ audio: HTMLAudioElement; url: string } | null>(null)
  const [playingEngine, setPlayingEngine] = useState<string | null>(null)

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.audio.pause()
      audioRef.current.audio.src = ''
      URL.revokeObjectURL(audioRef.current.url)
      audioRef.current = null
    }
    setPlayingEngine(null)
  }, [])

  const play = useCallback(async (engineId: string, blob: Blob) => {
    stop()
    setPlayingEngine(engineId)
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audioRef.current = { audio, url }
    audio.onended = () => stop()
    audio.onerror = () => stop()
    await audio.play()
  }, [stop])

  const isPlaying = useCallback(
    (engineId: string) => playingEngine === engineId,
    [playingEngine]
  )

  // Cleanup on unmount
  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.audio.pause()
      audioRef.current.audio.src = ''
      URL.revokeObjectURL(audioRef.current.url)
      audioRef.current = null
    }
  }, [])

  return { playingEngine, play, stop, isPlaying }
}


// ── useServiceHealthTest ──────────────────────────────────────────────
// Tests connectivity to a named voice service via the health endpoint.

interface ServiceHealthTestState {
  testing: boolean
  result: 'success' | 'error' | null
  test: () => Promise<void>
}

export function useServiceHealthTest(serviceName: string): ServiceHealthTestState {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<'success' | 'error' | null>(null)

  const testFn = useCallback(async () => {
    setTesting(true)
    setResult(null)
    try {
      const health = await voiceApi.checkHealth()
      const svc = health.services.find((s) => s.name === serviceName)
      setResult(svc?.status === 'healthy' ? 'success' : 'error')
    } catch {
      setResult('error')
    } finally {
      setTesting(false)
    }
  }, [serviceName])

  return { testing, result, test: testFn }
}
