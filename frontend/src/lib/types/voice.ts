export interface VoiceEntry {
  id: string
  name: string
  provider: string
}

export interface TTSEngineInfo {
  engine: string
  status: 'healthy' | 'configured' | 'not_configured'
  voices: VoiceEntry[]
}

export interface STTEngineInfo {
  engine: string
  status: 'healthy' | 'configured' | 'not_configured'
  models: string[]
}

export interface WebRTCInfo {
  status: string
  ws_url: string
}

export interface VoiceRegistry {
  tts_engines: TTSEngineInfo[]
  stt_engines: STTEngineInfo[]
  webrtc: Record<string, WebRTCInfo>
  active_tts_engine: string
  active_stt_engine: string
}
