'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Music, 
  Trash2, 
  Play, 
  Pause, 
  Upload, 
  Sparkles, 
  Loader2, 
  Volume2 
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  useAudioSequences, 
  useUploadAudioSequence, 
  useGenerateAudioSequence, 
  useDeleteAudioSequence 
} from '@/lib/hooks/use-podcasts'
import { resolvePodcastAssetUrl } from '@/lib/api/podcasts'
import { AudioSequence } from '@/lib/types/podcasts'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

export function AudioSequencesCard() {
  const { data: sequences = [], isLoading } = useAudioSequences()
  const uploadMutation = useUploadAudioSequence()
  const generateMutation = useGenerateAudioSequence()
  const deleteMutation = useDeleteAudioSequence()

  // Audio playing state
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

  // Upload Form states
  const [uploadName, setUploadName] = useState('')
  const [uploadDesc, setUploadDesc] = useState('')
  const [uploadType, setUploadType] = useState<'intro' | 'outro'>('intro')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // TTS Form states
  const [ttsName, setTtsName] = useState('')
  const [ttsDesc, setTtsDesc] = useState('')
  const [ttsType, setTtsType] = useState<'intro' | 'outro'>('intro')
  const [ttsProvider, setTtsProvider] = useState<'default' | 'openai' | 'elevenlabs'>('default')
  const [ttsVoice, setTtsVoice] = useState('')
  const [ttsPrompt, setTtsPrompt] = useState('')

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause()
      }
    }
  }, [audioElement])

  const handlePlayToggle = async (seq: AudioSequence) => {
    if (playingId === seq.id) {
      audioElement?.pause()
      setPlayingId(null)
      return
    }

    if (audioElement) {
      audioElement.pause()
    }

    const resolved = await resolvePodcastAssetUrl(seq.audio_url || seq.file_path)
    if (!resolved) {
      toast.error('Could not resolve audio url')
      return
    }

    const audio = new Audio(resolved)
    setAudioElement(audio)
    setPlayingId(seq.id)

    audio.onended = () => {
      setPlayingId(null)
    }

    audio.onerror = () => {
      toast.error('Failed to play audio file')
      setPlayingId(null)
    }

    audio.play().catch(() => {
      setPlayingId(null)
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds the 15MB limit')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setSelectedFile(file)
    if (!uploadName) {
      // Auto fill name from file name minus extension
      const baseName = file.name.replace(/\.[^/.]+$/, '')
      setUploadName(baseName.replace(/[_-]/g, ' '))
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !uploadName.trim()) return

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('name', uploadName.trim())
    formData.append('description', uploadDesc.trim())
    formData.append('sequence_type', uploadType)

    try {
      await uploadMutation.mutateAsync(formData)
      // Reset form
      setUploadName('')
      setUploadDesc('')
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      // Handled by mutation hook
    }
  }

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ttsName.trim() || !ttsPrompt.trim()) return

    try {
      await generateMutation.mutateAsync({
        name: ttsName.trim(),
        description: ttsDesc.trim(),
        sequence_type: ttsType,
        prompt: ttsPrompt.trim(),
        provider: ttsProvider === 'default' ? undefined : ttsProvider,
        voice: ttsVoice.trim() || undefined,
      })
      // Reset form
      setTtsName('')
      setTtsDesc('')
      setTtsPrompt('')
      setTtsVoice('')
    } catch {
      // Handled by mutation hook
    }
  }

  const handleDelete = async (id: string) => {
    if (playingId === id) {
      audioElement?.pause()
      setPlayingId(null)
    }
    try {
      await deleteMutation.mutateAsync(id)
    } catch {
      // Handled by mutation hook
    }
  }

  const intros = sequences.filter((s: AudioSequence) => s.sequence_type === 'intro')
  const outros = sequences.filter((s: AudioSequence) => s.sequence_type === 'outro')

  return (
    <Card className="relative overflow-hidden col-span-1 lg:col-span-2">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500" />
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center">
            <Music className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <CardTitle className="text-base">Podcast Audio Sequences</CardTitle>
            <CardDescription className="text-xs">
              Manage intro themes and outro sequences to personalize generated podcasts
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        {/* Left Side: List of Audio Sequences */}
        <div className="lg:col-span-7 space-y-4">
          <Tabs defaultValue="intros">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <TabsList className="h-8 p-0.5 bg-muted/50">
                <TabsTrigger value="intros" className="text-xs h-7 px-3">
                  Intros ({intros.length})
                </TabsTrigger>
                <TabsTrigger value="outros" className="text-xs h-7 px-3">
                  Outros ({outros.length})
                </TabsTrigger>
              </TabsList>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Current clips
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                <TabsContent value="intros" className="space-y-2 mt-0">
                  {intros.length === 0 ? (
                    <div className="border border-dashed rounded-lg p-8 text-center text-xs text-muted-foreground">
                      No intro sequences available. Upload or generate one on the right.
                    </div>
                  ) : (
                    intros.map((seq: AudioSequence) => (
                      <div key={seq.id} className="flex items-center justify-between rounded-lg border bg-background/50 p-3 hover:bg-background/80 transition-colors">
                        <div className="space-y-1 pr-4">
                          <p className="text-xs font-semibold text-foreground truncate max-w-[240px] md:max-w-[320px]">
                            {seq.name}
                          </p>
                          {seq.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                              {seq.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handlePlayToggle(seq)}
                          >
                            {playingId === seq.id ? (
                              <Pause className="h-3.5 w-3.5 text-cyan-400" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(seq.id)}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending && deleteMutation.variables === seq.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="outros" className="space-y-2 mt-0">
                  {outros.length === 0 ? (
                    <div className="border border-dashed rounded-lg p-8 text-center text-xs text-muted-foreground">
                      No outro sequences available. Upload or generate one on the right.
                    </div>
                  ) : (
                    outros.map((seq: AudioSequence) => (
                      <div key={seq.id} className="flex items-center justify-between rounded-lg border bg-background/50 p-3 hover:bg-background/80 transition-colors">
                        <div className="space-y-1 pr-4">
                          <p className="text-xs font-semibold text-foreground truncate max-w-[240px] md:max-w-[320px]">
                            {seq.name}
                          </p>
                          {seq.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                              {seq.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handlePlayToggle(seq)}
                          >
                            {playingId === seq.id ? (
                              <Pause className="h-3.5 w-3.5 text-cyan-400" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(seq.id)}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending && deleteMutation.variables === seq.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>

        {/* Right Side: Upload or Generate form */}
        <div className="lg:col-span-5 border rounded-lg bg-muted/20 p-4 space-y-4">
          <Tabs defaultValue="upload">
            <TabsList className="grid w-full grid-cols-2 bg-muted/40 mb-4 h-8 p-0.5">
              <TabsTrigger value="upload" className="text-xs h-7 gap-1">
                <Upload className="h-3 w-3" /> Upload File
              </TabsTrigger>
              <TabsTrigger value="generate" className="text-xs h-7 gap-1">
                <Sparkles className="h-3 w-3" /> Generate TTS
              </TabsTrigger>
            </TabsList>

            {/* Upload form */}
            <TabsContent value="upload">
              <form onSubmit={handleUploadSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="upload-name" className="text-xs">Sequence Name *</Label>
                  <Input
                    id="upload-name"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="e.g. Catchy intro melody"
                    required
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="upload-desc" className="text-xs">Description</Label>
                  <Input
                    id="upload-desc"
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    placeholder="Short description..."
                    className="text-xs h-8"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={uploadType} onValueChange={(v) => setUploadType(v as 'intro' | 'outro')}>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="intro">Intro Clip</SelectItem>
                        <SelectItem value="outro">Outro Clip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 flex flex-col justify-end">
                    <Label htmlFor="file-select" className="text-xs mb-1">Audio File *</Label>
                    <Input
                      id="file-select"
                      type="file"
                      accept=".mp3,.wav"
                      onChange={handleFileChange}
                      required
                      ref={fileInputRef}
                      className="text-[10px] h-8 pt-1 bg-background"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Supported: .mp3, .wav. Max size: 15MB.
                </p>

                <Button
                  type="submit"
                  disabled={!selectedFile || !uploadName.trim() || uploadMutation.isPending}
                  className="w-full text-xs h-8 gap-1"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3 w-3" /> Upload Sequence
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* TTS Generation Form */}
            <TabsContent value="generate">
              <form onSubmit={handleGenerateSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="tts-name" className="text-xs">Sequence Name *</Label>
                  <Input
                    id="tts-name"
                    value={ttsName}
                    onChange={(e) => setTtsName(e.target.value)}
                    placeholder="e.g. Synthetic Welcoming Intro"
                    required
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tts-desc" className="text-xs">Description</Label>
                  <Input
                    id="tts-desc"
                    value={ttsDesc}
                    onChange={(e) => setTtsDesc(e.target.value)}
                    placeholder="Short description..."
                    className="text-xs h-8"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={ttsType} onValueChange={(v) => setTtsType(v as 'intro' | 'outro')}>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="intro">Intro Clip</SelectItem>
                        <SelectItem value="outro">Outro Clip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">TTS Engine</Label>
                    <Select value={ttsProvider} onValueChange={(v) => setTtsProvider(v as any)}>
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="openai">OpenAI TTS</SelectItem>
                        <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tts-voice" className="text-xs flex items-center justify-between">
                    <span>Voice Name / ID</span>
                    <span className="text-[9px] text-muted-foreground">Optional</span>
                  </Label>
                  <Input
                    id="tts-voice"
                    value={ttsVoice}
                    onChange={(e) => setTtsVoice(e.target.value)}
                    placeholder={ttsProvider === 'openai' ? 'alloy, echo, nova...' : 'Voice ID / Preset...'}
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tts-prompt" className="text-xs">TTS Script *</Label>
                  <Textarea
                    id="tts-prompt"
                    value={ttsPrompt}
                    onChange={(e) => setTtsPrompt(e.target.value)}
                    placeholder="Text to speak..."
                    required
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!ttsName.trim() || !ttsPrompt.trim() || generateMutation.isPending}
                  className="w-full text-xs h-8 gap-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" /> Generate Sequence
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
}
