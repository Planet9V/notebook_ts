'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import type { FieldErrorsImpl } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Mic, Upload, Check } from 'lucide-react'

import { SpeakerProfile } from '@/lib/types/podcasts'
import {
  useCreateSpeakerProfile,
  useUpdateSpeakerProfile,
} from '@/lib/hooks/use-podcasts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { VoiceIdPicker } from '@/components/common/VoiceIdPicker'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useModels } from '@/lib/hooks/use-models'
import { apiClient } from '@/lib/api/client'

import type { TFunction } from 'i18next'
import { useTranslation } from '@/lib/hooks/use-translation'

const speakerConfigSchema = (t: TFunction) => z.object({
  name: z.string().min(1, t('common.nameRequired') || 'Name is required'),
  voice_id: z.string().min(1, t('podcasts.voiceIdRequired') || 'Voice ID is required'),
  backstory: z.string().min(1, t('podcasts.backstoryRequired') || 'Backstory is required'),
  personality: z.string().min(1, t('podcasts.personalityRequired') || 'Personality is required'),
  voice_model: z.string().nullable().optional(),
})

const speakerProfileSchema = (t: TFunction) => z.object({
  name: z.string().min(1, t('common.nameRequired') || 'Name is required'),
  description: z.string().optional(),
  voice_model: z.string().min(1, t('podcasts.voiceModelRequired') || 'Voice model is required'),
  speakers: z
    .array(speakerConfigSchema(t))
    .min(1, t('podcasts.speakerCountMin') || 'At least one speaker is required')
    .max(4, t('podcasts.speakerCountMax') || 'You can configure up to 4 speakers'),
})

export type SpeakerProfileFormValues = z.infer<ReturnType<typeof speakerProfileSchema>>

interface SpeakerProfileFormDialogProps {
  mode: 'create' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: SpeakerProfile
}

const EMPTY_SPEAKER = {
  name: '',
  voice_id: '',
  backstory: '',
  personality: '',
  voice_model: null as string | null,
}

const getEngineFromModel = (modelId: string | null | undefined, models: any[] | undefined): string => {
  if (!modelId) return 'kokoro'
  const matched = models?.find(m => m.id === modelId)
  if (matched?.provider) return matched.provider
  
  const mLower = modelId.toLowerCase()
  if (mLower.includes('openai')) return 'openai'
  if (mLower.includes('eleven')) return 'elevenlabs'
  if (mLower.includes('deepgram')) return 'deepgram'
  return 'kokoro'
}

interface SpeakerCardProps {
  index: number
  fieldId: string
  control: any
  register: any
  errors: any
  profileVoiceModel: string | null | undefined
  models: any[] | undefined
  remove: (index: number) => void
  fieldsCount: number
  recordingIndex: number | null
  uploadingIndex: number | null
  startRecording: (index: number) => void
  stopRecording: () => void
  handleUploadBlob: (index: number, blob: Blob | File, filename: string) => Promise<void>
  setValue: any
  t: TFunction
}

