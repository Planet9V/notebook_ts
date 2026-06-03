'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { isAxiosError } from 'axios'

// ── Types ───────────────────────────────────────────────────────────

export interface VoiceSession {
  id: string
  title: string
  notebook_id?: string | null
  created: string
  updated: string
  message_count: number
  voice_mode: boolean
  tts_voice: string
}

export interface VoiceMessage {
  role: string
  content: string
  audio_url?: string | null
  timestamp?: string | null
}

export interface VoiceSessionWithMessages extends VoiceSession {
  messages: VoiceMessage[]
}

interface CreateVoiceSessionRequest {
  notebook_id?: string
  title?: string
  tts_voice?: string
}

// ── Hook ────────────────────────────────────────────────────────────

export function useVoiceSessions(notebookId?: string) {
  const [sessions, setSessions] = useState<VoiceSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (notebookId) params.notebook_id = notebookId
      const { data } = await apiClient.get<VoiceSession[]>('/voice/sessions', { params })
      setSessions(data)
    } catch (err: unknown) {
      setError(isAxiosError(err) ? err.response?.data?.detail || 'Failed to load voice sessions' : 'Failed to load voice sessions')
    } finally {
      setLoading(false)
    }
  }, [notebookId])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const createSession = useCallback(async (req: CreateVoiceSessionRequest = {}) => {
    try {
      const { data } = await apiClient.post<VoiceSession>('/voice/sessions', {
        notebook_id: req.notebook_id || notebookId,
        title: req.title || 'Voice Conversation',
        tts_voice: req.tts_voice || 'af_heart',
      })
      setSessions(prev => [data, ...prev])
      return data
    } catch (err: unknown) {
      setError(isAxiosError(err) ? err.response?.data?.detail || 'Failed to create voice session' : 'Failed to create voice session')
      return null
    }
  }, [notebookId])

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await apiClient.delete(`/voice/sessions/${sessionId}`)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch (err: unknown) {
      setError(isAxiosError(err) ? err.response?.data?.detail || 'Failed to delete voice session' : 'Failed to delete voice session')
    }
  }, [])

  const addMessage = useCallback(async (
    sessionId: string,
    role: 'human' | 'ai',
    content: string,
    audioUrl?: string,
  ) => {
    try {
      await apiClient.post(`/voice/sessions/${sessionId}/messages`, {
        role,
        content,
        audio_url: audioUrl,
      })
    } catch (err: unknown) {
      // Non-critical — log but don't block the UI
      console.warn('Failed to persist voice message:', isAxiosError(err) ? err.response?.data?.detail : String(err))
    }
  }, [])

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    createSession,
    deleteSession,
    addMessage,
  }
}

export function useVoiceSession(sessionId: string | null) {
  const [session, setSession] = useState<VoiceSessionWithMessages | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSession = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<VoiceSessionWithMessages>(`/voice/sessions/${sessionId}`)
      setSession(data)
    } catch (err: unknown) {
      setError(isAxiosError(err) ? err.response?.data?.detail || 'Failed to load voice session' : 'Failed to load voice session')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return {
    session,
    loading,
    error,
    refresh: fetchSession,
  }
}
