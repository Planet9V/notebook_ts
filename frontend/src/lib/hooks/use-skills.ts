import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { skillsApi } from '@/lib/api/skills'
import { useToast } from '@/lib/hooks/use-toast'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getApiErrorKey } from '@/lib/utils/error-handler'
import { SkillCreate, SkillUpdate } from '@/lib/types/skills'

export const SKILL_QUERY_KEYS = {
  skills: ['skills'] as const,
  mcp: ['mcp'] as const,
}

export function useSkills() {
  return useQuery({
    queryKey: SKILL_QUERY_KEYS.skills,
    queryFn: () => skillsApi.list(),
  })
}

export function useCreateSkill() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (data: SkillCreate) => skillsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILL_QUERY_KEYS.skills })
      toast({
        title: t('common.success'),
        description: t('skills.saveSuccess', 'Skill configuration saved successfully'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('common.error')),
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateSkill(id: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (data: SkillUpdate) => skillsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILL_QUERY_KEYS.skills })
      toast({
        title: t('common.success'),
        description: t('skills.saveSuccess', 'Skill configuration saved successfully'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('common.error')),
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteSkill() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (id: string) => skillsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SKILL_QUERY_KEYS.skills })
      toast({
        title: t('common.success'),
        description: t('skills.deleteSuccess', 'Skill configuration deleted successfully'),
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error'),
        description: getApiErrorKey(error, t('common.error')),
        variant: 'destructive',
      })
    },
  })
}

export function useMcpServers() {
  return useQuery({
    queryKey: SKILL_QUERY_KEYS.mcp,
    queryFn: () => skillsApi.listMcp(),
  })
}
