/**
 * Voice processing pipeline tests.
 *
 * Tests the audio processing loop that is the CORE of voice chat:
 *   User speaks → Record → STT → Chat AI → TTS → Playback
 *
 * These test the voiceApi methods that VoiceChatPanel should call.
 * We mock the HTTP layer (apiClient) since backend services are external.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { voiceApi } from '@/lib/api/voice'

// Mock the HTTP client — we test the pipeline logic, not the network
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

import { apiClient } from '@/lib/api/client'

const mockPost = vi.mocked(apiClient.post)

describe('voiceApi.transcribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends audio blob as FormData to STT endpoint', async () => {
    const audioBlob = new Blob(['fake-audio'], { type: 'audio/webm' })
    mockPost.mockResolvedValueOnce({
      data: { text: 'hello world' },
    })

    const result = await voiceApi.transcribe(audioBlob)

    expect(mockPost).toHaveBeenCalledWith(
      '/voice/stt/transcribe',
      expect.any(FormData)
    )
    expect(result.text).toBe('hello world')
  })

  it('returns empty string when no speech detected', async () => {
    const audioBlob = new Blob(['silence'], { type: 'audio/webm' })
    mockPost.mockResolvedValueOnce({
      data: { text: '' },
    })

    const result = await voiceApi.transcribe(audioBlob)
    expect(result.text).toBe('')
  })

  it('handles transcript key in response', async () => {
    const audioBlob = new Blob(['audio'], { type: 'audio/webm' })
    mockPost.mockResolvedValueOnce({
      data: { transcript: 'from transcript key' },
    })

    const result = await voiceApi.transcribe(audioBlob)
    expect(result.text).toBe('from transcript key')
  })
})

describe('voiceApi.chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends text to voice chat endpoint and returns AI answer', async () => {
    mockPost.mockResolvedValueOnce({
      data: { answer: 'I can help with that.', sources_used: 3 },
    })

    const result = await voiceApi.chat('what is security?')

    expect(mockPost).toHaveBeenCalledWith('/voice/chat/simple', {
      text: 'what is security?',
      notebook_id: null,
      use_rag: false,
      voice: 'af_heart',
      speed: 1.0,
    })
    expect(result.answer).toBe('I can help with that.')
    expect(result.sources_used).toBe(3)
  })

  it('enables RAG when notebook ID is provided', async () => {
    mockPost.mockResolvedValueOnce({
      data: { answer: 'Based on your notes...', sources_used: 5 },
    })

    await voiceApi.chat('explain this', 'notebook:abc123')

    expect(mockPost).toHaveBeenCalledWith('/voice/chat/simple', {
      text: 'explain this',
      notebook_id: 'notebook:abc123',
      use_rag: true,
      voice: 'af_heart',
      speed: 1.0,
    })
  })
})

describe('voiceApi.synthesize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends text to TTS and returns audio blob', async () => {
    const fakeAudioBlob = new Blob(['audio-data'], { type: 'audio/mp3' })
    mockPost.mockResolvedValueOnce({ data: fakeAudioBlob })

    const result = await voiceApi.synthesize('hello', { voice: 'af_heart' })

    expect(mockPost).toHaveBeenCalledWith(
      '/voice/tts/synthesize',
      {
        input: 'hello',
        voice: 'af_heart',
        model: 'kokoro',
        response_format: 'mp3',
        speed: 1.0,
      },
      { responseType: 'blob' }
    )
    expect(result).toBe(fakeAudioBlob)
  })
})

describe('voice chat full pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('processes audio through STT → Chat → TTS pipeline', async () => {
    // 1. STT: audio → text
    mockPost.mockResolvedValueOnce({
      data: { text: 'what does this framework require?' },
    })
    // 2. Chat: text → AI answer
    mockPost.mockResolvedValueOnce({
      data: { answer: 'The framework requires network segmentation.', sources_used: 2 },
    })
    // 3. TTS: answer → audio
    const responseAudio = new Blob(['response-audio'], { type: 'audio/mp3' })
    mockPost.mockResolvedValueOnce({ data: responseAudio })

    // Execute the full pipeline
    const audioBlob = new Blob(['user-speech'], { type: 'audio/webm' })

    // Step 1: Transcribe
    const { text } = await voiceApi.transcribe(audioBlob)
    expect(text).toBe('what does this framework require?')

    // Step 2: Get AI response
    const { answer } = await voiceApi.chat(text)
    expect(answer).toBe('The framework requires network segmentation.')

    // Step 3: Synthesize response
    const audio = await voiceApi.synthesize(answer, { voice: 'af_heart' })
    expect(audio).toBe(responseAudio)

    // Verify all 3 calls were made in order
    expect(mockPost).toHaveBeenCalledTimes(3)
  })

  it('handles empty transcription gracefully', async () => {
    mockPost.mockResolvedValueOnce({
      data: { text: '' },
    })

    const audioBlob = new Blob(['silence'], { type: 'audio/webm' })
    const { text } = await voiceApi.transcribe(audioBlob)

    // Pipeline should stop — don't send empty text to chat
    expect(text).toBe('')
    expect(mockPost).toHaveBeenCalledTimes(1) // Only STT called
  })
})
