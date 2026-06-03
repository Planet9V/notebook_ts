import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import type { VoiceRegistry } from '@/lib/types/voice'

export const VOICE_REGISTRY_KEYS = {
  registry: ['voice', 'registry'] as const,
}

export function useVoiceRegistry() {
  return useQuery({
    queryKey: VOICE_REGISTRY_KEYS.registry,
    queryFn: async () => {
      const { data } = await apiClient.get<VoiceRegistry>('/voice/registry')
      return data
    },
    staleTime: 30_000,
  })
}