function SpeakerCard({
  index,
  fieldId,
  control,
  register,
  errors,
  profileVoiceModel,
  models,
  remove,
  fieldsCount,
  recordingIndex,
  uploadingIndex,
  startRecording,
  stopRecording,
  handleUploadBlob,
  setValue,
  t,
}: SpeakerCardProps) {
  const speakerVoiceModel = useWatch({
    control,
    name: `speakers.${index}.voice_model` as const,
  })

  const speakerVoiceId = useWatch({
    control,
    name: `speakers.${index}.voice_id` as const,
  })

  const activeModel = speakerVoiceModel || profileVoiceModel
  const resolvedEngine = getEngineFromModel(activeModel, models)

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          {t('podcasts.speakerNumber').replace('{number}', (index + 1).toString())}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => remove(index)}
          disabled={fieldsCount <= 1}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> {t('common.remove')}
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`speaker-name-${index}`}>{t('common.name')} *</Label>
          <Input
            id={`speaker-name-${index}`}
            {...register(`speakers.${index}.name` as const)}
            placeholder={t('podcasts.hostPlaceholder').replace('{number}', (index + 1).toString())}
            autoComplete="off"
          />
          {errors.speakers?.[index]?.name ? (
            <p className="text-xs text-red-600">
              {errors.speakers[index]?.name?.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`speaker-override-tts-${index}`}>{t('podcasts.perSpeakerTtsOverride') || "Per-speaker TTS System"}</Label>
          <Controller
            control={control}
            name={`speakers.${index}.voice_model` as const}
            render={({ field: vmField }) => (
              <Select
                value={vmField.value ?? 'default'}
                onValueChange={(v) => vmField.onChange(v === 'default' ? null : v)}
              >
                <SelectTrigger id={`speaker-override-tts-${index}`} className="w-full">
                  <SelectValue placeholder="Use Profile Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use Profile Default</SelectItem>
                  <SelectItem value="model:kokoro">Kokoro (Local)</SelectItem>
                  <SelectItem value="model:openai_tts">OpenAI TTS</SelectItem>
                  <SelectItem value="model:elevenlabs_tts">ElevenLabs</SelectItem>
                  <SelectItem value="model:deepgram_tts">Deepgram Aura</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Controller
            control={control}
            name={`speakers.${index}.voice_id` as const}
            render={({ field: voiceField }) => (
              <VoiceIdPicker
                label={`${t('podcasts.voiceId')} *`}
                value={voiceField.value}
                onChange={voiceField.onChange}
                engine={resolvedEngine}
                placeholder="Select a voice"
              />
            )}
          />
          {errors.speakers?.[index]?.voice_id ? (
            <p className="text-xs text-red-600">
              {errors.speakers[index]?.voice_id?.message}
            </p>
          ) : null}
        </div>

        {/* Custom Voice Recording/Upload Widget */}
        <div className="space-y-2">
          <Label>Custom Voice Recording (Optional)</Label>
          <div className="flex flex-wrap gap-2 items-center">
            {recordingIndex === index ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={stopRecording}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse mr-2 inline-block" />
                Stop Recording
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => startRecording(index)}
                disabled={uploadingIndex !== null}
              >
                <Mic className="h-3.5 w-3.5 mr-1" />
                Record Voice
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingIndex !== null || recordingIndex !== null}
              onClick={() => document.getElementById(`voice-upload-${index}`)?.click()}
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              Upload File
            </Button>
            <input
              id={`voice-upload-${index}`}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleUploadBlob(index, file, file.name)
                }
              }}
            />

            {uploadingIndex === index && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <LoadingSpinner size="sm" />
              </div>
            )}

            {speakerVoiceId?.startsWith('custom_') && (
              <div className="flex items-center text-xs text-emerald-400 font-medium">
                <Check className="h-3.5 w-3.5 mr-0.5" />
                Active
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`speaker-backstory-${index}`}>{t('podcasts.backstory')} *</Label>
        <Textarea
          id={`speaker-backstory-${index}`}
          rows={3}
          placeholder={t('podcasts.backstoryPlaceholder')}
          {...register(`speakers.${index}.backstory` as const)}
          autoComplete="off"
        />
        {errors.speakers?.[index]?.backstory ? (
          <p className="text-xs text-red-600">
            {errors.speakers[index]?.backstory?.message}
          </p>
        ) : null}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor={`speaker-personality-${index}`}>{t('podcasts.personality')} *</Label>
        <Textarea
          id={`speaker-personality-${index}`}
          rows={3}
          placeholder={t('podcasts.personalityPlaceholder')}
          {...register(`speakers.${index}.personality` as const)}
          autoComplete="off"
        />
        {errors.speakers?.[index]?.personality ? (
          <p className="text-xs text-red-600">
            {errors.speakers[index]?.personality?.message}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function SpeakerProfileFormDialog({
  mode,
  open,
  onOpenChange,
  initialData,
}: SpeakerProfileFormDialogProps) {
  const { t } = useTranslation()
  const createProfile = useCreateSpeakerProfile()
  const updateProfile = useUpdateSpeakerProfile()
  const { data: models } = useModels()

  // Voice recording state
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const getDefaults = useCallback((): SpeakerProfileFormValues => {
    if (initialData) {
      return {
        name: initialData.name,
        description: initialData.description ?? '',
        voice_model: initialData.voice_model ?? 'model:kokoro',
        speakers: initialData.speakers?.map((speaker) => ({
          ...speaker,
          voice_model: speaker.voice_model ?? null,
        })) ?? [{ ...EMPTY_SPEAKER }],
      }
    }

    return {
      name: '',
      description: '',
      voice_model: 'model:kokoro',
      speakers: [{ ...EMPTY_SPEAKER }],
    }
  }, [initialData])

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SpeakerProfileFormValues>({
    resolver: zodResolver(speakerProfileSchema(t)),
    defaultValues: getDefaults(),
  })

  const {
    fields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'speakers',
  })

  const speakersArrayError = (
    errors.speakers as FieldErrorsImpl<{ root?: { message?: string } }> | undefined
  )?.root?.message

  useEffect(() => {
    if (!open) {
      return
    }
    reset(getDefaults())
  }, [open, reset, getDefaults])

  const profileVoiceModel = useWatch({ control, name: 'voice_model' })

  // Microphone recording functions
  const startRecording = async (index: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await handleUploadBlob(index, audioBlob, `recording_${index}.wav`)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setRecordingIndex(index)
    } catch (err) {
      console.error('Error starting recording:', err)
      alert('Could not access microphone.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setRecordingIndex(null)
    }
  }

  const handleUploadBlob = async (index: number, blob: Blob | File, filename: string) => {
    setUploadingIndex(index)
    try {
      const formData = new FormData()
      formData.append('file', blob, filename)
      formData.append('speaker_name', watch(`speakers.${index}.name`) || `Speaker ${index + 1}`)
      
      const speakerModel = watch(`speakers.${index}.voice_model`) || profileVoiceModel
      const provider = getEngineFromModel(speakerModel, models)
      formData.append('provider', provider)

      const response = await apiClient.post<{ voice_id: string, custom_voice_path: string }>('/voice/upload-custom', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      })

      const data = response.data
      setValue(`speakers.${index}.voice_id` as const, data.voice_id)
    } catch (err: any) {
      console.error('Failed to upload custom voice:', err)
      alert(`Failed to upload custom voice: ${err.response?.data?.detail || err.message}`)
    } finally {
      setUploadingIndex(null)
    }
  }

  const onSubmit = async (values: SpeakerProfileFormValues) => {
    const payload = {
      ...values,
      description: values.description ?? '',
      speakers: values.speakers.map((s) => ({
        ...s,
        voice_model: s.voice_model || null,
      })),
    }

    if (mode === 'create') {
      await createProfile.mutateAsync(payload)
    } else if (initialData) {
      await updateProfile.mutateAsync({
        profileId: initialData.id,
        payload,
      })
    }

    onOpenChange(false)
  }

  const isSubmitting = createProfile.isPending || updateProfile.isPending
  const disableSubmit = isSubmitting
  const isEdit = mode === 'edit'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('podcasts.editSpeakerProfile') : t('podcasts.createSpeakerProfile')}
          </DialogTitle>
          <DialogDescription>
            {t('podcasts.speakerProfileFormDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('podcasts.profileName')} *</Label>
              <Input id="name" placeholder={t('podcasts.profileNamePlaceholder')} {...register('name')} />
              {errors.name ? (
                <p className="text-xs text-red-600">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('common.description')}</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder={t('podcasts.descriptionPlaceholder')}
                {...register('description')}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t('podcasts.voiceModel') || 'TTS System'}
              </h3>
              <Separator className="mt-2" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice_model">{t('podcasts.ttsSystem') || 'TTS System'} *</Label>
              <Controller
                control={control}
                name="voice_model"
                render={({ field }) => (
                  <div>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="voice_model" className="w-full">
                        <SelectValue placeholder={t('podcasts.selectVoiceModel') || "Select TTS System"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="model:kokoro">Kokoro (Local)</SelectItem>
                        <SelectItem value="model:openai_tts">OpenAI TTS</SelectItem>
                        <SelectItem value="model:elevenlabs_tts">ElevenLabs</SelectItem>
                        <SelectItem value="model:deepgram_tts">Deepgram Aura</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.voice_model ? (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.voice_model.message}
                      </p>
                    ) : null}
                  </div>
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('podcasts.speakers')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t('podcasts.speakersDesc')}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ ...EMPTY_SPEAKER })}
                disabled={fields.length >= 4}
              >
                <Plus className="mr-2 h-4 w-4" /> {t('podcasts.addSpeaker')}
              </Button>
            </div>
            <Separator />

            {fields.map((field, index) => (
              <SpeakerCard
                key={field.id}
                index={index}
                fieldId={field.id}
                control={control}
                register={register}
                errors={errors}
                profileVoiceModel={profileVoiceModel}
                models={models}
                remove={remove}
                fieldsCount={fields.length}
                recordingIndex={recordingIndex}
                uploadingIndex={uploadingIndex}
                startRecording={startRecording}
                stopRecording={stopRecording}
                handleUploadBlob={handleUploadBlob}
                setValue={setValue}
                t={t}
              />
            ))}

            {speakersArrayError ? (
              <p className="text-xs text-red-600">{speakersArrayError}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={disableSubmit}>
              {isSubmitting
                ? t('common.saving')
                : isEdit
                  ? t('common.saveChanges')
                  : t('podcasts.createProfile')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
