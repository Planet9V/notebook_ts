'use client'

import { useState } from 'react'
import { Calendar, Clock, Loader2, Play, Plus, Trash2, Video, Pause, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import {
  useScheduledEpisodes,
  useCreateScheduledEpisode,
  useUpdateScheduledEpisode,
  useDeleteScheduledEpisode,
  useTriggerScheduledEpisode,
  useEpisodeProfiles,
  useSpeakerProfiles,
} from '@/lib/hooks/use-podcasts'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function SchedulerTab() {
  const { t } = useTranslation()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // Form State
  const [name, setName] = useState('')
  const [notebookId, setNotebookId] = useState('')
  const [episodeProfile, setEpisodeProfile] = useState('')
  const [speakerProfile, setSpeakerProfile] = useState('')
  const [schedule, setSchedule] = useState('0 0 * * 0') // Default weekly Sunday

  // Queries & Mutations
  const { data: scheduledEpisodes = [], isLoading, refetch } = useScheduledEpisodes()
  const { data: notebooks = [] } = useNotebooks()
  const { episodeProfiles = [] } = useEpisodeProfiles()
  const { speakerProfiles = [] } = useSpeakerProfiles()

  const createSchedule = useCreateScheduledEpisode()
  const updateSchedule = useUpdateScheduledEpisode()
  const deleteSchedule = useDeleteScheduledEpisode()
  const triggerSchedule = useTriggerScheduledEpisode()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !notebookId || !episodeProfile || !speakerProfile || !schedule) {
      return
    }

    try {
      await createSchedule.mutateAsync({
        name,
        notebook_id: notebookId,
        episode_profile: episodeProfile,
        speaker_profile: speakerProfile,
        schedule,
        status: 'active',
      })
      setIsDialogOpen(false)
      // Reset form
      setName('')
      setNotebookId('')
      setEpisodeProfile('')
      setSpeakerProfile('')
      void refetch()
    } catch (err) {
      // Toast already handled by hook
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active'
    await updateSchedule.mutateAsync({
      scheduleId: id,
      payload: { status: nextStatus },
    })
    void refetch()
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('podcasts.confirmDeleteSchedule', 'Are you sure you want to delete this schedule?'))) {
      await deleteSchedule.mutateAsync(id)
      void refetch()
    }
  }

  const handleTrigger = async (id: string) => {
    await triggerSchedule.mutateAsync(id)
  }

  // Helper to find notebook name
  const getNotebookName = (id: string) => {
    const nb = notebooks.find((n: any) => n.id === id)
    return nb ? nb.name : id
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">
            {t('podcasts.schedulerWorkspaceTitle', 'Podcast Scheduling & Automation')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              'podcasts.schedulerWorkspaceDesc',
              'Configure autonomous cron-based episode generation and background writing runs.'
            )}
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {t('podcasts.newScheduleBtn', 'New Schedule')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('podcasts.loadingSchedules', 'Loading scheduled configurations...')}
        </div>
      ) : scheduledEpisodes.length === 0 ? (
        <Card className="border-dashed bg-muted/20">
          <CardHeader className="text-center py-10">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground/60 mb-2" />
            <CardTitle className="text-muted-foreground font-medium">
              {t('podcasts.noSchedulesTitle', 'No Scheduled Podcast Episodes')}
            </CardTitle>
            <CardDescription className="max-w-md mx-auto">
              {t(
                'podcasts.noSchedulesDesc',
                'Create your first automated trigger to regularly digest notebook updates and render outlines.'
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scheduledEpisodes.map((episode) => (
            <Card key={episode.id} className="relative overflow-hidden group border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold leading-tight line-clamp-1">
                      {episode.name}
                    </CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {episode.schedule}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={episode.status === 'active' ? 'default' : 'secondary'}
                    className="capitalize shrink-0"
                  >
                    {episode.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-4">
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between border-b pb-1">
                    <span>{t('podcasts.dossierLabel', 'Dossier')}</span>
                    <span className="text-foreground font-medium max-w-[150px] truncate">
                      {getNotebookName(episode.notebook)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>{t('podcasts.templateLabel', 'Format')}</span>
                    <span className="text-foreground font-medium">{episode.episode_profile}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span>{t('podcasts.speakersLabel', 'Voice')}</span>
                    <span className="text-foreground font-medium">{episode.speaker_profile}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span>{t('podcasts.lastRunLabel', 'Last Run')}</span>
                    <span className="text-foreground font-medium">
                      {episode.last_run ? new Date(episode.last_run).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(episode.id, episode.status)}
                    title={episode.status === 'active' ? 'Pause' : 'Activate'}
                  >
                    {episode.status === 'active' ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTrigger(episode.id)}
                    title="Trigger immediately"
                  >
                    <Video className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(episode.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Creation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t('podcasts.createScheduleTitle', 'Schedule Podcast Generation')}</DialogTitle>
              <DialogDescription>
                {t(
                  'podcasts.createScheduleDesc',
                  'Set up automated generation parameters for crawls and background TTS updates.'
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name">{t('podcasts.scheduleNameLabel', 'Schedule Name')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Weekly CISO Security Digest"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="notebook">{t('podcasts.scheduleNotebookLabel', 'Target Notebook')}</Label>
                <Select value={notebookId} onValueChange={setNotebookId} required>
                  <SelectTrigger id="notebook">
                    <SelectValue placeholder="Select notebook..." />
                  </SelectTrigger>
                  <SelectContent>
                    {notebooks.map((nb: any) => (
                      <SelectItem key={nb.id} value={nb.id}>
                        {nb.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="epProfile">{t('podcasts.scheduleEpProfileLabel', 'Format Template')}</Label>
                <Select value={episodeProfile} onValueChange={setEpisodeProfile} required>
                  <SelectTrigger id="epProfile">
                    <SelectValue placeholder="Select format..." />
                  </SelectTrigger>
                  <SelectContent>
                    {episodeProfiles.map((ep) => (
                      <SelectItem key={ep.id} value={ep.name}>
                        {ep.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="spProfile">{t('podcasts.scheduleSpProfileLabel', 'Voice Cast')}</Label>
                <Select value={speakerProfile} onValueChange={setSpeakerProfile} required>
                  <SelectTrigger id="spProfile">
                    <SelectValue placeholder="Select speakers..." />
                  </SelectTrigger>
                  <SelectContent>
                    {speakerProfiles.map((sp) => (
                      <SelectItem key={sp.id} value={sp.name}>
                        {sp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="cron">{t('podcasts.scheduleCronLabel', 'Schedule (Cron Expression)')}</Label>
                <Input
                  id="cron"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="0 0 * * 0"
                  required
                />
                <span className="text-[10px] text-muted-foreground">
                  e.g., "0 0 * * *" (daily), "0 0 * * 0" (weekly)
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createSchedule.isPending}>
                {createSchedule.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
