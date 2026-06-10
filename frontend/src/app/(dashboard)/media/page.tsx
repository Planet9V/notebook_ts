'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Mic, 
  FlaskConical,
  Video,
  Share2,
  Sparkles,
  Calendar,
  FileText,
  Check,
  AlertTriangle
} from 'lucide-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useAnalytics } from '@/lib/hooks/use-analytics'

// Named imports for embedded components
import PodcastsPage from '@/app/(dashboard)/podcasts/page'
import VoicePlaygroundPage from '@/app/(dashboard)/voice-playground/page'
import { useStyleguides } from '@/lib/hooks/use-styleguides'
import { useAllNotes } from '@/lib/hooks/use-notes'
import { publicationsApi } from '@/lib/api/publications'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'

function SocialBuilderTab() {
  const { t } = useTranslation()
  const { data: notes = [], isLoading: notesLoading } = useAllNotes()
  const { data: styleguides = [], isLoading: styleguidesLoading } = useStyleguides()

  const [selectedNoteId, setSelectedNoteId] = useState<string>('')
  const [selectedChannel, setSelectedChannel] = useState<'linkedin' | 'twitter' | 'email'>('linkedin')
  const [selectedStyleguideId, setSelectedStyleguideId] = useState<string>('')
  const [selectedTone, setSelectedTone] = useState<string>('professional')

  const [generating, setGenerating] = useState(false)
  const [generatedTitle, setGeneratedTitle] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')

  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [scheduling, setScheduling] = useState(false)

  // Initialize schedule date to tomorrow
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yyyy = tomorrow.getFullYear()
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const dd = String(tomorrow.getDate()).padStart(2, '0')
    setScheduleDate(`${yyyy}-${mm}-${dd}`)
  }, [])

  const handleGenerate = () => {
    if (!selectedNoteId) {
      toast.error('Please select a source note first.')
      return
    }

    const note = notes.find((n) => n.id === selectedNoteId)
    if (!note) {
      toast.error('Selected note not found.')
      return
    }

    setGenerating(true)

    // Simulate LLM agent generation with actual note context
    setTimeout(() => {
      const guideName = styleguides.find((g) => g.id === selectedStyleguideId)?.name || 'Default Guide'
      const noteTitle = note.title || 'Research Project'
      const noteContent = note.content || ''

      let postTitle = ''
      let postBody = ''

      if (selectedChannel === 'twitter') {
        postTitle = `Thread: Insights on ${noteTitle}`
        postBody = `1/ We just compiled key research findings on "${noteTitle}". Here is what we discovered:

${noteContent.slice(0, 120)}...

2/ Adapting our workflow dynamically allows us to scale operations safely. Styled according to ${guideName} in a ${selectedTone} tone. #research #ai`
      } else if (selectedChannel === 'linkedin') {
        postTitle = `Analyzing ${noteTitle} - Core Findings`
        postBody = `I am excited to share a summary of our latest research on "${noteTitle}".

Key takeaways:
• Primary insight: ${noteContent.slice(0, 100)}...
• Methodology aligned with our corporate "${guideName}" framework.

We are applying these findings to build a more robust, compliant delivery system.

Read more in our dashboard. #research #compliance #innovation`
      } else {
        postTitle = `Newsletter: Weekly Update on ${noteTitle}`
        postBody = `Hello Team,

Welcome to this week's technical newsletter update. Today, we are deep diving into:

"${noteTitle}"

Summary of Findings:
${noteContent || 'No details provided.'}

This summary has been formatted according to the style guide: "${guideName}" using a ${selectedTone} tone profile.

Best regards,
Research & Operations Team`
      }

      setGeneratedTitle(postTitle)
      setGeneratedContent(postBody)
      setGenerating(false)
      toast.success('AI publication draft generated successfully.')
    }, 1500)
  }

  const handleSchedule = async () => {
    if (!generatedTitle.trim() || !generatedContent.trim()) {
      toast.error('Please generate or write the content draft first.')
      return
    }

    if (!scheduleDate || !scheduleTime) {
      toast.error('Please specify a schedule date and time.')
      return
    }

    setScheduling(true)
    try {
      const scheduledTimeISO = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
      await publicationsApi.schedulePost({
        channel: selectedChannel,
        title: generatedTitle,
        content: generatedContent,
        scheduled_time: scheduledTimeISO,
        status: 'queued',
      })
      toast.success('Publication scheduled and added to queue.')
      // Reset form
      setGeneratedTitle('')
      setGeneratedContent('')
      setSelectedNoteId('')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to schedule publication: ' + (err.response?.data?.detail || err.message))
    } finally {
      setScheduling(false)
    }
  }

  const activeNote = notes.find((n) => n.id === selectedNoteId)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* Parameters Panel */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border border-white/5 bg-slate-950/20 rounded-2xl">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider font-mono flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-cyan-400" />
              AI Creator Parameters
            </CardTitle>
            <CardDescription className="text-xs">
              Configure parameters to draft social updates from research notes.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Note Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold font-mono tracking-wider text-muted-foreground">
                Select Source Note
              </label>
              <Select value={selectedNoteId} onValueChange={setSelectedNoteId}>
                <SelectTrigger className="w-full text-xs h-9 bg-slate-900/40 border-white/5">
                  <SelectValue placeholder={notesLoading ? "Loading notes..." : "-- Select Note --"} />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 text-xs">
                  {notes.map((note) => (
                    <SelectItem key={note.id} value={note.id || ''}>
                      {note.title || 'Untitled Note'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeNote && (
                <div className="text-[11px] p-2.5 rounded bg-slate-900/30 border border-white/5 font-mono text-muted-foreground whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {activeNote.content || 'Empty note body.'}
                </div>
              )}
            </div>

            {/* Channel Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold font-mono tracking-wider text-muted-foreground">
                Target Channel
              </label>
              <Select value={selectedChannel} onValueChange={(val: any) => setSelectedChannel(val)}>
                <SelectTrigger className="w-full text-xs h-9 bg-slate-900/40 border-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 text-xs">
                  <SelectItem value="linkedin">LinkedIn Professional Update</SelectItem>
                  <SelectItem value="twitter">Twitter/X Post/Thread</SelectItem>
                  <SelectItem value="email">Email Newsletter Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Styleguide Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold font-mono tracking-wider text-muted-foreground">
                Style Guide Guidelines
              </label>
              <Select value={selectedStyleguideId} onValueChange={setSelectedStyleguideId}>
                <SelectTrigger className="w-full text-xs h-9 bg-slate-900/40 border-white/5">
                  <SelectValue placeholder={styleguidesLoading ? "Loading styleguides..." : "-- Select Guide --"} />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 text-xs border border-white/10">
                  {styleguides.map((g) => (
                    <SelectItem key={g.id} value={g.id || ''}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tone Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold font-mono tracking-wider text-muted-foreground">
                Tone Persona
              </label>
              <Select value={selectedTone} onValueChange={setSelectedTone}>
                <SelectTrigger className="w-full text-xs h-9 bg-slate-900/40 border-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10 text-xs border border-white/10">
                  <SelectItem value="professional">Professional / Corporate</SelectItem>
                  <SelectItem value="technical">Technical / Analytical</SelectItem>
                  <SelectItem value="thought-leadership">Thought Leadership</SelectItem>
                  <SelectItem value="casual">Casual / Conversational</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedNoteId}
              className="w-full h-9 text-xs font-mono uppercase bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold"
            >
              {generating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2 text-slate-950" />
                  Generating draft...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Post Draft
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Draft Preview & Schedule Panel */}
      <div className="lg:col-span-3 space-y-6">
        <Card className="border border-white/5 bg-slate-950/20 rounded-2xl flex flex-col">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider font-mono flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-cyan-400" />
              AI Draft Preview & Scheduling
            </CardTitle>
            <CardDescription className="text-xs">
              Review generated copy and schedule the release event.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Generated Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold font-mono tracking-wider text-muted-foreground">
                Publication Title
              </label>
              <Input
                type="text"
                placeholder="Draft Title"
                value={generatedTitle}
                onChange={(e) => setGeneratedTitle(e.target.value)}
                className="text-xs h-9 bg-slate-900/40 border-white/5 font-mono text-white"
              />
            </div>

            {/* Generated Content */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold font-mono tracking-wider text-muted-foreground">
                Post Content Body
              </label>
              <Textarea
                placeholder="Generated copy appears here. Feel free to edit."
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                className="text-xs bg-slate-900/40 border-white/5 font-mono min-h-[180px] text-white"
              />
            </div>

            {/* Scheduling Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold font-mono tracking-wider text-muted-foreground">
                  Schedule Date
                </label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="text-xs h-9 bg-slate-900/40 border-white/5 font-mono text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold font-mono tracking-wider text-muted-foreground">
                  Time (24h)
                </label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="text-xs h-9 bg-slate-900/40 border-white/5 font-mono text-white"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <Button
              onClick={handleSchedule}
              disabled={scheduling || !generatedTitle.trim() || !generatedContent.trim()}
              className="w-full h-9 text-xs font-mono uppercase bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold"
            >
              {scheduling ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2 text-slate-950" />
                  Scheduling Publication...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Publication
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MediaWorkspaceContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { trackEvent } = useAnalytics()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tab = searchParams?.get('tab') || 'podcasts'
  const activeTab = ['podcasts', 'voice-playground', 'social-builder'].includes(tab)
    ? tab
    : 'podcasts'

  const handleTabChange = (val: string) => {
    trackEvent('workspace_tab_changed', { workspace: 'media', tab_name: val })
    const params = new URLSearchParams(window.location.search)
    params.set('tab', val)
    router.replace(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    document.title = 'Media Creation Workspace | Tetrel'
  }, [])

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-background text-foreground">
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Mic className="h-6 w-6 text-cyan-400" />
                <h1 className="text-2xl font-bold tracking-tight uppercase font-mono">
                  Media Creation Workspace
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1 tracking-wide">
                Unified workspace for automated audio generation, podcast creation, and real-time voice testing pipelines
              </p>
            </div>
          </div>

          {/* Workspace Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Select Media Tool</p>
              <TabsList className="w-full max-w-lg grid grid-cols-3 bg-slate-900/60 p-1 border border-white/5 rounded-xl">
                <TabsTrigger value="podcasts" className="flex items-center justify-center gap-2 py-2">
                  <Video className="h-4 w-4" />
                  <span>Podcast Builder</span>
                </TabsTrigger>
                <TabsTrigger value="voice-playground" className="flex items-center justify-center gap-2 py-2">
                  <FlaskConical className="h-4 w-4" />
                  <span>Voice Lab Sandbox</span>
                </TabsTrigger>
                <TabsTrigger value="social-builder" className="flex items-center justify-center gap-2 py-2">
                  <Share2 className="h-4 w-4" />
                  <span>Social Creator</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Panels */}
            <TabsContent value="podcasts" className="mt-0 outline-none">
              <PodcastsPage embedded={true} />
            </TabsContent>
            <TabsContent value="voice-playground" className="mt-0 outline-none">
              <VoicePlaygroundPage embedded={true} />
            </TabsContent>
            <TabsContent value="social-builder" className="mt-0 outline-none">
              <SocialBuilderTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  )
}

export default function MediaPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <Mic className="h-8 w-8 text-cyan-400 animate-pulse" />
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Loading Media Workspace...</p>
        </div>
      </div>
    }>
      <MediaWorkspaceContent />
    </Suspense>
  )
}
