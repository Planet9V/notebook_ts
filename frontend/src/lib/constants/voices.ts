export interface VoicePreset {
  id: string
  name: string
  language: string
  gender: string
  description: string
}

export const KOKORO_VOICES: VoicePreset[] = [
  { id: 'af_heart', name: 'Heart', language: 'English (US)', gender: 'Female', description: 'Warm, natural American female' },
  { id: 'af_alloy', name: 'Alloy', language: 'English (US)', gender: 'Female', description: 'Clear, versatile female' },
  { id: 'af_aoede', name: 'Aoede', language: 'English (US)', gender: 'Female', description: 'Expressive storytelling' },
  { id: 'af_bella', name: 'Bella', language: 'English (US)', gender: 'Female', description: 'Soft, gentle female' },
  { id: 'af_jessica', name: 'Jessica', language: 'English (US)', gender: 'Female', description: 'Professional, confident' },
  { id: 'af_nicole', name: 'Nicole', language: 'English (US)', gender: 'Female', description: 'Friendly, approachable' },
  { id: 'af_nova', name: 'Nova', language: 'English (US)', gender: 'Female', description: 'Bright, energetic' },
  { id: 'af_sky', name: 'Sky', language: 'English (US)', gender: 'Female', description: 'Light, airy tone' },
  { id: 'am_adam', name: 'Adam', language: 'English (US)', gender: 'Male', description: 'Deep, authoritative male' },
  { id: 'am_echo', name: 'Echo', language: 'English (US)', gender: 'Male', description: 'Clear, resonant male' },
  { id: 'am_eric', name: 'Eric', language: 'English (US)', gender: 'Male', description: 'Professional narrator' },
  { id: 'am_liam', name: 'Liam', language: 'English (US)', gender: 'Male', description: 'Warm, conversational' },
  { id: 'am_michael', name: 'Michael', language: 'English (US)', gender: 'Male', description: 'News anchor style' },
  { id: 'am_onyx', name: 'Onyx', language: 'English (US)', gender: 'Male', description: 'Rich, commanding' },
  { id: 'bf_emma', name: 'Emma', language: 'English (UK)', gender: 'Female', description: 'British female' },
  { id: 'bf_isabella', name: 'Isabella', language: 'English (UK)', gender: 'Female', description: 'Elegant British' },
  { id: 'bm_george', name: 'George', language: 'English (UK)', gender: 'Male', description: 'British male narrator' },
  { id: 'bm_lewis', name: 'Lewis', language: 'English (UK)', gender: 'Male', description: 'Conversational British' },
]

/** Lookup a voice preset by ID, returns undefined if not in the static list */
export function findVoicePreset(voiceId: string): VoicePreset | undefined {
  return KOKORO_VOICES.find(v => v.id === voiceId)
}

/** Group voices by gender for picker UI */
export function groupVoicesByGender(): { female: VoicePreset[]; male: VoicePreset[] } {
  return {
    female: KOKORO_VOICES.filter(v => v.gender === 'Female'),
    male: KOKORO_VOICES.filter(v => v.gender === 'Male'),
  }
}
