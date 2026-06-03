/**
 * useVoiceProcessor hook tests — verifies the core voice processing pipeline.
 *
 * Tests the hook that was MISSING from VoiceChatPanel, causing
 * "connected but doesn't respond" behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoiceProcessor } from '@/components/voice/useVoiceProcessor'

// Mock voice API
vi.mock('@/lib/api/voice', () => ({
  voiceApi: {
    transcribe: vi.fn(),
    chat: vi.fn(),
    synthesize: vi.fn(),
    getConfig: vi.fn(),
    listVoices: vi.fn(),
    getToken: vi.fn(),
    checkHealth: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}))

import { voiceApi } from '@/lib/api/voice'

const mockTranscribe = vi.mocked(voiceApi.transcribe)
const mockChat = vi.mocked(voiceApi.chat)
const mockSynthesize = vi.mocked(voiceApi.synthesize)

// Mock Audio constructor
const mockPlay = vi.fn().mockResolvedValue(undefined)
const mockAudioInstance = {
  play: mockPlay,
  onended: null as (() => void) | null,
  onerror: null as (() => void) | null,
}
vi.stubGlobal('Audio', vi.fn(() => mockAudioInstance))

// Mock URL
vi.stubGlobal('URL', {
  ...globalThis.URL,
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
})

describe('useVoiceProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useVoiceProcessor())
    expect(result.current.step).toBe('idle')
    expect(result.current.isRecording).toBe(false)
  })

  it('exposes startRecording and stopRecording', () => {
    const { result } = renderHook(() => useVoiceProcessor())
    expect(typeof result.current.startRecording).toBe('function')
    expect(typeof result.current.stopRecording).toBe('function')
  })

  it('processes recording through full STT → Chat → TTS pipeline', async () => {
    const onMessage = vi.fn()
    const onError = vi.fn()

    mockTranscribe.mockResolvedValueOnce({ text: 'what is ICS security?' })
    mockChat.mockResolvedValueOnce({
      answer: 'ICS security protects industrial control systems.',
      sources_used: 2,
    })
    mockSynthesize.mockResolvedValueOnce(
      new Blob(['audio'], { type: 'audio/mp3' })
    )

    const { result } = renderHook(() =>
      useVoiceProcessor({ onMessage, onError })
    )

    // Simulate a recorded audio blob being processed
    const audioBlob = new Blob(['recorded-speech'], { type: 'audio/webm' })

    await act(async () => {
      await result.current.processRecording(audioBlob)
    })

    // Verify STT was called
    expect(mockTranscribe).toHaveBeenCalledWith(audioBlob, {})

    // Verify Chat was called with transcribed text
    expect(mockChat).toHaveBeenCalledWith(
      'what is ICS security?',
      undefined, // no notebookId
      'af_heart' // default voice
    )

    // Verify TTS was called with AI answer
    expect(mockSynthesize).toHaveBeenCalledWith(
      'ICS security protects industrial control systems.',
      { voice: 'af_heart' }
    )

    // Verify both messages were emitted
    expect(onMessage).toHaveBeenCalledTimes(2)

    // First call: user message
    expect(onMessage.mock.calls[0][0]).toMatchObject({
      role: 'user',
      text: 'what is ICS security?',
    })

    // Second call: assistant message
    expect(onMessage.mock.calls[1][0]).toMatchObject({
      role: 'assistant',
      text: 'ICS security protects industrial control systems.',
    })

    // Verify audio was played
    expect(mockPlay).toHaveBeenCalled()

    // No errors
    expect(onError).not.toHaveBeenCalled()
  })

  it('stops pipeline when no speech detected', async () => {
    const onMessage = vi.fn()
    const onError = vi.fn()

    mockTranscribe.mockResolvedValueOnce({ text: '' })

    const { result } = renderHook(() =>
      useVoiceProcessor({ onMessage, onError })
    )

    const audioBlob = new Blob(['silence'], { type: 'audio/webm' })

    await act(async () => {
      await result.current.processRecording(audioBlob)
    })

    // STT called, but chat and TTS should NOT be called
    expect(mockTranscribe).toHaveBeenCalledTimes(1)
    expect(mockChat).not.toHaveBeenCalled()
    expect(mockSynthesize).not.toHaveBeenCalled()
    expect(onMessage).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith('No speech detected. Try again.')
  })

  it('passes notebook ID for RAG context', async () => {
    mockTranscribe.mockResolvedValueOnce({ text: 'summarize my notes' })
    mockChat.mockResolvedValueOnce({
      answer: 'Your notes cover...',
      sources_used: 4,
    })
    mockSynthesize.mockResolvedValueOnce(
      new Blob(['audio'], { type: 'audio/mp3' })
    )

    const { result } = renderHook(() =>
      useVoiceProcessor({ notebookId: 'notebook:xyz' })
    )

    const audioBlob = new Blob(['speech'], { type: 'audio/webm' })

    await act(async () => {
      await result.current.processRecording(audioBlob)
    })

    expect(mockChat).toHaveBeenCalledWith(
      'summarize my notes',
      'notebook:xyz',
      'af_heart'
    )
  })

  it('reports errors from STT failure', async () => {
    const onError = vi.fn()

    mockTranscribe.mockRejectedValueOnce(new Error('STT service unavailable'))

    const { result } = renderHook(() =>
      useVoiceProcessor({ onError })
    )

    const audioBlob = new Blob(['speech'], { type: 'audio/webm' })

    await act(async () => {
      await result.current.processRecording(audioBlob)
    })

    expect(onError).toHaveBeenCalledWith('STT service unavailable')
    expect(result.current.step).toBe('idle')
  })
})
