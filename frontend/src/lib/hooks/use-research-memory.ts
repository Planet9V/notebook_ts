import { useQuery, useMutation } from '@tanstack/react-query'
import { researchMemoryApi, ResearchMemorySearchRequest } from '@/lib/api/research-memory'
import { useToast } from '@/lib/hooks/use-toast'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getApiErrorKey } from '@/lib/utils/error-handler'

export const RESEARCH_MEMORY_QUERY_KEYS = {
  all: ['research-memory'] as const,
  stats: ['research-memory', 'stats'] as const,
  browse: (page: number, limit: number, sourceType?: string) =>
    ['research-memory', 'browse', { page, limit, sourceType }] as const,
  search: (query: string) => ['research-memory', 'search', query] as const,
}

// Stats query — auto-fetches on mount
export function useResearchMemoryStats() {
  return useQuery({
    queryKey: RESEARCH_MEMORY_QUERY_KEYS.stats,
    queryFn: () => researchMemoryApi.stats(),
  })
}

// Browse query — paginated, controlled by params
export function useResearchMemoryBrowse(params: {
  page: number
  limit: number
  sourceType?: string
}) {
  return useQuery({
    queryKey: RESEARCH_MEMORY_QUERY_KEYS.browse(params.page, params.limit, params.sourceType),
    queryFn: () => researchMemoryApi.browse({
      page: params.page,
      limit: params.limit,
      source_type: params.sourceType,
    }),
  })
}

// Search mutation — triggered by user action
export function useResearchMemorySearch() {
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (params: ResearchMemorySearchRequest) => researchMemoryApi.search(params),
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Search failed'),
        variant: 'destructive',
      })
    },
  })
}
