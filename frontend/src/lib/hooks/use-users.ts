import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/lib/api/users'

export const USER_QUERY_KEYS = {
  all: ['users'] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: USER_QUERY_KEYS.all,
    queryFn: () => usersApi.list(),
  })
}
