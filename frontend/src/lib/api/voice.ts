import { apiClient } from './client'

// ── Types ───────────────────────────────────────────────────────────

export interface VoiceServiceStatus {
  name: string
  url: string
  status: 'healthy' | 'unhealthy' | 'unavailable'
  latency_ms?: number
  details?: string
}

export interface VoiceConfig {
  livekit_ws_url: string
  livekit_api_key_set: boolean
  kokoro_tts_url: string
  whisper_stt_url: string
  available_voices: string[]
  services: VoiceServiceStatus[]
}

export interface VoiceToken {
  token: string
  ws_url: string
  room_name: string
  identity: string
}

export interface VoiceHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  services: VoiceServiceStatus[]
}

export interface KokoroVoice {
  id: string
  name: string
}

// ── API Client ──────────────────────────────────────────────────────

export const voiceApi = {
  /**
   * Get voice service configuration and health status.
   * Used to initialize voice features on the frontend.
   */
  async getConfig(): Promise<VoiceConfig> {
    const { data } = await apiClient.get('/voice/config')
    return data
  },

  /**
   * Generate a LiveKit access token for WebRTC connection.
   * @param roomName - Room to join
   * @param identity - Unique user identity
   * @param name - Display name
   */
  async getToken(
    roomName: string = 'voice-chat',
    identity: string = 'user',
    name?: string,
    notebookId?: string,
    sessionId?: string
  ): Promise<VoiceToken> {
    const { data } = await apiClient.post('/voice/token', {
      room_name: roomName,
      identity,
      name,
      notebook_id: notebookId,
      session_id: sessionId,
    })
    return data
  },

  /**
   * Synthesize text to speech via configurable TTS engine.
   * Returns audio as a Blob.
   */
  async synthesize(
    text: string,
    options: {
      engine?: 'kokoro' | 'openai' | 'elevenlabs' | 'deepgram'
      voice?: string
      model?: string
      format?: string
      speed?: number
      // ElevenLabs-specific
      voiceId?: string
      modelId?: string
      stability?: number
      similarityBoost?: number
    } = {}
  ): Promise<Blob> {
    const engine = options.engine || 'kokoro'

    let endpoint: string
    let body: Record<string, unknown>

    switch (engine) {
      case 'openai':
        endpoint = '/voice/tts/openai'
        body = {
          input: text,
          voice: options.voice || 'alloy',
          model: options.model || 'tts-1',
          response_format: options.format || 'mp3',
          speed: options.speed || 1.0,
        }
        break
      case 'elevenlabs':
        endpoint = '/voice/tts/elevenlabs'
        body = {
          input: text,
          voice_id: options.voiceId || '21m00Tcm4TlvDq8ikWAM',
          model_id: options.modelId || 'eleven_v3',
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
          output_format: 'mp3_44100_128',
        }
        break
      case 'deepgram':
        endpoint = '/voice/tts/deepgram'
        body = {
          input: text,
          model: options.model || 'aura-2-thalia-en',
        }
        break
      default: // kokoro
        endpoint = '/voice/tts/synthesize'
        body = {
          input: text,
          voice: options.voice || 'af_heart',
          model: 'kokoro',
          response_format: options.format || 'mp3',
          speed: options.speed || 1.0,
        }
    }

    const { data } = await apiClient.post(endpoint, body, { responseType: 'blob' })
    return data
  },

  /**
   * List available Kokoro TTS voices.
   */
  async listVoices(): Promise<{ voices: KokoroVoice[] }> {
    const { data } = await apiClient.get('/voice/tts/voices')
    return data
  },

  /**
   * Health check for all voice AI services.
   */
  async checkHealth(): Promise<VoiceHealth> {
    const { data } = await apiClient.get('/voice/health')
    return data
  },

  /**
   * Transcribe audio to text via configurable STT engine.
   * @param audioBlob - Audio data (webm, wav, mp3, etc.)
   * @param options - Engine selection and configuration
   */
  async transcribe(
    audioBlob: Blob,
    options: {
      engine?: 'whisper' | 'openai' | 'deepgram'
      language?: string
      model?: string
    } = {}
  ): Promise<{ text: string }> {
    const formData = new FormData()
    formData.append('file', audioBlob, 'recording.webm')
    formData.append('engine', options.engine || 'whisper')
    if (options.language) formData.append('language', options.language)
    if (options.model) formData.append('model', options.model)
    const { data } = await apiClient.post('/voice/stt/transcribe', formData)
    return { text: data.text || data.transcript || '' }
  },

  /**
   * Voice RAG chat — send text, get AI response.
   * @param text - User's question (from STT or typed)
   * @param notebookId - Optional notebook for RAG context
   * @param voice - TTS voice for synthesis
   */
  async chat(
    text: string,
    notebookId?: string,
    voice: string = 'af_heart'
  ): Promise<{ answer: string; sources_used: number }> {
    const { data } = await apiClient.post('/voice/chat/simple', {
      text,
      notebook_id: notebookId || null,
      use_rag: !!notebookId,
      voice,
      speed: 1.0,
    })
    return { answer: data.answer, sources_used: data.sources_used || 0 }
  },

  /**
   * Get voice AI settings (env-backed, Phase 2: database-backed).
   */
  async getSettings(): Promise<VoiceSettings> {
    const { data } = await apiClient.get('/voice/settings')
    return data
  },

  /**
   * Update voice AI settings.
   */
  async updateSettings(settings: Partial<VoiceSettings>): Promise<VoiceSettings> {
    const { data } = await apiClient.put('/voice/settings', settings)
    return data
  },

  /**
   * Run pre-flight health and credentials validation checks for a TTS engine.
   */
  async preflight(engine: 'kokoro' | 'openai' | 'elevenlabs' | 'deepgram'): Promise<VoicePreflightResponse> {
    const { data } = await apiClient.post('/voice/preflight', { engine })
    return data
  },
}

export interface VoicePreflightResponse {
  engine: string
  status: 'healthy' | 'unavailable' | 'not_configured' | 'error'
  latency_ms?: number
  details?: string
}

// ── Voice Settings Type ─────────────────────────────────────────────

export interface VoiceSettings {
  // Core
  livekit_ws_url: string
  livekit_api_key_set: boolean
  kokoro_tts_url: string
  kokoro_default_voice: string
  kokoro_default_speed: number
  whisper_stt_url: string
  whisper_model: string
  whisper_compute_type: string
  voice_enabled: boolean

  // Multi-engine TTS
  tts_engine: string  // kokoro | openai | elevenlabs | deepgram
  openai_tts_voice: string
  openai_tts_model: string
  openai_tts_speed: number
  openai_api_key_set: boolean
  elevenlabs_api_key_set: boolean
  elevenlabs_voice_id: string
  elevenlabs_model_id: string
  elevenlabs_stability: number
  elevenlabs_similarity_boost: number
  deepgram_tts_voice: string

  // Multi-engine STT
  stt_engine: string  // whisper | openai | deepgram
  deepgram_api_key_set: boolean
  openai_stt_model: string
  openai_stt_language: string
  deepgram_stt_model: string
  deepgram_stt_language: string
  deepgram_smart_format: boolean
  deepgram_punctuate: boolean
  deepgram_diarize: boolean

  // LiveKit mode
  livekit_mode: string  // local | remote
  livekit_remote_ws_url: string
  livekit_remote_api_key?: string
  livekit_remote_api_secret?: string
  livekit_remote_api_key_set: boolean
}

