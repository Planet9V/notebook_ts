import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { backupApi, BackupScheduleCreate, BackupScheduleUpdate } from '@/lib/api/backup'
import { useToast } from '@/lib/hooks/use-toast'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getApiErrorKey } from '@/lib/utils/error-handler'

export const BACKUP_QUERY_KEYS = {
  allBackups: ['backups'] as const,
  allSchedules: ['backup-schedules'] as const,
}

export function useBackups() {
  return useQuery({
    queryKey: BACKUP_QUERY_KEYS.allBackups,
    queryFn: () => backupApi.list(),
  })
}

export function useCreateBackup() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: () => backupApi.create(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: BACKUP_QUERY_KEYS.allBackups })
      toast({
        title: t('common.success') || 'Success',
        description: data.message || 'Backup created successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error creating backup'),
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteBackup() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (id: string) => backupApi.delete(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: BACKUP_QUERY_KEYS.allBackups })
      toast({
        title: t('common.success') || 'Success',
        description: data.message || 'Backup deleted successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error deleting backup'),
        variant: 'destructive',
      })
    },
  })
}

export function useRestoreBackup() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (id: string) => backupApi.restore(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: BACKUP_QUERY_KEYS.allBackups })
      toast({
        title: t('common.success') || 'Success',
        description: data.message || 'System restored successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error restoring backup'),
        variant: 'destructive',
      })
    },
  })
}

export function useUploadRestoreBackup() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (file: File) => backupApi.uploadRestore(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: BACKUP_QUERY_KEYS.allBackups })
      toast({
        title: t('common.success') || 'Success',
        description: data.message || 'Uploaded backup restored successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error restoring uploaded backup'),
        variant: 'destructive',
      })
    },
  })
}

export function useBackupSchedules() {
  return useQuery({
    queryKey: BACKUP_QUERY_KEYS.allSchedules,
    queryFn: () => backupApi.listSchedules(),
  })
}

export function useCreateBackupSchedule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (data: BackupScheduleCreate) => backupApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BACKUP_QUERY_KEYS.allSchedules })
      toast({
        title: t('common.success') || 'Success',
        description: 'Backup schedule created successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error creating schedule'),
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateBackupSchedule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BackupScheduleUpdate }) =>
      backupApi.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BACKUP_QUERY_KEYS.allSchedules })
      toast({
        title: t('common.success') || 'Success',
        description: 'Backup schedule updated successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error updating schedule'),
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteBackupSchedule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: (id: string) => backupApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BACKUP_QUERY_KEYS.allSchedules })
      toast({
        title: t('common.success') || 'Success',
        description: 'Backup schedule deleted successfully',
      })
    },
    onError: (error: unknown) => {
      toast({
        title: t('common.error') || 'Error',
        description: getApiErrorKey(error, 'Error deleting schedule'),
        variant: 'destructive',
      })
    },
  })
}
