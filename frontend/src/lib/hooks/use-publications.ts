import { useQuery } from '@tanstack/react-query'
import { publicationsApi } from '@/lib/api/publications'

export const PUBLICATIONS_QUERY_KEYS = {
  all: ['publications'] as const,
  calendar: (startDate?: string, endDate?: string) => ['publications', 'calendar', { startDate, endDate }] as const,
}

export function usePublicationsCalendar(
  startDate?: string,
  endDate?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: PUBLICATIONS_QUERY_KEYS.calendar(startDate, endDate),
    queryFn: () => publicationsApi.getCalendar(startDate, endDate),
    ...options,
  })
}
